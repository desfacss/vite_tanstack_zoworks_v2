# Complete Ecommerce Platform Page Inventory

## Part 1: Public-Facing Pages (Customer Experience)

### 1. Home Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Hero Banner | Slideshow with CTA, featured promotion | `catalog.offerings` (featured) |
| Category Grid | Top-level categories with images | `catalog.offering_categories` |
| New Arrivals | Latest products grid | `catalog.offerings`, `catalog.offering_prices` |
| Best Sellers | Top-selling products (by popularity_score) | `catalog.offerings` |
| Featured Services | Highlighted service offerings | `catalog.offerings` (type='service') |
| Testimonials | Customer reviews carousel | `commerce.reviews` |
| Newsletter Signup | Email capture form | - |
| Trust Badges | Payment, shipping, guarantee badges | Config table |

### 2. Product Listing Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Category Header | Category name, description, image | `catalog.offering_categories` |
| Filter Sidebar | Category tree, price range, product type, rating, service filters, digital filters | `catalog.offering_categories`, `catalog.offerings` |
| Active Filters | Chips, clear all button | - |
| Sort Dropdown | Newest, price, popularity, rating | - |
| Product Grid | Product cards with images, title, price, rating, quick add | `catalog.offerings`, `catalog.offering_prices`, `catalog.offering_variants` |
| Pagination | Page numbers, load more, infinite scroll | - |
| Recently Viewed | Products viewed in current session | Session/local storage |

### 3. Product Detail Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Media Gallery | Images, videos, 360° view, digital previews | `catalog.offerings.meta->images` |
| Product Info | Title, SKU, GTIN, brand, description | `catalog.offerings` |
| Pricing | Price, original price, discount, tiered pricing, subscription options | `catalog.offering_prices` |
| Rating Summary | Stars, review count, rating breakdown | `commerce.reviews` |
| Variant Selector | Color swatches, size dropdown, license types, platform selection | `catalog.offering_variants` |
| Inventory Status | Stock level, low stock warning, availability | `catalog.inventory_levels` |
| Quantity Selector | Min/max, bulk pricing | - |
| Add to Cart | Add to cart, buy now, book now, request quote | - |
| Service Booking | Date picker, time slots, provider selection, location check | Config, `catalog.offerings` |
| Digital Delivery | Download format, license type, access duration | - |
| Tabs Section | Description, specifications, reviews, Q&A, return policy | `catalog.offerings`, `commerce.reviews`, `catalog.product_qna` |
| Related Products | Cross-sell, upsell, frequently bought together | `catalog.offerings` |
| Recently Viewed | Products viewed in session | Session/local storage |

### 4. Cart Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Cart Items | Product thumbnails, names, variants, quantity, price, subtotal, remove | `commerce.carts.items` |
| Service Items | Appointment date, time, provider, location, reschedule option | `commerce.carts.items` |
| Digital Items | Download notice, license agreement | `commerce.carts.items` |
| Cart Summary | Subtotal, discounts, shipping estimate, tax, total | - |
| Discount Code | Coupon input, apply, applied discounts list | `catalog.discounts`, `catalog.discount_rules` |
| Shipping Calculator | Pincode, estimated delivery, carrier selection | Config |
| Checkout Actions | Proceed to checkout, express checkout, continue shopping | - |
| Cart Recommendations | Related products, upsell, free shipping progress bar | `catalog.offerings` |

### 5. Checkout Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Contact Information | Email, phone, account creation toggle | - |
| Address Forms | Shipping address, billing address, saved addresses | `crm.contacts` |
| Service Address | Property type, instructions, access details | - |
| Appointment Scheduling | Date picker, time slots, duration (for services) | - |
| Shipping Methods | Standard, express, pickup, local delivery | Config |
| Payment Methods | Card, UPI, netbanking, wallet, COD | `commerce.payments` |
| Order Summary | Cart items, totals, applied discounts | `commerce.carts` |
| Gift Options | Gift wrap, gift message | - |
| Order Notes | Special instructions | - |
| Terms & Conditions | Checkbox, privacy policy | Config |
| Place Order | Submit button, loading state, error handling | `commerce.orders`, `commerce.order_items` |

### 6. Payment Page / Component
| Section | Components | Tables Used |
|---------|------------|-------------|
| Payment Gateway | Razorpay checkout integration, card form, UPI intent | `commerce.payments` |
| Payment Status | Processing, success, failure, retry | `commerce.payments` |
| Order Summary | Order number, total amount | `commerce.orders` |
| Retry Payment | Different method option | `commerce.payments` |

