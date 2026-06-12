# Cal Module — Gap Analysis (Current vs Ideal)

> **Companion to**: [`MODULE_SPEC.md`](MODULE_SPEC.md) · [`USE_CASES.md`](USE_CASES.md) · [`ARCHITECTURE.md`](ARCHITECTURE.md)
> **Date**: 2026-06-11
> **Method**: Compares the live `20260611000400_cal_lean.sql` schema against the ideal spec.
> **Legend**: ✅ exists · 🟡 partial · ❌ missing · ♻️ exists but needs change

---

## 1. What already exists (strong foundation)

| Capability | Where | Status |
|---|---|---|
| 9 cal schema tables (use_case_configs, territories, event_types, event_type_resources, resource_availability_rules, calendar_integrations, blocked_windows, client_credits, resource_territories) | `20260611000400` | ✅ |
| 3 booking columns on unified.contacts (booking_enabled, max_concurrent_bookings, booking_timezone) | `20260611000400` | ✅ |
| 3 booking columns on unified.assets (same) | `20260611000400` | ✅ |
| Polymorphic resource reference pattern on all cal tables | `20260611000400` | ✅ |
| 6 SECURITY DEFINER booking RPCs (resolve_resource, get_available_slots, find_next_available, book_appointment, cancel_booking, reschedule_booking) | `20260611000400` | ✅ |
| 3 views (v_bookable_resources UNION, v_bookings from unified.tasks, v_blocked_windows) | `20260611000400` | ✅ |
| Booking is a unified.tasks row (intent_type='calendar_booking') — no bonded table | `20260611000400` | ✅ |
| Multi-resource booking via unified.task_assignments | `20260611000100` + `20260611000400` | ✅ |
| Date-block unavailability via unified.resource_unavailability | `20260611000100` | ✅ |
| Named schedule template via unified.resource_calendars | `20260611000100` | ✅ |
| Skill-based routing via unified.contacts.skills[] + event_types.required_skill_name | `20260611000400` | ✅ |
| Territory-based routing via cal.resource_territories + cal.territories | `20260611000400` | ✅ |
| Credit deduction at booking (cal.client_credits) | `20260611000400` | ✅ |
| External sync table (cal.blocked_windows) with upsert-safe UNIQUE constraint | `20260611000400` | ✅ |
| RLS policies on all 9 cal tables | `20260611000400` | ✅ |
| Source-of-truth migration guide (calendar → cal) | `.agent/brain/06-11-26/calendar-to-cal-migration-guide.md` | ✅ |
| Legacy `calendar` schema preserved for frontend coexistence | v7 POC (no change) | ✅ |

> **Verdict**: the booking engine core is complete. All schema objects, functions, views, and RLS are in place. What is missing is everything ABOVE the DB layer: the edge function for OAuth sync, ZWS blueprints for post-booking lifecycle, the frontend UI, and the final `calendar` schema drop.

---

## 2. Gap register

| # | Gap | Current state | Required | Sev | Phase |
|---|---|---|---|---|---|
| G1 | **External calendar sync edge function** | `cal.blocked_windows` table exists but no sync worker writes to it | `cal-sync` edge function: OAuth token refresh, Google/MS/Apple API calls, blocked_windows upsert | High | P1 |
| G2 | **OAuth calendar integration UI** | DB table exists; no UI or OAuth flow | OAuth consent screen → exchange code → store encrypted tokens in `cal.calendar_integrations` | High | P1 |
| G3 | **ZWS blueprint: booking confirmation** | Booking created; no downstream lifecycle | Blueprint on `state_category=NEW + intent_type=calendar_booking` → send confirmation email/WA | High | P2 |
| G4 | **ZWS blueprint: reminder** | No scheduler | `wf_scheduled_job` at `scheduled_start - 24h` → send reminder | High | P2 |
| G5 | **ZWS blueprint: no-show handling** | No trigger | Blueprint: if `state_category != CLOSED_WON` at `scheduled_end + 1h` → mark no-show, flag for follow-up | Med | P2 |
| G6 | **ZWS blueprint: post-booking follow-up** | No trigger | Blueprint: at `scheduled_end + 1 day` → send satisfaction survey / next-appointment nudge | Low | P2 |
| G7 | **ZWS blueprint: cancellation notification** | No trigger | Blueprint on `state_category=CLOSED_LOST` → notify resource owner | Med | P2 |
| G8 | **Public booking page (Next.js)** | No frontend | React page consuming `cal.v_bookable_resources`, `cal.event_types`, `cal.get_available_slots()`, `cal.book_appointment()` via anon role | High | P3 |
| G9 | **Dispatcher calendar UI** | No frontend | Internal calendar/grid view: `cal.v_bookings`, `cal.v_blocked_windows`, drag-to-reschedule | High | P3 |
| G10 | **Drop `calendar` schema** | Legacy `calendar` POC schema still present | After P3 frontend migrated and tested: `DROP SCHEMA calendar CASCADE` in a new migration | Med | P4 |
| G11 | **Invitee → unified.contacts upsert** | `book_appointment()` stores email in `details` only | On booking creation: upsert `unified.contacts` by email → invitee becomes a CRM contact (lead) | Med | P3 |
| G12 | **Token encryption** | `access_token_enc`/`refresh_token_enc` columns exist; no Vault integration shown | Supabase Vault secret storage for OAuth tokens | High | P1 |
| G13 | **Group booking / waitlist** | `max_bookings_per_slot` column on event_types exists but booking function doesn't expose it | Update `book_appointment()` to check `count(bookings) < max_bookings_per_slot`; add waitlist `state_category = 'ON_HOLD'` pattern | Med | P6 |
| G14 | **Composite slot for multi-resource** | `find_next_available()` finds per-resource slots; does not validate that all required resources (contact + room) are free simultaneously | Update `find_next_available()` to intersect slot sets for all `is_required=true` resources in `event_type_resources` | Med | P5 |
| G15 | **Public booking page: event type selector** | No frontend | URL pattern `/<org-slug>/<event-type-slug>` should render a bookable calendar; discovery page `/book/<org-slug>` lists all `is_public=true` event types | Med | P3 |
| G16 | **Anon invitee: rescheduling UI** | `cal.reschedule_booking()` exists; no public-facing UI | Self-service reschedule link in confirmation email → booking management page (uses `app.booking_code` pattern) | Low | P3 |
| G17 | **Post_deploy seed for cal.use_case_configs** | No global seed row yet | Add global `appointment_booking` row to `supabase/seeds/` (Group-2 global config, Additive) | Med | P0 |
| G18 | **identity.modules row for `calendar`** | Not verified | Ensure `identity.modules WHERE slug='calendar'` exists so `org_module_configs` can reference it | Med | P0 |
| G19 | **Booking display_id** | `unified.tasks` gets a `display_id` from Composer; cal-specific prefix (`CAL-`) needs to be configured in `core.display_id_states` | Add `core.display_id_states` row: `entity_type='calendar_booking'`, prefix='CAL', sequence start | Low | P0 |
| G20 | **Analytics / reporting** | No views beyond v_bookings | Materialised views: `v_booking_volume_by_resource`, `v_cancellation_rate`, `v_utilisation_by_day`, `v_avg_lead_time` | Low | P5 |

