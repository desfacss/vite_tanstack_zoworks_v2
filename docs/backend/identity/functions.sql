/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.bootstrap_user_to_org
   📝 ARGUMENTS: (p_user_id uuid, p_organization_id uuid, p_is_admin boolean DEFAULT false)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.bootstrap_user_to_org(p_user_id uuid, p_organization_id uuid, p_is_admin boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_location_id UUID;
    v_role_id UUID;
    v_team_id UUID;
    v_org_user_id UUID;
    v_org_name TEXT;
    v_user_name TEXT;
    v_result jsonb := '{}'::jsonb;
BEGIN
    -- Get org name for default naming
    SELECT name INTO v_org_name FROM identity.organizations WHERE id = p_organization_id;
    IF v_org_name IS NULL THEN
        RAISE EXCEPTION 'Organization % not found', p_organization_id;
    END IF;

    -- Get user name
    SELECT name INTO v_user_name FROM identity.users WHERE id = p_user_id;
    IF v_user_name IS NULL THEN
        RAISE EXCEPTION 'User % not found', p_user_id;
    END IF;

    -- 1. Check if organization_users record exists
    SELECT id INTO v_org_user_id 
    FROM identity.organization_users 
    WHERE organization_id = p_organization_id AND user_id = p_user_id;

    IF v_org_user_id IS NOT NULL THEN
        RAISE NOTICE 'User already exists in organization. Org User ID: %', v_org_user_id;
        v_result := v_result || jsonb_build_object('existing_org_user_id', v_org_user_id);
    END IF;

    -- 2. Create default location if none exists
    SELECT id INTO v_location_id 
    FROM identity.locations 
    WHERE organization_id = p_organization_id 
    LIMIT 1;

    IF v_location_id IS NULL THEN
        INSERT INTO identity.locations (
            organization_id, 
            name, 
            time_zone, 
            is_active,
            details,
            created_by
        ) VALUES (
            p_organization_id, 
            v_org_name || ' - HQ',
            'Asia/Kolkata',
            true,
            jsonb_build_object('address', 'Default Location', 'type', 'headquarters'),
            p_user_id
        )
        RETURNING id INTO v_location_id;
        
        RAISE NOTICE 'Created default location: %', v_location_id;
        v_result := v_result || jsonb_build_object('created_location_id', v_location_id);
    ELSE
        v_result := v_result || jsonb_build_object('existing_location_id', v_location_id);
    END IF;

    -- 3. Create default role if none exists for this org
    SELECT id INTO v_role_id 
    FROM identity.roles 
    WHERE organization_id = p_organization_id 
    AND (p_is_admin = false OR name ILIKE '%admin%')
    LIMIT 1;

    IF v_role_id IS NULL THEN
        INSERT INTO identity.roles (
            organization_id,
            location_id,
            name,
            permissions,
            is_active,
            is_sassadmin,
            feature,
            created_by
        ) VALUES (
            p_organization_id,
            v_location_id,
            CASE WHEN p_is_admin THEN 'Administrator' ELSE 'Staff' END,
            CASE WHEN p_is_admin 
                THEN '{"all": true}'::jsonb 
                ELSE '{"read": true, "write": true}'::jsonb 
            END,
            true,
            p_is_admin,
            '["inbox", "contacts", "templates", "sequences", "analytics", "settings"]'::jsonb,
            p_user_id
        )
        RETURNING id INTO v_role_id;
        
        RAISE NOTICE 'Created role: %', v_role_id;
        v_result := v_result || jsonb_build_object('created_role_id', v_role_id);
    ELSE
        v_result := v_result || jsonb_build_object('existing_role_id', v_role_id);
    END IF;

    -- 4. Create default team if none exists
    SELECT id INTO v_team_id 
    FROM identity.teams 
    WHERE organization_id = p_organization_id 
    AND location_id = v_location_id
    LIMIT 1;

    IF v_team_id IS NULL THEN
        INSERT INTO identity.teams (
            organization_id,
            location_id,
            name,
            details,
            created_by
        ) VALUES (
            p_organization_id,
            v_location_id,
            'General Team',
            jsonb_build_object('description', 'Default team for ' || v_org_name),
            p_user_id
        )
        RETURNING id INTO v_team_id;
        
        RAISE NOTICE 'Created team: %', v_team_id;
        v_result := v_result || jsonb_build_object('created_team_id', v_team_id);
    ELSE
        v_result := v_result || jsonb_build_object('existing_team_id', v_team_id);
    END IF;

    -- 5. Create organization_users record if not exists
    IF v_org_user_id IS NULL THEN
        INSERT INTO identity.organization_users (
            organization_id,
            user_id,
            location_id,
            is_active,
            status,
            created_by
        ) VALUES (
            p_organization_id,
            p_user_id,
            v_location_id,
            true,
            'ONLINE'::public.user_status,
            p_user_id
        )
        RETURNING id INTO v_org_user_id;
        
        RAISE NOTICE 'Created org user: %', v_org_user_id;
        v_result := v_result || jsonb_build_object('created_org_user_id', v_org_user_id);
    END IF;

    -- 6. Add user_roles record if not exists
    IF NOT EXISTS (
        SELECT 1 FROM identity.user_roles 
        WHERE organization_user_id = v_org_user_id AND role_id = v_role_id
    ) THEN
        INSERT INTO identity.user_roles (
            organization_id,
            organization_user_id,
            role_id,
            team_id,
            created_by,
            last_assigned_at
        ) VALUES (
            p_organization_id,
            v_org_user_id,
            v_role_id,
            v_team_id,
            p_user_id,
            NOW()
        );
        
        RAISE NOTICE 'Assigned role to user';
        v_result := v_result || jsonb_build_object('assigned_role', true);
    END IF;

    -- 7. Add user_teams record if not exists
    IF NOT EXISTS (
        SELECT 1 FROM identity.user_teams 
        WHERE organization_user_id = v_org_user_id AND team_id = v_team_id
    ) THEN
        INSERT INTO identity.user_teams (
            organization_user_id,
            team_id,
            created_by,
            last_assigned_at
        ) VALUES (
            v_org_user_id,
            v_team_id,
            p_user_id,
            NOW()
        );
        
        RAISE NOTICE 'Assigned team to user';
        v_result := v_result || jsonb_build_object('assigned_team', true);
    END IF;

    -- 8. Update user's pref_organization_id if needed
    UPDATE identity.users
    SET pref_organization_id = p_organization_id
    WHERE id = p_user_id
    AND (pref_organization_id IS NULL OR pref_organization_id != p_organization_id);

    v_result := v_result || jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'organization_id', p_organization_id,
        'organization_name', v_org_name,
        'user_name', v_user_name
    );

    RETURN v_result;
