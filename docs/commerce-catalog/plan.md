# Ecommerce Platform Implementation Plan

## Project Summary

Build a **headless, multi-tenant ecommerce platform** supporting:
- **Digital Products** (downloadable files, license keys, software)
- **Services** (appointment-based, location-based, quote-based like Urban Company/NoBroker)
- **Physical Products** (DTC brand ecommerce like Shopify)

The platform uses **Supabase** for backend with **flexible UI theming** where each page's layout, components, and styling are configurable per tenant through a centralized configuration system.

---

## Core Architecture Principles

### 1. Tenant-Specific Configuration
Every UI component has a `config` section that defines:
- Layout structure (grid, columns, ordering)
- Component visibility
- Styling (colors, spacing, typography)
- Content source (database fields, static, computed)
- Conditional display rules

### 2. Headless Approach
- React/Next.js frontend
- Supabase for data and realtime
- Edge functions for third-party integrations
- Component library with theme support

### 3. Three Commerce Models

| Model | Examples | Key Features |
|-------|----------|--------------|
| **Digital Products** | Software, ebooks, licenses, courses | Instant delivery, download links, license keys, access control |
| **Services** | Plumbing, cleaning, consulting | Scheduling, location-based, quotes, provider assignment |
| **Physical Products** | Clothing, electronics, home goods | Inventory, shipping, returns, variants |

---

## Page-by-Page Implementation Plan

---

## 1. Product Listing Page (Catalog)

### Purpose
Display products with filtering, sorting, and search capabilities. Supports all three product types.

### Layout Config Options
```yaml
config:
  layout:
    type: "grid" | "masonry" | "list"
    columns: 3 | 4 | 6
    sidebar_position: "left" | "right" | "none"
  filters:
    position: "sidebar" | "top" | "modal"
    visible_filters: ["category", "price", "rating", "type"]
    collapsible: true
  sorting:
    options: ["newest", "price_low_high", "price_high_low", "popularity"]
    default: "newest"
  pagination:
    type: "infinite_scroll" | "numbered" | "load_more"
    items_per_page: 24
```

### Components Required

#### A. Filter Panel
- **Category Tree**: Hierarchical categories with counts
- **Price Range Slider**: Min/max price with numeric inputs
- **Product Type Toggle**: Digital/Service/Physical badges
- **Rating Filter**: Star rating checkboxes (4+ stars, 3+ stars)
- **Service Filters** (for services):
  - Availability: Today, Tomorrow, This Week
  - Service Type: On-site, Remote, Pickup
- **Digital Filters** (for digital):
  - Format: PDF, MP4, ZIP
  - Platform: Windows, Mac, iOS, Android
  - License Type: Personal, Commercial, Enterprise

#### B. Product Card
- **Base Card** (all types):
  - Product image (with fallback)
  - Title (clickable to PDP)
  - Price display (original, discounted)
  - Rating stars + review count
  - Quick add button (varies by type)
  
- **Digital Product Badge**:
  - "Instant Download" tag
  - File size indicator
  - DRM/License indicator
  
- **Service Badge**:
  - "Book Appointment" button
  - Location availability indicator
  - Provider count
  - Starting from price per hour
  
- **Physical Product Badge**:
  - "In Stock / Out of Stock"
  - Free shipping tag (if applicable)
  - Variant selector (size/color)

#### C. Search Bar
- Autocomplete with product suggestions
- Recent searches
- Voice search support (optional)

#### D. Sort Dropdown
- Sort by relevance, price, newest, popularity
- Price range presets

#### E. Active Filters Display
- Chips showing active filters
- Clear all button
- Individual filter removal

---

## 2. Product Detail Page (PDP)

### Purpose
Complete product information with purchase options. Different UI for digital, service, and physical products.

### Layout Config Options
```yaml
config:
  layout:
    image_gallery_position: "left" | "right" | "top"
    media_gallery_type: "carousel" | "grid" | "lightbox"
    content_columns: 2
    sections_order: ["gallery", "title", "price", "variants", "description", "reviews", "qna", "related"]
  tabs:
    use_tabs: true
    tabs_order: ["description", "specifications", "reviews", "qna"]
  sticky_add_to_cart: true | false
```

### Components Required

