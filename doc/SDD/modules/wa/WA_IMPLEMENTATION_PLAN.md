# WA Module — Phased Implementation Plan

> **Version**: 1.0 — 2026-05-25  
> **Status**: Awaiting approval before implementation  
> **Covers**: All gaps from WA_GAP_ANALYSIS.md + commerce/catalog/identity schema integration + CF proxy architecture  
> **Constraint**: UI changes consolidated into a single final phase

---

## Architecture Decisions (Read Before Phases)

### CF Proxy — What Routes Through It vs Direct

The CF proxy's core value is that **Meta's webhook URL never changes** regardless of Supabase project rotations, edge function renames, or regional moves. `META_VERIFY_TOKEN` and `META_APP_SECRET` live in Cloudflare secrets — never in Supabase.

| Traffic | Route | Why |
|---------|-------|-----|
| Meta → inbound messages | `CF worker /webhooks/whatsapp` → `whatsapp-receiver` | Meta's registered URL is stable CF URL; rate limiting; **Meta signature verification done in CF** (secret stays in CF forever) |
| Meta → data deletion (GDPR) | `CF worker /webhooks/whatsapp-delete` → `wa-delete` | Same reason — Meta registered URL must not change |
| React UI → send message | Direct to `whatsapp-sender` edge function | User-authenticated call; no Meta secret needed; CF adds latency for no benefit |
| process-drip-enrollments | Direct Supabase cron invoke | Internal call; service-role only; CF not needed |
| wa-delete (GDPR) | Via CF proxy | Meta calls it — same stability requirement as receiver |
| All other edge functions | Direct Supabase | Internal or user-authenticated; no Meta routing |

**Result**: Only the two Meta-facing endpoints go through CF proxy. Everything else is direct Supabase.

### Commerce Orders — Ownership Model

`x_wa_orders` / `x_wa_order_items` are **dropped**. WA creates real `commerce.orders` with channel attribution columns. Line items reference `catalog.offerings` directly.

```
WA conversation → wa_create_commerce_order()
                    → commerce.orders  (channel='whatsapp', wa_conversation_id, wa_contact_id)
                    → commerce.order_items (offering_id → catalog.offerings)
                    → commerce.payments (payment_status tracked here)
```

### Identity Integration Model

WA tables reference identity primitives by UUID today but with no FK enforcement and no population path. After Phase 1:

```
wa_conversations.assignee_id      → identity.organization_users.id
wa_conversations.team_id          → identity.teams.id  
wa_conversations.role_id          → identity.roles.id
wa_conversations.location_id      → identity.locations.id (NEW)
wa_contacts.location_id           → identity.locations.id (NEW — which location serves this contact)
wa_automation_rules.location_id   → identity.locations.id (NEW — location-scoped rules)
wa_agent_transfers.from_user_id   → identity.organization_users.id
wa_agent_transfers.to_user_id     → identity.organization_users.id
wa_routing_rules (NEW)            → identity.teams, identity.roles, identity.locations
```

---

## Phase 0 — Stability & Security (Blockers Before Anything Else)

> **Goal**: Fix the things that are silently broken right now. No new features.  
> **Files**: 2 migration files + 1 CF worker update + 1 edge function fix  
> **Risk**: Low — all fixes are targeted and backward-compatible

### P0-1: Fix outbound template message logging (GAP-DATA-2)

**Problem**: `whatsapp-sender` stores template content as `{name, language, components}` (flat). The standardize trigger reads `content->'template'->>'name'` which returns NULL. The validate trigger then raises `P0001: Template messages must have a template_name in details`.

**Fix** — migration `20260601004421_wa_fix_template_standardize.sql`:
```sql
-- In wa_standardize_message_content(), update the template branch:
ELSIF NEW.type = 'template' THEN
  v_details := jsonb_build_object(
    'template_name',
      CASE
        -- Format from whatsapp-sender (flat)
        WHEN NEW.content ? 'name' THEN NEW.content->>'name'
        -- Format from wa_send_template RPC (nested)
        WHEN NEW.content ? 'template' AND NEW.content->'template' ? 'name'
          THEN NEW.content->'template'->>'name'
        ELSE NULL
      END,
    'body', '[Template Message]'
  );
```

