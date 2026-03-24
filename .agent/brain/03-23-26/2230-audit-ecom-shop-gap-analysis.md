**Session**: 2026-03-23 ~22:19–22:30 IST

# E-commerce Gap Analysis

## 1. Frontend — What We Already Have

### ✅ Exists & Usable

| Page / Feature | File | Status |
|---|---|---|
| **Authentication — Login** | `src/pages/auth/Login.tsx` | ✅ Full (email/pass + org select, forgot password) |
| **Authentication — Sign Up** | `src/pages/auth/Signup.tsx` | ✅ Full (Google OAuth + email) |
| **Authentication — Reset Password** | `src/pages/auth/ResetPassword.tsx` | ✅ Exists |
| **Authentication — WebRegister** | `src/pages/auth/WebRegister.tsx` | ✅ Exists |
| **Basic Product Catalog** | `src/modules/catalog/pages/EcomCatalogPage.tsx` | ⚠️ Partial — admin/explorer tool quality, not a consumer-facing shop |

### What `EcomCatalogPage.tsx` Already Does
- Fetches data from `catalog.offerings`, `catalog.offering_prices`, `catalog.discounts`, `catalog.discount_rules`, `catalog.offering_bundles`, `catalog.bundle_items`, `catalog.offering_variants`, `catalog.price_lists`
- Search + filter by type (product, service, digital…)
- Card grid view of offerings
- Modal detail view (prices, variants, bundles, discounts)
- "Add to Cart" — **only a `console.log` placeholder, no real cart**

### What `EcomCatalogPage.tsx` Is Missing
- No `offering_categories` support (no category navigation)
- No product images (schema has `meta jsonb` but no dedicated image column)
- No inventory status display (reads `inventory_levels` — **not fetched**)
- No real Add-to-Cart logic (state, persistence)
- No pagination or infinite scroll
- No price range filter
- No variant attribute-based filter (color, size sidebar)
- No sort options
- Not consumer UX — it looks like an admin tool

---

## 2. Frontend — What is Missing (All Gaps)

### 🔴 Catalog Schema Pages (Need New Frontend + Existing DB Tables)
These can use **Supabase directly** since the tables exist:

| Page | Gap |
|---|---|
| **Homepage** | 100% missing — featured products, banners, category nav, hero |
| **Product Listing Page (PLP)** | Needs complete rewrite with category filter, price range, variant filter, sort, pagination |
| **Product Details Page (PDP)** | Needs complete rewrite — image gallery, variant selector (size/color chips), inventory badge, quantity stepper, bundle display, breadcrumb |
| **Search Results Page** | 100% missing |
| **Wishlist Page** | 100% missing |
| **Compare Page** | 100% missing |

### 🔴 Finance Schema Pages (Need Mock Data — Backend Tables Missing)
All transactional pages — no backend tables exist yet:

| Page | Gap |
|---|---|
| **Cart Page** | 100% missing |
| **Checkout Page** | 100% missing |
| **Payment Page (Razorpay)** | 100% missing |
| **Order Confirmation Page** | 100% missing |
| **Account Dashboard** | 100% missing |
| **Order History** | 100% missing |
| **Order Details** | 100% missing |
| **Profile Management** | 100% missing (user data exists in `identity.users` but no shop UX) |
| **Address Book** | 100% missing |

### 🟡 Support Pages (Static / Partial)
| Page | Gap |
|---|---|
| **Login (shop-skin)** | Exists functionally at `/login` but not styled for the shop context |
| **Sign Up (shop-skin)** | Exists at `/signup` — needs shop branding wrapper |
| **Forgot Password** | Embedded in Login — needs own `/shop/forgot-password` route |
| **Contact Us / FAQ / Policies** | 100% missing |

---

## 3. Does the Implementation Plan Address Everything?

### ✅ Plan Covers
- New `shop` module structure with data service abstraction (mock → Supabase)
- Homepage, PLP, PDP, Cart, Checkout, Payment, Order Confirmation
- Account section (Dashboard, Orders, Profile, Address)
- Support pages (Contact, FAQ, Policies)
- Route wiring in `routes/index.tsx`

### ❌ Plan Gaps / Needs Clarification

| Gap | Recommendation |
|---|---|
| **Auth pages for shop context** | Auth pages exist but need a "shop-aware" context (redirect to `/shop` after login, not `/dashboard`) |
| **Product Images** | `catalog.offerings.meta` (JSONB) can store image URLs — plan needs to define convention e.g. `meta.images[]` |
| **Wishlist persistence** | Plan says "localStorage" — but wishlist should be user-scoped. Needs `finance.wishlists` table OR local-only clearly stated |
| **`offering_categories` — no image/icon field** | Category cards on Homepage/PLP won't have images. Plan should note this and use icons or color-coded placeholder |
| **Cart state strategy** | Plan says localStorage, but for logged-in users we ideally sync it. Need to define clearly: phase 1 = localStorage only |
| **Razorpay integration scope** | Plan says "wrapper" — need to clarify: are we building a real Razorpay checkout or a UI mockup only? |

---

## 4. Backend Gaps

