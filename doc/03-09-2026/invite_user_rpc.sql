-- Centralized RPC for inviting/onboarding a user to an organization
-- This handles global user creation, organization mapping, HR profile, and role/team assignments atomically.

CREATE OR REPLACE FUNCTION identity.onboard_invite_user_to_org(
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_org_id UUID,
    p_role_id UUID,
    p_team_id UUID,
    p_location_id UUID,
    p_auth_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_org_user_id UUID;
    v_full_name TEXT := TRIM(p_first_name || ' ' || p_last_name);
    v_current_user_id UUID := auth.uid();
BEGIN
    -- Set search path to ensure we're hitting the right tables
    SET LOCAL search_path = identity, hr, core, public;

    -- 1. Get or Create Global Identity User
    SELECT id INTO v_user_id FROM identity.users WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        IF p_auth_id IS NULL THEN
            RAISE EXCEPTION 'auth_id is required for new users';
        END IF;

        INSERT INTO identity.users (auth_id, name, email, details, created_by, updated_by, password_confirmed)
        VALUES (p_auth_id, v_full_name, p_email, 
                p_details || jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'email', p_email),
                v_current_user_id, v_current_user_id, false)
        RETURNING id INTO v_user_id;
    END IF;

    -- 2. Map User to Organization (Tenant Mapping)
    -- This trigger on Identity will automatically provision the HR Profile and Master Registry records.
    INSERT INTO identity.organization_users (
        organization_id, user_id, location_id, is_active, persona_type,
        details, created_by, updated_by
    ) VALUES (
        p_org_id, v_user_id, p_location_id, true, 'worker',
        jsonb_build_object('person', jsonb_build_object('name', jsonb_build_object('family', p_last_name, 'given', p_first_name))),
        v_current_user_id, v_current_user_id
    )
    ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET 
        location_id = EXCLUDED.location_id,
        is_active = true,
        updated_at = now()
    RETURNING id INTO v_org_user_id;

    -- 3. Enrich HR Profile (Existence is guaranteed by the Identity Anchor's Provisioning Trigger)
    BEGIN
        UPDATE hr.profiles SET
            job_title = p_details->>'designation',
            department = p_details->>'department',
            employment_type = COALESCE(p_details->>'employment_type', 'full-time'),
            employment_status = 'active', 
            updated_at = now(),
            updated_by = v_current_user_id
        WHERE id = v_org_user_id;

        -- We only RAISE WARNING on failure to allow invitation to proceed even if HR module is not active.
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'HR Profile Enrichment skipped for org_user %: %. (HR Module might not be active or record was not provisioned)', v_org_user_id, SQLERRM;
    END;

    -- 4. Assign Team
    IF p_team_id IS NOT NULL THEN
        INSERT INTO identity.user_teams (organization_user_id, team_id, organization_id, created_by)
        VALUES (v_org_user_id, p_team_id, p_org_id, v_current_user_id)
        ON CONFLICT (organization_user_id, team_id) DO NOTHING;
    END IF;

    -- 5. Assign Role
    IF p_role_id IS NOT NULL AND p_team_id IS NOT NULL THEN
        INSERT INTO identity.user_roles (organization_user_id, role_id, team_id, organization_id, created_by)
        VALUES (v_org_user_id, p_role_id, p_team_id, p_org_id, v_current_user_id)
        ON CONFLICT (organization_user_id, role_id, team_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'status', 'success',
        'user_id', v_user_id,
        'org_user_id', v_org_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