### P0-2: Move Meta signature verification into CF proxy (GAP-SEC-1)

**Problem**: `whatsapp-receiver` has no `X-Hub-Signature-256` check. The CF proxy is the right place — `META_APP_SECRET` is already a CF secret and never needs to rotate with Supabase.

**Fix** — update `cf-proxy/workers.js`:
- Add HMAC-SHA256 verification in `handleWhatsAppWebhook` POST handler using `env.META_APP_SECRET`
- On signature mismatch → return 403 (never reaches Supabase)
- Also add `/webhooks/whatsapp-delete` route → forward to `wa-delete` edge function
- Forward the verified `X-Hub-Signature-256` header to Supabase so `wa-delete` can still verify if desired

```js
// In handleWhatsAppWebhook POST:
const signature = request.headers.get('x-hub-signature-256');
const expected = 'sha256=' + await hmacHex(env.META_APP_SECRET, rawBody);
if (!signature || signature !== expected) {
  console.warn('Signature mismatch — rejecting');
  return new Response('Forbidden', { status: 403 });
}
```

### P0-3: Handle Meta status update webhooks in receiver (GAP-FEAT-7)

**Problem**: Meta sends `delivered`, `read`, `failed` status updates in `value.statuses[]`. The receiver only processes `value.messages[]`. Status updates are silently dropped — agents can never see if messages were delivered.

**Fix** — update `whatsapp-receiver/index.ts`:
```ts
// Add alongside value.messages handling:
if (value.statuses) {
  await Promise.all(value.statuses.map(async (s: any) => {
    await supabase.schema('wa').rpc('wa_update_message_status', {
      p_organization_id: org.id,
      p_whatsapp_message_id: s.id,
      p_status: s.status   // 'sent' | 'delivered' | 'read' | 'failed'
    });
  }));
}
```

### P0-4: Verify deployed process-drip-enrollments has no `source` col ref (GAP-DATA-1)

**Action**: Diff the deployed function against local. If `source` column is referenced, remove it and deploy. This is a check + conditional fix, not a migration.

### P0 Deliverables
- [ ] `20260601004421_wa_fix_template_standardize.sql`
- [ ] `cf-proxy/workers.js` — signature verification + `/webhooks/whatsapp-delete` route
- [ ] `whatsapp-receiver/index.ts` — status update handling
- [ ] Verify + fix `process-drip-enrollments` deployed version

---

## Phase 1 — Schema Foundation: Commerce & Identity Integration

> **Goal**: Remove x_wa_orders, wire WA into `commerce` + `catalog`, add `identity` FK references properly. This is purely schema + function changes — no UI.  
> **Files**: 2 migrations  
> **Risk**: Medium — involves DROP TABLE and function rewrites. Staging test required.

### P1-1: Drop x_wa_orders, add channel attribution to commerce.orders

**Migration** `20260601004422_wa_commerce_integration.sql`:

**Step 1 — Add channel attribution columns to commerce.orders** (non-breaking):
```sql
ALTER TABLE commerce.orders
  ADD COLUMN IF NOT EXISTS channel          TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wa_conversation_id UUID REFERENCES wa.wa_conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS wa_contact_id    UUID REFERENCES wa.wa_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID; -- identity.organization_users.id

-- Index for WA inbox order panel
CREATE INDEX IF NOT EXISTS idx_commerce_orders_wa_conversation
  ON commerce.orders (wa_conversation_id) WHERE wa_conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commerce_orders_wa_contact
  ON commerce.orders (wa_contact_id) WHERE wa_contact_id IS NOT NULL;
```