### 7. Order Confirmation Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Success Message | Order number, email confirmation, share buttons | `commerce.orders` |
| Order Summary | All items, quantities, prices, totals | `commerce.orders`, `commerce.order_items` |
| Digital Products | Download links, license keys, expiry, download instructions | `commerce.fulfillments.digital_assets` |
| Service Booking | Provider info, date/time, address, preparation instructions, calendar add | `commerce.fulfillments` |
| Physical Products | Shipping address, tracking link, carrier, estimated delivery | `commerce.fulfillments` |
| Next Steps | Continue shopping, view order, download invoice, track order | - |
| Post-Purchase Upsell | Cross-sell products, service add-ons | `catalog.offerings` |

### 8. My Account Dashboard
| Section | Components | Tables Used |
|---------|------------|-------------|
| Profile Overview | Name, email, phone, member since, avatar | `crm.contacts` |
| Recent Orders | Order list with status, total, view details | `commerce.orders` |
| Quick Actions | Edit profile, change password, address book | - |
| Stats | Orders count, reviews written, wishlist items | Aggregated |

### 9. Order History Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Order List | Order number, date, status, total, items count, reorder, cancel | `commerce.orders` |
| Filters | Date range, status filter, search | - |
| Pagination | Page navigation, items per page | - |
| Export | Download as CSV/PDF | - |

### 10. Order Details Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Order Header | Order number, date, status badge, payment status, fulfillment status | `commerce.orders` |
| Order Timeline | Created, paid, processing, shipped, delivered | `commerce.orders`, `commerce.fulfillments` |
| Items List | All items with images, variants, quantity, price, subtotal | `commerce.order_items` |
| Shipping Information | Address, method, tracking link, carrier, delivery updates | `commerce.fulfillments` |
| Payment Information | Method, transaction ID, amount, status | `commerce.payments` |
| Service Details | Provider, date/time, instructions, reschedule | `commerce.fulfillments` |
| Digital Downloads | Download links, license keys, expiry | `commerce.fulfillments.digital_assets` |
| Invoice | Download invoice PDF | `finance.invoices` |
| Actions | Cancel order, return items, reorder, get support | - |

### 11. Digital Library Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Library Grid | Cover image, title, download button, license key, expiry | `commerce.fulfillments.digital_assets` |
| Course Access | Progress tracking, lesson list, certificate | Custom tables |
| Software Management | Device list, revoke access, download installer | Custom tables |
| License Keys | Copy button, activate now, support | - |
| Expiry Alerts | Days remaining, renew button | - |

### 12. Service Bookings Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Upcoming Appointments | Service name, provider, date/time, address, reschedule/cancel | `commerce.fulfillments` |
| Past Bookings | Completed services, rebook, rate/review | `commerce.fulfillments` |
| Service History | All service interactions, invoices, feedback | - |
| Provider Ratings | Rate provider, feedback form | `commerce.reviews` |

### 13. Wishlist Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Wishlist Grid | Product cards, price, add to cart, remove, move to cart | `crm.wishlist` (new) |
| Notify Me | In-stock alerts, price drop alerts | - |
| Share Wishlist | Social sharing, shareable link | - |

### 14. Compare Products Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Product Comparison Table | Images, names, prices, ratings, specifications side by side | `catalog.offerings` |
| Add to Cart | Individual or bulk add | - |
| Remove from Compare | Individual removal, clear all | - |

### 15. Reviews & Ratings Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| My Reviews | All reviews with product, rating, content, edit, delete | `commerce.reviews` |
| Pending Reviews | Products purchased but not reviewed | `commerce.orders`, `commerce.order_items` |
| Merchant Responses | Replies to reviews | `commerce.reviews` |
| Review Form | Rating stars, title, content, images | `commerce.reviews` |

### 16. Returns Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Return Request Form | Select order, items, reason, images, notes | `commerce.returns` |
| Return Status | Active returns, tracking, refund status | `commerce.returns` |
| Return History | Past returns, approved/denied, refund amounts | `commerce.returns` |

### 17. Address Book Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Address List | Saved addresses, default marker, edit/delete | `crm.addresses` (new) |
| Add Address Form | Full address, label (home/work), default toggle | - |
| Map Integration | Location picker, pin drop | - |

### 18. Account Settings Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Profile Settings | Name, email, phone, avatar upload | `crm.contacts` |
| Change Password | Current password, new password, confirm | `identity.users` |
| Two-Factor Authentication | Enable/disable, backup codes | `identity.users` |
| Email Preferences | Newsletter, order updates, promotions | `crm.contacts` |
| Delete Account | Confirmation, data export | - |