#### A. Media Gallery
- **Images**:
  - Main image with zoom capability
  - Thumbnail navigation
  - Video thumbnail indicator
  - 360° view (for physical products)
  
- **Videos**:
  - Product demo video
  - How-to-use videos
  - Embedded YouTube/Vimeo support
  
- **Digital Previews**:
  - PDF preview (first few pages)
  - Video trailer
  - Audio sample player
  - Software demo (iframe)

#### B. Product Information
- **Title & Description**:
  - Product name
  - Short description
  - Full description (rich text)
  - SKU/GTIN display (toggle in config)
  
- **Rating Section**:
  - Average rating (stars)
  - Total review count
  - Link to reviews section
  - Verified purchase badge

#### C. Pricing Component
- **Base Price Display**:
  - Current price (large)
  - Original price (strikethrough)
  - Discount percentage badge
  
- **Service Pricing**:
  - Hourly rate
  - Fixed project rate
  - Quote-based with "Request Quote" button
  - Price calculator for service packages
  
- **Digital Pricing**:
  - Single purchase
  - Subscription pricing (monthly/yearly)
  - Tiered pricing (basic/pro/enterprise)

#### D. Variant Selector
- **Physical Products**:
  - Color swatches (with images)
  - Size dropdown with stock indicator
  - Material selection
  - Customization options (engraving, monogram)
  
- **Digital Products**:
  - License type (personal, commercial)
  - Platform selection (Windows, Mac)
  - Download format (PDF, EPUB, MOBI)
  - Subscription duration
  
- **Services**:
  - Service duration (30 min, 1 hr, 2 hr)
  - Service type (basic, premium, platinum)
  - Add-on services (checkbox list)
  - Provider selection (if multiple)

#### E. Inventory & Availability
- **Physical**:
  - Stock counter
  - Low stock warning
  - Backorder available indicator
  - Estimated shipping date
  
- **Digital**:
  - "Always available" message
  - Download limit information
  - Access duration
  
- **Services**:
  - Availability calendar
  - Next available slot
  - Location serviceability
  - Waitlist option

#### F. Quantity Selector
- Min/max limits
- Bulk pricing indicator
- Stepper input

#### G. Add to Cart Button
- **Base**: Add to cart with animation
- **Buy Now**: Direct checkout
- **Book Now** (services): Redirect to scheduling
- **Rent Now** (if applicable): Rental period selector
- **Request Quote**: Contact form for custom quotes

#### H. Trust Signals
- Return policy (custom per product type)
- Warranty information
- Money-back guarantee
- Secure payment badges
- Customer testimonials carousel

#### I. Related Products
- **Recommendations**:
  - Frequently bought together
  - Upsell products
  - Cross-sell for services
  - Complementary digital products
  - Similar items

---

## 3. Cart Page

### Purpose
Review selected items, apply discounts, and proceed to checkout.

### Layout Config Options
```yaml
config:
  layout:
    cart_layout: "table" | "list"
    show_thumbnail: true
    show_sku: false
    show_savings: true
  checkout:
    show_trust_badges: true
    show_estimated_total: true
    express_checkout: ["google_pay", "apple_pay", "razorpay"]
```

### Components Required

#### A. Cart Items List
- **Product Card**:
  - Thumbnail image
  - Title with link to PDP
  - Variant details (size, color, license type)
  - Price per unit
  - Quantity selector with update/remove
  - Subtotal
  - Save for later button
  - Remove item (trash icon)

#### B. Special Handling for Services
- **Service Cart Items**:
  - Appointment date and time
  - Service address/location
  - Provider name (if assigned)
  - Duration
  - Reschedule/Cancel option before checkout

#### C. Digital Items
- **Digital Cart Items**:
  - "Instant delivery" note
  - Account creation required message
  - License agreement acceptance checkbox

#### D. Cart Summary
- **Totals**:
  - Subtotal
  - Discount (with breakdown)
  - Shipping cost estimate (with calculator)
  - Tax estimate
  - Total amount
  
- **Discount Section**:
  - Coupon code input
  - Apply button
  - Applied discounts list
  - Remove discount option
  
- **Service Specific**:
  - Service fee breakdown
  - Travel charges
  - Convenience fee