**Step 2 — Migrate any data from x_wa_orders → commerce.orders** (if rows exist):
```sql
-- Insert x_wa_orders rows into commerce.orders preserving the conversation link
INSERT INTO commerce.orders (
  id, organization_id, wa_conversation_id, wa_contact_id,
  total_price, currency, status, notes, channel,
  email, order_number, subtotal_price, created_at, updated_at
)
SELECT
  id, organization_id, conversation_id, contact_id,
  total_amount, COALESCE(currency, 'INR'), COALESCE(status, 'pending'), notes, 'whatsapp',
  'wa-migrated@placeholder.local',
  'WA-' || EXTRACT(EPOCH FROM created_at)::bigint::text,
  total_amount, created_at, updated_at
FROM wa.x_wa_orders
ON CONFLICT (id) DO NOTHING;

-- Migrate line items
INSERT INTO commerce.order_items (
  id, order_id, organization_id, offering_id,
  name, quantity, price, created_at, updated_at
)
SELECT
  oi.id, oi.order_id, o.organization_id,
  oi.offering_id,
  COALESCE(cat.name, 'WA Item'), oi.quantity, oi.unit_price,
  oi.created_at, oi.updated_at
FROM wa.x_wa_order_items oi
JOIN wa.x_wa_orders o ON o.id = oi.order_id
LEFT JOIN catalog.offerings cat ON cat.id = oi.offering_id
ON CONFLICT (id) DO NOTHING;
```

**Step 3 — Drop x_wa_orders tables**:
```sql
DROP TABLE IF EXISTS wa.x_wa_order_items;
DROP TABLE IF EXISTS wa.x_wa_orders;
```

**Step 4 — Rewrite `wa_create_manual_order()`** to create `commerce.orders` + `commerce.order_items`:
```sql
CREATE OR REPLACE FUNCTION wa.wa_create_manual_order(
  p_organization_id UUID,
  p_conversation_id UUID,
  p_created_by UUID,        -- identity.organization_users.id
  p_order_details JSONB     -- {items:[{offering_id, qty, unit_price}], notes, currency}
) RETURNS UUID ...
-- Creates commerce.orders with channel='whatsapp', wa_conversation_id
-- Creates commerce.order_items with offering_id → catalog.offerings
-- Logs a template message to wa_messages (order confirmation)
```

**Step 5 — Add `wa_get_contact_orders(wa_contact_id)` RPC**:
```sql
-- Returns contact's orders from commerce.orders filtered by wa_contact_id
-- Used by drip variable resolution + inbox order panel
```

### P1-2: Strengthen identity FK references in WA schema

**Migration** `20260601004423_wa_identity_integration.sql`:

**wa_conversations — add location_id + enforce FKs**:
```sql
ALTER TABLE wa.wa_conversations
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES identity.locations(id);

-- Note: team_id, role_id, assignee_id already exist as UUID columns.
-- Adding soft enforcement via existing identity tables (no ON DELETE CASCADE
-- to avoid conversation loss if team is dissolved — use ON DELETE SET NULL).
-- We do not add hard FK on assignee_id because it references 
-- identity.organization_users which is org-scoped and already RLS-protected.
```

**wa_contacts — add location_id**:
```sql
ALTER TABLE wa.wa_contacts
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES identity.locations(id);
-- Represents which location/branch serves this contact.
-- Populated by wa_provision_tenant default or wa_create_contact p_location_id param.
```

**wa_automation_rules — add location_id for location-scoped rules**:
```sql
ALTER TABLE wa.wa_automation_rules
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES identity.locations(id);
-- NULL = org-wide rule. Non-null = only fires for contacts assigned to that location.
-- Receiver filters: WHERE location_id IS NULL OR location_id = contact.location_id
```

**wa_drip_campaigns — add location_id**:
```sql
ALTER TABLE wa.wa_drip_campaigns
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES identity.locations(id);
-- NULL = org-wide campaign.
```

**New table: wa_routing_rules** (auto-assignment engine):
```sql
CREATE TABLE wa.wa_routing_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES identity.organizations(id),
  name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  -- Conditions (all must match — AND logic)
  match_identity_type TEXT[],     -- e.g. ['b2c_lead','b2c_lead_mql']
  match_tags TEXT[],              -- contact has any of these tags
  match_location_id UUID REFERENCES identity.locations(id),
  match_keyword TEXT,             -- inbound message contains keyword
  -- Assignment target (first non-null wins)
  assign_team_id UUID REFERENCES identity.teams(id),
  assign_role_id UUID REFERENCES identity.roles(id),
  assign_user_id UUID,            -- identity.organization_users.id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: Tenant_Isolation_V5
```

