## 2. Column Definitions

| Column | Type | Values | Purpose |
| --- | --- | --- | --- |
| *form_type* | TEXT | simple, dependent, composite, allocator, nested | Determines the UI form generation pattern. |
| *ai_resolution_strategy* | TEXT | direct, resolve_parent, chain_resolve, allocator_flow, nested_create | Determines the AI entity resolution approach. |
| *jsonb_schema* | JSONB | JSON Schema object | Extracted schema for details/custom JSONB validation. |

---

## Form Type Definitions

| Type | Description | FK Pattern | Example |
| --- | --- | --- | --- |
| *simple* | No complex dependencies | org_id + implicit context | hr.candidates, external.accounts |
| *dependent* | Single required parent FK | Must resolve parent first | hr.interviews (needs application_id) |
| *composite* | Multiple required parent FKs | Multi-entity resolution | hr.applications (candidate + requisition) |
| *allocator* | Parent + multi-select children | Matrix assignment | resource_requirements (project → workers[]) |
| *nested* | Header + items array | Composite document | timesheets (header + items[]) |

---

## AI Resolution Strategy Definitions

| Strategy | Trigger Example | Behavior |
| --- | --- | --- |
| *direct* | "Add a candidate" | Create with implicit org_id, user_id. |
| *resolve_parent* | "Add interview for application #123" | Resolve single parent, then create. |
| *chain_resolve* | "Add application for John to Python Dev role" | Resolve multiple parents sequentially. |
| *allocator_flow* | "Allocate workers to Project Alpha" | Resolve parent → prompt for children. |
| *nested_create* | "Add timesheet for last week" | Create header → prompt for items. |

> *Note:* The ai_resolution_strategy should be mapped closely to the form_type to ensure the LLM gathers all required foreign keys before attempting a database insert.
