# UI Routes Use Cases & Features Documentation

This document describes the user interface routes in the application, including their layout wrappers, associated file components, access levels, key use cases, and core features.

---

## 1. Authentication & Public Access Routes (`PublicLayout`)
These routes do not require any user authentication and are accessible by any browser visitor.

### 1.1 General Public Pages
| Route Path | Component File | Access Level | Description & Key Use Cases | Core Features |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `src/pages/Home.tsx` | Public | **Public Landing Page**: Acts as the initial entry point to the system, showcasing platform capabilities. | • Marketing highlights<br>• Access to registration/login portals |
| `/appointments` | `src/modules/appointments/pages/PublicAppointmentsPage.tsx` | Public | **Guest Booking**: Allows anonymous users or external clients to book appointments directly. | • Interactive calendar view<br>• Dynamic slot availability mapping<br>• Details form collection |
| `/subscriptions` | `src/pages/public/Subscriptions.tsx` | Public | **Pricing Plans**: Displays available tiers and plans for system subscriptions. | • Feature comparison table<br>• Tier selection and redirection to checkout |
| `/sign/:envelopeId` | `src/modules/esign/pages/SignDocument.tsx` | Public (Token/ID based) | **Document E-Signature**: Safe workspace for external signers to fill fields and sign PDF envelopes. | • PDF visual canvas overlay<br>• Multi-field signature widgets<br>• Signature drawing / typing validation |

### 1.2 Auth Actions
| Route Path | Component File | Access Level | Description & Key Use Cases | Core Features |
| :--- | :--- | :--- | :--- | :--- |
| `/login` | `src/pages/auth/Login.tsx` | Public | **User Login**: Core portal for email/password and MFA authentication. | • Credential verification<br>• Translation/localization picker<br>• Error handling for locked accounts |
| `/signup` | `src/pages/auth/Signup.tsx` | Public | **Self-Service Registration**: Allows new users to create accounts. | • Interactive validation checks<br>• Email activation flow trigger |
| `/reset_password` | `src/pages/auth/ResetPassword.tsx` | Public | **Password Recovery**: Security portal to email reset tokens and request new passwords. | • Secure token handshake<br>• Password strength indicators |
| `/web_register` <br> `/sign_up` | `src/pages/auth/WebRegister.tsx` | Public | **Advanced Org Registration**: Allows organization tenant signups. | • Multi-step form collection<br>• Company info & primary contact details validation |

---

## 2. E-Commerce Customer Storefront (`/shop` Layout)
A public-facing nested module designed to simulate a complete e-commerce experience.

| Route Path | Component File | Key Use Cases | Core Features |
| :--- | :--- | :--- | :--- |
| `/shop` | `src/modules/shop/pages/HomePage.tsx` | Landing hub for storefront users. | • Promoted products carousel<br>• Category links<br>• Search bar utility |
| `/shop/products` | `src/modules/shop/pages/ProductListingPage.tsx` | Catalog browsing. | • Dynamic filtering by tag/price<br>• Sorting filters (low-high, relevance)<br>• Add-to-cart shortcuts |
| `/shop/products/:id` | `src/modules/shop/pages/ProductDetailsPage.tsx` | Granular view of specific product specs. | • Interactive zoom gallery<br>• Dynamic stock status indicators<br>• Variation selection (size, color) |
| `/shop/category/:slug` | `src/modules/shop/pages/CategoryLandingPage.tsx` | Target collection routing. | • Schema-based listing filtering by category slug |
| `/shop/brand/:brandName` | `src/modules/shop/pages/BrandPage.tsx` | Brand loyalty listings. | • Dynamic filter and brand banner details |
| `/shop/search` | `src/modules/shop/pages/SearchResultsPage.tsx` | Target keyword searching. | • Text matching search results layout |
| `/shop/cart` | `src/modules/shop/pages/CartPage.tsx` | Pre-checkout basket editing. | • Quantity controls<br>• Subtotal math updates<br>• Coupon input fields |
| `/shop/checkout` | `src/modules/shop/pages/CheckoutPage.tsx` | Placing a purchase order. | • Address inputs<br>• Payment simulator<br>• Cart summary breakdown |
| `/shop/order-confirmation` | `src/modules/shop/pages/OrderConfirmationPage.tsx` | Success/receipt delivery screen. | • Order ID generation details<br>• Receipt breakdown summary |
| `/shop/wishlist` | `src/modules/shop/pages/WishlistPage.tsx` | Favorites storage. | • Saved product cards<br>• Quick move-to-cart action |
| `/shop/account` | `src/modules/shop/pages/AccountPage.tsx` | Customer settings and profile. | • Customer contact details modifier |
| `/shop/account/:section`| `src/modules/shop/pages/AccountPage.tsx` | Customer navigation sections. | • Dynamic routing for Order History, Saved Cards, etc. |
| `/shop/booking` | `src/modules/shop/pages/BookingPage.tsx` | Booking-related purchases. | • Calendar-based service package booking |
| `/shop/legacy` | `src/modules/catalog/pages/EcomCatalogPage.tsx` | Legacy catalog browser. | • Backward-compatible legacy listing view |