**New function: `wa_auto_route_conversation(conversation_id, contact_id)`**:
```sql
-- Called by wa_update_conversation_on_message trigger on first message (new conversation)
-- Evaluates wa_routing_rules in priority order
-- On match: calls wa_assign_to_team_role() with matched target
-- Returns: assigned target description or 'unrouted'
```

**Update `wa_assign_to_team_role()`** to validate target exists in identity schema:
```sql
-- Add: PERFORM 1 FROM identity.teams WHERE id = p_target_team_id AND organization_id = org_id
-- Add: PERFORM 1 FROM identity.roles WHERE id = p_target_role_id AND organization_id = org_id
-- Raises if team/role not found in same org
```

### P1 Deliverables
- [ ] `20260601004422_wa_commerce_integration.sql`
- [ ] `20260601004423_wa_identity_integration.sql`
- [ ] `wa_create_manual_order()` rewritten (in 004422)
- [ ] `wa_get_contact_orders()` new RPC (in 004422)
- [ ] `wa_routing_rules` table + `wa_auto_route_conversation()` (in 004423)
- [ ] `wa_assign_to_team_role()` updated with identity validation (in 004423)

---

## Phase 2 — Backend Reliability & Missing Core Functions

> **Goal**: Plug the operational gaps — opt-out compliance, message retry, manual campaign execution, drip safety, SLA enforcement, analytics RPCs.  
> **Files**: 3 migrations + 2 new edge functions  
> **Risk**: Low-medium — additive changes

### P2-1: Opt-out / Re-subscribe tracking (GAP-SEC-3)

**Migration** `20260601004424_wa_optout_and_retry.sql`:

```sql
-- wa_contacts: ensure opt_in_status is NOT NULL with default true
ALTER TABLE wa.wa_contacts
  ALTER COLUMN opt_in_status SET DEFAULT TRUE,
  ALTER COLUMN opt_in_status SET NOT NULL;

-- Track opt-out timestamp
ALTER TABLE wa.wa_contacts
  ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opted_in_at  TIMESTAMPTZ;

-- wa_handle_optout(wa_contact_id) — called by receiver when STOP matches
CREATE OR REPLACE FUNCTION wa.wa_handle_optout(p_wa_contact_id UUID) RETURNS void ...
-- Sets opt_in_status=false, opted_out_at=NOW()
-- Cancels all active drip enrollments for this contact
-- Logs a wa_messages record (direction='system', type='opt_out')

-- wa_handle_optin(wa_contact_id) — called by receiver when START matches
CREATE OR REPLACE FUNCTION wa.wa_handle_optin(p_wa_contact_id UUID) RETURNS void ...
-- Sets opt_in_status=true, opted_in_at=NOW()

-- whatsapp-sender guard: block sends to opted-out contacts
-- Add to wa_log_message BEFORE INSERT trigger (trg_wa_msg_10_standardize):
-- IF direction='outbound' AND opt_in_status=false → RAISE EXCEPTION 'Contact has opted out'
-- OR: add check in whatsapp-sender before calling Meta API
```

**Update `whatsapp-receiver`**: After STOP automation rule fires → call `wa_handle_optout()`. After START → call `wa_handle_optin()`.

### P2-2: Message retry queue (GAP-FEAT-1)

**In same migration** `20260601004424_wa_optout_and_retry.sql`:

```sql
CREATE TABLE wa.wa_message_retry_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  contact_wa_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  message_content JSONB NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','succeeded','failed','cancelled')),
  source TEXT,             -- 'drip' | 'manual' | 'automation'
  source_id UUID,          -- enrollment_id or campaign_id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON wa.wa_message_retry_queue (next_retry_at, status)
  WHERE status = 'pending';
```

**New edge function** `process-wa-retry`:
- Cron: every 2 minutes
- Fetches `status='pending' AND next_retry_at <= NOW() AND attempt_count < max_attempts`
- Calls `whatsapp-sender` for each
- On success: status='succeeded'
- On transient error (5xx, 429): increment attempt_count, next_retry_at = NOW() + (2^attempt_count * 30s) — exponential backoff
- On max_attempts reached: status='failed'

**Update `whatsapp-sender`**: On Meta API non-2xx → insert into `wa_message_retry_queue` instead of silent fail.

