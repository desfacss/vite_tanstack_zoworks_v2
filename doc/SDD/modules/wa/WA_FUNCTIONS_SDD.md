# WhatsApp (WA) Module — Functions SDD

> **SDD Version**: 1.0 — 2026-06-02  
> **Total Functions**: 63  
> **Schema**: `wa`

This document serves as the canonical reference for all PostgreSQL functions and triggers within the WhatsApp (`wa`) module. Functions are categorized by their primary caller context to clarify the security and architectural boundary.

---

## 1. Public API (UI Consumers)

These functions are designed to be called directly from the React Frontend (`zo_waCRM`) using the Supabase Client. They rely heavily on Row Level Security (RLS) or internal validation against the `identity.get_current_org_id()` context to ensure tenant isolation.

| Function | UI Location | Purpose | Signature |
|----------|-------------|---------|-----------|
| `wa_close_conversation` | `useConversationActions.ts` | Marks a conversation as closed and unassigns the agent. | `(p_conversation_id uuid) RETURNS void` |
| `wa_assign_to_team_role` | `useConversationActions.ts` | Creates a `wa_agent_transfers` record to escalate or route a conversation to a specific user, team, or role. | `(p_conversation_id uuid, p_to_user_id uuid, p_to_team_id uuid, p_to_role_id uuid, p_notes text) RETURNS void` |
| `wa_update_contact_tags` | `useContactDetails.ts` | Appends or removes tags from a specific WhatsApp contact. | `(p_contact_id uuid, p_tags_to_add text[], p_tags_to_remove text[]) RETURNS text[]` |
| `wa_clear_conversation_messages` | `InboxPage.tsx` | Hard-deletes messages from a conversation thread (usually for privacy/GDPR reasons). | `(p_conversation_id uuid) RETURNS void` |
| `wa_drip_enroll_contact` | `useDripCampaigns.ts` | Manually enrolls a contact into a drip campaign. Cancels any existing active enrollment for that campaign first. | `(p_campaign_id uuid, p_contact_id uuid, p_variables jsonb) RETURNS uuid` |
| `wa_drip_pause_enrollment` | `useDripCampaigns.ts` | Suspends an active drip enrollment. | `(p_enrollment_id uuid) RETURNS void` |
| `wa_drip_resume_enrollment` | `useDripCampaigns.ts` | Resumes a paused enrollment. | `(p_enrollment_id uuid) RETURNS void` |
| `wa_drip_cancel_enrollment` | `useDripCampaigns.ts` | Terminates an enrollment permanently. | `(p_enrollment_id uuid) RETURNS void` |
| `wa_drip_campaign_stats` | `useDripCampaigns.ts` | Aggregates enrollment counts (active, completed, paused) for a specific campaign. | `(p_campaign_id uuid) RETURNS TABLE` |
| `wa_create_manual_order` | `useOrders.ts` | Staging function to draft an e-commerce order from a conversation. | `(p_org_id uuid, p_conversation_id uuid, p_order_details jsonb) RETURNS uuid` |
| `wa_get_contact_orders` | `useContactDetails.ts` | Retrieves order history for a WA contact. | `(p_contact_id uuid) RETURNS TABLE` |
| `wa_get_catalog_for_org` | `ProductManagerPage.tsx` | Retrieves Meta catalog configurations for the org. | `(p_org_id uuid) RETURNS TABLE` |
| `wa_search_contacts` | Global Search | Full-text search across contacts by name, phone, or tags. | `(p_query text, p_limit int) RETURNS TABLE` |
| `wa_preview_variables` | Template Builder | Tests variable resolution `{{contact.name}}` against a dummy contact before sending. | `(p_template_content jsonb, p_contact_id uuid) RETURNS jsonb` |
| `wa_manual_campaign_send` | Broadcast UI | Initiates a manual broadcast campaign. | `(p_campaign_id uuid) RETURNS void` |
| `wa_manual_campaign_increment_sent` | Broadcast UI | Callback to track broadcast success. | `(p_campaign_id uuid) RETURNS void` |
| `wa_manual_campaign_increment_failed`| Broadcast UI | Callback to track broadcast failure. | `(p_campaign_id uuid) RETURNS void` |

---

## 2. Edge API (System Consumers)

These functions are invoked by Supabase Edge Functions (`whatsapp-receiver`, `whatsapp-sender`, `process-drip-enrollments`). They run with the **Service Role Key**, meaning they bypass RLS. Therefore, they all require an explicit `p_organization_id` parameter to maintain data integrity.