END;
$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.cleanup_org_data
   📝 ARGUMENTS: (p_organization_id uuid, p_confirm text DEFAULT ''::text)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.cleanup_org_data(p_organization_id uuid, p_confirm text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_result jsonb := '{}'::jsonb;
    v_count INT;
BEGIN
    -- Safety check
    IF p_confirm != 'DELETE_ALL' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Must pass p_confirm := ''DELETE_ALL'' to confirm deletion'
        );
    END IF;

    -- Delete user_roles for this org
    DELETE FROM identity.user_roles WHERE organization_id = p_organization_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('deleted_user_roles', v_count);

    -- Delete user_teams for this org (via organization_users)
    DELETE FROM identity.user_teams 
    WHERE organization_user_id IN (
        SELECT id FROM identity.organization_users WHERE organization_id = p_organization_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('deleted_user_teams', v_count);

    -- Delete organization_users
    DELETE FROM identity.organization_users WHERE organization_id = p_organization_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('deleted_org_users', v_count);

    -- Delete teams
    DELETE FROM identity.teams WHERE organization_id = p_organization_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('deleted_teams', v_count);

    -- Delete roles
    DELETE FROM identity.roles WHERE organization_id = p_organization_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('deleted_roles', v_count);

    -- Delete locations
    DELETE FROM identity.locations WHERE organization_id = p_organization_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('deleted_locations', v_count);

    RETURN v_result || jsonb_build_object(
        'success', true,
        'organization_id', p_organization_id
    );
END;
$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.cleanup_user_from_org
   📝 ARGUMENTS: (p_user_id uuid, p_organization_id uuid, p_hard_delete boolean DEFAULT false)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.cleanup_user_from_org(p_user_id uuid, p_organization_id uuid, p_hard_delete boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_org_user_id UUID;
    v_deleted_roles INT := 0;
    v_deleted_teams INT := 0;
    v_result jsonb := '{}'::jsonb;
BEGIN
    -- Find the organization_users record
    SELECT id INTO v_org_user_id 
    FROM identity.organization_users 
    WHERE organization_id = p_organization_id AND user_id = p_user_id;

    IF v_org_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found in organization'
        );
    END IF;

    IF p_hard_delete THEN
        -- Hard delete: Remove all records
        
        -- Delete user_roles
        DELETE FROM identity.user_roles 
        WHERE organization_user_id = v_org_user_id;
        GET DIAGNOSTICS v_deleted_roles = ROW_COUNT;
        
        -- Delete user_teams
        DELETE FROM identity.user_teams 
        WHERE organization_user_id = v_org_user_id;
        GET DIAGNOSTICS v_deleted_teams = ROW_COUNT;
        
        -- Delete organization_users
        DELETE FROM identity.organization_users 
        WHERE id = v_org_user_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'action', 'hard_delete',
            'deleted_roles', v_deleted_roles,
            'deleted_teams', v_deleted_teams,
            'deleted_org_user', true
        );
    ELSE
        -- Soft delete: Just deactivate
        UPDATE identity.organization_users 
        SET is_active = false, 
            status = 'OFFLINE'::public.user_status,
            updated_at = NOW()
        WHERE id = v_org_user_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'action', 'soft_delete',
            'org_user_deactivated', true
        );
    END IF;

    -- Clear pref_organization_id if it was this org
    UPDATE identity.users
    SET pref_organization_id = NULL
    WHERE id = p_user_id
    AND pref_organization_id = p_organization_id;

    RETURN v_result || jsonb_build_object(
        'user_id', p_user_id,
        'organization_id', p_organization_id
    );
END;
$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.get_all_approvers
   📝 ARGUMENTS: (p_submitter_org_user_id uuid, p_organization_id uuid, p_hr_role_id uuid, p_created_at timestamp with time zone, p_current_time timestamp with time zone)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.get_all_approvers(p_submitter_org_user_id uuid, p_organization_id uuid, p_hr_role_id uuid, p_created_at timestamp with time zone, p_current_time timestamp with time zone)
 RETURNS TABLE(approver_user_id uuid, eligibility_window text)
 LANGUAGE plpgsql
 STABLE
AS $function$-- DECLARE
--     v_l1_manager_org_user_id uuid;
--     v_window_end timestamptz := p_created_at + INTERVAL '48 hours';
--     v_is_48_hours_passed boolean := p_current_time >= v_window_end;
-- BEGIN
--     -- Step 1: Find the L1 Manager's org_user_id
--     SELECT manager_id INTO v_l1_manager_org_user_id
--     FROM identity.organization_users
--     WHERE id = p_submitter_org_user_id
--       AND organization_id = p_organization_id;

--     -- Step 2: Logic for L1-Only Window (First 48 hours)
--     IF NOT v_is_48_hours_passed AND v_l1_manager_org_user_id IS NOT NULL THEN
--         -- Only L1 is eligible during this time
--         RETURN QUERY
--         SELECT ou.user_id, 'L1_ONLY_48H'
--         FROM identity.organization_users ou
--         WHERE ou.id = v_l1_manager_org_user_id;
--         RETURN;
--     END IF;

--     -- Step 3: Logic for Full Approval Pool (After 48 hours OR if L1 is NULL)
--     RETURN QUERY
--     WITH RECURSIVE reporting_chain AS (
--         -- Base Case: The submitter's direct manager (level 1)
--         SELECT
--             ou.id AS org_user_id,
--             ou.user_id,
--             ou.manager_id AS next_manager_org_user_id,
--             1 AS level
--         FROM identity.organization_users ou
--         WHERE ou.id = p_submitter_org_user_id
--           AND ou.organization_id = p_organization_id
--           AND ou.manager_id IS NOT NULL

--         UNION ALL

--         -- Recursive Step: Traverse up the chain
--         SELECT
--             u.id AS org_user_id,
--             u.user_id,
--             u.manager_id AS next_manager_org_user_id,
--             r.level + 1
--         FROM identity.organization_users u
--         INNER JOIN reporting_chain r ON u.id = r.next_manager_org_user_id
--         WHERE r.next_manager_org_user_id IS NOT NULL
--           AND u.organization_id = p_organization_id
--     ),
--     manager_approvers AS (
--         -- Select L1 and all managers above
--         SELECT user_id FROM reporting_chain WHERE level >= 1
--     ),
--     hr_approvers AS (
--         -- Find HR users within the same organization
--         SELECT ur.user_id
--         FROM identity.organization_users ou
--         JOIN identity.user_roles ur ON ou.id = ur.organization_user_id
--         WHERE ou.organization_id = p_organization_id
--           AND ur.role_id = p_hr_role_id
--     )
--     SELECT ma.user_id, 'FULL_POOL_AFTER_48H' FROM manager_approvers ma
--     UNION -- Use UNION to combine distinct users
--     SELECT hra.user_id, 'FULL_POOL_AFTER_48H' FROM hr_approvers hra;

-- END;
-- USING LTREE INSTEAD OF RECURSIVE 
DECLARE
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    get_all_approvers
     * PURPOSE:     Calculates the chain of command for workflow approvals.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. THE 48-HOUR RULE: If a request is < 48 hours old, only the direct manager (L1)
     *    is eligible to approve. This prevents "skip-level" approvals too early.
     * 2. ESCALATION: After 48 hours, or if no L1 manager exists, the "Full Pool" is released.
     * 3. FULL POOL: includes all managers up the hierarchy path AND all users with the
     *    specified HR role for the organization.
     * 4. ISOLATION: All lookups are strictly scoped by p_organization_id.
     * 
     * USE CASES:
     * - Standard leave requests (Manager only first 2 days).
     * - Escalated requests (VPs/HR can step in after 2 days).
     * - Automatic routing for organizations with flat structures.
     * 
     * TECHNICAL LOGIC:
     * - Uses PostgreSQL LTREE (@>) for sub-millisecond ancestor traversal.
     * - Avoids recursive CTEs for better performance at scale.
     * - window_tag provides audit labels for the UI ('L1_ONLY_48H' or 'FULL_POOL_AFTER_48H').
     * ======================================================================================
     */
    v_l1_manager_org_user_id uuid;
    v_window_end timestamptz := p_created_at + INTERVAL '48 hours';
    v_is_48_hours_passed boolean := p_current_time >= v_window_end;
    v_submitter_path extensions.ltree; -- For ltree query