### P2-3: Manual broadcast campaign executor (GAP-BE-1)

**Migration** `20260601004425_wa_manual_campaigns.sql`:

```sql
-- Add execution tracking to wa_manual_campaigns
ALTER TABLE wa.wa_manual_campaigns
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','running','paused','completed','failed')),
  ADD COLUMN IF NOT EXISTS total_recipients INTEGER,
  ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS template_name TEXT,
  ADD COLUMN IF NOT EXISTS template_language TEXT DEFAULT 'en_US',
  ADD COLUMN IF NOT EXISTS template_variables JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_segment_ids UUID[],  -- wa_contact_segments
  ADD COLUMN IF NOT EXISTS target_tags TEXT[],         -- contacts with all these tags
  ADD COLUMN IF NOT EXISTS target_identity_types TEXT[]; -- identity_type filter
```

**New edge function** `process-manual-campaigns`:
- Cron: every 5 minutes
- Fetches campaigns where `status='scheduled' AND scheduled_at <= NOW()`
- Sets status='running'
- Resolves target contacts (segment + tag + identity_type filters)
- Sets total_recipients count
- For each contact: inserts into `wa_message_retry_queue` (source='manual', source_id=campaign_id)
- Increments sent_count/failed_count
- Sets status='completed' when done

### P2-4: Drip safety — trigger payload validation + cycle detection (GAP-BE-3, GAP-BE-4)

**Migration** `20260601004425_wa_manual_campaigns.sql` (continued):

```sql
-- Cycle detection: prevent parent_step_id pointing to a descendant
CREATE OR REPLACE FUNCTION wa.trg_check_drip_step_no_cycle() RETURNS TRIGGER AS $$
DECLARE v_ancestor UUID := NEW.parent_step_id;
BEGIN
  WHILE v_ancestor IS NOT NULL LOOP
    IF v_ancestor = NEW.id THEN
      RAISE EXCEPTION 'Cycle detected in drip step tree at step %', NEW.id;
    END IF;
    SELECT parent_step_id INTO v_ancestor FROM wa.wa_drip_steps WHERE id = v_ancestor;
  END LOOP;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wa_drip_step_cycle_check
  BEFORE INSERT OR UPDATE OF parent_step_id ON wa.wa_drip_steps
  FOR EACH ROW EXECUTE FUNCTION wa.trg_check_drip_step_no_cycle();

-- Trigger payload validation: if parent step is interactive/button type,
-- child trigger_payloads must be non-empty
CREATE OR REPLACE FUNCTION wa.wa_validate_drip_step(p_step_id UUID) RETURNS JSONB ...
-- Returns {valid: bool, errors: []}
-- Called by builder UI before save and in a BEFORE INSERT trigger
```

### P2-5: SLA breach detection (GAP-UI-3)

**Migration** `20260601004425_wa_manual_campaigns.sql` (continued):

```sql
-- Function called by cron to detect and mark SLA breaches
CREATE OR REPLACE FUNCTION wa.wa_check_sla_breaches() RETURNS INTEGER AS $$
-- Updates wa_agent_transfers SET sla_breached_at = NOW()
-- WHERE sla_response_deadline < NOW() AND sla_breached_at IS NULL AND status = 'pending'
-- Returns count of newly breached transfers
$$ LANGUAGE plpgsql;
```

**Cron**: Add `wa_check_sla_breaches()` call to `process-drip-enrollments` cron OR create a separate lightweight function.

### P2-6: Drip funnel analytics RPCs (GAP-FEAT-2)

**Migration** `20260601004425_wa_manual_campaigns.sql` (continued):

```sql
-- Step-level funnel for a campaign
CREATE OR REPLACE FUNCTION wa.wa_drip_step_funnel(p_campaign_id UUID)
RETURNS TABLE (
  step_id UUID, step_type TEXT, sequence_order INTEGER,
  reached_count BIGINT, completed_count BIGINT, drop_off_count BIGINT,
  avg_time_to_complete_hours NUMERIC
) ...

-- Enrollment completion rate
CREATE OR REPLACE FUNCTION wa.wa_drip_campaign_performance(p_campaign_id UUID)
RETURNS JSONB ...
-- Returns: {completion_rate, avg_steps_completed, median_time_to_complete_hours,
--           opt_out_rate_during, reply_rate_per_step}
```

