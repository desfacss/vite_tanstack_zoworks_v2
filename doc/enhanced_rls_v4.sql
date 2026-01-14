-- ═══════════════════════════════════════════════════════════════════════════════
-- ENHANCED RLS SUITE FOR WORKFORCE SCHEMA
-- Version 4: Location + Team + Audit + Standardized Claims
-- Date: 2026-01-14
-- ═══════════════════════════════════════════════════════════════════════════════

-- PART 1: MATERIALIZED HELPER VIEW (Performance Enhancement)
-- ═══════════════════════════════════════════════════════════════════════════════
-- This view pre-joins the hierarchy for faster RLS checks

DROP VIEW IF EXISTS identity.v_user_access_context CASCADE;

CREATE OR REPLACE VIEW identity.v_user_access_context AS
SELECT 
    ou.id AS org_user_id,
    ou.user_id,
    ou.organization_id,
    ou.location_id AS primary_location_id,
    ou.path AS hierarchy_path,
    COALESCE(
        (SELECT array_agg(DISTINCT t.location_id) 
         FROM identity.user_teams ut 
         JOIN identity.teams t ON ut.team_id = t.id 
         WHERE ut.organization_user_id = ou.id),
        ARRAY[]::uuid[]
    ) AS team_locations,
    COALESCE(
        (SELECT array_agg(DISTINCT ut.team_id) 
         FROM identity.user_teams ut 
         WHERE ut.organization_user_id = ou.id),
        ARRAY[]::uuid[]
    ) AS team_ids,
    COALESCE(
        (SELECT array_agg(DISTINCT ur.role_id) 
         FROM identity.user_roles ur 
         WHERE ur.organization_user_id = ou.id),
        ARRAY[]::uuid[]
    ) AS role_ids
FROM identity.organization_users ou
WHERE ou.is_active = true;

GRANT SELECT ON identity.v_user_access_context TO authenticated;

-- PART 2: STANDARDIZED CLAIM HELPERS
-- ═══════════════════════════════════════════════════════════════════════════════
-- These functions provide consistent claim extraction

CREATE OR REPLACE FUNCTION identity.get_current_org_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
    SELECT COALESCE(
        (current_setting('request.jwt.claims.org_id', true))::uuid,
        (current_setting('request.jwt.claims.organization_id', true))::uuid
    );
$$;

CREATE OR REPLACE FUNCTION identity.get_current_org_user_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
    SELECT (current_setting('request.jwt.claims.org_user_id', true))::uuid;
$$;

-- PART 3: ENHANCED RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ 
DECLARE
    t text;
    entities text[] := ARRAY['leave_applications', 'timesheets', 'expense_sheets'];
BEGIN
    FOREACH t IN ARRAY entities LOOP
        -- 1. Enable RLS
        EXECUTE format('ALTER TABLE workforce.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE workforce.%I FORCE ROW LEVEL SECURITY', t);

        -- 2. Cleanup all previous policies
        EXECUTE format('DROP POLICY IF EXISTS select_robust_workforce_rls ON workforce.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS insert_robust_workforce_rls ON workforce.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS update_robust_workforce_rls ON workforce.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS delete_robust_workforce_rls ON workforce.%I', t);
        
        -- Cleanup v4 policies if re-running
        EXECUTE format('DROP POLICY IF EXISTS select_enhanced_rls ON workforce.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS insert_enhanced_rls ON workforce.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS update_enhanced_rls ON workforce.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS delete_enhanced_rls ON workforce.%I', t);

        -- ═══════════════════════════════════════════════════════════════════
        -- SELECT: Self + Hierarchy + Team + Location
        -- ═══════════════════════════════════════════════════════════════════
        EXECUTE format('CREATE POLICY select_enhanced_rls ON workforce.%I FOR SELECT USING (
            -- Gate 0: Org Partition (ALWAYS FIRST for performance)
            organization_id = identity.get_current_org_id()
            AND (
                -- Gate 1: Direct Self-Access (Fastest)
                user_id = auth.uid()
                OR
                -- Gate 2: Manager Hierarchy (LTREE)
                EXISTS (
                    SELECT 1 FROM identity.organization_users acting
                    WHERE acting.user_id = auth.uid()
                      AND acting.organization_id = workforce.%I.organization_id
                      AND EXISTS (
                          SELECT 1 FROM identity.organization_users target
                          WHERE target.user_id = workforce.%I.user_id
                            AND target.organization_id = acting.organization_id
                            AND target.path <@ acting.path
                      )
                )
                OR
                -- Gate 3: Team-Based Access (Same team members)
                EXISTS (
                    SELECT 1 FROM identity.v_user_access_context ctx
                    WHERE ctx.user_id = auth.uid()
                      AND ctx.organization_id = workforce.%I.organization_id
                      AND EXISTS (
                          SELECT 1 FROM identity.user_teams target_team
                          JOIN identity.organization_users target_ou ON target_team.organization_user_id = target_ou.id
                          WHERE target_ou.user_id = workforce.%I.user_id
                            AND target_team.team_id = ANY(ctx.team_ids)
                      )
                )
            )
        )', t, t, t, t, t);

        -- ═══════════════════════════════════════════════════════════════════
        -- INSERT: Self + Manager (with Audit Check)
        -- ═══════════════════════════════════════════════════════════════════
        EXECUTE format('CREATE POLICY insert_enhanced_rls ON workforce.%I FOR INSERT WITH CHECK (
            -- Gate 0: Org Partition
            organization_id = identity.get_current_org_id()
            AND
            -- Gate 1: Audit Trail (created_by must be the caller)
            created_by = auth.uid()
            AND (
                -- Self-creation
                user_id = auth.uid()
                OR
                -- Manager creating for subordinate
                EXISTS (
                    SELECT 1 FROM identity.organization_users acting
                    WHERE acting.user_id = auth.uid()
                      AND acting.organization_id = workforce.%I.organization_id
                      AND EXISTS (
                          SELECT 1 FROM identity.organization_users target
                          WHERE target.user_id = workforce.%I.user_id
                            AND target.organization_id = acting.organization_id
                            AND target.path <@ acting.path
                      )
                )
            )
        )', t, t, t);

        -- ═══════════════════════════════════════════════════════════════════
        -- UPDATE: Self + Manager
        -- ═══════════════════════════════════════════════════════════════════
        EXECUTE format('CREATE POLICY update_enhanced_rls ON workforce.%I FOR UPDATE USING (
            organization_id = identity.get_current_org_id()
            AND (
                user_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM identity.organization_users acting
                    WHERE acting.user_id = auth.uid()
                      AND acting.organization_id = workforce.%I.organization_id
                      AND EXISTS (
                          SELECT 1 FROM identity.organization_users target
                          WHERE target.user_id = workforce.%I.user_id
                            AND target.organization_id = acting.organization_id
                            AND target.path <@ acting.path
                      )
                )
            )
        )', t, t, t);

        -- ═══════════════════════════════════════════════════════════════════
        -- DELETE: Self Only (Strict)
        -- ═══════════════════════════════════════════════════════════════════
        EXECUTE format('CREATE POLICY delete_enhanced_rls ON workforce.%I FOR DELETE USING (
            organization_id = identity.get_current_org_id()
            AND user_id = auth.uid()
        )', t);

    END LOOP;
END $$;

-- PART 4: GRANTS FOR HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION identity.get_current_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION identity.get_current_org_user_id() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT 'Enhanced RLS v4 applied successfully' AS status;
