/* ═══════════════════════════════════════════════════════════════════════════════
   📘 FUNCTION: core.view_int_suggest_detailview
   📝 PURPOSE: Generate DetailView configuration with grouped fields
   🔄 VERSION: v1.0
   📅 CREATED: 2025-12-11
   ═══════════════════════════════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.view_int_suggest_detailview(
    p_v_metadata JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $function$
/*
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 🎯 PURPOSE: Generate DetailView configuration with grouped fields            ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ ⚡ INPUTS:                                                                    ║
║   • p_v_metadata: JSONB array of field definitions from core.entities        ║
║                                                                               ║
║ 📊 OUTPUT: JSONB object with detailview configuration:                       ║
║   {                                                                           ║
║     "groups": [                                                               ║
║       {"groupName": "Primary Details", "fields": [...]},                     ║
║       {"groupName": "Details", "fields": [...]},  // JSONB group             ║
║       {"groupName": "Related", "fields": [...]}   // FK group                ║
║     ]                                                                         ║
║   }                                                                           ║
║                                                                               ║
║ 🏗️  GROUPING LOGIC:                                                          ║
║   Group 1 - "Primary Details":                                               ║
║     • is_displayable = true AND is_virtual = false                           ║
║     • foreign_key IS NULL AND type != 'jsonb'                                ║
║                                                                               ║
║   Group 2+ - JSONB Groups (one per jsonb_column):                            ║
║     • is_virtual = true                                                      ║
║     • Grouped by jsonb_column value                                          ║
║                                                                               ║
║   Group N - "Related Entities":                                              ║
║     • foreign_key IS NOT NULL                                                ║
║     • Grouped by source_table                                                ║
║                                                                               ║
║ 📈 CALLED BY: core.view_suggest_configs                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
*/
DECLARE
    v_groups JSONB := '[]'::JSONB;
    v_primary_fields JSONB := '[]'::JSONB;
    v_jsonb_groups JSONB := '{}'::JSONB;  -- key: jsonb_column, value: fields array
    v_fk_groups JSONB := '{}'::JSONB;     -- key: source_table, value: fields array
    v_field JSONB;
    v_order INTEGER := 1;
    v_jsonb_column TEXT;
    v_source_table TEXT;
    v_group_name TEXT;
    v_temp_fields JSONB;
    
    -- System fields to exclude
    v_excluded_keys TEXT[] := ARRAY[
        'id', 'organization_id', 'created_by', 'updated_by', 
        'deleted_at', 'metadata'
    ];
BEGIN
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 1: Categorize all fields into groups
    -- ═══════════════════════════════════════════════════════════════════════════
    
    FOR v_field IN SELECT * FROM jsonb_array_elements(p_v_metadata)
    LOOP
        -- Skip excluded system fields
        IF (v_field->>'key') = ANY(v_excluded_keys) THEN
            CONTINUE;
        END IF;

        -- ═══════════════════════════════════════════════════════════════════════
        -- LINKED COLUMN LOGIC: Skip "xxx_id" if "xxx" exists
        -- ═══════════════════════════════════════════════════════════════════════
        IF (v_field->>'key') LIKE '%\_id' ESCAPE '\' THEN
            IF EXISTS (
                SELECT 1 FROM jsonb_array_elements(p_v_metadata) f 
                WHERE f->>'key' = substring(v_field->>'key' from 1 for length(v_field->>'key') - 3)
            ) THEN
                CONTINUE;
            END IF;
        END IF;
        
        -- Skip non-displayable fields
        IF NOT COALESCE((v_field->>'is_displayable')::BOOLEAN, true) THEN
            CONTINUE;
        END IF;
        
        -- Skip raw JSONB columns
        IF (v_field->>'type') = 'jsonb' AND NOT COALESCE((v_field->>'is_virtual')::BOOLEAN, false) THEN
            CONTINUE;
        END IF;
        
        -- Build field entry
        v_temp_fields := jsonb_build_object(
            'order', v_order,
            'fieldName', COALESCE(v_field->>'display_name', initcap(replace(v_field->>'key', '_', ' '))),
            'fieldPath', v_field->>'key'
        );
        v_order := v_order + 1;
        
        -- Categorize the field
        IF COALESCE((v_field->>'is_virtual')::BOOLEAN, false) THEN
            -- Virtual field from JSONB - group by jsonb_column
            v_jsonb_column := COALESCE(v_field->>'jsonb_column', 'Other');
            
            IF NOT v_jsonb_groups ? v_jsonb_column THEN
                v_jsonb_groups := v_jsonb_groups || jsonb_build_object(v_jsonb_column, '[]'::JSONB);
            END IF;
            
            v_jsonb_groups := jsonb_set(
                v_jsonb_groups,
                ARRAY[v_jsonb_column],
                (v_jsonb_groups->v_jsonb_column) || jsonb_build_array(v_temp_fields)
            );
            
        ELSIF v_field->'foreign_key' IS NOT NULL AND v_field->'foreign_key' != 'null'::JSONB THEN
            -- FK field - group by source_table
            v_source_table := COALESCE(v_field->'foreign_key'->>'source_table', 'Related');
            
            -- Clean up source_table name (remove schema prefix)
            v_source_table := split_part(v_source_table, '.', 2);
            IF v_source_table = '' THEN
                v_source_table := v_field->'foreign_key'->>'source_table';
            END IF;
            
            IF NOT v_fk_groups ? v_source_table THEN
                v_fk_groups := v_fk_groups || jsonb_build_object(v_source_table, '[]'::JSONB);
            END IF;
            
            v_fk_groups := jsonb_set(
                v_fk_groups,
                ARRAY[v_source_table],
                (v_fk_groups->v_source_table) || jsonb_build_array(v_temp_fields)
            );
            
        ELSE
            -- Primary field (physical, non-FK, non-JSONB)
            v_primary_fields := v_primary_fields || jsonb_build_array(v_temp_fields);
        END IF;
    END LOOP;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 2: Build groups array in order
    -- ═══════════════════════════════════════════════════════════════════════════
    
    -- Add Primary Details group first (if has fields)
    IF jsonb_array_length(v_primary_fields) > 0 THEN
        v_groups := v_groups || jsonb_build_array(jsonb_build_object(
            'groupName', 'Primary Details',
            'fields', v_primary_fields,
            'isCollapsible', false
        ));
    END IF;
    
    -- Add JSONB groups
    FOR v_group_name IN SELECT jsonb_object_keys(v_jsonb_groups)
    LOOP
        v_groups := v_groups || jsonb_build_array(jsonb_build_object(
            'groupName', initcap(replace(v_group_name, '_', ' ')),
            'fields', v_jsonb_groups->v_group_name,
            'isCollapsible', true
        ));
    END LOOP;
    
    -- Add FK (Related) groups
    FOR v_group_name IN SELECT jsonb_object_keys(v_fk_groups)
    LOOP
        v_groups := v_groups || jsonb_build_array(jsonb_build_object(
            'groupName', initcap(replace(v_group_name, '_', ' ')),
            'fields', v_fk_groups->v_group_name,
            'isCollapsible', true
        ));
    END LOOP;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 3: Return final configuration
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RETURN jsonb_build_object(
        'groups', v_groups,
        'showFeatures', '["edit", "delete", "print"]'::JSONB,
        'layout', jsonb_build_object(
            'columnsPerGroup', 2
        )
    );
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🧪 TEST CASES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Test 1: Basic grouping
DO $$
DECLARE
    v_sample_metadata JSONB := '[
        {"key": "id", "type": "uuid", "is_displayable": true},
        {"key": "name", "type": "text", "display_name": "Name", "is_displayable": true},
        {"key": "email", "type": "text", "display_name": "Email", "is_displayable": true},
        {"key": "organization_id", "type": "uuid", "is_displayable": true, "foreign_key": {"source_table": "identity.organizations"}},
        {"key": "details", "type": "jsonb", "is_displayable": true},
        {"key": "details__notes", "type": "text", "display_name": "Notes", "is_displayable": true, "is_virtual": true, "jsonb_column": "details"},
        {"key": "details__phone", "type": "text", "display_name": "Phone", "is_displayable": true, "is_virtual": true, "jsonb_column": "details"}
    ]'::JSONB;
    v_result JSONB;
    v_group_names TEXT[];
