/* ═══════════════════════════════════════════════════════════════════════════════
   📘 FUNCTION: core.view_suggest_configs
   📝 PURPOSE: Main orchestrator to generate all view configurations for an entity
   🔄 VERSION: v1.0
   📅 CREATED: 2025-12-11
   ═══════════════════════════════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.view_suggest_configs(
    p_entity_id UUID,
    p_dry_run BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $function$
/*
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 🎯 PURPOSE: Generate all view configurations for an entity                   ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ ⚡ INPUTS:                                                                    ║
║   • p_entity_id: UUID of the entity in core.entities                         ║
║   • p_dry_run: If TRUE, returns suggestions without persisting (default)     ║
║                                                                               ║
║ 📊 OUTPUT: JSONB object with all view configurations:                        ║
║   {                                                                           ║
║     "general": {default_view, available_views},                              ║
║     "tableview": {...},                                                      ║
║     "gridview": {...},                                                       ║
║     "kanbanview": {...} or null,                                             ║
║     "detailview": {...},                                                     ║
║     "calendarview": {...} or null,                                           ║
║     "mapview": {...} or null,                                                ║
║     "metricsview": {...},                                                    ║
║     "_meta": {generated_at, applicable_views}                                ║
║   }                                                                           ║
║                                                                               ║
║ 🏗️  ORCHESTRATION:                                                           ║
║   1. Fetch entity metadata from core.entities                                ║
║   2. Call each view helper function                                          ║
║   3. Determine applicable views and default                                  ║
║   4. If dry_run=FALSE, persist to core.view_configs                          ║
║                                                                               ║
║ 📈 DEPENDENCIES:                                                             ║
║   • core.view_int_suggest_tableview                                          ║
║   • core.view_int_suggest_gridview                                           ║
║   • core.view_int_suggest_detailview                                         ║
║   • core.view_int_suggest_kanbanview                                         ║
║   • core.view_int_suggest_calendarview                                       ║
║   • core.view_int_suggest_mapview                                            ║
║   • core.view_int_suggest_metricsview                                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
*/
DECLARE
    v_entity RECORD;
    v_entity_metadata JSONB;  -- Renamed to avoid ambiguity with column name
    v_result JSONB := '{}'::JSONB;
    v_available_views TEXT[] := ARRAY[]::TEXT[];
    v_default_view TEXT := 'tableview';
    
    -- View configurations
    v_tableview JSONB;
    v_gridview JSONB;
    v_kanbanview JSONB;
    v_detailview JSONB;
    v_calendarview JSONB;
    v_mapview JSONB;
    v_metricsview JSONB;
