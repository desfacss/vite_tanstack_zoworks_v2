# Walkthrough: JSONB Form Nesting Fix (V21.26)

**Session**: 2026-03-03 ~10:00–10:30 IST

## Problem
Forms generated via `core.api_new_generate_form_schema()` rendered JSONB columns (`details`, `vertical`, `custom`) as simple string fields instead of nested form objects.

## Root Cause
Three-layer gap in the metadata pipeline:
1. **Scanner**: `met_scan_schema_columns` discovered virtual fields from data sampling but did NOT attach them to the parent column's `nested_schema`
2. **Bootstrap**: The Composer's enrichment merge propagated most scanner metadata but not `nested_schema`. The blueprint's `jsonb_schema` injection also OVERWROTE scanner schemas instead of merging
3. **Form Generator**: `api_new_generate_form_schema` mapped `jsonb` type to `string` instead of `object`

## Fix (3 files modified)

| Layer | File | Change |
|-------|------|--------|
| Scanner | [schema.sql](file:///Users/macbookpro/zo_v2/zo_core_v5_supa/db/modules/core/schema.sql) | Build `nested_schema` from data-sampled virtual fields and merge with CHECK-constraint schemas |
| Bootstrap | [composer.sql](file:///Users/macbookpro/zo_v2/zo_core_v5_supa/db/modules/core/composer.sql) | Propagate scanner's `nested_schema` + merge (not overwrite) with blueprint's `jsonb_schema` |
| Form Gen | [api_gen_schema_current.sql](file:///Users/macbookpro/zo_v2/zo_core_v5_supa/db/modules/core/api_gen_schema_current.sql) | Map `jsonb` → `object`, inject `title` into `nested_schema` output |

## Verification

### `crm.accounts` — `details` field
**Before**: `{"type": "string", "title": "Details"}`
**After**:
```json
{
  "type": "object",
  "title": "Details",
  "properties": {
    "type": { "enum": ["customer","prospect","partner","competitor"], "type": "string" },
    "state": { "type": "string", "title": "State" },
    "address": { "type": "string", "title": "Address" },
    "country": { "type": "string", "title": "Country" },
    "contact_email": { "type": "string", "title": "Contact_email" },
    "contact_phone": { "type": "string", "title": "Contact_phone" },
    "contact_person": { "type": "string", "title": "Contact_person" }
  }
}
```

### Cross-entity bootstrap
| Entity | Bootstrap | Record Count |
|--------|-----------|-------------|
| `crm.accounts` | ✅ success | 1/1 |
| `crm.leads` | ✅ success | 0/0 |
| `crm.deals` | ✅ success | 1/1 |
| `crm.contacts` | ✅ success | — |

### `crm.leads` — JSONB fields all rendering as nested objects
`raci`, `custom`, `details`, `vertical_payload`, `unavailable_periods`, `preferred_work_hours`, `communication_preferences` — all correctly typed as `object`.

---
**Modified Files**:
- [schema.sql](file:///Users/macbookpro/zo_v2/zo_core_v5_supa/db/modules/core/schema.sql)
- [composer.sql](file:///Users/macbookpro/zo_v2/zo_core_v5_supa/db/modules/core/composer.sql)
- [api_gen_schema_current.sql](file:///Users/macbookpro/zo_v2/zo_core_v5_supa/db/modules/core/api_gen_schema_current.sql)
