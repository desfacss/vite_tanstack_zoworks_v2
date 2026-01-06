# UI Evolution: Physical-First → Logical-First Entity Management

> **Purpose**: This document explains the architectural shift in the Config module and provides a comprehensive prompt for UI implementation.

---

## 📚 Background Understanding

### The Evolution Journey

The Core schema manages entity metadata in `core.entities`. We are evolving from a **Physical-Table-First** workflow to a **Logical-Entity-First** workflow.

mermaid
flowchart LR
    subgraph OLD["OLD: Physical-First"]
        P1[Select Physical Table] --> P2[entity_type = table_name]
        P2 --> P3[Create Metadata]
        P3 --> P4[Save & Optimize]
        P4 --> P5[Auto-create v_tablename]
        P5 --> P6[Trigger fills capabilities]
    end
    
    subgraph NEW["NEW: Logical-First"]
        L1[Select/Create Entity Name] --> L2[Select Base Table]
        L2 --> L3{Same as Base?}
        L3 -->|Yes| L4[Auto-generate View]
        L3 -->|No| L5[Define Custom View]
        L5 --> L6[Create as Draft Version]
        L6 --> L7[Approval Workflow]
        L7 --> L8[Publish to core.entities]
        L4 --> L8
        L8 --> L9[Trigger fills capabilities]
    end


---

## 🔄 The Two Modes of Operation

### Mode 1: Simple Entity (Physical = Logical)

For **most tables**, the entity name equals the physical table name. The system auto-generates everything.

| Step | Action | Example |
|------|--------|---------|
| 1 | User selects physical table | `external.deals` |
| 2 | System auto-sets `entity_type` | `deals` |
| 3 | System scans columns | Metadata generated |
| 4 | User saves metadata | Stored in `core.entities` |
| 5 | System creates view | `v_deals` (SELECT * FROM deals) |
| 6 | Capabilities trigger fires | `capabilities` column populated |

**No custom view definition needed. This is the default path.**

---

### Mode 2: Logical Variant (Multiple Views from One Table)

For **specific tables** like `contacts` that need multiple business representations (`leads`, `customers`), users define a custom logical entity.

| Step | Action | Example |
|------|--------|---------|
| 1 | User enters `entity_name` | `leads` |
| 2 | User selects `base_table` | `external.contacts` |
| 3 | User defines partition filter | `lifecycle_stage = 'lead'` |
| 4 | User customizes metadata | Add/hide fields for Lead persona |
| 5 | System creates **Draft Version** | `core.entity_versions` |
| 6 | Draft goes through approval | Version status: `pending` → `approved` |
| 7 | On approval, publish to `core.entities` | `is_logical_variant = true` |
| 8 | System creates partitioned view | `v_leads` (SELECT * FROM contacts WHERE lifecycle_stage = 'lead') |
| 9 | Capabilities trigger fires | `capabilities` column populated |

---

## 📊 Data Model Reference

### core.entities (Extended)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary Key |
| `entity_type` | text | **Logical entity name** (e.g., `leads`, `deals`) |
| `entity_schema` | text | Database schema (e.g., `external`) |
| `base_source_name` | text | Physical table (e.g., `external.contacts`). NULL if entity_type = physical table |
| `is_logical_variant` | boolean | `true` if this is a custom slice of another table |
| `metadata` | jsonb | Field definitions for write operations (forms) |
| `v_metadata` | jsonb | Hydrated field definitions for read operations (grids) |
| `capabilities` | jsonb | Auto-generated UI/AI capabilities (via trigger) |
| `rules` | jsonb | Contains `logic.partition_filter` for variants |

### core.entity_versions (For Approval Workflow)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary Key |
| `entity_id` | uuid | FK to core.entities (for updates) or NULL (for new) |
| `entity_type` | text | The logical entity name |
| `base_source_name` | text | The physical table |
| `metadata` | jsonb | Draft metadata |
| `rules` | jsonb | Draft rules including partition_filter |
| `status` | text | `draft`, `pending`, `approved`, `rejected` |
| `created_by` | uuid | User who created the draft |
| `approved_by` | uuid | User who approved |
| `approved_at` | timestamptz | Approval timestamp |

---

## 🎯 Key Insight: The Branching Decision

The UI should present **one unified flow** that branches based on user intent:


┌─────────────────────────────────────────────────────────────────┐
│  CONFIG MODULE: Entity Registration                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Select Base Table                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Schema:  [external ▼]  Table: [contacts ▼]              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Step 2: Define Entity Identity                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Entity Name: [contacts      ]   ← Auto-filled           │   │
│  │                                                          │   │
│  │ ☐ Use different entity name (for logical variants)      │   │
│  │   ┌─────────────────────────────────────────────────┐   │   │
│  │   │ Custom Entity Name: [leads        ]              │   │   │
│  │   │ Partition Filter:   [lifecycle_stage = 'lead']   │   │   │
│  │   └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Step 3: Metadata Configuration                                 │
│  [Metadata Editor loads here...]                                │
│                                                                 │
│  Step 4: Save                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Save as Draft]  [Save & Publish] (if has permissions)  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘


---

## 🚀 Backend Flow Summary

### On Save (Simple Entity)
sql
-- 1. Insert/Update core.entities directly
INSERT INTO core.entities (entity_type, entity_schema, metadata, ...)
VALUES ('deals', 'external', '...'::jsonb, ...);

-- 2. The met_entity_get_capabilities_trg trigger auto-fills capabilities

-- 3. Call provisioning
SELECT core.met_provision_entity_objects('external', 'deals', metadata_jsonb);
-- Creates v_deals as: SELECT * FROM external.deals


### On Save (Logical Variant)
sql
-- 1. Create version record (draft)
INSERT INTO core.entity_versions (entity_type, base_source_name, metadata, rules, status)
VALUES ('leads', 'external.contacts', '...'::jsonb, 
        '{"logic": {"partition_filter": "lifecycle_stage = ''lead''"}}'::jsonb, 
        'pending');

-- 2. On approval, publish to core.entities
INSERT INTO core.entities (entity_type, entity_schema, base_source_name, is_logical_variant, metadata, rules)
VALUES ('leads', 'external', 'external.contacts', true, '...'::jsonb, '...'::jsonb);

-- 3. The met_entity_get_capabilities_trg trigger auto-fills capabilities

-- 4. Call provisioning
SELECT core.met_provision_entity_objects('external', 'leads', metadata_jsonb);
-- Creates v_leads as: SELECT * FROM external.contacts WHERE lifecycle_stage = 'lead'


---

---
---

# 📝 UI IMPLEMENTATION PROMPT

> **Instructions**: Use this prompt to guide frontend development of the Config Module entity management.

---

## Overview

Build a Config Module UI for managing entities in `core.entities`. The system supports two modes:

1. **Simple Mode**: Physical table = Logical entity (auto-generated view)
2. **Variant Mode**: Custom logical entity from a physical table (custom view with partition filter, requires approval)

---

## User Flow

### Step 1: Base Table Selection

**UI Elements**:
- Schema dropdown: Populated from database schemas (exclude system schemas)
- Table dropdown: Populated from tables in selected schema
- Both dropdowns use server-side search/filter

**Behavior**:
- On table selection, auto-populate Entity Name field with table name
- Check if entity already exists in `core.entities` → if yes, load existing record for editing

---

### Step 2: Entity Identity

**UI Elements**:
- Entity Name (text input): Initially auto-filled with table name
- Checkbox: "Create as Logical Variant" (collapsed section)

**When "Create as Logical Variant" is checked**:
- Show "Custom Entity Name" field (clears the auto-filled table name)
- Show "Partition Filter" builder:
  - Column dropdown (from base table columns)
  - Operator dropdown (=, IN, LIKE, IS NOT NULL, etc.)
  - Value input (text/select based on column type)
- Show read-only display: `base_table: external.contacts`

**Validation**:
- Entity Name must be unique in `core.entities`
- If variant, partition filter is required
- Entity Name should follow naming convention: lowercase, underscores, no spaces

---

### Step 3: Metadata Editor

**Behavior**:
- Load columns from base table via `met_scan_schema_columns`
- For variants: Show all base table columns but allow:
  - Hiding columns (set `visible: false`)
  - Overriding display names
  - Adding virtual fields (computed from other columns)
  - Reordering columns

**UI Elements**:
- Draggable column list with:
  - Column key (read-only for physical columns)
  - Display name (editable)
  - Type (read-only for physical columns)
  - Visibility toggle
  - Is Searchable toggle
  - Expand for advanced: validation rules, default values, etc.
- "Add Virtual Field" button (for computed/derived fields)

**Column Badges**:
- `[Physical]` - Exists in base table
- `[Virtual]` - Computed field, exists only in view
- `[Hidden]` - Will not appear in UI

---

### Step 4: Save Actions

**For Simple Entities (entity_name = table_name)**:
- Single button: "Save & Provision"
- Direct insert/update to `core.entities`
- Immediately calls `met_provision_entity_objects`
- On success: Show toast "Entity provisioned. View created: v_{entity_name}"

