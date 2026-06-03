# WhatsApp (WA) Module — Specification

> **SDD Version**: 1.0 — 2026-05-25  
> **Sources**: `supabase/migrations/202606010033_wa_tables.sql`, `supabase/migrations/20260601004415_wa_functions.sql`, `supabase/migrations/20260601004416_wa_triggers.sql`, `supabase/migrations/20260601004417_wa_schema_alignment.sql`, `supabase/migrations/202606010064_rls_wa.sql`, `supabase/functions/whatsapp-receiver/`, `supabase/functions/whatsapp-sender/`, `supabase/functions/process-drip-enrollments/`, `/Users/macbookpro/zo_v2/zo_waCRM/`  
> **Agent instructions**: Read Sections 1–3 for context. Section 4 for backend/DB work. Section 5 for edge function work. Section 6 for React UI work. Section 7 for E2E/integration work.

---

## 1. Business Context & Purpose

The `wa` schema is the **WhatsApp Business channel layer** for the Zo platform. It handles the full lifecycle of WhatsApp communication for any tenant — from receiving raw Meta webhook payloads to drip campaign automation and CRM promotion.

It answers:
1. **Who sent this message?** → `wa_contacts` (channel endpoint) + `wa_resolve_identity()` (CRM/identity link)
2. **What should we reply?** → keyword automation → drip branching → Agentic Brain fallback
3. **Where is this conversation headed?** → `wa_conversations` (inbox) + agent assignment
4. **Is this a lead?** → `wa_promote_to_lead()` → `unified.contacts` + `crm.contacts`

### Platform Position
- **Depends on**: `identity` (org resolution, user auth), `unified` (contact anchors), `crm` (lead/customer classification), `core` (entity blueprints)
- **WA contacts are NOT CRM contacts**: `wa_contacts` is a channel endpoint registry. A phone number may belong to an employee, a partner, a known CRM contact, or a stranger. Promotion to CRM is explicit via `wa_promote_to_lead()`.
- **Multi-tenant WABA**: Each `identity.organizations` tenant has one WABA config (`app_settings.channels.whatsapp.configuration`). The `phone_number_id` in this config is what binds a Meta webhook to a tenant.
- **Three routing layers**: Inbound messages first hit keyword automation, then drip sequence branching, then Agentic Brain (GCE). Only the first match fires.

---

## 2. Table Inventory

### Core Channel Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `wa.wa_contacts` | Channel endpoint registry — one row per phone number per org | `organization_id`, `wa_id` (phone), `identity_type`, `resolution_status`, `linked_entity_id`, `linked_entity_type`, `tags[]`, `opt_in_status` |
| `wa.wa_conversations` | Inbox threads — one per contact per engagement window | `organization_id`, `contact_id`, `status` (open/closed/snoozed), `assignee_id`, `team_id`, `role_id`, `last_message_at`, `snoozed_until` |
| `wa.wa_messages` | Full message log — inbound and outbound | `organization_id`, `contact_id`, `conversation_id`, `whatsapp_message_id`, `direction` (inbound/outbound), `type`, `content` (JSONB raw), `details` (JSONB standardized), `status`, `channel` |
| `wa.wa_agent_transfers` | Transfer queue — pending/assigned/cancelled/completed | `conversation_id`, `from_user_id`, `to_user_id`, `to_team_id`, `to_role_id`, `status`, `notes`, `sla_response_deadline`, `sla_breached_at` |

### Automation & Templates

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `wa.wa_automation_rules` | Keyword-triggered instant responses | `organization_id`, `trigger_type` (keyword/order_status/payment_status), `trigger_config` (JSONB), `response_config` (JSONB), `keywords[]` (legacy), `priority`, `is_active` |
| `wa.wa_templates` | WhatsApp Business template registry | `organization_id`, `name`, `language`, `status` (PENDING/APPROVED/REJECTED), `components` (JSONB — header/body/footer/buttons), `template_id` (Meta ID) |
| `wa.wa_template_variable_mappings` | Variable auto-fill config per template | `template_id`, `variable_name`, `data_source`, `data_field`, `default_value` |
| `wa.wa_variable_definitions` | Custom variable registry | `organization_id`, `variable_key`, `variable_syntax`, `category`, `data_source`, `is_system` |
| `wa.wa_quick_replies` | Canned responses for agents | `organization_id`, `title`, `content`, `media_type`, `media_url`, `category`, `usage_count` |

