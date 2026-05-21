# Core Composer Module — Specification

> **Target Audience**: SaaS Administrators & System Architecture Only (Not available to Org Admins or Business Users)
> **Sources**: `core_schema_only.sql`, `.agent/workflows/composer-bootstrap.md`, `.agent/workflows/auto-register-blueprint.md`, `.agent/workflows/generate-entity-views.md`

---

## 1. Business Context & Purpose

The `core_composer` module is the strictly controlled, SaaS-Admin-exclusive dynamic metadata engine of the Zoworks platform. It takes a declarative intent (blueprint) and dynamically provisions realized database structures: complex relational views, sharding triggers, metadata registries, and UI configuration layouts. 

Because it operates at the structural level (generating SQL `CREATE VIEW` and `CREATE TRIGGER` statements dynamically), it is isolated from tenant-level operations and restricted from business users.

---

## 2. Use Cases & Business Rules (SaaS Admin Only)

### UC-1: Register a New Entity Blueprint
- **Actor**: SaaS Admin / Migration Script
- **Trigger**: System calls `core.comp_util_register_blueprint`
- **Business Rules**:
  - BR-1.1: Blueprint is stored in `core.entity_blueprints` as the definitive declarative intent.
  - BR-1.2: The blueprint dictates dependencies (`core.unified_objects`, `unified.contacts`), partition filters, AI semantics, and layout formatting.
- **Outcome**: The entity is marked for provisioning but not yet active in the physical layer.

### UC-2: Bootstrap Entity (Compile Blueprint)
- **Actor**: SaaS Admin (via `/composer-bootstrap` workflow)
- **Trigger**: System calls `core.comp_util_ops_bootstrap_entity`
- **Business Rules**:
  - BR-2.1: Protected schemas (`core`, `automation`) and ledger entities (`*_ledger`) are strictly rejected.
  - BR-2.2: Stage 1 (`comp_util_ops_bootstrap_stage_1`) introspects the base source and extensions, generating physical layer schema.
  - BR-2.3: Stage 1 saves the fully realized, introspected column metadata into `core.entities.v_metadata`.
  - BR-2.4: Stage 2 generates SQL for `INSTEAD OF` triggers and composes the `{schema}.v_{entity}` view.
- **Outcome**: The entity is fully compiled into a `v_` view, with active sharding triggers and UI metadata generated in `core.view_configs`.

### UC-3: Bulk Topological Rebootstrap
- **Actor**: SaaS Admin
- **Trigger**: Schema changes requiring cross-module regeneration via `core.utils_rebootstrap_all`
- **Business Rules**:
  - BR-3.1: Entities have a `bootstrap_generation` computed from dependency graphs (0 = no dependencies).
  - BR-3.2: Bootstrap runs strictly in generation order, ensuring dependencies (e.g., identity) are compiled before dependents (e.g., hr, crm).

---

## 3. Deep Dive: How the Core Composer Works

The Composer V5 is self-contained. When `comp_util_ops_bootstrap_entity` runs, it orchestrates the following:

### A. How the Auto `v_*` Views Are Created (`comp_util_generate_view_sql`)
The view is the unified logical interface for all reads and writes.
1. **Introspection & Column Aggregation**: The Composer scans `information_schema.columns` for the base table and all extension tables (dependencies).
2. **Virtual / Generated Columns**: If `is_phys_generated` is false, it dynamically parses JSONB paths to generate SQL extractions. For example, a JSON array mapped column becomes:
   `ARRAY(SELECT jsonb_array_elements_text(COALESCE(base.details #> '{path}', '[]'::jsonb)))::text[] AS my_col`.
3. **Display ID Collision Resolution**: If multiple joined tables have a `display_id`, it coalesces them: `COALESCE(base.display_id, ext.display_id) AS display_id`.
4. **Foreign Key Hydration (`_display` generation)**: If a column is a Foreign Key (and not polymorphic), the Composer automatically detects the target. It generates a `LEFT JOIN` to the target table and injects the target's `name` (or configured display column) as `{column_name}_display` in the `SELECT` list. 
   - *Example*: `account_id` automatically pulls in `fk_account.name AS account_display`.
5. **Join Strategy Assembly**: 
    - `core.unified_objects` and `unified.*` tables are **always LEFT JOINed**. This ensures a row is never excluded just because a unified tier row is missing or orphaned.
    - Tables in the same schema as the base use `LEFT JOIN`.
    - Cross-schema non-unified dependencies use `INNER JOIN`.
6. **Security Invoker**: The view is created using `CREATE OR REPLACE VIEW {schema}.v_{entity} WITH (security_invoker = on) AS SELECT * FROM ...` ensuring that underlying RLS policies of the base tables are respected during execution.

