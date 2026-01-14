-- Migration: Trusted Gateway RPC for RLS (v2 - SECURITY DEFINER)
-- Date: 2026-01-14

-- 1. Create/Update the internal query builder (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION core.api_int_build_query_sql_rls(
    p_entity text, 
    p_org_id uuid DEFAULT NULL::uuid, 
    p_search text DEFAULT NULL::text, 
    p_filters jsonb DEFAULT '[]'::jsonb, 
    p_sort text DEFAULT 'created_at_desc'::text, 
    p_limit integer DEFAULT 50, 
    p_cursor text DEFAULT NULL::text,
    p_is_team_view boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = core, public
AS $_$
DECLARE
    schema_name text; table_name text; full_view text;
    sql_query text; where_parts text[] := '{}';
    result jsonb; 
    
    -- Cursor variables
    v_cursor_val text; v_cursor_id uuid;
    v_sort_col text; v_sort_dir text; v_op text;
BEGIN
    -- 1. Resolve Entity Context from Registry
    SELECT entity_schema, entity_type, (rules->'logic'->>'base_view')
    INTO schema_name, table_name, full_view
    FROM core.entities 
    WHERE (entity_schema || '.' || entity_type) = p_entity
       OR entity_type = p_entity;

    -- 2. Fallback to physical names if not in registry (Safety)
    IF schema_name IS NULL THEN
        schema_name := split_part(p_entity, '.', 1);
        table_name  := split_part(p_entity, '.', 2);
    END IF;

    IF full_view IS NULL THEN
        full_view := format('%I.%I', COALESCE(schema_name, 'public'), table_name);
    END IF;

    -- 2. Organization Barrier
    IF p_org_id IS NOT NULL THEN
        where_parts := array_append(where_parts, format('t.organization_id = %L', p_org_id));
    END IF;

    -- 3. Scoped Filtering (Team View logic)
    -- If team view is requested, exclude own records so RLS shows subordinates/colleagues
    IF p_is_team_view THEN
        where_parts := array_append(where_parts, format('t.user_id != %L', auth.uid()));
    END IF;

    -- 4. Search
    IF p_search IS NOT NULL AND trim(p_search) <> '' THEN
        IF position(' ' in p_search) > 0 THEN
            where_parts := array_append(where_parts, format('t.search_vector @@ websearch_to_tsquery(''simple'', %L)', p_search));
        ELSE
            where_parts := array_append(where_parts, format('t.search_vector @@ to_tsquery(''simple'', %L || '':*'')', p_search));
        END IF;
    END IF;

    -- 5. Filters
    IF jsonb_array_length(p_filters) > 0 THEN
        DECLARE i int; f jsonb; col text; op text; val jsonb; val_txt text; BEGIN
            FOR i IN 0 .. jsonb_array_length(p_filters)-1 LOOP
                f := p_filters->i; col := f->>'column'; op := lower(f->>'operator'); val := f->'value';
                IF col IS NULL OR col !~ '^[a-zA-Z0-9_.]+$' THEN CONTINUE; END IF;
                
                -- Support JSONB dot notation
                IF position('.' in col) > 0 THEN
                    DECLARE 
                        parts text[] := string_to_array(col, '.');
                        json_col text := parts[1];
                        json_path text[] := parts[2:array_length(parts, 1)];
                    BEGIN
                        col := format('t.%I #>> %L', json_col, json_path);
                    END;
                ELSE
                    col := format('t.%I', col);
                END IF;

                IF op = 'eq' OR op = '=' THEN where_parts := array_append(where_parts, format('%s = %L', col, val#>>'{}'));
                ELSIF op = 'neq' OR op = '!=' THEN where_parts := array_append(where_parts, format('%s != %L', col, val#>>'{}'));
                ELSIF op = 'in' THEN 
                    SELECT string_agg(quote_literal(x), ',') INTO val_txt FROM jsonb_array_elements_text(val) x;
                    IF val_txt IS NOT NULL THEN where_parts := array_append(where_parts, format('%s IN (%s)', col, val_txt)); END IF;
                ELSIF op = 'between' THEN 
                    where_parts := array_append(where_parts, format('%s BETWEEN %L AND %L', col, val->>0, val->>1));
                END IF;
            END LOOP;
        END;
    END IF;

    -- 6. Sorting & Cursor Logic
    IF p_sort = 'created_at_desc' THEN v_sort_col := 'created_at'; v_sort_dir := 'DESC'; v_op := '<';
    ELSIF p_sort = 'created_at_asc' THEN v_sort_col := 'created_at'; v_sort_dir := 'ASC'; v_op := '>';
    ELSIF p_sort = 'updated_at_desc' THEN v_sort_col := 'updated_at'; v_sort_dir := 'DESC'; v_op := '<';
    ELSE v_sort_col := 'created_at'; v_sort_dir := 'DESC'; v_op := '<'; END IF;

    IF p_cursor IS NOT NULL THEN
        v_cursor_val := split_part(p_cursor, '|', 1);
        BEGIN v_cursor_id := split_part(p_cursor, '|', 2)::uuid; EXCEPTION WHEN OTHERS THEN v_cursor_id := NULL; END;
        IF v_cursor_id IS NOT NULL THEN
            where_parts := array_append(where_parts, format('(t.%I::text, t.id) %s (%L, %L)', v_sort_col, v_op, v_cursor_val, v_cursor_id));
        END IF;
    END IF;

    -- 7. Execute
    sql_query := format('SELECT jsonb_agg(sub) FROM (SELECT t.* FROM %s t WHERE %s ORDER BY t.%I %s, t.id DESC LIMIT %s) sub',
        full_view, 
        CASE WHEN array_length(where_parts, 1) > 0 THEN array_to_string(where_parts, ' AND ') ELSE 'TRUE' END, 
        v_sort_col, v_sort_dir, p_limit + 1
    );

    EXECUTE sql_query INTO result;

    -- 8. Return Result
    result := COALESCE(result, '[]'::jsonb);
    RETURN jsonb_build_object(
        'data', jsonb_path_query_array(result, format('$[0 to %s]', p_limit - 1)::jsonpath),
        'hasMore', jsonb_array_length(result) > p_limit,
        'nextCursor', CASE WHEN jsonb_array_length(result) > p_limit THEN 
            (result->(p_limit - 1)->>v_sort_col) || '|' || (result->(p_limit - 1)->>'id')
            ELSE NULL END
    );
END;$_$;

-- 2. Create the Public Gateway (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION core.api_fetch_entity_records_rls(config jsonb) RETURNS jsonb
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = core, public
AS $$
DECLARE
    v_schema text := COALESCE(config->>'entity_schema', 'public');
    v_table text := config->>'entity_name';
    v_org_id uuid;
    v_search text := config->'search'->>'value';
    v_filters jsonb := COALESCE(config->'filters', '[]'::jsonb);
    v_limit int := COALESCE((config->'pagination'->>'limit')::int, 50);
    v_cursor text := config->'pagination'->>'cursor';
    v_is_team_view boolean := COALESCE((config->>'is_pending_approval_view')::boolean, false);
    
    v_sort_raw jsonb := config->'sorting';
    v_sort_str text;
    v_result jsonb;
BEGIN
    -- 1. Parse Org ID safely
    BEGIN v_org_id := (config->>'organization_id')::uuid; EXCEPTION WHEN OTHERS THEN v_org_id := NULL; END;

    -- 2. Translate Sort Object to String
    IF v_sort_raw IS NOT NULL THEN
        v_sort_str := (v_sort_raw->>'column') || '_' || lower(v_sort_raw->>'direction');
    ELSE
        v_sort_str := 'created_at_desc';
    END IF;

    -- 3. Execution (Bypasses schema grants but respects RLS via inner builder)
    v_result := core.api_int_build_query_sql_rls(
        v_schema || '.' || v_table,
        v_org_id,
        v_search,
        v_filters,
        v_sort_str,
        v_limit,
        v_cursor,
        v_is_team_view
    );

    RETURN v_result || '{"cached": false, "rls_mode": true, "gateway": "trusted"}'::jsonb;
END;
$$;
