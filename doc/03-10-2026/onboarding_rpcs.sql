
-- Fix for crm.contacts missing columns required by the unified trigger
ALTER TABLE crm.contacts ADD COLUMN IF NOT EXISTS stage_id character varying(100);
ALTER TABLE crm.contacts ADD COLUMN IF NOT EXISTS automation_bp_instance_id uuid;
ALTER TABLE crm.contacts ADD COLUMN IF NOT EXISTS automation_esm_instance_id uuid;

-- 1. RPC for requesting organization onboarding
-- This only adds data to CRM and a pending organization record.
CREATE OR REPLACE FUNCTION identity.onboard_request_zoworks_account(
    p_org_name TEXT DEFAULT NULL,
    p_account_id UUID DEFAULT NULL,
    p_admin_first_name TEXT DEFAULT NULL,
    p_admin_last_name TEXT DEFAULT NULL,
    p_admin_email TEXT DEFAULT NULL,
    p_admin_mobile TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB AS $$
DECLARE
    v_account_id UUID := p_account_id;
    v_contact_id UUID;
    v_org_id UUID;
    v_org_name TEXT := p_org_name;
BEGIN
    SET LOCAL search_path = crm, identity, public;

    -- 1. Validate/Resolve CRM Account
    IF v_account_id IS NOT NULL THEN
        SELECT name INTO v_org_name FROM crm.accounts WHERE id = v_account_id;
        IF v_org_name IS NULL THEN
            RAISE EXCEPTION 'CRM Account % not found', v_account_id;
        END IF;
    ELSE
        -- Try to find by name if account_id not provided
        SELECT id, name INTO v_account_id, v_org_name FROM crm.accounts WHERE name = p_org_name LIMIT 1;
        
        IF v_account_id IS NULL THEN
            -- Create new CRM account
            INSERT INTO crm.accounts (name, details)
            VALUES (p_org_name, p_details)
            RETURNING id INTO v_account_id;
            v_org_name := p_org_name;
        END IF;
    END IF;

    -- 2. Validate/Resolve CRM Contact (Claimant)
    IF p_admin_email IS NOT NULL THEN
        -- Upsert contact by email
        INSERT INTO crm.contacts (account_id, name, email, phone, details)
        VALUES (v_account_id, TRIM(COALESCE(p_admin_first_name, '') || ' ' || COALESCE(p_admin_last_name, '')), p_admin_email, p_admin_mobile, p_details)
        ON CONFLICT (email) DO UPDATE SET
            account_id = EXCLUDED.account_id,
            name = COALESCE(NULLIF(EXCLUDED.name, ' '), crm.contacts.name),
            phone = COALESCE(EXCLUDED.phone, crm.contacts.phone)
        RETURNING id INTO v_contact_id;
    ELSE
        -- Attempt to find primary contact if no email provided (must have been selected or account had one)
        SELECT id INTO v_contact_id FROM crm.contacts WHERE account_id = v_account_id AND is_primary = true LIMIT 1;
        
        IF v_contact_id IS NULL THEN
            RAISE EXCEPTION 'Admin contact details (email) are required for new requests.';
        END IF;
    END IF;

    -- 3. Create Inactive Organization
    INSERT INTO identity.organizations (name, is_active, claimed_by_contact_id, details)
    VALUES (v_org_name, false, v_contact_id, p_details)
    RETURNING id INTO v_org_id;

    RETURN jsonb_build_object(
        'status', 'requested',
        'organization_id', v_org_id,
        'contact_id', v_contact_id,
        'account_id', v_account_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. RPC for approving and activating an organization
-- This promotes the claiming contact to a system user and activates the tenant.
CREATE OR REPLACE FUNCTION identity.onboard_promote_to_tenant(
    p_org_id UUID,
    p_auth_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_contact_id UUID;
    v_contact_name TEXT;
    v_contact_email TEXT;
    v_contact_mobile TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_role_id UUID;
    v_team_id UUID;
    v_location_id UUID;
    v_user_id UUID;
    v_res JSONB;
BEGIN
    SET LOCAL search_path = identity, crm, hr, public;

    -- 1. Authorization Check (SaaS Admin only)
    -- IF NOT identity.is_saas_admin(auth.uid()) THEN
    --     RAISE EXCEPTION 'Access Denied. SaaS Admin only.';
    -- END IF;

    -- 2. Fetch Claiming Contact Details
    -- Using unified.contacts for the name/email fetch to be safe against schema variations
    SELECT 
        o.claimed_by_contact_id, c.name, c.email, c.phone
    INTO 
        v_contact_id, v_contact_name, v_contact_email, v_contact_mobile
    FROM identity.organizations o
    JOIN unified.contacts c ON o.claimed_by_contact_id = c.id
    WHERE o.id = p_org_id;

    IF v_contact_id IS NULL THEN
        RAISE EXCEPTION 'Organization % not found or has no claiming contact.', p_org_id;
    END IF;

    -- Split name for potential invite
    v_first_name := split_part(v_contact_name, ' ', 1);
    v_last_name := NULLIF(substring(v_contact_name from ' (.*)$'), '');

    -- 3. Check if Identity user exists
    SELECT id INTO v_user_id FROM identity.users WHERE email = v_contact_email;

    -- 4. If user doesn't exist and no auth_id provided, signal frontend to invite
    IF v_user_id IS NULL AND p_auth_id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'NEED_INVITE',
            'email', v_contact_email,
            'first_name', v_first_name,
            'last_name', v_last_name
        );
    END IF;

    -- 5. Activate Organization
    UPDATE identity.organizations 
    SET is_active = true, 
        updated_at = now()
    WHERE id = p_org_id;

    -- 6. Initial Setup (Role, Location, Team)
    -- We reuse the SuperAdmin role if it exists or create it
    INSERT INTO identity.roles (organization_id, name, permissions, is_active)
    VALUES (p_org_id, 'SuperAdmin', '{"*": true}'::jsonb, true)
    ON CONFLICT (organization_id, name) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_role_id;

    INSERT INTO identity.locations (organization_id, name, time_zone, is_active)
    VALUES (p_org_id, 'Headquarters', 'UTC', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_location_id;

    INSERT INTO identity.teams (organization_id, location_id, name)
    VALUES (p_org_id, v_location_id, 'Leadership Team')
    ON CONFLICT (location_id, name) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_team_id;

    -- 7. Invite/Provision User
    -- This handles identity.users, organization_users, hr.profiles, roles, and teams.
    SELECT identity.onboard_invite_user_to_org(
        p_email := v_contact_email,
        p_first_name := v_first_name,
        p_last_name := COALESCE(v_last_name, ''),
        p_org_id := p_org_id,
        p_role_id := v_role_id,
        p_team_id := v_team_id,
        p_location_id := v_location_id,
        p_auth_id := p_auth_id,
        p_details := jsonb_build_object('mobile', v_contact_mobile, 'persona', 'admin')
    ) INTO v_res;

    -- 8. Mark Contact as Promoted/Converted
    UPDATE crm.contacts SET status = 'CONVERTED' WHERE id = v_contact_id;

    RETURN jsonb_build_object(
        'status', 'success',
        'organization_id', p_org_id,
        'user_id', COALESCE(v_user_id, (v_res->>'user_id')::uuid),
        'details', v_res
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
