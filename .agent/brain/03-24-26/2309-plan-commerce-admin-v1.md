# Implementation Plan - Commerce Admin Module (Part 2)
**Session**: 2026-03-24 ~23:09 IST

This plan outlines the implementation of the Commerce Management (Admin) pages, enabling internal users to manage orders, fulfillments, returns, and view business analytics.

## Proposed Changes

### Configuration
#### [MODIFY] [menuConfig.json](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/config/menuConfig.json)
- Add new entries to the `commerce` module:
    - `Dashboard` (`/commerce/dashboard`)
    - `Orders` (`/commerce/orders`)
    - `Fulfillments` (`/commerce/fulfillments`)
    - `Returns` (`/commerce/returns`)
    - `Reviews` (`/commerce/reviews`)
    - `Settings` (`/commerce/settings`)

### Routing
#### [MODIFY] [index.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/routes/index.tsx)
- Add routes for the new commerce admin pages under the `AuthGuard`.
- Lazy load the new components.

### Components
#### [NEW] [Dashboard.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/modules/commerce/pages/admin/Dashboard.tsx)
- Custom dashboard with statistics cards (Revenue, Orders, Low Stock) and simple charts.
#### [NEW] [OrdersPage.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/modules/commerce/pages/admin/OrdersPage.tsx)
- Use `DynamicViews` to manage `commerce.orders`.
#### [NEW] [FulfillmentsPage.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/modules/commerce/pages/admin/FulfillmentsPage.tsx)
- Use `DynamicViews` to manage `commerce.fulfillments`.
#### [NEW] [ReturnsPage.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/modules/commerce/pages/admin/ReturnsPage.tsx)
- Use `DynamicViews` to manage `commerce.returns`.
#### [NEW] [ReviewsPage.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/modules/commerce/pages/admin/ReviewsPage.tsx)
- Use `DynamicViews` to manage `commerce.reviews`.
#### [NEW] [CommerceSettings.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/modules/commerce/pages/admin/CommerceSettings.tsx)
- Form to manage commerce-specific settings (tax rates, shipping methods, payment gateway toggles).

## Verification Plan

### Automated Tests
- N/A (Focus on UI/Integration)

### Manual Verification
1. Login as an internal user.
2. Navigate to the "Commerce" menu.
3. Verify all new items are visible in the sidebar.
4. Navigate to each page and ensure data is loaded from Supabase via `DynamicViews`.
5. Check if the Dashboard shows plausible (or empty) stats.
6. Verify Settings can be updated (will use `organization.app_settings`).

## Files to be Modified
- `src/config/menuConfig.json`
- `src/routes/index.tsx`
- `src/modules/commerce/pages/admin/*` [NEW]

## Database Objects Referenced
- `commerce.orders`
- `commerce.fulfillments`
- `commerce.returns`
- `commerce.reviews`
- `catalog.offerings`
- `catalog.inventory_levels`
