/* ═══════════════════════════════════════════════════════════════════════════════
   📘 FUNCTION: core.view_int_suggest_kanbanview
   📝 PURPOSE: Generate KanbanView configuration for staged entities
   🔄 VERSION: v1.0
   📅 CREATED: 2025-12-11
   ═══════════════════════════════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.view_int_suggest_kanbanview(
    p_v_metadata JSONB,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_schema TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $function$
/*
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 🎯 PURPOSE: Generate KanbanView configuration for staged entities            ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ ⚡ INPUTS:                                                                    ║
║   • p_v_metadata: JSONB array of field definitions                           ║
║   • p_entity_type: Entity type for blueprint stage detection                 ║
║   • p_entity_schema: Entity schema for blueprint detection                   ║
║                                                                               ║
║ 📊 OUTPUT: JSONB object with kanbanview configuration, or NULL if N/A:       ║
║   {                                                                           ║
║     "types": [{"fieldPath": "stage_id", "fieldName": "Stage"}],              ║
║     "cardFields": {title, description, assignee, dueDate},                   ║
║     "groupBy": {"field": "stage_id", "direction": "asc"}                     ║
║   }                                                                           ║
║                                                                               ║
║ 🏗️  PREREQUISITE:                                                            ║
║   Entity must have stage_id column OR active blueprint with stages           ║
║                                                                               ║
║ 📈 CALLED BY: core.view_suggest_configs                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
*/
DECLARE
    v_has_stage_id BOOLEAN := FALSE;
    v_has_blueprint_stages BOOLEAN := FALSE;
    v_stage_field JSONB := NULL;
    v_card_fields JSONB := '{}'::JSONB;
    v_title_field TEXT := NULL;
    v_description_field TEXT := NULL;
    v_assignee_field TEXT := NULL;
    v_due_date_field TEXT := NULL;
    v_field JSONB;
    
    -- Title candidates
    v_title_candidates TEXT[] := ARRAY['name', 'display_name', 'display_id', 'title', 'subject'];
