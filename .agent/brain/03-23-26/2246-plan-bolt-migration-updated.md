**Session**: 2026-03-23 ~22:30–22:46 IST

# Unmigrated Components — Updated Migration Plan

Based on the annotations in `doc/03-23-2026/unmigrated_components.md` and a full comparison of both projects.

---

## Summary of User Decisions

| Section | User Decision | Destination |
|---|---|---|
| Process Editor / Workflow Engine | New sidemenu module: **`archive`** | `src/modules/archive` (backend: `automation` schema) |
| Channels & Networking | New sidemenu module: **`archive`** | `src/modules/archive` (backend tables may not exist) |
| CRM — Accounts, Deals, Leads | **MOVED TO CRM SCHEMA** | `src/modules/crm` using dynamic views |
| Ticketing & Client Support | **MOVED TO ESM SCHEMA** | `src/modules/esm` |
| Admin — Subscriptions | ✅ **Done** | Already migrated |
| Admin — WebRegister | ✅ **Done** | Already migrated |
| Admin — Dashboard/Widgets | ✅ **Done** | Already migrated |
| Admin — Notifications | ⚠️ **Partial** | Needs completion |
| Admin — Shopping/Catalog | ⚠️ **Partial** | Needs completion (see E-com plan) |
| Admin — LocationCategories, ServiceCategories, ServiceOfferings, ServiceTypes | ❌ Missing | Plan needed |
| Auth — WorkflowEditor | ❌ Missing | No destination assigned yet |

---

## Section-by-Section Analysis

---

### 1. Process Editor & Workflow Engine → `src/modules/archive`

**What exists in Bolt:**
| File | Size | Notes |
|---|---|---|
| `ProcessEdit.tsx` | 45 KB | Full form-based process editor |
| `ProcessEditVisual.tsx` | 37 KB | React Flow visual editor |
| `ProcessEditVisual copy 2.tsx` | 58 KB | Latest variant |
| `flow.tsx` | 10 KB | Workflow logic |
| `processEditor-processv3.tsx` | 23 KB | v3 iteration |
| `ProcessViewer/` | dir | View-only mode |
| `ProjectPlan/` | dir | Project planning UI |
| `Scheduler/` | dir | Scheduling UI |

**What exists in Main:** Nothing equivalent. `src/modules/settings/pages/Config/ProcessBlueprintManager.tsx` covers blueprint management only (not visual editing).

**Action:**
- Create `src/modules/archive/` module
- Copy `ProcessEditor` components in, refactor imports to `@/core`
- Add route `/archive/process-editor` under a new "Archive" sidemenu item
- Backend: relies on `automation` schema tables (confirm availability)

---

### 2. Channels & Networking → `src/modules/archive`

**What exists in Bolt (13 files, ~100KB total):**
| File | Size | Notes |
|---|---|---|
| `index.tsx` | 19 KB | Main channels page |
| `ChannelPostMessages.tsx` | 10 KB | Post messages UI |
| `Comments.tsx` | 15 KB | Comment threads |
| `CommentsMobileCascader.tsx` | 14 KB | Mobile comment view |
| `Networking.tsx` | 7 KB | Networking/connections UI |
| `Post.tsx` | 4 KB | Single post component |
| `PostMessage.tsx` | 6 KB | Message posting |
| `CategorySelector.tsx` | 12 KB | Category picker |
| `workflow.tsx` | 6 KB | Workflow integration |
| `message.css` + `styles.css` | — | Custom styles |

**What exists in Main:** Nothing. No channels, messaging, or social module.

**Action:**
- Add to `src/modules/archive/` alongside Process Editor
- Add route `/archive/channels`
- Backend: **tables likely unavailable** — wrap with mock/empty state guard
- Flag clearly in UI: "This feature requires backend setup"

---

### 3. CRM — Accounts, Deals, Leads → `src/modules/crm` (Dynamic Views)

**What exists in Bolt:**
| File | Size | Notes |
|---|---|---|
| `Accounts.tsx` | 291 B | Thin stub → DynamicView wrapper |
| `Deals.tsx` | 222 B | Thin stub → DynamicView wrapper |
| `Leads.tsx` | 218 B | Thin stub → DynamicView wrapper |

**What exists in Main:** `src/modules/crm/pages/Contacts.tsx` — full CRM page.

> The Bolt CRM pages are **just thin wrappers** (200–300 bytes) — they delegate to `GenericDynamicPage`. The real data is driven by schema config in the `crm` schema.

**Action:**
- These are already covered by the existing `/crm/:entity` dynamic route in `routes/index.tsx`
- Add nav links: `/crm/accounts`, `/crm/deals`, `/crm/leads`
- **No new component files needed** — just nav config + view configs in the database
- Status: **Backend entities exist in CRM schema** ✅

---

### 4. Ticketing & Client Support → `src/modules/esm`

**What exists in Bolt (significant UI work):**
| File | Size | Notes |
|---|---|---|
| `TicketForm.tsx` | 40 KB | Complex multi-step form |
| `TicketSummary.tsx` | 15 KB | Ticket summary/view |
| `AutomationLogViewer.tsx` | 14 KB | Log viewing panel |
| `SupportTicketProgress.tsx` | 4 KB | Progress tracker |
| `QrTicketForm.tsx` | 4 KB | QR-linked ticket intake |
| `ClientDetails.tsx` | 5 KB | Client detail panel |

