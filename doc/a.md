# Object Classification Reference (V4 Architecture)

> **Date**: 2026-02-07 | **Status**: DRAFT for Review

## Classification Model

| Type | Identity Anchor | Display ID | Automation | Use Case |
|------|-----------------|------------|------------|----------|
| **`master`** | `core.unified_objects` | Anchor-generated | Lifecycle ESM | Core business entities |
| **`transactional`** | None (shard-only) | Local v3 trigger | Approval ESM | High-volume documents |
| **`reference`** | None | None | None | Lookup/config data |
| **`analytical`** | None | None | None | Read-only aggregates |

---

## Object-Level Classification

### CRM Schema
| Entity | Current | Proposed | Unified | Display ID | ESM | BP Type |
|--------|---------|----------|---------|------------|-----|---------|
| `leads` | lifecycle | **master** | ✅ (via crm) | ✅ Local | ✅ | lifecycle |

### Construction Schema
| Entity | Current | Proposed | Unified | Display ID | ESM | BP Type |
|--------|---------|----------|---------|------------|-----|---------|
| `projects` | lifecycle | **master** | ❌ | ✅ Local | ✅ | lifecycle |

### ESM Schema
| Entity | Current | Proposed | Unified | Display ID | ESM | BP Type |
|--------|---------|----------|---------|------------|-----|---------|
| `service_requests` | lifecycle | **master** | ❌ | ✅ Local | ✅ | lifecycle |
| `service_catalog` | esm | **reference** | ❌ | ✅ Local | ❌ | - |

### External Schema (CRM Extension)
| Entity | Current | Proposed | Unified | Display ID | ESM | BP Type |
|--------|---------|----------|---------|------------|-----|---------|
| `deals` | master | **master** | ✅ | ✅ Local | ✅ | lifecycle |
| `contracts` | master | **master** | ✅ | ✅ Local | ❌ | - |
| `accounts` | master | **master** | ✅ | ❌ | ❌ | - |
| `contacts` | master | **master** | ✅ | ❌ | ❌ | - |
| `service_assets` | master | **master** | ✅ | ✅ Local | ❌ | - |
| `leads` | master | **master** | ❌ | ❌ | ❌ | - |
| `vendors` | master | **master** | ❌ | ❌ | ❌ | - |
| `partners` | master | **master** | ❌ | ❌ | ❌ | - |
| `prospects` | master | **master** | ❌ | ❌ | ❌ | - |
| `customers_*` (4) | master | **master** | ❌ | ❌ | ❌ | - |

### HR Schema
| Entity | Current | Proposed | Unified | Display ID | ESM | BP Type |
|--------|---------|----------|---------|------------|-----|---------|
| `applications` | lifecycle | **master** | ✅ | ✅ Local | ✅ | lifecycle |
| `candidates` | transactional | **master** | ✅ | ✅ Local | ✅ | lifecycle |
| `offers` | lifecycle | **master** | ✅ | ✅ Local | ❌ | - |
| `requisitions` | transactional | **master** | ✅ | ✅ Local | ❌ | - |
| `workers` | transactional | **master** | ✅ | ✅ Local | ❌ | - |
| `interviews` | transactional | **transactional** | ✅ | ❌ | ❌ | - |
| `assessments` | transactional | **transactional** | ✅ | ❌ | ❌ | - |
| `screenings` | transactional | **transactional** | ✅ | ❌ | ❌ | - |
| `policies` | transactional | **reference** | ✅ | ❌ | ❌ | - |
| `policy_documents` | transactional | **reference** | ✅ | ❌ | ❌ | - |
| `employees/consultants/contractors` | transactional | **reference** | ❌ | ❌ | ❌ | - |

### Workforce Schema
| Entity | Current | Proposed | Unified | Display ID | ESM | BP Type |
|--------|---------|----------|---------|------------|-----|---------|
| `timesheets` | transactional | **transactional** | ❌ | ✅ Local | ✅ | approval |
| `expense_sheets` | transactional | **transactional** | ❌ | ✅ Local | ✅ | approval |
| `leave_applications` | transactional | **transactional** | ❌ | ✅ Local | ✅ | approval |

