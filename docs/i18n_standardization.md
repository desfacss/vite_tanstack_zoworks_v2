# i18n Standardization Strategy for Enterprise ERP/CRM

## 1. Objective
To provide a scalable, predictable, and manageable internationalization framework for a system with 1000+ pages, spanning multiple core services and pluggable modules.

## 2. Global Namespace Architecture
We divide translations into three logical layers:

| Namespace | Scope | Storage Location |
| :--- | :--- | :--- |
| `common` | Generic UI (Save, Cancel, Yes/No, Dates) | `src/core/i18n/locales/[lang].json` |
| `core` | Layout, Auth, Branding, Global Settings | `src/core/i18n/locales/[lang].json` |
| `modules` | Business-specific logic (CRM, WMS, HR) | `src/modules/[module]/i18n/[lang].json` |

## 3. Key Naming Convention
Keys must follow a hierarchical **Domain-Driven** structure:

`[namespace].[module/component].[context].[element]`

### Elements of the Key:
- **namespace**: `common`, `core`, or `modules`.
- **module/component**: `auth`, `navigation`, `settings`, or module name like `crm`.
- **context**: The functional intent of the key.
  - `label`: Static text for fields, headers, titles.
  - `action`: Interactive triggers (buttons, menu items).
  - `placeholder`: Input field hints.
  - `message`: User feedback (success, error, loading).
  - `status`: State indicators (Active, Inactive, Pending).
  - `tip`: Help text and tooltips.
- **element**: The specific descriptor (slug). Use `snake_case`.

### Examples:
- `common.action.save`
- `common.label.created_at`
- `core.auth.title.login`
- `core.layout.sider.home`
- `modules.crm.contacts.label.first_name`
- `modules.crm.contacts.action.add_contact`

## 4. Scalability Patterns

### A. Component-Level Reuse
Generic components (like DataTables or Dashboards) should look for keys in `common` first, then fall back to component-specific keys.
- Search order: `t(['modules.crm.contacts.label.name', 'common.label.name'])`

### B. Dynamic View Organization
For ERP systems of record where views are often generated from metadata:
- System Fields: `common.field.[field_id]`
- Object Titles: `modules.[module].[object_id].title`

### C. Developer-First Management (Type Safety)
To prevent key-rot across 1000 pages:
1. **Central Schema**: Maintain a master `en.json` as the source of truth.
2. **Key Utilities**: Use a typed `t()` function or constants for common keys.
3. **Lazy Loading**: Always load module-specific namespaces ONLY when the module is mounted.

## 5. UI Standardization Rules
- **Buttons**: Infinite "Save" buttons should all use `common.action.save`.
- **Date/Time**: Handled via `i18n.language` and `dayjs` for consistency.
- **Plurals**: Always implement plurals at the key level (e.g., `common.label.item_one`, `common.label.item_other`).
- **Safety**: Never use hardcoded strings in `.tsx` files. Every string must go through a `t()` call.

## 7. Implementation Status (Core Module)
- [x] **Auth Pages**: Login, Signup, ResetPassword, WebRegister.
- [x] **Layout Components**: Header, ProfileMenu, NotificationsDrawer, MobileMenu, Settings.
- [x] **Core Pages**: Home, Dashboard, Profile, UserSettings, NotFound.
- [x] **Widget Renderers**: KPI, Table, Charts.
- [x] **Registry & Routing**: AppRoutes, Navigation Items.

## 8. Common Key Reference (Handy)

| Element | Standardized Key |
| :--- | :--- |
| Save Button | `common.action.save` |
| Cancel Button | `common.action.cancel` |
| Organization | `common.label.organization` |
| Location | `common.label.location` |
| User | `common.label.user` |
| Error Message | `common.message.error` |
| Success Feedback | `common.message.save_success` |
| Loading State | `common.label.loading` |
| No Data Feedback | `common.label.no_data` |

---
*Last Updated: 2025-12-22*