---

## 3. General Authenticated Routes (`AuthedLayout`)
Requires an active session. Built inside the primary dashboard frame.

| Route Path | Component File | Key Use Cases | Core Features |
| :--- | :--- | :--- | :--- |
| `/welcome` | `src/core/components/Layout/WelcomeHub/index.tsx` | Primary authenticated landing dashboard page. | • Personalized greet message<br>• Recent notifications feed<br>• Module quick-access shortcuts |
| `/dashboard` | `src/pages/Dashboard.tsx` | Visual summary of organization operations. | • KPI cards (sales, tasks, user counts)<br>• Dynamic analytical charts<br>• Date range filters |
| `/profile` | `src/pages/core/Profile.tsx` | Managing personal user details. | • Avatar upload<br>• Security credentials change (password)<br>• Language preferences |
| `/settings` | `src/pages/core/UserSetting.tsx` | Personal app preference panel. | • Toggle notification types<br>• Theme customization (light vs dark mode) |
| `/sample` | `src/pages/SamplePage.tsx` | Template placeholder for developers. | • Visual design system style guide demo |
| `/rjsf` | `src/pages/TestRJSFCoreForm.tsx` | Testing dynamic form rendering. | • JSON-schema reactive form builder preview |
| `/payment-test` | `src/pages/PaymentTest.tsx` | Transaction simulator. | • Sandbox environment checkout testing |

---

## 4. WhatsApp Marketing & Support (`/wa` Nested Module)
Designed for live chat, customer broadcast, templates, and sequence builder campaigns.

