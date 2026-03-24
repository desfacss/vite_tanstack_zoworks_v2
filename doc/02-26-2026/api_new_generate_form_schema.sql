
DECLARE
    v_schema text := split_part(p_entity_name, '.', 1);
    v_table text := split_part(p_entity_name, '.', 2);
    v_metadata jsonb;
    v_fields jsonb := '[]'::jsonb;
    v_data_schema jsonb;
    v_ui_schema jsonb := '{"ui:order": []}'::jsonb;
    v_field record;
    v_field_key text;
    v_type text;
    v_title text;
    v_mode text := COALESCE(p_options->>'mode', 'recommended');
    v_include_system boolean := COALESCE((p_options->>'includeSystemFields')::boolean, false);
    v_include_read_only boolean := COALESCE((p_options->>'includeReadOnlyFields')::boolean, false);
    v_required text[] := ARRAY[]::text[];
    v_blueprint record;
    v_is_mandatory boolean;
    v_is_read_only boolean;
    v_dep jsonb;
    v_primary_jsonb text;
    v_semantics jsonb;
BEGIN
    SELECT * INTO v_blueprint 
    FROM core.entity_blueprints 
    WHERE entity_schema = v_schema AND entity_type = v_table;
    SELECT e.v_metadata, e.semantics INTO v_metadata, v_semantics
    FROM core.entities e
    WHERE e.entity_schema = v_schema AND e.entity_type = v_table;
    IF v_metadata IS NULL THEN
        v_metadata := core.comp_met_scan_schema_columns(p_entity_name);
    END IF;
    v_primary_jsonb := COALESCE(v_semantics->'resolution'->>'primary_jsonb', v_blueprint.semantics->'resolution'->>'primary_jsonb', 'details');
    v_data_schema := jsonb_build_object(
        'type', 'object',
        'title', initcap(replace(v_table, '_', ' ')),
        'properties', '{}'::jsonb
    );
    FOR v_field IN SELECT * FROM jsonb_array_elements(v_metadata) LOOP
        v_field_key := v_field.value->>'key';
        v_type := COALESCE(v_field.value->>'type', 'text');
        v_title := v_field.value->>'display_name';
        IF v_title IS NULL OR v_title = '' OR v_title LIKE 'Details %' THEN
            IF (v_field.value->>'is_virtual')::boolean = true AND v_field_key LIKE '%\_\_%' THEN
                v_title := initcap(replace(split_part(v_field_key, '__', 4), '_', ' ')); 
                IF v_title = '' THEN v_title := initcap(replace(split_part(v_field_key, '__', 3), '_', ' ')); END IF;
                IF v_title = '' THEN v_title := initcap(replace(split_part(v_field_key, '__', 2), '_', ' ')); END IF;
            ELSE
                v_title := initcap(replace(v_field_key, '_', ' '));
            END IF;
        END IF;
        v_is_mandatory := COALESCE((v_field.value->>'is_mandatory')::boolean, false);
        v_is_read_only := COALESCE((v_field.value->>'is_read_only')::boolean, false);
        IF v_field_key LIKE '%\_display' THEN
            v_is_read_only := true;
        END IF;
        IF (v_blueprint.semantics ? 'assignments' OR v_semantics ? 'assignments') THEN
            IF EXISTS (
                SELECT 1 FROM jsonb_array_elements(COALESCE(v_blueprint.semantics->'assignments', '[]'::jsonb) || COALESCE(v_semantics->'assignments', '[]'::jsonb)) x 
                WHERE x->>'column' = v_field_key AND COALESCE((x->>'overwrite')::boolean, false) = true
            ) THEN
                IF v_field_key NOT IN ('vertical', 'custom', 'vertical_payload') THEN
                    CONTINUE;
                END IF;
            END IF;
        END IF;
        IF v_mode = 'minimal' AND (v_field.value->>'jsonb_column') IS NOT NULL 
           AND (v_field.value->>'jsonb_column') != v_primary_jsonb THEN
            CONTINUE;
        END IF;
        IF NOT v_include_system AND v_field_key = ANY(ARRAY['id', 'organization_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'module', 'display_id', 'search_vector']) THEN
            CONTINUE;
        END IF;
        IF (v_field.value->>'jsonb_column') IS NOT NULL THEN
            CONTINUE;
        END IF;
        IF v_mode = 'minimal' AND v_is_mandatory = false AND v_field_key != v_primary_jsonb THEN
            CONTINUE;
        END IF;
        IF NOT v_include_read_only AND v_is_read_only AND v_field_key NOT LIKE '%\_display' THEN
            CONTINUE;
        END IF;
        IF v_field.value ? 'nested_schema' THEN
            v_data_schema := jsonb_set(
                v_data_schema, 
                ARRAY['properties', v_field_key],
                v_field.value->'nested_schema'
            );
        ELSE
            v_data_schema := jsonb_set(
                v_data_schema, 
                ARRAY['properties', v_field_key],
                jsonb_build_object(
                    'title', v_title,
                    'type', CASE 
                        WHEN v_type IN ('integer', 'bigint', 'smallint') THEN 'integer'
                        WHEN v_type IN ('numeric', 'decimal', 'real', 'double precision') THEN 'number'
                        WHEN v_type IN ('boolean', 'bool') THEN 'boolean'
                        WHEN v_type LIKE '%[]' THEN 'array'
                        ELSE 'string'
                    END
                )
            );
            IF v_type = 'date' THEN
                v_data_schema := jsonb_set(v_data_schema, ARRAY['properties', v_field_key, 'format'], '"date"');
            ELSIF v_type IN ('timestamp', 'timestamptz', 'timestamp with time zone') THEN
                v_data_schema := jsonb_set(v_data_schema, ARRAY['properties', v_field_key, 'format'], '"date-time"');
            END IF;
        END IF;
        IF v_is_read_only THEN
            v_data_schema := jsonb_set(v_data_schema, ARRAY['properties', v_field_key, 'readOnly'], 'true'::jsonb);
        END IF;
        IF v_field.value ? 'foreign_key' AND jsonb_typeof(v_field.value->'foreign_key') = 'object' THEN
            DECLARE
                v_fk jsonb := v_field.value->'foreign_key';
                v_src_table text := v_fk->>'source_table';
                v_src_schema text := split_part(v_src_table, '.', 1);
                v_src_name text := split_part(v_src_table, '.', 2);
                v_disp_col text := COALESCE(v_fk->>'display_column', 'name');
                v_filter jsonb := v_fk->'enum_filter';
                v_filter_params text := '';
                v_enum_obj jsonb;
            BEGIN
                IF v_src_name = '' THEN v_src_name := v_src_schema; v_src_schema := v_schema; END IF;
                
                -- Redirect core.enums to core.v_enums_tenanted for UI fetches
                IF v_src_table = 'core.enums' THEN 
                    v_src_name := 'v_enums_tenanted'; 
                END IF;

                -- Build Structured Enum Object for data_schema
                v_enum_obj := jsonb_build_object(
                    'schema', v_src_schema,
                    'table', v_src_name,
                    'column', v_disp_col,
                    'no_id', COALESCE((v_fk->>'no_id')::boolean, false)
                );
                IF v_filter IS NOT NULL THEN
                    -- Refined Filter Format for Data Schema: {"key": "...", "operator": "eq", "value": "..."}
                    -- We use an object if single, or array if multiple. Here we'll wrap in an array for consistency with query engines.
                    DECLARE
                        v_refined_filter jsonb;
                    BEGIN
                        SELECT jsonb_agg(jsonb_build_object(
                            'key', key,
                            'operator', 'eq',
                            'value', value
                        )) INTO v_refined_filter
                        FROM jsonb_each_text(v_filter);
                        
                        v_enum_obj := v_enum_obj || jsonb_build_object('filter', v_refined_filter);
                    END;

                    -- Construct Query String for ui_schema reference_api
                    SELECT '?' || string_agg(key || '=' || value, '&') INTO v_filter_params 
                    FROM jsonb_each_text(v_filter);
                END IF;

                v_data_schema := jsonb_set(v_data_schema, ARRAY['properties', v_field_key, 'enum'], v_enum_obj);
                
                v_ui_schema := jsonb_set(v_ui_schema, ARRAY[v_field_key], jsonb_build_object(
                    'ui:placeholder', 'Select ' || v_title, 
                    'ui:widget', 'SelectCustomWidget', 
                    'ui:options', jsonb_build_object(
                        'reference_api', '/api/v4/logical/fetch/' || v_src_schema || '.' || v_src_name || COALESCE(v_filter_params, ''), 
                        'reference_id_field', CASE WHEN (v_fk->>'no_id')::boolean THEN v_disp_col ELSE 'id' END, 
                        'reference_display_field', v_disp_col, 
                        'reference_search_field', v_disp_col, 
                        'colSpan', 12
                    )
                ));
            END;
        ELSE
            v_ui_schema := jsonb_set(
                v_ui_schema,
                ARRAY[v_field_key],
                jsonb_build_object(
                    'ui:placeholder', 'Enter ' || v_title,
                    'ui:widget', CASE
                        WHEN v_type LIKE '%[]' THEN 'TagsWidget'
                        WHEN v_type = 'date' THEN 'date'
                        WHEN v_type LIKE 'timestamp%' THEN 'date-time'
                        WHEN v_field_key LIKE '%email%' THEN 'email'
                        WHEN v_field_key LIKE '%phone%' THEN 'phone'
                        WHEN v_type = 'text' AND (v_field_key LIKE '%description%' OR v_field_key LIKE '%notes%') THEN 'textarea'
                        ELSE NULL
                    END,
                    'ui:options', jsonb_build_object(
                        'colSpan', CASE 
                            WHEN v_type = 'text' AND (v_field_key LIKE '%description%' OR v_field_key LIKE '%notes%') THEN 24
                            WHEN v_type LIKE '%[]' THEN 24
                            ELSE 12
                        END
                    )
                ) - 'ui:widget' || (CASE 
                    WHEN (v_ui_schema->v_field_key->>'ui:widget') IS NOT NULL THEN jsonb_build_object('ui:widget', v_ui_schema->v_field_key->>'ui:widget')
                    ELSE '{}'::jsonb
                END)
            );
        END IF;
        IF v_type LIKE '%[]' THEN
            v_ui_schema := jsonb_set(
                v_ui_schema,
                ARRAY[v_field_key, 'ui:options', 'mode'],
                '"multiple"'::jsonb
            );
        END IF;
        v_ui_schema := jsonb_set(
            v_ui_schema,
            ARRAY['ui:order'],
            (v_ui_schema->'ui:order') || jsonb_build_array(v_field_key)
        );
        IF v_is_mandatory THEN
            v_required := array_append(v_required, v_field_key);
        END IF;
    END LOOP;
    IF array_length(v_required, 1) > 0 THEN
        v_data_schema := jsonb_set(v_data_schema, ARRAY['required'], to_jsonb(v_required));
    END IF;
    RETURN jsonb_build_object(
        'data_schema', v_data_schema,
        'ui_schema', v_ui_schema,
        'db_schema', jsonb_build_object('table', p_entity_name)
    );
END;