### B. How the Shard Functions & Triggers are Created (`comp_util_generate_trigger_sql`)
After the view is compiled, the Composer attaches complex `INSTEAD OF` triggers to the view.
1. **Trigger SQL Generation**: `core.comp_util_generate_trigger_sql` dynamically writes the trigger function based on the blueprint's classification (`transactional`, `anchor`, `contact_anchor`, `graduated`) and columns.
2. **Automatic Payload Hydration**:
    - Generates automatic ID assignment: `IF NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;`
    - Generates automatic Tenant Context: `IF NEW.organization_id IS NULL THEN NEW.organization_id := identity.get_current_org_id(); END IF;`
3. **Partition Filter Injection**: Parses the blueprint's `partition_filter` (e.g., `intent_type = 'CRM_CUSTOMER'`) and injects it directly into the trigger logic. If the frontend payload omits the `intent_type`, the trigger forces it to ensure the record belongs to the correct partition.
4. **Semantic Assignments**: Applies any runtime semantic assignments defined in `p_semantics->'assignments'` (e.g., conditionally setting a specific state category or enum based on other field values).
5. **Sharding Decomposition Logic**: When a frontend client or Edge Function runs `api_new_core_upsert_data` against the `v_` view, the generated `INSTEAD OF` trigger intercepts the JSON payload.
   - It writes the base fields to the core domain table (e.g., `crm.accounts`).
   - If `has_identity` is true (registration mode is anchor/graduated), it automatically creates or updates the Tier 1 shard row in `core.unified_objects` (passing URN, display ID, and state category) and the corresponding `unified.*` schema (e.g., `unified.contacts`).

---

## 4. Workflow: How to Add a New Entity

1. **Check Prerequisites**: Target base table must exist with lifecycle columns (`stage_id`, `state_category`, `intent_type`).
2. **Register Blueprint**:
   ```sql
   SELECT core.comp_util_register_blueprint(
       'crm', 'accounts', 'crm.accounts_base', 
       ARRAY['core.unified_objects', 'unified.contacts']
   );
   ```
3. **Attach Process Automation (ESM)**:
   - Insert an ESM lifecycle definition into `automation.bp_process_blueprints`.
   - Compile it via `automation.comp_core_compile_and_activate`.
4. **Bootstrap**:
   ```sql
   SELECT core.comp_util_ops_bootstrap_entity('crm', 'accounts', NULL, true);
   ```
5. **Verify End-to-End**:
   - Use `/test-entity-upsert` workflow:
   - Generate mock payload via `core.util_generate_mock_payload('crm', 'accounts')`.
   - Upsert via `core.api_new_core_upsert_data`.
   - Verify shard generation in `core.unified_objects` and `unified.contacts`.

---

## 5. Schema Overview
| Table | Classification | Tier | RLS | Notes |
|-------|---------------|------|-----|-------|
| `core.entity_blueprints` | `configuration` | N/A | STRICT (SaaS Admin) | Declarative intent, partition filters, AI config |
| `core.entities` | `configuration` | N/A | STRICT (SaaS Admin) | Realized metadata post-bootstrap (`v_metadata`) |
| `core.view_configs` | `configuration` | N/A | STRICT (SaaS Admin) | UI layout blobs mapped from the entity |
| `core.entity_blueprint_history` | `transactional` | N/A | STRICT (SaaS Admin) | Immutable audit trail of blueprint changes |
| `core.protected_triggers` | `configuration` | N/A | STRICT (SaaS Admin) | Custom triggers surviving bootstrap reruns |

---

## 6. Backend Contracts

### 6.1 RPC Functions

#### `core.comp_util_ops_bootstrap_entity(...)`
| Property | Value |
|----------|-------|
| **Purpose** | Compiles a blueprint into active views and triggers |
| **Returns** | `JSONB` status and logs |
| **Idempotent** | ✅ Safe to call repeatedly |

#### `core.api_new_core_upsert_data(...)`
| Property | Value |
|----------|-------|
| **Purpose** | Universal upsert gateway targeting `v_` views. Handled by shard triggers. |
| **Returns** | `UUID` of the new or updated record |
| **Idempotent** | ✅ Safe to call repeatedly |

### 6.2 Database Triggers
| Trigger | Table | Function Called | Purpose |
|---------|-------|----------------|---------|
| `trg_v_entity_blueprints_shard` | `core.entity_blueprints` | `core.sys_trg_snapshot_blueprint_history` | Creates snapshot history on blueprint updates |
| (Dynamically Generated) | `v_{entity}` views | (Dynamic Trigger Function) | `INSTEAD OF` inserts/updates mapped to underlying tables |

---

## 7. Configuration State & UI
This module manages its own configuration and provides the foundational UI state (`core.view_configs`) used by the dynamic form engine. Standard business users cannot access or edit blueprints.

## 8. Known Issues & Gaps
- GAP-001: The webhook queue lacks an active pg_cron or Edge Function consumer, causing CDC events spawned by the sharding triggers to back up silently.
- DEBT-001: `core.entities` contains legacy overlapping data with `core.entity_blueprints`. Next architecture phase must deprecate reads from `core.entities` where redundant.