### P2 Deliverables
- [ ] `20260601004424_wa_optout_and_retry.sql` — opt-out functions, retry queue table
- [ ] `20260601004425_wa_manual_campaigns.sql` — campaign status, cycle check, SLA, analytics RPCs
- [ ] New edge function `process-wa-retry`
- [ ] New edge function `process-manual-campaigns`
- [ ] `whatsapp-receiver` — call `wa_handle_optout/optin` after STOP/START rule fires
- [ ] `whatsapp-sender` — on Meta error → insert retry queue row

---

## Phase 3 — Cross-Schema Integration: CRM, Catalog, Commerce, Finance

> **Goal**: WA is a channel layer over real business data. This phase wires the variable resolution engine and WA functions properly into crm, catalog, commerce, and finance so drip messages can reference live business data.  
> **Files**: 1 migration + updates to process-drip-enrollments  
> **Risk**: Medium — read-only joins across schemas, new RPCs

### P3-1: Expanded variable resolution (commerce + catalog + crm + finance)

**Migration** `20260601004426_wa_cross_schema_vars.sql`:

```sql
-- Expand wa_fetch_variable_value() to support new data sources:
--
-- commerce.* sources:
--   order.number, order.total, order.status, order.items_summary
--   order.last (most recent order for contact)
--
-- catalog.* sources:
--   catalog.offering.name, catalog.offering.price (by offering_id in contact external data)
--
-- crm.* sources:
--   crm.contact.name, crm.contact.email, crm.deal.stage, crm.deal.value
--   (already partially supported via unified.contacts path)
--
-- finance.* sources:
--   finance.invoice.amount_due, finance.invoice.due_date (for payment reminder drips)
--
-- identity.* sources (expanded):
--   identity.location.name (the contact's assigned location name)
--   identity.org.name

-- wa_get_catalog_for_org(p_organization_id, p_limit) → TABLE
-- Returns catalog.offerings for the org (active, enable_checkout=true)
-- Used by WA order builder in the inbox

-- wa_get_pending_invoices_for_contact(p_wa_contact_id) → TABLE
-- Joins wa_contacts.linked_entity_id → finance.financial_profiles → finance.invoices
-- Returns overdue/pending invoices for use in payment reminder drip campaigns
```

### P3-2: CRM promotion enhancement

**Migration** `20260601004426_wa_cross_schema_vars.sql` (continued):

```sql
-- Enhance wa_promote_to_lead() to optionally create a crm.deals entry
CREATE OR REPLACE FUNCTION wa.wa_promote_to_lead(
  p_wa_contact_id UUID,
  p_identity_type TEXT DEFAULT NULL,
  p_create_deal BOOLEAN DEFAULT FALSE,    -- NEW
  p_deal_stage TEXT DEFAULT 'inquiry'     -- NEW
) RETURNS JSONB  -- changed from UUID to include deal_id
...
-- If p_create_deal=true AND promotion created a new crm.contacts:
--   INSERT INTO crm.deals (contact_id, organization_id, stage, source='whatsapp')
-- Returns {unified_contact_id, crm_contact_id, deal_id}
```

### P3-3: Commerce order RPC for WA inbox

```sql
-- wa_create_commerce_order() — final version using catalog.offerings
-- p_items: [{offering_id, variant_id?, quantity, override_price?}]
-- Validates offering exists + is active + enable_checkout=true
-- Looks up price from catalog.offering_prices (org price list or default)
-- Creates commerce.orders + commerce.order_items
-- Optionally creates commerce.payments row if payment_method provided
-- Logs template message to wa_messages (order confirmation)

-- wa_get_contact_commerce_summary(p_wa_contact_id) → JSONB
-- Returns: {order_count, total_spend, last_order_at, open_orders, pending_invoices}
-- Used in contact detail panel + drip variable {{contact.total_spend}}
```

### P3-4: Update drip variable resolution in process-drip-enrollments

