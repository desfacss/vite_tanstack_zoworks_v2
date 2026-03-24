identity.onboard_promote_to_tenant


DECLARE
    v_user_id UUID;
    v_org_user_id UUID;
    v_role_id UUID := extensions.uuid_generate_v4();
    v_location_id UUID := extensions.uuid_generate_v4();
    v_team_id UUID := extensions.uuid_generate_v4();
    v_org_name TEXT;
BEGIN
    -- 1. Authorization
    IF NOT identity.is_saas_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access Denied. SaaS Admin only.';
    END IF;

    -- 2. Verify Org
    SELECT name INTO v_org_name FROM identity.organizations WHERE id = p_org_id;
    IF v_org_name IS NULL THEN
        RAISE EXCEPTION 'Organization with ID % not found.', p_org_id;
    END IF;

    -- 3. Security Gate
    IF EXISTS (
        SELECT 1 
        FROM identity.organizations o
        JOIN crm.contacts c ON o.claimed_by_contact_id = c.id
        WHERE o.id = p_org_id AND c.status = 'PENDING_VERIFICATION'
    ) THEN
        RAISE EXCEPTION 'Activation Denied. Claiming contact has not verified their identity.';
    END IF;

    -- 4. Critical Discovery
    SELECT id, user_id INTO v_org_user_id, v_user_id
    FROM identity.organization_users 
    WHERE organization_id = p_org_id
    LIMIT 1;

    IF v_org_user_id IS NULL THEN
        RAISE EXCEPTION 'Promotion Failed: No user found in organization_users for Org %. Please link a user first.', p_org_id;
    END IF;

    -- 5. Activate Organization
    UPDATE identity.organizations 
    SET is_active = true, updated_at = now()
    WHERE id = p_org_id;

    -- 6. Role (Ensuring uniqueness)
    INSERT INTO identity.roles (id, organization_id, name, permissions, is_sassadmin, is_active)
    VALUES (v_role_id, p_org_id, 'SuperAdmin', '{"*": true}'::jsonb, false, true)
    ON CONFLICT (organization_id, name) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_role_id;

    -- 7. Location
    INSERT INTO identity.locations (id, organization_id, name, time_zone, is_active, details)
    VALUES (v_location_id, p_org_id, 'Headquarters', 'UTC', true, jsonb_build_object('type', 'OFFICE'))
    ON CONFLICT (organization_id, name) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_location_id;

    -- 8. Team
    INSERT INTO identity.teams (id, organization_id, location_id, name)
    VALUES (v_team_id, p_org_id, v_location_id, 'Leadership Team')
    ON CONFLICT (location_id, name) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_team_id;

    -- 9. Update Org User & Link HQ
    UPDATE identity.organization_users 
    SET is_active = true,
        location_id = v_location_id,
        persona_type = 'admin',
        updated_at = now()
    WHERE id = v_org_user_id;

    -- 10. Assignments
    INSERT INTO identity.user_teams (organization_user_id, team_id, organization_id)
    VALUES (v_org_user_id, v_team_id, p_org_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO identity.user_roles (organization_user_id, role_id, team_id, organization_id)
    VALUES (v_org_user_id, v_role_id, v_team_id, p_org_id)
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
        'status', 'promoted',
        'organization_id', p_org_id,
        'superadmin_user_id', v_user_id,
        'org_user_id', v_org_user_id,
        'role_id', v_role_id,
        'location_id', v_location_id,
        'team_id', v_team_id
    );
END;
