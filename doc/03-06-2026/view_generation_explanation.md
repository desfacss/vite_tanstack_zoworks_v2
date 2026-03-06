# View Generation Explanation: blueprint.service_reports

This document explains how the `blueprint.service_reports` view is generated and how to manage its configuration and templates.

## 1. Overview of the UI Flow

The system uses a configuration-driven approach to render entity details. For `blueprint.service_reports`, the flow is as follows:

1.  **Entry Point**: Navigation to `/support/service-reports` renders the `ServiceReports` page.
2.  **Configuration**: The layout and behavior are defined by the `detailview` column in the `core.view_configs` table for the `blueprint.service_reports` entity.
3.  **Rendering**: The `DetailOverview.tsx` component reads this configuration. If a `template` name is specified (e.g., `"template": "doc_view_v2"`), it fetches the template from `doc_templates` and uses `DocView.tsx` for high-fidelity rendering.

## 2. Template Editor UI

You can manage the visual aspects and structure of the document through the project's user interface.

### How to Access:
1.  Navigate to the **Service Reports** page in the sidebar (Path: `/support/service-reports`).
2.  In the top right action bar, click the **"Templates"** button.
3.  A drawer will open containing the **Template Manager**.

### What you can do in the Template Manager:
*   **Manage Templates**: View, create, and delete templates specifically for Service Reports.
*   **Customize**: Click the **Edit** icon on a template to open the **Template Customizer**.
    *   **Branding**: Set primary/secondary colors and accent colors.
    *   **Header/Footer**: Configure logos, company names, taglines, and footer text.
    *   **Layout**: Set font sizes, families, and page margins.
*   **Set Default**: Choose which template should be the default for all new service reports.

## 3. View Configuration (JSON)

The `detailview` JSON in `core.view_configs` (managed via **Settings > Configuration > View Config**) acts as the "glue" between the data and the template.

### Key Fields in the JSON:
*   `groups`: Defines the fields displayed in the standard view (and sometimes used as fallbacks).
*   `template`: The name of the template from `doc_templates` to apply.
*   `showFeatures`: Controls UI elements like the "Print", "Edit", and "Delete" buttons.
*   `layout`: Configuration like `columnsPerGroup` for the standard layout.

## 4. Technical Rendering Logic

The generation logic is handled by two main components:

1.  **`DetailOverview.tsx`**:
    *   Acts as the controller.
    *   Fetches the entity data via the `api_fetch_entity_detail` RPC.
    *   Fetches the `doc_template` record matching the name in the config.
    *   Handles the conditional switch to `DocView`.

2.  **`DocView.tsx`**:
    *   The "Print-Ready" renderer.
    *   Uses **Layout Blocks** defined in the template settings to arrange data.
    *   Supported block types include:
        *   `two_column_info_box`: For side-by-side key-value pairs (e.g., Client info vs. Service info).
        *   `inline_fields`: For compact data rows.
        *   `description_section`: For multi-line text with borders.
        *   `signature_block`: For rendering digital signatures with "Signed by" metadata.
    *   **PDF Generation**: Uses the `react-to-print` library to trigger the browser's print dialog, which allows saving as PDF.

## 5. Summary of Tables Involved

| Table | Purpose |
| :--- | :--- |
| `core.view_configs` | Stores the overall `detailview` JSON configuration for the entity. |
| `doc_templates` | Stores the visual settings and layout blocks for a specific template name. |
| `doc_forms` | Defines the schema used to validate document data (referenced by `doc_templates`). |
| `doc_common_templates` | Holds shared branding assets (logos, etc.) that can be reused across templates. |
