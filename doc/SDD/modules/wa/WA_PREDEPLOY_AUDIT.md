# WA Module — Pre-Deploy Readiness Audit

**Audit date:** 2026-05-28 (updated after v6.1 migration reorder)  
**Scope:** All WA-module migrations (004415–004426, 009250), edge functions (`whatsapp-receiver`, `whatsapp-sender`, `process-wa-retry`, `process-manual-campaigns`), and seed/post-deploy files.  
**Result:** ✅ All 5 blockers and 2 code-level warnings fixed (2026-05-28). Remaining 4 warnings are operational (cron schedules, GDPR cleanup, GCR_URL env var) — safe to run `db reset` locally.

---

## Migration Order — Current State ✅

The v6 → v6.1 reorder is complete. Verified execution sequence:

```
202606010033_wa_tables.sql                    ← WA table definitions
20260601004415_wa_functions.sql               ← core WA functions
20260601004416_wa_triggers.sql
20260601004418_wa_automation_rules_jsonb.sql
20260601004419_wa_provision_tenant.sql
20260601004420_wa_automation_rules_ensure.sql
20260601004421_wa_fix_template_standardize.sql
20260601004422_wa_commerce_integration.sql    ← wa_promote_contact, orders, catalog
20260601004423_wa_identity_integration.sql    ← routing rules, wa_assign_to_team_role
20260601004424_wa_optout_and_retry.sql        ← opt-out lifecycle, retry queue
20260601004425_wa_campaigns_safety.sql        ← campaign safety rails
20260601004426_wa_cross_schema_vars.sql       ← cross-schema variable resolution
20260601004500_triggers.sql
20260601004700_indexes.sql
202606010064_rls_wa.sql                       ← RLS for original WA tables only
  ... (0065–0069 other schema RLS)
20260601009250_wa_schema_alignment.sql        ← view rebuilds, deferred correctly
202606010094_crm_contacts_display_id_constraint.sql
202606010095_project_domain_dedup.sql
202606010096_esm_domain_dedup.sql
202606010097_crm_domain_dedup.sql             ← drops crm.contacts.is_active
202606010099_fix_get_current_org_id.sql
```

**Key dependency confirmed safe:** `wa_promote_contact()` (004422) does NOT include `is_active` in its `crm.contacts` INSERT. Migration 0097 (which drops that column) runs later — no conflict.

---

## RESOLVED items from initial audit

| Item | Status | Notes |
|---|---|---|
| B1 — `009250` sort-order collision | ✅ **RESOLVED** | `20260601009250_wa_schema_alignment.sql` correctly deferred past 004426, before 0094 |
| W2 — `unified.contacts.first_name/last_name` existence | ✅ **RESOLVED** | Confirmed in `202606010022_unified_tables.sql` lines 230–231 |
| W1 — `catalog.offerings.meta` reference | ✅ **RESOLVED** | `wa_get_catalog_for_org()` does not reference `.meta` — selects only `id, name, description, type, currency, price, is_physical, is_digital` |

---

## BLOCKERS (must fix before deploy)

### B1 — `wa_provision_tenant()` inserts duplicate STOP/START/HELP automation rules
- **File:** `supabase/migrations/20260601004419_wa_provision_tenant.sql`
- **Problem:** Three `INSERT INTO wa.wa_automation_rules ... ON CONFLICT DO NOTHING` statements but there is **no unique constraint** on `(organization_id, name)`. `ON CONFLICT DO NOTHING` without a conflict target is a no-op constraint — Postgres accepts the syntax but it never actually triggers deduplication. Re-running provision inserts duplicate STOP/START/HELP rules; the receiver then fires all matching rows and creates duplicate opt-out records.
- **Fix:** Add a unique constraint to `wa_automation_rules`, then use it as the conflict target:
  ```sql
  -- In 004420 or a new migration:
  ALTER TABLE wa.wa_automation_rules
    ADD CONSTRAINT uq_wa_automation_rules_org_name UNIQUE (organization_id, name);
  ```
  Then in `wa_provision_tenant()`:
  ```sql
  ON CONFLICT (organization_id, name) DO NOTHING;
  ```

---

