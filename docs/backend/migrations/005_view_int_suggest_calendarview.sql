/* ═══════════════════════════════════════════════════════════════════════════════
   📘 FUNCTION: core.view_int_suggest_calendarview
   📝 PURPOSE: Generate CalendarView configuration for entities with temporal fields
   🔄 VERSION: v1.0
   📅 CREATED: 2025-12-11
   ═══════════════════════════════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.view_int_suggest_calendarview(
    p_v_metadata JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $function$
/*
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 🎯 PURPOSE: Generate CalendarView configuration for temporal entities        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ ⚡ INPUTS:                                                                    ║
║   • p_v_metadata: JSONB array of field definitions                           ║
║                                                                               ║
║ 📊 OUTPUT: JSONB object with calendarview configuration, or NULL if N/A:     ║
║   {                                                                           ║
║     "titleField": "name",                                                    ║
║     "startField": "event_start_at",                                          ║
║     "endField": "event_end_at",                                              ║
║     "allDayField": "is_all_day",                                             ║
║     "colorField": "category_id"                                              ║
║   }                                                                           ║
║                                                                               ║
║ 🏗️  PREREQUISITE:                                                            ║
║   Entity must have temporal fields (due_date, start_at, scheduled_at, etc.)  ║
║                                                                               ║
║ 📈 CALLED BY: core.view_suggest_configs                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
*/
DECLARE
    v_title_field TEXT := NULL;
    v_start_field TEXT := NULL;
    v_end_field TEXT := NULL;
    v_all_day_field TEXT := NULL;
    v_color_field TEXT := NULL;
    v_field JSONB;
    
    -- Start field candidates (priority order)
    v_start_candidates TEXT[] := ARRAY[
        'event_start_at', 'start_at', 'start_date', 'starts_at',
        'scheduled_at', 'scheduled_date', 'due_date', 'due_at',
        'appointment_date', 'meeting_date', 'date'
    ];
    
    -- End field candidates
    v_end_candidates TEXT[] := ARRAY[
        'event_end_at', 'end_at', 'end_date', 'ends_at',
        'completed_at', 'deadline'
    ];
    
    -- Title candidates
    v_title_candidates TEXT[] := ARRAY['name', 'title', 'subject', 'display_name', 'display_id'];
BEGIN
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 1: Find start date field (required)
    -- ═══════════════════════════════════════════════════════════════════════════
    
    -- Check explicit candidates first
    FOR v_field IN SELECT * FROM jsonb_array_elements(p_v_metadata)
    LOOP
        IF (v_field->>'key') = ANY(v_start_candidates) 
           AND (v_field->>'type') IN ('date', 'timestamptz', 'timestamp', 'timestamp with time zone') THEN
            v_start_field := v_field->>'key';
            EXIT;
        END IF;
    END LOOP;
    
    -- Fallback: any temporal field that's not created_at/updated_at
    IF v_start_field IS NULL THEN
        SELECT f->>'key' INTO v_start_field
        FROM jsonb_array_elements(p_v_metadata) f
        WHERE (f->>'type') IN ('date', 'timestamptz', 'timestamp')
          AND (f->>'key') NOT IN ('created_at', 'updated_at', 'deleted_at')
          AND (f->'semantic_type'->>'sub_type') = 'temporal'
        LIMIT 1;
    END IF;
    
    -- If no temporal field found, calendar not applicable
    IF v_start_field IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 2: Find end date field (optional)
    -- ═══════════════════════════════════════════════════════════════════════════
    
    FOR v_field IN SELECT * FROM jsonb_array_elements(p_v_metadata)
    LOOP
        IF (v_field->>'key') = ANY(v_end_candidates) 
           AND (v_field->>'type') IN ('date', 'timestamptz', 'timestamp')
           AND (v_field->>'key') != v_start_field THEN
            v_end_field := v_field->>'key';
            EXIT;
        END IF;
    END LOOP;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 3: Find title field
    -- ═══════════════════════════════════════════════════════════════════════════
    
    FOR v_field IN SELECT * FROM jsonb_array_elements(p_v_metadata)
    LOOP
        IF (v_field->>'key') = ANY(v_title_candidates) 
           AND COALESCE((v_field->>'is_displayable')::BOOLEAN, true) THEN
            v_title_field := v_field->>'key';
            EXIT;
        END IF;
    END LOOP;
    
    -- Fallback: first searchable
    IF v_title_field IS NULL THEN
        SELECT f->>'key' INTO v_title_field
        FROM jsonb_array_elements(p_v_metadata) f
        WHERE COALESCE((f->>'is_searchable')::BOOLEAN, false)
        LIMIT 1;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 4: Find all-day field (boolean)
    -- ═══════════════════════════════════════════════════════════════════════════
    
    SELECT f->>'key' INTO v_all_day_field
    FROM jsonb_array_elements(p_v_metadata) f
    WHERE (f->>'key') ILIKE '%all_day%'
       OR (f->>'key') ILIKE '%allday%'
       OR (f->>'key') = 'is_full_day'
    LIMIT 1;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 5: Find color field (category/type FK)
    -- ═══════════════════════════════════════════════════════════════════════════
    
    SELECT f->>'key' INTO v_color_field
    FROM jsonb_array_elements(p_v_metadata) f
    WHERE (f->>'key') IN ('category_id', 'type_id', 'event_type', 'calendar_id')
       OR (f->>'key') ILIKE '%category%'
    LIMIT 1;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 6: Return calendar configuration
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RETURN jsonb_build_object(
        'titleField', v_title_field,
        'startField', v_start_field,
        'endField', v_end_field,
        'allDayField', v_all_day_field,
        'colorField', v_color_field,
        'defaultView', 'month',
        'showFeatures', '["day", "week", "month", "agenda"]'::JSONB
    );
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🧪 TEST CASES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Test 1: Entity with event dates returns calendar config
DO $$
DECLARE
    v_metadata JSONB := '[
        {"key": "title", "type": "text", "display_name": "Title", "is_displayable": true, "is_searchable": true},
        {"key": "event_start_at", "type": "timestamptz", "display_name": "Start", "is_displayable": true},
        {"key": "event_end_at", "type": "timestamptz", "display_name": "End", "is_displayable": true},
        {"key": "is_all_day", "type": "boolean", "display_name": "All Day", "is_displayable": true},
        {"key": "category_id", "type": "uuid", "display_name": "Category", "is_displayable": true}
    ]'::JSONB;
    v_result JSONB;