**What exists in Main:** `src/modules/tickets/` and `src/modules/esm/` exist but are likely simpler.

**Action:**
- Port `TicketForm.tsx`, `TicketSummary.tsx`, `AutomationLogViewer.tsx` into `src/modules/esm/components/`
- Refactor imports from old Bolt patterns to `@/core`, `@/lib/supabase`, etc.
- `QrTicketForm.tsx` → add as `/esm/qr-ticket` public route (no auth)
- Status: **ESM schema exists** ✅

---

### 5. Admin Pages — Gaps & Completion Plan

**Bolt Admin folder contents vs. Main project:**

| File | Bolt Size | Main Status | Action |
|---|---|---|---|
| `Notifications.tsx` | 15 KB | ⚠️ Partial | Port to `src/modules/admin/pages/Notifications.tsx` |
| `Subscriptions.tsx` | 10 KB | ✅ Done | — |
| `Shopping.tsx` | 226 B | ⚠️ Partial | Thin stub — covered by new E-com shop plan |
| `Catalog.tsx` | 242 B | ⚠️ Partial | Thin stub — covered by `EcomCatalogPage` |
| `LocationCategories.tsx` | 270 B | ❌ Missing | Thin stub → `/admin/location-categories` (dynamic view) |
| `ServiceCategories.tsx` | 281 B | ❌ Missing | Thin stub → `/admin/service-categories` (dynamic view) |
| `ServiceOfferings.tsx` | 237 B | ❌ Missing | Thin stub → `/admin/service-offerings` (dynamic view) |
| `ServiceTypes.tsx` | 233 B | ❌ Missing | Thin stub → `/admin/service-types` (dynamic view) |

> `LocationCategories`, `ServiceCategories`, `ServiceOfferings`, `ServiceTypes` are all thin wrappers (~250 bytes each). They delegate to `GenericDynamicPage` — just need route + nav config.

**Action (all 4):**
- Add routes: `/admin/location-categories`, `/admin/service-categories`, `/admin/service-offerings`, `/admin/service-types`
- These likely use catalog/organization schemas — confirm entity view configs exist
- **No new component files** — just routes + nav links

---

### 6. Auth — WorkflowEditor

**What exists in Bolt:** `WorkflowEditor copy 2.tsx` — 36 KB. Appears to be a workflow configuration screen embedded in the auth/onboarding flow.

**What exists in Main:** `ProcessBlueprintManager` handles similar concepts in settings.

**Action:**
- Clarify with user: is this needed as a standalone page or part of onboarding?
- Likely candidate for `/archive/workflow-editor` if "archive" module is created
- **No destination assigned yet — defer**

---

## Consolidated Action List

### ✅ Already Done (No Action Needed)
- `Subscriptions.tsx` admin view
- `WebRegister.tsx` auth page
- `Dashboard.tsx`, `WidgetRenderers.tsx`, `DashboardCanvas.tsx`

### 🔴 New Module: `src/modules/archive`
- [ ] Create `src/modules/archive/` scaffold
- [ ] Port Process Editor components (refactor to `@/core`)
- [ ] Port Channels / Networking components
- [ ] Add sidemenu "Archive" entry with `/archive/*` routes
- [ ] Guard with backend availability check (automation schema)

### 🟡 Quick Nav Wins (No New Components)
- [ ] Add `/crm/accounts`, `/crm/deals`, `/crm/leads` nav links
- [ ] Add `/admin/location-categories`, `/admin/service-categories`, `/admin/service-offerings`, `/admin/service-types` routes (all use `GenericDynamicPage`)

### 🟡 ESM Schema — Port from Bolt
- [ ] Port `TicketForm.tsx` (40KB) → `src/modules/esm/components/TicketForm.tsx`
- [ ] Port `TicketSummary.tsx` → `src/modules/esm/components/TicketSummary.tsx`
- [ ] Port `AutomationLogViewer.tsx` → `src/modules/esm/components/AutomationLogViewer.tsx`
- [ ] Port `QrTicketForm.tsx` → public route `/esm/qr-ticket`

### 🟡 Admin Completion
- [ ] Complete `Notifications.tsx` (15KB bolt version) → `src/modules/admin/pages/Notifications.tsx`

### ⚪ Deferred
- [ ] `WorkflowEditor` from auth — needs clarification on destination

---

## Referenced Files
- `doc/03-23-2026/unmigrated_components.md`
- `vite_tanstack_bolt/src/components/pages/ProcessEditor/` (45KB ProcessEdit.tsx, 37KB ProcessEditVisual.tsx)
- `vite_tanstack_bolt/src/components/pages/Channels/` (13 files, ~100KB)
- `vite_tanstack_bolt/src/pages/crm/` (4 thin stubs)
- `vite_tanstack_bolt/src/components/pages/Clients/` (TicketForm 40KB, TicketSummary 15KB)
- `vite_tanstack_bolt/src/pages/admin/` (15 files)
- `vite_tanstack_bolt/src/pages/auth/WorkflowEditor copy 2.tsx` (36KB)
- `src/modules/crm/`, `src/modules/esm/`, `src/modules/admin/`, `src/routes/index.tsx`