---

## 3. Gaps already closed by unified layer (not gaps)

These were in the v7 POC as separate tables/patterns; they are correctly delegated to `unified.*`:

| Old pattern | Resolution | Status |
|---|---|---|
| `calendar.bookings` bonded table | `unified.tasks WHERE intent_type='calendar_booking'` | ✅ Closed |
| `calendar.booking_resources` | `unified.task_assignments` | ✅ Closed |
| `calendar.synced_events` bonded table | `cal.blocked_windows` (plain table, no bond) | ✅ Closed |
| `calendar.resources` standalone table | `cal.v_bookable_resources` (view over unified) | ✅ Closed |
| `calendar.skills` + `calendar.resource_skills` | `unified.contacts.skills text[]` | ✅ Closed |
| `calendar.resource_date_overrides` | `unified.resource_unavailability` | ✅ Closed |
| INSTEAD OF triggers on views | SECURITY DEFINER RPCs | ✅ Closed |
| Comments on bookings | `core.object_comments` (via unified_objects anchor) | ✅ Closed (platform layer) |
| Activity feed / audit | `core.object_activities` | ✅ Closed (platform layer) |

---

## 4. Immediate P0 actions (before any other work)

These are low-effort, high-value items that should be done before P1:

### P0-1: Seed `cal.use_case_configs` global row
Add to `supabase/seeds/` (Group-2 global config, Additive):
```sql
INSERT INTO cal.use_case_configs (id, organization_id, use_case, config, is_active)
VALUES (
  gen_random_uuid(), NULL, 'appointment_booking',
  '{"default_slot_duration_minutes":30,"default_min_advance_hours":1,
    "default_max_advance_days":60,"auto_confirm_default":true,
    "allow_anon_booking":true,"cancellation_window_hours":24}',
  true
) ON CONFLICT (organization_id, use_case) DO NOTHING;
```

### P0-2: Ensure `identity.modules` row exists for `calendar`
```sql
INSERT INTO identity.modules (name, slug, description, is_active)
VALUES ('Calendar & Booking', 'calendar', 'Bookable resource scheduling', true)
ON CONFLICT (slug) DO NOTHING;
```

### P0-3: Configure booking display_id prefix
```sql
INSERT INTO core.display_id_states (entity_type, prefix, next_val, padding)
VALUES ('calendar_booking', 'CAL', 1, 5)
ON CONFLICT (entity_type) DO NOTHING;
```

---

## 5. Recommended P1 build order

1. `cal-sync` edge function skeleton (Google Calendar only first)
2. OAuth flow: `cal.calendar_integrations` INSERT + token encryption via Vault
3. Cron job (via `supabase/post_deploy/04b_setup_cron.sql`) for hourly sync
4. Manual "Sync now" trigger for dev testing
5. Verify `cal.blocked_windows` populates and `get_available_slots()` marks those slots unavailable

---

## 6. Migration path for existing `calendar` schema tenants (v7 → v6 cal)

For tenants who used the v7 `calendar` POC:

| Data category | Migration action |
|---|---|
| `calendar.resources` | `UPDATE unified.contacts SET booking_enabled=true WHERE id IN (SELECT contact_id FROM calendar.resources)` |
| `calendar.resource_availability_rules` | `INSERT INTO cal.resource_availability_rules SELECT ..., 'contact' FROM calendar.resource_availability_rules` |
| `calendar.event_types` | `INSERT INTO cal.event_types SELECT ..., owner_contact_id=user_id::contacts_id FROM calendar.event_types` |
| `calendar.event_type_resources` | `INSERT INTO cal.event_type_resources SELECT ..., 'contact' FROM ...` |
| `calendar.territories` | Direct copy |
| `calendar.bookings` (historical) | These are already in `unified.tasks` (bonded pattern) — no migration needed |
| `calendar.synced_events` (historical) | `INSERT INTO cal.blocked_windows SELECT id, resource_id, 'contact', start from tasks join synced_events ...` |
| `calendar.calendar_integrations` | `INSERT INTO cal.calendar_integrations (..., contact_id, ...) SELECT ..., r.contact_id, ... FROM calendar.calendar_integrations JOIN calendar.resources r ON resource_id = r.id` |

Run this as a post-deploy migration script once all tenants are confirmed switched to `cal` schema frontend.