Update `process-drip-enrollments` edge function to call the expanded variable sources:
- Fetch CRM deal data if `linked_entity_type = 'unified.contacts'`
- Fetch most recent commerce order for template variables
- Fetch pending invoice for payment reminder templates
- Pass enriched context to `wa_resolve_variables()`

### P3 Deliverables
- [ ] `20260601004426_wa_cross_schema_vars.sql` — expanded variable resolution + new RPCs
- [ ] `wa_promote_to_lead()` updated with optional deal creation
- [ ] `wa_create_commerce_order()` final implementation
- [ ] `wa_get_contact_commerce_summary()` new RPC
- [ ] `wa_get_catalog_for_org()` new RPC
- [ ] `wa_get_pending_invoices_for_contact()` new RPC
- [ ] `process-drip-enrollments` updated to use expanded context

---

## Phase 4 — CF Proxy Hardening

> **Goal**: CF proxy is the permanent stable entry point for all Meta traffic. Harden it, document it, enable the generic proxy for internal uses.  
> **Files**: `cf-proxy/workers.js` update only — no migrations  
> **Risk**: Low

### P4-1: Finalize workers.js

```js
// Activate and complete:
// 1. Signature verification (already done in P0)
// 2. /webhooks/whatsapp-delete → wa-delete edge function (already done in P0)
// 3. Enable /functions/* generic proxy (uncomment + update)
//    - Only allow-listed functions: whatsapp-sender, process-drip-enrollments
//    - Forwards Authorization header from caller (for user-authenticated calls)
//    - Adds X-Supabase-Project header for future multi-project routing
// 4. Add /health endpoint with version + last-deployment info from env vars
// 5. Add request ID header (X-CF-Request-ID) for tracing across CF → Supabase logs
// 6. Add CF Worker env var: SUPABASE_PROJECT_REF for project-specific routing
```

### P4-2: Route map (final)

```
CF Worker routes (permanent stable URLs registered with Meta):
  GET  /webhooks/whatsapp          → Meta verification handshake (handled in CF, no Supabase call)
  POST /webhooks/whatsapp          → [signature verify] → whatsapp-receiver
  GET  /webhooks/whatsapp-delete   → Meta GDPR verification (handled in CF)
  POST /webhooks/whatsapp-delete   → [signature verify] → wa-delete
  GET  /health                     → CF health JSON

CF Worker routes (internal/UI use, optional via proxy):
  POST /functions/whatsapp-sender            → whatsapp-sender (forwards user JWT)
  POST /functions/process-drip-enrollments   → process-drip-enrollments (service role)

Direct Supabase (no CF):
  All other edge functions (shopify-sync, invite_users, etc.)
```

### P4-3: Env vars required in CF Worker secrets

| Secret | Purpose |
|--------|---------|
| `META_VERIFY_TOKEN` | Webhook verification handshake |
| `META_APP_SECRET` | Signature verification (HMAC-SHA256) |
| `SUPABASE_URL` | Target Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Auth header when forwarding to Supabase |
| `RATE_LIMIT_KV` | KV namespace binding for rate limiting |
| `SUPABASE_PROJECT_REF` | For logging/tracing |

### P4 Deliverables
- [ ] `cf-proxy/workers.js` — generic proxy enabled, wa-delete route, request ID header
- [ ] CF Worker secrets documentation updated
- [ ] Meta webhook URL confirmed pointing to CF worker (not Supabase directly)

---

## Phase 5 — UI (Single Phase, After All Backend Phases Approved)

> **Goal**: Surface all backend functionality built in Phases 0–4 in the `zo_waCRM` React app. No new backend work in this phase.  
> **Constraint**: Minimal, focused — existing page structure extended, not rewritten.

### Contact Panel (drawer / detail view)
- **Identity section**: show `resolution_status` badge, `identity_type` chip, `linked_entity_type`
- **Promote to Lead** button: calls `wa_promote_to_lead()` with optional "Create Deal" toggle
- **Opt-out indicator**: show opted-out badge; block compose area with warning if opted out
- **Location assignment**: dropdown bound to `identity.locations` for the org
- **Sequences tab**: list active enrollments (status, current step, next_execution_at), pause/resume/cancel actions
- **Commerce tab**: call `wa_get_contact_commerce_summary()` — show order count, total spend, open orders, pending invoices

