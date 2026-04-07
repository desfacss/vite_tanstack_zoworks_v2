# Migration Maps Feature Documentation

**Session**: 2026-04-07 ~16:35 IST
**Topic**: Migration Maps Feature Reference

## Overview
The Migration Maps feature is a comprehensive spatial dashboard designed to manage agent tracking and customer geofences during the transition to the new system architecture. It leverage a custom React-Leaflet implementation integrated with the project's standardized dynamic fetching patterns.

## Route Details
- **Agent Tracking Route**: `/migration/tracking`

## Feature Explanation
This feature provides a unified interface for operational visibility:
- **Agent Tracking**: Real-time visualization of agent locations, including historical track playback.
- **Customer Geofencing**: Interactive drawing and management of circular or polygonal geofences for customer accounts.
- **Unified Sidebar**: Integrated lists for quick navigation between agents and customers.

## Supabase Integration

### Data Sources (Tables/Views)
| Object Name | Schema | Description |
|-------------|--------|-------------|
| `loc_agent_locations` | `public` | Real-time and historical agent coordinate data. |
| `accounts` | `crm` | Primary customer account data (migrated from `external`). |
| `v_accounts` | `crm` | Optimized view for account mapping, including geofence data. |
| `users` | `identity` | Agent profile details and identity mapping. |

### RPC Functions
- **`core.api_new_fetch_entity_records`**: The standard V4 data fetcher used for cross-schema joins.
- **Direct Updates**: Geofence updates are performed via direct Supabase `.update()` calls on the `crm.accounts` table to handle PostGIS spatial types efficiently from the UI.

### Payload Structure (RPC Config)
The `api_new_fetch_entity_records` function expects a `config` object with the following structure:
```json
{
  "entity_name": "loc_agent_locations",
  "entity_schema": "public",
  "organization_id": "uuid",
  "include": [
    {
      "entity_name": "users",
      "entity_schema": "identity",
      "on": "user_id",
      "select": ["id", "name", "details"]
    }
  ],
  "pagination": { "limit": 500 },
  "sorting": { "column": "recorded_at", "direction": "DESC" }
}
```

## Component Architecture

| Component Name | Type | Description |
|----------------|------|-------------|
| **`TrackingMigrationPage`** | Page (Custom) | The main page wrapper for the Agent Tracking route. |
| **`CustomerMap`** | Map (Custom) | React-Leaflet implementation with Polygon support and Geofence drawing tools. |
| **`CustomerList` / `AgentList`** | UI (Custom) | Filterable sidebars for selecting entities on the map. |
| **`TrackMap`** | UI (Custom) | Dedicated playback component for historical agent path visualization. |
| **`utils.ts`** | Utility | Contains the `parseWkb` helper for converting PostGIS hex strings to GeoJSON. |

**Modified Files**:
- `src/modules/migration/components/maps/index.tsx`
- `src/modules/migration/components/maps/CustomerMap/CustomerMap.tsx`
- `src/modules/migration/components/maps/utils.ts`
- `src/modules/migration/pages/TrackingMigrationPage.tsx`
