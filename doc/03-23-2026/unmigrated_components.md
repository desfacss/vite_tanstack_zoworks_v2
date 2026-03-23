# Unmigrated Components and Pages Audit (03-23-2026)

This document lists the components and pages from the `vite_tanstack_bolt` project that have not yet been migrated to the main project.

## 1. Process Editor & Workflow Engine
Bolt contains a sophisticated visual process editor that is not fully present in the main project.
- **Components (`src/components/pages/ProcessEditor`)**:
    Lets bring this under new sidemenu module called archive(backend tables in automation)
    - `ProcessEdit.tsx` (Visual and form-based process editor)
    - `ProcessEditVisual.tsx` (React Flow based visual editor)
    - `flow.tsx` (Workflow logic)
    - `ProcessViewer/`
    - `ProjectPlan/`
    - `Scheduler/`
    - `processEditor-processv3.tsx`

## 2. Channels & Networking (Social/Communication)
A module for messaging, networking, and social-style interactions.
- **Components (`src/components/pages/Channels`)**:
    Lets bring this under new sidemenu module called archive(backend tables may not be available)
    - `ChannelPostMessages.tsx`
    - `Comments.tsx`
    - `Networking.tsx`
    - `Post.tsx`
    - `PostMessage.tsx`
    - `CategorySelector.tsx`

## 3. CRM Modules
While the main project has a CRM module, several key entities from Bolt are missing.
- **Pages (`src/pages/crm`)**:
    MOVED TO CRM SCHEMA
    - `Accounts.tsx`
    - `Deals.tsx`
    - `Leads.tsx`
- **Existing in Main**: `Contacts.tsx`

## 4. Ticketing & Client Support
Bolt has specialized ticketing and support components that may be more advanced than those in the main project's `tickets` module.
- **Components (`src/components/pages/Clients`)**:
    MOVED TO ESM SCHEMA
    - `TicketForm.tsx` (Complex 40KB form)
    - `SupportTicketProgress.tsx`
    - `QrTicketForm.tsx`
    - `AutomationLogViewer.tsx`
    - `TicketSummary.tsx`

## 5. Admin & Management Pages
Several administrative management pages from Bolt's admin folder are missing.
- **Pages (`src/pages/admin`)**:
    - Partial- `Notifications.tsx` (Management UI)
    - Done - `Subscriptions.tsx` (Admin/Management view)
    - Partial - `Shopping.tsx` / `Catalog.tsx` (Admin view)
    - `LocationCategories.tsx`
    - `ServiceCategories.tsx`
    - `ServiceOfferings.tsx`
    - `ServiceTypes.tsx`

## 6. Authentication & Registration
- **Pages (`src/pages/auth`)**:
    - Done - `WebRegister.tsx` (Special registration flow)
    - `WorkflowEditor.tsx` (Integrated in auth flow in Bolt)

## 7. Dashboards
The dashboard implementations differ significantly in size and potentially in features.
- **Pages (`src/pages`)**:
    - Done - `Dashboard.tsx` (Bolt version is 157KB, Main project is 11KB)
    - Done - `WidgetRenderers.tsx` (Bolt version 105KB, Main project 13KB)
    - Done - `DashboardCanvas.tsx` (Bolt version 54KB, Main project 7KB)

---
**Note**: Many of these components may require significant refactoring to use the main project's `@/core` libraries, `identity` schema, and standardized styling.