### Drip / Sequence Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `wa.wa_drip_campaigns` | Sequence definitions | `organization_id`, `name`, `trigger_type` (new_lead/tag_added/keyword), `trigger_config` (JSONB — keywords[], tag_name), `is_active` |
| `wa.wa_drip_steps` | Step nodes — forms a tree via `parent_step_id` | `campaign_id`, `parent_step_id`, `step_type` (message/delay/action), `content` (JSONB), `trigger_payload` (button match value), `sequence_order` |
| `wa.wa_drip_enrollments` | Active/paused/completed/cancelled enrollments per contact | `campaign_id`, `contact_id`, `organization_id`, `status`, `current_step_id`, `next_execution_at`, `variables` (JSONB), `channel` |
| `wa.wa_drip_execution_log` | Step execution audit trail | `enrollment_id`, `step_id`, `action`, `result` (JSONB), `executed_at` |

### Contacts & Segmentation

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `wa.wa_contact_segments` | Manual/auto/import/rule segment assignments | `contact_id`, `organization_id`, `segment_name`, `assignment_type` |
| `wa.wa_contact_external_data` | CRM sync data per contact | `contact_id`, `source` (erp/crm/shopify/zoho/csv/api), `external_id`, `data` (JSONB) |

### Commerce (Staging)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `wa.x_wa_orders` | Order records (staging — long-term moves to commerce schema) | `organization_id`, `contact_id`, `conversation_id`, `total_amount`, `currency`, `status`, `notes` |
| `wa.x_wa_order_items` | Order line items | `order_id`, `offering_id`, `quantity`, `unit_price`, `subtotal` |

### Analytics / Derived

| Table/View | Purpose |
|-----------|---------|
| `wa.v_wa_contacts` | Read-only join view: wa_contacts + identity resolution display name/mobile |
| `wa.wa_contact_metrics` | Analytical view: resolution_status distribution, identity_type counts per org |

### Legacy / Low-Priority

| Table | Notes |
|-------|-------|
| `wa.campaigns` | Generic campaign table — superseded by `wa_drip_campaigns` and `wa_manual_campaigns` |
| `wa.wa_manual_campaigns` | Broadcast campaigns (scheduling, stats JSONB) |
| `wa.call_logs` | Voice call logs |
| `wa.game_sessions`, `wa.game_scores` | Interactive game state — legacy JSON with double-escape issues |

---

## 3. Identity Resolution Model

`wa_contacts` is a **channel endpoint**, not a CRM entity. The identity pipeline maps it to a known person via `wa_resolve_identity()`.

### resolution_status lifecycle

```
pending → resolved       (phone matched in identity or CRM)
        → unresolvable   (no match found after exhaustive search)
        → ambiguous      (multiple matches — requires manual review)
```

### identity_type values

| value | meaning | source |
|-------|---------|--------|
| `employee` | Internal staff (no timesheets) | `identity.users` |
| `field_worker` | Internal staff with timesheet records | `identity.users` |
| `b2b_partner` | `crm.contacts.is_partner_delegate = true` | `unified.contacts` |
| `b2b_customer` | Has account_id + contact_type='business' | `unified.contacts` |
| `b2c_customer` | Has order history in x_wa_orders | `unified.contacts` |
| `b2c_lead_sql` | Has open deal in crm.deals | `unified.contacts` |
| `b2c_lead_mql` | score ≥ 50 | `unified.contacts` |
| `b2c_lead` | Default for unknown CRM contact | `unified.contacts` |
| `unknown` | No match in any schema | — |

### Auto-link on INSERT
`trg_wa_contacts_auto_link` (BEFORE INSERT) fires `wa.trg_auto_link_new_contact()` which calls `wa_resolve_identity()` and populates `linked_entity_id`, `linked_entity_type`, `identity_type`, `tags[]`, `resolution_status`.

---

## 4. Use Cases & Business Rules

---

### UC-WA-1: New Tenant — Connect WhatsApp (WABA Provisioning)