### Inbox Conversation Panel
- **Assignment panel**: Team selector (identity.teams), Role selector (identity.roles), Agent selector (identity.organization_users filtered by team/role)
- **Transfer queue indicator**: show pending transfer badge + accept/cancel if current user is target
- **SLA indicator**: red timer badge if `sla_breached_at` is set
- **Snooze controls**: datetime picker → sets `wa_conversations.snoozed_until`
- **Order button**: opens order builder using `wa_get_catalog_for_org()` → calls `wa_create_commerce_order()`

### Sequences Builder (DripCampaignBuilder)
- **Trigger payload validator**: warn if parent step is interactive but child trigger_payload is empty
- **Location scope**: dropdown to scope campaign to a specific location
- **Funnel analytics tab**: call `wa_drip_step_funnel()` + `wa_drip_campaign_performance()` — step completion chart

### Manual Campaigns Page
- **Status display**: show running/completed/failed status, sent_count/total_recipients progress bar
- **Recipient filters**: tag filter, identity_type filter, segment selector
- **Template picker**: shows only APPROVED templates + variable preview

### Analytics Page
- **Contact metrics section**: surface `wa_contact_metrics` view — resolution_status pie, identity_type breakdown
- **Message delivery rates**: `delivered` / `read` / `failed` counts per day (from `wa_messages.status`)
- **Drip performance**: campaign completion rates from `wa_drip_campaign_performance()`

### Settings Page — WA Config
- **WABA panel**: call `wa_provision_tenant()` on first connect; show current `phoneNumberId` / `wabaId`
- **Routing rules**: CRUD for `wa_routing_rules` — condition builder + assignment target picker
- **Seed automation rules**: show STOP/START/HELP rules; allow editing response text

### Template Editor
- **Test send**: number input + "Send Test" → calls `whatsapp-sender` with sample variable values
- **Variable mapper**: UI to create `wa_template_variable_mappings` rows (source dropdown + field input)

### Phase 5 Deliverables
- [ ] Contact detail drawer — identity + opt-out + sequences + commerce tabs
- [ ] Inbox — assignment panel + SLA + snooze + order builder
- [ ] Drip builder — funnel analytics + trigger payload validator + location scope
- [ ] Manual campaigns — status progress + recipient filters
- [ ] Analytics — delivery rates + contact metrics + drip performance
- [ ] Settings — routing rules CRUD + WABA config panel
- [ ] Template editor — test send + variable mapper

---

## Summary

| Phase | Name | Migrations | Edge Fn | Risk | Dependency |
|-------|------|-----------|---------|------|------------|
| **0** | Stability & Security | 1 | receiver update | Low | None — run immediately |
| **1** | Commerce + Identity Foundation | 2 | none | Medium | Phase 0 complete |
| **2** | Reliability & Missing Backend | 2 | 2 new fns | Low-Med | Phase 1 complete |
| **3** | Cross-Schema Integration | 1 | drip update | Medium | Phase 1 complete |
| **4** | CF Proxy Hardening | none | CF worker only | Low | Phase 0 complete |
| **5** | UI (all features) | none | none | Medium | Phases 1–4 complete |

### Migration sequence (full ordered list)
```
20260601004421  wa_fix_template_standardize       (Phase 0)
20260601004422  wa_commerce_integration           (Phase 1)
20260601004423  wa_identity_integration           (Phase 1)
20260601004424  wa_optout_and_retry               (Phase 2)
20260601004425  wa_manual_campaigns_and_safety    (Phase 2)
20260601004426  wa_cross_schema_vars              (Phase 3)
```

### What does NOT route through CF proxy
- `whatsapp-sender` — direct from React UI (user JWT)
- `process-drip-enrollments` — invoked by Supabase cron (internal)
- `process-wa-retry` — Supabase cron (internal)
- `process-manual-campaigns` — Supabase cron (internal)
- All non-WA edge functions

### What ALWAYS routes through CF proxy
- `whatsapp-receiver` — Meta calls this
- `wa-delete` — Meta calls this (GDPR)

> Meta's registered webhook URL is the CF worker URL. It never changes regardless of Supabase project, region, or token rotation.