#### E. Checkout Actions
- **Primary**: Proceed to Checkout button
- **Secondary**: Continue Shopping link
- **Express Checkout**: Google Pay, Apple Pay, Razorpay
- **Cart Recovery**: Save cart for later, email cart link

#### F. Cart Recommendations
- Related products
- Upsell suggestions
- Free shipping threshold progress bar

---

## 4. Checkout Page

### Purpose
Collect customer information, select shipping/payment, and complete purchase.

### Layout Config Options
```yaml
config:
  layout:
    type: "single_page" | "multi_step"
    step_indicator: "progress_bar" | "steps"
    address_section: "full" | "simplified"
  fields:
    require_phone: true
    require_company: false
    show_gift_options: true
    show_order_notes: true
  guest_checkout:
    enabled: true
    require_account_creation: false
```

### Components Required

#### A. Multi-Step Checkout (if configured)
- **Step 1**: Cart Review
- **Step 2**: Contact & Address
- **Step 3**: Shipping Method
- **Step 4**: Payment
- **Step 5**: Confirmation

#### B. Single Page Checkout
- **Left Column** (Forms):
  - Contact information (email, phone)
  - Shipping address form
  - Billing address (same as shipping toggle)
  - Order notes / special instructions
  - Gift options (if enabled)
  
- **Right Column** (Order Summary):
  - Cart items list (collapsible)
  - Subtotal
  - Shipping method selector
  - Tax
  - Total

#### C. Digital Product Handling
- **No shipping required** message
- Email delivery information
- Account creation prompt for digital library
- Download instructions

#### D. Service Booking Checkout
- **Appointment Scheduling**:
  - Date picker (with availability)
  - Time slot selector
  - Duration confirmation
  - Service address (separate from billing)
  - Special instructions for service provider
  
- **Service Specific Fields**:
  - Property type (house, apartment, office)
  - Square footage
  - Number of rooms
  - Pet information (for pet services)
  - Access instructions

#### E. Shipping Methods
- **Physical Products**:
  - Standard shipping (with delivery estimate)
  - Express shipping (with cost)
  - Free shipping (if eligible)
  - In-store pickup (with location selector)
  - Local delivery (with radius check)
  
- **Digital Products**: No shipping options

#### F. Payment Methods
- **Razorpay Integration**:
  - Credit/Debit Card
  - Net Banking
  - UPI
  - Wallet
  - EMI options (if applicable)
  - Razorpay Pay Later
  
- **Additional Methods**:
  - Cash on Delivery (if enabled)
  - Bank Transfer
  - Digital Wallet

#### G. Order Review Section
- Checkbox for terms & conditions
- Checkbox for privacy policy
- Newsletter subscription (optional)
- Place Order button (with loading state)
- Order total summary

---

## 5. Order Confirmation Page

### Purpose
Display order success details and next steps.

### Layout Config Options
```yaml
config:
  layout:
    show_order_details: true
    show_delivery_tracking: true
    social_sharing: true
  after_purchase:
    show_upsell: true
    show_review_prompt: true
```

### Components Required

#### A. Success Message
- **Visual**: Checkmark animation, success icon
- **Message**: "Thank you for your order!"
- **Order Number**: Display prominently
- **Email Confirmation**: "Confirmation sent to email@example.com"

#### B. Order Summary
- **Items List**:
  - Product images, names, quantities
  - Digital delivery status
  - Service appointment details
- **Total Breakdown**: Subtotal, discounts, shipping, tax, total
- **Payment Details**: Method used, transaction ID

#### C. Digital Products Section
- **Download Links**:
  - Individual download buttons per item
  - License keys display (with copy button)
  - Expiration date (if applicable)
  - Download instructions
  - Email delivery fallback

#### D. Service Booking Section
- **Appointment Details**:
  - Service provider name and contact
  - Scheduled date and time
  - Service address
  - Pre-service checklist
  - Reschedule/Cancel options
  - Preparation instructions

#### E. Physical Products Section
- **Shipping Information**:
  - Shipping address
  - Estimated delivery date
  - Tracking link (when available)
  - Carrier information
  - SMS/Email tracking opt-in