**Actor**: SaaS Platform Admin  
**Trigger**: Tenant is approved and admin has Meta WABA credentials  
**Entry point**: `wa.wa_provision_tenant()` RPC (admin call)

**Business Rules**:
- BR-1.1: Each tenant gets exactly one WABA config. `phoneNumberId` must be globally unique across all orgs — the RPC rejects duplicates with an exception.
- BR-1.2: Config is stored at `identity.organizations.app_settings->'channels'->'whatsapp'->'configuration'` as `{phoneNumberId, wabaId, accessToken, displayName, provisionedAt}`.
- BR-1.3: Calling the function activates `identity.organizations.is_active = true` (unless `p_activate_org = false`).
- BR-1.4: Three seed automation rules are inserted (idempotent via ON CONFLICT DO NOTHING): **STOP** (priority 1), **START** (priority 2), **HELP** (priority 10).
- BR-1.5: An index on `app_settings->>'phoneNumberId'` ensures org lookup on every webhook is O(log n), not a full table scan.
- BR-1.6: Re-running `wa_provision_tenant()` is safe — use it to rotate access tokens or update the phone number.

**Outcome**: Tenant is live on WhatsApp. Inbound messages to that phoneNumberId will resolve to this org.

---

### UC-WA-2: Receive Inbound WhatsApp Message

**Actor**: WhatsApp End-User → Meta Cloud API → `whatsapp-receiver` edge function  
**Trigger**: Meta sends POST webhook to `https://{supabase-url}/functions/v1/whatsapp-receiver`

**Flow**:
1. Parse Meta payload → extract `phone_number_id` from `entry[0].changes[0].value.metadata`
2. Resolve org via `wa_get_organization_by_phone_number_id(phone_number_id)` → `identity.organizations`
3. For each message in `value.messages`:
   a. Create/get contact: `wa_create_contact(org_id, from, profile.name)`
   b. Log message: `wa_log_message(org_id, contact_id, msg_id, 'inbound', type, msg_object, 'received', timestamp)` — **pass the raw msg object, NOT `JSON.stringify(msg)`**
   c. **Routing (short-circuit — first match wins):**
      - processAutomations: check `wa_automation_rules` (is_active=true, trigger_type='keyword') → keyword substring match → invoke `whatsapp-sender` → return true
      - processSequenceBranching: check active enrollments → find child step matching `trigger_payload` → advance enrollment + invoke `process-drip-enrollments`
      - processDripTriggers: check active `wa_drip_campaigns` (trigger_type='keyword') → keyword match → `wa_drip_enroll_contact` + invoke `process-drip-enrollments`
      - No match: send instant ack ("🔍 One moment..."), async POST to GCE Brain (`http://34.131.6.16:8080/api/whatsapp/webhook`)

**Business Rules**:
- BR-2.1: If `phone_number_id` not found in any org's config → log warning, return 200 (Meta requires 200 always).
- BR-2.2: If contact creation fails → skip message processing, log error, continue to next message.
- BR-2.3: If message logging fails → log error to console but **do not block routing**. GCE Brain still receives the message.
- BR-2.4: Automation rules evaluated in `priority ASC` (lower number = higher priority). First keyword match wins — remaining rules are skipped.
- BR-2.5: Sequence branching only fires if contact has an `active` enrollment and the step has matching `trigger_payload`.
- BR-2.6: STOP/START rules (priority 1/2) are seeded by provisioning and always evaluated first, ensuring opt-out compliance per Meta policy.
- BR-2.7: `getTriggerText(msg, preferPayload)` — for branching, uses `button.payload` or `interactive.button_reply.id` (exact match); for keyword rules, uses display text.

**Trigger chain on `wa_log_message`**:
1. `trg_wa_msg_10_standardize` → `wa_standardize_message_content()`: parses `content` JSONB → populates `details` (body, media_url, media_type, template_name, etc.)
2. `trg_wa_msg_20_update_conversation` → `wa_update_conversation_on_message()`: upserts `wa_conversations`, sets `last_message_at`, updates `summary` from `details.body`, reopens snoozed conversations
3. `trg_wa_msg_30_validate` → `wa_validate_message_content()`: enforces type-specific required fields (text→body, media→media_url, template→template_name). Raises P0001 on violation.