BEGIN
    v_result := core.view_int_suggest_calendarview(v_metadata);
    
    ASSERT v_result IS NOT NULL, 'Should return config when temporal fields exist';
    ASSERT (v_result->>'titleField') = 'title', 'Title should be detected';
    ASSERT (v_result->>'startField') = 'event_start_at', 'Start field should be detected';
    ASSERT (v_result->>'endField') = 'event_end_at', 'End field should be detected';
    ASSERT (v_result->>'allDayField') = 'is_all_day', 'All day field should be detected';
    
    RAISE NOTICE '✅ Test 1 PASSED: Full calendar config';
END;
$$;

-- Test 2: Entity with only due_date
DO $$
DECLARE
    v_metadata JSONB := '[
        {"key": "name", "type": "text", "is_displayable": true, "is_searchable": true},
        {"key": "due_date", "type": "date", "display_name": "Due Date", "is_displayable": true,
         "semantic_type": {"sub_type": "temporal"}},
        {"key": "created_at", "type": "timestamptz", "is_displayable": true}
    ]'::JSONB;
    v_result JSONB;
BEGIN
    v_result := core.view_int_suggest_calendarview(v_metadata);
    
    ASSERT v_result IS NOT NULL, 'Should return config with due_date';
    ASSERT (v_result->>'startField') = 'due_date', 'Start should be due_date';
    
    RAISE NOTICE '✅ Test 2 PASSED: Due date as start';
END;
$$;

-- Test 3: Entity without temporal fields returns NULL
DO $$
DECLARE
    v_metadata JSONB := '[
        {"key": "name", "type": "text", "is_displayable": true},
        {"key": "description", "type": "text", "is_displayable": true},
        {"key": "created_at", "type": "timestamptz", "is_displayable": true},
        {"key": "updated_at", "type": "timestamptz", "is_displayable": true}
    ]'::JSONB;
    v_result JSONB;
BEGIN
    v_result := core.view_int_suggest_calendarview(v_metadata);
    
    -- Should return NULL since only system timestamps exist
    ASSERT v_result IS NULL, 'Should return NULL when only system timestamps';
    
    RAISE NOTICE '✅ Test 3 PASSED: No temporal returns NULL';
END;
$$;

-- Summary
DO $$
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '📋 core.view_int_suggest_calendarview tests completed';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
END;
$$;
