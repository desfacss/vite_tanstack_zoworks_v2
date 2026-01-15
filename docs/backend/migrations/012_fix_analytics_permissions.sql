-- Ensure USAGE on analytics schema for API roles
GRANT USAGE ON SCHEMA analytics TO authenticated;
GRANT USAGE ON SCHEMA analytics TO anon;
GRANT USAGE ON SCHEMA analytics TO service_role;

-- Ensure EXECUTE on the metric function
GRANT EXECUTE ON FUNCTION analytics.fn_get_or_calc_metric_data_v4 TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.fn_get_or_calc_metric_data_v4 TO anon;
GRANT EXECUTE ON FUNCTION analytics.fn_get_or_calc_metric_data_v4 TO service_role;

-- If the function accesses tables in analytics, they might need SELECT if it's SECURITY INVOKER
-- The user said it uses public.core_calculated_insights, so let's check that too.
GRANT SELECT, INSERT, UPDATE ON TABLE public.core_calculated_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.core_calculated_insights TO service_role;

-- Also ensure USAGE on public schema (usually already there)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
