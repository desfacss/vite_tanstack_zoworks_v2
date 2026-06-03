# WA Module — Gap Analysis

> **Version**: 1.0 — 2026-05-25  
> **Purpose**: Documents use cases that exist in the backend but lack UI, UI features that lack backend, security gaps, and missing features needed for production readiness.  
> **Priority**: P0 = blocking, P1 = high, P2 = medium, P3 = nice-to-have

---

## 1. Security Gaps (Address First)

### GAP-SEC-1 — No Meta Webhook Signature Verification in Receiver `P0`
**Status**: Backend missing  
**Detail**: `whatsapp-receiver` does not validate the `X-Hub-Signature-256` header that Meta sends on every webhook POST. Any public POST to the edge function URL gets processed as a real message.  
**Fix**: Add HMAC-SHA256 verification using `META_APP_SECRET` env var (same pattern used in `wa-delete`).
```ts
const signature = req.headers.get('x-hub-signature-256');
const body = await req.text();
const expected = 'sha256=' + await hmacSha256(META_APP_SECRET, body);
if (signature !== expected) return new Response('Forbidden', { status: 403 });
```

### GAP-SEC-2 — GCE Brain Endpoint Hardcoded `P1`
**Status**: Backend  
**Detail**: `http://34.131.6.16:8080/api/whatsapp/webhook` is hardcoded in `whatsapp-receiver`. IP change or multi-env deployment requires a code change and redeploy.  
**Fix**: Move to `GCE_BRAIN_URL` env var in Supabase project secrets.

### GAP-SEC-3 — No Opt-Out State Tracking `P1`
**Status**: Backend complete (`wa_handle_optin`, `wa_handle_optout`) — UI missing  
**Detail**: The functions to handle opt-out logic exist in the backend, but the UI lacks indicators for opted-out contacts. Meta policy requires honouring opt-out.  
**Fix**: Ensure `whatsapp-receiver` calls `wa_handle_optout()` when STOP keyword fires. Add a visual indicator in the `ContactsPage` for `opt_in_status`.

---

## 2. Backend-Only (No UI)

### GAP-UI-1 — Agent Transfer Queue `P1`
**Status**: Backend complete (`wa_agent_transfers`, `wa_assign_to_team_role()`) — UI missing  
**Detail**: Transfer records with SLA fields exist. No UI to:
- View pending transfers queue
- Accept/decline a transfer
- See SLA breach indicators

**Required UI**: "Transfers" tab in InboxPage sidebar, or badge on conversation thread.

### GAP-UI-2 — Contact Identity Resolution Panel `P1`
**Status**: Backend complete (`resolution_status`, `identity_type`, `linked_entity_id`) — UI missing  
**Detail**: ContactsPage shows contact list but no panel to:
- See `resolution_status` (pending/resolved/unresolvable/ambiguous)
- See `identity_type` classification
- Trigger `wa_promote_to_lead()` with one click
- Manually resolve ambiguous contacts

**Required UI**: Contact detail drawer with "Identity" section.

### GAP-UI-3 — SLA Breach Monitoring `P2`
**Status**: Schema ready (`sla_response_deadline`, `sla_breached_at`) — no cron, no UI  
**Detail**: No automated breach detection. `sla_breached_at` is never set.  
**Fix needed**:
1. Backend: Cron or trigger to check `sla_response_deadline < NOW()` and set `sla_breached_at`
2. UI: Red indicator on breached conversations in inbox

### GAP-UI-4 — Order Management (x_wa_orders) `P2`
**Status**: Backend complete (`wa_create_manual_order()`, `x_wa_orders`, `x_wa_order_items`) — UI missing  
**Detail**: Agents have no UI to create/view orders within a conversation.  
**Required UI**: "Create Order" button in conversation context panel.

### GAP-UI-5 — Drip Enrollment Management per Contact `P1`
**Status**: Backend complete (pause/resume/cancel RPCs) — UI partial  
**Detail**: No UI to:
- View active enrollments for a selected contact
- Pause/resume/cancel an enrollment
- See enrollment history and step progression

**Required UI**: "Sequences" tab in contact detail drawer.

### GAP-UI-6 — wa_contact_metrics Analytics `P2`
**Status**: Backend view exists — UI shows basic stats only  
**Detail**: `wa_contact_metrics` view has `resolution_status` distribution, `identity_type` counts. AnalyticsPage doesn't surface these.

### GAP-UI-7 — Variable Definitions Management `P3`
**Status**: VariablesPage exists but `variable_syntax` is never populated  
**Detail**: UI to define/test custom variable mappings is incomplete. `wa_fetch_variable_value()` hardcodes resolution paths.

---

## 3. UI Features with Incomplete/Missing Backend