### Blueprint Schema (Templates)
| Entity | Current | Proposed | Unified | Display ID | ESM | BP Type |
|--------|---------|----------|---------|------------|-----|---------|
| `projects` | transactional | **master** | ✅ | ✅ Local | ❌ | - |
| `tasks` | transactional | **master** | ✅ | ✅ Local | ❌ | lifecycle |
| `tickets` | transactional | **master** | ✅ | ✅ Local | ✅ | lifecycle |
| `invoices` | transactional | **master** | ✅ | ✅ Local | ❌ | lifecycle |
| `service_reports` | transactional | **master** | ✅ | ✅ Local | ✅ | lifecycle |

### CTRM Schema (Commodity Trading)
| Entity | Current | Proposed | Unified | Display ID | ESM | BP Type |
|--------|---------|----------|---------|------------|-----|---------|
| `trades` | transactional | **master** | ❌ | ❌ | ❌ | lifecycle |
| `contracts` | transactional | **master** | ❌ | ❌ | ❌ | lifecycle |
| `shipments` | transactional | **transactional** | ❌ | ❌ | ❌ | lifecycle |
| Others (9) | transactional | **reference** | ❌ | ❌ | ❌ | - |

### Unified Schema (Intermediate Layer)
| Entity | Current | Proposed | Unified | Display ID | ESM | BP Type |
|--------|---------|----------|---------|------------|-----|---------|
| `contacts` | transactional | **master** | ✅ | ❌ | ❌ | - |
| `organizations` | transactional | **master** | ✅ | ❌ | ❌ | - |
| `projects` | transactional | **master** | ✅ | ✅ Local | ❌ | - |
| `tasks` | transactional | **master** | ✅ | ❌ | ❌ | - |
| `tickets` | transactional | **master** | ✅ | ❌ | ❌ | - |

### Identity Schema (Configuration)
| Entity | Current | Proposed | Unified | Display ID | ESM | BP Type |
|--------|---------|----------|---------|------------|-----|---------|
| `organizations` | master | **master** | ❌ | ❌ | ❌ | - |
| `locations` | transactional | **reference** | ❌ | ❌ | ❌ | - |
| `users` | transactional | **reference** | ❌ | ❌ | ❌ | - |
| `roles` | transactional | **reference** | ❌ | ❌ | ❌ | - |
| `teams` | transactional | **reference** | ❌ | ❌ | ❌ | - |
| Others (5) | transactional | **reference** | ❌ | ❌ | ❌ | - |

### Analytics Schema
| Entity | Current | Proposed | Unified | Display ID | ESM | BP Type |
|--------|---------|----------|---------|------------|-----|---------|
| `deals_summary` | transactional | **analytical** | ❌ | ❌ | ❌ | - |
| `payroll_summary` | transactional | **analytical** | ❌ | ❌ | ❌ | - |
| `stage_duration_summary` | transactional | **analytical** | ❌ | ❌ | ❌ | - |
| `team_payroll` | transactional | **analytical** | ❌ | ❌ | ❌ | - |
| `tickets_summary` | transactional | **analytical** | ❌ | ❌ | ❌ | - |

### AI/MCP Schema
| Entity | Current | Proposed | Unified | Display ID | ESM | BP Type |
|--------|---------|----------|---------|------------|-----|---------|
| `agents` | transactional | **reference** | ❌ | ❌ | ❌ | - |

---

## Automation Blueprint Types

| BP Type | Purpose | ESM Pattern | Typical Entities |
|---------|---------|-------------|------------------|
| **`lifecycle`** | Progressive stages | Non-linear state machine | Projects, Deals, Tickets |
| **`approval`** | Binary validation | Gated linear flow | Timesheets, Expenses |
| **`orchestration`** | Cross-entity coordination | Parent-child sync | Sales→Delivery, Recruit→Onboard |

---

## Summary of Changes Required

| Classification | Current Count | Proposed Count | Delta |
|----------------|---------------|----------------|-------|
| `master` | 14 | **36** | +22 |
| `transactional` | 52 | **15** | -37 |
| `reference` | 0 | **15** | +15 |
| `analytical` | 0 | **5** | +5 |
| `lifecycle` (REMOVE) | 5 | 0 | -5 |
| `esm` (REMOVE) | 1 | 0 | -1 |

---

## Form Complexity Types

