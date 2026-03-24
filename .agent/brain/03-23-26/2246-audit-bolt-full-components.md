**Session**: 2026-03-23 ~22:46 IST

# Full Bolt Components Audit — Complete Missing Components

This extends `doc/03-23-2026/unmigrated_components.md` with components NOT listed there.

---

## Already in unmigrated_components.md (recap)
| Section | Decision |
|---|---|
| Process Editor | → `archive` module |
| Channels & Networking | → `archive` module |
| CRM — Accounts, Deals, Leads | → `/crm/:entity` dynamic routes |
| Ticketing & Client Support | → `esm` module |
| Admin — Notifications, Shopping, Catalog | Partial |
| Admin — LocationCategories, ServiceCategories, ServiceOfferings, ServiceTypes | Missing stubs |
| Dashboard / Widgets | ✅ Done |
| WebRegister | ✅ Done |

---

## 🔴 NEW — Not in unmigrated_components.md

### A. WorkFlow Module (`src/components/pages/WorkFlow`)
**Entirely missing from audit.** Rich set of components:

| File | Size | Notes |
|---|---|---|
| `WorkflowBuilder.tsx` | 14 KB | Visual workflow builder |
| `WorkflowDetail.tsx` | 14 KB | Workflow instance view |
| `WorkflowList.tsx` | 8 KB | List of workflows |
| `LogsView.tsx` | 11 KB | Execution log viewer |
| `Dashboard.tsx` | 9 KB | Workflow dashboard |
| `components/` | dir | Sub-components |

**Destination**: → `src/modules/settings/pages/Config/` (already has `ProcessBlueprintManager`) OR extend into a new `workflow` sub-module.  
**Backend**: Likely `automation` / `workflow` schema — confirm availability.

---

### B. Automation / Rules Engine (`src/components/pages/automation`)
**Not in the audit** — separate from ProcessEditor:

| File | Size | Notes |
|---|---|---|
| `index.tsx` | 9 KB | Main automation page |
| `AutomationRulesList.tsx` | 9 KB | Rules list view |
| `AutomationRuleModal.tsx` | 7 KB | Create/edit rule modal |
| `AutomationBuilder/` | dir | Visual rule builder |
| `tabs/` | dir | Rule config tabs |

**Destination**: → `src/modules/settings/` or new `src/modules/automation/`  
**Backend**: `automation` schema (RPC-driven, likely partially available)

---

### C. Map & Field Tracking (`src/components/pages/MapComponents`)
**Not in the audit** — geospatial/FSM components:

| Item | Notes |
|---|---|
| `index.tsx` (7KB) | Main map page |
| `AgentList/` | List of field agents |
| `CustomerList/` | Customer location list |
| `CustomerMap/` | Customer map view |
| `trackMap/` | Live tracking map (GPS) |
| `ViewToggle/` | List/Map view switcher |

**Destination**: → `src/modules/fsm/` (FSM module already exists)  
**Backend**: Needs `geolocation` / `fsm` schema tables

---

### D. Team & Agent Reports (`src/components/pages/Team`)
**Not in the audit:**

| File | Size | Notes |
|---|---|---|
| `index.tsx` | 20 KB | Full team management page |
| `AgentActivityReport.tsx` | 15 KB | Agent activity reporting |
| `AgentActivityReport-GX.tsx` | 17 KB | GX variant |

**Destination**: → `src/modules/workforce/` (already has TeamsUsers page)  
**Backend**: `workforce` / `hr` schema (likely partially available)

---

### E. DynamicConfig / Entity Config Editor (`src/components/pages/DynamicConfig`)
**Not in the audit** — this is the admin metadata editor. Huge:

| File | Size | Notes |
|---|---|---|
| `MetadataV.tsx` | **115 KB** | Full entity metadata editor |
| `Metadata.tsx` | **98 KB** | Previous version |
| `index.tsx` | **37 KB** | Main config page |
| `GridViewConfig.tsx` | **31 KB** | Grid view configurator |
| `DetailsOverviewConfig.tsx` | **27 KB** | Detail view config |
| `ViewConfigEditor.tsx` | 16 KB | Generic view editor |
| `KanbanViewConfig.tsx` | 19 KB | Kanban config |
| `GanttViewConfig.tsx` | 12 KB | Gantt config |
| `TableViewConfig.tsx` | 11 KB | Table view config |
| `CalendarViewConfig.tsx` | 12 KB | Calendar config |
| `DisplayIdConfig.tsx` | 17 KB | Display ID editor |
| `GlobalAccessConfig.tsx` | 13 KB | ACL editor |
| `TokenTemplateModal.tsx` | 15 KB | Token/template builder |
| `FormBuilder/` | dir | Form builder UI |
| `FormGenerator/` | dir | Dynamic form generator |
| `QueryBuilder.tsx` | 10 KB | Visual query editor |
| `WorkflowConfigEditor.tsx` | 9 KB | Workflow config |
| `ViewSuggestionModal.tsx` | 14 KB | AI view suggestions |

**Destination**: → `src/modules/settings/pages/Config/` (partially exists — `MetricViewManager`, `ProcessBlueprintManager` are there, but NOT the metadata/view config editors)  
**Priority**: 🔴 HIGH — this is core admin tooling  
**Backend**: Uses `core.entities`, `core.view_configs`, `core.entity_instances`

---

### F. Settings (advanced items not yet migrated)
From `src/components/pages/Settings`:

| File | Size | Main Status | Notes |
|---|---|---|---|
| `LeaveSettings.tsx` | 8 KB | ❌ Missing | Configure leave types |
| `LeaveTypes.tsx` | 5 KB | ❌ Missing | Leave type CRUD |
| `LocationSettings.tsx` | 10 KB | ❌ Missing | Location config |
| `RoleManagement.tsx` | 13 KB | ⚠️ Partial (recent fix) | Role CRUD |
| `RolePermissions.tsx` | 9 KB | ⚠️ Partial | Permissions editor |
| `UserManagement.tsx` | 10 KB | ⚠️ Partial (recent fix) | User CRUD |
| `SettingsWorkforce.tsx` | 13 KB | ❌ Missing | Workforce-specific settings |
| `OrganizationSettings.tsx` | 3 KB | ⚠️ Partial | Org settings |
| `OrganizationFeatures.tsx` | 7 KB | ❌ Missing | Feature flag management |
| `EntityConfigForm.tsx` | 18 KB | ❌ Missing | Entity config form |
| `MermaidViewer.tsx` | 8 KB | ❌ Missing | Schema/flow diagram viewer |
| `enumeditor.tsx` | 7 KB | ❌ Missing | Enum value editor |

**Destination**: → `src/modules/admin/pages/Settings/`  
**Backend**: `identity`, `workforce` schemas

---

### G. Support / FSM Pages (`src/pages/support`, `src/pages/fsm`)
**Support pages (bolt):**
| File | Notes |
|---|---|
| `Activities.tsx` | Client activity list |
| `Projects.tsx` | Project list |
| `Tasks.tsx` | Task management |
| `Tickets.tsx` | Bolt tickets page (different from ESM) |
| `ServiceInvoices.tsx`, `ServiceReports.tsx` | Already in main ✅ |
| `Invoices.tsx` | Already in `erp` module ✅ |

**FSM pages (bolt):**
| File | Notes |
|---|---|
| `GeofenceMapPage.tsx` | Geofence management UI |
| `MyTickets.tsx` | Self-service ticket view |

**Destination**: Support items → `src/modules/support/` or `src/modules/fsm/`. Already have `fsm` module.

---

### H. WhatsApp / Legal Pages (`src/components/pages/Whatsapp`)
| File | Notes |
|---|---|
| `Privacy.tsx` | Privacy policy page |
| `Terms.tsx` | Terms of service page |
| `UserDelete.tsx` | Account deletion request |

**Destination**: → Static pages under public routes or Shop support pages  
**Note**: `Privacy.tsx` and `Terms.tsx` are directly usable for the Shop's policy pages (gap identified in e-com plan)

---

### I. Contracts Module (`src/pages/contracts`)
| File | Size | Notes |
|---|---|---|
| `_ServiceContracts.tsx` | 35 KB | Full service contracts UI |
| `_ClientContacts.tsx` | 6 KB | Client contact management |
| `_ServiceOfferings.tsx` | 9 KB | Service offerings browser |
| `_ServiceTypes.tsx` | 7 KB | Service types list |
| `ServiceAssets copy.tsx` | 12 KB | Service asset management |

**Destination**: → `src/modules/contracts/` (already exists in main modules!)  
**Check**: Verify what's in `src/modules/contracts/` in main — likely empty or stub

---

## Consolidated Priority Matrix

| Priority | Component | Destination | Effort |
|---|---|---|---|
| 🔴 High | DynamicConfig / MetadataV (115KB) | `settings/Config` | Very High |
| 🔴 High | WorkflowBuilder + WorkflowDetail | `settings/Config` or new module | High |
| 🔴 High | AutomationRulesList / Builder | `modules/automation` | High |
| 🟡 Medium | MapComponents (GPS tracking) | `modules/fsm` | Medium |
| 🟡 Medium | Team / AgentActivity Reports | `modules/workforce` | Medium |
| 🟡 Medium | LeaveSettings, LeaveTypes | `modules/admin/settings` | Low-Medium |
| 🟡 Medium | RolePermissions (full editor) | `modules/admin/settings` | Medium |
| 🟡 Medium | LocationSettings | `modules/admin/settings` | Low |
| 🟡 Medium | ServiceContracts (35KB) | `modules/contracts` | High |
| 🟢 Low | Privacy.tsx, Terms.tsx | Public/Shop routes | Low |
| 🟢 Low | GeofenceMapPage | `modules/fsm` | Low |
| 🟢 Low | OrganizationFeatures | `modules/admin` | Low |
| 🟢 Low | enumeditor, MermaidViewer | `modules/settings` | Low |

---

## Referenced Files
- `vite_tanstack_bolt/src/components/pages/WorkFlow/`
- `vite_tanstack_bolt/src/components/pages/automation/`
- `vite_tanstack_bolt/src/components/pages/MapComponents/`
- `vite_tanstack_bolt/src/components/pages/Team/`
- `vite_tanstack_bolt/src/components/pages/DynamicConfig/` (MetadataV.tsx 115KB!)
- `vite_tanstack_bolt/src/components/pages/Settings/` (23 files)
- `vite_tanstack_bolt/src/pages/support/`
- `vite_tanstack_bolt/src/pages/fsm/`
- `vite_tanstack_bolt/src/pages/contracts/`
- `vite_tanstack_bolt/src/components/pages/Whatsapp/` (Privacy, Terms, UserDelete)
