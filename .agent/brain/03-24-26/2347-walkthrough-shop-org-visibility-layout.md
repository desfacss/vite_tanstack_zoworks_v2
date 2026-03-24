# Walkthrough: Shop Organization Visibility & Layout Refactoring

**Session**: 2026-03-24 ~22:30–23:47 IST

This refactor centralizes the organization ID resolution and introduces a configurable "Top" filter layout for the product listing page.

## Changes Made

### 1. Centralized Organization Context
- **ShopContext.tsx**: Created a new provider to resolve `orgId` (prioritizing active session, falling back to `VITE_PUBLIC_ORG_ID`) and merge tenant-specific `shop_config`.
- **ShopLayout.tsx**: Wrapped the shop module with `ShopProvider`.

### 2. Multi-Tenant Data Service
- **dataService.ts**: Refactored `getProducts`, `getFeaturedProducts`, `getProductById`, and `searchProducts` to accept a dynamic `orgId`. This removes the dependence on environment variables deep in the service layer.

### 3. Configurable "Top" Filter Layout
- **ProductListingPage.tsx**: Implemented a horizontal filter bar that activates when `plp_filter_position` is set to `'top'`.
- **shop.css**: Added styles for `.shop-filter-bar-top` and its children.

### 4. Module-Wide Adoption
Updated the following pages to use the centralized `useShop()` hook:
- `HomePage.tsx`
- `ProductListingPage.tsx`
- `ProductDetailsPage.tsx`
- `SearchResultsPage.tsx`
- `BookingPage.tsx`

## Verification Results

### Organization ID Resolution
- When logged in, the `orgId` correctly switches to the user's organization.
- When logged out, it falls back to the `VITE_PUBLIC_ORG_ID`.

### PLP Layout
- The sidebar layout remains the default.
- Setting `plp_filter_position: 'top'` in `ShopConfig` correctly renders the horizontal bar.

### Data Visibility
- Offerings are now filtered strictly by the resolved `organization_id`, solving the "Bad Request" and visibility issues.

## Modified Files
- `src/modules/shop/context/ShopContext.tsx`
- `src/modules/shop/pages/ShopLayout.tsx`
- `src/modules/shop/services/dataService.ts`
- `src/modules/shop/pages/ProductListingPage.tsx`
- `src/modules/shop/pages/HomePage.tsx`
- `src/modules/shop/pages/ProductDetailsPage.tsx`
- `src/modules/shop/pages/SearchResultsPage.tsx`
- `src/modules/shop/pages/BookingPage.tsx`
- `src/modules/shop/types/config.ts`
- `src/modules/shop/shop.css`
