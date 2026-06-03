# WA Module — End-to-End Test and Demo Flow

> **Version**: 1.0 — 2026-06-02
> **Purpose**: Documents the testing and demonstration sequence for the WA module, from tenant onboarding to automation testing and e-commerce integration.

This flow covers the lifecycle from onboarding a new tenant organization to setting up their WhatsApp Business API (WABA), configuring automation, and testing storefront functionality.

---

## Phase 1: Onboarding & WABA Setup (New Org)

1. **Org Creation**: Create a new Tenant Organization in the database (`identity.organizations`).
2. **UI Login**: Log into `zo_waCRM` as an admin of the new organization.
3. **WABA Provisioning**:
   - Navigate to **Settings > WABA Setup** (`WabaSetupPage.tsx`).
   - Input the `phone_number_id`, `waba_id`, and `access_token` from Meta.
   - Click "Connect". 
   - **Verification**: `wa_provision_tenant` executes successfully, storing credentials in `app_settings` and seeding the `STOP`, `START`, and `HELP` default automation rules.

## Phase 2: Content Preparation (Templates & Variables)

1. **Variable Definition**:
   - Navigate to **Settings > Variables** (`VariablesPage.tsx`).
   - Define custom variables (e.g., `{{contact.name}}`, `{{order.total}}`).
2. **Template Creation & Approval**:
   - Navigate to **Templates** (`TemplatesPage.tsx`).
   - Create a new template (e.g., `welcome_message` or `abandoned_cart_reminder`).
   - **Verification**: Simulate Meta approval. Ensure the UI can map the variables created in Step 1 to the template placeholders.

## Phase 3: Automation & Sequencing

1. **Keyword Automation Rules**:
   - Navigate to **Settings > Automation** (if available) or rely on base rules.
   - Set up a rule where sending "HELLO" triggers a specific response or Template.
2. **Drip Campaign Builder**:
   - Navigate to **Sequences** (`SequencesPage.tsx` / `DripCampaignBuilder.tsx`).
   - Create a new Drip Campaign triggered by the `new_lead` event or a specific tag (e.g., `vip`).
   - Build a sequence:
     - Step 1: Send Template (`welcome_message`).
     - Step 2: Delay (24 hours).
     - Step 3: Send text message "Checking in!".
   - Activate the campaign.
3. **Routing Rules**:
   - Configure a routing rule in the database (`wa_routing_rules`) to auto-assign incoming chats to the "Sales" team if the contact identity is `b2c_lead`.

## Phase 4: Customer Interaction Testing (E2E)

1. **Inbound Webhook Simulation**:
   - Use Postman to simulate an inbound Meta Webhook (or send a real message from a test WhatsApp account to the provisioned `phone_number_id`).
   - Message: "HELLO".
2. **Receiver & Verification**:
   - Verify the `whatsapp-receiver` edge function picks up the webhook.
   - Verify a new contact is created in `wa_contacts` and identity resolution (`wa_resolve_identity`) runs via trigger.
   - Verify the "HELLO" automation rule fires and sends an outbound reply.
3. **Drip Enrollment**:
   - Apply the `vip` tag to the contact (using the UI or backend).
   - Verify the contact is auto-enrolled in the sequence built in Phase 3.
   - Force trigger the `process-drip-enrollments` edge function to send Step 1 immediately.

## Phase 5: Existing Tenants Testing (zoworks / vkbs)

1. **Switch Context**: As a super-admin, switch tenant context to `zoworks` or `vkbs` (existing tenants).
2. **Verify Existing Configurations**:
   - Ensure their WABA connections in `app_settings` are intact.
   - Ensure existing `wa_contacts` load correctly in the `ContactsPage.tsx`.
3. **Blast Campaign**:
   - Navigate to **Campaigns** (`WaCampaignsPage.tsx`).
   - Select a segment and trigger a manual broadcast campaign.
   - Verify `wa_manual_campaign_send` successfully processes the batch.

## Phase 6: Storefront & Post-Deploy E-com Flow

1. **Order Syncing**:
   - Simulate an external Shopify/WooCommerce order creation.
   - Insert an order into `wa.x_wa_orders` linked to a `wa_contacts` record.
2. **UI Visibility**:
   - Navigate to the **Inbox** (`InboxPage.tsx`) for that contact.
   - **Verification**: The right-hand sidebar should display the user's order history (`wa_get_contact_orders`).
3. **Abandoned Cart Sequence**:
   - If the order is "pending", ensure it triggers an Abandoned Cart Drip Sequence, successfully substituting variables like `{{order.total}}` before sending.

---

### Demo Flow Summary for Stakeholders

1. **Admin logs in** to the new CRM tenant and connects WABA in seconds.
2. **Admin defines** a visual Drip Sequence (Welcome flow).
3. **End-user sends** a WhatsApp message to the business number.
4. **CRM instantly**:
   - Creates the contact.
   - Resolves their identity.
   - Drops them into the Inbox.
   - Auto-replies via the Sequence.
5. **Agent takes over** in the Inbox, views order history, and seamlessly replies.
