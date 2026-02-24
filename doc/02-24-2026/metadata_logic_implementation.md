# Metadata Logic Implementation Documentation (02-24-2026)

This document provides a comprehensive overview of the refactored metadata management logic in the Settings Config page.

## 1. Overview
The primary goal was to transition to a "logical-first" metadata management system. This involved prioritizing `v_metadata` (view-specific metadata) over base table metadata and implementing a more robust provisioning and synchronization workflow.

## 2. Data Model Changes

### MetadataItem Interface
The `MetadataItem` interface was extended to support hierarchical grouping and physical source awareness:
```typescript
interface MetadataItem {
  key: string;
  type: string;
  display_name: string;
  foreign_key?: ForeignKey | null;
  potential_fk?: ForeignKey; 
  semantic_type: SemanticType;
  polymorphic?: Polymorphic; 
  is_searchable: boolean;
  is_displayable: boolean;
  is_mandatory: boolean;
  is_template: boolean;
  is_virtual: boolean;
  format?: 'array'; 
  tier1?: string;       // Level 1 Group
  tier2?: string;       // Level 2 Group
  tier3?: string;       // Level 3 Group
  is_phy_column?: boolean; // Indicates if field is a physical column
  is_visible?: boolean;    // Controls visibility in the generated view
}
```

## 3. Data Fetching Logic

### Primary Source: `v_metadata`
The `fetchData` function now prioritizes fetching from the `v_metadata` column in `core.entities`.
- **Schema Prefix Handling**: A helper `shortEntityType` is used to strip schema prefixes (e.g., `crm.contacts` becomes `contacts`) when querying `core.entities` and calling RPCs.
- **Hydration**: If `v_metadata` is empty, it falls back to the legacy `metadata` column.

```typescript
const { data: entityData, error: configError } = await supabase
  .schema('core')
  .from('entities')
  .select('id, v_metadata, metadata')
  .eq('entity_type', shortEntityType) // contacts
  .eq('entity_schema', entitySchema)  // crm
  .single();
```

## 4. Saving & Provisioning (Two-Phase Process)

Saving configuration is now a two-step transaction to ensure data integrity and immediate view updates.

### Phase 1: Update Registry
The configuration is updated in the `core.entities` table.
```typescript
const { error: saveError } = await supabase
  .schema('core')
  .from('entities')
  .update({ v_metadata: metadataToSave })
  .eq('entity_schema', entitySchema)
  .eq('entity_type', shortEntityType);
```

### Phase 2: Bootstrap/Provision
After the registry is updated, the `core.comp_util_ops_bootstrap_entity` RPC is triggered to recreate the view and provision the changes.
- `p_force_refresh` is set to `false` to ensure registry corrections are respected.
```typescript
await supabase.schema('core').rpc('comp_util_ops_bootstrap_entity', {
  p_schema_name: entitySchema,
  p_entity_type: shortEntityType,
  p_config: null,
  p_force_refresh: false
});
```

## 5. Synchronization Logic

### Sync Registry Button
A new "Sync Registry" button allows pulling in physical column updates from the database without wiping manual metadata edits.
- Calls `core.util_ops_metadata_sync`.
- `p_overwrite_manual` is set to `false`.
```typescript
await supabase.schema('core').rpc('util_ops_metadata_sync', {
  p_schema_name: entitySchema,
  p_entity_type: shortEntityType,
  p_overwrite_manual: false
});
```

## 6. UI Enhancements

### Hierarchical Sorting
The table now automatically groups and sorts fields based on their Tiers:
```typescript
const sortedDisplayColumns = _.sortBy(displayColumns, ['tier1', 'tier2', 'tier3', 'key']);
```

### Column Configuration
New editable columns were added to the main Ant Design table:
- **Tier 1, Tier 2, Tier 3**: For logical grouping.
- **Phy Col (is_phy_column)**: Checkbox to mark physical source columns.
- **Visible (is_visible)**: Checkbox to toggle field inclusion in the logical view.
- **Data Type**: Restored and made editable (disabled for polymorphic targets).

### Horizontal Scrolling
Increased `scroll.x` to `1500` (and up to `1800` in later iterations) to accommodate the additional columns.

## 7. Bug Fixes During Implementation
- **RPC Signature Mismatch**: Corrected `p_entity_schema` to `p_schema_name` for the sync RPC.
- **Syntax Errors**: Fixed several React/TypeScript syntax errors in the `allColumnsDef` array.
- **Loading State**: Corrected accidental removal of the `loading` spinner state.
- **Schema Prefixes**: Ensured consistency in how entity names are passed to Supabase (short name vs full name).
