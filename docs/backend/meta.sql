/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_describe_entity_health
   📝 ARGUMENTS: (p_schema_name text, p_table_name text, p_metadata jsonb DEFAULT NULL::jsonb)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_describe_entity_health(p_schema_name text, p_table_name text, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$DECLARE
    actual_metadata  jsonb;
    table_exists     bool;
    has_data_flag    bool;
    cols_info        jsonb := '[]';
    generated_info   jsonb := '[]';
    virtual_cols     jsonb := '[]';
    fk_display_cols  jsonb := '[]';
    missing_virtual  jsonb := '[]';
    missing_fk_disp  jsonb := '[]';
    invalid_fk_refs  jsonb := '[]';
    search_indexes   jsonb;
    full_table       text := format('%I.%I', p_schema_name, p_table_name);
    result           jsonb;
BEGIN
    -- 🔁 Auto-fetch metadata if not provided
    IF p_metadata IS NULL THEN
        SELECT metadata INTO actual_metadata
        FROM core.entities
        WHERE entity_schema = p_schema_name
          AND entity_type = p_table_name;

        IF actual_metadata IS NULL THEN
            RETURN jsonb_build_object(
                'error', format('No metadata found in core.entities for %.%', p_schema_name, p_table_name),
                'hint', 'Run meta_entity_metadata_save first'
            );
        END IF;
    ELSE
        actual_metadata := p_metadata;
    END IF;

    -- Check table existence
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = p_schema_name AND table_name = p_table_name
    ) INTO table_exists;

    IF NOT table_exists THEN
        RETURN jsonb_build_object(
            'error', format('Table %.% does not exist', p_schema_name, p_table_name)
        );
    END IF;

    -- Safely check for data
    BEGIN
        EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I)', p_schema_name, p_table_name)
        INTO has_data_flag;
    EXCEPTION WHEN insufficient_privilege OR undefined_table THEN
        has_data_flag := NULL;
    END;

    -- 1. Base columns (non-generated)
    SELECT jsonb_agg(jsonb_build_object(
        'name', column_name,
        'type', udt_name,
        'is_nullable', is_nullable = 'YES',
        'default', column_default,
        'is_generated', false
    ) ORDER BY ordinal_position)
    INTO cols_info
    FROM information_schema.columns
    WHERE table_schema = p_schema_name
      AND table_name = p_table_name
      AND column_name NOT IN (
          SELECT column_name
          FROM core.entity_generated_columns
          WHERE entity_schema = p_schema_name
            AND entity_table = p_table_name
      );

    -- 2. ✅ Pull generated columns from REGISTRY (not pg_get_expr!)
    SELECT
        jsonb_agg(
            CASE WHEN column_type = 'fk_display' THEN
                jsonb_build_object(
                    'name', column_name,
                    'type', 'text',
                    'is_generated', true,
                    'is_virtual', false,
                    'is_fk_display', true,
                    'source_fk_column', source_config->>'fk_column',
                    'source_table', source_config->>'source_table',
                    'display_column', source_config->>'display_column'
                )
            ELSE -- 'virtual_jsonb'
                jsonb_build_object(
                    'name', column_name,
                    'type', 'text',  -- or infer if needed; often text/bool/int
                    'is_generated', true,
                    'is_virtual', true,
                    'jsonb_column', source_config->>'jsonb_column',
                    'json_path', source_config->>'path'
                )
            END
            ORDER BY column_name
        ),
        jsonb_agg(
            jsonb_build_object(
                'name', column_name,
                'source_fk_column', source_config->>'fk_column',
                'source_table', source_config->>'source_table',
                'display_column', source_config->>'display_column'
            )
        ) FILTER (WHERE column_type = 'fk_display'),
        jsonb_agg(
            jsonb_build_object(
                'name', column_name,
                'jsonb_column', source_config->>'jsonb_column',
                'json_path', source_config->>'path'
            )
        ) FILTER (WHERE column_type = 'virtual_jsonb')
    INTO generated_info, fk_display_cols, virtual_cols
    FROM core.entity_generated_columns
    WHERE entity_schema = p_schema_name
      AND entity_table = p_table_name;

    -- 3. Index info (unchanged — safe & reliable)
    SELECT jsonb_build_object(
        'trigram_index', jsonb_build_object(
            'exists', COUNT(*) FILTER (WHERE indexdef LIKE '%USING gin%gin_trgm_ops%') > 0,
            'name', MAX(indexname) FILTER (WHERE indexdef LIKE '%USING gin%gin_trgm_ops%')
        ),
        'array_index', jsonb_build_object(
            'exists', COUNT(*) FILTER (WHERE indexdef LIKE '%USING gin%' AND indexdef NOT LIKE '%gin_trgm_ops%') > 0,
            'name', MAX(indexname) FILTER (WHERE indexdef LIKE '%USING gin%' AND indexdef NOT LIKE '%gin_trgm_ops%')
        )
    )
    INTO search_indexes
    FROM pg_indexes
    WHERE schemaname = p_schema_name
      AND tablename = p_table_name
      AND (indexname LIKE 'idx_%_search' OR indexname LIKE 'idx_%_array_search');

    -- 4. Compute gaps (only if we have metadata)
    IF actual_metadata IS NOT NULL THEN
        -- Missing virtual columns
        SELECT jsonb_agg(
            jsonb_build_object('key', v->>'key', 'reason', 'not_created')
        )
        INTO missing_virtual
        FROM jsonb_array_elements(actual_metadata) v
        WHERE (v->>'is_virtual')::boolean = true
          AND v->>'key' NOT IN (
              SELECT column_name
              FROM core.entity_generated_columns
              WHERE entity_schema = p_schema_name
                AND entity_table = p_table_name
                AND column_type = 'virtual_jsonb'
          );

        -- Missing FK display columns (using naming convention: _id → _ref)
        SELECT jsonb_agg(
            jsonb_build_object(
                'fk_column', v->>'key',
                'display_column', v->'foreign_key'->>'display_column',
                'source_table', v->'foreign_key'->>'source_table',
                'reason', 'not_created'
            )
        )
        INTO missing_fk_disp
        FROM jsonb_array_elements(actual_metadata) v
        WHERE v ? 'foreign_key'
          AND (v->>'is_virtual')::boolean = false
          AND replace(v->>'key', '_id', '_ref') NOT IN (
              SELECT column_name
              FROM core.entity_generated_columns
              WHERE entity_schema = p_schema_name
                AND entity_table = p_table_name
                AND column_type = 'fk_display'
          );

        -- Invalid FK references (display col missing in source table)
        SELECT jsonb_agg(
            jsonb_build_object(
                'fk_column', v->>'key',
                'source_table', src.src_table,
                'display_column', v->'foreign_key'->>'display_column',
                'reason', 'display_column_missing_in_source'
            )
        )
        INTO invalid_fk_refs
        FROM jsonb_array_elements(actual_metadata) v,
             LATERAL (
                 SELECT
                     CASE WHEN s LIKE '%.%' THEN split_part(s, '.', 1) ELSE 'public' END AS src_schema,
                     CASE WHEN s LIKE '%.%' THEN split_part(s, '.', 2) ELSE s END AS src_table
                 FROM (SELECT v->'foreign_key'->>'source_table' AS s) _
             ) src
        WHERE v ? 'foreign_key'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c
              WHERE c.table_schema = src.src_schema
                AND c.table_name = src.src_table
                AND c.column_name = v->'foreign_key'->>'display_column'
          );
    END IF;

    -- Assemble final result
    result := jsonb_build_object(
        'entity', full_table,
        'base_columns', COALESCE(cols_info, '[]'),
        'generated_columns', jsonb_build_object(
            'virtual', COALESCE(virtual_cols, '[]'),
            'fk_display', COALESCE(fk_display_cols, '[]')
        ),
        'search_indexes', COALESCE(search_indexes, '{}'),
        'health', jsonb_build_object(
            'table_exists', true,
            'has_data', has_data_flag,
            'total_columns',
                COALESCE(jsonb_array_length(cols_info), 0) +
                COALESCE(jsonb_array_length(virtual_cols), 0) +
                COALESCE(jsonb_array_length(fk_display_cols), 0)
        )
    );

    -- Add diff if metadata resolved
    IF actual_metadata IS NOT NULL THEN
        result := result || jsonb_build_object(
            'metadata_diff', jsonb_build_object(
                'missing_virtual', COALESCE(missing_virtual, '[]'),
                'missing_fk_display', COALESCE(missing_fk_disp, '[]'),
                'invalid_fk_references', COALESCE(invalid_fk_refs, '[]')
            )
        );
    END IF;

    RETURN result;
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_entity_get_capabilities
   📝 ARGUMENTS: (p_entity text)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_entity_get_capabilities(p_entity text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
/* ═══════════════════════════════════════════════════════
   👤 FUNCTION: core.met_entity_get_capabilities
   🎯 PURPOSE: Generates UI/AI capabilities from Metadata
   ✅ FEATURES: Includes "Root Fix" for metadata wrapping + Rich UI Hints
   ═══════════════════════════════════════════════════════ */
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
$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_entity_get_capabilities_trg
   📝 ARGUMENTS: ()
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_entity_get_capabilities_trg()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
/* ═══════════════════════════════════════════════════════
   👤 FUNCTION: core.met_entity_get_capabilities_trg
   🎯 PURPOSE: Trigger logic to update capabilities automatically
   ═══════════════════════════════════════════════════════ */
    -- Optimization: Only recalculate if metadata actually changed or it is a new record
    IF (TG_OP = 'INSERT') OR (NEW.metadata IS DISTINCT FROM OLD.metadata) THEN
        NEW.capabilities := core.met_entity_get_capabilities(NEW.entity_schema || '.' || NEW.entity_type);
    END IF;
    RETURN NEW;
END;
$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_int_construct_semantic_type
   📝 ARGUMENTS: (p_physical_type text, p_semantic_hint text DEFAULT NULL::text, p_enum_vals text[] DEFAULT NULL::text[])
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_int_construct_semantic_type(p_physical_type text, p_semantic_hint text DEFAULT NULL::text, p_enum_vals text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$DECLARE
    /* ===========================================================================
    DEV NOTES & DOCUMENTATION
    ===========================================================================
    * Function: meta_construct_semantic_type
    * Legacy Name: nmeta_build_semantic_type
    * Purpose: 
        The factory that outputs the standard "semantic_type" JSON object 
        stored in core.entities.metadata. This defines how the UI 
        renders filters and charts (e.g., "measure" vs "dimension").
    
    * Inputs:
        - p_physical_type: postgres type (e.g., 'integer', 'text[]')
        - p_semantic_hint: hint from heuristics (e.g., 'ratio', 'temporal')
        - p_enum_vals: array of distinct values if column implies a dropdown.
    
    * Logic Changes:
        - Improved array type normalization (handling '[]' suffix).
        - Strict handling of probability integers as 'continuous'.
        - Added hierarchy/ltree support.
    ===========================================================================
    */

    v_role TEXT;
    v_sub_type TEXT;
    v_agg TEXT;
    v_is_keyword BOOLEAN := false;
    v_base_type TEXT;
BEGIN
    -- Normalization: Extract base type from arrays (e.g., 'text[]' -> 'text')
    IF p_physical_type LIKE '%[]' THEN
        v_base_type := regexp_replace(p_physical_type, '\[\]$', '');
        v_is_keyword := true; -- Arrays are automatically keyword searchable
    ELSE
        v_base_type := p_physical_type;
    END IF;

    -- 1. Determine Role (Measure vs Dimension)
    -- Only numeric types with specific hints become measures. 
    -- Default for numbers is still Dimension unless hinted otherwise.
    IF v_base_type IN ('integer', 'numeric', 'double precision', 'real', 'decimal')
       AND (p_semantic_hint = 'continuous' OR p_semantic_hint = 'ratio') THEN
        v_role := 'measure';
    ELSE
        v_role := 'dimension';
    END IF;

    -- 2. Determine Sub-Type and Default Aggregation
    CASE
        WHEN p_semantic_hint = 'continuous' 
          OR v_base_type IN ('numeric', 'double precision', 'real', 'decimal') THEN
            v_sub_type := 'continuous'; 
            v_agg := 'sum';

        WHEN p_semantic_hint = 'ratio' THEN
            v_sub_type := 'ratio'; 
            v_agg := 'avg';

        WHEN p_semantic_hint = 'temporal' 
          OR v_base_type IN ('date', 'timestamp', 'timestamptz', 'time', 'date') THEN
            v_sub_type := 'temporal'; 
            v_agg := 'count';

        WHEN p_semantic_hint = 'boolean' OR v_base_type = 'boolean' THEN
            v_sub_type := 'boolean'; 
            v_agg := 'count';

        WHEN p_semantic_hint = 'ordinal' 
          AND p_enum_vals IS NOT NULL 
          AND array_length(p_enum_vals, 1) > 0 THEN
            v_sub_type := 'ordinal'; 
            v_agg := 'count';

        WHEN p_semantic_hint = 'discrete' 
          OR v_base_type IN ('uuid', 'integer', 'bigint') THEN
            v_sub_type := 'discrete'; 
            v_agg := 'count';
        
        -- ✅ HIERARCHY SUPPORT ADDED
        WHEN p_semantic_hint = 'hierarchy' OR v_base_type = 'ltree' THEN
            v_sub_type := 'hierarchy';
            v_agg := 'count';

        -- Default fallback
        ELSE
            v_sub_type := 'nominal'; 
            v_agg := 'count';
    END CASE;

    -- 3. Special Overrides
    -- Force array types to be nominal/keyword (cannot sum text arrays)
    IF p_physical_type LIKE '%[]' THEN
        v_sub_type := 'nominal'; 
        v_agg := 'count';
        v_is_keyword := true;
    END IF;

    -- Probability fields (0-100) specific override
    IF p_semantic_hint = 'ratio' AND v_base_type = 'integer' THEN
        v_sub_type := 'continuous';
        v_agg := 'avg';
        v_role := 'measure';
    END IF;

    RETURN jsonb_build_object(
        'role', v_role,
        'sub_type', v_sub_type,
        'default_aggregation', v_agg,
        'order', COALESCE(p_enum_vals, ARRAY[]::TEXT[]),
        'keyword', v_is_keyword
    );
END;
$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_int_detect_blueprint_stages
   📝 ARGUMENTS: (p_tablename text)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_int_detect_blueprint_stages(p_tablename text)
 RETURNS TABLE(stage_order text[], found_entity_type text, has_stages boolean)
 LANGUAGE plpgsql
 STABLE
AS $function$DECLARE
    /* ===========================================================================
    DEV NOTES & DOCUMENTATION
    ===========================================================================
    * Function: meta_detect_blueprint_stages
    * Legacy Name: meta_detect_blueprint_stages
    * Purpose: 
        Checks if the entity is governed by a Blueprint (State Machine).
        If yes, it retrieves the valid stages in the correct order.
        This allows the UI to render a Kanban board correctly immediately.
    
    * Logic Refactor:
        - REMOVED: Hardcoded check for 'tasks' table.
        - ADDED: Generic lookup in automation.esm_definitions matching 
          the table name to the 'entity_type' column.
    
    * Dependencies:
        - Table: automation.esm_definitions
        - Column: definitions -> 'stages' array
    ===========================================================================
    */
BEGIN
    -- Generic lookup: Does a definition exist for this table?
    SELECT 
        array_agg(stages->>'id' ORDER BY (stages->>'sequence')::int),
        def.entity_type,
        TRUE
    INTO stage_order, found_entity_type, has_stages
    FROM automation.esm_definitions def,
    LATERAL jsonb_array_elements(def.definitions->'stages') AS stages
    WHERE def.entity_type = p_tablename
    AND def.is_active = true
    GROUP BY def.entity_type
    LIMIT 1;
    
    -- If found, return the result (STABLE function caches this for the transaction)
    IF FOUND THEN
        RETURN NEXT;
        RETURN;
    END IF;

    -- Fallback: No blueprint found
    stage_order := NULL;
    found_entity_type := NULL;
    has_stages := FALSE;
    RETURN NEXT;
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_int_detect_index_patterns
   📝 ARGUMENTS: (p_schema_name text, p_table_name text, p_metadata jsonb)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_int_detect_index_patterns(p_schema_name text, p_table_name text, p_metadata jsonb)
 RETURNS TABLE(pattern_name text, index_columns text[], include_columns text[], index_method text, confidence_score numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE

/* ═══════════════════════════════════════════════════════════════════════════════
   👤 OBJECT: core.met_int_detect_index_patterns
   🎯 PURPOSE: Analyzes table metadata to suggest optimal covering indexes.
   
   🔍 HEURISTICS & PATTERNS:
     1. Universal Timeline: (org_id + created_at) -> Dashboard queries.
     2. My Items: (org_id + user_id + created_at) -> "Assigned to Me" lists.
     3. Workflow Board: (org_id + status/stage + created_at) -> Kanban boards.
     4. Due Date Priority: (org_id + due_date + created_at) -> Deadline tracking.
     5. Hierarchy Path (NEW): (ltree column) -> Tree traversals using GIST.

   ⚙️ OUTPUT:
     - index_columns: The columns to index.
     - include_columns: Columns to include in the leaf nodes (for Index-Only Scans).
     - index_method: 'btree' (default) or 'gist' (for ltree/geometry).
     - confidence_score: How strong the recommendation is (0.0 - 1.0).
   ═══════════════════════════════════════════════════════════════════════════════ */
    v_include_candidates text[];
    v_min_rows integer;
    v_table_size bigint;
    
    -- Pattern detection variables
    has_org boolean := false;
    has_created_at boolean := false;
    has_updated_at boolean := false;
    has_stage boolean := false;
    has_status boolean := false;
    has_due_date boolean := false;
    user_fks text[] := '{}';
    ltree_cols text[] := '{}'; -- Track hierarchy columns
    
    -- Column analysis
    col record;
    score numeric;
    candidate_scores jsonb := '{}'::jsonb;
    col_key text;
BEGIN
    -- 1. Configuration & Sizing
    SELECT 
        COALESCE((SELECT array_agg(x) FROM jsonb_array_elements_text(config_value) t(x)), ARRAY['name', 'display_id', 'title', 'subject', 'status']),
        COALESCE((SELECT config_value::integer FROM core.meta_config WHERE config_key = 'covering_index_min_rows'), 10000)
    INTO v_include_candidates, v_min_rows
    FROM core.meta_config WHERE config_key = 'covering_index_include_columns';
    
    -- Get table size estimate (fast count)
    SELECT reltuples::bigint INTO v_table_size
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = p_schema_name AND c.relname = p_table_name;
    
    -- Skip optimization for tiny tables (indexes add overhead)
    IF v_table_size < v_min_rows THEN
        RETURN;
    END IF;
    
    -- 2. Analysis Pass (Scan Metadata)
    FOR col IN SELECT * FROM jsonb_array_elements(p_metadata) LOOP
        DECLARE
            v_col_key text := col.value->>'key';
            v_col_type text := col.value->>'type';
            is_displayable boolean := (col.value->>'is_displayable')::boolean;
            is_searchable boolean := (col.value->>'is_searchable')::boolean;
            is_mandatory boolean := (col.value->>'is_mandatory')::boolean;
            is_virtual boolean := (col.value->>'is_virtual')::boolean;
            fk_info jsonb := col.value->'foreign_key';
        BEGIN
            -- Flag detection
            IF v_col_key = 'organization_id' THEN has_org := true; END IF;
            IF v_col_key = 'created_at' AND v_col_type LIKE '%timestamp%' THEN has_created_at := true; END IF;
            IF v_col_key = 'updated_at' AND v_col_type LIKE '%timestamp%' THEN has_updated_at := true; END IF;
            IF v_col_key = 'stage_id' THEN has_stage := true; END IF;
            IF v_col_key = 'status' THEN has_status := true; END IF;
            IF v_col_key = 'due_date' THEN has_due_date := true; END IF;
            
            -- Detect User References (e.g., owner_id, assignee_id)
            IF fk_info IS NOT NULL AND fk_info->>'source_table' LIKE '%.users' THEN
                user_fks := user_fks || v_col_key;
            END IF;

            -- ✅ DETECT LTREE (Hierarchy)
            IF v_col_type = 'ltree' THEN
                ltree_cols := ltree_cols || v_col_key;
            END IF;
            
            -- Scoring for INCLUDE consideration (Covering Index candidates)
            score := 0;
            IF v_col_key = ANY(v_include_candidates) THEN score := score + 2; END IF;
            IF is_displayable THEN score := score + 1.5; END IF;
            IF is_searchable THEN score := score + 1; END IF;
            IF is_mandatory THEN score := score + 0.5; END IF;
            IF NOT is_virtual THEN score := score + 0.5; END IF; -- Prefer physical columns for INCLUDE
            
            -- Type-based scoring (prefer smaller, fixed-width types)
            IF v_col_type IN ('text', 'varchar') THEN score := score + 0.3; END IF;
            IF v_col_type LIKE '%timestamp%' THEN score := score + 0.2; END IF;
            IF v_col_type = 'uuid' THEN score := score + 0.1; END IF;
            
            IF score > 0 THEN
                candidate_scores := candidate_scores || jsonb_build_object(v_col_key, score);
            END IF;
        END;
    END LOOP;
    
    -- 3. Generate Patterns
    
    -- ✅ PATTERN 0: HIERARCHY PATH (GIST Index)
    -- This takes precedence as it enables tree traversal queries (<@, @>).
    IF array_length(ltree_cols, 1) > 0 THEN
        FOREACH col_key IN ARRAY ltree_cols LOOP
            RETURN QUERY SELECT 
                'hierarchy_path' as pattern_name,
                ARRAY[col_key] as index_columns, -- GIST on path alone
                '{}'::text[] as include_columns, -- GIST does not support INCLUDE in standard PG versions
                'gist' as index_method,          -- ✅ CRITICAL: Use GIST
                0.95 as confidence_score;
        END LOOP;
    END IF;

    -- PATTERN 1: Universal Timeline (Dashboard)
    IF has_org AND has_created_at THEN
        RETURN QUERY SELECT 
            'universal_timeline', 
            ARRAY['organization_id', 'created_at DESC', 'id'], 
            ARRAY(SELECT key FROM jsonb_each_text(candidate_scores) ORDER BY (value)::numeric DESC LIMIT 5), 
            'btree', 
            0.85;
    END IF;
    
    -- PATTERN 2: My Tasks/My Items (User-specific)
    IF has_org AND array_length(user_fks, 1) > 0 AND has_created_at THEN
        FOREACH col_key IN ARRAY user_fks LOOP
            RETURN QUERY SELECT 
                format('my_%s_items', replace(col_key, '_id', '')), 
                ARRAY['organization_id', col_key, 'created_at DESC'], 
                ARRAY(SELECT key FROM jsonb_each_text(candidate_scores) WHERE key NOT IN ('organization_id', col_key, 'id') ORDER BY (value)::numeric DESC LIMIT 4), 
                'btree', 
                0.8;
        END LOOP;
    END IF;
    
    -- PATTERN 3: Workflow Board (Stage/Status based)
    IF has_org AND (has_stage OR has_status) AND has_created_at THEN
        RETURN QUERY SELECT 
            format('%s_board', CASE WHEN has_stage THEN 'stage_id' ELSE 'status' END), 
            ARRAY['organization_id', CASE WHEN has_stage THEN 'stage_id' ELSE 'status' END, 'created_at DESC'], 
            ARRAY(SELECT key FROM jsonb_each_text(candidate_scores) WHERE key NOT IN ('organization_id', 'stage_id', 'status', 'id') ORDER BY (value)::numeric DESC LIMIT 4), 
            'btree', 
            0.75;
    END IF;
    
    -- PATTERN 4: Due Date Priority (Time-sensitive)
    IF has_org AND has_due_date AND has_created_at THEN
        RETURN QUERY SELECT 
            'due_date_priority', 
            ARRAY['organization_id', 'due_date', 'created_at DESC'], 
            ARRAY(SELECT key FROM jsonb_each_text(candidate_scores) WHERE key NOT IN ('organization_id', 'due_date', 'id') ORDER BY (value)::numeric DESC LIMIT 4), 
            'btree', 
            0.7;
    END IF;
END;
$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_int_explore_columns_array
   📝 ARGUMENTS: (jsonb_data jsonb, prefix text, depth integer)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_int_explore_columns_array(jsonb_data jsonb, prefix text, depth integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$DECLARE
    /* ===========================================================================
    DEV NOTES & DOCUMENTATION
    ===========================================================================
    * Function: meta_explore_columns_array
    * Legacy Name: core.nmeta_explore_columns_array
    * Purpose: 
        Analyzes arrays inside JSONB to determine if they contain 
        nested objects or primitives.
    
    * Logic:
        - Samples up to 10 elements.
        - If elements are Objects: Recurse.
        - If elements are Primitives: Infers type and marks as 'array[]'.
    ===========================================================================
    */
    result JSONB := '[]'::JSONB;
    item JSONB;
    processed_types TEXT[] := '{}';
BEGIN
    IF depth > 4 OR jsonb_data IS NULL THEN 
        RETURN result; 
    END IF;

    FOR item IN 
        SELECT jsonb_array_elements(jsonb_data) 
        LIMIT 10
    LOOP
        DECLARE
            item_type TEXT := jsonb_typeof(item);
        BEGIN
            -- Optimization: Only process each type once per array (e.g., don't scan 10 strings)
            IF item_type = ANY(processed_types) THEN
                CONTINUE;
            END IF;
            processed_types := array_append(processed_types, item_type);

            -- 1. Array of Objects: Recurse
            IF item_type = 'object' THEN
                result := result || core.met_int_explore_columns_object(item, prefix, depth + 1);
            
            -- 2. Array of Arrays: Recurse
            ELSIF item_type = 'array' THEN
                result := result || core.met_int_explore_columns_array(item, prefix, depth + 1);
            
            -- 3. Array of Primitives
            ELSE
                DECLARE
                    inferred JSONB := core.met_int_infer_value_type(item::TEXT);
                    base_type TEXT := inferred->>'type';
                    semantic TEXT := inferred->>'semantic';
                    -- Extract clean display name from last dot-part
                    display_name TEXT := initcap(
                        (string_to_array(trim(trailing '.' FROM prefix), '.'))[array_length(string_to_array(trim(trailing '.' FROM prefix), '.'), 1)]
                    );
                BEGIN
                    result := result || jsonb_build_array(jsonb_build_object(
                        'key', regexp_replace(prefix, '\.$', ''),
                        'physical_type', base_type || '[]', -- e.g. 'text[]'
                        'element_physical_type', base_type,
                        'semantic_hint', semantic,
                        'display_name_hint', display_name
                    ));
                END;
            END IF;
        END;
    END LOOP;

    RETURN result;
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_int_explore_columns_object
   📝 ARGUMENTS: (jsonb_data jsonb, prefix text, depth integer)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_int_explore_columns_object(jsonb_data jsonb, prefix text, depth integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$DECLARE
    /* ===========================================================================
    DEV NOTES & DOCUMENTATION
    ===========================================================================
    * Function: meta_explore_columns_object
    * Legacy Name: core.nmeta_explore_columns_object
    * Purpose: 
        Traverses a JSONB object to flatten keys into "dot-notation" columns.
        e.g., { "details": { "tier": "gold" } } -> "details.tier"
    
    * Logic:
        - Iterates keys.
        - Ignores keys that look like UUIDs (assumes they are map keys, not fields).
        - Recurses if value is Object or Array.
        - Calls 'meta_infer_value_type' for primitives.
        - Stops recursion at depth 4 to prevent infinite loops/stack overflow.
    ===========================================================================
    */
    result JSONB := '[]'::JSONB;
    key TEXT;
    value JSONB;
    -- Regex to identify keys that are actually data (like map IDs) rather than schema fields
    uuid_regex TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
    -- Safety valve
    IF depth > 4 OR jsonb_data IS NULL THEN RETURN result; END IF;

    FOR key IN SELECT jsonb_object_keys(jsonb_data)
    LOOP
        -- Skip keys that look like UUIDs (likely dynamic map keys, not schema structure)
        IF lower(key) ~ uuid_regex THEN
            CONTINUE; 
        END IF;

        value := jsonb_data -> key;

        -- 1. Nested Object: Recurse
        IF jsonb_typeof(value) = 'object' THEN
            result := result || core.met_int_explore_columns_object(value, prefix || key || '.', depth + 1);
        
        -- 2. Nested Array: Call Array Explorer
        ELSIF jsonb_typeof(value) = 'array' THEN
            result := result || core.met_int_explore_columns_array(value, prefix || key || '.', depth + 1);
        
        -- 3. Primitive: Infer Type
        ELSE
            DECLARE
                inferred JSONB := core.met_int_infer_value_type(value::TEXT);
                phys_type TEXT := inferred->>'type';
                semantic TEXT := inferred->>'semantic';
            BEGIN
                result := result || jsonb_build_array(jsonb_build_object(
                    'key', prefix || key,
                    'physical_type', phys_type,
                    'semantic_hint', semantic
                ));
            END;
        END IF;
    END LOOP;
    RETURN result;
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_int_infer_potential_fk
   📝 ARGUMENTS: (p_column_name text, p_excluded_schemas text[] DEFAULT '{}'::text[], p_excluded_tables text[] DEFAULT '{}'::text[], p_schema_priority text[] DEFAULT ARRAY['public'::text, 'core'::text, 'identity'::text], p_current_schema text DEFAULT NULL::text)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_int_infer_potential_fk(p_column_name text, p_excluded_schemas text[] DEFAULT '{}'::text[], p_excluded_tables text[] DEFAULT '{}'::text[], p_schema_priority text[] DEFAULT ARRAY['public'::text, 'core'::text, 'identity'::text], p_current_schema text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'core'
AS $function$DECLARE
    v_base_name         text;
    v_candidate_names   text[];
    v_found_schema      text;
    v_found_table       text;
    v_found_candidate   text;
    v_display_column    text;
    v_reason            text;
BEGIN
    -- 1. Fast-fail
    IF p_column_name IS NULL OR p_column_name = 'id' OR p_column_name NOT ILIKE '%_id' THEN RETURN NULL; END IF;

    -- 2. Normalize
    v_base_name := lower(regexp_replace(p_column_name, '_id$', ''));
    IF v_base_name IN ('', 'entity', 'entities', 'item', 'items') THEN RETURN NULL; END IF;

    -- 3. Candidates
    v_candidate_names := ARRAY[v_base_name || 's', v_base_name];

    -- 4. Search with Priority
    <<search_loop>>
    FOR i IN 1 .. array_length(v_candidate_names, 1)
    LOOP
        SELECT t.table_schema, t.table_name
        INTO v_found_schema, v_found_table
        FROM information_schema.tables t
        WHERE t.table_name = v_candidate_names[i]
          AND t.table_type = 'BASE TABLE'
          AND t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
          AND (p_excluded_schemas IS NULL OR t.table_schema <> ALL(p_excluded_schemas))
          AND (p_excluded_tables IS NULL  OR t.table_name    <> ALL(p_excluded_tables))
        ORDER BY 
            -- ✅ 1. Current Schema (Top Priority)
            CASE WHEN t.table_schema = p_current_schema THEN 0 ELSE 1 END,
            -- ✅ 2. Config Priority List
            COALESCE(array_position(p_schema_priority, t.table_schema), 9999)
        LIMIT 1;

        IF v_found_schema IS NOT NULL THEN
            v_found_candidate := v_candidate_names[i];
            EXIT search_loop;
        END IF;
    END LOOP search_loop;

    -- 5. Not Found?
    IF v_found_schema IS NULL THEN RETURN NULL; END IF;

    -- 6. Display Column Heuristic
    SELECT c.column_name INTO v_display_column
    FROM information_schema.columns c
    WHERE c.table_schema = v_found_schema AND c.table_name = v_found_table
      AND c.column_name IN ('name', 'title', 'label', 'display_name', 'code', 'slug', 'email', 'username')
    ORDER BY CASE c.column_name WHEN 'name' THEN 1 WHEN 'title' THEN 2 WHEN 'label' THEN 3 WHEN 'display_name' THEN 4 ELSE 99 END
    LIMIT 1;

    v_display_column := COALESCE(v_display_column, 'id');

    -- 7. Result
    v_reason := format('Inferred from column name %I → table %I.%I (matched: %s)', p_column_name, v_found_schema, v_found_table, v_found_candidate);

    RETURN jsonb_build_object(
        'source_table', format('%I.%I', v_found_schema, v_found_table),
        'source_column', 'id',
        'display_column', v_display_column,
        'confidence', 'medium',
        'reason', v_reason
    );
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_int_infer_value_type
   📝 ARGUMENTS: (val text)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_int_infer_value_type(val text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$DECLARE
    /* ===========================================================================
    DEV NOTES & DOCUMENTATION
    ===========================================================================
    * Function: meta_infer_value_type
    * Legacy Name: meta_infer_semantic_type
    * Purpose: 
        Inspects a single text string to heuristically determine its 
        physical data type and a semantic hint. Used heavily when 
        scanning JSONB keys where strong typing is absent.
    
    * Logic:
        1. Checks NULL/Booleans first (fastest).
        2. Runs Regex patterns for UUIDs, Emails, URLs.
        3. Checks number formats.
        4. Checks for JSON structures (Objects/Arrays).
        5. Fallback to 'text'/'nominal'.
    
    * Maintenance:
        If adding new types (e.g., Credit Cards, IBAN), add the Regex 
        const below and a new ELSIF block.
    ===========================================================================
    */

    -- Regex Constants (Pre-compiled for readability and slight perf boost)
    re_uuid  CONSTANT text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
    re_email CONSTANT text := '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';
    re_url   CONSTANT text := '^https?://[^\s/$.?#].[^\s]*$';
    re_phone CONSTANT text := '^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$';
    re_int   CONSTANT text := '^-?\d+$';
    re_num   CONSTANT text := '^-?\d+(\.\d+)?$';
    re_date  CONSTANT text := '^\d{4}-\d{2}-\d{2}$';
BEGIN
    IF val IS NULL THEN
        RETURN jsonb_build_object('type', 'string', 'semantic', 'unknown');
    
    ELSIF val ~* '^(true|false)$' THEN
        RETURN jsonb_build_object('type', 'boolean', 'semantic', 'boolean');

    ELSIF val ~ re_uuid THEN
        RETURN jsonb_build_object('type', 'uuid', 'semantic', 'discrete');

    ELSIF val ~ re_email THEN
        RETURN jsonb_build_object('type', 'text', 'semantic', 'email');

    ELSIF val ~ re_url THEN
        RETURN jsonb_build_object('type', 'text', 'semantic', 'url');

    ELSIF val ~ re_phone THEN
        RETURN jsonb_build_object('type', 'text', 'semantic', 'phone');

    ELSIF val ~ re_int THEN
        RETURN jsonb_build_object('type', 'integer', 'semantic', 'discrete');

    ELSIF val ~ re_num THEN
        RETURN jsonb_build_object('type', 'numeric', 'semantic', 'continuous');

    ELSIF val ~ re_date THEN
        RETURN jsonb_build_object('type', 'date', 'semantic', 'temporal');

    -- JSON detection (Simple heuristic: starts/ends with brackets)
    ELSIF (val LIKE '{%}' OR val LIKE '[%]') THEN
        BEGIN
            IF jsonb_typeof(val::jsonb) IN ('object', 'array') THEN
                RETURN jsonb_build_object('type', 'jsonb', 'semantic', 'object');
            END IF;
        EXCEPTION WHEN others THEN
            -- Not valid JSON, fall through to text
        END;
    END IF;

    RETURN jsonb_build_object('type', 'text', 'semantic', 'nominal');
EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('type', 'text', 'semantic', 'nominal');
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_int_jsonb_merge_agg
   📝 ARGUMENTS: (jsonb)
   ⚙️ TYPE: AGGREGATE
   ═══════════════════════════════════════════════════════ */

CREATE AGGREGATE core.met_int_jsonb_merge_agg (jsonb) (
    SFUNC = core.met_int_jsonb_merge_deep,
    STYPE = jsonb,
    INITCOND = '{}'
);


/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_int_jsonb_merge_deep
   📝 ARGUMENTS: (val1 jsonb, val2 jsonb)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_int_jsonb_merge_deep(val1 jsonb, val2 jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$DECLARE
    /* ===========================================================================
    DEV NOTES & DOCUMENTATION
    ===========================================================================
    * Function: meta_jsonb_merge_deep
    * Legacy Name: core.nmeta_jsonb_merge_union
    * Purpose: 
        State transition function for the Aggregate. It takes two JSONB 
        values and merges them.
    
    * Logic:
        - If inputs are objects: Recursively merge keys.
        - If inputs are arrays: Perform a UNION (distinct set of elements).
          Note: Splits primitives and objects to handle mixed arrays gracefully.
        - Conflict Strategy: If keys exist in both, the structure is preserved.
    
    * Performance Note: 
        Recursive PL/PGSQL is slower than native code. Do not use on 
        JSONs deeper than 10 levels if performance is critical.
    ===========================================================================
    */
BEGIN
    -- Handle NULLs immediately
    IF val1 IS NULL THEN RETURN val2; END IF;
    IF val2 IS NULL THEN RETURN val1; END IF;

    RETURN jsonb_object_agg(
        COALESCE(ka, kb),
        CASE
            -- 1. One side is missing: take the other
            WHEN va IS NULL THEN vb
            WHEN vb IS NULL THEN va
            
            -- 2. Both are Objects: Recurse
            WHEN jsonb_typeof(va) = 'object' AND jsonb_typeof(vb) = 'object' THEN
                core.met_int_jsonb_merge_deep(va, vb)
            
            -- 3. Both are Arrays: Union distinct elements
            WHEN jsonb_typeof(va) = 'array' AND jsonb_typeof(vb) = 'array' THEN
                (
                    -- A. Merge Primitives (Strings, Numbers, Bools) - Distinct
                    SELECT jsonb_agg(DISTINCT elem ORDER BY elem)
                    FROM (
                        SELECT jsonb_array_elements(va) AS elem
                        UNION
                        SELECT jsonb_array_elements(vb) AS elem
                    ) u
                    WHERE jsonb_typeof(elem) IN ('string', 'number', 'boolean')
                ) ||
                (
                    -- B. Merge Objects inside arrays - Keep all (Schema inference limitation)
                    SELECT jsonb_agg(elem)
                    FROM (
                        SELECT jsonb_array_elements(va) AS elem
                        UNION ALL
                        SELECT jsonb_array_elements(vb) AS elem
                    ) u
                    WHERE jsonb_typeof(elem) = 'object'
                )
            
            -- 4. Type Mismatch or Primitive collision: Prefer the second value
            ELSE vb
        END
    )
    FROM jsonb_each(val1) AS t1(ka, va)
    FULL OUTER JOIN jsonb_each(val2) AS t2(kb, vb) ON ka = kb;
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_provision_entity
   📝 ARGUMENTS: (p_schema_name text, p_table_name text, p_dry_run boolean DEFAULT false)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_provision_entity(p_schema_name text, p_table_name text, p_dry_run boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_metadata jsonb;
BEGIN
    -- 1. Fetch
    SELECT metadata INTO v_metadata
    FROM core.entities
    WHERE entity_schema = p_schema_name AND entity_type = p_table_name;

    IF v_metadata IS NULL THEN
        RAISE EXCEPTION 'Entity %.% not found. Scan and publish first.', p_schema_name, p_table_name;
    END IF;

    -- 2. Call Engine
    RETURN core.met_provision_entity_objects(
        p_schema_name,
        p_table_name,
        v_metadata,
        p_dry_run
    );
END;
$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_provision_entity_objects
   📝 ARGUMENTS: (p_schema_name text, p_table_name text, p_metadata jsonb, p_dry_run boolean DEFAULT false)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_provision_entity_objects(p_schema_name text, p_table_name text, p_metadata jsonb, p_dry_run boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$DECLARE
/* ═══════════════════════════════════════════════════════════════════════════════
   👤 OBJECT: core.met_provision_entity_objects
   🎯 PURPOSE: Applies physical database changes based on finalized metadata.
   
   🛠️ ACTIONS PERFORMED:
     1. Generated Columns: Creates physical columns for virtual JSONB fields (materialization).
     2. Search Vector: Creates/Updates the full-text search tsvector column + GIN index.
     3. Standard View: Creates the `v_{table_name}` abstraction layer with FK joins.
     4. Smart Indexes: Applies the optimal indexes detected by `met_int_detect_index_patterns`.
   
   ⚠️ SAFETY: 
     - p_dry_run = true will only return the plan without executing DDL.
     - Respects 'custom_view_definition' overrides if present in core.entities.
   ═══════════════════════════════════════════════════════════════════════════════ */

    -- Identifiers
    full_table        text := format('%I.%I', p_schema_name, p_table_name);
    view_name         text := format('v_%s', p_table_name);
    full_view_name    text := format('%I.%I', p_schema_name, view_name);

    -- State
    v_threshold         numeric := 0.7;
    v_warnings          jsonb := '[]'::jsonb;
    v_custom_view_sql   text;

    -- Accumulators
    select_parts        text[] := '{}';
    join_parts          text[] := '{}';
    search_parts        text[] := '{}';
    materialize_fields  jsonb[] := '{}';
    advisor_msgs        text[] := '{}';
    used_columns        text[] := '{}';

    -- Loop vars
    r                   record;
    v_item              jsonb;
    v_key               text;
    v_purpose           text;
    v_col_type          text;
    v_src_col           text;
    v_path              text;
    v_expr              text;
    v_search_expr       text;
    
    -- FK vars
    v_fk_info           jsonb;
    v_src_schema        text;
    v_src_table         text;
    v_display_col       text;
    v_alias             text;
    v_display_name      text;

BEGIN
    -- 0. Fetch Custom Definition
    SELECT custom_view_definition INTO v_custom_view_sql
    FROM core.entities WHERE entity_schema = p_schema_name AND entity_type = p_table_name;

    -- 1. Normalization (Handle wrapped object vs raw array)
    IF p_metadata ? 'columns' THEN
        v_warnings := COALESCE(p_metadata->'warnings', '[]'::jsonb);
        p_metadata := p_metadata->'columns';
    END IF;
    
    IF p_metadata IS NULL OR jsonb_typeof(p_metadata) != 'array' THEN
        RAISE EXCEPTION 'Invalid metadata format';
    END IF;

    -- 2. Classification & View Logic
    FOR r IN SELECT value FROM jsonb_array_elements(p_metadata) LOOP
        v_item := r.value; v_key := v_item->>'key';
        IF (v_item->>'error')::boolean THEN CONTINUE; END IF;

        v_purpose := COALESCE(v_item->>'column_purpose', CASE
            WHEN (v_item->>'is_searchable')::boolean THEN 'search'
            WHEN v_key IN ('stage_id','status','priority','is_active','owner_id') THEN 'filter'
            WHEN v_key IN ('created_at','updated_at','due_date') THEN 'sort'
            ELSE 'display' END);

        -- Materialize?
        IF (v_item->>'is_virtual')::boolean AND v_item ? 'jsonb_column' AND v_purpose IN ('search', 'filter', 'sort') THEN
            materialize_fields := array_append(materialize_fields, v_item);
        END IF;

        -- Search Vector?
        IF (v_item->>'is_searchable')::boolean THEN
            IF (v_item->>'is_virtual')::boolean AND v_item ? 'jsonb_column' THEN
                v_src_col := v_item->>'jsonb_column'; v_col_type := v_item->>'type';
                v_path := CASE WHEN v_key LIKE v_src_col || '.%' THEN substring(v_key FROM length(v_src_col)+2) ELSE v_key END;
                IF v_col_type LIKE '%[]' THEN search_parts := array_append(search_parts, format('coalesce((%I -> %L)::text, '''')', v_src_col, v_path));
                ELSE search_parts := array_append(search_parts, format('coalesce((%I ->> %L), '''')', v_src_col, v_path)); END IF;
            ELSE
                IF (v_item->>'type') NOT LIKE '%timestamp%' THEN search_parts := array_append(search_parts, format('coalesce(%I::text, '''')', v_key)); END IF;
            END IF;
        END IF;
    END LOOP;

    -- 3. Materialization (Level 1)
    FOR r IN SELECT unnest(materialize_fields) AS item LOOP
        v_item := r.item; v_key := v_item->>'key'; v_src_col := v_item->>'jsonb_column'; v_col_type := v_item->>'type';
        v_path := CASE WHEN v_key LIKE v_src_col || '.%' THEN substring(v_key FROM length(v_src_col)+2) ELSE v_key END;
        
        IF v_col_type LIKE '%[]' THEN v_expr := format('nullif(core.met_util_cast_jsonb_array(%I -> %L), ARRAY[]::text[])', v_src_col, v_path);
        ELSE v_expr := format('(%I ->> %L)::%s', v_src_col, v_path, v_col_type); END IF;

        IF NOT p_dry_run THEN
            EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS %I %s GENERATED ALWAYS AS (%s) STORED', p_schema_name, p_table_name, v_key, v_col_type, v_expr);
        END IF;
        advisor_msgs := array_append(advisor_msgs, format('Materialized: %I', v_key));
    END LOOP;

    -- 4. Search Vector (Level 2)
    IF array_length(search_parts, 1) > 0 THEN
        v_search_expr := format('setweight(to_tsvector(''simple'', %s), ''A'')', array_to_string(search_parts, ' || '' '' || '));
        IF NOT p_dry_run THEN
            EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (%s) STORED', p_schema_name, p_table_name, v_search_expr);
            EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_search_vec ON %I.%I USING GIN (search_vector)', p_table_name, p_schema_name, p_table_name);
        END IF;
        advisor_msgs := array_append(advisor_msgs, 'Search Vector: Materialized + GIN Index');
    END IF;

    -- 5. View Generation (Hybrid Strategy)
    IF v_custom_view_sql IS NOT NULL AND trim(v_custom_view_sql) <> '' THEN
        -- 🅰️ CUSTOM PATH
        IF NOT p_dry_run THEN EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', p_schema_name, view_name); EXECUTE v_custom_view_sql; END IF;
        advisor_msgs := array_append(advisor_msgs, '✅ Applied Custom View Definition');
    ELSE
        -- 🅱️ AUTOMATED PATH
        FOR r IN SELECT value FROM jsonb_array_elements(p_metadata) LOOP
            v_item := r.value; v_key := v_item->>'key'; IF (v_item->>'error')::boolean THEN CONTINUE; END IF;
            
            -- Column Selection
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = p_schema_name AND table_name = p_table_name AND column_name = v_key) THEN
                select_parts := array_append(select_parts, format('t.%I', v_key));
            ELSIF (v_item->>'is_virtual')::boolean AND v_item ? 'jsonb_column' THEN
                v_src_col := v_item->>'jsonb_column'; v_path := substring(v_key FROM length(v_src_col)+2); v_col_type := v_item->>'type';
                IF v_col_type LIKE '%[]' THEN select_parts := array_append(select_parts, format('core.met_util_cast_jsonb_array(t.%I -> %L) AS %I', v_src_col, v_path, v_key));
                ELSE select_parts := array_append(select_parts, format('(t.%I ->> %L)::%s AS %I', v_src_col, v_path, v_col_type, v_key)); END IF;
            ELSE select_parts := array_append(select_parts, format('t.%I', v_key)); END IF;
            used_columns := array_append(used_columns, v_key);

            -- FK Resolution
            IF (v_item->'foreign_key') IS NOT NULL AND (v_item->'polymorphic') IS NULL THEN
                v_fk_info := v_item->'foreign_key';
                IF (v_fk_info->>'source_table') IS NOT NULL AND v_fk_info->>'source_table' != '' THEN
                    v_src_table := v_fk_info->>'source_table';
                    v_src_schema := CASE WHEN v_src_table ~ '\.' THEN split_part(v_src_table, '.', 1) ELSE 'public' END;
                    v_src_table := CASE WHEN v_src_table ~ '\.' THEN split_part(v_src_table, '.', 2) ELSE v_src_table END;
                    v_display_col := COALESCE(v_fk_info->>'display_column', 'name');
                    v_alias := 'fk_' || replace(v_key, '_id', '');
                    join_parts := array_append(join_parts, format('LEFT JOIN %I.%I %I ON t.%I = %I.%I', v_src_schema, v_src_table, v_alias, v_key, v_alias, COALESCE(v_fk_info->>'source_column', 'id')));
                    v_display_name := replace(v_key, '_id', '');
                    IF v_display_name = ANY(used_columns) THEN v_display_name := v_display_name || '_view'; END IF;
                    select_parts := array_append(select_parts, format('%I.%I AS %I', v_alias, v_display_col, v_display_name));
                    used_columns := array_append(used_columns, v_display_name);
                END IF;
            END IF;
        END LOOP;
        
        -- select_parts := array_append(select_parts, 't.search_vector');
        IF array_length(search_parts, 1) > 0 THEN
            select_parts := array_append(select_parts, 't.search_vector');
        END IF;

        IF NOT p_dry_run THEN
            EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', p_schema_name, view_name);
            EXECUTE format('CREATE VIEW %I.%I AS SELECT %s FROM %I.%I t %s', p_schema_name, view_name, array_to_string(select_parts, ', '), p_schema_name, p_table_name, array_to_string(join_parts, ' '));
        END IF;
    END IF;

    -- 6. SMART INDEXES (With GIST support)
    FOR r IN SELECT * FROM core.met_int_detect_index_patterns(p_schema_name, p_table_name, p_metadata) WHERE confidence_score >= v_threshold LOOP
        DECLARE safe_includes text[] := '{}'; col_info record; BEGIN
            -- Only validate INCLUDE columns for B-Tree indexes (GIST doesn't support INCLUDE in many versions)
            IF r.index_method = 'btree' AND array_length(r.include_columns, 1) > 0 THEN
                FOREACH v_key IN ARRAY r.include_columns LOOP
                    SELECT data_type, character_maximum_length INTO col_info FROM information_schema.columns WHERE table_schema = p_schema_name AND table_name = p_table_name AND column_name = v_key;
                    -- Bloat protection: Don't include huge text/jsonb columns in the index payload
                    IF col_info.data_type IN ('text','jsonb','bytea') OR (col_info.data_type LIKE 'character varying' AND (col_info.character_maximum_length IS NULL OR col_info.character_maximum_length > 128)) THEN
                        advisor_msgs := array_append(advisor_msgs, format('⚠️ Excluded %I from index (bloat risk)', v_key));
                    ELSE
                        safe_includes := array_append(safe_includes, v_key);
                    END IF;
                END LOOP;
            END IF;
            
            IF NOT p_dry_run THEN
                -- ✅ GIST / METHOD SUPPORT
                IF array_length(safe_includes, 1) > 0 AND r.index_method = 'btree' THEN
                    -- B-Tree with Covering columns
                    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_%s ON %I.%I USING %s (%s) INCLUDE (%s)', 
                        p_table_name, replace(r.pattern_name, ' ', '_'), p_schema_name, p_table_name, r.index_method, array_to_string(r.index_columns, ', '), array_to_string(safe_includes, ', '));
                ELSE
                    -- Standard Index (B-Tree or GIST) without INCLUDE
                    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_%s ON %I.%I USING %s (%s)', 
                        p_table_name, replace(r.pattern_name, ' ', '_'), p_schema_name, p_table_name, r.index_method, array_to_string(r.index_columns, ', '));
                END IF;
                
                advisor_msgs := array_append(advisor_msgs, format('Created %s index: %s', r.index_method, r.pattern_name));
            END IF;
        END;
    END LOOP;

    RETURN jsonb_build_object('status', 'success', 'view', full_view_name, 'dry_run', p_dry_run, 'materialized_columns', COALESCE(array_length(materialize_fields, 1), 0), 'advisor', advisor_msgs);
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_publish_schema_version
   📝 ARGUMENTS: (p_version_id uuid)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_publish_schema_version(p_version_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_draft_row core.entity_versions%ROWTYPE;
    v_entity_key text;
BEGIN
    -- 1. Fetch the Draft
    SELECT * INTO v_draft_row 
    FROM core.entity_versions 
    WHERE id = p_version_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Version not found');
    END IF;

    v_entity_key := v_draft_row.entity_schema || '.' || v_draft_row.entity_table;

    -- 2. Update the Main Entity Table (Push to Production)
    UPDATE core.entities
    SET 
        metadata = v_draft_row.data, -- Promotes the JSON to live
        updated_at = now()
    WHERE id = v_draft_row.entity_id;

    -- 3. Update Version Statuses
    -- Mark this one as Published
    UPDATE core.entity_versions 
    SET status = 'published' 
    WHERE id = p_version_id;

    -- Archive previous published versions
    UPDATE core.entity_versions 
    SET status = 'archived' 
    WHERE entity_id = v_draft_row.entity_id 
      AND id != p_version_id 
      AND status = 'published';

    -- 4. Invalidate Query Cache (Critical)
    DELETE FROM core.entity_query_cache WHERE entity_type = v_entity_key;

    RETURN jsonb_build_object(
        'status', 'published',
        'entity', v_entity_key,
        'version', v_draft_row.version_number
    );
END;
$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_save_schema_draft
   📝 ARGUMENTS: (p_entity_type text, p_entity_schema text, p_metadata jsonb, p_skip_merge boolean DEFAULT false)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_save_schema_draft(p_entity_type text, p_entity_schema text, p_metadata jsonb, p_skip_merge boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$-- DECLARE
--     v_entity_id uuid;
--     v_current_metadata jsonb;
--     v_merged_metadata jsonb;
--     v_version_num integer;
--     v_version_id uuid;
-- BEGIN
--     -- 1. Ensure entity record exists (idempotent)
--     INSERT INTO core.entities (entity_type, entity_schema, updated_at) 
--     VALUES (p_entity_type, p_entity_schema, now())
--     ON CONFLICT (entity_type, entity_schema) 
--     DO UPDATE SET updated_at = now()
--     RETURNING id, metadata INTO v_entity_id, v_current_metadata;

--     -- 2. Decide: merge or replace?
--     v_merged_metadata := 
--         CASE 
--             WHEN p_skip_merge THEN p_metadata
--             WHEN v_current_metadata IS NULL OR jsonb_typeof(v_current_metadata) != 'array'
--                 THEN p_metadata
--             ELSE core.met_util_schema_merge(p_metadata, v_current_metadata)
--         END;

--     -- 3. Insert new draft version
--     SELECT COALESCE(MAX(version_number), 0) + 1 
--     INTO v_version_num 
--     FROM core.entity_versions 
--     WHERE entity_id = v_entity_id;

--     INSERT INTO core.entity_versions (
--         organization_id,
--         entity_schema,
--         entity_table,
--         entity_id,
--         version_number,
--         data,
--         status,
--         created_at
--     ) VALUES (
--         NULL,  -- system/org-agnostic for now
--         p_entity_schema,
--         p_entity_type,
--         v_entity_id,
--         v_version_num,
--         v_merged_metadata,
--         'draft',
--         now()
--     )
--     RETURNING id INTO v_version_id;

--     RETURN jsonb_build_object(
--         'status', 'draft_saved',
--         'version_id', v_version_id,
--         'version_number', v_version_num,
--         'skip_merge_used', p_skip_merge
--     );
-- END;
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
END;$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_scan_schema_columns
   📝 ARGUMENTS: (p_table_name text, p_schema_name text DEFAULT 'public'::text, p_is_aggressive boolean DEFAULT false)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_scan_schema_columns(p_table_name text, p_schema_name text DEFAULT 'public'::text, p_is_aggressive boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'core', 'identity', 'organization', 'external', 'public'
AS $function$
DECLARE
/*
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 📘 FUNCTION: core.met_scan_schema_columns                                    ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 🎯 PURPOSE: Schema introspection with enhanced error reporting               ║
║ 🔄 VERSION: v7 (V7 → Added ltree/hierarchy support)                          ║
║ ⚡ INPUTS: table_name, schema='public', aggressive=false                     ║
║ 📊 OUTPUT: JSON array or {columns: [], warnings: []} object                  ║
║                                                                               ║
║ 🏗️  WHAT IT DETECTS:                                                         ║
║   • Physical columns (excludes generated columns)                            ║
║   • Foreign keys (explicit constraints + inferred _id columns)               ║
║   • JSONB virtual fields (100-row sample or 1% for large tables)             ║
║   • Polymorphic columns (via column comments with {polymorphic: true})       ║
║   • Semantic types: continuous, ratio, temporal, discrete, HIERARCHY         ║
║                                                                               ║
║ ⚠️  DRIVES FINALIZATION VIA:                                                 ║
║   • is_virtual + jsonb_column + is_searchable → Generated columns            ║
║   • foreign_key → View JOINs with display columns                           ║
║   • polymorphic → CASE WHEN joins for multiple targets                      ║
║   • type: "text[]" → Uses meta_jsonb_to_text_array conversion               ║
║                                                                               ║
║ 🛡️  SECURITY FILTERS:                                                       ║
║   • Excluded schemas: info_schema, pg_catalog + core.meta_config             ║
║   • Excluded tables: schema_migrations, flyway + core.meta_config            ║
║   • Schema priority: public, core, identity (configurable)                   ║
║                                                                               ║
║ 📈 SEARCHABLE LOGIC:                                                         ║
║   • Physical: name, title, email, _name columns                             ║
║   • Virtual: Leaf name detection (details.pain_points → pain_points)        ║
║   • Arrays: text[] fields ALWAYS searchable                                  ║
║                                                                               ║
║ 🎛️  AGGRESSIVE MODE:                                                        ║
║   • p_is_aggressive=true → is_mandatory=true for non-system columns         ║
║                                                                               ║
║ 🧪 TESTED: Tables, Views, JSONB fields, Arrays, Polymorphic, Enums, Ltree    ║
║ 📅 LAST UPDATED: 2025-12-01                                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝
*/
    
    -- Configuration Storage
    v_excluded_schemas TEXT[];   -- Schemas to exclude from FK inference
    v_excluded_tables  TEXT[];   -- Tables to exclude from FK inference  
    v_schema_priority  TEXT[];   -- Search order for schema inference
    
    -- Safety Nets (Always applied)
    v_safety_schemas   TEXT[] := ARRAY['information_schema', 'pg_catalog', 'pg_toast', 'zzx', 'audit', 'topology'];
    v_safety_tables    TEXT[] := ARRAY['schema_migrations', 'flyway_schema_history'];
    
    -- Table Context
    v_table_oid        OID;      -- Table OID for comment lookups
    v_estimate_rows    BIGINT;   -- Estimated rows for JSONB sampling
    is_view            BOOLEAN := FALSE;
    
    -- Column Processing
    col                RECORD;   -- Current column in loop
    result             JSONB := '[]'::JSONB;  -- Final output array
    
    -- Foreign Key Analysis
    fk_info            RECORD;   -- Foreign key constraint info
    foreign_key_info   JSONB;    -- Structured FK metadata
    potential_fk       JSONB;    -- Inferred FK from heuristics
    
    -- Semantic Analysis  
    enum_vals          TEXT[];   -- Enum values (for stage_id, etc.)
    semantic_hint      TEXT := 'nominal';
    v_is_searchable    BOOLEAN;
    v_is_mandatory     BOOLEAN;
    v_semantic_obj     JSONB;
    col_obj            JSONB;
    
    -- Polymorphic Support (via Column Comments)
    v_col_comment      TEXT;     -- Raw column comment
    v_comment_json     JSONB;    -- Parsed comment JSON
    v_polymorphic_def  JSONB;    -- Polymorphic definition
    v_poly_target      JSONB;    -- Single polymorphic target
    v_poly_targets_built JSONB[] := ARRAY[]::JSONB[];
    
    -- JSONB Virtual Field Exploration
    v_sample_jsonb     JSONB;    -- Sampled JSONB data
    v_virtual_fields   JSONB;    -- Extracted virtual fields
    v_sample_sql       TEXT;     -- Dynamic SQL for sampling
    
    -- Error & Warning Tracking
    v_warnings         TEXT[] := '{}';  -- Collection of warnings
    v_error_message    TEXT;            -- Temporary error storage
    
    -- Helper Variables
    v_leaf_name        TEXT;      -- For enhanced searchable logic
    v_base_name        TEXT;      -- For enum detection

BEGIN
    -- ▼▼▼ 1. LOAD CONFIGURATION FROM CORE.META_CONFIG ▼▼▼
    
    -- A. Excluded Schemas (DB Config + Safety Net)
    SELECT COALESCE(
        (SELECT array_agg(x) FROM jsonb_array_elements_text(config_value) t(x)),
        '{}'::text[]
    ) || v_safety_schemas
    INTO v_excluded_schemas
    FROM core.meta_config WHERE config_key = 'introspect_schema_exclude';
    IF v_excluded_schemas IS NULL THEN v_excluded_schemas := v_safety_schemas; END IF;

    -- B. Excluded Tables
    SELECT COALESCE(
        (SELECT array_agg(x) FROM jsonb_array_elements_text(config_value) t(x)),
        '{}'::text[]
    ) || v_safety_tables
    INTO v_excluded_tables
    FROM core.meta_config WHERE config_key = 'introspect_table_exclude';
    IF v_excluded_tables IS NULL THEN v_excluded_tables := v_safety_tables; END IF;

    -- C. Schema Priority (For FK Inference)
    SELECT COALESCE(
        (SELECT array_agg(x) FROM jsonb_array_elements_text(config_value) t(x)),
        ARRAY['public', 'core', 'identity']::text[]
    ) INTO v_schema_priority
    FROM core.meta_config WHERE config_key = 'introspect_schema_priority';
    IF v_schema_priority IS NULL THEN v_schema_priority := ARRAY['public', 'core', 'identity']; END IF;

    -- ▼▼▼ 2. ESTABLISH TABLE CONTEXT ▼▼▼
    
    -- Get table OID and row estimate (for JSONB sampling strategy)
    SELECT c.oid, reltuples::BIGINT INTO v_table_oid, v_estimate_rows 
    FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE n.nspname = p_schema_name AND c.relname = p_table_name;
    
    -- Check if it's a view
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = p_table_name AND table_schema = p_schema_name
    ) INTO is_view;
    
    IF is_view THEN 
        v_estimate_rows := 0;  -- Views: assume small or scan normally
    END IF;

    -- ▼▼▼ 3. MAIN COLUMN PROCESSING LOOP ▼▼▼
    
    FOR col IN
        SELECT 
            c.column_name,
            c.data_type AS physical_type,
            c.udt_name,
            c.is_nullable,
            c.ordinal_position
        FROM information_schema.columns c
        WHERE c.table_name = p_table_name 
          AND c.table_schema = p_schema_name 
          AND c.is_generated = 'NEVER'  -- ✅ Ignore generated columns
        ORDER BY c.ordinal_position  -- ✅ Respect physical column order
    LOOP
        -- Reset per-iteration variables
        foreign_key_info := NULL;
        potential_fk := NULL;
        enum_vals := NULL;
        semantic_hint := 'nominal';
        v_polymorphic_def := NULL;
        v_poly_targets_built := ARRAY[]::JSONB[];

        -- =========================================================
        -- 🌟 STEP 0: CHECK FOR EXPLICIT POLYMORPHIC COLUMN COMMENTS
        -- =========================================================
        
        -- Get column comment (if any)
        v_col_comment := col_description(v_table_oid, col.ordinal_position);
        
        BEGIN
            IF v_col_comment IS NOT NULL AND left(trim(v_col_comment), 1) = '{' THEN
                v_comment_json := v_col_comment::jsonb;
                
                -- Check for polymorphic definition
                IF v_comment_json ? 'polymorphic' AND (v_comment_json->>'polymorphic')::boolean = true THEN
                    -- 🎯 EARLY POLYMORPHIC DETECTION: Skip standard semantic inference
                    semantic_hint := 'nominal';
                    
                    -- Build polymorphic targets array
                    FOR v_poly_target IN SELECT * FROM jsonb_array_elements(v_comment_json->'targets')
                    LOOP
                        v_poly_targets_built := array_append(v_poly_targets_built, jsonb_build_object(
                            'key', v_poly_target->>'value',
                            'type', 'uuid',
                            'is_virtual', false,
                            'is_template', true,
                            'is_mandatory', true,
                            'is_searchable', false,
                            'is_displayable', true,
                            'display_name', COALESCE(v_poly_target->>'natural_name', initcap(v_poly_target->>'value')),
                            'foreign_key', jsonb_build_object(
                                'reason', 'polymorphic target',
                                'confidence', 'explicit',
                                'source_table', v_poly_target->>'table',
                                'source_column', COALESCE(v_poly_target->>'pk', 'id'),
                                'display_column', COALESCE(v_poly_target->>'display', 'name')
                            ),
                            'semantic_type', jsonb_build_object(
                                'role', 'dimension',
                                'sub_type', 'discrete',
                                'default_aggregation', 'count',
                                'keyword', false,
                                'order', '[]'::jsonb
                            )
                        ));
                    END LOOP;

                    -- Construct polymorphic definition object
                    v_polymorphic_def := jsonb_build_object(
                        'type_column', col.column_name,
                        'id_column', COALESCE(v_comment_json->>'id_column', 'id'),
                        'targets', v_poly_targets_built
                    );
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Malformed JSON comment - log warning but continue
            v_warnings := array_append(v_warnings, 
                format('Column "%s": Invalid JSON comment - %s', col.column_name, SQLERRM));
        END;

        -- =========================================================
        -- 🌟 STEP 1: STANDARD SEMANTIC INFERENCE (SKIP IF POLYMORPHIC)
        -- =========================================================
        
        IF v_polymorphic_def IS NULL THEN
            -- Only run semantic inference if not polymorphic
            IF col.column_name ILIKE ANY(ARRAY['%amount%', '%price%', '%cost%', '%revenue%']) THEN 
                semantic_hint := 'continuous';
            ELSIF col.column_name ILIKE ANY(ARRAY['%prob%', 'score', '%ratio%', '%percent%']) THEN 
                semantic_hint := 'ratio';
            ELSIF col.physical_type IN ('date', 'timestamp', 'timestamp with time zone') THEN 
                semantic_hint := 'temporal';
            ELSIF col.physical_type = 'uuid' OR col.column_name ILIKE '%_id' THEN 
                semantic_hint := 'discrete';
            -- ✅ LTREE SUPPORT ADDED HERE
            ELSIF col.udt_name = 'ltree' THEN 
                semantic_hint := 'hierarchy';
            END IF;
        END IF;

        -- =========================================================
        -- 🌟 STEP 2: EXPLICIT FOREIGN KEY CONSTRAINTS
        -- =========================================================
        
        -- Skip FK detection for views and polymorphic columns
        IF NOT is_view AND v_polymorphic_def IS NULL THEN
            FOR fk_info IN
                SELECT 
                    ccu.table_schema, 
                    ccu.table_name, 
                    ccu.column_name,
                    -- Find best display column
                    (SELECT c2.column_name 
                     FROM information_schema.columns c2 
                     WHERE c2.table_schema = ccu.table_schema 
                       AND c2.table_name = ccu.table_name 
                       AND c2.column_name IN (
                           'display_id', 'name', 'title', 'label', 'display_name', 
                           'code', 'slug', 'email', 'username', 'subject', 
                           'value', 'description'
                       )
                     ORDER BY 
                         CASE 
                             WHEN c2.column_name = 'display_id' THEN 1
                             WHEN c2.column_name = 'name' THEN 2
                             WHEN c2.column_name = 'title' THEN 3
                             WHEN c2.column_name = 'label' THEN 4
                             WHEN c2.column_name = 'display_name' THEN 5
                             WHEN c2.column_name = 'code' THEN 6
                             WHEN c2.column_name = 'slug' THEN 7
                             WHEN c2.column_name = 'email' THEN 8
                             WHEN c2.column_name = 'username' THEN 9
                             WHEN c2.column_name = 'subject' THEN 10
                             WHEN c2.column_name = 'value' THEN 11
                             WHEN c2.column_name = 'description' THEN 12
                             ELSE 99 
                         END 
                     LIMIT 1) AS display_col
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_schema = kcu.constraint_schema 
                   AND tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu 
                    ON tc.constraint_schema = ccu.constraint_schema 
                   AND tc.constraint_name = ccu.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                  AND tc.table_schema = p_schema_name 
                  AND tc.table_name = p_table_name 
                  AND kcu.column_name = col.column_name
            LOOP
                -- Security check: exclude forbidden schemas/tables
                IF fk_info.table_schema = ANY(v_excluded_schemas) 
                   OR fk_info.table_name = ANY(v_excluded_tables) 
                THEN 
                    CONTINUE; 
                END IF;
                
                foreign_key_info := jsonb_build_object(
                    'source_table', format('%I.%I', fk_info.table_schema, fk_info.table_name), 
                    'source_column', fk_info.column_name, 
                    'display_column', COALESCE(fk_info.display_col, 'id'), 
                    'confidence', 'high', 
                    'reason', 'foreign key constraint'
                );
                EXIT; -- Take first valid FK found
            END LOOP;
        END IF;

        -- =========================================================
        -- 🌟 STEP 3: SPECIAL CASES (Blueprint Stages, Enums)
        -- =========================================================
        
        -- A. Blueprint Stage Detection
        IF col.column_name = 'stage_id' AND col.physical_type = 'text' THEN
            DECLARE 
                v_blueprint RECORD;
            BEGIN
                SELECT * INTO v_blueprint FROM core.met_int_detect_blueprint_stages(p_table_name);
                IF v_blueprint.has_stages THEN
                    enum_vals := v_blueprint.stage_order; 
                    semantic_hint := 'ordinal';
                END IF;
            END;
        END IF;

        -- B. Enum Table Detection (Dynamic from organization.enums)
        IF col.column_name LIKE '%_id' 
           AND col.physical_type = 'uuid' 
           AND foreign_key_info IS NULL 
           AND v_polymorphic_def IS NULL 
        THEN
            v_base_name := replace(col.column_name, '_id', '');
            
            DECLARE
                valid_enum_types text[];
            BEGIN
                SELECT array_agg(DISTINCT value_type) INTO valid_enum_types
                FROM organization.enums;
                
                IF v_base_name = ANY(COALESCE(valid_enum_types, '{}'::text[])) THEN
                    foreign_key_info := jsonb_build_object(
                        'source_table', 'organization.enums',
                        'source_column', 'id', 
                        'display_column', 'value',
                        'confidence', 'medium', 
                        'reason', format('dynamic enum lookup: %s', v_base_name)
                    );
                END IF;
            END;
        END IF;

        -- =========================================================
        -- 🌟 STEP 4: IMPLICIT FOREIGN KEY INFERENCE
        -- =========================================================
        
        -- Only infer if no explicit FK and not polymorphic
        IF col.column_name != 'id' 
           AND foreign_key_info IS NULL 
           AND v_polymorphic_def IS NULL 
        THEN
            IF col.physical_type = 'uuid' OR (col.physical_type = 'text' AND col.column_name ILIKE '%_id') THEN
                potential_fk := core.met_int_infer_potential_fk(
                    col.column_name, 
                    v_excluded_schemas, 
                    v_excluded_tables, 
                    v_schema_priority, 
                    p_schema_name
                );
            END IF;
        END IF;

        -- =========================================================
        -- 🌟 STEP 5: BUSINESS LOGIC FLAGS
        -- =========================================================
        
        -- A. Enhanced Searchable Logic
        v_is_searchable := col.column_name IN (
            'display_id', 'name', 'title', 'label', 'display_name', 
            'code', 'slug', 'email', 'username', 'subject', 'description'
        ) OR col.column_name LIKE '%_name%';
        
        -- B. Semantic Type Construction
        v_semantic_obj := core.met_int_construct_semantic_type(
            lower(col.physical_type), 
            semantic_hint, 
            enum_vals
        );
        
        -- C. Mark polymorphic columns as keyword type
        IF v_polymorphic_def IS NOT NULL THEN
            v_semantic_obj := jsonb_set(v_semantic_obj, '{keyword}', 'true');
        END IF;
        
        -- D. Mandatory Logic (DB constraints + aggressive mode)
        v_is_mandatory := (col.is_nullable = 'NO') 
            OR (p_is_aggressive 
                AND (v_is_searchable 
                     OR col.column_name NOT IN ('id', 'created_at', 'updated_at', 'details')
                )
            );

        -- =========================================================
        -- 🌟 STEP 6: BUILD COLUMN OBJECT
        -- =========================================================
        
        col_obj := jsonb_build_object(
            'key', col.column_name,
            -- ✅ LTREE FIX: Explicitly handle ltree type
            'type', CASE 
                WHEN col.physical_type = 'ARRAY' THEN lower(ltrim(col.udt_name, '_')) || '[]'
                WHEN col.physical_type = 'timestamp with time zone' THEN 'timestamptz'
                WHEN col.udt_name = 'ltree' THEN 'ltree'
                ELSE lower(col.physical_type)
            END,
            'display_name', initcap(replace(col.column_name, '_', ' ')),
            'is_displayable', true,
            'is_searchable', v_is_searchable,
            'is_mandatory', v_is_mandatory,
            'is_template', true,
            'is_virtual', false,
            'foreign_key', COALESCE(foreign_key_info, potential_fk, NULL::jsonb),
            'semantic_type', v_semantic_obj
        );
        
        -- Add polymorphic definition if present
        IF v_polymorphic_def IS NOT NULL THEN
            col_obj := col_obj || jsonb_build_object('polymorphic', v_polymorphic_def);
        END IF;

        -- =========================================================
        -- 🌟 STEP 7: JSONB DEEP EXPLORATION (With Error Reporting)
        -- =========================================================
        
        IF col.physical_type = 'jsonb' THEN
            BEGIN
                -- Choose sampling strategy based on table size
                IF NOT is_view AND v_estimate_rows > 100000 THEN
                    v_sample_sql := format(
                        'SELECT core.met_int_jsonb_merge_agg(%I) ' ||
                        'FROM %I.%I TABLESAMPLE SYSTEM(1) ' ||
                        'WHERE %I IS NOT NULL LIMIT 100',
                        col.column_name, p_schema_name, p_table_name, col.column_name
                    );
                ELSE
                    v_sample_sql := format(
                        'SELECT core.met_int_jsonb_merge_agg(%I) ' ||
                        'FROM %I.%I WHERE %I IS NOT NULL LIMIT 100',
                        col.column_name, p_schema_name, p_table_name, col.column_name
                    );
                END IF;
                
                -- Execute sampling
                EXECUTE v_sample_sql INTO v_sample_jsonb;
                
                -- Only proceed if we have valid sample data
                IF v_sample_jsonb IS NOT NULL AND v_sample_jsonb != '{}'::jsonb THEN
                    -- Explore JSONB structure
                    IF jsonb_typeof(v_sample_jsonb) = 'array' THEN
                        v_virtual_fields := core.met_int_explore_columns_array(
                            v_sample_jsonb, 
                            col.column_name || '.', 
                            0
                        );
                    ELSE
                        v_virtual_fields := core.met_int_explore_columns_object(
                            v_sample_jsonb, 
                            col.column_name || '.', 
                            0
                        );
                    END IF;

                    -- Process virtual fields if exploration returned data
                    IF v_virtual_fields IS NOT NULL AND v_virtual_fields != '[]'::jsonb THEN
                        IF jsonb_typeof(v_sample_jsonb) = 'array' THEN
                            SELECT jsonb_agg(jsonb_build_object(
                                -- 'key', v->>'key', 
                                'key', replace(v->>'key', '.', '__'),
                                'type', v->>'physical_type', 
                                'display_name', v->>'display_name_hint',
                                'is_displayable', true, 
                                'is_searchable', 
                                    CASE 
                                        -- Array fields are searchable by default
                                        WHEN v->>'physical_type' = 'text[]' THEN true
                                        -- For dotted paths, check leaf name only
                                        WHEN (v->>'key') LIKE '%.%' THEN
                                            (split_part(v->>'key', '.', -1) IN (
                                                'name', 'title', 'label', 'code', 'email', 'display_id'
                                            ) OR split_part(v->>'key', '.', -1) LIKE '%name%')
                                        -- Fallback to original logic
                                        ELSE (v->>'key' IN (
                                            'display_id', 'name', 'title', 'label', 'display_name', 
                                            'code', 'slug', 'email', 'username', 'subject', 'description'
                                        ) OR v->>'key' LIKE '%_name%')
                                    END,
                                'is_virtual', true,
                                'jsonb_column', col.column_name, 
                                'is_mandatory', p_is_aggressive, 
                                'is_template', true,
                                'foreign_key', NULL::jsonb,
                                'semantic_type', core.met_int_construct_semantic_type(
                                    v->>'physical_type', 
                                    v->>'semantic_hint'
                                )
                            )) INTO v_virtual_fields 
                            FROM jsonb_array_elements(v_virtual_fields) t(v);
                        ELSE
                            SELECT jsonb_agg(jsonb_build_object(
                                -- 'key', v->>'key', 
                                'key', replace(v->>'key', '.', '__'),
                                'type', v->>'physical_type',
                                'display_name', initcap(
                                    split_part(v->>'key', '.', 
                                    array_length(string_to_array(v->>'key', '.'), 1))
                                ),
                                'is_displayable', true, 
                                'is_searchable', 
                                    CASE 
                                        -- Array fields are searchable by default
                                        WHEN v->>'physical_type' = 'text[]' THEN true
                                        -- For dotted paths, check leaf name only
                                        WHEN (v->>'key') LIKE '%.%' THEN
                                            (split_part(v->>'key', '.', -1) IN (
                                                'name', 'title', 'label', 'code', 'email', 'display_id'
                                            ) OR split_part(v->>'key', '.', -1) LIKE '%name%')
                                        -- Fallback to original logic
                                        ELSE (v->>'key' IN (
                                            'display_id', 'name', 'title', 'label', 'display_name', 
                                            'code', 'slug', 'email', 'username', 'subject', 'description'
                                        ) OR v->>'key' LIKE '%_name%')
                                    END,
                                'is_virtual', true,
                                'jsonb_column', col.column_name, 
                                'is_mandatory', p_is_aggressive, 
                                'is_template', true,
                                'foreign_key', 
                                    CASE 
                                        WHEN (v->>'key') ILIKE '%_id' THEN 
                                            core.met_int_infer_potential_fk(
                                                (v->>'key')::text, 
                                                v_excluded_schemas, 
                                                v_excluded_tables, 
                                                v_schema_priority, 
                                                p_schema_name
                                            ) 
                                        ELSE NULL::jsonb 
                                    END,
                                'semantic_type', core.met_int_construct_semantic_type(
                                    v->>'physical_type', 
                                    v->>'semantic_hint'
                                )
                            )) INTO v_virtual_fields 
                            FROM jsonb_array_elements(v_virtual_fields) t(v);
                        END IF;

                        -- Add virtual fields to result
                        IF v_virtual_fields IS NOT NULL THEN 
                            result := result || v_virtual_fields; 
                        END IF;
                    END IF;
                END IF;

            EXCEPTION WHEN OTHERS THEN
                -- 🆕 V6: Report JSONB exploration errors in metadata
                v_error_message := format(
                    'JSONB exploration failed for column "%s": %s', 
                    col.column_name, SQLERRM
                );
                
                -- Add to warnings array
                v_warnings := array_append(v_warnings, v_error_message);
                
                -- Add error object to result for UI visibility
                result := result || jsonb_build_array(jsonb_build_object(
                    'key', col.column_name || '_jsonb_error',
                    'type', 'text',
                    'display_name', '⚠️ JSONB Exploration Error',
                    'description', v_error_message,
                    'is_virtual', true,
                    'is_displayable', false,
                    'is_searchable', false,
                    'is_template', false,
                    'error', true,
                    'source_column', col.column_name
                ));
            END;
        END IF;

        -- Add the main column object to result
        result := result || jsonb_build_array(col_obj);
    END LOOP;  -- End column loop

    -- =========================================================
    -- 🌟 STEP 8: ADD WARNINGS TO FINAL OUTPUT (Optional)
    -- =========================================================
    
    -- Check if we have warnings or if we should return object format
    IF array_length(v_warnings, 1) > 0 THEN
        -- Return object format with warnings
        RETURN jsonb_build_object(
            'columns', result,
            'warnings', array_to_json(v_warnings)::jsonb,
            'generated_at', now()::text,
            'version', 'v6',
            'metadata_format', 'enhanced'
        );
    ELSE
        -- Return simple array for backward compatibility with v4
        RETURN result;
    END IF;
    
END;
$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_util_cast_jsonb_array
   📝 ARGUMENTS: (p_jsonb jsonb)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_util_cast_jsonb_array(p_jsonb jsonb)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$SELECT ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_jsonb, '[]'::jsonb)));$function$



/* ═══════════════════════════════════════════════════════
   👤 OBJECT: core.met_util_schema_merge
   📝 ARGUMENTS: (p_fresh_schema jsonb, p_existing_schema jsonb)
   ⚙️ TYPE: FUNCTION
   ═══════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.met_util_schema_merge(p_fresh_schema jsonb, p_existing_schema jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$DECLARE

-- In this architecture, there are two distinct types of Synchronization happening. It is crucial not to confuse them.Sync Type A: The "Metadata Merge" (Soft Sync)Where: Inside core.meta_schema_merge (Function above).What: Syncs Physical Reality (DB Columns) with Business Intent (User Rename/Rules).Goal: To ensure that when you refresh the schema, you don't overwrite the fact that the user renamed "amount" to "Deal Value".Result: A JSON blob stored in core.entity_versions.Sync Type B: The "Drift Detection" (Hard Sync)Where: Inside core.meta_finalize_entity_v3 (The Optimize Function).What: Syncs Approved Metadata with the Physical Table Structure.Goal: To ensure that if the Metadata says details.notes exists, the Postgres table physically has a generated column for it.Result: ALTER TABLE commands (ADD/DROP column) and CREATE INDEX.Summary of the Complete WorkflowIntrospect (Fresh Scan): Database $\to$ JSON.Merge (Sync Type A): Fresh JSON + Old JSON $\to$ Draft Version.Publish: Draft Version $\to$ Live Metadata.Optimize (Sync Type B): Live Metadata $\to$ Physical Table Changes.
--     v_result jsonb := '[]'::jsonb;
--     v_fresh_col jsonb;
--     v_exist_col jsonb;
--     v_merged_col jsonb;
--     v_key text;
    
--     -- Helpers to extract FK data safely regardless of naming convention (Legacy support)
--     v_exist_fk jsonb;
--     v_fresh_fk jsonb;
-- BEGIN
--     -- 1. If no existing metadata, return fresh scan immediately
--     IF p_existing_schema IS NULL OR jsonb_array_length(p_existing_schema) = 0 THEN
--         RETURN p_fresh_schema;
--     END IF;

--     -- 2. Loop through FRESH schema (The Source of Truth for Structure)
--     FOR v_fresh_col IN SELECT * FROM jsonb_array_elements(p_fresh_schema)
--     LOOP
--         v_key := v_fresh_col->>'key';
        
--         -- Find corresponding column in EXISTING metadata
--         SELECT item INTO v_exist_col
--         FROM jsonb_array_elements(p_existing_schema) item
--         WHERE item->>'key' = v_key
--         LIMIT 1;

--         IF v_exist_col IS NOT NULL THEN
--             -- Handle Legacy Key Migration (potential_fk -> foreign_key)
--             v_exist_fk := COALESCE(v_exist_col->'foreign_key', v_exist_col->'potential_fk');
--             v_fresh_fk := v_fresh_col->'foreign_key';

--             -- ✅ SMART MERGE LOGIC
--             v_merged_col := v_fresh_col || jsonb_build_object(
--                 -- Preserve User's Display Name overrides
--                 'display_name', COALESCE(v_exist_col->>'display_name', v_fresh_col->>'display_name'),
                
--                 -- Preserve User's "Is Searchable" toggle
--                 'is_searchable', COALESCE((v_exist_col->>'is_searchable')::boolean, (v_fresh_col->>'is_searchable')::boolean),
                
--                 -- Preserve User's "Is Mandatory" toggle
--                 'is_mandatory', COALESCE((v_exist_col->>'is_mandatory')::boolean, (v_fresh_col->>'is_mandatory')::boolean),
                
--                 -- FK Logic: Use Existing if it has a concrete 'source_table', otherwise use Fresh inference
--                 'foreign_key', CASE 
--                     WHEN v_exist_fk IS NOT NULL AND (v_exist_fk->>'source_table') IS NOT NULL 
--                     THEN v_exist_fk
--                     ELSE v_fresh_fk
--                 END
--             );
--         ELSE
--             -- New Column found in DB? Take it as is.
--             v_merged_col := v_fresh_col;
--         END IF;

--         v_result := v_result || jsonb_build_array(v_merged_col);
--     END LOOP;

--     RETURN v_result;
-- END;
v_result jsonb := '[]'::jsonb;
    v_fresh_arr jsonb;
    v_exist_arr jsonb;
    v_fresh_col jsonb;
    v_exist_col jsonb;
    v_merged_col jsonb;
    v_key text;
    v_exist_fk jsonb;
    v_fresh_fk jsonb;
BEGIN
    -- 🛡️ ROOT FIX: Normalize inputs to Arrays (Handle V6 Object format)
    IF p_fresh_schema ? 'columns' THEN v_fresh_arr := p_fresh_schema -> 'columns'; ELSE v_fresh_arr := p_fresh_schema; END IF;
    IF p_existing_schema ? 'columns' THEN v_exist_arr := p_existing_schema -> 'columns'; ELSE v_exist_arr := p_existing_schema; END IF;

    -- If no existing metadata, return fresh scan immediately
    IF v_exist_arr IS NULL OR jsonb_typeof(v_exist_arr) != 'array' OR jsonb_array_length(v_exist_arr) = 0 THEN
        RETURN v_fresh_arr;
    END IF;

    -- Loop through FRESH schema (The Source of Truth for Structure)
    FOR v_fresh_col IN SELECT * FROM jsonb_array_elements(v_fresh_arr)
    LOOP
        v_key := v_fresh_col->>'key';
        
        -- Find corresponding column in EXISTING metadata
        SELECT item INTO v_exist_col FROM jsonb_array_elements(v_exist_arr) item WHERE item->>'key' = v_key LIMIT 1;

        IF v_exist_col IS NOT NULL THEN
            -- Handle Legacy Key Migration (potential_fk -> foreign_key)
            v_exist_fk := COALESCE(v_exist_col->'foreign_key', v_exist_col->'potential_fk');
            v_fresh_fk := v_fresh_col->'foreign_key';

            -- ✅ SMART MERGE LOGIC
            v_merged_col := v_fresh_col || jsonb_build_object(
                'display_name', COALESCE(v_exist_col->>'display_name', v_fresh_col->>'display_name'),
                'is_searchable', COALESCE((v_exist_col->>'is_searchable')::boolean, (v_fresh_col->>'is_searchable')::boolean),
                'is_mandatory', COALESCE((v_exist_col->>'is_mandatory')::boolean, (v_fresh_col->>'is_mandatory')::boolean),
                'foreign_key', CASE 
                    WHEN v_exist_fk IS NOT NULL AND (v_exist_fk->>'source_table') IS NOT NULL 
                    THEN v_exist_fk
                    ELSE v_fresh_fk
                END
            );
        ELSE
            -- New Column found in DB? Take it as is.
            v_merged_col := v_fresh_col;
        END IF;
        v_result := v_result || jsonb_build_array(v_merged_col);
    END LOOP;

    -- Return in original format if needed (preserve warnings wrapper if present)
    IF p_fresh_schema ? 'columns' THEN
        RETURN p_fresh_schema || jsonb_build_object('columns', v_result);
    ELSE
        RETURN v_result;
    END IF;
END;$function$
