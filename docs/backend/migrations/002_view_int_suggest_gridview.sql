/* ═══════════════════════════════════════════════════════════════════════════════
   📘 FUNCTION: core.view_int_suggest_gridview
   📝 PURPOSE: Generate GridView (Card) configuration from entity metadata
   🔄 VERSION: v1.0
   📅 CREATED: 2025-12-11
   ═══════════════════════════════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.view_int_suggest_gridview(
    p_v_metadata JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $function$
/*
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 🎯 PURPOSE: Generate GridView (Card) configuration from entity v_metadata    ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ ⚡ INPUTS:                                                                    ║
║   • p_v_metadata: JSONB array of field definitions from core.entities        ║
║                                                                               ║
║ 📊 OUTPUT: JSONB object with gridview configuration:                         ║
║   {                                                                           ║
║     "cardFields": {                                                           ║
║       "title": "name",                                                        ║
║       "subtitle": "organization_name",                                        ║
║       "tags": "tags",                                                         ║
║       "badge": "stage_id"                                                     ║
║     },                                                                        ║
║     "groups": [{groupName, fields: [{fieldName, fieldPath}]}],               ║
║     "layout": {"cardsPerRow": 3, "cardSize": "medium"}                       ║
║   }                                                                           ║
║                                                                               ║
║ 🏗️  FIELD SELECTION LOGIC:                                                   ║
║   • Title: First of [name, display_name, display_id, title, subject]         ║
║   • Subtitle: First FK with display_column = 'name'                          ║
║   • Tags: First text[] column                                                ║
║   • Badge: First of [stage_id, status, is_active]                            ║
║   • Extra: Next 2-3 high-priority displayable fields                         ║
║                                                                               ║
║ 📈 CALLED BY: core.view_suggest_configs                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
*/
DECLARE
    v_card_fields JSONB := '{}'::JSONB;
    v_groups JSONB := '[]'::JSONB;
    v_extra_fields JSONB := '[]'::JSONB;
    v_field JSONB;
    v_title_field TEXT := NULL;
    v_subtitle_field TEXT := NULL;
    v_tags_field TEXT := NULL;
    v_badge_field TEXT := NULL;
    v_extra_count INTEGER := 0;
    v_order INTEGER := 1;
    
    -- Priority lists for field detection
    v_title_candidates TEXT[] := ARRAY['name', 'display_name', 'display_id', 'title', 'subject'];
    v_badge_candidates TEXT[] := ARRAY['stage_id', 'status', 'is_active', 'state', 'priority'];
