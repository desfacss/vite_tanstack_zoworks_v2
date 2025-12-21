-- 1. FIX: Capability Calculator (The one currently crashing)
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
    schema_name := split_part(p_entity, '.', 1);
    table_name  := split_part(p_entity, '.', 2);
    
    SELECT metadata INTO entity_record
    FROM core.entities 
    WHERE entity_schema = schema_name AND entity_type = table_name;
    
    IF FOUND THEN
        -- 🛡️ ROOT FIX: Unwrap the object if it contains warnings
        IF entity_record.metadata ? 'columns' THEN
            v_metadata := entity_record.metadata -> 'columns';
        ELSE
            v_metadata := entity_record.metadata;
        END IF;

        -- Validate it is truly an array before processing
        IF v_metadata IS NULL OR jsonb_typeof(v_metadata) != 'array' THEN
            RETURN jsonb_set(capabilities, '{error}', '"Metadata format error"'::jsonb);
        END IF;
    ELSE
        RETURN jsonb_set(capabilities, '{error}', '"Entity not found"'::jsonb);
    END IF;
    
    -- (Logic continues safely now...)
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
                is_virtual boolean := COALESCE((r->>'is_virtual')::boolean, false);
                is_searchable boolean := COALESCE((r->>'is_searchable')::boolean, false);
            BEGIN
                IF is_searchable THEN
                    capabilities := jsonb_set(capabilities, '{searchableFields}', (capabilities->'searchableFields') || jsonb_build_object('field', col_key, 'type', col_type, 'label', COALESCE(r->>'display_name', initcap(replace(col_key, '_', ' ')))));
                END IF;
                IF NOT is_virtual THEN
                    capabilities := jsonb_set(capabilities, '{filterableFields}', (capabilities->'filterableFields') || jsonb_build_object('field', col_key, 'type', col_type));
                END IF;
                IF col_key = 'created_at' THEN has_created_at := true; END IF;
                IF col_key = 'updated_at' THEN has_updated_at := true; END IF;
                IF col_key = 'due_date' THEN has_due_date := true; END IF;
            END;
        END LOOP;
        
        IF has_created_at THEN capabilities := jsonb_set(capabilities, '{defaultSort}', '"created_at:desc"'::jsonb);
        ELSIF has_updated_at THEN capabilities := jsonb_set(capabilities, '{defaultSort}', '"updated_at:desc"'::jsonb);
        ELSIF has_due_date THEN capabilities := jsonb_set(capabilities, '{defaultSort}', '"due_date:asc"'::jsonb);
        END IF;
    END;
    
    RETURN capabilities;
END;
$function$;


-- 2. FIX: Schema Merger (Prevent crashes on future re-scans)
CREATE OR REPLACE FUNCTION core.met_util_schema_merge(p_fresh_schema jsonb, p_existing_schema jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    v_result jsonb := '[]'::jsonb;
    v_fresh_arr jsonb;
    v_exist_arr jsonb;
    v_fresh_col jsonb;
    v_exist_col jsonb;
    v_merged_col jsonb;
    v_key text;
BEGIN
    -- 🛡️ ROOT FIX: Normalize inputs to Arrays
    IF p_fresh_schema ? 'columns' THEN v_fresh_arr := p_fresh_schema -> 'columns'; ELSE v_fresh_arr := p_fresh_schema; END IF;
    IF p_existing_schema ? 'columns' THEN v_exist_arr := p_existing_schema -> 'columns'; ELSE v_exist_arr := p_existing_schema; END IF;

    IF v_exist_arr IS NULL OR jsonb_typeof(v_exist_arr) != 'array' OR jsonb_array_length(v_exist_arr) = 0 THEN
        RETURN v_fresh_arr;
    END IF;

    FOR v_fresh_col IN SELECT * FROM jsonb_array_elements(v_fresh_arr)
    LOOP
        v_key := v_fresh_col->>'key';
        SELECT item INTO v_exist_col FROM jsonb_array_elements(v_exist_arr) item WHERE item->>'key' = v_key LIMIT 1;

        IF v_exist_col IS NOT NULL THEN
            v_merged_col := v_fresh_col || jsonb_build_object(
                'display_name', COALESCE(v_exist_col->>'display_name', v_fresh_col->>'display_name'),
                'is_searchable', COALESCE((v_exist_col->>'is_searchable')::boolean, (v_fresh_col->>'is_searchable')::boolean),
                'is_mandatory', COALESCE((v_exist_col->>'is_mandatory')::boolean, (v_fresh_col->>'is_mandatory')::boolean)
            );
        ELSE
            v_merged_col := v_fresh_col;
        END IF;
        v_result := v_result || jsonb_build_array(v_merged_col);
    END LOOP;

    -- Return in original format if needed
    IF p_fresh_schema ? 'columns' THEN
        RETURN p_fresh_schema || jsonb_build_object('columns', v_result);
    ELSE
        RETURN v_result;
    END IF;
END;
$function$;


-- 3. FIX: Draft Saver (Ensure clean merges)
CREATE OR REPLACE FUNCTION core.met_save_schema_draft(p_entity_type text, p_entity_schema text, p_metadata jsonb, p_skip_merge boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_entity_id uuid;
    v_current_metadata jsonb;
    v_merged_metadata jsonb;
    v_version_num integer;
    v_version_id uuid;
BEGIN
    INSERT INTO core.entities (entity_type, entity_schema, updated_at) 
    VALUES (p_entity_type, p_entity_schema, now())
    ON CONFLICT (entity_type, entity_schema) DO UPDATE SET updated_at = now()
    RETURNING id, metadata INTO v_entity_id, v_current_metadata;

    v_merged_metadata := 
        CASE 
            WHEN p_skip_merge THEN p_metadata
            -- 🛡️ Check against NULL or Non-Array/Non-Object types
            WHEN v_current_metadata IS NULL OR jsonb_typeof(v_current_metadata) NOT IN ('array', 'object') THEN p_metadata
            ELSE core.met_util_schema_merge(p_metadata, v_current_metadata)
        END;

    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_num FROM core.entity_versions WHERE entity_id = v_entity_id;

    INSERT INTO core.entity_versions (entity_schema, entity_table, entity_id, version_number, data, status, created_at) 
    VALUES (p_entity_schema, p_entity_type, v_entity_id, v_version_num, v_merged_metadata, 'draft', now())
    RETURNING id INTO v_version_id;

    RETURN jsonb_build_object('status', 'draft_saved', 'version_id', v_version_id);
END;
$function$;