| Route Path | Component File | Key Use Cases | Core Features |
| :--- | :--- | :--- | :--- |
| `/wa/inbox` | `src/modules/wa/pages/InboxPage.tsx` | Live multi-agent chat interface. | • Real-time message streaming<br>• Media file attachments support<br>• Customer metadata sidebar |
| `/wa/sequences` | `src/modules/wa/pages/SequencesPage.tsx` | Management of drip campaign workflows. | • List view of active/paused sequences<br>• Basic stats overview |
| `/wa/sequences/:id` | `src/modules/wa/pages/DripCampaignBuilder.tsx` | Graphical setup of multi-message triggers. | • Node canvas UI<br>• Time-delay config panels<br>• Logic branch selectors |
| `/wa/templates` | `src/modules/wa/pages/TemplatesPage.tsx` | WhatsApp-approved template list. | • Searchable template tables<br>• Meta approval status tracking |
| `/wa/templates/:id` | `src/modules/wa/pages/TemplateEditor.tsx` | Formulating variables for templates. | • Text placeholders editor (`{{1}}`) |
| `/wa/quick-replies` | `src/modules/wa/pages/QuickRepliesPage.tsx` | Fast-reply text management. | • Canned response lookup keys |
| `/wa/contacts` | `src/modules/wa/pages/ContactsPage.tsx` | Target phone numbers database. | • Bulk CSV import/export utility |
| `/wa/segments` | `src/modules/wa/pages/SegmentsPage.tsx` | Categorizing contacts into lists. | • Filter rules creator (e.g., location, tag) |
| `/wa/campaigns` | `src/modules/wa/pages/WaCampaignsPage.tsx` | Launching broadcasts to lists. | • Read/delivery rate analytics graphs |
| `/wa/catalog` | `src/modules/wa/pages/CatalogPage.tsx` | Interactive shopping catalog links. | • Direct sync with Meta business suite products |
| `/wa/settings` | `src/modules/wa/pages/SettingsPage.tsx` | Syncing API tokens and managing chat profiles. | Includes inner preference tabs:<br>• **Profile**: User name, bio, avatar settings<br>• **WhatsApp**: Business API Credentials (Phone ID, WABA ID, Access Token) & Auto-Response toggles<br>• **Notifications**: Active sound alerts and message digested emails switches<br>• **Team**: Invite and role assignment configuration for agents<br>• **Security**: Password resets and 2-Factor Authentication (2FA) activation |
| `/wa/variables` | `src/modules/wa/pages/VariablesPage.tsx` | Global custom variable bindings. | • Data column mapper for custom fields |

---

## 5. Work Management & Operations

### 5.1 ESM, CRM & ERP Pages
| Route Path | Component File | Key Use Cases | Core Features & Inner Tabbed Components |
| :--- | :--- | :--- | :--- |
| `/crm/contacts` | `src/modules/crm/pages/Contacts.tsx` | Accessing CRM contacts list. | • Search & advanced filter drawers<br>• CRM status edit triggers |
| `/crm/leads` | `src/core/components/DynamicViews/GenericDynamicPage.tsx` | Pipeline and lead qualification management. | Includes inner filtering tabs:<br>• **All Leads**: Master pipeline view<br>• **New**: Screenings/leads with `status = new`<br>• **Contacted**: Leads marked as contacted |
| `/esm/tickets` | `src/modules/esm/pages/Tickets.tsx` | Ticketing support desk management. | Includes inner navigation tabs:<br>• **All**: Comprehensive incident queue<br>• **My Tickets**: Current user assigned items<br>• **Related Tickets**: Colleague or sub-organization tickets<br>• Priority tags and chat-like interactive reply threads |
| `/support/service-reports` <br> `/esm/service_reports` | `src/modules/workforce/pages/ServiceReports.tsx` | Field work service reporting. | • Digital signature collection<br>• PDF generation utility |
| `/support/service-invoices` | `src/modules/workforce/pages/ServiceInvoices.tsx` | Automated invoicing for field jobs. | • Hours to invoice calculator |
| `/erp/invoices` | `src/modules/erp/pages/Invoices.tsx` | Commercial accounting invoices list. | • Tax breakdown calculator<br>• Invoice state management (Draft, Sent, Paid) |
| `/external/service-assets` | `src/modules/external/pages/ServiceAssets.tsx` | Third-party service assets lookup. | • Hardware/equipment detail tables |

### 5.2 Workforce Operations
| Route Path | Component File | Key Use Cases | Core Features |
| :--- | :--- | :--- | :--- |
| `/workforce/leaves` | `src/modules/workforce/pages/Leaves.tsx` | Logging employee leaves. | • Calendar leave application selector |
| `/workforce/timesheets` | `src/modules/workforce/pages/Timesheets.tsx` | Logging shift hours. | • Punch in / punch out triggers |
| `/workforce/expenses` | `src/modules/workforce/pages/Expenses.tsx` | Claiming business expenses. | • Receipt attachments upload<br>• Claims review dashboard |
| `/workforce/teams-users` | `src/modules/workforce/pages/TeamsUsers.tsx` | Company team structures mapping. | • Drag-and-drop user-to-team board |
| `/fsm/tracking` | `src/modules/fsm/pages/TrackingPage.tsx` | Tracking field technician locations. | • Live maps tracking overlay |