BEGIN
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 1: Check prerequisites - must have stage_id or blueprint stages
    -- ═══════════════════════════════════════════════════════════════════════════
    
    -- Check for stage_id column in metadata
    SELECT TRUE INTO v_has_stage_id
    FROM jsonb_array_elements(p_v_metadata) f
    WHERE (f->>'key') = 'stage_id'
    LIMIT 1;
    
    -- Check for blueprint stages if entity info provided
    IF NOT COALESCE(v_has_stage_id, FALSE) AND p_entity_type IS NOT NULL AND p_entity_schema IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM automation.bp_process_blueprints bp
            WHERE bp.entity_type = p_entity_type 
              AND bp.entity_schema = p_entity_schema
              AND bp.is_active = TRUE
              AND bp.definition->'lifecycle'->'stages' IS NOT NULL
        ) INTO v_has_blueprint_stages;
    END IF;
    
    -- If no stage support, return NULL (kanban not applicable)
    IF NOT COALESCE(v_has_stage_id, FALSE) AND NOT COALESCE(v_has_blueprint_stages, FALSE) THEN
        RETURN NULL;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 2: Get stage field configuration
    -- ═══════════════════════════════════════════════════════════════════════════
    
    SELECT f INTO v_stage_field
    FROM jsonb_array_elements(p_v_metadata) f
    WHERE (f->>'key') = 'stage_id'
    LIMIT 1;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 3: Find card fields
    -- ═══════════════════════════════════════════════════════════════════════════
    
    -- Find title field
    FOR v_field IN SELECT * FROM jsonb_array_elements(p_v_metadata)
    LOOP
        IF (v_field->>'key') = ANY(v_title_candidates) 
           AND COALESCE((v_field->>'is_displayable')::BOOLEAN, true) THEN
            v_title_field := v_field->>'key';
            EXIT;
        END IF;
    END LOOP;
    
    -- Fallback title: first searchable
    IF v_title_field IS NULL THEN
        SELECT f->>'key' INTO v_title_field
        FROM jsonb_array_elements(p_v_metadata) f
        WHERE COALESCE((f->>'is_searchable')::BOOLEAN, false)
        LIMIT 1;
    END IF;
    
    -- Find description field
    SELECT f->>'key' INTO v_description_field
    FROM jsonb_array_elements(p_v_metadata) f
    WHERE (f->>'key') ILIKE '%description%' 
       OR (f->>'key') ILIKE '%summary%'
       OR (f->>'key') ILIKE '%notes%'
    LIMIT 1;
    
    -- Find assignee field (FK to users)
    SELECT f->>'key' INTO v_assignee_field
    FROM jsonb_array_elements(p_v_metadata) f
    WHERE f->'foreign_key' IS NOT NULL
      AND (
          (f->'foreign_key'->>'source_table') ILIKE '%users%'
          OR (f->>'key') ILIKE '%assigned%'
          OR (f->>'key') ILIKE '%owner%'
      )
    LIMIT 1;
    
    -- Find due date field
    SELECT f->>'key' INTO v_due_date_field
    FROM jsonb_array_elements(p_v_metadata) f
    WHERE (
        (f->>'key') ILIKE '%due%'
        OR (f->>'key') ILIKE '%deadline%'
        OR (f->>'key') ILIKE '%target_date%'
    )
    AND (f->>'type') IN ('date', 'timestamptz', 'timestamp')
    LIMIT 1;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 4: Build card fields object
    -- ═══════════════════════════════════════════════════════════════════════════
    
    v_card_fields := jsonb_build_object(
        'title', v_title_field,
        'description', v_description_field,
        'assignee', v_assignee_field,
        'dueDate', v_due_date_field
    );
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 5: Return kanban configuration
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RETURN jsonb_build_object(
        'types', jsonb_build_array(jsonb_build_object(
            'fieldPath', 'stage_id',
            'fieldName', COALESCE(v_stage_field->>'display_name', 'Stage')
        )),
        'cardFields', v_card_fields,
        'groupBy', jsonb_build_object(
            'field', 'stage_id',
            'direction', 'asc'
        ),
        'showFeatures', '["drag-drop", "quick-add"]'::JSONB,
        'actions', jsonb_build_object(
            'card', '["view", "edit"]'::JSONB
        )
    );
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🧪 TEST CASES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Test 1: Entity with stage_id returns kanban config
DO $$
DECLARE
    v_metadata JSONB := '[
        {"key": "name", "type": "text", "display_name": "Name", "is_displayable": true, "is_searchable": true},
        {"key": "stage_id", "type": "text", "display_name": "Stage", "is_displayable": true},
        {"key": "description", "type": "text", "display_name": "Description", "is_displayable": true},
        {"key": "assigned_user_id", "type": "uuid", "display_name": "Assignee", "is_displayable": true, 
         "foreign_key": {"source_table": "identity.users"}}
    ]'::JSONB;
    v_result JSONB;
BEGIN
    v_result := core.view_int_suggest_kanbanview(v_metadata);
    
    ASSERT v_result IS NOT NULL, 'Should return config when stage_id exists';
    ASSERT v_result->'types' IS NOT NULL, 'Should have types array';
    ASSERT (v_result->'cardFields'->>'title') = 'name', 'Title should be name';
    ASSERT (v_result->'cardFields'->>'assignee') = 'assigned_user_id', 'Assignee should be detected';
    
    RAISE NOTICE '✅ Test 1 PASSED: Entity with stage_id';
END;
$$;

-- Test 2: Entity without stage_id returns NULL
DO $$
DECLARE
    v_metadata JSONB := '[
        {"key": "name", "type": "text", "is_displayable": true},
        {"key": "status", "type": "text", "is_displayable": true}
    ]'::JSONB;
    v_result JSONB;
BEGIN
    v_result := core.view_int_suggest_kanbanview(v_metadata);
    
    ASSERT v_result IS NULL, 'Should return NULL when no stage_id';
    
    RAISE NOTICE '✅ Test 2 PASSED: No stage_id returns NULL';
END;
$$;

-- Test 3: Due date detection
DO $$
DECLARE
    v_metadata JSONB := '[
        {"key": "title", "type": "text", "is_displayable": true},
        {"key": "stage_id", "type": "text", "is_displayable": true},
        {"key": "due_date", "type": "date", "display_name": "Due Date", "is_displayable": true}
    ]'::JSONB;
    v_result JSONB;
BEGIN
    v_result := core.view_int_suggest_kanbanview(v_metadata);
    
    ASSERT (v_result->'cardFields'->>'dueDate') = 'due_date', 'Should detect due_date field';
    
    RAISE NOTICE '✅ Test 3 PASSED: Due date detection';
END;
$$;

-- Summary
DO $$
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '📋 core.view_int_suggest_kanbanview tests completed';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
END;
$$;
