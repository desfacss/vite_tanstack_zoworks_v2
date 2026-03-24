# Implementation Plan - Final Public Pages (Shop)

**Session**: 2026-03-24 ~22:30–23:50 IST

This plan outlines the steps to complete the public-facing experience for the ecommerce platform, transitioning from mocked states to a fully integrated database-backed system.

## Proposed Changes

### 1. Account & Personalization
- **Order History**: Fetch and display real orders from `commerce.orders`.
- **Address Book**: CRUD operations for `crm.contacts` addresses.
- **Wishlist Page**: Dedicated listing for saved items.

### 2. Product Discovery Enhancements
- **Category Landing Page**: Rich landing page for categories with sub-category grids and featured items.
- **Brand Page**: Dynamic page for brand-specific collections.

### 3. Transactional Integrity
- **Cart Sync**: Sync LocalStorage cart with `commerce.carts` upon login.
- **Real Checkout**: Implement real order creation in `commerce.orders` and `commerce.order_items`.

### 4. Dynamic Features
- **Review System**: Component for submitting and viewing reviews from `commerce.reviews`.

## Proposed Files
- `src/modules/shop/pages/account/OrderHistoryPage.tsx` [NEW]
- `src/modules/shop/pages/account/AddressBookPage.tsx` [NEW]
- `src/modules/shop/pages/WishlistPage.tsx` [NEW]
- `src/modules/shop/pages/CategoryLandingPage.tsx` [NEW]
- `src/modules/shop/pages/BrandPage.tsx` [NEW]
- `src/modules/shop/services/cartService.ts` [MODIFY]
- `src/modules/shop/services/checkoutService.ts` [MODIFY]
- `src/modules/shop/components/ReviewSystem.tsx` [NEW]