BEGIN
    -- Get the submitter's path for the full pool query
    SELECT ou.path
    INTO v_submitter_path
    FROM identity.organization_users ou
    WHERE ou.id = p_submitter_org_user_id;

    -- Step 1: Find the L1 Manager's org_user_id (no change, this is fine)
    SELECT manager_id INTO v_l1_manager_org_user_id
    FROM identity.organization_users
    WHERE id = p_submitter_org_user_id
      AND organization_id = p_organization_id;

    -- Step 2: Logic for L1-Only Window (no change)
    IF NOT v_is_48_hours_passed AND v_l1_manager_org_user_id IS NOT NULL THEN
        RETURN QUERY
        SELECT ou.user_id, 'L1_ONLY_48H'
        FROM identity.organization_users ou
        WHERE ou.id = v_l1_manager_org_user_id;
        RETURN;
    END IF;

    -- Step 3: Logic for Full Approval Pool (After 48 hours OR if L1 is NULL)
    -- This block is now optimized with ltree
    RETURN QUERY
    WITH manager_approvers AS (
        -- === OPTIMIZED BLOCK ===
        -- Replaced the recursive CTE with a fast ltree query
        SELECT
          ou.user_id
        FROM
          identity.organization_users ou
        WHERE
          -- ou.path is an ANCESTOR of the submitter's path
          ou.path @> v_submitter_path
          -- Exclude the submitter themselves
          AND ou.id != p_submitter_org_user_id
          -- Stay in the same org
          AND ou.organization_id = p_organization_id
    ),
    hr_approvers AS (
        -- Find HR users (no change)
        SELECT ou.user_id -- Fixed your query, it was selecting ur.user_id
        FROM identity.organization_users ou
        JOIN identity.user_roles ur ON ou.id = ur.organization_user_id
        WHERE ou.organization_id = p_organization_id
          AND ur.role_id = p_hr_role_id
    )
    SELECT ma.user_id, 'FULL_POOL_AFTER_48H' FROM manager_approvers ma
    UNION -- Use UNION to combine distinct users
    SELECT hra.user_id, 'FULL_POOL_AFTER_48H' FROM hr_approvers hra;

END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.get_all_approvers_from_blueprint
   📝 ARGUMENTS: (p_submitter_org_user_id uuid, p_organization_id uuid, p_blueprint_definition jsonb, p_current_stage_id text, p_created_at timestamp with time zone, p_current_time timestamp with time zone)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.get_all_approvers_from_blueprint(p_submitter_org_user_id uuid, p_organization_id uuid, p_blueprint_definition jsonb, p_current_stage_id text, p_created_at timestamp with time zone, p_current_time timestamp with time zone)
 RETURNS TABLE(approver_user_id uuid, eligibility_window text)
 LANGUAGE plpgsql
 STABLE
AS $function$DECLARE
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    get_all_approvers_from_blueprint
     * PURPOSE:     Dynamic approval routing based on Blueprint JSON definitions.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. BLUEPRINT DRIVEN: Logic is NOT hardcoded (unlike get_all_approvers). It reads
     *    'approval_rules' from the provided 'p_blueprint_definition'.
     * 2. PHASED ESCALATION: Supports multiple phases based on 'time_window_hours'.
     *    System selects the FIRST active phase where time < window_end.
     * 3. MULTI-MODE ROUTING:
     *    - 'MANAGER_LEVEL': Routes to specific depths (L1, L2 to L3, etc).
     *    - 'ROLE': Routes to all active users holding a specific role.
     * 
     * USE CASES:
     * - Complex PO approvals (Amount > 10k -> Finance Role).
     * - Multi-stage hiring approvals.
     * - Custom escalation paths beyond the standard 48h L1 rule.
     * 
     * TECHNICAL LOGIC:
     * - Iterates through blueprint stages and phases to find the active rule set.
     * - window_tag is dynamically pulled from the blueprint JSON.
     * - Filters results by is_active = TRUE for all candidates.
     * ======================================================================================
     */
    v_stage_rules jsonb;
    v_active_phase jsonb;
    v_approver_definition jsonb;
    v_window_end timestamptz;
    v_time_window_hours integer;
    v_phase_is_active boolean := FALSE;
    v_row RECORD; -- Used to iterate over query results
BEGIN
    SELECT stage -> 'approval_rules'
    INTO v_stage_rules
    FROM jsonb_array_elements(p_blueprint_definition -> 'stages') AS stage
    WHERE stage ->> 'id' = p_current_stage_id;

    IF v_stage_rules IS NULL OR v_stage_rules -> 'phases' IS NULL THEN
        RAISE WARNING 'No approval rules or phases found for stage %', p_current_stage_id;
        RETURN;
    END IF;

    FOR v_active_phase IN
        SELECT jsonb_array_elements(v_stage_rules -> 'phases')
        ORDER BY (value->>'time_window_hours')::integer NULLS LAST
    LOOP
        v_time_window_hours := (v_active_phase ->> 'time_window_hours')::integer;
        v_phase_is_active := FALSE;

        IF v_time_window_hours IS NOT NULL THEN
            v_window_end := p_created_at + (v_time_window_hours || ' hours')::interval;
            v_phase_is_active := p_current_time < v_window_end;
        ELSE
            v_phase_is_active := TRUE;
        END IF;

        IF v_phase_is_active THEN
            -- Process Approvers for this Active Phase
            FOR v_approver_definition IN
                SELECT jsonb_array_elements(v_active_phase -> 'approvers')
            LOOP
                IF v_approver_definition ->> 'type' = 'MANAGER_LEVEL' THEN
                    -- Loop over the query results and RETURN NEXT for each row
                    FOR v_row IN
                        WITH RECURSIVE reporting_chain AS (
                            SELECT ou.id AS org_user_id, ou.user_id, ou.manager_id AS next_manager_org_user_id, 1 AS level
                            FROM identity.organization_users ou
                            WHERE ou.id = p_submitter_org_user_id AND ou.organization_id = p_organization_id AND ou.manager_id IS NOT NULL
                            UNION ALL
                            SELECT u.id AS org_user_id, u.user_id, u.manager_id AS next_manager_org_user_id, r.level + 1
                            FROM identity.organization_users u INNER JOIN reporting_chain r ON u.id = r.next_manager_org_user_id
                            WHERE r.next_manager_org_user_id IS NOT NULL AND u.organization_id = p_organization_id
                        )
                        SELECT rc.user_id, v_active_phase ->> 'window_tag' AS window_tag
                        FROM reporting_chain rc
                        WHERE rc.level >= (v_approver_definition ->> 'level_start')::integer
                          AND (v_approver_definition ->> 'level_end' = 'infinity' OR rc.level <= (v_approver_definition ->> 'level_end')::integer)
                    LOOP
                        -- Assign to the OUT parameters and return
                        approver_user_id := v_row.user_id;
                        eligibility_window := v_row.window_tag;
                        RETURN NEXT;
                    END LOOP;

                ELSIF v_approver_definition ->> 'type' = 'ROLE' THEN
                    -- Loop over the query results and RETURN NEXT for each row
                    FOR v_row IN
                        SELECT ou.user_id, v_active_phase ->> 'window_tag' AS window_tag
                        FROM identity.organization_users ou JOIN identity.user_roles ur ON ou.id = ur.organization_user_id
                        WHERE ou.organization_id = p_organization_id
                          AND ur.role_id = (v_approver_definition ->> 'role_id')::uuid
                          AND ou.is_active = TRUE
                    LOOP
                        -- Assign to the OUT parameters and return
                        approver_user_id := v_row.user_id;
                        eligibility_window := v_row.window_tag;
                        RETURN NEXT;
                    END LOOP;
                END IF;
            END LOOP; -- End inner loop (approver definitions)

            -- Found and processed the *first* active phase, so exit the function.
            RETURN;

        END IF; -- End if phase is active
    END LOOP; -- End outer loop (phases)

    RAISE WARNING 'No active approval phase found for stage % at time %', p_current_stage_id, p_current_time;
    RETURN;
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.get_manager_at_level
   📝 ARGUMENTS: (p_org_user_id uuid, p_organization_id uuid, p_level integer)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.get_manager_at_level(p_org_user_id uuid, p_organization_id uuid, p_level integer)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