### 19. Search Results Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Search Header | Query display, result count, search tips | - |
| Filter Sidebar | Same as product listing | `catalog.offerings` |
| Search Results | Product grid with relevance highlighting | `catalog.offerings` |
| Did You Mean | Spelling suggestions | Search index |
| No Results | Suggestions, browse categories | - |

### 20. Category Landing Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Category Header | Banner image, description, subcategories | `catalog.offering_categories` |
| Subcategory Grid | Child categories with images | `catalog.offering_categories` |
| Featured Products | Category featured items | `catalog.offerings` |
| Product Grid | Products in category with filters | `catalog.offerings` |

### 21. Brand Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Brand Header | Logo, description, social links | `catalog.offerings` (distinct brands) |
| Brand Products | All products from brand | `catalog.offerings` |
| Brand Story | About the brand, mission | - |

### 22. Gift Cards Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Gift Card Selection | Amount options, custom amount, design | `commerce.gift_cards` (new) |
| Personalization | Recipient, message, delivery date | - |
| Purchase Flow | Add to cart, checkout, delivery | - |

### 23. Bulk Order / Quote Request Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Bulk Order Form | Product list, quantities, expected date | - |
| Company Details | GST, business name, purchase order number | - |
| Quote Request | Submit for approval, callback request | - |

---

## Part 2: Admin Pages (Commerce Management)

### 24. Dashboard
| Section | Components | Tables Used |
|---------|------------|-------------|
| Sales Overview | Today's sales, this week, this month, revenue chart | `commerce.orders` |
| Order Stats | Pending, processing, shipped, delivered, cancelled | `commerce.orders` |
| Top Products | Best sellers by quantity, revenue | `commerce.order_items` |
| Recent Orders | Latest orders table, status badges | `commerce.orders` |
| Low Stock Alerts | Products below reorder point | `catalog.inventory_levels` |
| Pending Reviews | Unanswered product Q&A | `catalog.product_qna` |
| Service Bookings | Today's appointments, upcoming | `commerce.fulfillments` |

### 25. Orders Management Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Order List | All orders with filters, search, bulk actions | `commerce.orders` |
| Order Filters | Date range, status, payment status, customer, order type | - |
| Order Detail Modal | Full order view, status update, notes, refund | `commerce.orders`, `commerce.order_items` |
| Order Actions | Update status, add tracking, cancel, refund, mark as paid | - |
| Export Orders | CSV/Excel export with selected columns | - |

### 26. Order Details (Admin View)
| Section | Components | Tables Used |
|---------|------------|-------------|
| Order Info | Order number, customer, date, totals, status badges | `commerce.orders` |
| Customer Info | Contact details, address, order history link | `crm.contacts` |
| Items Table | All items, variants, quantity, price, subtotal | `commerce.order_items` |
| Fulfillment | Create fulfillment, tracking number, carrier, shipped at | `commerce.fulfillments` |
| Digital Assets | Upload files, generate license keys, set expiry | `commerce.fulfillments.digital_assets` |
| Payment Info | Payment method, transaction ID, capture/refund | `commerce.payments` |
| Order Timeline | All status changes, notifications, admin notes | `commerce.orders.updated_at` |
| Actions | Update status, add note, send email, print invoice | - |

### 27. Fulfillment Management Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Unfulfilled Orders | Orders pending fulfillment | `commerce.orders`, `commerce.order_items` |
| Create Fulfillment | Select items, add tracking, print packing slip | `commerce.fulfillments` |
| Bulk Fulfillment | CSV upload, batch processing | - |
| Fulfillment List | All shipments with status, carrier, tracking | `commerce.fulfillments` |
| Digital Fulfillment | Upload files, manage downloads, revoke access | `commerce.fulfillments.digital_assets` |

### 28. Returns Management Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Return Requests | All returns with status, reason, actions | `commerce.returns` |
| Return Details | Items, reason, images, customer request | `commerce.returns` |
| Approve/Reject | Approve with refund amount, reject with reason | `commerce.returns` |
| Return Tracking | Generate label, track incoming returns | - |
| Refund Process | Process refund via Razorpay, mark refunded | `commerce.payments` |

