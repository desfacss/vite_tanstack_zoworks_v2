# Session Archive: Dynamic Document & Template System Integration Guide

**Session**: 2026-06-15 ~22:42 IST

This document details the end-to-end process of defining document structures, building visual templates, creating document records, and rendering those records in a high-fidelity view mode. Use this guide to safely port this functionality to a new project without missing any core features.

---

## 1. Core Architecture & Database Setup

The dynamic document system relies on a metadata-driven architecture, cleanly separating the "data structure" (Forms) from the "visual representation" (Templates) and the "actual saved data" (Records).

To port this, ensure you have the following database tables (or equivalent structure):

### A. Form Definitions (`documents.doc_forms`)
Acts as the structural blueprint.
- `id` (UUID, Primary Key)
- `type_id` (Text) - Unique identifier (e.g., `doc_invoices`).
- `data_schema` (JSONB) - Standard JSON Schema defining fields, types, and required validations.
- `ui_schema` (JSONB) - Defines the form layout (e.g., multi-column grids, custom widget bindings).

### B. Visual Templates (`documents.doc_templates`)
Stores branding and layout settings for a specific form.
- `id` (UUID, Primary Key)
- `document_type_id` (UUID) - Foreign Key to `doc_forms.id`.
- `organization_id` (UUID) - Tenant isolation identifier.
- `settings` (JSONB) - Visual properties (colors, headers, footers, logo placement).
- `is_default` (Boolean) - Identifies the primary template to render.
- `doc_common_template_id` (UUID, nullable) - Link to global brand settings (`doc_common_templates`).

### C. The Record Entity Tables (e.g., `esm.service_reports`, `finance.invoices`)
Stores the actual user-submitted data.
- `id` (UUID, Primary Key)
- `display_id` (Text) - Auto-generated human-readable ID (e.g., `INV-001`).
- `content` (JSONB) - The raw JSON data matching the `data_schema` from the form.
- `organization_id` (UUID) - Tenant isolation identifier.

---

## 2. Step-by-Step Flow: From Definition to Rendering

### Step 1: Define the Blueprint (`doc_forms`)
Before users can create documents, an administrator or developer must define the schema.
1. Insert a record into `doc_forms`.
2. Populate `data_schema` with JSON Schema properties (e.g., strings, numbers, arrays for line items). Include custom `x-lookups` for dynamic dropdowns (e.g., selecting a client from a CRM table) and `x-signature-widget` for signature pads.
3. Populate `ui_schema` specifying the column layout (e.g., `ui:layout: [["client_id", "date"], ["notes"]]`).

### Step 2: Build the Visual Template (`doc_templates`)
1. Create a management UI (`TemplateManager` and `TemplateCustomizer`).
2. This UI allows the admin to visually pick primary colors, upload logos, set margins, and configure the header/footer text.
3. Save this JSON payload into the `settings` column of `doc_templates`.
4. Ensure one template is marked with `is_default = true` per organization and document type. (The `DocumentService.saveTemplate` should automatically toggle off other defaults when a new one is set).

### Step 3: Implement the Data Entry UI (`DocumentList` & `DocumentFormModal`)
When the end-user clicks "Create Invoice":
1. **Load Form**: `DocumentList` calls `DocumentService.getDocumentForm(typeId)` to fetch the `data_schema` and `ui_schema`.
2. **Render Dynamic Form**: `DocumentFormModal` parses the schemas.
   - It iterates through the `ui:layout` grid.
   - It intercepts `x-lookups` to fetch external data (e.g., `core.api_new_fetch_entity_records` or custom RPCs) to populate dropdowns.
   - It renders custom sub-components (e.g., `ItemsTable` for array fields, `SignatureWidget` for signature fields).
3. **Save Record**: Upon submission, the form's JSON output is gathered.
   - Call `DisplayIdService.generateDisplayIdForNewRecord()` to assign a unique, incremental ID (like `INV-1024`).
   - Call `DocumentService.saveDocument()`, which executes an `INSERT` into the specific entity table (e.g., `finance.invoices`). The entire form payload is saved directly into the `content` JSONB column.

### Step 4: Render the View Mode (`DocumentViewer` & `DynamicDocumentTemplate`)
When the user clicks to view a saved document:
1. **Fetch Record**: The viewer fetches the raw record from the entity table (`SELECT * FROM finance.invoices WHERE id = ?`).
2. **Fetch Template**: `DocumentService.getDefaultTemplate(typeId, orgId)` fetches the default visual template.
3. **Merge and Render**:
   - The `<DynamicDocumentTemplate />` component receives both `formData` (the record's `content`) and `templateSettings` (from `doc_templates`).
   - **Styling**: It applies CSS properties dynamically from `templateSettings.branding` (e.g., setting the table header background to `primaryColor`).
   - **Content Injection**: It reads standard keys from `formData` (like `formData.items`, `formData.clientSignature`, `formData.notes`) and maps them to fixed visual layouts (header, info grid, item table, signature blocks).
   - **Calculations**: It runs any necessary compute operations (like mapping over `items` to calculate line totals and grand totals).

---

## 3. Critical Integration Requirements

When porting this to a new project, you must implement the following backend/service layers:

> [!WARNING]
> **Tenant Isolation**
> Ensure `organization_id` is strictly enforced in all `SELECT`, `UPDATE`, and `INSERT` queries across `doc_forms`, `doc_templates`, and the record entity tables to prevent cross-tenant data leakage.

> [!IMPORTANT]
> **Display ID Generation**
> The system requires a robust, atomic sequence generator for `display_id`. You must implement a database function or service (like `DisplayIdService`) that safely increments and generates sequence numbers without race conditions during concurrent inserts.

> [!TIP]
> **Lookup Dependencies**
> Custom lookups (`x-lookups`) in the JSON schema rely on the ability to query other tables dynamically. Ensure your new project has a secure, configurable RPC or API endpoint that can execute dynamic joins/filters for these dropdowns safely.

## 4. Component Checklist for the New Project
To successfully recreate this, copy or rebuild the following React components:
- `DocumentList.tsx` (Datatable, pagination, and search wrapping specific entities)
- `DocumentFormModal.tsx` (The dynamic JSON schema form renderer)
- `ItemsTable.tsx` (Editable data grid for array fields)
- `SignatureWidget.tsx` (Canvas for capturing electronic signatures)
- `TemplateManager.tsx` & `TemplateCustomizer.tsx` (Admin settings for visual template design)
- `DocumentViewer.tsx` & `DynamicDocumentTemplate.tsx` (High-fidelity read-only view)
- `DocumentService.ts` (API/Supabase encapsulation layer)

---
## Archived Artifact Details
- **Source**: Dynamic Document System Codebase
- **Modified Files**: None (Documentation only)
- **Database Objects**: None modified