BEGIN
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 1: Fetch entity and metadata
    -- ═══════════════════════════════════════════════════════════════════════════
    
    -- Use table alias 'e' to avoid ambiguity between column and variable names
    SELECT e.id, e.entity_type, e.entity_schema, e.v_metadata, e.metadata
    INTO v_entity
    FROM core.entities e
    WHERE e.id = p_entity_id;
    
    IF v_entity IS NULL THEN
        RAISE EXCEPTION 'Entity not found: %', p_entity_id;
    END IF;
    
    -- Prefer v_metadata, fallback to metadata if v_metadata is null or empty
    v_entity_metadata := v_entity.v_metadata;
    
    IF v_entity_metadata IS NULL OR jsonb_array_length(v_entity_metadata) = 0 THEN
        -- Fallback to metadata column
        v_entity_metadata := v_entity.metadata;
    END IF;
    
    IF v_entity_metadata IS NULL OR jsonb_array_length(v_entity_metadata) = 0 THEN
        RAISE EXCEPTION 'Entity % has no metadata (neither v_metadata nor metadata column)', p_entity_id;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 2: Generate all view configurations
    -- ═══════════════════════════════════════════════════════════════════════════
    
    -- TableView (always generated)
    v_tableview := core.view_int_suggest_tableview(v_entity_metadata, 10);
    v_available_views := array_append(v_available_views, 'tableview');
    
    -- GridView (always generated)
    v_gridview := core.view_int_suggest_gridview(v_entity_metadata);
    v_available_views := array_append(v_available_views, 'gridview');
    
    -- DetailView (always generated)
    v_detailview := core.view_int_suggest_detailview(v_entity_metadata);
    v_available_views := array_append(v_available_views, 'detailview');
    
    -- KanbanView (conditional - needs stage_id or blueprint)
    v_kanbanview := core.view_int_suggest_kanbanview(v_entity_metadata, v_entity.entity_type, v_entity.entity_schema);
    IF v_kanbanview IS NOT NULL THEN
        v_available_views := array_append(v_available_views, 'kanbanview');
    END IF;
    
    -- CalendarView (conditional - needs temporal fields)
    v_calendarview := core.view_int_suggest_calendarview(v_entity_metadata);
    IF v_calendarview IS NOT NULL THEN
        v_available_views := array_append(v_available_views, 'calendarview');
    END IF;
    
    -- MapView (conditional - needs geo fields)
    v_mapview := core.view_int_suggest_mapview(v_entity_metadata);
    IF v_mapview IS NOT NULL THEN
        v_available_views := array_append(v_available_views, 'mapview');
    END IF;
    
    -- MetricsView (always generated, may be empty)
    v_metricsview := core.view_int_suggest_metricsview(v_entity_metadata);
    IF jsonb_array_length(v_metricsview->'measures') > 0 
       OR jsonb_array_length(v_metricsview->'dimensions') > 0 THEN
        v_available_views := array_append(v_available_views, 'metricsview');
    END IF;
    
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 3: Determine default view
    -- ═══════════════════════════════════════════════════════════════════════════
    
    -- Default to tableview, but prefer kanban if entity has stages
    IF 'kanbanview' = ANY(v_available_views) THEN
        v_default_view := 'kanbanview';
    ELSIF 'calendarview' = ANY(v_available_views) THEN
        v_default_view := 'tableview';  -- Calendar entities still default to table
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 4: Build result object
    -- ═══════════════════════════════════════════════════════════════════════════
    
    v_result := jsonb_build_object(
        'general', jsonb_build_object(
            'default_view', v_default_view,
            'available_views', to_jsonb(v_available_views)
        ),
        'tableview', v_tableview,
        'gridview', v_gridview,
        'kanbanview', v_kanbanview,
        'detailview', v_detailview,
        'calendarview', v_calendarview,
        'ganttview', NULL,  -- Not implemented yet
        'mapview', v_mapview,
        'dashboardview', NULL,  -- Not implemented yet
        'metricsview', v_metricsview,
        '_meta', jsonb_build_object(
            'generated_at', now()::TEXT,
            'entity_id', p_entity_id,
            'entity_type', v_entity.entity_type,
            'entity_schema', v_entity.entity_schema,
            'applicable_views', to_jsonb(v_available_views),
            'generator_version', '1.0',
            'is_dry_run', p_dry_run
        )
    );
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 5: Persist if not dry run
    -- ═══════════════════════════════════════════════════════════════════════════
    
    IF NOT p_dry_run THEN
        INSERT INTO core.view_configs (
            entity_id,
            entity_type,
            general,
            tableview,
            gridview,
            kanbanview,
            detailview,
            calendarview,
            ganttview,
            mapview,
            dashboardview,
            metricsview,
            created_at,
            updated_at
        ) VALUES (
            p_entity_id,
            v_entity.entity_schema || '.' || v_entity.entity_type,
            v_result->'general',
            v_tableview,
            v_gridview,
            v_kanbanview,
            v_detailview,
            v_calendarview,
            NULL,
            v_mapview,
            NULL,
            v_metricsview,
            now(),
            now()
        )
        ON CONFLICT (entity_id) DO UPDATE SET
            general = EXCLUDED.general,
            tableview = EXCLUDED.tableview,
            gridview = EXCLUDED.gridview,
            kanbanview = EXCLUDED.kanbanview,
            detailview = EXCLUDED.detailview,
            calendarview = EXCLUDED.calendarview,
            mapview = EXCLUDED.mapview,
            metricsview = EXCLUDED.metricsview,
            updated_at = now();
        
        -- Update meta to indicate persistence
        v_result := jsonb_set(v_result, '{_meta,persisted}', 'true'::JSONB);
        v_result := jsonb_set(v_result, '{_meta,is_dry_run}', 'false'::JSONB);
    END IF;
    
    RETURN v_result;
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🧪 TEST CASES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Test 1: Dry run with mock entity (uses actual entity if available)
DO $$
DECLARE
    v_test_entity_id UUID;
    v_result JSONB;