BEGIN
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 1: Find Title field
    -- ═══════════════════════════════════════════════════════════════════════════
    
    FOR v_field IN SELECT * FROM jsonb_array_elements(p_v_metadata)
    LOOP
        IF (v_field->>'key') = ANY(v_title_candidates) 
           AND COALESCE((v_field->>'is_displayable')::BOOLEAN, true) THEN
            v_title_field := v_field->>'key';
            EXIT;
        END IF;
    END LOOP;
    
    -- Fallback: first searchable field
    IF v_title_field IS NULL THEN
        SELECT f->>'key' INTO v_title_field
        FROM jsonb_array_elements(p_v_metadata) f
        WHERE COALESCE((f->>'is_searchable')::BOOLEAN, false)
        LIMIT 1;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 2: Find Subtitle field (FK with display column)
    -- ═══════════════════════════════════════════════════════════════════════════
    
    SELECT f->>'key' INTO v_subtitle_field
    FROM jsonb_array_elements(p_v_metadata) f
    WHERE f->'foreign_key' IS NOT NULL 
      AND f->'foreign_key' != 'null'::JSONB
      AND (f->'foreign_key'->>'display_column') IN ('name', 'display_name', 'title')
      AND (f->>'key') != COALESCE(v_title_field, '')
      AND COALESCE((f->>'is_displayable')::BOOLEAN, true)
    LIMIT 1;
    
    -- Fallback: any FK field
    IF v_subtitle_field IS NULL THEN
        SELECT f->>'key' INTO v_subtitle_field
        FROM jsonb_array_elements(p_v_metadata) f
        WHERE f->'foreign_key' IS NOT NULL 
          AND f->'foreign_key' != 'null'::JSONB
          AND (f->>'key') != COALESCE(v_title_field, '')
          AND (f->>'key') NOT IN ('organization_id', 'created_by', 'updated_by')
          AND COALESCE((f->>'is_displayable')::BOOLEAN, true)
        LIMIT 1;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 3: Find Tags field (text[] type)
    -- ═══════════════════════════════════════════════════════════════════════════
    
    SELECT f->>'key' INTO v_tags_field
    FROM jsonb_array_elements(p_v_metadata) f
    WHERE (f->>'type') = 'text[]'
      AND COALESCE((f->>'is_displayable')::BOOLEAN, true)
    LIMIT 1;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 4: Find Badge field (status indicator)
    -- ═══════════════════════════════════════════════════════════════════════════
    
    FOR v_field IN SELECT * FROM jsonb_array_elements(p_v_metadata)
    LOOP
        IF (v_field->>'key') = ANY(v_badge_candidates) 
           AND COALESCE((v_field->>'is_displayable')::BOOLEAN, true) THEN
            v_badge_field := v_field->>'key';
            EXIT;
        END IF;
    END LOOP;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 5: Find 2-3 extra fields for card body
    -- ═══════════════════════════════════════════════════════════════════════════
    
    FOR v_field IN 
        SELECT * FROM jsonb_array_elements(p_v_metadata) f
        WHERE COALESCE((f->>'is_displayable')::BOOLEAN, true)
          AND (f->>'key') NOT IN (
              'id', 'organization_id', 'created_by', 'updated_by', 
              'created_at', 'updated_at', 'deleted_at', 'metadata', 'details'
          )
          AND (f->>'key') != COALESCE(v_title_field, '')
          AND (f->>'key') != COALESCE(v_subtitle_field, '')
          AND (f->>'key') != COALESCE(v_tags_field, '')
          AND (f->>'key') != COALESCE(v_badge_field, '')
          AND (f->>'type') != 'jsonb'
          -- LINKED COLUMN LOGIC: Skip "xxx_id" if "xxx" exists
          AND NOT (
              (f->>'key') LIKE '%\_id' ESCAPE '\' 
              AND EXISTS (
                  SELECT 1 FROM jsonb_array_elements(p_v_metadata) f2 
                  WHERE f2->>'key' = substring(f->>'key' from 1 for length(f->>'key') - 3)
              )
          )
        ORDER BY 
            COALESCE((f->>'is_mandatory')::BOOLEAN, false) DESC,
            COALESCE((f->>'is_searchable')::BOOLEAN, false) DESC
        LIMIT 3
    LOOP
        v_extra_fields := v_extra_fields || jsonb_build_array(jsonb_build_object(
            'order', v_order,
            'fieldName', COALESCE(v_field->>'display_name', initcap(replace(v_field->>'key', '_', ' '))),
            'fieldPath', v_field->>'key'
        ));
        v_order := v_order + 1;
        v_extra_count := v_extra_count + 1;
    END LOOP;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 6: Build cardFields object
    -- ═══════════════════════════════════════════════════════════════════════════
    
    v_card_fields := jsonb_build_object(
        'title', v_title_field,
        'subtitle', v_subtitle_field,
        'tags', v_tags_field,
        'badge', v_badge_field
    );
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 7: Build groups array with extra fields
    -- ═══════════════════════════════════════════════════════════════════════════
    
    IF jsonb_array_length(v_extra_fields) > 0 THEN
        v_groups := jsonb_build_array(jsonb_build_object(
            'groupName', 'Details',
            'fields', v_extra_fields
        ));
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 8: Return final configuration
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RETURN jsonb_build_object(
        'cardFields', v_card_fields,
        'groups', v_groups,
        'layout', jsonb_build_object(
            'cardsPerRow', 3,
            'cardSize', 'medium'
        ),
        'showFeatures', '["search", "pagination"]'::JSONB
    );
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🧪 TEST CASES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Test 1: Basic execution
DO $$
DECLARE
    v_sample_metadata JSONB := '[
        {"key": "name", "type": "text", "display_name": "Name", "is_displayable": true, "is_searchable": true},
        {"key": "organization_id", "type": "uuid", "is_displayable": true, "foreign_key": {"source_table": "identity.organizations", "display_column": "name"}},
        {"key": "tags", "type": "text[]", "display_name": "Tags", "is_displayable": true},
        {"key": "stage_id", "type": "text", "display_name": "Stage", "is_displayable": true},
        {"key": "description", "type": "text", "display_name": "Description", "is_displayable": true}
    ]'::JSONB;
    v_result JSONB;
BEGIN
    v_result := core.view_int_suggest_gridview(v_sample_metadata);
    
    ASSERT v_result IS NOT NULL, 'Result should not be null';
    ASSERT v_result->'cardFields' IS NOT NULL, 'Should have cardFields';
    ASSERT (v_result->'cardFields'->>'title') = 'name', 'Title should be name';
    ASSERT (v_result->'cardFields'->>'tags') = 'tags', 'Tags should be detected';
    ASSERT (v_result->'cardFields'->>'badge') = 'stage_id', 'Badge should be stage_id';
    
    RAISE NOTICE '✅ Test 1 PASSED: Basic gridview generation';
END;
$$;

-- Test 2: FK subtitle detection
DO $$
DECLARE
    v_metadata JSONB := '[
        {"key": "display_id", "type": "text", "is_displayable": true},
        {"key": "assigned_to_id", "type": "uuid", "display_name": "Assigned To", "is_displayable": true, 
         "foreign_key": {"source_table": "identity.users", "display_column": "name"}},
        {"key": "category_id", "type": "uuid", "is_displayable": true, 
         "foreign_key": {"source_table": "organization.enums", "display_column": "value"}}
    ]'::JSONB;
    v_result JSONB;
BEGIN
    v_result := core.view_int_suggest_gridview(v_metadata);
    
    -- assigned_to_id has display_column = 'name', should be preferred
    ASSERT (v_result->'cardFields'->>'subtitle') = 'assigned_to_id', 
           'Subtitle should prefer FK with name display_column';
    
    RAISE NOTICE '✅ Test 2 PASSED: FK subtitle detection';
END;
$$;

-- Test 3: Layout structure
DO $$
DECLARE
    v_metadata JSONB := '[{"key": "name", "type": "text", "is_displayable": true}]'::JSONB;
    v_result JSONB;
BEGIN
    v_result := core.view_int_suggest_gridview(v_metadata);
    
    ASSERT (v_result->'layout'->>'cardsPerRow')::INTEGER = 3, 'Default cards per row should be 3';
    ASSERT (v_result->'layout'->>'cardSize') = 'medium', 'Default card size should be medium';
    
    RAISE NOTICE '✅ Test 3 PASSED: Layout structure';
END;
$$;

-- Summary
DO $$
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '📋 core.view_int_suggest_gridview tests completed';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
END;
$$;
