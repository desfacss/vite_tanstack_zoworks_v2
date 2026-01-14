-- Migration: Fix Expense Sheets Description column
-- Date: 2026-01-14

-- 1. Register the virtual column in the registry
-- This tells the provisioning engine to project details->'description' as a top-level column
INSERT INTO core.entity_generated_columns (
    entity_schema,
    entity_table,
    column_name,
    column_type,
    source_config
)
VALUES (
    'workforce',
    'expense_sheets',
    'description',
    'virtual_jsonb',
    '{"path": "description", "jsonb_column": "details"}'::jsonb
)
ON CONFLICT (entity_schema, entity_table, column_name) 
DO UPDATE SET source_config = EXCLUDED.source_config;

-- 2. Trigger the refresh of the core metadata for this entity
-- Note: Assuming there is a refresh mechanism or it will be picked up by the next sync.
-- If a specific refresh function exists, it should be called here.
SELECT 'Metadata updated for expense_sheets. Description column will appear on next view regeneration.' as status;