### GAP-BE-1 — WaCampaignsPage has No Execution Backend `P1`
**Status**: Backend complete (`wa_manual_campaign_send`) — UI execution trigger missing  
**Detail**: The backend now supports manual campaign execution through the `wa_manual_campaign_send` function, but the UI may still need integration to trigger this effectively from the `WaCampaignsPage`.  
**Fix needed**: Connect the `WaCampaignsPage` "Send" button to the `wa_manual_campaign_send` RPC.

### GAP-BE-2 — Template Variable Mapping Builder `P2`
**Status**: `wa_template_variable_mappings` table exists — no population path  
**Detail**: TemplatesPage allows template management but the variable mapping UI (which field auto-fills which variable) doesn't write to `wa_template_variable_mappings`. The drip processor uses hardcoded fallbacks.

### GAP-BE-3 — Drip Trigger Payload Format Validation `P1`
**Status**: Backend — no validation  
**Detail**: `wa_drip_steps.trigger_payload` must match the format of the message type (button ID for button replies, list item ID for list replies). No constraint or validation exists. A mismatch causes silent non-matching — enrollments get stuck in `wait_for_trigger` indefinitely.  
**Fix**: Add validation in the DripCampaignBuilder UI and a CHECK constraint or function validation on step save.

### GAP-BE-4 — Drip Step Cycle Detection `P2`
**Status**: Backend — no constraint  
**Detail**: `wa_drip_steps.parent_step_id` allows building circular step trees. No `CHECK` or trigger prevents cycles. A cycle would cause infinite execution loops.  
**Fix**: Add a recursive CTE check in `wa_drip_execute_step()` or a trigger on `wa_drip_steps` INSERT/UPDATE.

---

## 4. Missing Features for Production Readiness

### GAP-FEAT-1 — Message Retry / Dead Letter Queue `P1`
**Status**: Backend complete (`wa_message_retry_queue`, `wa_enqueue_retry`) — UI missing  
**Detail**: The backend now successfully supports a retry queue for transient Meta errors, but there is no UI to view the dead letter queue or manually intervene on permanently failed messages.  
**Fix**: Build a Retry Queue / Dead Letter Queue UI page for admins.

### GAP-FEAT-2 — Drip Analytics (Step-Level Funnel) `P1`
**Status**: Backend complete (`wa_drip_step_funnel`, `wa_drip_campaign_performance`) — UI missing  
**Detail**: The backend functions to aggregate sequence performance exist, but the UI does not visualize them yet.
**Fix**: Add the analytics panel in `SequencesPage` calling `wa_drip_step_funnel`.

### GAP-FEAT-3 — Conversation Auto-Assignment Rules `P2`
**Status**: Backend complete (`wa_routing_rules`) — UI missing  
**Detail**: The `wa_routing_rules` table now exists to support automated routing, but there is no Settings UI to configure these rules.  
**Fix**: Add a Routing Rules tab in the UI Settings to manage `wa_routing_rules`.

### GAP-FEAT-4 — Template Test Send `P2`
**Status**: TemplatesPage exists — no test send UI or variable preview  
**Detail**: Agents can't preview a template with live variable substitution before using it in a drip or broadcast.  
**Fix**: "Test Send" button in TemplateEditor → calls `whatsapp-sender` with `p_message_type='template'` to a specified test number with sample variable values.

### GAP-FEAT-5 — Contact Segment Rule Engine `P2`
**Status**: `wa_contact_segments` has `assignment_type = 'rule'` — no rule evaluator  
**Detail**: Contacts can only be manually or import-assigned to segments. No rule-based auto-segmentation exists (e.g., "all contacts with tag 'vip' + resolution_status='resolved' → VIP segment").

### GAP-FEAT-6 — Inbound Media Handling (Download + Storage) `P2`
**Status**: Media messages are logged with `details.media_url = media_id` (Meta ID)  
**Detail**: Media IDs from Meta expire. There's no background job to download and store them before expiry. `get-media-url` edge function exists to fetch the URL on demand but doesn't persist.  
**Fix**: On inbound media message, queue a background job to fetch + upload to Supabase Storage, then update `wa_messages.details.media_url` with the durable URL.

### GAP-FEAT-7 — Whatsapp Status Update Handling `P1`
**Status**: Missing  
**Detail**: Meta sends status webhooks (`delivered`, `read`, `failed`) in `value.statuses[]`. The receiver currently only processes `value.messages[]`. Status updates are silently dropped.  
**Fix**: Add `value.statuses` handler in receiver → call `wa_update_message_status(org_id, wamid, status)`.

```ts
// Add alongside value.messages handling:
if (value.statuses) {
  for (const s of value.statuses) {
    await supabase.schema('wa').rpc('wa_update_message_status', {
      p_organization_id: org.id,
      p_whatsapp_message_id: s.id,
      p_status: s.status  // 'delivered' | 'read' | 'failed'
    });
  }
}
```