### 29. Product Management Page (Catalog Admin)
| Section | Components | Tables Used |
|---------|------------|-------------|
| Product List | All products with search, filters, bulk actions | `catalog.offerings` |
| Add/Edit Product | Product form with all fields | `catalog.offerings` |
| Variants Management | Variant table, add/remove variants, SKU management | `catalog.offering_variants` |
| Pricing Management | Price list selection, tiered pricing, quantity breaks | `catalog.offering_prices` |
| Inventory Management | Stock levels per location, reorder points | `catalog.inventory_levels` |
| Media Management | Upload images, videos, previews | Storage bucket |
| Product Type Config | Digital, service, physical specific fields | - |
| SEO | Meta tags, URL slug, structured data | `catalog.offerings` |
| Q&A Management | View questions, add answers, mark automated | `catalog.product_qna` |

### 30. Category Management Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Category Tree | Hierarchical view, drag-drop reorder | `catalog.offering_categories` |
| Add/Edit Category | Name, slug, description, image, parent | `catalog.offering_categories` |
| Category Settings | Meta tags, SEO, visibility | `catalog.offering_categories` |
| Category Products | View/manage products in category | `catalog.offerings` |

### 31. Discount & Promotion Management Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Discount List | All active/inactive discounts | `catalog.discounts` |
| Add Discount | Type, value, dates, usage limits | `catalog.discounts` |
| Rules Builder | Conditional rules, target products, categories | `catalog.discount_rules` |
| Coupon Codes | Generate codes, bulk import | `catalog.discounts` |
| Usage Stats | Times used, revenue affected | Analytics |

### 32. Price List Management Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Price List List | All price lists, active/inactive | `catalog.price_lists` |
| Add/Edit Price List | Name, code, dates, description | `catalog.price_lists` |
| Price Assignment | Bulk assign prices to products/variants | `catalog.offering_prices` |
| Import/Export | CSV import, export for updates | - |

### 33. Review Moderation Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Pending Reviews | Reviews awaiting approval | `commerce.reviews` |
| Review Details | Content, rating, product, customer, order | `commerce.reviews` |
| Approve/Reject | Approve with public, reject with reason | `commerce.reviews` |
| Reply to Reviews | Merchant responses | `commerce.reviews` |
| Flagged Reviews | Inappropriate content, spam | `commerce.reviews` |

### 34. Customer Management Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Customer List | All customers, search, filters | `crm.contacts` |
| Customer Details | Orders, reviews, activity, edit profile | `crm.contacts` |
| Customer Segments | Create segments, filters, marketing lists | `crm.customer_segments` (new) |
| Import/Export | CSV import, export customer data | - |

### 35. Service Provider Management Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Provider List | All service providers, active/inactive | `crm.service_providers` (new) |
| Provider Details | Profile, skills, service areas, ratings, schedule | New tables |
| Provider Schedule | Calendar, availability, time slots | New tables |
| Assign Orders | Assign providers to service orders | `commerce.fulfillments` |
| Provider Payouts | Payments, commission, settlement | New tables |

### 36. Location/Store Management Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Location List | All locations, type (warehouse, store, service) | `identity.locations` |
| Location Details | Address, contact, hours, service area | `identity.locations` |
| Inventory per Location | Stock levels, transfers, adjustments | `catalog.inventory_levels` |
| Pickup Orders | Manage pickup orders per location | `commerce.fulfillments` |

### 37. Shipping Management Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Shipping Zones | Countries, regions, pincodes | New tables |
| Shipping Methods | Carrier, rates, delivery estimates | Config |
| Shipping Rules | Free shipping threshold, weight-based | Config |
| Carrier Integration | API keys, tracking setup | Config |

### 38. Payment Settings Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Gateway Configuration | Razorpay keys, webhook URLs | Config |
| Payment Methods | Enabled methods, order, display | Config |
| Transaction Log | All payments, failures, refunds | `commerce.payments` |
| Settlement Reports | Daily/weekly settlement reports | - |

### 39. Tax Settings Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Tax Rates | GST/VAT rates per region | Config |
| Tax Rules | Product type based, customer type based | Config |
| Tax Inclusive/Exclusive | Price display setting | Config |
| Tax Reports | Tax collected, filed status | - |

### 41. Webhook Management Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Webhook List | Endpoints, events, status | New table |
| Add Webhook | URL, secret, events to send | New table |
| Event Log | All webhook attempts, responses | `commerce.webhook_events` |
| Retry Failed | Manual retry for failed webhooks | - |

### 42. Integration Settings Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| ONDC Settings | Network ID, subscriber ID, webhook URLs | Config |
| UCP Settings | Merchant ID, product feed URL, OAuth | Config |
| ACP Settings | Feed URL, delegated payment config | Config |
| Google Merchant Center | Feed schedule, sync status | Config |

