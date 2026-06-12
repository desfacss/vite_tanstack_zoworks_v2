# Generic Entity CSV Upload — API & UI Consumer Guide
**Single Source of Truth for Frontend Integration**

> **Date:** 2026-06-12
> **Session:** 2026-06-12 ~12:15 IST
> **Scope:** Complete guide for UI and API consumers to implement generic CSV/Excel uploads for any schema and entity.
> **Backend References:** `supabase/migrations/20260612000300_core_bulk_import.sql` and edge function `import-entity-data`.

---

## 1. Architecture Overview

The generic entity import is a batch facade over the standard `api_new_core_upsert_data`. It is entirely metadata-driven via `core.entities.v_metadata`. **Any entity** registered in `core.entities` can be imported using the exact same API edge function. 

### API Endpoint
`POST /functions/v1/import-entity-data`

The edge function handles three distinct `action` phases: `schema`, `parse`, and `import`.

---

## 2. The 3-Stage UI Flow

### Stage 1: Schema Discovery (When Import UI Opens)
Before the user selects a file, fetch the schema definition to populate the column mapping UI.

**Request:**
```json
{
  "action": "schema",
  "entity_schema": "unified",
  "entity_type": "tasks"
}
```

**Response Usage:**
The response contains a `fields` array. Use this to render the target dropdowns in the UI. Exclude `system_fields` (like `id`, `created_at`) from mapping options.

### Stage 2: File Parse & Preview (When File is Uploaded)
When the user uploads a CSV, pass the text to the edge function to get headers, a preview, and auto-mapping suggestions.

**Request:**
```json
{
  "action": "parse",
  "entity_schema": "unified",
  "entity_type": "tasks",
  "csv_text": "...",
  "delimiter": "," 
}
```

**Response Usage:**
Render a **Column Mapper** UI. Use `suggested_map` to auto-select target fields. Highlight unmatched headers so the user can manually map them or choose "Skip". Render a preview table of the first 5 rows, highlighting validation errors early.

### Stage 3: Dry-Run & Import
After mapping, run a dry-run to validate all rows without committing. Then perform the actual import in chunks (max 500 rows per request).

**Request:**
```json
{
  "action": "import",
  "entity_schema": "unified",
  "entity_type": "tasks",
  "rows": [ { "Task Name": "Fix AC", "Priority": "High" } ],
  "column_map": {
    "Task Name": "name",
    "Priority": {
      "field": "priority",
      "enum_map": { "High": "high", "Low": "low" }
    }
  },
  "context": {
    "fixed_fields": { "project_id": "uuid", "organization_id": "uuid" },
    "on_conflict": "skip",
    "conflict_key": ["name", "project_id"]
  },
  "dry_run": true // Set to false when user clicks "Confirm Import"
}
```

**Response Usage:**
The `result` object contains `{ imported, failed, skipped, rows: [{ status, error }] }`. 
- **Dry Run**: Present a summary (e.g., "✅ 42 ready, ❌ 2 errors"). Allow downloading an error CSV.
- **Commit**: Chunk the client's `allRows` array into sizes of 500 and sequentially call the API with `dry_run: false`. Provide a progress bar in the UI.

---

## 3. UI Implementation Checklist

- [ ] **Import Drawer Component:** Reusable drawer that accepts `entity_schema`, `entity_type`, and `fixedFields`.
- [ ] **Context Pre-fill:** Show fixed fields (like "Project") as uneditable badges at the top of the mapper.
- [ ] **Column Mapper:** Dropdowns for target fields. Support simple renaming, enum mapping, and FK display-name mapping.
- [ ] **Validation Preview Table:** Show a 5-row preview. Red borders around invalid cells.
- [ ] **Chunked Upload:** Client-side iteration for >500 rows to prevent edge function timeouts.
- [ ] **Error CSV Export:** If the import (or dry-run) fails on specific rows, generate a CSV of the failed rows with an extra `Error` column appended.

---

## 4. How to Test in the React UI

