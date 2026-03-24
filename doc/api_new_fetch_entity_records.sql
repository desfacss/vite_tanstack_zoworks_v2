
DECLARE
    v_schema_opt text := config->>'entity_schema';
    v_table text := config->>'entity_name';
    v_full_name text := CASE WHEN v_schema_opt IS NOT NULL THEN v_schema_opt || '.' || v_table ELSE v_table END;
    v_org_id uuid;
    v_limit int := COALESCE((config->'pagination'->>'limit')::int, 50);
    v_cursor text := config->'pagination'->>'cursor';
    v_sort_str text := COALESCE((config->'sorting'->>'column') || '_' || lower(config->'sorting'->>'direction'), 'created_at_desc');
BEGIN
    IF v_table IS NULL THEN RETURN jsonb_build_object('error', 'Missing entity_name'); END IF;
    BEGIN v_org_id := (config->>'organization_id')::uuid; EXCEPTION WHEN OTHERS THEN v_org_id := NULL; END;

    RETURN core.api_new_int_build_query_sql(v_full_name, v_org_id, config->'search'->>'value', COALESCE(config->'filters', '[]'::jsonb), v_sort_str, v_limit, v_cursor)
           || jsonb_build_object('api', 'new_v4', 'entity', v_table);
END;