AS $function$-- DECLARE
--     v_manager_org_user_id UUID; -- Variable to store the result
-- BEGIN
--     -- Input validation
--     IF p_level < 1 THEN
--         RETURN NULL;
--     END IF;

--     WITH RECURSIVE reporting_chain AS (
--         -- Base Case: The user's direct manager's membership record (level 1)
--         -- We select the manager's record directly here.
--         SELECT
--             mgr_ou.id AS manager_org_user_id,
--             mgr_ou.manager_id AS next_manager_org_user_id,
--             1 AS level
--         FROM identity.organization_users ou
--         JOIN identity.organization_users mgr_ou ON ou.manager_id = mgr_ou.id -- Join to get the manager record
--         WHERE ou.id = p_org_user_id
--           AND ou.organization_id = p_organization_id
--           AND ou.manager_id IS NOT NULL

--         UNION ALL

--         -- Recursive Step: Traverse up the chain to the *next* manager's record
--         SELECT
--             u.id AS manager_org_user_id,
--             u.manager_id AS next_manager_org_user_id,
--             r.level + 1
--         FROM identity.organization_users u
--         INNER JOIN reporting_chain r ON u.id = r.next_manager_org_user_id -- Join based on the manager link
--         WHERE r.next_manager_org_user_id IS NOT NULL
--           AND u.organization_id = p_organization_id -- Stay within the org
--     )
--     -- Select the ID of the manager AT the requested level
--     SELECT manager_org_user_id
--     INTO v_manager_org_user_id -- Store result in variable
--     FROM reporting_chain
--     WHERE level = p_level
--     LIMIT 1;

--     RETURN v_manager_org_user_id; -- Return the found ID or NULL
-- END;
-- USING LTREE INSTEAD OF RECURSIVE 
DECLARE
 /*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    get_manager_at_level
     * PURPOSE:     Identifies a specific management node (e.g., L2 Manager) via hierarchy.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. RELATIVE DEPTH: Level is relative to the user. p_level=1 is the direct manager.
     * 2. BOUNDS CHECK: Returns NULL if the requested level exceeds the tree depth 
     *    (e.g., asking for L5 manager when the CEO is only 2 levels away).
     * 3. ORG ISOLATION: Strictly scoped to the organization in context.
     * 
     * USE CASES:
     * - "Send notification to the Department Head (L3)".
     * - Approval routing requiring a specific seniority level.
     * 
     * TECHNICAL LOGIC:
     * - Leverages LTREE path string slicing for O(1) depth calculation.
     * - nlevel() determines current depth; subpath() extracts the target ancestor path.
     * ======================================================================================
     */
    v_submitter_path extensions.ltree;
    v_manager_path_level int;
    v_manager_path extensions.ltree;
    v_manager_org_user_id UUID;
BEGIN
    -- Input validation
    IF p_level < 1 THEN
        RETURN NULL;
    END IF;

    -- Step 1: Get the submitter's ltree path
    SELECT ou.path
    INTO v_submitter_path
    FROM identity.organization_users ou
    WHERE ou.id = p_org_user_id
      AND ou.organization_id = p_organization_id;

    IF v_submitter_path IS NULL THEN
        RETURN NULL; -- Submitter not found or has no path
    END IF;

    -- Step 2: Calculate the ltree level of the target manager
    -- nlevel('A.B.C') = 3. L1 manager is 'A.B' (level 2).
    -- So, manager_level = nlevel(path) - p_level
    v_manager_path_level := nlevel(v_submitter_path) - p_level;

    -- Check if the requested level is deeper than the user's hierarchy
    IF v_manager_path_level < 1 THEN
        RETURN NULL; -- e.g., asking for L3 manager of an L2 employee
    END IF;

    -- Step 3: Calculate the manager's exact path
    -- subpath('A.B.C.D', 0, 3) = 'A.B.C' (the L1 manager)
    -- subpath('A.B.C.D', 0, 2) = 'A.B'   (the L2 manager)
    v_manager_path := subpath(v_submitter_path, 0, v_manager_path_level);

    -- Step 4: Find the user who has this exact path in the org
    SELECT ou.id
    INTO v_manager_org_user_id
    FROM identity.organization_users ou
    WHERE ou.path = v_manager_path
      AND ou.organization_id = p_organization_id
    LIMIT 1;

    RETURN v_manager_org_user_id;
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.get_my_organizations
   📝 ARGUMENTS: ()
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.get_my_organizations()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
    -- DEV NOTES (get_my_organizations_v5)
    --------------------------------------------------------------------------------
    -- PURPOSE: Retrieves all active organizations and associated accessible locations 
    --          for the current authenticated user (auth.uid()).
    --
    -- CHANGES FROM V4:
    -- 1. Default Location Elevation: The default location information (ID and Name) 
    --    is now pulled up and included as a separate field directly under the 
    --    organization object, adhering to the requested format.
    -- 2. is_default Removal: The 'is_default' boolean flag has been removed from 
    --    the individual location objects in the 'locations' array.
    -- 3. Deduplication Fix: The all_accessible_locations CTE logic is refined to 
    --    ensure each unique location appears only once, regardless of whether it was 
    --    accessed directly or via a team.
    --------------------------------------------------------------------------------

    /*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    get_my_organizations
     * PURPOSE:     Retrieves the tenant landscape for the current user session.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. MULTI-TENANCY: Users may belong to multiple organizations. This function returns
     *    all active memberships for the caller (auth.uid()).
     * 2. LOCATION DISCOVERY: Aggregates all accessible locations:
     *    - Direct: assigned to the 'organization_users' record.
     *    - Team: inherited from any 'teams' the user is a member of.
     * 3. DATA ELEVATION: The primary (default) location is elevated to the root of the
     *    org object for UI convenience.
     * 
     * USE CASES:
     * - Initial login "Organization Selector".
     * - Populating the "Switch Context" dropdown in the application header.
     * 
     * TECHNICAL LOGIC:
     * - Uses a sequence of CTEs to resolve user -> memberships -> teams -> locations.
     * - Ensures deduplication of location IDs using UNION + DISTINCT.
     * - Returns a JSONB array, strictly ordered by organization_name.
     * ======================================================================================
     */

    v_user_id UUID;
    v_result jsonb;
