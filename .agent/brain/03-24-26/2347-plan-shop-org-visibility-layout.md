# Implementation Plan - Centralized Org ID & Top Filter Layout

**Session**: 2026-03-24 ~22:30–23:47 IST

This plan addresses the offering visibility issue by resolving the organization ID at the layout level and adds support for the "top" filter position.

## Proposed Changes

### 1. Centralized Shop context
#### [NEW] [ShopContext.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/modules/shop/context/ShopContext.tsx)
- Create a `ShopProvider` and `useShop` hook.
- **Org Resolution Logic**:
  ```ts
  const organization = useAuthStore(s => s.organization);
  const orgId = organization?.id || import.meta.env.VITE_PUBLIC_ORG_ID;
  ```
- **Config Logic**: Merge `DEFAULT_SHOP_CONFIG` with `organization?.app_settings?.shop_config`.

#### [MODIFY] [ShopLayout.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/modules/shop/pages/ShopLayout.tsx)
- Wrap the main content with `<ShopProvider>`.

### 2. Data Service Layer
#### [MODIFY] [dataService.ts](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/modules/shop/services/dataService.ts)
- Update `getProducts`, `getFeaturedProducts`, `searchProducts`, and `getCategories` to accept `orgId: string` as the first argument.

### 3. UI & Layout
#### [MODIFY] [ProductListingPage.tsx](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/modules/shop/pages/ProductListingPage.tsx)
- Use `const { orgId, config } = useShop()`.
- Implement horizontal filter layout for `config.plp_filter_position === 'top'`.

#### [MODIFY] Other Shop Pages
- Update `HomePage`, `ProductDetailsPage`, etc., to use `useShop()` and pass the `orgId`.

#### [MODIFY] [shop.css](file:///c:/Users/ganesh/zoworks/vite_tanstack_zoworks_v2/src/modules/shop/shop.css)
- Add horizontal filter styles.

## Modified Files
- `src/modules/shop/context/ShopContext.tsx` [NEW]
- `src/modules/shop/pages/ShopLayout.tsx`
- `src/modules/shop/services/dataService.ts`
- `src/modules/shop/pages/ProductListingPage.tsx`
- `src/modules/shop/pages/HomePage.tsx`
- `src/modules/shop/pages/ProductDetailsPage.tsx`
- `src/modules/shop/pages/SearchResultsPage.tsx`
- `src/modules/shop/pages/BookingPage.tsx`
- `src/modules/shop/types/config.ts`
- `src/modules/shop/shop.css`