### 5.3 Archive & Development Utilities
| Route Path | Component File | Key Use Cases | Core Features |
| :--- | :--- | :--- | :--- |
| `/archive/processes` | `src/modules/archive/pages/ProcessEditor.tsx` | Documenting operations blueprints. | • Step-by-step editor for workflows |
| `/archive/networking` | `src/modules/archive/pages/Networking.tsx` | Internal networking structure view. | • Canvas link diagram builder |
| `/archive/project-plan` | `src/modules/archive/pages/ProjectPlanPage.tsx` | Gantt/Milestones tracker. | • Task dependencies connector |
| `/archive/scheduler` | `src/modules/archive/pages/SchedulerPage.tsx` | Scheduling repetitive jobs. | • Cron expression helper |

---

## 6. Admin Panel & Settings

### 6.1 Admin Console Modules
| Route Path | Component File | Key Use Cases | Core Features & Inner Tabbed Components |
| :--- | :--- | :--- | :--- |
| `/admin/settings` | `src/modules/admin/pages/Settings/index.tsx` | Core administrative dashboard. | Includes modular inner tabs:<br>• **Organization**: Profile/metadata configuration<br>• **Users**: System user directories & invitations<br>• **Teams**: Organization team structures configuration<br>• **Roles Management** & **Roles (DynamicViews)**: Role definitions and schema bindings<br>• **Roles & Permission**: RBAC matrix mapping features to permissions<br>• **Location & Holidays**: Location-based holidays and shifts configuration<br>• **Module Configurations**: Activating or overriding platform modules<br>• **Module Settings**: Global Workforce and specific settings properties<br>• **Entity Config**: System-level custom metadata schema fields<br>• **Mermaid Viewer**: Interactive database schema architecture rendering<br>• **Doc Viewer**: Embedded Google Doc reference guidelines<br>• *(SassAdmin / Superadmin only)* **Branding**: Dynamic site branding themes and logo uploads<br>• *(SassAdmin / Superadmin only)* **Workflow Settings**, **Types**, & **Leave Settings**: High-level timesheet automation rules and leave categorization policies |
| `/admin/sass` | `src/modules/admin/pages/Settings/OrganizationSettings.tsx` | SaaS organization preferences. | • Tenant tier controls<br>• Limit policies editor |
| `/admin/branding` | `src/modules/admin/pages/Settings/Branding.tsx` | Custom application theme and graphic asset manager. | Includes inner layout configurations tabs:<br>• **Brand**: Configures brand name, border rounding, margin paddings, default theme mode, user Dark Mode toggles, and base font size.<br>• **Colors**: Advanced color pickers for light and dark backgrounds, headers, sidebars, and card properties.<br>• **Logos**: Horizontal logo and square icon file upload options (using Publitio media API integrations). |
| `/admin/notifications` | `src/modules/admin/pages/Settings/Notifications.tsx` | Preset notification dispatches. | • Email & SMS templates designer |
| `/admin/form-elements` | `src/modules/admin/pages/Settings/FormElements.tsx` | Visual fields creator. | • Drag-and-drop form canvas controls |
| `/admin/onboarding` | `src/modules/admin/pages/OnboardingRequests.tsx` | Managing pending signups. | • Accept/reject toggle actions |
| `/admin/appointments` | `src/modules/appointments/pages/AdminAppointmentsPage.tsx` | Booking master panel. | • Multi-technician calendar view |