---

### UC-WA-3: Send Outbound WhatsApp Message

**Actor**: Agent (via UI) or automated system (drip/automation)  
**Entry point**: `whatsapp-sender` edge function (POST)

**Payload**:
```json
{
  "p_organization_id": "uuid",
  "p_contact_wa_id": "919876543210",
  "p_message_type": "text|image|video|audio|document|sticker|template|interactive|location|contacts",
  "p_message_content": "string or object depending on type",
  "p_reply_to_message_id": "wamid.xxx"  // optional
}
```

**Flow**:
1. Fetch org WhatsApp config from `identity.organizations.app_settings`
2. Validate content per message type (see BR below)
3. Build Meta API payload via `buildWhatsAppMessage()`
4. POST to `https://graph.facebook.com/{META_API_VERSION}/{phoneNumberId}/messages`
5. `wa_create_contact()` → ensure contact exists
6. `wa_log_message()` with direction='outbound', status='sent'
7. Return `{success, message_id, contact_id}`

**Business Rules**:
- BR-3.1: `text` — body must exist, length ≤ 4096 chars.
- BR-3.2: `image/video/audio/document/sticker` — requires `link` (URL) OR `id` (Meta media ID). Document additionally supports `filename`.
- BR-3.3: `template` — requires `name` + `language.code`. Stored in content as `{name, language, components}` (flat, not nested under `template` key).
- BR-3.4: `interactive` — requires `type`, `body.text`, `action`. Types: `button`, `list`.
- BR-3.5: `location` — requires `latitude` (number), `longitude` (number).
- BR-3.6: `contacts` — requires non-empty `contacts` array.
- BR-3.7: The function does NOT verify template `status = 'APPROVED'` before sending (unlike `wa_send_template` RPC). Template approval must be validated by the caller.
- BR-3.8: Auth: function uses `SUPABASE_SERVICE_ROLE_KEY`. JWT verification is disabled (`Verify JWT` OFF in Supabase settings). No user-level auth check inside the function.

---

### UC-WA-4: Drip Campaign — Contact Auto-Enrollment

**Actor**: System (trigger-driven)  
**Trigger**: New `wa_contacts` INSERT OR `tags` column UPDATE

**Auto-enroll on INSERT** (`wa_drip_on_new_contact` trigger):
- Query all `wa_drip_campaigns` where `organization_id = NEW.organization_id AND is_active = true AND trigger_type = 'new_lead'`
- For each: call `wa_drip_enroll_contact(campaign_id, NEW.id)`

**Auto-enroll on tag change** (`wa_drip_on_tag_added` trigger):
- When `OLD.tags IS DISTINCT FROM NEW.tags`
- Query campaigns with `trigger_type = 'tag_added'`
- Match if `trigger_config->>'tag_name' = any(NEW.tags)` OR `trigger_config->'tag_ids' ? tag_id`
- Enroll in each match

**Business Rules**:
- BR-4.1: `wa_drip_enroll_contact()` cancels any existing **active** enrollment in the same campaign before creating a new one. Prevents duplicate active enrollments.
- BR-4.2: New enrollment sets `next_execution_at = NOW()` and `current_step_id = wa_drip_get_first_step(campaign_id)`.
- BR-4.3: `wa_drip_get_first_step()` returns the step with `parent_step_id IS NULL`, ordered by `sequence_order ASC LIMIT 1`.
- BR-4.4: Enrollment is channel-aware (`channel = 'whatsapp'`).

---

### UC-WA-5: Drip Campaign — Step Execution (Scheduled)

**Actor**: System (`process-drip-enrollments` edge function — cron or manual invoke)  
**Trigger**: Cron scheduler (every ~1 min) OR invoked by receiver on enrollment

**Flow** (`wa_drip_get_due_enrollments` → for each → `wa_drip_execute_step`):

```
Fetch due enrollments:
  status = 'active'
  AND next_execution_at <= NOW()
  AND step_type known
  (limit 50 per run)

For each enrollment:
  If step_type = 'message':
    - Resolve variables in step.content (wa_resolve_variables)
    - Build Meta template payload
    - POST to Meta API via whatsapp-sender (or direct HTTP)
    - Log to wa_messages (direction='outbound')
    - wa_drip_execute_step(enrollment_id)

  If step_type = 'delay':
    - wa_drip_execute_step handles: set next_execution_at = NOW() + delay_hours
    - No message sent

  If step_type = 'action':
    - Log action; advance
```