BEGIN
    -- 1. Resolve current user
    SELECT id INTO v_user_id
    FROM identity.users
    WHERE auth_id = auth.uid();

    IF v_user_id IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    -- 2. Fetch all active organization memberships, including the user's default location ID
    WITH org_user_info AS (
        SELECT 
            ou.organization_id,
            o.name AS organization_name,
            ou.location_id AS default_location_id, 
            ou.id AS organization_user_id
        FROM identity.organization_users ou
        JOIN identity.organizations o ON ou.organization_id = o.id
        WHERE ou.user_id = v_user_id
          AND ou.is_active = true
    ),
    
    -- 3. Determine the name of the default location (if available)
    org_user_with_default_location AS (
        SELECT 
            oui.organization_id,
            oui.organization_name,
            oui.default_location_id,
            oui.organization_user_id,
            l.name AS default_location_name
        FROM org_user_info oui
        LEFT JOIN identity.locations l ON oui.default_location_id = l.id
    ),

    -- 4a. Get all locations accessible via direct assignment (if set)
    direct_location_access AS (
        SELECT 
            ouwdl.organization_id,
            ouwdl.default_location_id AS location_id,
            ouwdl.default_location_name AS location_name
        FROM org_user_with_default_location ouwdl
        WHERE ouwdl.default_location_id IS NOT NULL
    ),
    
    -- 4b. Get all team-assigned locations
    team_locations AS (
        SELECT 
            ouwdl.organization_id,
            l.id AS location_id,
            l.name AS location_name
        FROM identity.user_teams ut
        JOIN identity.teams t ON ut.team_id = t.id
        JOIN identity.locations l ON t.location_id = l.id
        JOIN org_user_with_default_location ouwdl 
            ON ut.organization_user_id = ouwdl.organization_user_id
        WHERE t.location_id IS NOT NULL
    ),
    
    -- 5. Union of all accessible locations (DEDUPED)
    all_accessible_locations AS (
        SELECT DISTINCT organization_id, location_id, location_name
        FROM (
            SELECT * FROM direct_location_access
            UNION 
            SELECT * FROM team_locations
        ) combined
    ),
    
    -- 6. Final aggregation per organization
    org_with_locations AS (
        SELECT 
            ouwdl.organization_id,
            ouwdl.organization_name,
            -- Add the default location fields directly to the organization object
            ouwdl.default_location_id,
            ouwdl.default_location_name,
            
            COALESCE(jsonb_agg(
                jsonb_build_object(
                    'location_id', al.location_id,
                    'location_name', al.location_name
                    -- Removed 'is_default' flag
                ) ORDER BY al.location_name
            ) FILTER (WHERE al.location_id IS NOT NULL), '[]'::jsonb) AS locations
            
        FROM org_user_with_default_location ouwdl
        LEFT JOIN all_accessible_locations al 
            ON al.organization_id = ouwdl.organization_id
        GROUP BY 
            ouwdl.organization_id, ouwdl.organization_name, 
            ouwdl.default_location_id, ouwdl.default_location_name
    )

    -- 7. Build final JSON array, ordered by organization name
    SELECT jsonb_agg(
        jsonb_build_object(
            'organization_id', organization_id,
            'organization_name', organization_name,
            'default_location_id', default_location_id,      -- New field
            'default_location_name', default_location_name,  -- New field
            'locations', locations
        ) ORDER BY organization_name
    ) INTO v_result
    FROM org_with_locations;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.get_subordinates_by_user
   📝 ARGUMENTS: (p_manager_user_id uuid, p_organization_id uuid)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.get_subordinates_by_user(p_manager_user_id uuid, p_organization_id uuid)
 RETURNS TABLE(subordinate_user_id uuid)
 LANGUAGE plpgsql
 STABLE
AS $function$-- DECLARE
--     v_manager_org_user_id UUID; -- Variable to store the looked-up ID
-- BEGIN
--     -- Step 1: Find the manager's specific organization_user ID
--     SELECT id INTO v_manager_org_user_id
--     FROM identity.organization_users
--     WHERE user_id = p_manager_user_id
--       AND organization_id = p_organization_id;

--     -- If no membership record is found for the manager in this org, return empty
--     IF v_manager_org_user_id IS NULL THEN
--         RETURN;
--     END IF;

--     -- Step 2: Use the found org_user_id in the recursive query (same logic as before)
--     RETURN QUERY
--     WITH RECURSIVE subordinates_cte AS (
--         -- Base Case: Direct reports
--         SELECT id, user_id
--         FROM identity.organization_users
--         WHERE manager_id = v_manager_org_user_id -- Use the looked-up ID
--           AND organization_id = p_organization_id

--         UNION ALL

--         -- Recursive Step: Reports of reports
--         SELECT u.id, u.user_id
--         FROM identity.organization_users u
--         JOIN subordinates_cte s ON u.manager_id = s.id -- Join still uses org_user ID
--         WHERE u.organization_id = p_organization_id
--     )
--     SELECT s.user_id -- Return the actual user IDs
--     FROM subordinates_cte s;
-- END;
-- USING LTREE SOLUTION INSTEAD OF RECURSIVE ADJACENT ROW APPROACH
DECLARE
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    get_subordinates_by_user
     * PURPOSE:     Retrieves the entire direct/indirect reporting sub-tree.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. RECURSIVE DISCOVERY: Returns ALL nodes where the manager's path is an ancestor.
     * 2. EXCLUSION: The manager themselves is excluded from the result set.
     * 3. ORG BOUNDARY: Strictly limited to the p_organization_id.
     * 
     * USE CASES:
     * - "Show my Team" UI view.
     * - Filtering reports/dashboards to only show data for a manager's sub-tree.
     * - Global "CEO View" of the entire organization.
     * 
     * TECHNICAL LOGIC:
     * - Uses LTREE's <@ (descendant) operator for high-speed sub-tree scanning.
     * - Leverages the GIST index on the 'path' column.
     * ======================================================================================
     */
    v_manager_record RECORD; -- Will hold the manager's ID and ltree path
