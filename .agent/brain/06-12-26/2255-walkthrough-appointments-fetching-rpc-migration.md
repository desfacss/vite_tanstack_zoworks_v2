# Session Archive: Appointments Fetching RPC Migration

**Session**: 2026-06-12 ~17:32–22:55 IST

This session focused on refactoring data fetching reads in the Appointments module from direct table/view queries (`.from(...)`) to the standardized `core.api_new_fetch_entity_records` RPC.

---

## 1. Migration Overview & Design
We migrated all read operations in the Appointments module (both public page and admin control panel tabs/modals) to invoke `core.api_new_fetch_entity_records`. The configuration is passed to the RPC as:
```json
{
  "entity_schema": "schema_name",
  "entity_name": "entity_or_view_name",
  "organization_id": "organization_uuid",
  "filters": [],
  "pagination": { "limit": 1000 },
  "sorting": { "column": "col", "direction": "ASC" }
}
```

### ResourceFormModal Exception
During verification, the existing users select dropdown list broke because it relies on selecting a complex nested join shape on `identity.organization_users` (`users:users!organization_users_user_id_fkey(...)`). Per explicit user instruction, we reverted this query back to its original direct table select to preserve compatibility.

---

## 2. Changes Implemented

### Admin Panel & Components
- **[UseCaseSelector.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/UseCaseSelector.tsx)**:
  - Migrated organizations fetch query.
- **[ResourceRequirementsBuilder.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/modals/ResourceRequirementsBuilder.tsx)**:
  - Migrated bookable resources (`v_bookable_resources`) query.
- **[ResourceFormModal.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/modals/ResourceFormModal.tsx)**:
  - Initially refactored, then reverted back to direct table select to retain the nested `users` join layout.
- **[EventTypeFormModal.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/modals/EventTypeFormModal.tsx)**:
  - Migrated locations query.
- **[CalendarIntegrationModal.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/modals/CalendarIntegrationModal.tsx)**:
  - Migrated calendar integrations queries.
- **[SettingsTab.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/tabs/SettingsTab.tsx)**:
  - Migrated organization settings query.
- **[ResourcesTab.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/tabs/ResourcesTab.tsx)**:
  - Migrated bookable resources and calendar integrations queries.
- **[OverviewTab.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/tabs/OverviewTab.tsx)**:
  - Migrated organization stats, resources, event types, locations, and bookings queries to call the RPC and computed stats locally on the result arrays.
- **[LocationsTab.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/tabs/LocationsTab.tsx)**:
  - Migrated locations and territories queries.
- **[EventTypesTab.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/tabs/EventTypesTab.tsx)**:
  - Migrated event types list query.
- **[AnalyticsTab.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/tabs/AnalyticsTab.tsx)**:
  - Migrated bookings query.
- **[SeedDataButton.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/SeedDataButton.tsx)**:
  - Migrated verification read checking event types count.

---

## 3. Verification & Compliance
- Checked TypeScript schema types compatibility on refactored views and components.
- Standardized return formats (mapping `response.data.data` rows into states).
- Verified RLS scopes remain fully enforced through correct schema cache calls.

---

## 4. Traceability

### Modified Frontend Files
1. [UseCaseSelector.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/UseCaseSelector.tsx)
2. [ResourceRequirementsBuilder.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/modals/ResourceRequirementsBuilder.tsx)
3. [ResourceFormModal.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/modals/ResourceFormModal.tsx)
4. [EventTypeFormModal.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/modals/EventTypeFormModal.tsx)
5. [CalendarIntegrationModal.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/modals/CalendarIntegrationModal.tsx)
6. [SettingsTab.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/tabs/SettingsTab.tsx)
7. [ResourcesTab.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/tabs/ResourcesTab.tsx)
8. [OverviewTab.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/tabs/OverviewTab.tsx)
9. [LocationsTab.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/tabs/LocationsTab.tsx)
10. [EventTypesTab.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/tabs/EventTypesTab.tsx)
11. [AnalyticsTab.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/tabs/AnalyticsTab.tsx)
12. [SeedDataButton.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/appointments/components/admin/SeedDataButton.tsx)

### Database Objects Referenced (Read-only API)
- `identity.organizations` (via `v_organizations` logical mapping)
- `cal.v_bookable_resources`
- `identity.organization_users` (via `v_organization_users` logical mapping & direct fallback query)
- `identity.locations` (via `v_locations` logical mapping)
- `cal.calendar_integrations` (via `v_calendar_integrations` logical mapping)
- `cal.event_types` (via `v_event_types` logical mapping)
- `cal.v_bookings`
- `cal.territories` (via `v_territories` logical mapping)