### B2 — `wa_promote_contact()` sets `linked_entity_type = 'crm.contact'`
- **File:** `supabase/migrations/20260601004422_wa_commerce_integration.sql`, line 133
- **Problem:** Platform convention and `wa_get_contact_context()` (004426) reads `linked_entity_id` only when `linked_entity_type = 'unified.contacts'` (implied by the JOIN pattern). The wrong value `'crm.contact'` causes all cross-schema variable resolution (contact.email, contact.name enrichment, crm.score, order.number) to silently return empty for every promoted contact.
- **Fix:**
  ```sql
  linked_entity_type = 'unified.contacts',
  ```

---

### B3 — `wa_auto_route_conversation()` never called from `whatsapp-receiver`
- **File:** `supabase/functions/whatsapp-receiver/index.ts`
- **Problem:** `wa_routing_rules` and `wa_auto_route_conversation()` were created in 004423, but `whatsapp-receiver` has no call to this function after upserting/opening a conversation. Routing rules are completely inert.
- **Fix:** After the conversation upsert block, add (non-blocking):
  ```typescript
  supabase.schema('wa').rpc('wa_auto_route_conversation', {
    p_conversation_id: conversationId
  }).then(({ error }) => {
    if (error) console.warn('[Routing] wa_auto_route_conversation error:', error.message);
  });
  ```

---