BEGIN
    -- Step 1: Find the manager's organization_user record, specifically their ID and path.
    SELECT ou.id, ou.path
    INTO v_manager_record
    FROM identity.organization_users ou
    WHERE ou.user_id = p_manager_user_id
      AND ou.organization_id = p_organization_id;

    -- If no membership record is found, return empty
    IF v_manager_record.id IS NULL THEN
        RETURN;
    END IF;

    -- Step 2: Use the manager's path to find all descendants
    RETURN QUERY
    SELECT
      ou.user_id -- Return the actual user_ids
    FROM
      identity.organization_users ou
    WHERE
      -- ou.path is a descendant of the manager's path
      ou.path <@ v_manager_record.path
      -- Exclude the manager themselves from the list
      AND ou.id != v_manager_record.id
      -- Ensure we stay within the same organization
      AND ou.organization_id = p_organization_id;
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.jwt_generate_thin_claims
   📝 ARGUMENTS: (p_auth_id uuid)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.jwt_generate_thin_claims(p_auth_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    jwt_generate_thin_claims
     * PURPOSE:     Generates lightweight JWT claims for minimal overhead.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. EFFICIENCY: Designed for internal service-to-service calls where full RBAC 
     *    and hierarchy maps are unnecessary.
     * 2. PREFERRED TENANT: Detects the user's preferred organization or falls back 
     *    to the first available active membership.
     * 3. SERVICE ROLE LOGIC: If the user is a member of the 'zoworks' organization,
     *    they are granted the 'service_role' DB role for internal system actions.
     * 
     * USE CASES:
     * - Background worker processes (Edge Functions).
     * - Cron-job based automation triggers.
     * - High-frequency internal lookups.
     * 
     * TECHNICAL LOGIC:
     * - Skips expensive loops for roles, permissions, and ltrees.
     * - Returns a flat JSON object with user_id, role, and org_id.
     * ======================================================================================
     */
    v_user_record RECORD; -- Holds identity.users data
    v_is_zoworks_member BOOLEAN := false;
    v_db_role TEXT := 'authenticated';
    v_preferred_org_id UUID;
BEGIN
    -- Get core user record including the preferred org
    SELECT id, pref_organization_id -- USE THE NEW NAME
    INTO v_user_record
    FROM identity.users
    WHERE auth_id = p_auth_id;

    IF v_user_record IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;

    -- Check if the user is a member of the 'zoworks' organization
    SELECT EXISTS (
        SELECT 1
        FROM identity.organization_users ou
        JOIN identity.organizations o ON ou.organization_id = o.id
        WHERE ou.user_id = v_user_record.id AND o.name = 'zoworks' -- Use your master org name
    ) INTO v_is_zoworks_member;

    IF v_is_zoworks_member THEN
        v_db_role := 'service_role';
        v_preferred_org_id := v_user_record.pref_organization_id; -- Use the stored pref if any
    ELSE
        v_db_role := 'authenticated';
        -- Ensure the preferred_org_id is valid for this user
         SELECT ou.organization_id INTO v_preferred_org_id
         FROM identity.organization_users ou
         WHERE ou.user_id = v_user_record.id
           AND ou.organization_id = v_user_record.pref_organization_id -- USE THE NEW NAME
           AND ou.is_active = true;

        -- Fallback if preferred is invalid or null: pick their first active org
        IF v_preferred_org_id IS NULL THEN
             SELECT ou.organization_id INTO v_preferred_org_id
             FROM identity.organization_users ou
             WHERE ou.user_id = v_user_record.id AND ou.is_active = true
             ORDER BY ou.created_at
             LIMIT 1;
        END IF;
    END IF;

    -- Construct claims including the determined org_id
    RETURN jsonb_build_object(
        'user_id', v_user_record.id,
        'role', v_db_role,
        'org_id', v_preferred_org_id -- Include the preferred/default org ID
    );
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.jwt_get_user_session
   📝 ARGUMENTS: (p_organization_id uuid)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.jwt_get_user_session(p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'identity', 'public', 'extensions'
AS $function$DECLARE
    /*
     * ======================================================================================
     * SYSTEM:      Identity & Access Management (v2)
     * FUNCTION:    jwt_get_user_session
     * DESCRIPTION: Generates the session claims JSON object for a user within a specific Org.
     * ======================================================================================
     * ARCHITECTURAL NOTES (FUTURE REFERENCE):
     * --------------------------------------------------------------------------------------
     * 1. PERFORMANCE STRATEGY (Consolidated Lookup):
     * - Uses a single INNER JOIN to fetch User, Org, and Membership data.
     * - Reduces DB round-trips from 3 to 1. Fails fast if any link is missing.
     *
     * 2. SECURITY:
     * - SECURITY DEFINER with fixed SEARCH_PATH prevents schema injection.
     * - Hardcoded 'zoworks' check grants super-admin privileges.
     *
     * 3. HIERARCHY LOGIC (LTREE):
     * - Uses '<@' (descendant) operator on 'identity.organization_users.path'.
     * - Requires GIST index on 'path' column for performance.
     * 4. DATA AGGREGATION:
     * - Permissions: Deeply merged from all assigned roles using 'jwt_jsonb_deep_merge_agg'.
     * - Locations: Union of direct assignments + inherited team locations.
     * - Output: Returns a JSONB object. Empty arrays are ensured via COALESCE.
     *
     * --------------------------------------------------------------------------------------
     * DATA SPECIFICATION / SAMPLE OUTPUT:
     * --------------------------------------------------------------------------------------
     * Returns a JSONB object.
     *
     * SCENARIO A: Standard User (with merged permissions & hierarchy)
     * {
     * "user_id": "a1b2c3d4-...",
     * "org_user_id": "x9y8z7w6-...",     // The membership ID
     * "org_id": "org-uuid-...",
     * "is_saas_admin": false,
     * "roles": [
     * { "id": 1, "name": "Sales Manager" }
     * ],
     * "permissions": {                   // Deep merged from all roles
     * "crm": { "leads": { "read": true, "write": true } },
     * "inventory": { "read": true }
     * },
     * "teams": [
     * { "id": 10, "name": "North East Sales" }
     * ],
     * "locations": [
     * { "id": 5, "name": "New York" }  // Direct + Team Inherited
     * ],
     * "subordinates": [                  // Array of User UUIDs (Recursive/Tree)
     * "sub-user-uuid-1",
     * "sub-user-uuid-2"
     * ]
     * }
     *
     * SCENARIO B: SaaS Super Admin ('zoworks')
     * {
     * "user_id": "...",
     * "is_saas_admin": true,
     * "permissions": { "admin": "all" },
     * "roles": [], "teams": [], "locations": [], "subordinates": []
     * }
     * ======================================================================================
     */
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    jwt_get_user_session
     * PURPOSE:     The primary Pre-Auth hook for generating session claims.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. SESSION ORCHESTRATION: Aggregates User, Org, Membership, Roles, and 
     *    Permissions into a single JSONB blob for the Supabase JWT.
     * 2. SAAS ADMIN BACKDOOR: If the organization name is 'zoworks', the user is 
     *    granted 'is_saas_admin: true' and global permissions '{"admin": "all"}'.
     * 3. RBAC AGGREGATION: Deep merges permissions from ALL roles assigned to the user.
     * 4. HIERARCHY MAP: Includes an array of all direct/indirect subordinate UUIDs 
     *    to power RLS-based management views.
     * 5. LOCATION INHERITANCE: Surfaces both direct and team-assigned locations.
     * 
     * USE CASES:
     * - Every user login/refresh in the application.
     * - Powering all Role-Based Access Control logic in the frontend and RLS.
     * 
     * TECHNICAL LOGIC:
     * - Uses a single optimized JOIN for core context discovery. Fails to '{}' if missing.
     * - Leverages GIST-indexed LTREE path comparisons for sub-tree calculation.
     * - Employs a recursive deep-merge aggregator for sophisticated permission sets.
     * ======================================================================================
     */
    -- Context Variables
    v_auth_id       UUID := auth.uid();
    v_user_id       UUID;
    v_org_id        UUID;
    v_org_name      TEXT;
    v_org_user_id   UUID;
    v_org_user_path ltree;

    v_claims        JSONB;

BEGIN
    -- [STEP 1] FAST CONTEXT LOOKUP
    SELECT 
        u.id, 
        o.id, 
        o.name, 
        ou.id, 
        ou.path
    INTO 
        v_user_id, 
        v_org_id, 
        v_org_name, 
        v_org_user_id, 
        v_org_user_path
    FROM identity.users u
    JOIN identity.organization_users ou ON u.id = ou.user_id
    JOIN identity.organizations o ON ou.organization_id = o.id
    WHERE u.auth_id = v_auth_id 
      AND o.id = p_organization_id;

    IF NOT FOUND THEN 
        RETURN '{}'::jsonb; 
    END IF;

    -- [STEP 2] SAAS SUPER ADMIN BYPASS
    IF v_org_name = 'zoworks' THEN
        RETURN jsonb_build_object(
            'user_id', v_user_id,
            'org_user_id', v_org_user_id,
            'org_id', v_org_id,
            'is_saas_admin', true,
            'permissions', '{"admin": "all"}'::jsonb,
            'roles', '[]'::jsonb,
            'teams', '[]'::jsonb,
            'locations', '[]'::jsonb,
            'subordinates', '[]'::jsonb
        );
    END IF;

    -- [STEP 3] STANDARD USER AGGREGATION
    WITH perms AS (
        SELECT
            jsonb_agg(DISTINCT jsonb_build_object('id', r.id, 'name', r.name)) AS roles,
            identity.jwt_jsonb_deep_merge_agg(r.permissions) AS permissions
        FROM identity.user_roles ur
        JOIN identity.roles r ON ur.role_id = r.id
        WHERE ur.organization_user_id = v_org_user_id
    ),
    locs AS (
        SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', l.id, 'name', l.name)), '[]'::jsonb) AS locations
        FROM (
            SELECT location_id FROM identity.organization_users WHERE id = v_org_user_id AND location_id IS NOT NULL
            UNION
            SELECT t.location_id FROM identity.user_teams ut
            JOIN identity.teams t ON ut.team_id = t.id
            WHERE ut.organization_user_id = v_org_user_id AND t.location_id IS NOT NULL
        ) src
        JOIN identity.locations l ON src.location_id = l.id
    ),
    teams AS (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name)), '[]'::jsonb) AS teams
        FROM identity.user_teams ut
        JOIN identity.teams t ON ut.team_id = t.id
        WHERE ut.organization_user_id = v_org_user_id
    ),
    subs AS (
        SELECT COALESCE(jsonb_agg(ou.user_id), '[]'::jsonb) AS user_ids
        FROM identity.organization_users ou
        WHERE ou.path <@ v_org_user_path
          AND ou.id <> v_org_user_id
          AND ou.organization_id = v_org_id
    )
    SELECT jsonb_build_object(
        'user_id', v_user_id,
        'org_user_id', v_org_user_id,
        'org_id', v_org_id,
        'is_saas_admin', false,
        'roles', COALESCE((SELECT roles FROM perms), '[]'::jsonb),
        'permissions', COALESCE((SELECT permissions FROM perms), '{}'::jsonb),
        'teams', (SELECT teams FROM teams),
        'locations', (SELECT locations FROM locs),
        'subordinates', (SELECT user_ids FROM subs)
    ) INTO v_claims;

    RETURN v_claims;
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.jwt_jsonb_deep_merge_agg
   📝 ARGUMENTS: (jsonb)
   ⚙️ TYPE: AGGREGATE
   ═══════════════════════════════════════════════════════ */