#### F. Next Steps
- **Buttons**:
  - Continue Shopping
  - View Order History
  - Download Invoice
  - Track Order (for physical)
  - Add to Calendar (for services)
  
- **Social Sharing**: Share purchase (with appropriate privacy)

#### G. Post-Purchase Actions
- **For Digital**: Download now button
- **For Services**: View/Manage Booking link
- **For Physical**: Track Package button
- **Cross-sell**: Related product recommendations

---

## 6. My Account Page

### Purpose
Customer dashboard for order history, digital library, service bookings, and profile management.

### Layout Config Options
```yaml
config:
  layout:
    sidebar: true
    sidebar_sections: ["profile", "orders", "digital_library", "services", "returns", "addresses", "reviews", "wishlist"]
    default_section: "orders"
```

### Components Required

#### A. Profile Section
- **Personal Information**:
  - Name, email, phone
  - Edit profile form
  - Change password
  - Email preferences
  - Two-factor authentication toggle
  
- **Avatar Upload**: Profile picture with crop

#### B. Order History
- **Order List**:
  - Order number (clickable)
  - Date
  - Status badge (pending, processing, shipped, delivered, cancelled)
  - Total amount
  - View details button
  
- **Order Details Modal**:
  - Full order summary
  - Tracking information
  - Invoice download
  - Reorder button
  - Cancel order (if eligible)
  - Return/Refund request

#### C. Digital Library
- **Purchased Items**:
  - Cover image
  - Title
  - Download button (with expiry)
  - License key management
  - Access to online courses
  - Renew subscription button
  
- **Access Management**:
  - Device management (for software)
  - Revoke access
  - Download history

#### D. Service Bookings
- **Upcoming Appointments**:
  - Service name
  - Provider name
  - Date and time
  - Address
  - Reschedule/Cancel buttons
  - Add to calendar
  
- **Past Bookings**:
  - Completed services
  - Rate & Review button
  - Rebook button
  - Invoice/Receipt

#### E. Saved Addresses
- **Address List**:
  - Multiple addresses (home, work, other)
  - Default address indicator
  - Edit/Delete options
  - Add new address form

#### F. Wishlist
- **Saved Items**:
  - Product images
  - Title
  - Price
  - Add to cart button
  - Move to cart
  - Remove from wishlist
  - Notify when in stock

#### G. Returns & Refunds
- **Return Requests**:
  - Order number
  - Items being returned
  - Return status
  - Refund amount
  - Return tracking
  - Create new return button

#### H. Reviews & Ratings
- **My Reviews**:
  - Product name
  - Rating stars
  - Review text
  - Edit/Delete options
  - Merchant responses

---

## 7. Service Booking Flow

### Purpose
Specialized booking interface for service-based products.

### Layout Config Options
```yaml
config:
  layout:
    booking_flow: "step_by_step" | "single_page"
    calendar_view: "month" | "week" | "day"
    provider_selection: "auto" | "manual"
  pricing:
    show_price_breakdown: true
    show_service_fee: true
```

### Components Required

#### A. Service Selection
- **Service Categories**: Similar to product categories
- **Sub-services**: Multiple service types under main category
- **Add-ons**: Optional services (extra cleaning, after-hours)

#### B. Location & Address
- **Serviceability Check**:
  - Pincode input with validation
  - Location detection (GPS)
  - Service availability map
  - Zone/area restrictions
  
- **Address Form**:
  - Save address to account
  - Multiple address support
  - Special instructions (gate code, floor, etc.)

#### C. Provider Selection
- **Auto-assign**: System selects best provider
- **Manual Selection**:
  - Provider profiles with ratings
  - Availability slots
  - Specializations
  - Languages spoken
  - Portfolio/Work samples

#### D. Appointment Scheduling
- **Calendar**:
  - Available dates highlighted
  - Blocked dates (holidays, fully booked)
  - Morning/afternoon/evening slots
  
- **Time Slots**:
  - Available times
  - Duration selection
  - Buffer time between appointments

#### E. Quote & Pricing
- **Price Breakdown**:
  - Base price
  - Add-ons cost
  - Travel charges (if applicable)
  - Service fee
  - Discount applied
  - Total amount
  
- **Quote Type**:
  - Fixed price (instant booking)
  - Estimated quote (requires approval)
  - Custom quote (call for price)

