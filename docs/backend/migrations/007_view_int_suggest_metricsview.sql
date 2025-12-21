/* ═══════════════════════════════════════════════════════════════════════════════
   📘 FUNCTION: core.view_int_suggest_metricsview
   📝 PURPOSE: Generate MetricsView (Dashboard) configuration with measures/dimensions
   🔄 VERSION: v1.0
   📅 CREATED: 2025-12-11
   ═══════════════════════════════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION core.view_int_suggest_metricsview(
    p_v_metadata JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $function$
/*
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 🎯 PURPOSE: Generate MetricsView (Dashboard) configuration                   ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ ⚡ INPUTS:                                                                    ║
║   • p_v_metadata: JSONB array of field definitions                           ║
║                                                                               ║
║ 📊 OUTPUT: JSONB object with metricsview configuration:                      ║
║   {                                                                           ║
║     "measures": [{field, aggregation, displayName}],                         ║
║     "dimensions": [{field, displayName}],                                    ║
║     "timeDimension": "created_at",                                           ║
║     "defaultCharts": [{type, measure, dimension}]                            ║
║   }                                                                           ║
║                                                                               ║
║ 🏗️  DETECTION LOGIC:                                                         ║
║   Measures: semantic_type.role = 'measure' OR numeric types                  ║
║   Dimensions: semantic_type.role = 'dimension' OR FK fields                  ║
║   Time: semantic_type.sub_type = 'temporal'                                  ║
║                                                                               ║
║ 📈 CALLED BY: core.view_suggest_configs                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
*/
DECLARE
    v_measures JSONB := '[]'::JSONB;
    v_dimensions JSONB := '[]'::JSONB;
    v_time_dimension TEXT := NULL;
    v_default_charts JSONB := '[]'::JSONB;
    v_field JSONB;
    v_first_measure TEXT := NULL;
    v_first_dimension TEXT := NULL;
    
    -- Measure candidates (field names that typically contain metrics)
    v_measure_patterns TEXT[] := ARRAY['%amount%', '%count%', '%total%', '%revenue%', '%cost%', '%price%', '%quantity%', '%value%', '%score%'];
    
    -- Dimension candidates
    v_dimension_patterns TEXT[] := ARRAY['stage_id', 'status', 'category_id', 'type_id', 'priority', 'source'];
BEGIN
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 1: Find Measures (numeric fields for aggregation)
    -- ═══════════════════════════════════════════════════════════════════════════
    
    FOR v_field IN 
        SELECT * FROM jsonb_array_elements(p_v_metadata) f
        WHERE (
            -- Explicit measure role
            (f->'semantic_type'->>'role') = 'measure'
            -- OR numeric types
            OR (f->>'type') IN ('integer', 'numeric', 'decimal', 'bigint', 'real', 'double precision')
            -- OR field name patterns
            OR (f->>'key') ILIKE ANY(v_measure_patterns)
        )
        AND (f->>'key') NOT IN ('id', 'organization_id', 'created_by', 'updated_by')
        AND COALESCE((f->>'is_displayable')::BOOLEAN, true)
        LIMIT 4  -- Max 4 measures
    LOOP
        v_measures := v_measures || jsonb_build_array(jsonb_build_object(
            'field', v_field->>'key',
            'displayName', COALESCE(v_field->>'display_name', initcap(replace(v_field->>'key', '_', ' '))),
            'aggregation', CASE 
                WHEN (v_field->>'key') ILIKE '%count%' THEN 'count'
                WHEN (v_field->'semantic_type'->>'sub_type') = 'ratio' THEN 'avg'
                ELSE 'sum'
            END
        ));
        
        IF v_first_measure IS NULL THEN
            v_first_measure := v_field->>'key';
        END IF;
    END LOOP;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 2: Find Dimensions (categorical fields for grouping)
    -- ═══════════════════════════════════════════════════════════════════════════
    
    FOR v_field IN 
        SELECT * FROM jsonb_array_elements(p_v_metadata) f
        WHERE (
            -- Explicit dimension role
            (f->'semantic_type'->>'role') = 'dimension'
            -- OR has foreign key (categorical reference)
            OR (f->'foreign_key' IS NOT NULL AND f->'foreign_key' != 'null'::JSONB)
            -- OR known dimension patterns
            OR (f->>'key') = ANY(v_dimension_patterns)
        )
        AND (f->>'key') NOT IN ('id', 'organization_id', 'created_by', 'updated_by')
        AND (f->'semantic_type'->>'sub_type') != 'temporal'  -- Exclude time fields
        AND COALESCE((f->>'is_displayable')::BOOLEAN, true)
        LIMIT 3  -- Max 3 dimensions
    LOOP
        v_dimensions := v_dimensions || jsonb_build_array(jsonb_build_object(
            'field', v_field->>'key',
            'displayName', COALESCE(v_field->>'display_name', initcap(replace(v_field->>'key', '_', ' ')))
        ));
        
        IF v_first_dimension IS NULL THEN
            v_first_dimension := v_field->>'key';
        END IF;
    END LOOP;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 3: Find Time Dimension
    -- ═══════════════════════════════════════════════════════════════════════════
    
    SELECT f->>'key' INTO v_time_dimension
    FROM jsonb_array_elements(p_v_metadata) f
    WHERE (f->'semantic_type'->>'sub_type') = 'temporal'
       OR (f->>'type') IN ('date', 'timestamptz', 'timestamp')
    ORDER BY 
        CASE f->>'key'
            WHEN 'created_at' THEN 1
            WHEN 'updated_at' THEN 2
            WHEN 'date' THEN 3
            ELSE 4
        END
    LIMIT 1;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 4: Generate default charts
    -- ═══════════════════════════════════════════════════════════════════════════
    
    -- Chart 1: Count by first dimension (bar chart)
    IF v_first_dimension IS NOT NULL THEN
        v_default_charts := v_default_charts || jsonb_build_array(jsonb_build_object(
            'type', 'bar',
            'title', 'Count by ' || initcap(replace(v_first_dimension, '_', ' ')),
            'measure', 'count',
            'dimension', v_first_dimension
        ));
    END IF;
    
    -- Chart 2: Measure trend over time (line chart)
    IF v_first_measure IS NOT NULL AND v_time_dimension IS NOT NULL THEN
        v_default_charts := v_default_charts || jsonb_build_array(jsonb_build_object(
            'type', 'line',
            'title', initcap(replace(v_first_measure, '_', ' ')) || ' Trend',
            'measure', v_first_measure,
            'timeDimension', v_time_dimension,
            'granularity', 'month'
        ));
    END IF;
    
    -- Chart 3: Pie chart for stage/status distribution
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_v_metadata) f 
        WHERE (f->>'key') IN ('stage_id', 'status')
    ) THEN
        v_default_charts := v_default_charts || jsonb_build_array(jsonb_build_object(
            'type', 'pie',
            'title', 'Distribution by Stage',
            'measure', 'count',
            'dimension', COALESCE(
                (SELECT f->>'key' FROM jsonb_array_elements(p_v_metadata) f WHERE f->>'key' = 'stage_id' LIMIT 1),
                (SELECT f->>'key' FROM jsonb_array_elements(p_v_metadata) f WHERE f->>'key' = 'status' LIMIT 1)
            )
        ));
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════════
    -- STEP 5: Return metrics configuration
    -- ═══════════════════════════════════════════════════════════════════════════
    
    RETURN jsonb_build_object(
        'measures', v_measures,
        'dimensions', v_dimensions,
        'timeDimension', v_time_dimension,
        'defaultCharts', v_default_charts,
        'showFeatures', '["date-range", "export", "refresh"]'::JSONB
    );
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🧪 TEST CASES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Test 1: Entity with measures and dimensions
DO $$
DECLARE
    v_metadata JSONB := '[
        {"key": "name", "type": "text", "is_displayable": true},
        {"key": "amount", "type": "numeric", "display_name": "Amount", "is_displayable": true,
         "semantic_type": {"role": "measure", "sub_type": "continuous"}},
        {"key": "quantity", "type": "integer", "display_name": "Quantity", "is_displayable": true},
        {"key": "stage_id", "type": "text", "display_name": "Stage", "is_displayable": true,
         "semantic_type": {"role": "dimension"}},
        {"key": "category_id", "type": "uuid", "display_name": "Category", "is_displayable": true,
         "foreign_key": {"source_table": "organization.enums"}},
        {"key": "created_at", "type": "timestamptz", "is_displayable": true,
         "semantic_type": {"sub_type": "temporal"}}
    ]'::JSONB;
    v_result JSONB;