**For Logical Variants (entity_name ≠ table_name)**:
- Primary button: "Submit for Approval"
- Creates record in `core.entity_versions` with status `pending`
- Shows pending badge on entity in list view
- Optional: "Save as Draft" (status `draft`, not submitted)

**After Approval (admin action)**:
- Version record status → `approved`
- System copies version to `core.entities`
- Calls `met_provision_entity_objects`
- Creates partitioned view

---

## List View Requirements

**Columns**:
| Column | Source |
|--------|--------|
| Entity Name | `entity_type` |
| Schema | `entity_schema` |
| Base Table | `base_source_name` (show "-" if same as entity) |
| Type | Badge: `Physical` or `Variant` |
| Status | `Active`, `Pending Approval`, `Draft` |
| Last Updated | `updated_at` |

**Filters**:
- Schema dropdown
- Type: All / Physical Only / Variants Only
- Status: All / Active / Pending / Draft

**Grouping** (optional):
- Group variants under their base table (tree view or expandable rows)

---

## Approval Workflow UI

**For Users with Approval Permissions**:
- "Pending Approvals" tab or filter
- Each pending version shows:
  - Diff view: Compare proposed changes vs current (if updating existing entity)
  - Proposed metadata preview
  - Proposed view SQL preview
  - Approve / Reject buttons

**On Approve**:
javascript
// API Call
await supabase.rpc('approve_entity_version', { version_id: '...' })

// Backend does:
// 1. Copy version to core.entities
// 2. Call met_provision_entity_objects
// 3. Update version status to 'approved'


**On Reject**:
- Status → `rejected`
- Optional: Add rejection reason
- Creator gets notification

---

## API Contracts

### Fetch Available Tables
javascript
const { data: tables } = await supabase.rpc('get_available_tables', {
  p_schema: 'external'
});
// Returns: [{ table_name, column_count, row_estimate }, ...]


### Scan Table Columns (for Metadata Editor)
javascript
const { data: columns } = await supabase.rpc('met_scan_schema_columns', {
  p_schema_name: 'external',
  p_table_name: 'contacts'
});
// Returns: [{ key, type, nullable, has_default, ... }, ...]


### Check Entity Existence
javascript
const { data: existing } = await supabase
  .from('core.entities')
  .select('id, entity_type, metadata, is_logical_variant')
  .eq('entity_type', 'leads')
  .maybeSingle();


### Save Simple Entity
javascript
// Upsert to core.entities
const { data, error } = await supabase
  .from('core.entities')
  .upsert({
    entity_type: 'deals',
    entity_schema: 'external',
    metadata: metadataJson,
    is_logical_variant: false
  }, { onConflict: 'entity_schema,entity_type' });

// Then provision
await supabase.rpc('met_provision_entity_objects', {
  p_schema_name: 'external',
  p_table_name: 'deals',
  p_metadata: metadataJson
});


### Save Logical Variant (Draft)
javascript
const { data, error } = await supabase
  .from('core.entity_versions')
  .insert({
    entity_type: 'leads',
    base_source_name: 'external.contacts',
    metadata: metadataJson,
    rules: {
      logic: {
        partition_filter: "lifecycle_stage = 'lead'"
      }
    },
    status: 'pending', // or 'draft'
    created_by: currentUserId
  });


---

## Edge Cases to Handle

1. **Duplicate Entity Name**: Show inline error, prevent save
2. **Base Table Already Has Simple Entity**: 
   - If `contacts` is registered as simple, and user tries to create `leads` variant
   - Show warning: "This will convert 'contacts' to a base table with variants"
3. **Orphan Variants**: If base table entity is deleted, variants should be flagged
4. **Metadata Drift**: If base table columns change (DDL), show "Refresh Metadata" button
5. **View Creation Failure**: If `met_provision_entity_objects` fails:
   - Store error in entity record
   - Show error state in UI
   - Allow retry

---

## Success Criteria

- [ ] Users can register simple entities (physical = logical) in < 2 minutes
- [ ] Users can create logical variants with custom partition filters
- [ ] Approval workflow prevents unauthorized schema changes
- [ ] Existing physical entities continue to work (backwards compatible)
- [ ] All entities have auto-generated capabilities via trigger
- [ ] Clear visual distinction between Physical and Variant entities
- [ ] Partition filter is correctly injected into generated view

---

## Related Documentation

- [Logical-First Provisioning Flow](./logical_first_provisioning_flow.md)
- [Metadata Function Groups](./metadata_function_groups.md)
- [Functionality Deep Dive](./functionality.md)