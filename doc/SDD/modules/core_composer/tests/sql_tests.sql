-- ============================================================================
-- SQL TESTS: Core Composer Module
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PHASE 1: Schema & Object Verification
-- ----------------------------------------------------------------------------

-- TEST-CORE-COMP-001: Verify core.entity_blueprints exists and has correct columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'core' AND table_name = 'entity_blueprints';
-- Expected: Columns including entity_schema, entity_type, base_source, partition_filter, etc.

-- TEST-CORE-COMP-002: Verify core.entities exists and has correct columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'core' AND table_name = 'entities';
-- Expected: Columns including entity_schema, entity_type, v_metadata, etc.

-- TEST-CORE-COMP-003: Verify core.view_configs exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'core' AND table_name = 'view_configs';
-- Expected: Columns including entity_id, entity_type, ui_general, ui_tableview, etc.


-- ----------------------------------------------------------------------------
-- PHASE 2: RPC Execution
-- ----------------------------------------------------------------------------

-- TEST-CORE-COMP-004: Test blueprint registration (Dry run / mock test)
-- Note: Replace with a test entity schema/type to avoid polluting production
-- SELECT core.comp_util_register_blueprint(
--     'public', 'test_entity', 'public.test_entity_base', 
--     '{}', NULL, '{}'
-- );
-- Expected: {"status": "success", "entity": "public.test_entity"}


-- ----------------------------------------------------------------------------
-- PHASE 3: Trigger & Provisioning Verification
-- ----------------------------------------------------------------------------

-- TEST-CORE-COMP-005: Verify blueprint history snapshot trigger exists
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'core' AND event_object_table = 'entity_blueprints';
-- Expected: trg_v_entity_blueprints_shard calling core.sys_trg_snapshot_blueprint_history