BEGIN
    -- Try to find a real entity
    SELECT id INTO v_test_entity_id
    FROM core.entities
    WHERE v_metadata IS NOT NULL 
      AND jsonb_array_length(v_metadata) > 0
    LIMIT 1;
    
    IF v_test_entity_id IS NOT NULL THEN
        v_result := core.view_suggest_configs(v_test_entity_id, TRUE);
        
        ASSERT v_result IS NOT NULL, 'Should return result';
        ASSERT v_result->'general' IS NOT NULL, 'Should have general config';
        ASSERT v_result->'tableview' IS NOT NULL, 'Should have tableview';
        ASSERT v_result->'gridview' IS NOT NULL, 'Should have gridview';
        ASSERT v_result->'detailview' IS NOT NULL, 'Should have detailview';
        ASSERT (v_result->'_meta'->>'is_dry_run')::BOOLEAN = TRUE, 'Should be marked as dry run';
        
        RAISE NOTICE '✅ Test 1 PASSED: Dry run execution';
        RAISE NOTICE 'Available views: %', v_result->'general'->'available_views';
    ELSE
        RAISE NOTICE '⚠️ Test 1 SKIPPED: No entity with metadata found';
    END IF;
END;
$$;

-- Test 2: Verify available_views detection
DO $$
DECLARE
    v_test_entity_id UUID;
    v_result JSONB;
    v_available_views TEXT[];
BEGIN
    -- Find entity with stage_id for kanban
    SELECT e.id INTO v_test_entity_id
    FROM core.entities e
    WHERE e.v_metadata IS NOT NULL
      AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(e.v_metadata) f 
          WHERE f->>'key' = 'stage_id'
      )
    LIMIT 1;
    
    IF v_test_entity_id IS NOT NULL THEN
        v_result := core.view_suggest_configs(v_test_entity_id, TRUE);
        
        SELECT array_agg(v::TEXT) INTO v_available_views
        FROM jsonb_array_elements_text(v_result->'general'->'available_views') v;
        
        ASSERT 'kanbanview' = ANY(v_available_views), 'Kanban should be available for staged entity';
        ASSERT (v_result->'general'->>'default_view') = 'kanbanview', 'Default should be kanban for staged entity';
        
        RAISE NOTICE '✅ Test 2 PASSED: Staged entity detection';
    ELSE
        RAISE NOTICE '⚠️ Test 2 SKIPPED: No staged entity found';
    END IF;
END;
$$;

-- Test 3: Entity not found error
DO $$
DECLARE
    v_random_uuid UUID := gen_random_uuid();
    v_result JSONB;
    v_error_occurred BOOLEAN := FALSE;
BEGIN
    BEGIN
        v_result := core.view_suggest_configs(v_random_uuid, TRUE);
    EXCEPTION WHEN OTHERS THEN
        v_error_occurred := TRUE;
        ASSERT SQLERRM LIKE '%not found%', 'Should raise not found error';
    END;
    
    ASSERT v_error_occurred, 'Should have raised exception for missing entity';
    
    RAISE NOTICE '✅ Test 3 PASSED: Entity not found error';
END;
$$;

-- Test 4: Meta information completeness
DO $$
DECLARE
    v_test_entity_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_test_entity_id
    FROM core.entities
    WHERE v_metadata IS NOT NULL AND jsonb_array_length(v_metadata) > 0
    LIMIT 1;
    
    IF v_test_entity_id IS NOT NULL THEN
        v_result := core.view_suggest_configs(v_test_entity_id, TRUE);
        
        ASSERT v_result->'_meta'->>'generated_at' IS NOT NULL, 'Should have generated_at';
        ASSERT v_result->'_meta'->>'entity_id' IS NOT NULL, 'Should have entity_id';
        ASSERT v_result->'_meta'->>'entity_type' IS NOT NULL, 'Should have entity_type';
        ASSERT v_result->'_meta'->>'generator_version' = '1.0', 'Should have version 1.0';
        
        RAISE NOTICE '✅ Test 4 PASSED: Meta information complete';
    ELSE
        RAISE NOTICE '⚠️ Test 4 SKIPPED: No entity found';
    END IF;
END;
$$;

-- Summary
DO $$
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '📋 core.view_suggest_configs (orchestrator) tests completed';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
END;
$$;
