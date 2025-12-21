-- -- 1. CLEANUP: Drop triggers first to avoid dependency locking
-- DROP TRIGGER IF EXISTS trg_refresh_capabilities ON core.entities;
-- DROP FUNCTION IF EXISTS core.met_entity_get_capabilities_trg();
-- DROP FUNCTION IF EXISTS core.met_entity_get_capabilities(text);

/* ═══════════════════════════════════════════════════════
   👤 FUNCTION: core.met_entity_get_capabilities
   🎯 PURPOSE: Generates UI/AI capabilities from Metadata
   ✅ FEATURES: Includes "Root Fix" for metadata wrapping + Rich UI Hints
   ═══════════════════════════════════════════════════════ */
CREATE OR REPLACE FUNCTION core.met_entity_get_capabilities(p_entity text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    schema_name text;
    table_name  text;
    entity_record record;
    v_metadata jsonb;
    
    -- Default Output Structure
    capabilities jsonb := jsonb_build_object(
        'entity', p_entity,
        'searchableFields', '[]'::jsonb,
        'filterableFields', '[]'::jsonb,
        'sortableFields', '[]'::jsonb,
        'defaultSort', 'created_at:desc',
        'supportsCursor', true,
        'maxLimit', 1000,
        'patterns', '{}'::jsonb
    );
BEGIN
    -- 1. Parse Entity Name
    schema_name := split_part(p_entity, '.', 1);
    table_name  := split_part(p_entity, '.', 2);
    
    -- 2. Fetch Raw Metadata
    SELECT metadata INTO entity_record
    FROM core.entities 
    WHERE entity_schema = schema_name 
      AND entity_type = table_name;
    
    -- 3. Validate & Unwrap Metadata (The "ROOT FIX")
    IF FOUND THEN
        -- Handle case where metadata is wrapped in { "columns": [...] }
        IF entity_record.metadata IS NOT NULL AND (entity_record.metadata ? 'columns') THEN
            v_metadata := entity_record.metadata -> 'columns';
        ELSE
            v_metadata := entity_record.metadata;
        END IF;

        -- Ensure we actually have an array to loop over
        IF v_metadata IS NULL OR jsonb_typeof(v_metadata) != 'array' THEN
             RETURN jsonb_set(capabilities, '{error}', '"Metadata format error: Expected JSON Array"'::jsonb);
        END IF;
    ELSE
        RETURN jsonb_set(capabilities, '{error}', '"Entity not found"'::jsonb);
    END IF;
    
    -- 4. Analyze Columns for Capabilities
    DECLARE
        has_created_at boolean := false;
        has_updated_at boolean := false;
        has_due_date   boolean := false;
        r jsonb;
    BEGIN
        FOR r IN SELECT * FROM jsonb_array_elements(v_metadata) LOOP
            DECLARE
                col_key text := r->>'key';
                col_type text := r->>'type';
                -- Safely cast booleans
                is_virtual boolean := COALESCE((r->>'is_virtual')::boolean, false);
                is_searchable boolean := COALESCE((r->>'is_searchable')::boolean, false);
                display_label text := COALESCE(r->>'display_name', initcap(replace(col_key, '_', ' ')));
            BEGIN
                -- A. Searchable Fields (For Omni-search)
                IF is_searchable THEN
                    capabilities := jsonb_set(
                        capabilities,
                        '{searchableFields}',
                        (capabilities->'searchableFields') || jsonb_build_object(
                            'field', col_key,
                            'type', col_type,
                            'label', display_label,
                            'uiHint', CASE 
                                WHEN col_key ILIKE '%email%' THEN 'email'
                                WHEN col_key ILIKE '%phone%' THEN 'phone'
                                WHEN col_key ILIKE '%date%' THEN 'date'
                                ELSE 'text'
                            END
                        )
                    );
                END IF;
                
                -- B. Filterable Fields (For Filters/Query Builder)
                IF NOT is_virtual THEN
                    capabilities := jsonb_set(
                        capabilities,
                        '{filterableFields}',
                        (capabilities->'filterableFields') || jsonb_build_object(
                            'field', col_key,
                            'type', col_type,
                            'label', display_label,
                            'operators', CASE 
                                WHEN col_type IN ('text', 'varchar') THEN '["=", "ilike", "in", "null"]'::jsonb
                                WHEN col_type IN ('integer', 'bigint', 'numeric', 'float') THEN '["=", ">", "<", ">=", "<=", "in", "null"]'::jsonb
                                WHEN col_type IN ('timestamp', 'timestamptz', 'date') THEN '["=", ">", "<", ">=", "<=", "null"]'::jsonb
                                WHEN col_type = 'boolean' THEN '["=", "null"]'::jsonb
                                ELSE '["=", "null"]'::jsonb
                            END,
                            'uiType', CASE 
                                WHEN col_type IN ('timestamp', 'timestamptz', 'date') THEN 'date'
                                WHEN col_type = 'boolean' THEN 'checkbox'
                                WHEN col_type LIKE '%[]' THEN 'multiselect'
                                ELSE 'text'
                            END
                        )
                    );
                END IF;
                
                -- C. Sortable Fields (For Grids)
                IF NOT is_virtual AND col_type IN ('timestamp', 'timestamptz', 'date', 'integer', 'bigint', 'numeric', 'float', 'text', 'varchar') THEN
                    capabilities := jsonb_set(
                        capabilities,
                        '{sortableFields}',
                        (capabilities->'sortableFields') || jsonb_build_object(
                            'field', col_key,
                            'type', col_type,
                            'label', display_label,
                            'defaultDirection', CASE 
                                WHEN col_key IN ('created_at', 'updated_at') THEN 'desc'
                                WHEN col_type IN ('integer', 'bigint', 'numeric') THEN 'desc'
                                ELSE 'asc'
                            END
                        )
                    );
                END IF;
                
                -- D. Detect Default Sort Candidates
                IF col_key = 'created_at' THEN has_created_at := true; END IF;
                IF col_key = 'updated_at' THEN has_updated_at := true; END IF;
                IF col_key = 'due_date' THEN has_due_date := true; END IF;
                
            END;
        END LOOP;
        
        -- 5. Determine Final Default Sort
        IF has_created_at THEN
            capabilities := jsonb_set(capabilities, '{defaultSort}', '"created_at:desc"'::jsonb);
        ELSIF has_updated_at THEN
            capabilities := jsonb_set(capabilities, '{defaultSort}', '"updated_at:desc"'::jsonb);
        ELSIF has_due_date THEN
            capabilities := jsonb_set(capabilities, '{defaultSort}', '"due_date:asc"'::jsonb);
        ELSE
             -- Fallback if no dates exist
            capabilities := jsonb_set(capabilities, '{defaultSort}', '"id:asc"'::jsonb);
        END IF;
    END;
    
    RETURN capabilities;
END;
$function$;

/* ═══════════════════════════════════════════════════════
   👤 FUNCTION: core.met_entity_get_capabilities_trg
   🎯 PURPOSE: Trigger logic to update capabilities automatically
   ═══════════════════════════════════════════════════════ */
CREATE OR REPLACE FUNCTION core.met_entity_get_capabilities_trg()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Optimization: Only recalculate if metadata actually changed or it is a new record
    IF (TG_OP = 'INSERT') OR (NEW.metadata IS DISTINCT FROM OLD.metadata) THEN
        NEW.capabilities := core.met_entity_get_capabilities(NEW.entity_schema || '.' || NEW.entity_type);
    END IF;
    RETURN NEW;
END;
$function$;

/* ═══════════════════════════════════════════════════════
   👤 TRIGGER: trg_refresh_capabilities
   🎯 PURPOSE: Binds the function to the table
   ═══════════════════════════════════════════════════════ */
CREATE TRIGGER trg_refresh_capabilities
    BEFORE INSERT OR UPDATE OF metadata, v_metadata
    ON core.entities
    FOR EACH ROW
    EXECUTE FUNCTION core.met_entity_get_capabilities_trg();

/* ═══════════════════════════════════════════════════════
   👤 UTILITY: Backfill
   🎯 PURPOSE: Run this once to update all existing rows
   ═══════════════════════════════════════════════════════ */
UPDATE core.entities 
SET capabilities = core.met_entity_get_capabilities(entity_schema || '.' || entity_type)
WHERE capabilities IS NULL OR metadata IS NOT NULL;