### GAP-FEAT-8 — Conversation Snooze Controls `P2`
**Status**: `wa_conversations.snoozed_until` column exists + trigger reopens on inbound  
**Detail**: No UI to snooze a conversation with a datetime picker. The reopen-on-inbound logic exists in `wa_update_conversation_on_message()` but there's no cron to auto-reopen when snooze expires.

---

## 5. Data Consistency Gaps

### GAP-DATA-1 — process-drip-enrollments References Removed Column `P0`
**Status**: Backend — deployed function may reference `source` column on `wa_contacts` that was removed  
**Detail**: The deployed version of `process-drip-enrollments` may have a `wa_contacts.source` column reference that no longer exists post-004417. This would cause the drip processor to error on every execution.  
**Fix**: Check deployed function code. Remove `source` references; use `linked_entity_type` instead.

### GAP-DATA-2 — Template Content Format Inconsistency `P1`
**Status**: Backend  
**Detail**: `whatsapp-sender` stores template messages in `content` as `{name, language, components}` (flat). `wa_standardize_message_content` reads `content->'template'->>'name'` — this returns NULL for sender-originated messages.  
**Impact**: `details.template_name` is NULL for outbound templates. `wa_validate_message_content` then raises "Template messages must have a template_name in details".  
**Fix**: Update `wa_standardize_message_content` to handle both formats:
```sql
WHEN NEW.content ? 'template' AND NEW.content->'template' ? 'name'
  THEN NEW.content->'template'->>'name'
WHEN NEW.content ? 'name'  -- flat format from whatsapp-sender
  THEN NEW.content->>'name'
```

### GAP-DATA-3 — Stale Game Table Data with Double-Escaped JSON `P3`
**Status**: Data  
**Detail**: `wa.game_scores` and `wa.game_sessions` have `transcript` columns with double-escaped JSON strings (e.g., `"[{\"role\":...}]"`). The 004093 data migration produced 356 errors on these rows.  
**Impact**: Low — legacy tables, not used in active flows.  
**Fix**: If game features are needed, add an UPDATE migration to `jsonb_build_object` or cast via `::jsonb` with proper un-escaping.

---

## 6. Summary Table

| Gap ID | Area | Priority | Backend | UI | Notes |
|--------|------|----------|---------|-----|-------|
| GAP-SEC-1 | Webhook signature | P0 | ❌ Missing | — | Security blocker |
| GAP-SEC-2 | Brain URL hardcoded | P1 | ❌ Config | — | Env var needed |
| GAP-SEC-3 | Opt-out tracking | P1 | ✅ Done | ❌ Missing | Meta policy |
| GAP-UI-1 | Transfer queue UI | P1 | ✅ Done | ❌ Missing | |
| GAP-UI-2 | Identity panel | P1 | ✅ Done | ❌ Missing | |
| GAP-UI-3 | SLA monitoring | P2 | ❌ Partial | ❌ Missing | |
| GAP-UI-4 | Order management | P2 | ✅ Done | ❌ Missing | |
| GAP-UI-5 | Enrollment mgmt per contact | P1 | ✅ Done | ❌ Missing | |
| GAP-UI-6 | Contact metrics analytics | P2 | ✅ Done | ❌ Partial | |
| GAP-UI-7 | Variable builder | P3 | ❌ Partial | ❌ Partial | |
| GAP-BE-1 | Manual campaign execution | P1 | ✅ Done | ❌ Partial | |
| GAP-BE-2 | Template variable mapping | P2 | ❌ Partial | ❌ Partial | |
| GAP-BE-3 | Drip trigger payload validation | P1 | ❌ Missing | ❌ Missing | |
| GAP-BE-4 | Drip cycle detection | P2 | ❌ Missing | — | |
| GAP-FEAT-1 | Message retry queue | P1 | ✅ Done | ❌ Missing | |
| GAP-FEAT-2 | Drip funnel analytics | P1 | ✅ Done | ❌ Missing | |
| GAP-FEAT-3 | Auto-assignment rules | P2 | ✅ Done | ❌ Missing | |
| GAP-FEAT-4 | Template test send | P2 | — | ❌ Missing | |
| GAP-FEAT-5 | Segment rule engine | P2 | ❌ Missing | ❌ Missing | |
| GAP-FEAT-6 | Media download/storage | P2 | ❌ Missing | — | |
| GAP-FEAT-7 | Status update handling | P1 | ❌ Missing | — | Currently dropped |
| GAP-FEAT-8 | Conversation snooze | P2 | ❌ Partial | ❌ Missing | |
| GAP-DATA-1 | Drip processor `source` col | P0 | ❌ Broken | — | Check deployed fn |
| GAP-DATA-2 | Template content format | P1 | ❌ Bug | — | Validate trigger fires |
| GAP-DATA-3 | Game table JSON | P3 | ❌ Data | — | Legacy, low impact |