### B4 — `whatsapp-sender` uses `accessTokenEncrypted`; `wa_provision_tenant` writes `accessToken`
- **Files:** `supabase/functions/whatsapp-sender/index.ts` line 3187; `20260601004419_wa_provision_tenant.sql`
- **Problem:** Active (uncommented) code in `whatsapp-sender` reads `whatsappConfig?.accessTokenEncrypted`. But `wa_provision_tenant()` stores the token as `accessToken` in `identity.organizations.app_settings`. Result: every send from a newly provisioned org gets `undefined` as the Bearer token → 401 from Meta.
- **Fix:** Standardise on one key. Recommended: `accessToken` (plain, since it's already in a privileged JSONB column behind SECURITY DEFINER). Update `whatsapp-sender` line 3187:
  ```typescript
  const authToken = whatsappConfig?.accessToken ?? whatsappConfig?.accessTokenEncrypted;
  ```
  Same fix needed in `process-wa-retry` `getOrgCredentials()`.

---

### B5 — RLS missing on three new tables created after `064_rls_wa.sql`
- **Tables:** `wa.wa_routing_rules` (004423), `wa.wa_message_retry_queue` (004424), `wa.wa_manual_campaign_recipients` (004425)
- **Problem:** `064_rls_wa.sql` runs before these tables exist — they are created without RLS. Any authenticated user can read/write across all orgs. This is a multi-tenancy data leak.
- **Fix:** Add a new migration (e.g. `20260601004427_wa_new_tables_rls.sql`):
  ```sql
  ALTER TABLE wa.wa_routing_rules              ENABLE ROW LEVEL SECURITY;
  ALTER TABLE wa.wa_message_retry_queue        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE wa.wa_manual_campaign_recipients ENABLE ROW LEVEL SECURITY;

  -- Mirror the pattern from 064_rls_wa.sql for existing wa tables:
  CREATE POLICY "org_isolation" ON wa.wa_routing_rules
    USING (organization_id IN (
      SELECT organization_id FROM identity.organization_users
      WHERE user_id = auth.uid() AND is_active = true
    ));
  -- (repeat for the other two tables)
  ```

---

## WARNINGS (fix before production traffic)

### W1 — No cron schedule for `process-wa-retry` and `process-manual-campaigns`
- **Problem:** Both functions are deployed but never invoked. Failed messages sit in `wa_message_retry_queue` forever; queued campaigns never send.
- **Action:** Wire via Supabase Dashboard → Edge Functions → Schedules, or add `pg_cron`:
  ```sql
  SELECT cron.schedule('wa-retry',     '*/5 * * * *', $$SELECT net.http_post(...)$$);
  SELECT cron.schedule('wa-campaigns', '*/2 * * * *', $$SELECT net.http_post(...)$$);
  ```

---

### W2 — `process-manual-campaigns` reads `tpl.language_code` but `wa_templates` column is `language`
- **File:** `supabase/functions/process-manual-campaigns/index.ts` lines 55 and 111
- **Problem:** Query selects `language_code` (doesn't exist → returns `undefined`). The Meta API call then sends `language: { code: undefined }` → Meta rejects the template send with error 132000.
- **Fix:**
  ```typescript
  // Line 55:
  .select('name, language')   // was: 'name, language_code'
  // Line 111:
  language: { code: tpl.language ?? 'en' },   // was: tpl.language_code
  ```

---

### W3 — `wa_handle_optout()` does not cancel active drip enrollments
- **File:** `supabase/migrations/20260601004424_wa_optout_and_retry.sql`
- **Problem:** Opting out sets `opt_in_status = false` on the contact, but does not cancel active `wa_drip_enrollments`. The drip processor continues to attempt sends, skips them one-by-one (wasted work), and logs them as skipped — inflating campaign failure analytics.
- **Fix:** Add inside `wa_handle_optout()`:
  ```sql
  UPDATE wa.wa_drip_enrollments
  SET status = 'cancelled', updated_at = NOW()
  WHERE contact_id = p_contact_id
    AND organization_id = p_organization_id
    AND status IN ('active', 'paused');
  ```

---

### W4 — `opt_in_status` NOT NULL not enforced
- **File:** `supabase/migrations/20260601004424_wa_optout_and_retry.sql`
- **Problem:** Back-fill done, DEFAULT set to `true`, but no `NOT NULL` constraint. Direct SQL inserts can bypass the default and set NULL, breaking the boolean checks in `wa_handle_optout`.
- **Fix:**
  ```sql
  ALTER TABLE wa.wa_contacts ALTER COLUMN opt_in_status SET NOT NULL;
  ```

---

### W5 — `wa-delete` GDPR function only deletes `wa_contacts`
- **Problem:** Full GDPR erasure requires cascading to `wa_messages`, `wa_conversations`, `wa_drip_enrollments`, `wa_manual_campaign_recipients`, and `wa_message_retry_queue`. Currently only `wa_contacts` is removed.
- **Action:** Extend the GDPR delete path to cover all WA-owned tables for the contact.

---

### W6 — `GCR_URL` hardcoded in `whatsapp-receiver`
- **File:** `supabase/functions/whatsapp-receiver/index.ts`
- **Problem:** Brain webhook URL hardcoded — breaks on staging vs prod environments.
- **Fix:**
  ```typescript
  const BRAIN_WEBHOOK_URL = Deno.env.get('BRAIN_WEBHOOK_URL') ?? '';
  ```

---

## Deploy checklist

```
[ ] B1 — Add UNIQUE(organization_id, name) to wa_automation_rules + fix ON CONFLICT target
[ ] B2 — Fix linked_entity_type = 'unified.contacts' in wa_promote_contact() (004422 line 133)
[ ] B3 — Call wa_auto_route_conversation() from whatsapp-receiver after conversation upsert
[ ] B4 — Fix accessToken key mismatch in whatsapp-sender (line 3187) + process-wa-retry
[ ] B5 — Add RLS migration for wa_routing_rules, wa_message_retry_queue, wa_manual_campaign_recipients
[ ] W1 — Wire cron schedules for process-wa-retry + process-manual-campaigns
[ ] W2 — Fix tpl.language_code → tpl.language in process-manual-campaigns (lines 55 + 111)
[ ] W3 — Cancel drip enrollments inside wa_handle_optout()
[ ] W4 — ALTER wa_contacts.opt_in_status SET NOT NULL
[ ] W5 — Extend GDPR delete to all WA tables
[ ] W6 — Replace hardcoded GCR_URL with BRAIN_WEBHOOK_URL env var
```

---

## Architecture notes

| Decision | Rationale |
|---|---|
| Shared UUID: `wa_contacts.id = unified.contacts.id = crm.contacts.id` after promotion | Same pattern as `identity.organization_users`; eliminates join table; junk WA contacts never pollute unified |
| `wa_promote_contact()` as explicit promotion gate | WA contacts stay ephemeral until business intent confirmed; matches the "contact resolution" lifecycle |
| Credentials never in retry queue | `process-wa-retry` fetches from `identity.organizations.app_settings` at runtime — token rotation is free |
| Soft refs in `wa_routing_rules` (no FK to identity) | Keeps wa schema deployable/testable without identity schema present; validated at runtime via EXISTS |
| `commerce.orders.channel` only new column on commerce | All WA context stored via `external_identifiers JSONB`; no WA-specific FK pollution on commerce schema |
| `009250_wa_schema_alignment` deferred past 004426 | View rebuilds (v_wa_contacts, wa_contact_metrics) need all new columns from 004422–004426 to exist first |
| `202606010093_wa_data_migration.sql.bak` deactivated | Heavy data seeding isolated from CI/CD `db reset` pipeline; run manually post-deploy if needed |