### 43. Analytics & Reports Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Sales Report | Revenue, orders, AOV, by day/week/month | `commerce.orders` |
| Product Performance | Top sellers, revenue by product | `commerce.order_items` |
| Customer Analytics | New vs returning, lifetime value | `commerce.orders`, `crm.contacts` |
| Service Analytics | Bookings, completion rate, provider performance | `commerce.fulfillments` |
| Inventory Report | Stock levels, turnover, reorder | `catalog.inventory_levels` |
| Export Reports | CSV/PDF download, scheduled reports | - |

### 44. Tenant Configuration Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| General Settings | Store name, logo, favicon, currency | Config table |
| Theme Settings | Colors, fonts, layout, CSS overrides | Config table |
| Page Builder | Configure each page layout, components | Config table |
| Checkout Settings | Fields, methods, steps, customization | Config table |
| Feature Flags | Enable/disable features per tenant | Config table |
| Custom Fields | Add custom fields to products, orders | Config table |

### 45. Digital Assets Management Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Asset Library | All uploaded files, categories, tags | Storage bucket |
| License Key Generator | Generate keys, bulk import, expiry | `catalog.license_keys` (new) |
| Download Limits | Per product, per customer tracking | New table |
| Access Revocation | Revoke access, manage devices | New table |

### 46. Bulk Operations Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Bulk Product Import | CSV template, mapping, validation | `catalog.offerings` |
| Bulk Price Update | CSV, price list assignment | `catalog.offering_prices` |
| Bulk Inventory Update | CSV, stock adjustment | `catalog.inventory_levels` |
| Bulk Order Status | Update multiple orders | `commerce.orders` |
| Import History | Past imports, errors, rollback | New table |

### 47. Audit Log Page
| Section | Components | Tables Used |
|---------|------------|-------------|
| Activity Log | All admin actions, user, timestamp | New table |
| Order Audit | Status changes, notes, edits | `commerce.orders` |
| Login History | Admin login attempts | `identity.user_sessions` |
| Export Logs | CSV export for compliance | - |

---

## Page Count Summary

| Category | Page Count |
|----------|------------|
| **Public-Facing Pages** | 23 |
| **Admin Management Pages** | 24 |
| **Sub-pages/Modals** | Many within main pages |
| **Total Unique Pages** | **47+** |

---

## Missing Pages from the Plan (Now Covered)

| Page | Previously Missing? | Now Covered |
|------|-------------------|-------------|
| Home Page | ❌ | ✅ Section 1 |
| Category Landing | ❌ | ✅ Section 20 |
| Brand Page | ❌ | ✅ Section 21 |
| Search Results | ❌ | ✅ Section 19 |
| Gift Cards | ❌ | ✅ Section 22 |
| Bulk Order/Quote | ❌ | ✅ Section 23 |
| Digital Library | ❌ | ✅ Section 11 |
| Service Bookings | ❌ | ✅ Section 12 |
| Wishlist | ❌ | ✅ Section 13 |
| Compare Products | ❌ | ✅ Section 14 |
| Reviews & Ratings | ❌ | ✅ Section 15 |
| Returns Page | ❌ | ✅ Section 16 |
| Address Book | ❌ | ✅ Section 17 |
| Account Settings | ❌ | ✅ Section 18 |
| Dashboard (Admin) | ❌ | ✅ Section 24 |
| Order Management | ❌ | ✅ Section 25-26 |
| Fulfillment | ❌ | ✅ Section 27 |
| Returns Admin | ❌ | ✅ Section 28 |
| Product Admin | ❌ | ✅ Section 29 |
| Category Admin | ❌ | ✅ Section 30 |
| Discounts Admin | ❌ | ✅ Section 31 |
| Price Lists Admin | ❌ | ✅ Section 32 |
| Review Moderation | ❌ | ✅ Section 33 |
| Customer Admin | ❌ | ✅ Section 34 |
| Service Provider | ❌ | ✅ Section 35 |
| Location Admin | ❌ | ✅ Section 36 |
| Shipping Admin | ❌ | ✅ Section 37 |
| Payment Settings | ❌ | ✅ Section 38 |
| Tax Settings | ❌ | ✅ Section 39 |
| Webhook Admin | ❌ | ✅ Section 41 |
| Integration Settings | ❌ | ✅ Section 42 |
| Analytics | ❌ | ✅ Section 43 |
| Tenant Config | ❌ | ✅ Section 44 |
| Digital Assets | ❌ | ✅ Section 45 |
| Bulk Operations | ❌ | ✅ Section 46 |
| Audit Log | ❌ | ✅ Section 47 |
