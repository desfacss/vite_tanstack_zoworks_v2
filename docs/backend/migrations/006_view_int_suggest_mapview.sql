/* ═══════════════════════════════════════════════════════════════════════════════
   📘 FUNCTION: core.view_int_suggest_mapview
   📝 PURPOSE: Generate MapView configuration for entities with geo fields
   🔄 VERSION: v1.0
   📅 CREATED: 2025-12-11
   ═══════════════════════════════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.view_int_suggest_mapview(
    p_v_metadata JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $function$
/*
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 🎯 PURPOSE: Generate MapView configuration for geo-enabled entities          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ ⚡ INPUTS:                                                                    ║
║   • p_v_metadata: JSONB array of field definitions                           ║
║                                                                               ║
║ 📊 OUTPUT: JSONB object with mapview configuration, or NULL if N/A:          ║
║   {                                                                           ║
║     "latField": "lat",                                                       ║
║     "lngField": "lng",                                                       ║
║     "titleField": "name",                                                    ║
║     "popupFields": ["name", "address", "phone"],                             ║
║     "clusterEnabled": true                                                   ║
║   }                                                                           ║
║                                                                               ║
║ 🏗️  PREREQUISITE:                                                            ║
║   Entity must have lat/lng fields OR geometry/geography type column          ║
║                                                                               ║
║ 📈 CALLED BY: core.view_suggest_configs                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
*/
DECLARE
    v_lat_field TEXT := NULL;
    v_lng_field TEXT := NULL;
    v_geometry_field TEXT := NULL;
    v_title_field TEXT := NULL;
    v_address_field TEXT := NULL;
    v_popup_fields JSONB := '[]'::JSONB;
    v_field JSONB;
    v_count INTEGER := 0;
    
    -- Lat/Lng field candidates
    v_lat_candidates TEXT[] := ARRAY['lat', 'latitude', 'geo_lat', 'location_lat'];
    v_lng_candidates TEXT[] := ARRAY['lng', 'longitude', 'lon', 'geo_lng', 'location_lng'];
    
    -- Title candidates
    v_title_candidates TEXT[] := ARRAY['name', 'display_name', 'display_id', 'title', 'location_name'];