### `catalog` Schema — What Exists vs. What's Missing

| Table | Exists | Shop Use | Gap |
|---|---|---|---|
| `catalog.offerings` | ✅ | PLP, PDP | No `images` column — use `meta.images[]` convention |
| `catalog.offering_categories` | ✅ | Homepage nav, PLP filter | No `image_url` or `icon` field |
| `catalog.offering_variants` | ✅ | PDP | `attributes` is JSONB — valid, but no schema enforcement |
| `catalog.offering_prices` | ✅ | PLP, PDP | ✅ Sufficient |
| `catalog.price_lists` | ✅ | Checkout | ✅ Sufficient |
| `catalog.discounts` | ✅ | Cart, Checkout | ✅ Sufficient |
| `catalog.discount_rules` | ✅ | Cart | ✅ Sufficient |
| `catalog.offering_bundles` | ✅ | PDP | ✅ Sufficient |
| `catalog.bundle_items` | ✅ | PDP | ✅ Sufficient |
| `catalog.inventory_levels` | ✅ | PDP stock badge | ✅ Sufficient |
| `catalog.wishlists` | ❌ MISSING | Wishlist page | **Need new table** |
| `catalog.wishlist_items` | ❌ MISSING | Wishlist page | **Need new table** |

---

### `finance` Schema — All Missing (New Tables Required)

> **None of these tables exist.** All transactional pages must use mock data until created.

#### Orders & Cart
```sql
-- finance.carts  (session/user cart, pre-order)
-- finance.cart_items

-- finance.orders  (placed order)
-- finance.order_items (line items)
-- finance.order_status_history (fulfillment tracking)
```

#### Payments
```sql
-- finance.payments  (payment records, Razorpay transaction IDs)
-- finance.payment_methods (saved cards/UPI for a customer)
-- finance.invoices (generated invoice per order)
```

#### Customer & Addresses
```sql
-- finance.customer_addresses  (shipping/billing saved addresses)
-- finance.customer_profiles   (shop-specific profile: DOB, preferences)
```

#### Subscriptions (if applicable)
```sql
-- finance.subscriptions
-- finance.subscription_items
```

#### Digital Products
```sql
-- finance.digital_downloads  (download links per order_item, expiry)
-- finance.licenses           (license keys)
```

---

## 5. Recommended Schema for Missing Tables

### `finance.carts`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `organization_id` | uuid | FK |
| `user_id` | uuid | nullable (guest cart) |
| `session_id` | text | for guest |
| `status` | text | `active`, `abandoned`, `converted` |
| `created_at` | timestamptz | |

### `finance.cart_items`
| Column | Type | Notes |
|---|---|---|
| `cart_id` | uuid | FK |
| `offering_id` | uuid | FK catalog |
| `variant_id` | uuid | nullable |
| `quantity` | int | |
| `unit_price` | numeric | snapshot at time of add |
| `discount_amount`| numeric | applied discount |

### `finance.orders`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `display_id` | varchar | Human-readable order # |
| `organization_id`| uuid | |
| `user_id` | uuid | |
| `cart_id` | uuid | reference |
| `status` | text | `pending`, `confirmed`, `shipped`, `delivered`, `cancelled` |
| `subtotal` | numeric | |
| `discount_total` | numeric | |
| `shipping_total` | numeric | |
| `tax_total` | numeric | |
| `grand_total` | numeric | |
| `shipping_address`| jsonb | snapshot |
| `billing_address` | jsonb | snapshot |
| `notes` | text | |
| `created_at` | timestamptz | |

### `finance.order_items`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `order_id` | uuid | FK |
| `offering_id` | uuid | FK |
| `variant_id` | uuid | nullable |
| `quantity` | int | |
| `unit_price` | numeric | |
| `discount_amount`| numeric | |
| `line_total` | numeric | |
| `fulfillment_status` | text | `pending`, `shipped`, `delivered` |
| `tracking_number` | text | |

### `finance.payments`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `order_id` | uuid | FK |
| `organization_id`| uuid | |
| `provider` | text | `razorpay`, `stripe`, etc. |
| `provider_order_id` | text | Razorpay order ID |
| `provider_payment_id` | text | Razorpay payment ID |
| `method` | text | `card`, `upi`, `netbanking` |
| `amount` | numeric | |
| `currency` | text | |
| `status` | text | `pending`, `captured`, `failed`, `refunded` |
| `paid_at` | timestamptz | |

### `finance.customer_addresses`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | |
| `organization_id`| uuid | |
| `label` | text | "Home", "Work" |
| `full_name` | text | |
| `phone` | text | |
| `line1` | text | |
| `line2` | text | |
| `city` | text | |
| `state` | text | |
| `postal_code` | text | |
| `country` | text | |
| `is_default_shipping` | bool | |
| `is_default_billing` | bool | |

---

## Referenced Files
- `src/modules/catalog/pages/EcomCatalogPage.tsx`
- `src/pages/auth/Login.tsx`, `Signup.tsx`, `ResetPassword.tsx`, `WebRegister.tsx`
- `src/routes/index.tsx`
- `docs/backend/catalog/schema.sql`
