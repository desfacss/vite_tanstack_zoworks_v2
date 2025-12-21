Metadata-Driven View Configuration Generator
A PostgreSQL function system to automatically generate view configurations for entities based on their metadata.

User Review Required
IMPORTANT

Schema Assumption: This plan assumes core.view_configs structure matches the CSV export. Please confirm.

WARNING

Dry Run Default: Function defaults to p_dry_run = TRUE, returning suggestions without persisting.

Column Selection Logic
Source Data
All column selection is driven by the v_metadata column from core.entities, which contains an array of field objects with these key attributes:

Attribute	Type	Purpose
is_displayable	boolean	Primary filter - Only true columns are candidates for any view
is_searchable	boolean	Marks text fields for search, also used to identify "title-like" fields
is_mandatory	boolean	Higher priority in column ordering
semantic_type.role	string	'dimension' vs 'measure' - drives metrics/aggregation logic
semantic_type.sub_type	string	'temporal', 'discrete', 'continuous', 'hierarchy'
foreign_key	object	Presence indicates FK display column candidate
is_virtual	boolean	Derived from JSONB - lower priority than physical columns
Column Count per View Type
View Type	Target Count	Reasoning
TableView	8-12 columns	Balance between information density and readability
GridView	4-6 fields	Card layout needs compact info
KanbanView	3-5 card fields	Quick scanning of swimlane cards
DetailView	All displayable	Full entity details, grouped by source
MapView	3-5 popup fields	Tooltip/popup constraints
CalendarView	2-3 fields	Title + description sufficient
MetricsView	2-4 measures + 2-3 dimensions	Chart complexity limits
Field Prioritization Algorithm
TableView Priority Order
Score = 
  (is_mandatory ? 100 : 0) +
  (key IN ['display_id','name','title'] ? 90 : 0) +
  (is_searchable ? 50 : 0) +
  (foreign_key IS NOT NULL ? 40 : 0) +
  (semantic_type.sub_type = 'temporal' ? 30 : 0) +
  (NOT is_virtual ? 20 : 0) +
  (type != 'jsonb' ? 10 : 0)
Selection Logic:

Filter: is_displayable = true
Exclude: key IN ('id', 'organization_id', 'created_by', 'updated_by') (system fields)
Score all remaining columns
Sort by score DESC
Take top 10 (configurable)
GridView Priority Order
Title:    First of ['name', 'display_name', 'display_id', 'title', 'subject']
Subtitle: First FK where foreign_key.display_column = 'name'
Tags:     First column where type = 'text[]'
Badge:    First of ['stage_id', 'status', 'is_active']
Extra:    Next 2-3 highest-scored is_displayable columns
KanbanView Priority Order
Prerequisite Check:

-- Must have stage_id or blueprint-driven stages
EXISTS(SELECT 1 FROM v_metadata WHERE key = 'stage_id')
  OR EXISTS(SELECT 1 FROM automation.bp_process_blueprints 
            WHERE entity_type = p_entity_type AND is_active = true)
Card Fields:

Title:       Same as GridView title
Description: First column where key ILIKE '%description%' OR key ILIKE '%summary%'
Assignee:    First FK to identity.users (foreign_key.source_table ILIKE '%users%')
Due Date:    First temporal column where key ILIKE '%due%' OR '%deadline%'
DetailView Grouping Logic
Group 1 - "Primary Details":
  Columns WHERE is_displayable = true 
    AND is_virtual = false 
    AND foreign_key IS NULL
    AND type != 'jsonb'
Group 2+ - "JSONB Groups" (one per parent):
  Columns WHERE is_virtual = true
  Grouped by jsonb_column value
  Group name = INITCAP(jsonb_column)
Group N - "Related Entities":
  One group per unique foreign_key.source_table
  Contains FK column + its display value
MapView Field Selection
Prerequisite Check:

-- Must have lat/lng OR geometry column
EXISTS(SELECT 1 FROM v_metadata WHERE key IN ('lat','latitude','lng','longitude','coordinates'))
  OR EXISTS(SELECT 1 FROM v_metadata WHERE type IN ('geometry','geography'))
Popup Fields:

1. 'name' or 'display_id' (title)
2. First FK display column (info line)
3. 'address' or similar location field if exists
4. First 2 is_searchable columns not already included
MetricsView Field Detection
Measures (for aggregations):

SELECT * FROM v_metadata 
WHERE semantic_type->>'role' = 'measure'
   OR key ILIKE ANY(ARRAY['%amount%','%count%','%total%','%revenue%','%cost%'])
   OR type IN ('integer','numeric','decimal')
Dimensions (for GROUP BY):

SELECT * FROM v_metadata 
WHERE semantic_type->>'role' = 'dimension'
   OR foreign_key IS NOT NULL
   OR key IN ('stage_id','status','category_id','type')
Time Dimension:

SELECT key FROM v_metadata 
WHERE semantic_type->>'sub_type' = 'temporal'
ORDER BY 
  CASE key 
    WHEN 'created_at' THEN 1 
    WHEN 'updated_at' THEN 2 
    ELSE 3 
  END
LIMIT 1
Proposed Functions
All functions use prefix view_ per your requirement.

Orchestrator
[NEW] core.view_suggest_configs
CREATE OR REPLACE FUNCTION core.view_suggest_configs(
    p_entity_id UUID,
    p_dry_run BOOLEAN DEFAULT TRUE
) RETURNS JSONB
Helper Functions
Function	Purpose
core.view_int_suggest_tableview	TableView configuration
core.view_int_suggest_gridview	GridView/Card configuration
core.view_int_suggest_kanbanview	KanbanView configuration
core.view_int_suggest_detailview	DetailView configuration
core.view_int_suggest_calendarview	CalendarView configuration
core.view_int_suggest_mapview	MapView configuration
core.view_int_suggest_metricsview	MetricsView configuration
Implementation Order
Phase	Function	Dependencies
1	view_int_suggest_tableview	None
2	view_int_suggest_gridview	TableView patterns
3	view_int_suggest_detailview	None
4	view_int_suggest_kanbanview	Blueprint detection
5	view_int_suggest_calendarview	Temporal detection
6	view_int_suggest_mapview	Geo column detection
7	view_int_suggest_metricsview	Semantic type parsing
8	view_suggest_configs	All helpers
Verification Plan
Test Cases
-- Test 1: TableView generation
SELECT core.view_suggest_configs('<entity_id>'::UUID, TRUE)->'tableview';
-- Test 2: KanbanView detection (entity with stage_id)
SELECT core.view_suggest_configs('<staged_entity_id>'::UUID, TRUE)->'kanbanview';
-- Test 3: Verify column count <= 12 for tableview
SELECT jsonb_array_length(
  core.view_suggest_configs('<entity_id>'::UUID, TRUE)->'tableview'->'fields'
) <= 12;
Output Format
{
  "general": {
    "default_view": "tableview",
    "available_views": ["tableview", "gridview", "detailview"]
  },
  "tableview": {
    "fields": [
      {"order": 1, "fieldName": "Name", "fieldPath": "name"},
      {"order": 2, "fieldName": "Organization", "fieldPath": "organization_name"}
    ],
    "defaultSort": "created_at:desc",
    "showFeatures": ["search", "pagination", "sorting"]
  },
  "gridview": { /* ... */ },
  "kanbanview": null,
  "detailview": { /* ... */ },
  "_meta": {
    "generated_at": "2025-12-11T17:43:00Z",
    "applicable_views": ["tableview", "gridview", "detailview"]
  }
}