CREATE AGGREGATE identity.jwt_jsonb_deep_merge_agg (jsonb) (
    SFUNC = identity.jwt_jsonb_merge_deep,
    STYPE = jsonb,
    INITCOND = '{}'
);


/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.jwt_jsonb_merge_deep
   📝 ARGUMENTS: (val1 jsonb, val2 jsonb)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.jwt_jsonb_merge_deep(val1 jsonb, val2 jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$BEGIN
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    jwt_jsonb_merge_deep
     * PURPOSE:     Recursively merges two JSONB objects.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. HIERARCHICAL OVERRIDE: If a key exists in both, and the values are objects,
     *    they are merged recursively. Otherwise, the value from val2 overrides val1.
     * 2. NULL STRIPPING: Uses jsonb_strip_nulls to remove keys with null values.
     * 
     * USE CASES:
     * - Merging permission objects from multiple roles into a single session claim.
     * - Layering organization defaults over system defaults.
     * 
     * TECHNICAL LOGIC:
     * - Uses FULL OUTER JOIN on jsonb_each to identify matching keys.
     * - Recurses only when both values are of jsonb type 'object'.
     * ======================================================================================
     */
    RETURN jsonb_strip_nulls(jsonb_object_agg(
        COALESCE(ka, kb),
        CASE
            WHEN va IS NULL THEN vb
            WHEN vb IS NULL THEN va
            WHEN jsonb_typeof(va) = 'object' AND jsonb_typeof(vb) = 'object'
            THEN identity.jwt_jsonb_merge_deep(va, vb) -- Schema-qualified recursive call
            ELSE vb
        END
    ))
    FROM jsonb_each(val1) AS t1(ka, va)
    FULL OUTER JOIN jsonb_each(val2) AS t2(kb, vb) ON ka = kb;
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.reassign_reports_on_deactivation
   📝 ARGUMENTS: ()
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.reassign_reports_on_deactivation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$DECLARE
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    reassign_reports_on_deactivation
     * PURPOSE:     Prevents orphaned reports when a manager is deactivated.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. SKIP-LEVEL REASSIGNMENT: If a manager's status changes to 'inactive', their 
     *    direct reports are automatically moved to the deactivated manager's manager.
     * 2. ROOT DISCOVERY: If no skip-level manager exists, the reports are moved to 
     *    the root level (manager_id = NULL).
     * 3. TRIGGER MOMENT: Fires AFTER UPDATE on organization_users when status changes.
     * 
     * USE CASES:
     * - Employee offboarding or transition.
     * - Maintaining hierarchy integrity without manual HR intervention.
     * 
     * TECHNICAL LOGIC:
     * - Performs an atomic UPDATE on all rows where manager_id = OLD.id.
     * - Uses the OLD.manager_id as the new parent for the orphaned subtree.
     * ======================================================================================
     */
    v_l2_manager_org_user_id uuid;
BEGIN
    IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
        SELECT manager_id INTO v_l2_manager_org_user_id
        FROM identity.organization_users
        WHERE id = OLD.manager_id
          AND organization_id = OLD.organization_id;

        IF v_l2_manager_org_user_id IS NULL THEN
            RAISE WARNING 'User % (org_user_id %) is being deactivated but their manager (org_user_id %) has no manager. Reassigning % reports to NULL.',
                OLD.user_id, OLD.id, OLD.manager_id,
                (SELECT COUNT(*) FROM identity.organization_users WHERE manager_id = OLD.id AND organization_id = OLD.organization_id);
        END IF;

        UPDATE identity.organization_users
        SET manager_id = v_l2_manager_org_user_id
        WHERE manager_id = OLD.id
          AND organization_id = OLD.organization_id;
    END IF;

    RETURN NEW;
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.set_preferred_organization
   📝 ARGUMENTS: (new_org_id uuid)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.set_preferred_organization(new_org_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'identity', 'public'
AS $function$BEGIN
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    set_preferred_organization
     * PURPOSE:     Persists the user's selected organization for future sessions.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. SESSION PERSISTENCE: Updates the 'pref_organization_id' in identity.users.
     * 2. SECURITY: Uses SECURITY DEFINER to ensure the update succeeds even if RLS 
     *    on identity.users is restrictive during the organization switching phase.
     * 
     * USE CASES:
     * - User selects an organization from the switcher UI.
     * - Auto-redirecting users to their last used org on login.
     * 
     * TECHNICAL LOGIC:
     * - Matches records based on auth.uid().
     * - Updates the updated_at timestamp for auditing.
     * ======================================================================================
     */
  -- logic: Update the record where auth_id matches the currently logged in user
  UPDATE identity.users
  SET pref_organization_id = new_org_id,
      updated_at = now()
  WHERE auth_id = auth.uid(); 
  
  -- If no row was updated (shouldn't happen for valid user), you could raise notice
  IF NOT FOUND THEN
    RAISE WARNING 'No user found in identity.users for auth_id %', auth.uid();
  END IF;
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.update_location_path
   📝 ARGUMENTS: ()
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.update_location_path()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$-- DECLARE
--     v_parent_path extensions.ltree;
--     v_new_path_label text;
-- BEGIN
--     -- The trigger only fires on INSERT or UPDATE of parent_id,
--     -- so we always need to recalculate the path.
    
--     -- Create a ltree-safe label from the ID (replace dashes with underscores).
--     -- 'ltree' labels cannot contain '-'.
--     v_new_path_label := REPLACE(NEW.id::text, '-', '_');

--     IF NEW.parent_id IS NULL THEN
--         -- This is a root node. Its path is just its own ID.
--         NEW.path := v_new_path_label::extensions.ltree;
--     ELSE
--         -- This is a child node. Get the parent's path.
--         SELECT path INTO v_parent_path
--         FROM identity.locations
--         WHERE id = NEW.parent_id;
        
--         IF v_parent_path IS NULL THEN
--              RAISE EXCEPTION 'Invalid parent_id: %. Parent location (id=%) does not exist or has a null path.', NEW.parent_id, NEW.parent_id;
--         END IF;

--         -- Concatenate the parent's path with the new node's label.
--         NEW.path := v_parent_path || '.' || v_new_path_label;
--     END IF;
    
--     RETURN NEW;
-- END;



DECLARE
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    update_location_path
     * PURPOSE:     Maintains geographic/territorial hierarchy via LTREE.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. HIERARCHY MAINTENANCE: Triggered on INSERT or UPDATE of parent_id.
     * 2. PATH CONSTRUCTION: 
     *    - Root: path = self_uuid
     *    - Child: path = parent_path || self_uuid
     * 3. DATA INTEGRITY: Blocks updates if the parent does not exist or has a NULL path.
     * 
     * USE CASES:
     * - Nested locations (Country -> Region -> Site).
     * - Regional data inheritance and scoped reporting.
     * 
     * TECHNICAL LOGIC:
     * - Uses UUIDs directly as LTREE labels (valid in PostgreSQL ltree extension).
     * - Performs a lookup on its own table to fetch parent_path.
     * ======================================================================================
     */
    v_parent_path extensions.ltree;
BEGIN
    IF NEW.parent_id IS NULL THEN
        -- Root node: path = its own UUID (with hyphens — valid in ltree!)
        NEW.path := NEW.id::text::extensions.ltree;
    ELSE
        -- Child node: fetch parent path
        SELECT path INTO v_parent_path
        FROM identity.locations
        WHERE id = NEW.parent_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent location with id=% not found', NEW.parent_id;
        END IF;

        IF v_parent_path IS NULL THEN
            RAISE EXCEPTION 'Parent location id=% has null path', NEW.parent_id;
        END IF;

        -- Append current ID (with hyphens) as new label
        NEW.path := v_parent_path || '.' || NEW.id::text;
    END IF;

    RETURN NEW;
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.update_organization_user_path
   📝 ARGUMENTS: ()
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.update_organization_user_path()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$-- DECLARE
--     v_parent_path extensions.ltree;
--     v_new_path_label text;
-- BEGIN
--     -- Use the 'id' (the membership ID), NOT the 'user_id', to build the path.
--     -- This is because the hierarchy is based on the membership record.
--     v_new_path_label := REPLACE(NEW.id::text, '-', '_');

--     IF NEW.manager_id IS NULL THEN
--         -- This is a root user (e.g., CEO). Its path is just its own ID.
--         NEW.path := v_new_path_label::extensions.ltree;
--     ELSE
--         -- This is a subordinate. Get the manager's path.
--         SELECT path INTO v_parent_path
--         FROM identity.organization_users
--         WHERE id = NEW.manager_id;
        
--         IF v_parent_path IS NULL THEN
--              RAISE EXCEPTION 'Invalid manager_id: %. Parent manager (id=%) does not exist or has a null path.', NEW.manager_id, NEW.manager_id;
--         END IF;

--         -- Concatenate the manager's path with this user's label.
--         NEW.path := v_parent_path || '.' || v_new_path_label;
--     END IF;
    
--     RETURN NEW;
-- END;

DECLARE
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    update_organization_user_path
     * PURPOSE:     The core hierarchy engine. Calculates reporting lines via LTREE.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. HIERARCHY ENGINE: Triggered BEFORE INSERT or UPDATE of manager_id.
     * 2. PATH CONSTRUCTION:
     *    - Root (CEO): path = self_membership_uuid
     *    - Subordinate: path = manager_path || self_membership_uuid
     * 3. CYCLE PROTECTION: Implicitly handled by ltree lookup (parent must exist).
     * 
     * USE CASES:
     * - Automatic org-chart maintenance.
     * - Powering the 'get_subordinates_by_user' and 'get_all_approvers' functions.
     * 
     * TECHNICAL LOGIC:
     * - Uses the membership 'id' (UUID) as the immutable node identifier in the path.
     * - Ensures every user has a searchable lineage from the top of the organization.
     * ======================================================================================
     */
    v_parent_path extensions.ltree;
BEGIN
    -- Use the membership 'id' (UUID) directly — hyphens are valid in ltree.
    IF NEW.manager_id IS NULL THEN
        -- Root user (e.g., CEO/org admin)
        NEW.path := NEW.id::text::extensions.ltree;
    ELSE
        -- Fetch manager's path
        SELECT path INTO v_parent_path
        FROM identity.organization_users
        WHERE id = NEW.manager_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Manager with id=% not found', NEW.manager_id;
        END IF;

        IF v_parent_path IS NULL THEN
            RAISE EXCEPTION 'Manager id=% has null path', NEW.manager_id;
        END IF;

        -- Build path: manager_path.child_id (with hyphens)
        NEW.path := v_parent_path || '.' || NEW.id::text;
    END IF;

    RETURN NEW;
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: identity.utils_test_session_as_user
   📝 ARGUMENTS: (p_auth_id uuid, p_organization_id uuid)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION identity.utils_test_session_as_user(p_auth_id uuid, p_organization_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$DECLARE
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    utils_test_session_as_user
     * PURPOSE:     Developer utility to simulate and debug JWT claims.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. IMPERSONATION: Temporarily sets the request.jwt.claims configuration to 
     *    mimic a specific auth.uid().
     * 2. DB ROLE DETECTION: Correcty identifies if the impersonated user should
     *    be treated as 'service_role' (e.g., if member of zoworks).
     * 3. AUTOMATIC RESET: Since set_config is called with 'true' (local), the 
     *    impersonation is automatically cleared at the end of the transaction.
     * 
     * USE CASES:
     * - Debugging "Why can't User X see this row?" (Test RLS).
     * - Verifying complex RBAC permission merges without logging in/out.
     * 
     * TECHNICAL LOGIC:
     * - Manages transactional session variables via set_config.
     * - Proxies the call to jwt_get_user_session or get_user_session internally.
     * ======================================================================================
     */
  v_user_id UUID;
  v_db_role TEXT;
  v_claims TEXT;
  v_result jsonb;
BEGIN
  -- Get the user_id and determine the correct role for the JWT claim simulation
  SELECT u.id,
         CASE WHEN EXISTS (
              SELECT 1 FROM identity.organization_users ou
              JOIN identity.organizations o ON ou.organization_id = o.id
              WHERE ou.user_id = u.id AND o.name = 'zoworks' -- Your master org name
             )
         THEN 'service_role' ELSE 'authenticated' END
  INTO v_user_id, v_db_role
  FROM identity.users u WHERE u.auth_id = p_auth_id;

  IF v_user_id IS NULL THEN
     RAISE EXCEPTION 'User with auth_id % not found in identity.users', p_auth_id;
  END IF;

  -- Create a JSON object mimicking the NEW "thin" JWT claims
  v_claims := jsonb_build_object(
      'sub', p_auth_id,
      'role', v_db_role,
      'user_id', v_user_id
      -- No org_id in the claims anymore
  )::TEXT;

  -- Impersonate the user by setting the session's JWT claims
  PERFORM set_config('request.jwt.claims', v_claims, true);

  -- NOW, run the function you want to test, passing the org context
  SELECT identity.get_user_session(p_organization_id) INTO v_result;

  -- The impersonation is automatically cleared at the end of the transaction.
  RETURN v_result;
END;$function$