---

## 7. Recommended Fix Order

**Immediate (before next production deploy):**
1. GAP-DATA-1 — Verify `process-drip-enrollments` deployed version has no `source` column ref
2. GAP-DATA-2 — Fix `wa_standardize_message_content` to handle flat template content format
3. GAP-SEC-1 — Add Meta webhook signature verification to `whatsapp-receiver`
4. GAP-FEAT-7 — Add status update handling (`delivered`/`read`/`failed`) in receiver

**Sprint 1 — Core CX:**
5. GAP-SEC-3 — Opt-out tracking (STOP → set opt_in_status=false, block outbound)
6. GAP-UI-2 — Contact identity panel + promote-to-lead button
7. GAP-UI-5 — Enrollment management in contact drawer
8. GAP-FEAT-1 — Message retry queue

**Sprint 2 — Operations:**
9. GAP-UI-1 — Transfer queue UI
10. GAP-BE-1 — Manual campaign execution engine
11. GAP-FEAT-2 — Drip funnel analytics
12. GAP-BE-3 — Drip trigger payload validation

**Sprint 3 — Maturity:**
13. Remaining P2 items (SLA, auto-assignment, snooze, media storage, template test send)

---

## 8. React UI Implementation Checklist

The following is a consolidated list of the frontend (React) specific updates required across all gaps. These represent the missing `zo_waCRM` features needed to surface the completed backend logic.

### High Priority (Sprint 1)
- [ ] **Contact Identity Panel (`GAP-UI-2`)**: Add an "Identity" section in the contact detail drawer (`ContactsPage.tsx`). Must display `resolution_status` and `identity_type`, and include a button to trigger `wa_promote_to_lead()`.
- [ ] **Opt-Out Indicators (`GAP-SEC-3`)**: Add a visual indicator (e.g., a red tag or banner) in `ContactsPage.tsx` and `InboxPage.tsx` for contacts where `opt_in_status` is false.
- [ ] **Enrollment Management per Contact (`GAP-UI-5`)**: Add a "Sequences" tab in the contact detail drawer to view active enrollments, with pause/resume/cancel buttons calling the respective RPCs.
- [ ] **Manual Campaign Execution (`GAP-BE-1`)**: Connect the existing "Send" button in `WaCampaignsPage.tsx` directly to the `wa_manual_campaign_send` RPC to trigger execution.

### Medium Priority (Sprint 2)
- [ ] **Agent Transfer Queue (`GAP-UI-1`)**: Create a "Transfers" tab in the `InboxPage` sidebar or a badge on threads to allow agents to view, accept, or decline pending transfer records from `wa_agent_transfers`.
- [ ] **Drip Funnel Analytics (`GAP-FEAT-2`)**: Add an analytics panel within `SequencesPage.tsx` that calls `wa_drip_step_funnel()` to visualize drop-offs at each step.
- [ ] **Drip Trigger Payload Validation (`GAP-BE-3`)**: Add strict input validation in the `DripCampaignBuilder.tsx` to ensure `trigger_payload` inputs match Meta's expected list/button ID formats.
- [ ] **Message Retry / DLQ Dashboard (`GAP-FEAT-1`)**: Build an Admin Settings page to view the `wa_message_retry_queue` and manually trigger or dismiss permanently failed messages.
- [ ] **Routing Rules Configuration (`GAP-FEAT-3`)**: Create a "Routing Rules" tab in `SettingsPage.tsx` allowing admins to create/edit records in `wa_routing_rules`.

### Low Priority / Nice-to-Have (Sprint 3)
- [ ] **Order Management Context (`GAP-UI-4`)**: Add a "Create Order" button inside the conversation context panel in `InboxPage.tsx` that calls `wa_create_manual_order()`.
- [ ] **SLA Breach Monitoring (`GAP-UI-3`)**: Add a visual red indicator/timer on breached conversations in the inbox list.
- [ ] **Contact Metrics Analytics (`GAP-UI-6`)**: Update `AnalyticsPage.tsx` to surface `resolution_status` distributions and `identity_type` aggregations from the `wa_contact_metrics` view.
- [ ] **Template Variable Mapping Builder (`GAP-BE-2` & `GAP-UI-7`)**: Enhance `TemplatesPage.tsx` and `VariablesPage.tsx` to allow admins to map specific CRM fields to template variables, writing to `wa_template_variable_mappings`.
- [ ] **Template Test Send (`GAP-FEAT-4`)**: Add a "Test Send" button in `TemplateEditor.tsx` that triggers `whatsapp-sender` with dummy CRM data to preview live variables.
- [ ] **Conversation Snooze Controls (`GAP-FEAT-8`)**: Add a "Snooze" button with a datetime picker in `InboxPage.tsx` to update the `snoozed_until` column on `wa_conversations`.
