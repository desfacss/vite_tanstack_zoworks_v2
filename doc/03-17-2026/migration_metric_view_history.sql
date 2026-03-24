-- Migration: Add Metric View History System
-- Date: 2026-03-18

-- 1. Create the history table
CREATE TABLE IF NOT EXISTS core.metric_view_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    metric_view_id uuid NOT NULL,
    rule_name text NOT NULL,
    data jsonb NOT NULL,
    version integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT metric_view_history_pkey PRIMARY KEY (id)
);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_metric_view_history_metric_view_id ON core.metric_view_history(metric_view_id);

-- 3. Create/Update Trigger Function
CREATE OR REPLACE FUNCTION core.sys_trg_snapshot_metric_view_history()
RETURNS TRIGGER AS $$
DECLARE
    next_version integer;
BEGIN
    -- Calculate next version
    SELECT COALESCE(MAX(version), 0) + 1 INTO next_version 
    FROM core.metric_view_history 
    WHERE metric_view_id = NEW.id;

    -- Insert snapshot
    INSERT INTO core.metric_view_history (
        metric_view_id,
        rule_name,
        data,
        version
    )
    VALUES (
        NEW.id,
        NEW.rule_name,
        to_jsonb(NEW),
        next_version
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Trigger to core.metric_views
DROP TRIGGER IF EXISTS metric_view_history_snapshot_trg ON core.metric_views;
CREATE TRIGGER metric_view_history_snapshot_trg
AFTER INSERT OR UPDATE ON core.metric_views
FOR EACH ROW
EXECUTE FUNCTION core.sys_trg_snapshot_metric_view_history();