### 6.2 Settings & Observability
| Route Path | Component File | Key Use Cases | Core Features & Inner Tabbed Components |
| :--- | :--- | :--- | :--- |
| `/settings/config` | `src/modules/settings/pages/Config/index.tsx` <br>(resolves to `YViewConfigManager.tsx`) | System-wide schema metadata and database entity visual views configuration manager. | Includes a left sidebar to browse database schemas/entities, a **Register Entity** wizard, and a comprehensive configuration panel with tabs:<br>• **View Config**: General config & filter schemas editor<br>• **Blueprint**: Schema bootstrap setup, indexing, triggers, and RLS generator<br>• **Metadata**: Column definitions, DB logical slices/variants database definitions<br>• **Table View / Grid View / Kanban View / Gantt View / Calendar View / Map View**: Layout configuration properties for each corresponding view type<br>• **View**: Live preview of the configured layout models<br>• **Details Overview**: Visual configurations for page summaries<br>• **Detail View**: Configurations for the inner detail tab views<br>• **Form Builder**: Interactive schema drag-and-drop form creator<br>• **Profile Config**: Global tenant user profile fields mapping<br>• **Stages**: Workflow pipelines step settings<br>• **Workflow Config**: Automation, alerts, and approvals rules settings<br>• **Global Access**: Role-based action configurations (edit, delete, search properties)<br>• **ID Config**: Custom entity string formatting structure (prefixes, incremental patterns) |
| `/settings/process-blueprints` | `src/modules/settings/pages/Config/ProcessBlueprintManager.tsx` | Workflow automation blueprints. | • Schema mappings editor |
| `/settings/metric-views` | `src/modules/settings/pages/Config/MetricViewManager.tsx` | Analytics dataset manager. | • Query aggregation builders |
| `/settings/observability` | `src/modules/settings/pages/Observability/ObservabilityDashboard.tsx` | System performance and logs dashboard. | • Real-time console logger stream<br>• Error alert widgets |

---

## 7. Commerce Administration
Designed to manage storefront catalog items, variants, stock levels, orders, and pricing.

| Route Path | Component File | Key Use Cases | Core Features & Inner Tabbed Components |
| :--- | :--- | :--- | :--- |
| `/commerce/dashboard` | `src/modules/commerce/pages/admin/Dashboard.tsx` | Sales and catalog performance analytics. | • Revenue and transaction count analytics charts |
| `/commerce/catalog` | `src/modules/catalog/pages/admin/AdminCatalogManager.tsx` | Admin management of catalog inventory. | Includes a left sidebar listing catalog schema entities to toggle views:<br>• **Offerings**: Master products/services listings<br>• **Variants**: Item variation properties (SKU, JSON attributes)<br>• **Bundles**: Combined product bundles<br>• **Price Lists**: Active currency listings<br>• **Prices**: Specific prices and quantities per segment/location<br>• **Discounts**: Coupons database<br>• **Discount Rules**: Dynamic coupons criteria (e.g., target ID minimum quantity)<br>• **Customer Segments**: User segments mappings<br>• **Locations**: Warehouse locations |
| `/commerce/orders` | `src/modules/commerce/pages/admin/OrdersPage.tsx` | Order dispatch processing. | • Customer address printing<br>• Shipping partner APIs integration trigger |
| `/commerce/fulfillments`| `src/modules/commerce/pages/admin/FulfillmentsPage.tsx` | Delivery and package dispatch. | • AWB/tracking code manager |
| `/commerce/returns` | `src/modules/commerce/pages/admin/ReturnsPage.tsx` | Return merchandise approvals. | • RMA state manager (approved, refund pending) |
| `/commerce/reviews` | `src/modules/commerce/pages/admin/ReviewsPage.tsx` | Moderating customer reviews. | • Public display toggles (Approve/Reject) |
| `/commerce/settings` | `src/modules/commerce/pages/admin/CommerceSettings.tsx` | Shipping fees and currency setup. | • Multi-currency selectors<br>• Delivery tax zones builder |

---

## 8. Migration Module
Tools for system migration from legacy systems to the current architecture.