**Step advancement logic in `wa_drip_execute_step()`**:
```
next_sibling = child step with empty trigger_payload, seq_order > current
branch_children = child steps with non-empty trigger_payload

message step:
  if next_sibling exists → advance, set next_execution_at = NOW()
  elif branch_children exist → set next_execution_at = NULL (wait_for_trigger)
  else → status = 'completed'

delay step:
  advance to next_sibling OR complete if none
  next_execution_at = NOW() + interval (from content.delay_hours)

action step:
  advance to next_sibling OR wait_for_trigger if branches OR complete
```

**Business Rules**:
- BR-5.1: `wait_for_trigger` state means `next_execution_at = NULL` — the scheduler will not pick it up. Only `processSequenceBranching` (in receiver) can advance it.
- BR-5.2: Paused enrollments (`status = 'paused'`) are not fetched by due enrollments query.
- BR-5.3: Variable resolution: `{{contact.name}}`, `{{contact.phone}}`, `{{order.total_amount}}` etc. — resolved via `wa_fetch_variable_value()`.
- BR-5.4: Variables using `schema.table.list.column` syntax aggregate values (e.g., last 3 orders).
- BR-5.5: Execution is logged to `wa_drip_execution_log` with action and result JSONB.
- BR-5.6: Template language normalization: `en` → `en_US` applied in process-drip-enrollments.

---

### UC-WA-6: Drip Campaign — Sequence Branching (Reply Match)

**Actor**: Contact replies to a branched message step  
**Trigger**: Inbound message → `processSequenceBranching()` in receiver

**Flow**:
1. Query `wa_drip_enrollments` for contact: `status='active', channel='whatsapp'`
2. For each active enrollment, query child steps of `current_step_id` (all children — both branched and sequential)
3. Match: `step.content.trigger_payload.trim().toLowerCase()` against incoming `getTriggerText(msg, preferPayload=true)`
4. Match = exact equality OR substring (`includes`)
5. If matched: update enrollment `current_step_id = matchingStep.id`, `next_execution_at = NOW()`, `last_activity_at = NOW()`
6. Invoke `process-drip-enrollments` with `{enrollment_id}`

**Business Rules**:
- BR-6.1: `preferPayload=true` → uses `button.payload` / `interactive.button_reply.id` (not display text). Use these values in `trigger_payload` when building steps.
- BR-6.2: Branch matching is case-insensitive substring. `trigger_payload = "yes"` matches "Yes, please".
- BR-6.3: If multiple enrollments are active for a contact, all are checked. First match per enrollment wins.

---

### UC-WA-7: Manual Message Send (Agent Inbox)

**Actor**: Agent using `zo_waCRM` React app  
**Trigger**: Agent types in inbox composer and clicks Send  
**Frontend entry point**: `InboxPage` composer → `whatsapp-sender` edge function

**Flow**:
1. Agent selects a conversation → contact's `wa_id` is known
2. Compose text / select template / attach media
3. POST to `whatsapp-sender` with `p_organization_id`, `p_contact_wa_id`, type, content
4. Message logged to DB → appears in conversation thread via realtime subscription

**Business Rules**:
- BR-7.1: Agent uses Supabase anon key + user session JWT. `whatsapp-sender` uses service-role; no JWT forwarded to Meta.
- BR-7.2: Outbound messages immediately appear in the conversation thread (optimistic UI + DB echo via realtime).
- BR-7.3: Templates used in sends must be `status = 'APPROVED'`. UI should filter template list to approved only.

---

### UC-WA-8: Contact Identity Promotion to CRM Lead

**Actor**: Agent manually promotes, OR system auto-triggers  
**Entry point**: `wa.wa_promote_to_lead(wa_contact_id, identity_type?)` RPC

