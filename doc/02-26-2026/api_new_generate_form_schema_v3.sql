-- Helper function to fix missing items in array schemas recursively
CREATE OR REPLACE FUNCTION core.api_new_generate_form_schema_fix_arrays(p_schema jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_key text;
    v_val jsonb;
    v_result jsonb := p_schema;
BEGIN
    IF jsonb_typeof(p_schema) = 'object' THEN
        -- If it's an array type, ensure items exists
        IF p_schema->>'type' = 'array' AND NOT p_schema ? 'items' THEN
            v_result := jsonb_set(v_result, '{items}', '{"type": "string"}'::jsonb);
        END IF;
        
        -- Recurse into properties
        IF p_schema ? 'properties' THEN
            FOR v_key, v_val IN SELECT * FROM jsonb_each(p_schema->'properties') LOOP
                v_result := jsonb_set(v_result, ARRAY['properties', v_key], core.api_new_generate_form_schema_fix_arrays(v_val));
            END LOOP;
        END IF;

        -- Recurse into items if it's an array
        IF p_schema ? 'items' THEN
            v_result := jsonb_set(v_result, '{items}', core.api_new_generate_form_schema_fix_arrays(p_schema->'items'));
        END IF;
    END IF;
    RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION core.api_new_generate_form_schema_v3(
    p_entity_name text,
    p_options jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
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
    v_mode text := LOWER(TRIM(COALESCE(p_options->>'mode', 'recommended')));
    v_include_system boolean := COALESCE((p_options->>'includeSystemFields')::boolean, false);
    v_include_read_only boolean := COALESCE((p_options->>'includeReadOnlyFields')::boolean, false);
    v_required text[] := ARRAY[]::text[];
    v_blueprint record;
    v_is_mandatory boolean;
    v_is_read_only boolean;
    v_semantics jsonb;
    v_primary_jsonb text;
    v_layout jsonb := '[]'::jsonb;
    v_current_row text[] := ARRAY[]::text[];
    v_items_per_row int := 2; -- Default items per row
    v_widget text;
BEGIN
    -- 1. Fetch Blueprint and Metadata
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

    -- 2. Initialize Data Schema
    v_data_schema := jsonb_build_object(
        'type', 'object',
        'title', initcap(replace(v_table, '_', ' ')),
        'properties', '{}'::jsonb
    );

    -- 3. Iterate through fields
    FOR v_field IN SELECT * FROM jsonb_array_elements(v_metadata) LOOP
        v_field_key := v_field.value->>'key';
        v_type := COALESCE(v_field.value->>'type', 'text');
        v_title := v_field.value->>'display_name';
        
        -- Default Title Logic
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

        -- Handle _display fields
        IF v_field_key LIKE '%\_display' THEN
            v_is_read_only := true;
        END IF;

        -- 3.1 Skip logic (Restored from v2)
        
        -- Filter by minimal mode (jsonb column check)
        IF v_mode = 'minimal' AND (v_field.value->>'jsonb_column') IS NOT NULL 
           AND (v_field.value->>'jsonb_column') != v_primary_jsonb THEN
            CONTINUE;
        END IF;

        -- System fields
        IF NOT v_include_system AND v_field_key = ANY(ARRAY['id', 'organization_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'module', 'display_id', 'search_vector']) THEN
            CONTINUE;
        END IF;

        -- Actual jsonb column skip (if not primary)
        IF (v_field.value->>'jsonb_column') IS NOT NULL THEN
            CONTINUE;
        END IF;

        -- Filter by minimal mode (mandatory check)
        IF v_mode = 'minimal' AND v_is_mandatory = false AND v_field_key != v_primary_jsonb THEN
            CONTINUE;
        END IF;

        -- Read-only fields
        IF NOT v_include_read_only AND v_is_read_only AND v_field_key NOT LIKE '%\_display' THEN
            CONTINUE;
        END IF;

        -- Check for assignments (don't show fields that are auto-assigned)
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

        -- 4. Set Data Schema Properties
        IF v_field.value ? 'nested_schema' THEN
            -- Pass nested schema through the array items fixer
            v_data_schema := jsonb_set(
                v_data_schema, 
                ARRAY['properties', v_field_key], 
                core.api_new_generate_form_schema_fix_arrays(v_field.value->'nested_schema')
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
                        WHEN v_type = 'null' THEN 'null'
                        ELSE 'string'
                    END
                )
            );

            -- Format hints
            IF v_type = 'date' THEN
                v_data_schema := jsonb_set(v_data_schema, ARRAY['properties', v_field_key, 'format'], '"date"');
            ELSIF v_type IN ('timestamp', 'timestamptz', 'timestamp with time zone') THEN
                v_data_schema := jsonb_set(v_data_schema, ARRAY['properties', v_field_key, 'format'], '"date-time"');
            ELSIF v_field_key LIKE '%email%' THEN
                v_data_schema := jsonb_set(v_data_schema, ARRAY['properties', v_field_key, 'format'], '"email"');
            -- Robust keyword matching for URI formats (preventing hoURLy matches)
            ELSIF v_field_key ~* '\y(url|link|uri|website)\y' AND v_type = 'text' THEN
                v_data_schema := jsonb_set(v_data_schema, ARRAY['properties', v_field_key, 'format'], '"uri"');
            END IF;

            -- Constraints
            IF v_field.value ? 'maximum' THEN
                v_data_schema := jsonb_set(v_data_schema, ARRAY['properties', v_field_key, 'maximum'], v_field.value->'maximum');
            END IF;
            IF v_field.value ? 'minimum' THEN
                v_data_schema := jsonb_set(v_data_schema, ARRAY['properties', v_field_key, 'minimum'], v_field.value->'minimum');
            END IF;
            
            -- Fix array items for non-nested array fields
            IF v_type LIKE '%[]' THEN
                v_data_schema := jsonb_set(v_data_schema, ARRAY['properties', v_field_key, 'items'], '{"type": "string"}'::jsonb);
            END IF;
        END IF;

        IF v_is_read_only THEN
            v_data_schema := jsonb_set(v_data_schema, ARRAY['properties', v_field_key, 'readOnly'], 'true'::jsonb);
        END IF;

        -- 5. Foreign Key / Enum Logic (Detection and Schema population)
        DECLARE
            v_ui_props jsonb := jsonb_build_object('ui:placeholder', 'Enter ' || v_title);
        BEGIN
            v_widget := NULL;

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
                    v_refined_filter jsonb := '[]'::jsonb;
                BEGIN
                    IF v_src_name = '' THEN v_src_name := v_src_schema; v_src_schema := v_schema; END IF;
                    IF v_src_table = 'core.enums' THEN v_src_name := 'v_enums_tenanted'; END IF;

                    -- 5.1 Build Enum Object for data_schema
                    v_enum_obj := jsonb_build_object(
                        'schema', v_src_schema,
                        'table', v_src_name,
                        'column', v_disp_col,
                        'no_id', COALESCE((v_fk->>'no_id')::boolean, false)
                    );

                    IF v_filter IS NOT NULL THEN
                        SELECT jsonb_agg(jsonb_build_object('key', key, 'operator', 'eq', 'value', value))
                        INTO v_refined_filter
                        FROM jsonb_each_text(v_filter);
                        
                        v_enum_obj := v_enum_obj || jsonb_build_object('filter', v_refined_filter);
                        
                        SELECT '?' || string_agg(key || '=' || value, '&') INTO v_filter_params 
                        FROM jsonb_each_text(v_filter);
                    END IF;

                    v_data_schema := jsonb_set(v_data_schema, ARRAY['properties', v_field_key, 'enum'], v_enum_obj);

                    -- 5.2 Build UI Schema
                    v_widget := 'SelectCustomWidget';
                    v_ui_props := v_ui_props || jsonb_build_object(
                        'ui:widget', v_widget,
                        'ui:options', jsonb_build_object(
                            'reference_api', '/api/v4/logical/fetch/' || v_src_schema || '.' || v_src_name || COALESCE(v_filter_params, ''), 
                            'reference_id_field', CASE WHEN (v_fk->>'no_id')::boolean THEN v_disp_col ELSE 'id' END, 
                            'reference_display_field', v_disp_col, 
                            'reference_search_field', v_disp_col,
                            'mode', CASE WHEN v_type LIKE '%[]' THEN 'multiple' ELSE 'single' END,
                            'colSpan', 12
                        )
                    );
                END;
            ELSIF v_type = 'null' THEN
                IF v_field.value->>'widget' = 'InfoWidget' OR v_field_key ~* '\yinfo\y' THEN
                    v_widget := 'InfoWidget';
                    v_ui_props := v_ui_props || jsonb_build_object('ui:options', jsonb_build_object('text', v_title, 'type', 'title', 'level', 4, 'colSpan', 24));
                ELSE
                    v_widget := 'CustomDescriptionWidget';
                    v_ui_props := v_ui_props || jsonb_build_object('ui:options', jsonb_build_object('name', v_title, 'description', v_field.value->>'description', 'colSpan', 24));
                END IF;
            ELSIF v_type LIKE '%[]' THEN
                IF v_field.value->'items'->>'type' = 'date' THEN
                    v_widget := 'DateRangePickerWidget';
                ELSIF v_field.value->'items'->>'type' = 'date-time' OR v_field.value->'items'->>'type' = 'timestamp' THEN
                    v_widget := 'DateTimeRangePickerWidget';
                ELSIF v_field.value->'items'->>'type' = 'object' THEN
                    v_widget := 'EditableTableWidget';
                    v_ui_props := v_ui_props || jsonb_build_object('ui:options', jsonb_build_object('addable', true, 'removable', true, 'colSpan', 24));
                ELSE
                    v_widget := 'TagsWidget';
                END IF;
                -- Default colSpan for arrays if not already objectified above
                IF NOT v_ui_props->'ui:options' ? 'colSpan' THEN
                    v_ui_props := jsonb_set(v_ui_props, '{ui:options, colSpan}', '24'::jsonb);
                END IF;
            ELSIF v_field.value->>'is_password' = 'true' OR v_field_key ~* '\ypassword\y' THEN
                v_widget := 'password';
                v_ui_props := v_ui_props || '{"ui:options": {"colSpan": 12}}'::jsonb;
            ELSIF v_field.value->>'is_hidden' = 'true' OR v_field_key ~* '\yhidden\y' THEN
                v_widget := 'hidden';
            ELSIF v_field_key ~* '\y(phone|mobile|tel)\y' THEN
                v_ui_props := v_ui_props || jsonb_build_object('ui:options', jsonb_build_object('inputType', 'tel', 'colSpan', 12));
            ELSIF v_type = 'boolean' THEN
                v_ui_props := v_ui_props || '{"ui:options": {"colSpan": 12}}'::jsonb;
            ELSIF v_type IN ('numeric', 'integer', 'number') AND (v_field.value ? 'maximum' OR v_field.value ? 'minimum') THEN
                v_widget := 'range';
                v_ui_props := v_ui_props || '{"ui:options": {"colSpan": 12}}'::jsonb;
            ELSIF (v_type = 'text' OR v_type = 'string') AND v_field_key ~* '\y(description|notes|message|comment|resume)\y' THEN
                v_widget := 'textarea';
                v_ui_props := v_ui_props || '{"ui:options": {"colSpan": 24}}'::jsonb;
            ELSIF v_type = 'date' THEN
                v_widget := 'date';
                v_ui_props := v_ui_props || '{"ui:options": {"colSpan": 12}}'::jsonb;
            ELSIF v_type LIKE 'timestamp%' THEN
                v_widget := 'date-time';
                v_ui_props := v_ui_props || '{"ui:options": {"colSpan": 12}}'::jsonb;
            ELSIF v_field_key ~* '\y(url|link|uri|website)\y' AND v_type = 'text' THEN
                v_widget := 'WebWidget';
                v_ui_props := v_ui_props || '{"ui:options": {"colSpan": 12}}'::jsonb;
            ELSIF v_field_key ~* '\y(file|attachment|image|pdf|cv)\y' THEN
                v_widget := 'file';
                v_ui_props := v_ui_props || '{"ui:options": {"colSpan": 12}}'::jsonb;
            ELSE
                -- Default colSpan for everything else
                v_ui_props := v_ui_props || '{"ui:options": {"colSpan": 12}}'::jsonb;
            END IF;

            IF v_widget IS NOT NULL THEN
                v_ui_props := v_ui_props || jsonb_build_object('ui:widget', v_widget);
            END IF;

            v_ui_schema := jsonb_set(v_ui_schema, ARRAY[v_field_key], v_ui_props);
        END;

        -- 6. Maintain Order and Required
        v_ui_schema := jsonb_set(v_ui_schema, ARRAY['ui:order'], (v_ui_schema->'ui:order') || jsonb_build_array(v_field_key));
        IF v_is_mandatory THEN
            v_required := array_append(v_required, v_field_key);
        END IF;

        -- 7. Basic Layout logic (Row grouping)
        v_current_row := array_append(v_current_row, v_field_key);
        IF array_length(v_current_row, 1) >= v_items_per_row OR v_type LIKE '%[]' OR v_widget = 'textarea' OR (v_data_schema->'properties'->v_field_key->>'type' = 'object') THEN
            v_layout := v_layout || jsonb_build_array(to_jsonb(v_current_row));
            v_current_row := ARRAY[]::text[];
        END IF;

    END LOOP;

    -- Finalize Layout
    IF array_length(v_current_row, 1) > 0 THEN
        v_layout := v_layout || jsonb_build_array(to_jsonb(v_current_row));
    END IF;
    -- Wrap multiple rows into a single page
    v_ui_schema := jsonb_set(v_ui_schema, ARRAY['ui:layout'], jsonb_build_array(v_layout));

    -- Finalize Required
    IF array_length(v_required, 1) > 0 THEN
        v_data_schema := jsonb_set(v_data_schema, ARRAY['required'], to_jsonb(v_required));
    END IF;

    -- 8. Add Submit Button Options
    v_ui_schema := jsonb_set(v_ui_schema, ARRAY['ui:submitButtonOptions'], jsonb_build_object(
        'props', jsonb_build_object(
            'disabled', false,
            'className', 'ant-btn-variant-solid ant-btn-block'
        ),
        'norender', false,
        'submitText', 'Save'
    ));

    RETURN jsonb_build_object(
        'data_schema', v_data_schema,
        'ui_schema', v_ui_schema,
        'db_schema', jsonb_build_object('table', p_entity_name)
    );
END;
$function$;