| Route Path | Component File | Key Use Cases | Core Features |
| :--- | :--- | :--- | :--- |
| `/migration/data` | `src/modules/migration/pages/DataExplorer.tsx` | Examining legacy databases. | • Schema explorer tool |
| `/migration/tickets` | `src/modules/migration/pages/LegacyTickets.tsx` | Historical ticket imports. | • Ticket mapping grid |
| `/migration/workflows` | `src/modules/migration/pages/WorkflowMigrationPage.tsx` | Translating legacy engine paths. | • Active node translation engine |
| `/migration/activities` | `src/modules/migration/pages/LegacyActivities.tsx` | Historical audits import. | • Event log tables |
| `/migration/teams` | `src/modules/migration/pages/LegacyTeams.tsx` | User groups and mapping. | • Group permission mapper |
| `/migration/nlp` | `src/modules/migration/pages/NlpMigrationPage.tsx` | Semantic text processing on legacy logs. | • Text tagger & categorization |
| `/migration/ai` | `src/modules/migration/pages/AiQueryMigrationPage.tsx` | Conversational queries on legacy records. | • NLP search input field |
| `/migration/tracking` | `src/modules/migration/pages/TrackingMigrationPage.tsx` | Migration progress monitor. | • Stage percentage bars |

---

## 9. Dynamic Schema Routes (`GenericDynamicPage`)
These routes resolve dynamically based on URL variables. They parse data tables and configuration fields on-the-fly using the system registry schema parameters. All dynamic routes utilize the core `DynamicViews` engine (`src/core/components/DynamicViews/index.tsx`) to render layouts.

| Route Path | Path Scheme | Supported Schemas & Dynamic Entities | Features & Inner View Sub-Components |
| :--- | :--- | :--- | :--- |
| `/admin/location-categories`<br>`/admin/service-categories`<br>`/admin/service-offerings`<br>`/admin/service-types` | Specific Admin | Identity schemas (`identity`) | • Dynamic CRUD tables<br>• Custom field layout configurations |
| `/commerce/offerings`<br>`/commerce/offering_variants`<br>`/commerce/offering_prices`<br>`/commerce/discounts`<br>`/commerce/price_lists` | Specific Commerce | Catalog schemas (`catalog`) | • Multi-variant pricing structures<br>• Discount code tables |
| `/commerce/customer_segments` | Specific CRM | Customer profiles (`crm`) | • Target audience queries |
| `/:schema/:entity` | Dynamic Routing | • `external` (External APIs)<br>• `hr` (HR applications)<br>• `unified` (Contacts, tasks)<br>• `identity` (Roles, users)<br>• `core` (Entity blueprints)<br>• `ai_mcp` (Playbooks, agents)<br>• `crm` (Accounts, contacts)<br>• `esm` (Contracts, assets)<br>• `catalog` (Products)<br>• `ctrm` (Trades, positions)<br>• `analytics` (Summaries)<br>• `procurement` (Vendors)<br>• `construction` (Projects)<br>• `workforce` (Leave applications)<br>• `blueprint` (Blueprints) | Includes the highly versatile `DynamicViews` multi-view rendering engine:<br>• **Table View (`tableview`)**: Multi-column data grid with server-side sorting/pagination.<br>• **Grid View (`gridview`)**: Adaptive responsive grid cards.<br>• **Kanban View (`kanbanview`)**: Visual status board with drag-and-drop columns.<br>• **Calendar View (`calendarview`)**: Interactive monthly/weekly event planners.<br>• **Gantt View (`ganttview`)**: Project roadmap scheduler with dependencies.<br>• **Map View (`mapview`)**: Geo-location mapping points viewer.<br>• **Dashboard View (`dashboardview`)**: Real-time aggregated visual metrics and summary charts.<br>• **Global Actions**: Create forms, column-visibility toggles, and Excel CSV import/export managers. |