**Business Rules**:
- BR-8.1: If `linked_entity_type = 'identity.users'` → RAISE EXCEPTION. Internal users are never promoted to CRM.
- BR-8.2: If already linked to `unified.contacts` → UPDATE `identity_type` only. No new CRM record.
- BR-8.3: If `identity_type = 'unknown'` (no existing link):
  - INSERT new `unified.contacts` with a fresh UUID
  - INSERT `crm.contacts` anchor with same UUID
  - UPDATE `wa_contacts.linked_entity_id = new UUID`, `linked_entity_type = 'unified.contacts'`, `resolution_status = 'resolved'`
- BR-8.4: Returns the `unified.contacts` UUID of the promoted or existing contact.
- BR-8.5: Promotion is audited via updated fields on `wa_contacts` (updated_at, linked_entity_id).

---

### UC-WA-9: Conversation Assignment

**Actor**: Agent or supervisor  
**Entry points**: `wa_assign_agent()`, `wa_assign_to_team_role()`

**Business Rules**:
- BR-9.1: `wa_assign_agent(conversation_id, agent_user_id)` directly sets `wa_conversations.assignee_id`. No transfer record created.
- BR-9.2: `wa_assign_to_team_role(conversation_id, ...)` inserts into `wa_agent_transfers` with `status='pending'` if no `to_user_id`, or `status='assigned'` if user specified. Cancels any existing `pending` transfer for the conversation first.
- BR-9.3: SLA fields (`sla_response_deadline`, `sla_breached_at`) exist on `wa_agent_transfers` but breach detection is not yet automated (no cron/trigger).
- BR-9.4: `wa_close_conversation()` sets `status='closed'` and nulls `assignee_id`.

---

### UC-WA-10: GDPR / Data Deletion (wa-delete)

**Actor**: Meta Platform (automated data deletion webhook)  
**Entry point**: `wa-delete` edge function

**Flow**:
1. GET: return Facebook challenge (webhook verification)
2. POST: verify `signed_request` HMAC signature via `META_APP_SECRET`
3. Extract `user_id` from decoded payload
4. `DELETE FROM wa.wa_contacts WHERE wa_id = user_id`
5. Return `{url: status_page, confirmation_code}` to Meta

**Business Rules**:
- BR-10.1: FK cascades handle child records (conversations, messages, enrollments) on contact deletion.
- BR-10.2: Signature verification is mandatory — unsigned requests are rejected with 403.
- BR-10.3: `confirmation_code` is a transient string returned to Meta to confirm deletion. No audit record persisted.

---

## 5. RPC Inventory

