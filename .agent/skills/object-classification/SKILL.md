---
name: object-classification
description: Domain expertise for the V4 Object Classification System, form complexity matrix, and AI resolution strategies.
---

# Object Classification System (V4 Architecture)

This skill provides the definitive rules for entity classification, form generation, and AI resolution patterns within the V4 system. Use this skill when configuring `core.entity_blueprints` or validating the `core.entities` registry.

## 1. Core Classification Tiers

| Tier | Characteristics | Identity Anchor | Partition Field |
| :--- | :--- | :--- | :--- |
| **`master`** | High-value business logic, long lifecycles. | `core.unified_objects` | `organization_id` + `location_id` (opt) |
| **`transactional`**| High-volume documents, approval-based. | Shard Only | `organization_id` + `location_id` (opt) |
| **`reference`** | Static or slow-moving lookups. | Shard Only | `organization_id` |
| **`definition`** | System configs/rules. NULL Org = Global. | Shard Only | `organization_id` (NULL = Global) |
| **`analytical`** | Aggregated data, read-only stats. | N/A (Views) | N/A |

---

> [!IMPORTANT]
> **CANONICAL REQUIREMENT**: All physical tables for `master`, `transactional`, and `reference` tiers **MUST** implement the **L1 Audit** and **L2 Lifecycle Footprint** layers defined in the [5-Layer Column Model](file:///Users/macbookpro/zo_v2/zo_core_v4_supa/.agent/skills/schema-evolution/SKILL.md#L13).

## 2. Case Study: Approval Objects

Approvals (e.g., `workforce.leave_applications`, `hr.offers`) are the heart of V4's transactional logic.

- **Tier**: `transactional` (Avoids global search noise, focuses on lifecycle).
- **Form Type**: `simple` (header only) or `dependent` (if linked to a specific parent like `requisition`).
- **AI Resolution**: `direct` or `resolve_parent`.
- **Identity**: Always uses `v3` trigger on shard for local `display_id` (e.g. `LEA-2026-001`).
- **ESM Layer**: Mandatory. Insert triggers ESM orchestration.

## 3. Combination Matrix & Implementation Requirements

Each combination of **Tier**, **Form Type**, and **AI Resolution** has specific architectural needs.

| Combination | Tier | Form Type | AI Resolution | Success Requirements |
| :--- | :--- | :--- | :--- | :--- |
| **M1 (Core)** | `master` | `simple` | `direct` | `unified_objects` register trigger + direct shard upsert. |
| **M2 (Relational)** | `master` | `dependent` | `resolve_parent` | `semantics.resolution.dependencies` populated + parent resolution. |
| **M3 (Discovery)**| `master` | `composite` | `chain_resolve` | `jsonb_schema` presence + multi-FK resolution chain. |
| **T1 (Doc Header)**| `transactional`| `simple` | `direct` | `EXIST` check in trigger (ESM safety) + local `display_id`. |
| **T2 (Doc Nested)**| `transactional`| `nested` | `nested_create` | Recursive `items` loop in trigger + `organization_id` inheritance. |
| **T3 (Allocator)**| `transactional`| `allocator` | `allocator_flow` | `vertical_payload` support + multi-assignment logic. |

---

## 4. Implementation Steps (Architectural Guardrails)

### For EVERY Entity:
1.  **5-Layer Audit**: Ensure L1 (Audit) and L2 (Lifecycle) columns are present.
2.  **Multitenant Partitioning**:
    -   Must have `organization_id`.
    -   Should have optional `location_id` for spatial partitioning (can be NULL).
    -   For **`definition`** entities: `organization_id` NULL = Global standard.
3.  **Identity Cohesion**: Follow the **Shared UUID Pattern** for extensions and nested items.
4.  **Blueprint Definition**: Populate `entity_schema`, `entity_type`, `classification`, `form_type`, and `ai_resolution`.
5.  **Bootstrap execution**: Run `core.comp_util_ops_bootstrap_entity()`.
6.  **Registry Check**: Verify the projection in `core.entities`.

### For `master` entities:
-   **Identity Link**: Attach `sys_trg_register_unified_object` to the physical shard table.
-   **Display ID**: Ensure `display_id` is NOT handled locally if using global sequence.

### For `dependent` or `composite` entities:
-   **Semantic Mapping**: Populate `semantics.resolution.dependencies` with the required parent entities and fields.
-   **Form Schema**: Extract or define `jsonb_schema` to enable rich wizard/form generation.

### For `nested` entities:
-   **Sub-Projection**: Ensure the `v_*` view includes the items array via a subquery.
-   **Trigger Handling**: Use the Composer V21.3 `INSTEAD OF` trigger pattern to loop through the `items` array and upsert children.

---

## 5. Universal Success Checklist (V4 Compliance)

An entity is considered **"Successfully Provisioned"** only when:

1.  **Registry Projection**: `core.entities` contains a non-null `form_type`, `ai_resolution`, and `module`.
2.  **Trigger Robustness**:
    -   **Automation Safety**: Base triggers use `IF EXISTS` check instead of `ON CONFLICT` to avoid duplicate ESM instances.
    -   **Audit Protection**: `UPDATE` branches use `COALESCE` to preserve `created_at`.
3.  **Logical Layer**: `v_[entity_type]` view exists and is view-aware (filters correct columns).
4.  **Schema Safety**: If `form_type` is NOT `simple`, a `jsonb_schema` MUST be present (auto-extracted or explicit).

---

## 6. Classification Change Workflow

When changing an entity's classification (e.g., `master` → `transactional`), follow these steps:

### Step 1: Update the Blueprint

```sql
UPDATE core.entity_blueprints 
SET classification = 'transactional',      -- New classification
    base_source = 'schema.physical_table'  -- Ensure base_source is correct
WHERE entity_schema = 'your_schema' 
  AND entity_type = 'your_entity';
```

### Step 2: Rebootstrap the Entity

```bash
./.agent/scripts/bootstrap-entity.sh <schema> <entity_type>
```

This regenerates the trigger and view based on the new classification.

### Step 3: Handle FK Constraints (If Needed)

If changing **from `master`** (which links to `core.unified_objects`) **to `transactional`** (which does not), you may need to drop FKs:

```sql
-- Check for unified_objects linkage
SELECT conname, confrelid::regclass 
FROM pg_constraint 
WHERE conrelid = 'schema.table'::regclass AND contype = 'f';

-- Drop if necessary
ALTER TABLE schema.table DROP CONSTRAINT constraint_name;
```

### Common Classification Changes

| From | To | Common Reason | Extra Steps |
| :--- | :--- | :--- | :--- |
| `master` | `transactional` | Reduce global search noise, remove object-store linkage. | Drop FK to `unified_objects` or `unified.*`. |
| `transactional` | `master` | Enable comments, attachments, global URN. | Ensure `unified_objects` trigger is attached. |
| `reference` | `definition` | Allow NULL `organization_id` for global defaults. | Update RLS policies. |

> [!CAUTION]
> **Custom Triggers**: If the entity has a manually created trigger (not composer-generated), the rebootstrap may overwrite it. Back up custom triggers before rebootstrapping.
- Master Object ID Policy [V21.6]: `display_id` is always `is_read_only: true` and `is_mandatory: true` for `master` objects.

---

## 7. The Policy Matrix (V21.6 Updates)

V21.6 introduces the **Policy Matrix**, which defines the precedence of metadata signals during bootstrap and runtime.

### 7.1 Metadata Priority (The Overlay Rule)
When scanning an entity, the system follows this priority order:
1.  **Blueprint JSON Schema**: If present, mandatory flags and JSON paths are strictly enforced.
2.  **Blueprint Dependencies**: All fields in `semantics.resolution.dependencies` are forced to `is_mandatory: true`.
3.  **Physical Discovery**: Physical columns from base and extension sources.
4.  **Virtual Discovery**: Flattened JSONB fields.

### 7.2 High-Fidelity Form Rules
The form generator utilizes the Policy Matrix to determine writeability:
- **Rule**: A field is writable in a form if it is NOT read-only **OR** if it is a virtual field associated with a `jsonb_column`.
- **Reason**: Physically generated columns (materialized JSONB fields) are read-only at the SQL level but are "effectively writable" via their parent JSONB column in the L4 layer.

---

## 8. AI Resolution Strategies (Behavior Logic)

Each entity defines its `ai_resolution` pattern in the blueprint. These strategies dictate how an AI agent should handle entity creation and reference resolution.

| Strategy | Behavior Pattern | Typical Tier | Requirement |
| :--- | :--- | :--- | :--- |
| **`direct`** | Upsert directly to the shard using user-provided values. | `reference`, `transactional` | Mandatory fields present in prompt. |
| **`resolve_parent`** | Resolve a parent entity (e.g., `account_id`) before creating child. | `master` (Relational) | `semantics.resolution.dependencies` defined. |
| **`chain_resolve`** | Recursively resolve multiple dependencies (e.g. Account → Location → Contact). | `master` (Composite) | Deep pathing in `jsonb_schema`. |
| **`nested_create`**| Atomically create parent and multiple child items in one payload. | `transactional` (Nested) | Trigger handling for `items` array. |
| **`allocator_flow`**| Complex multi-entity assignment with validation checks. | `transactional` (Allocator) | `vertical_payload` support. |

---

## 9. Verification & Success Criteria (V21.7)

To ensure an entity is ready for high-fidelity UI and AI operations, follow the **Unified Verification Lifecycle**.

### 9.1 Verification Checklist
| Phase | Checkpoint | Failure Indicator |
| :--- | :--- | :--- |
| **Audit** | Classification vs. Tier | `master` object in `analytical` schema. |
| **Form** | Mandatory Fields | `minimal` form lacks `organization_id` or primary JSONB. |
| **Resolution**| Virtual Resolve | View column is NULL after upsert into JSONB. |
| **Registry** | Metadata Coherence | `is_phys_generated` flag is missing for virtual fields. |

### 9.2 Success Patterns
- **High-Fidelity Form**: The form generator (`core.api_new_generate_form_schema`) produces a nested `details` schema if `jsonb_schema` is present in the blueprint.
- **Packer Bypass**: `core.api_new_core_upsert_data` correctly identifies that a nested payload is already "form-prepacked" and skips redundant bundling.
- **Logical Resolution**: The `v_*` view correctly resolves fields directly from the `details` blob.
- **Technical Traces**: Success is documented using **Explicit Payloads** in logs, capturing the exact JSON blocks sent to V4 API functions (`upsert`, `fetch`).

---

## References
- Workflow: [/v4-verify-entity](file:///Users/macbookpro/zo_v2/zo_core_v4_supa/.agent/workflows/v4-verify-entity.md)
- Skill: [entity-management](file:///Users/macbookpro/zo_v2/zo_core_v4_supa/.agent/skills/entity-management/SKILL.md)
- Skill: [jsonb-schema-validation](file:///Users/macbookpro/zo_v2/zo_core_v4_supa/.agent/skills/jsonb-schema-validation/SKILL.md)
- Composer V21.7 Logic: [schema.sql](file:///Users/macbookpro/zo_v2/zo_core_v4_supa/db/modules/core/schema.sql)
