### 📘 System Reference: Entity Capabilities Engine

**Object:** `core.met_entity_get_capabilities`

#### 1\. Purpose & Strategy

  * **Role:** Middleware between raw Schema Metadata (`core.entities.metadata`) and UI/AI Agents.
  * **Strategy:** "Write-Heavy, Read-Light." Complex logic runs once during schema changes (via trigger) to enable O(1) instant reads for UI rendering and AI context injection.
  * **AI Benefit:** Reduces context window usage by \~85% (vs raw metadata) by stripping physical DB attributes (foreign keys, constraints) and keeping only interaction logic.

#### 2\. Architecture

  * **Source:** `core.entities.metadata` (JSONB).
  * **Target:** `core.entities.capabilities` (JSONB).
  * **Trigger:** `trg_refresh_capabilities` (Fires on `INSERT` or `UPDATE` of metadata).
  * **Safety:** Contains "Root Fix" logic—automatically detects and unwraps metadata whether it is stored as a raw array `[...]` or wrapped object `{ "columns": [...] }`.

#### 3\. Capabilities Logic Matrix

| Capability | Condition | Output Details |
| :--- | :--- | :--- |
| **Search** | `is_searchable = true` | `uiHint` inferred from column name (email, phone, date, text). |
| **Filter** | `!is_virtual` | `operators` mapped by type (e.g., int gets `>`, `<`, `=`; text gets `ilike`, `in`). `uiType` hints (checkbox, date, multiselect). |
| **Sort** | `!is_virtual` + Valid Type | Allowed for numeric, date, text. `defaultDirection` inferred (e.g., recent dates first). |
| **Default** | *Heuristic Scan* | Priority: `created_at` (desc) \> `updated_at` (desc) \> `due_date` (asc) \> `id` (asc). |

#### 4\. JSON Output Contract (The UI/AI Payload)

```json
{
  "entity": "schema.table",
  "defaultSort": "created_at:desc",
  "supportsCursor": true,
  "searchableFields": [
    { "field": "name", "label": "Name", "uiHint": "text", "type": "text" }
  ],
  "filterableFields": [
    { 
      "field": "status", 
      "label": "Status", 
      "uiType": "text", 
      "operators": ["=", "ilike", "in", "null"] 
    }
  ],
  "sortableFields": [
    { "field": "created_at", "label": "Created At", "defaultDirection": "desc" }
  ]
}
```

#### 5\. Maintenance Commands

  * **Force Refresh (Single):** Update row metadata (trigger handles rest).
  * **Force Refresh (Bulk):**
    ```sql
    UPDATE core.entities 
    SET capabilities = core.met_entity_get_capabilities(entity_schema || '.' || entity_type);
    ```

#### 6\. Next Actions for AI Context

  * **Prompting Agent for UI Generation:** Pass `capabilities` column.
  * **Prompting Agent for SQL/DB Architecting:** Pass `metadata` column.