BEGIN
    v_result := core.view_int_suggest_detailview(v_sample_metadata);
    
    ASSERT v_result IS NOT NULL, 'Result should not be null';
    ASSERT v_result->'groups' IS NOT NULL, 'Should have groups array';
    ASSERT jsonb_array_length(v_result->'groups') >= 2, 'Should have at least 2 groups';
    
    -- Collect group names
    SELECT array_agg(g->>'groupName') INTO v_group_names
    FROM jsonb_array_elements(v_result->'groups') g;
    
    ASSERT 'Primary Details' = ANY(v_group_names), 'Should have Primary Details group';
    ASSERT 'Details' = ANY(v_group_names), 'Should have Details group (from JSONB)';
    
    RAISE NOTICE '✅ Test 1 PASSED: Basic grouping';
END;
$$;

-- Test 2: Excluded fields
DO $$
DECLARE
    v_metadata JSONB := '[
        {"key": "id", "type": "uuid", "is_displayable": true},
        {"key": "organization_id", "type": "uuid", "is_displayable": true},
        {"key": "name", "type": "text", "is_displayable": true},
        {"key": "deleted_at", "type": "timestamptz", "is_displayable": true}
    ]'::JSONB;
    v_result JSONB;
BEGIN
    v_result := core.view_int_suggest_detailview(v_metadata);
    
    -- Verify excluded fields are not in any group
    ASSERT NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_result->'groups') g,
                      jsonb_array_elements(g->'fields') f
        WHERE f->>'fieldPath' IN ('id', 'organization_id', 'deleted_at')
    ), 'System fields should be excluded';
    
    RAISE NOTICE '✅ Test 2 PASSED: Excluded fields';
END;
$$;

-- Test 3: FK grouping by source table
DO $$
DECLARE
    v_metadata JSONB := '[
        {"key": "name", "type": "text", "is_displayable": true},
        {"key": "user_id", "type": "uuid", "display_name": "User", "is_displayable": true, 
         "foreign_key": {"source_table": "identity.users"}},
        {"key": "manager_id", "type": "uuid", "display_name": "Manager", "is_displayable": true, 
         "foreign_key": {"source_table": "identity.users"}},
        {"key": "team_id", "type": "uuid", "display_name": "Team", "is_displayable": true, 
         "foreign_key": {"source_table": "identity.teams"}}
    ]'::JSONB;
    v_result JSONB;
    v_group_names TEXT[];
BEGIN
    v_result := core.view_int_suggest_detailview(v_metadata);
    
    SELECT array_agg(g->>'groupName') INTO v_group_names
    FROM jsonb_array_elements(v_result->'groups') g;
    
    -- Should have Users group with 2 fields
    ASSERT 'Users' = ANY(v_group_names), 'Should have Users group from FK';
    ASSERT 'Teams' = ANY(v_group_names), 'Should have Teams group from FK';
    
    RAISE NOTICE '✅ Test 3 PASSED: FK grouping';
END;
$$;

-- Summary
DO $$
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '📋 core.view_int_suggest_detailview tests completed';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
END;
$$;