Beyond classification, each entity has a **form complexity** that determines RJSF generation and UI behavior.

| Form Type | FK Dependencies | Example | Form Pattern |
|-----------|-----------------|---------|--------------|
| **`simple`** | None or single lookup | `hr.candidates`, `external.accounts` | Direct RJSF from schema |
| **`dependent`** | Single required parent | `hr.interviews` (needs `application_id`) | Parent context required |
| **`composite`** | Multiple required parents | `hr.applications` (needs `candidate_id` + `requisition_id`) | Multi-step wizard or joint selection |
| **`allocator`** | Parent + multi-select children | `workforce.resource_requirements` (project → workers/assets) | Matrix/allocation interface |
| **`nested`** | Header + items array | `workforce.timesheets` (header + timesheet_items) | Editable table within form |

### Entity Form Complexity Examples

| Entity | Form Type | Dependencies | UI Pattern |
|--------|-----------|--------------|------------|
| `hr.candidates` | simple | org_id (implicit) | Single-page form |
| `hr.requisitions` | simple | org_id (implicit) | Single-page form |
| `hr.applications` | composite | candidate_id + requisition_id | Wizard: Select Req → Select/Create Candidate |
| `hr.interviews` | dependent | application_id | Inline from application detail |
| `workforce.timesheets` | nested | user_id + items[] | Header + editable items table |
| `construction.resource_requirements` | allocator | project_id + worker_ids[] | Project context → multi-select workers |
| `external.deals` | dependent | account_id/lead_id | Context from parent or create flow |

---

## AI Resolution Patterns

When AI processes a natural language request, the **resolution strategy** depends on form complexity:

| Request Pattern | Resolution Type | Strategy |
|-----------------|-----------------|----------|
| "Add a candidate" | **Direct** | Create single record with implicit org_id |
| "Add an application for John to the Python Dev role" | **Composite Resolve** | 1. Resolve "John" → candidate_id<br>2. Resolve "Python Dev" → requisition_id<br>3. Create application |
| "Allocate workers to Project Alpha" | **Allocator Flow** | 1. Resolve "Project Alpha" → project_id<br>2. List available workers<br>3. Confirm selection<br>4. Create resource_requirements[] |
| "Add timesheet for last week" | **Nested Create** | 1. Create timesheet header (week dates)<br>2. Prompt for items (date, hours, project) |

### AI Entity Metadata Requirements

| Form Type | Required Metadata | Resolution Fields |
|-----------|-------------------|-------------------|
| `simple` | `organization_id`, `user_id` (from JWT) | Direct field mapping |
| `dependent` | Parent entity type + FK column | Name/display_id → UUID lookup |
| `composite` | All parent entity types + FK columns | Multi-entity resolution chain |
| `allocator` | Parent entity + child entity types | Parent → child multi-select |
| `nested` | Header fields + items schema | Composite header + array items |

### Proposed `semantics` Extension

To enable dynamic AI/UI resolution, extend `core.entity_blueprints.semantics`:

json
{
  "form_type": "composite",
  "resolution": {
    "dependencies": [
      {"field": "candidate_id", "entity": "hr.candidates", "resolve_by": ["name", "email"]},
      {"field": "requisition_id", "entity": "hr.requisitions", "resolve_by": ["display_id", "title"]}
    ],
    "creation_flow": "wizard",
    "allow_inline_create": ["candidate_id"]
  },
  "ai_prompt_hints": {
    "create": "To add an application, I need: 1) Which candidate? 2) Which job requisition?",
    "ambiguity": "Found multiple matches for '{term}'. Please clarify: {options}"
  }
}


---

## Field Resolution for AI/UI (Updated)

| Classification | Form Type | Field Source | AI Strategy | UI Pattern |
|----------------|-----------|--------------|-------------|------------|
| `master` | simple/dependent | unified + shard | Direct resolve | Rich forms |
| `master` | composite | unified + shard | Chain resolve | Multi-step wizard |
| `master` | allocator | unified + shard | Parent → children | Matrix interface |
| `transactional` | nested | shard only | Header + items | Editable table |
| `transactional` | simple | shard only | Activity-based | Simple forms |
| `reference` | simple | shard only | Lookup cache | Select/Dropdown |
| `analytical` | N/A | Materialized view | Read-only | Charts |