BEGIN
    v_result := core.view_int_suggest_metricsview(v_metadata);
    
    ASSERT v_result IS NOT NULL, 'Should return metrics config';
    ASSERT jsonb_array_length(v_result->'measures') >= 1, 'Should detect measures';
    ASSERT jsonb_array_length(v_result->'dimensions') >= 1, 'Should detect dimensions';
    ASSERT (v_result->>'timeDimension') = 'created_at', 'Should detect time dimension';
    ASSERT jsonb_array_length(v_result->'defaultCharts') >= 1, 'Should generate default charts';
    
    RAISE NOTICE '✅ Test 1 PASSED: Measures and dimensions detected';
END;
$$;

-- Test 2: Aggregation type selection
DO $$
DECLARE
    v_metadata JSONB := '[
        {"key": "total_count", "type": "integer", "is_displayable": true},
        {"key": "win_rate", "type": "numeric", "is_displayable": true,
         "semantic_type": {"sub_type": "ratio"}}
    ]'::JSONB;
    v_result JSONB;
    v_count_agg TEXT;
    v_rate_agg TEXT;
BEGIN
    v_result := core.view_int_suggest_metricsview(v_metadata);
    
    SELECT m->>'aggregation' INTO v_count_agg
    FROM jsonb_array_elements(v_result->'measures') m
    WHERE m->>'field' = 'total_count';
    
    SELECT m->>'aggregation' INTO v_rate_agg
    FROM jsonb_array_elements(v_result->'measures') m
    WHERE m->>'field' = 'win_rate';
    
    ASSERT v_count_agg = 'count', 'Count field should use count aggregation';
    ASSERT v_rate_agg = 'avg', 'Ratio field should use avg aggregation';
    
    RAISE NOTICE '✅ Test 2 PASSED: Aggregation type selection';
END;
$$;

-- Test 3: Default charts generation
DO $$
DECLARE
    v_metadata JSONB := '[
        {"key": "amount", "type": "numeric", "is_displayable": true},
        {"key": "stage_id", "type": "text", "is_displayable": true},
        {"key": "created_at", "type": "timestamptz", "is_displayable": true,
         "semantic_type": {"sub_type": "temporal"}}
    ]'::JSONB;
    v_result JSONB;
    v_chart_types TEXT[];
BEGIN
    v_result := core.view_int_suggest_metricsview(v_metadata);
    
    SELECT array_agg(c->>'type') INTO v_chart_types
    FROM jsonb_array_elements(v_result->'defaultCharts') c;
    
    ASSERT 'bar' = ANY(v_chart_types), 'Should have bar chart';
    ASSERT 'pie' = ANY(v_chart_types), 'Should have pie chart for stage_id';
    
    RAISE NOTICE '✅ Test 3 PASSED: Default charts generated';
END;
$$;

-- Summary
DO $$
BEGIN
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '📋 core.view_int_suggest_metricsview tests completed';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
END;
$$;