1. **Verify Schema Discovery:** Open the Import Drawer for `unified.tasks`. Ensure the dropdowns correctly show all fields (like `name`, `phase_id`) and hide system fields.
2. **File Parsing & Auto-Map:** Upload a small CSV where headers match exactly, slightly mismatch (e.g. "Task Name" vs "name"), and completely mismatch. Verify the UI auto-suggests correctly.
3. **Enum Normalisation:** Upload a CSV with "Status" as "In Progress". Map it to `state_category` and verify the UI allows you to map "In Progress" to the DB enum `IN_PROGRESS`.
4. **FK Resolution (Name to UUID):** Upload a CSV with "Phase A". Ensure the column mapper allows mapping this to `phase_id` with an FK lookup (by name).
5. **Dry Run Validation:** Click "Preview/Dry Run". Verify no database rows are created, but the UI shows validation errors for intentionally broken rows (e.g., missing required names).
6. **Error Export:** On the dry-run screen, click "Download Error Report" and verify it generates a CSV with the original data + error reasons.
7. **Chunked Import:** Upload a CSV with 1,200 rows. Verify the UI progress bar increments as it sends chunks of 500, and the database receives exactly 1,200 rows with the correct `organization_id` fixed field injected.

---

## 5. ReactJS Integration Examples

The React UI will interact with the Supabase Edge Function using `supabase.functions.invoke()`. Here are the standard calls for each stage:

### Fetching Schema (Stage 1)
```typescript
const fetchSchema = async (entitySchema: string, entityType: string) => {
  const { data, error } = await supabase.functions.invoke('import-entity-data', {
    body: {
      action: 'schema',
      entity_schema: entitySchema,
      entity_type: entityType
    }
  });
  if (error) throw error;
  return data.schema; // Returns { fields: [...], system_fields: [...] }
};
```

### Parsing CSV File (Stage 2)
```typescript
const parseCsv = async (fileText: string, entitySchema: string, entityType: string) => {
  const { data, error } = await supabase.functions.invoke('import-entity-data', {
    body: {
      action: 'parse',
      entity_schema: entitySchema,
      entity_type: entityType,
      csv_text: fileText,
      delimiter: ','
    }
  });
  if (error) throw error;
  // Returns headers, 5-row preview, all_rows, suggested_map, and schema_fields
  return data;
};
```

### Dry Run & Import Commit (Stage 3 & 4)
```typescript
const commitImport = async (
  rowsChunk: any[], 
  columnMap: any, 
  importContext: any, 
  isDryRun: boolean
) => {
  const { data, error } = await supabase.functions.invoke('import-entity-data', {
    body: {
      action: 'import',
      entity_schema: 'unified', // or crm, esm, etc.
      entity_type: 'tasks',
      rows: rowsChunk,
      column_map: columnMap,
      context: importContext,
      dry_run: isDryRun
    }
  });
  if (error) throw error;
  // Returns { imported, failed, skipped, rows: [{ status, error }] }
  return data.result; 
};
```

---

## 6. Key Takeaways for UI Testing

To ensure the React UI implementation perfectly aligns with the `api_new_core_upsert_data` generic pipeline, here is how the frontend should be tested:

1. **Schema Discovery Check:** Open the import UI and verify that the first stage correctly calls the `schema` action and renders the target columns (e.g., `phase_id`, `priority`) while explicitly hiding system columns (like `id` or `created_at`).
2. **Auto-Map & Preview:** Upload a test CSV with headers that slightly mismatch the DB schema (e.g., "Task Name" instead of "name"). The edge function uses fuzzy matching; ensure the UI successfully maps the suggestions and renders a 5-row preview highlighting any invalid cells in red.
3. **Enum Normalisation:** Upload a file where the status is "In Progress" and verify the column mapper interface allows you to map that raw string to the DB enum `IN_PROGRESS`.
4. **FK Resolution (Display Name to UUID):** Map a text column (like "Phase A") to a UUID column (`phase_id`). Validate that the UI correctly configures the `fk_config` so the DB can resolve the name to a UUID dynamically.
5. **Dry Run Validation:** Run the import with `dry_run: true`. Ensure no records are actually inserted into the DB, and the API returns a simulated error report (e.g., "2 rows failed due to missing required name").
6. **Error Export:** Test the "Download Error Report" feature from the dry run. It should generate a CSV containing the original data with an appended `Error` column explaining the failures.
7. **Chunked Final Import:** Upload a large CSV (>500 rows) and verify that the React client successfully chunks the payload into batches of 500 rows or fewer, avoiding edge function timeout limits, while maintaining the global progress bar.

---
**Modified Files / DB Objects Documented:**
- `core.api_bulk_import`
- `core.api_get_import_schema`
- Edge Function `import-entity-data`