#### F. Booking Confirmation
- **Booking Summary**:
  - Service details
  - Provider info
  - Date & time
  - Location
  - Price breakdown
  
- **Preparation Instructions**:
  - What to expect
  - Pre-service checklist
  - Documents needed
  - Parking information

---

## 8. Checkout Optimization Components

### Components to reduce cart abandonment

#### A. Trust Badges
- SSL Secure
- Money-back guarantee
- 24/7 Support
- Secure payment logos

#### B. Progress Indicator
- Visual step tracker
- Step completion status
- Estimated time remaining

#### C. Address Autocomplete
- Google Places API integration
- Pincode lookup
- Saved addresses dropdown

#### D. Shipping Calculator
- Live shipping cost based on location
- Delivery date estimate
- Carrier selection

#### E. Tax Calculator
- Real-time tax calculation
- GST/VAT breakdown
- Tax invoice generator

#### F. Order Summary Sticky
- Sticky sidebar on scroll
- Real-time total updates
- Cart changes reflected instantly

---

## 9. Real-time Components

### Live updates across pages

#### A. Cart Counter
- Live item count in header
- Mini cart dropdown on hover
- Add/remove animations

#### B. Order Status
- Live order tracking (WebSocket)
- Status timeline
- Push notifications for updates

#### C. Inventory Status
- Low stock warning (real-time)
- "X people looking" notification
- Back in stock alerts

#### D. Service Availability
- Live slot availability
- Real-time provider assignment
- Booking confirmation

---

## 10. Admin Configurable Sections

### Components that can be configured per tenant

#### A. Header
- Logo position (left/center/right)
- Navigation menu items (custom links)
- Search bar visibility
- Cart icon position
- Mega menu support

#### B. Footer
- Columns (2-5 columns)
- Links (custom)
- Social media icons
- Newsletter signup
- Payment logos

#### C. Homepage
- Hero section (slideshow/static)
- Featured categories grid
- New arrivals section
- Bestsellers section
- Testimonials carousel
- Blog/News section

#### D. Product Listing Page
- Filter positions
- Sort options
- Grid vs list view
- Quick view modal
- Compare products

#### E. Product Detail Page
- Tab sections order
- Related products count
- Recently viewed
- Social share buttons

#### F. Checkout Page
- Fields to show/hide
- Payment methods order
- Shipping methods order
- Trust badges to show

---

## 11. Responsive Design Components

### Mobile-first approach

#### A. Mobile Navigation
- Hamburger menu
- Bottom navigation bar (for key actions)
- Search modal
- Cart drawer

#### B. Product Cards (Mobile)
- Swipe for actions (add to cart)
- Touch-optimized buttons
- Expandable variant selector

#### C. Filter Modal
- Full-screen modal on mobile
- Swipe to apply
- Faceted search

#### D. Checkout Mobile
- Accordion sections
- Keyboard-optimized forms
- One-click payment options

---

## 12. Accessibility & Performance

### Must-have components

#### A. Accessibility
- ARIA labels
- Keyboard navigation
- High contrast mode
- Screen reader support
- Focus indicators

#### B. Performance
- Lazy loading images
- Code splitting
- Prefetch critical resources
- Optimistic UI updates
- Skeleton loaders

#### C. SEO
- Meta tags per product
- Structured data (Schema.org)
- Open Graph tags
- Canonical URLs
- Sitemap generation

---

## Configuration Structure Example

```json
{
  "tenant_id": "store_123",
  "theme": {
    "primary_color": "#FF6B6B",
    "secondary_color": "#4ECDC4",
    "font_family": "Inter, sans-serif",
    "border_radius": "8px"
  },
  "pages": {
    "product_listing": {
      "layout": "grid",
      "columns": 4,
      "sidebar": "left",
      "filters": ["category", "price", "rating"]
    },
    "product_detail": {
      "media_gallery": "carousel",
      "tabs": ["description", "reviews"],
      "show_related": true,
      "sticky_cart": true
    },
    "checkout": {
      "type": "single_page",
      "guest_checkout": true,
      "require_phone": true,
      "payment_methods": ["card", "upi", "netbanking"]
    }
  }
}
```
