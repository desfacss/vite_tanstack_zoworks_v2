---
description: How to correctly create a Software Design Document (SDD) for any module — covering use cases, technical contracts, and test cases. Use this before writing any new module SDD or when updating an existing one.
---

# /write-sdd — Workflow: Author a Module SDD

This workflow defines the step-by-step process for producing a correct, agent-ready Software Design Document for any module in the Zoworks platform.

> **Reference Sample**: `doc/SDD/modules/identity/` is the canonical example. Study it before authoring any new module SDD.

---

## Step 0: Pre-Flight — Read the Constitution

Before writing anything, read:
- [`doc/SDD/01_CONSTITUTION.md`](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/01_CONSTITUTION.md) — Platform-wide immutable rules
- [`doc/SDD/modules/00_INDEX.md`](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/00_INDEX.md) — Module registry (check if module already exists)

---

## Step 1: Gather Source Material

Collect from all three sources before writing a single line:

### 1A. Backend (Supabase) — `/Users/macbookpro/zo/zo_core_v6_supa/`
- Check `ARCHITECTURE.md` for schema classification and tier placement
- Find the schema in `db/migrations/` for actual table DDL and functions
- Search for `CREATE OR REPLACE FUNCTION {schema}.{function_name}` to get true signatures
- Check `SKILLS_AUDIT.md` and `EVOLUTION.md` for known gaps / pending migrations

### 1B. Frontend — `/Users/macbookpro/zo_v2/mini_project/src/`
- Identify the module folder under `src/modules/{module}/`
- Read `manifest.ts` for declared dependencies and entity types
- Read all `pages/*.tsx` and `components/*.tsx` — extract route paths, RPC calls, query keys, form names
- Look for `supabase.rpc(...)`, `supabase.functions.invoke(...)`, `supabase.schema(...).from(...)` calls

### 1C. Existing Docs — `doc/`
- Check `doc/05-21-2026/`, `doc/03-*/`, `doc/04-*/` for any written guides
- Check `doc/SDD/TODOFix/` for pending known bugs or scratch notes

---

## Step 2: Build the Folder Structure

Create exactly these files:

```
doc/SDD/modules/{module-name}/
├── MODULE_SPEC.md          ← Main SDD file (everything except tests)
├── CHANGE_LOG.md           ← OLD vs NEW spec evolution
└── tests/
    ├── sql_tests.sql               ← SQL tests, Phases 1–3
    ├── edge_function_tests.http    ← curl / .http tests for Edge Functions
    └── update_missing_data.sql     ← Upsert / repair patterns (if applicable)
```

Register the module in [`doc/SDD/modules/00_INDEX.md`](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/00_INDEX.md).

---

## Step 3: Write MODULE_SPEC.md

Use this exact section structure. Do NOT skip sections — use "N/A" if not applicable.

```markdown
# {Module Name} Module — Specification

## 1. Business Context & Purpose
- What problem does this module solve?
- What is the user's mental model?

## 2. Use Cases & Business Rules
For each major use case:
### UC-{N}: {Use Case Name}
- **Actor**: Who initiates
- **Trigger**: What condition causes it
- **Business Rules**: Numbered rules (BR-{N}.{M})
- **Outcome**: What succeeds

## 3. Schema Overview
Tables, classification (master/transactional/configuration), Tier placement, RLS state.

## 4. Backend Contracts
### 4.1 Edge Functions
For each Edge Function: Purpose, path, JWT verification status, request schema, response schemas (all variants), test curl command.

### 4.2 RPC Functions
For each RPC: Purpose, schema.function_name, parameters (with types + defaults), returns shape, idempotency behavior, test SQL.

### 4.3 Database Triggers
For each trigger: Table, event, function called, what it provisions.

## 5. Frontend Contracts
### 5.1 Routes
Table: Route | Component file | Auth required | Description

### 5.2 Components
For each key component: Path, props interface, behavior steps (numbered), query keys invalidated.

### 5.3 API Patterns
How the frontend calls Supabase (schema, from, rpc, functions.invoke patterns used).

## 6. Integration Flows
Mermaid sequence diagrams for the main end-to-end flows.

## 7. Configuration State
What config rows must exist in core.forms, core.view_configs, identity.modules for this module to work.

## 8. Known Issues & Gaps
Priority-tagged list of known bugs, pending migrations, or spec gaps. Reference issue IDs.
```

---

## Step 4: Write Tests (Phased Order)

Tests must be written and verified in this phase order. Do not write Phase 3 tests before Phase 1 passes.

| Phase | File | What it tests |
|-------|------|--------------|
| **Phase 1** | `sql_tests.sql` | Schema exists, RLS enabled, audit columns present |
| **Phase 2** | `sql_tests.sql` | RPC functions execute and return expected shape |
| **Phase 3** | `sql_tests.sql` | Triggers fire, bonded records provisioned |
| **Phase 4** | `edge_function_tests.http` | Edge Functions callable, response shapes match |
| **Phase 5** | Manual / E2E | Full flow from UI to DB verification |

### Test Format Rules
- **SQL tests**: Each test is a standalone `SELECT` or sequence with `-- Expected:` comment
- **Edge function tests**: Use `.http` format (VS Code REST Client compatible) + equivalent `curl` command
- **Every test has a TEST-{module_prefix}-{N} ID** so it can be referenced from `MODULE_SPEC.md`

---

## Step 5: Write CHANGE_LOG.md

Every spec change must be recorded as:

```markdown
## CHANGE-{N}: {Short Description}
**Date**: YYYY-MM-DD
**Status**: Proposed | Implemented | Reverted
**Affects**: {function/table/component name}

### OLD Behavior
{code or description}

### NEW Behavior
{code or description}

### Implementation Tasks
- [ ] {task}
```

---

## Step 6: Cross-Check Checklist

Before finalizing the SDD, verify:

- [ ] All RPC signatures in `MODULE_SPEC.md` match the actual function in the database/migrations
- [ ] Edge function curl commands use the correct auth pattern (JWT disabled → publishable key only)
- [ ] Every `ON CONFLICT` / upsert behavior is documented (safe to call twice?)
- [ ] Frontend components reference the correct `supabase.schema()` target
- [ ] All triggers are listed in Section 4.3 with what they provision
- [ ] Known P0/P1 issues from backend audit are listed in Section 8
- [ ] Module is registered in `00_INDEX.md`
- [ ] `CHANGE_LOG.md` has an initial entry for "Module SDD created"

---

## Step 7: Update 00_INDEX.md

Add a row to the modules table in [`doc/SDD/modules/00_INDEX.md`](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/00_INDEX.md):

```markdown
| {module} | {description} | Active | {key tables} | `modules/{module}/` |
```

---

## Reference: Identity Module as Sample

The identity module SDD at [`doc/SDD/modules/identity/`](file:///Users/macbookpro/zo_v2/mini_project/doc/SDD/modules/identity/) demonstrates every section correctly populated from real source code and backend SQL. Read it before starting any other module SDD.

Key patterns it demonstrates:
- **UC-1 through UC-4**: Four distinct use cases, each with its own rules and backend contract chain
- **Edge function response variants**: Multiple JSON shapes based on user state
- **Idempotent RPC**: How `ON CONFLICT` upsert behavior is documented
- **Trigger chain**: What fires on `INSERT INTO identity.organization_users`
- **Known gaps**: P0 RLS issues from the backend audit included in Section 8