BEGIN
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 1: Check for lat/lng fields
    -- ═══════════════════════════════════════════════════════════════════════════
    
    -- Find latitude field
    FOR v_field IN SELECT * FROM jsonb_array_elements(p_v_metadata)
    LOOP
        IF (v_field->>'key') = ANY(v_lat_candidates) THEN
            v_lat_field := v_field->>'key';
            EXIT;
        END IF;
    END LOOP;
    
    -- Find longitude field
    FOR v_field IN SELECT * FROM jsonb_array_elements(p_v_metadata)
    LOOP
        IF (v_field->>'key') = ANY(v_lng_candidates) THEN
            v_lng_field := v_field->>'key';
            EXIT;
        END IF;
    END LOOP;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 2: Check for geometry/geography column
    -- ═══════════════════════════════════════════════════════════════════════════
    
    IF v_lat_field IS NULL OR v_lng_field IS NULL THEN
        SELECT f->>'key' INTO v_geometry_field
        FROM jsonb_array_elements(p_v_metadata) f
        WHERE (f->>'type') IN ('geometry', 'geography', 'point')
           OR (f->>'key') IN ('geom', 'geometry', 'location', 'coordinates', 'geo_point')
        LIMIT 1;
    END IF;
    
    -- If no geo fields found, map not applicable
    IF (v_lat_field IS NULL OR v_lng_field IS NULL) AND v_geometry_field IS NULL THEN
        RETURN NULL;
    END IF;
    
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
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 4: Find address field
    -- ═══════════════════════════════════════════════════════════════════════════
    
    SELECT f->>'key' INTO v_address_field
    FROM jsonb_array_elements(p_v_metadata) f
    WHERE (f->>'key') ILIKE '%address%'
       OR (f->>'key') IN ('location', 'place', 'street', 'city')
    LIMIT 1;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 5: Build popup fields (3-5 fields)
    -- ═══════════════════════════════════════════════════════════════════════════
    
    -- Add title first
    IF v_title_field IS NOT NULL THEN
        v_popup_fields := v_popup_fields || to_jsonb(v_title_field);
        v_count := v_count + 1;
    END IF;
    
    -- Add address if found
    IF v_address_field IS NOT NULL THEN
        v_popup_fields := v_popup_fields || to_jsonb(v_address_field);
        v_count := v_count + 1;
    END IF;
    
    -- Add more displayable/searchable fields
    FOR v_field IN 
        SELECT * FROM jsonb_array_elements(p_v_metadata) f
        WHERE COALESCE((f->>'is_displayable')::BOOLEAN, true)
          AND (f->>'key') NOT IN (
              'id', 'organization_id', 'created_by', 'updated_by', 
              'created_at', 'updated_at', 'deleted_at', 'metadata', 'details'
          )
          AND (f->>'key') != COALESCE(v_title_field, '')
          AND (f->>'key') != COALESCE(v_address_field, '')
          AND (f->>'key') != COALESCE(v_lat_field, '')
          AND (f->>'key') != COALESCE(v_lng_field, '')
          AND (f->>'key') != COALESCE(v_geometry_field, '')
          AND (f->>'type') != 'jsonb'
        ORDER BY COALESCE((f->>'is_searchable')::BOOLEAN, false) DESC
        LIMIT 3
    LOOP
        IF v_count < 5 THEN
            v_popup_fields := v_popup_fields || to_jsonb(v_field->>'key');
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 6: Return map configuration
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RETURN jsonb_build_object(
        'latField', v_lat_field,
        'lngField', v_lng_field,
        'geometryField', v_geometry_field,
        'titleField', v_title_field,
        'popupFields', v_popup_fields,
        'clusterEnabled', true,
        'defaultZoom', 10,
        'showFeatures', '["cluster", "search", "fullscreen"]'::JSONB
    );
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🧪 TEST CASES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Test 1: Entity with lat/lng returns map config
DO $$
DECLARE
    v_metadata JSONB := '[
        {"key": "name", "type": "text", "display_name": "Name", "is_displayable": true, "is_searchable": true},
        {"key": "lat", "type": "numeric", "display_name": "Latitude", "is_displayable": true},
        {"key": "lng", "type": "numeric", "display_name": "Longitude", "is_displayable": true},
        {"key": "address", "type": "text", "display_name": "Address", "is_displayable": true},
        {"key": "phone", "type": "text", "display_name": "Phone", "is_displayable": true}
    ]'::JSONB;
    v_result JSONB;
BEGIN
    v_result := core.view_int_suggest_mapview(v_metadata);
    
    ASSERT v_result IS NOT NULL, 'Should return config when lat/lng exist';
    ASSERT (v_result->>'latField') = 'lat', 'Lat field should be detected';
    ASSERT (v_result->>'lngField') = 'lng', 'Lng field should be detected';
    ASSERT (v_result->>'titleField') = 'name', 'Title should be detected';
    ASSERT jsonb_array_length(v_result->'popupFields') >= 2, 'Should have popup fields';
    
    RAISE NOTICE '✅ Test 1 PASSED: Lat/Lng map config';
END;
$$;

-- Test 2: Entity with geometry column
DO $$
DECLARE
    v_metadata JSONB := '[
        {"key": "display_id", "type": "text", "is_displayable": true},
        {"key": "geom", "type": "geometry", "display_name": "Geometry", "is_displayable": true},
        {"key": "area_name", "type": "text", "is_displayable": true}
    ]'::JSONB;
    v_result JSONB;
BEGIN
    v_result := core.view_int_suggest_mapview(v_metadata);
    
    ASSERT v_result IS NOT NULL, 'Should return config when geometry exists';
    ASSERT (v_result->>'geometryField') = 'geom', 'Geometry field should be detected';
    
    RAISE NOTICE '✅ Test 2 PASSED: Geometry field detection';
END;
$$;

-- Test 3: Entity without geo fields returns NULL
DO $$
DECLARE
    v_metadata JSONB := '[
        {"key": "name", "type": "text", "is_displayable": true},
        {"key": "email", "type": "text", "is_displayable": true}
    ]'::JSONB;
    v_result JSONB;
BEGIN
    v_result := core.view_int_suggest_mapview(v_metadata);
    
    ASSERT v_result IS NULL, 'Should return NULL when no geo fields';
    
    RAISE NOTICE '✅ Test 3 PASSED: No geo returns NULL';
END;
$$;

-- Summary
DO $$
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '📋 core.view_int_suggest_mapview tests completed';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
END;
$$;