| Function | Edge Caller | Purpose | Signature |
|----------|-------------|---------|-----------|
| `wa_get_organization_by_phone_number_id` | `whatsapp-receiver` | Resolves the Tenant Org ID based on the Meta Webhook's `phone_number_id` routing value. | `(p_phone_number_id text) RETURNS TABLE` |
| `wa_create_contact` | `whatsapp-receiver`, `sender` | Upserts a WA contact based on their WhatsApp ID (phone number). Creates the channel endpoint. | `(p_org_id uuid, p_wa_id text, p_name text) RETURNS uuid` |
| `wa_log_message` | `whatsapp-receiver`, `sender` | Persists the raw Meta message payload. Triggers standardization and conversation updates. | `(p_org_id uuid, p_contact_id uuid, p_msg_id text, p_direction text, p_type text, p_content jsonb, p_status text, p_timestamp timestamptz) RETURNS void` |
| `wa_update_message_status` | `whatsapp-receiver` | Updates message delivery receipts (sent, delivered, read, failed). | `(p_org_id uuid, p_msg_id text, p_status text) RETURNS void` |
| `wa_get_or_create_conversation` | `whatsapp-receiver` | Finds the active thread or opens a new one for an incoming message. | `(p_org_id uuid, p_contact_id uuid) RETURNS uuid` |
| `wa_assign_agent` | `whatsapp-receiver` | Direct assignment of a conversation to a specific agent UUID. | `(p_conversation_id uuid, p_agent_id uuid) RETURNS void` |
| `wa_resolve_variables` | `whatsapp-sender` | Compiles a template payload by injecting CRM data into `{{var}}` placeholders. | `(p_template_content jsonb, p_contact_id uuid) RETURNS jsonb` |
| `wa_drip_get_due_enrollments` | `process-drip-enrollments` | Cron job fetcher. Returns active enrollments whose `next_execution_at` has passed. | `(p_limit int) RETURNS TABLE` |
| `wa_drip_execute_step` | `process-drip-enrollments` | Advances an enrollment to the next sibling step, wait state, or completed state based on tree logic. | `(p_enrollment_id uuid) RETURNS text` |
| `wa_claim_retry_batch` | System Queue | Claims a batch of failed messages for retry sending. | `(p_limit int) RETURNS TABLE` |
| `wa_enqueue_retry` | `whatsapp-sender` | Queues a failed Meta API call for exponential backoff retry. | `(p_msg_id uuid, p_error jsonb) RETURNS void` |
| `wa_complete_retry` | System Queue | Marks a retry as successful or permanently failed. | `(p_retry_id uuid, p_status text) RETURNS void` |

---

## 3. Automation & Drip Engine (Internal)

These functions are internal helpers that power the complex tree-traversal logic of the automated Drip Campaigns.

| Function | Purpose |
|----------|---------|
| `wa_drip_get_first_step` | Returns the root node (`parent_step_id IS NULL` ordered by `sequence_order ASC LIMIT 1`) for a campaign. |
| `wa_drip_get_next_step` | Finds the next sibling node in the sequence after the current step. |
| `wa_drip_step_funnel` | Analytics helper. Returns drop-off rates between sequential steps in a campaign. |
| `wa_drip_campaign_performance` | Analytics helper. Returns ROI/Conversion metrics for a campaign based on tags or orders. |
| `wa_fetch_variable_value` | Core logic for `wa_resolve_variables`. Handles syntax parsing (e.g. `{{contact.name}}`). |
| `wa_resolve_json_vars` | Recursive JSON traverser used to find and replace variables nested deep inside template button payloads. |
| `wa_get_context_value` | Helper to extract deep JSON paths securely. |
| `wa_get_contact_context` | Builds the mega-JSON object containing the contact's CRM profile, used for variable injection. |

---

## 4. Identity & Core Integration (Internal)

These functions bridge the gap between the isolated `wa` channel schema and the global `unified` / `crm` schemas.

| Function | Purpose |
|----------|---------|
| `wa_resolve_identity` | Attempts to find a matching phone number in `identity.users` or `unified.contacts`. Returns the `identity_type` classification. |
| `util_resolve_contact` | Wrapper around `wa_resolve_identity`. |
| `wa_promote_to_lead` | Escalates an unknown WA contact into a permanent `crm.contacts` record. |
| `wa_promote_contact` | Legacy alias for `wa_promote_to_lead`. |
| `wa_link_contact` | Hard-links a WA contact to an existing CRM entity UUID. |
| `wa_auto_route_conversation` | Runs rule-based routing to assign new conversations to teams based on keyword or org defaults. |
| `wa_get_available_agents` | Returns online agents within a team for round-robin assignment. |
| `normalize_phone` | Utility to strip `+`, spaces, and formatting to ensure clean E.164 comparisons. |

---

## 5. PostgreSQL Trigger Pipeline

The WhatsApp pipeline relies heavily on deterministic BEFORE/AFTER triggers to automate side-effects without application-level transaction handling.

| Trigger Name | Function | Purpose |
|--------------|----------|---------|
| `trg_wa_contacts_auto_link` | `trg_auto_link_new_contact()` | BEFORE INSERT: Automatically calls `wa_resolve_identity()` to link new channel endpoints to existing CRM data immediately. |
| `wa_drip_on_new_contact` | `wa_drip_trigger_new_contact()` | AFTER INSERT: Evaluates new contacts against all active `new_lead` drip campaigns. |
| `wa_drip_on_tag_added` | `wa_drip_trigger_tag_added()` | AFTER UPDATE OF tags: Evaluates updated tags against `tag_added` campaigns. |
| `trg_wa_msg_10_standardize` | `wa_standardize_message_content()` | BEFORE INSERT: Parses Meta's complex raw JSONB `content` and extracts standard fields into the `details` column. |
| `trg_wa_msg_20_update_conv` | `wa_update_conversation_on_message()` | BEFORE INSERT: Updates `last_message_at`, bumps snippet summary, and reopens snoozed conversations. |
| `trg_wa_msg_30_validate` | `wa_validate_message_content()` | BEFORE INSERT: Enforces strict data contracts based on message `type` (e.g. templates must have names). |
| `trg_wa_drip_check_cycle` | `trg_wa_drip_steps_check_cycle()` | BEFORE INSERT/UPDATE: Prevents infinite loops in the drip step tree (circular `parent_step_id` chains). |

---

## 6. Admin & Utility

| Function | Purpose |
|----------|---------|
| `wa_utils_testonly_dev_switch_active_org` | **DEV ONLY**: Allows the UI to forcefully inject an override `organization_id` into the JWT context during local development testing. Allows jumping between tenants without re-authenticating. |
| `wa_provision_tenant` | Inserts the WABA config into `identity.organizations.app_settings` and seeds base fallback rules. |
| `wa_check_sla_breaches` | Cron-driven helper to find `wa_agent_transfers` where `sla_breached_at` is null but the deadline has passed. |

---
*End of Document*