> **Note**: The full detailed API documentation for all 63 WA functions (Public UI APIs, Edge APIs, Trigger Pipelines, and Drip Engines) has been extracted to a dedicated SDD file to preserve readability.
> 
> 👉 **See [WA_FUNCTIONS_SDD.md](file:///Users/harineer/Documents/zoworks/zo_core_v6_supa/SDD/modules/wa/WA_FUNCTIONS_SDD.md) for the complete function inventory, signatures, and caller contexts.**

---

## 6. Trigger Inventory

| Trigger Name | Table | Event | Function | Purpose |
|-------------|-------|-------|----------|---------|
| `trg_wa_contacts_auto_link` | wa_contacts | BEFORE INSERT | `trg_auto_link_new_contact` | Resolves identity + populates linked_entity_id/type/identity_type/tags/resolution_status |
| `wa_drip_on_new_contact` | wa_contacts | AFTER INSERT | `wa_drip_trigger_new_contact` | Auto-enrolls in all active `new_lead` campaigns |
| `wa_drip_on_tag_added` | wa_contacts | AFTER UPDATE OF tags | `wa_drip_trigger_tag_added` | Auto-enrolls in `tag_added` campaigns matching new tags |
| `trg_wa_msg_10_standardize` | wa_messages | BEFORE INSERT | `wa_standardize_message_content` | Populates `details` from raw `content` |
| `trg_wa_msg_20_update_conversation` | wa_messages | BEFORE INSERT | `wa_update_conversation_on_message` | Creates/updates conversation; sets last_message_at, summary |
| `trg_wa_msg_30_validate` | wa_messages | BEFORE INSERT | `wa_validate_message_content` | Enforces type-specific required fields in `details` |

> **Naming convention**: `trg_wa_msg_10/20/30_*` ensures PostgreSQL fires BEFORE triggers in alphabetical order: standardize → update_conversation → validate. This is required because validate reads `details` which standardize writes.

---

## 7. RLS Policy Summary

All `wa.*` tables have `FORCE ROW LEVEL SECURITY` enabled.

| Policy | Tables | Rule |
|--------|--------|------|
| `Tenant_Isolation_V5` | wa_contacts, wa_conversations, wa_messages, wa_agent_transfers, wa_drip_enrollments, wa_drip_steps, wa_drip_execution_log, wa_contact_segments, wa_contact_external_data, wa_automation_rules, wa_routing_rules, call_logs | `organization_id = identity.get_current_org_id()` |
| `Standard_Insert_V5` | wa_manual_campaigns | `organization_id = current_org AND persona = 'worker'` |
| `Config_Tenant_Or_Platform_V6` | wa_templates | `org_id = current OR org_id = system_org` |
| `Authenticated_Access_V5` | wa_template_variable_mappings (Pending RLS lockdown) | Any authenticated user |

> Edge functions run as `SUPABASE_SERVICE_ROLE_KEY` — RLS is bypassed. RPC functions use `SECURITY DEFINER` — also bypass RLS. RLS applies only to direct table queries from the React app (anon key + user session JWT).

---

## 8. Edge Function Summary

| Function | Auth | Trigger | Key Side Effects |
|----------|------|---------|-----------------|
| `whatsapp-receiver` | Service role | Meta webhook POST | Creates contacts, logs messages, fires automation/drip/Brain routing |
| `whatsapp-sender` | Service role (JWT verify OFF) | HTTP POST | Calls Meta API, logs outbound message |
| `process-drip-enrollments` | Service role | Cron + manual invoke | Executes due steps, sends messages via Meta API, advances enrollment FSM |
| `wa-delete` | Meta signature (HMAC) | Meta data deletion webhook | Deletes wa_contacts row; FK cascades clean children |

---

## 9. app_settings WABA Config Shape

Stored at `identity.organizations.app_settings`:
```json
{
  "channels": {
    "whatsapp": {
      "configuration": {
        "phoneNumberId": "720023657865694",
        "wabaId": "1630135774535444",
        "accessToken": "EAAxxxxxxx",
        "displayName": "Org Name",
        "provisionedAt": "2026-05-25T00:00:00Z"
      }
    }
  }
}
```

---

## 10. Known Constraints & Gotchas

1. **`p_content` must be object, not string**: `wa_log_message` expects `jsonb`. Always pass the raw message object — never `JSON.stringify(msg)`. A string value causes all JSONB key lookups to silently return NULL, triggering the `wa_validate_message_content` P0001 exception.

2. **Trigger order is name-dependent**: The `10_/20_/30_` prefix in trigger names is load-bearing. PostgreSQL fires same-event BEFORE triggers alphabetically. If trigger names change, standardize→validate order breaks.

3. **Template content format**: `whatsapp-sender` stores `{name, language, components}` flat in `content` — NOT nested under a `template` key. `wa_standardize_message_content` reads `content->'template'->>'name'` which will be NULL for sender-originated templates. Use `content->>'name'` directly if reading template messages from `wa_messages`.

4. **x_wa_orders rename**: Tables were renamed from `wa_orders`/`wa_order_items` to `x_wa_orders`/`x_wa_order_items` in migration 004417. Any query referencing the old names will fail.

5. **Drip processor references**: `process-drip-enrollments` had a reference to `source` column on wa_contacts (removed). If the function errors on that column, the deployed version may differ from the migration-based version.

6. **wa_automation_rules legacy columns**: Both `keywords text[]` (legacy) and `trigger_config JSONB` (new) exist. The receiver reads both via `trigger_config?.keywords ?? rule.keywords`. Migration 004420 backfills `trigger_config` from `keywords` for old rows.

7. **GCE Brain endpoint is hardcoded**: `http://34.131.6.16:8080/api/whatsapp/webhook` in `whatsapp-receiver`. This is not an env var — update the function if the Brain moves.

8. **No Meta webhook signature verification in receiver**: The receiver does not validate `X-Hub-Signature-256`. Any POST to the edge function URL would be processed. This is a security gap (see gap analysis doc).
