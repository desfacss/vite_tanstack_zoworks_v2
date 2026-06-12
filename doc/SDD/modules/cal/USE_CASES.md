# Cal Module — Use-Case Catalog & Test Specifications

> **Companion to**: [`MODULE_SPEC.md`](MODULE_SPEC.md) · [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`GAP_ANALYSIS.md`](GAP_ANALYSIS.md)
> **Date**: 2026-06-11 · **State**: ✅ Matches `20260611000400_cal_lean.sql`
> **Purpose**: The complete, testable inventory of what the cal module must do. Each UC is also a test specification — preconditions, steps, expected outcomes.
> **Convention**: `UC-CAL-<area>-<n>`. BR = business rule. Test IDs: `TEST-CAL-<area>-<n>`.

---

## Actors / Personas

| Persona | Role | DB role | Scope |
|---|---|---|---|
| Org Admin | sets up the module | `authenticated` | full org access |
| Resource Owner | staff member who is bookable | `authenticated` | own bookings + schedule |
| Dispatcher | internal scheduler assigning resources | `authenticated` | all resources in org |
| Anon Invitee | public booking page user | `anon` | self-service only via RPCs |
| Integration Sync | calendar sync edge function | `service_role` | `cal.blocked_windows` writes |
| ZWS Automation | blueprint-driven lifecycle | `service_role` | `unified.tasks` updates |
| SaaS Admin | cross-tenant diagnostics | `authenticated` + `is_sassadmin` | all orgs |

---

## Area A — Module Setup & Configuration

### UC-CAL-A1 — Enable module for a tenant
**Actor**: Org Admin · **Trigger**: Tenant purchases calendar module
- **Pre**: `identity.org_module_configs` has no row for `module='calendar'`; `unified.contacts` and `unified.assets` exist for the org
- **Steps**:
  1. Insert `identity.org_module_configs` row with `is_enabled = true`
  2. Insert `cal.use_case_configs` with chosen booking model
- **BR**: `use_case_configs.organization_id IS NULL` rows are global defaults; tenant row takes precedence
- **Post**: `SELECT * FROM cal.use_case_configs WHERE organization_id = $org_id OR organization_id IS NULL` returns config; global row visible if no tenant override

**TEST-CAL-A1**:
```sql
-- 1. Confirm global config is visible before setup
SELECT * FROM cal.use_case_configs WHERE organization_id IS NULL; -- expect ≥1 row

-- 2. Insert tenant override
INSERT INTO cal.use_case_configs (organization_id, use_case, config, is_active)
VALUES ($org_id, 'appointment_booking', '{"auto_confirm_default": true}', true);

-- 3. Tenant row should shadow the global row for same use_case
SELECT organization_id FROM cal.use_case_configs
WHERE use_case = 'appointment_booking'
  AND (organization_id = $org_id OR organization_id IS NULL)
ORDER BY organization_id NULLS LAST LIMIT 1;
-- expect: $org_id (tenant row first)
```

---

### UC-CAL-A2 — Register a bookable resource (person)
**Actor**: Org Admin · **Trigger**: Staff member should accept appointments
- **Pre**: `unified.contacts` row exists for the person
- **Steps**:
  1. `UPDATE unified.contacts SET booking_enabled = true, booking_timezone = $tz, max_concurrent_bookings = 1`
  2. Optionally assign `calendar_id`
  3. Insert `cal.resource_availability_rules` for working hours
- **BR**: Resource does not appear in `cal.v_bookable_resources` until `booking_enabled = true`
- **Post**: `SELECT * FROM cal.v_bookable_resources WHERE id = $contact_id` returns one row with `resource_kind = 'contact'`

**TEST-CAL-A2**:
```sql
-- Before: not in view
SELECT count(*) FROM cal.v_bookable_resources WHERE id = $contact_id; -- expect 0

UPDATE unified.contacts SET booking_enabled = true, booking_timezone = 'Asia/Kolkata'
WHERE id = $contact_id;

-- After: appears in view
SELECT id, resource_kind, name, timezone FROM cal.v_bookable_resources
WHERE id = $contact_id; -- expect 1 row, resource_kind='contact'
```

---

### UC-CAL-A3 — Register a bookable asset (room / equipment)
**Actor**: Org Admin · **Trigger**: A room or piece of equipment should be bookable
- **Steps**: Same as UC-CAL-A2 but on `unified.assets`
- **Post**: `SELECT * FROM cal.v_bookable_resources WHERE id = $asset_id` returns `resource_kind = 'asset'`

---

### UC-CAL-A4 — Create an event type
**Actor**: Org Admin · **Trigger**: Define a new bookable service
- **Pre**: At least one bookable resource exists
- **Steps**: INSERT into `cal.event_types`
- **BR**: `slug` must be unique per org; UI-facing booking URL uses the slug
- **Post**: Event type retrievable; `is_public = true` event types appear on the public booking page

**TEST-CAL-A4**:
```sql
INSERT INTO cal.event_types (organization_id, title, slug, duration_minutes,
  assignment_strategy, min_advance_hours, max_advance_days, requires_confirmation, is_public)
VALUES ($org_id, 'Test Consult', 'test-consult', 30, 'round_robin', 1, 30, false, true)
RETURNING id;

-- Slug uniqueness: re-inserting same slug must fail
INSERT INTO cal.event_types (organization_id, title, slug, duration_minutes)
VALUES ($org_id, 'Duplicate', 'test-consult', 30); -- expect UNIQUE violation
```

---

### UC-CAL-A5 — Assign resources to event type
**Actor**: Org Admin · **Trigger**: Restrict which resources serve a specific event type
- **Steps**: INSERT into `cal.event_type_resources`
- **BR**: If no `event_type_resources` rows exist for an event type, ALL bookable resources in the org are eligible (open pool)
- **BR**: `resource_kind` must be provided; a contact and an asset may share the same `resource_id` UUID without conflict because uniqueness key includes `resource_kind`

**TEST-CAL-A5**:
```sql
INSERT INTO cal.event_type_resources (event_type_id, resource_id, resource_kind, role, is_required)
VALUES ($et_id, $contact_id, 'contact', 'primary', true);

-- Duplicate must fail
INSERT INTO cal.event_type_resources (event_type_id, resource_id, resource_kind, role)
VALUES ($et_id, $contact_id, 'contact', 'primary'); -- expect UNIQUE violation
```

---

## Area B — Availability & Slot Queries

### UC-CAL-B1 — Get available slots for a resource
**Actor**: Anon Invitee or Dispatcher · **Trigger**: Opens a booking page / date picker
- **Pre**: Resource is bookable; event type exists; working hours configured
- **Steps**: Call `cal.get_available_slots(resource_id, resource_kind, event_type_id, date_from, date_to)`
- **BR**: Slots that overlap with existing confirmed bookings return `is_available = false`
- **BR**: Slots outside `min_advance_hours` (too soon) return `is_available = false`
- **BR**: Slots on dates covered by `unified.resource_unavailability` return `is_available = false`
- **BR**: Slots overlapping `cal.blocked_windows WHERE is_blocking = true` return `is_available = false`
- **Post**: Returns a time-series; at least some `is_available = true` slots if resource has working hours and no conflicts

**TEST-CAL-B1**:
```sql
-- Setup: resource with Mon-Fri 9-17 rules, 30-min event type
SELECT slot_start, slot_end, is_available
FROM cal.get_available_slots($contact_id, 'contact', $et_id, CURRENT_DATE, CURRENT_DATE + 7);
-- expect: slots at 09:00, 09:30, 10:00... is_available=true; weekends is_available=false or no rows
-- expect: no slot with slot_start < now() + 1 hour (min_advance_hours=1)

-- Block a slot and re-query
INSERT INTO cal.blocked_windows (organization_id, resource_id, resource_kind,
  start_time, end_time, is_blocking, source, title)
VALUES ($org_id, $contact_id, 'contact',
  CURRENT_DATE + '09:00:00'::time, CURRENT_DATE + '10:00:00'::time, true, 'manual', 'Staff meeting');

SELECT is_available FROM cal.get_available_slots(
  $contact_id, 'contact', $et_id, CURRENT_DATE, CURRENT_DATE + 1)
WHERE slot_start = CURRENT_DATE + '09:00:00'::time;
-- expect: is_available = false (blocked)
```

---

### UC-CAL-B2 — Find next available resource (auto-assign)
**Actor**: Anon Invitee or Dispatcher · **Trigger**: "Show me any available slot in the next 7 days"
- **Pre**: Event type has ≥1 eligible resource with working hours
- **Steps**: Call `cal.find_next_available(event_type_id, from, to)`
- **BR**: Returns one row per eligible resource; picks the resource according to `assignment_strategy`
- **BR**: `required_skill_name` on event type filters to contacts with that skill in `skills[]`
- **BR**: Returns empty set if no eligible resource has availability — NOT an error

**TEST-CAL-B2**:
```sql
-- Basic: should find a slot
SELECT * FROM cal.find_next_available($et_id, now(), now() + interval '7 days');
-- expect ≥1 row: resource_id, resource_kind, slot_start, slot_end

-- Skill filter: set required_skill_name to a skill no contact has
UPDATE cal.event_types SET required_skill_name = 'nonexistent-skill-xyz' WHERE id = $et_id;
SELECT count(*) FROM cal.find_next_available($et_id, now(), now() + interval '7 days');
-- expect: 0 rows (no eligible resources)

-- Restore
UPDATE cal.event_types SET required_skill_name = NULL WHERE id = $et_id;
```

---

### UC-CAL-B3 — Availability respects resource_unavailability date blocks
**Actor**: Resource Owner · **Trigger**: Staff member marks a vacation
- **Pre**: Bookable resource; at least one working day in the vacation window
- **Steps**: INSERT into `unified.resource_unavailability` covering the vacation dates
- **Post**: `get_available_slots` returns `is_available = false` for all slots in that window

**TEST-CAL-B3**:
```sql
-- Mark next Monday as unavailable
INSERT INTO unified.resource_unavailability
  (organization_id, resource_id, resource_kind, start_at, end_at, reason)
VALUES ($org_id, $contact_id, 'contact',
  date_trunc('week', now()) + interval '7 days',
  date_trunc('week', now()) + interval '8 days',
  'Public holiday');

SELECT count(*) FROM cal.get_available_slots(
  $contact_id, 'contact', $et_id,
  (date_trunc('week', now()) + interval '7 days')::date,
  (date_trunc('week', now()) + interval '8 days')::date)
WHERE is_available = true;
-- expect: 0
```

---

## Area C — Booking Flow

### UC-CAL-C1 — Book an appointment (public, anon, auto-assign)
**Actor**: Anon Invitee · **Trigger**: Invitee completes public booking form
- **Pre**: Event type is public; at least one slot is available
- **Steps**: Call `cal.book_appointment(event_type_id, slot_start, invitee_name, invitee_email)`
- **BR**: `p_resource_id IS NULL` → `find_next_available()` auto-assigns
- **BR**: Creates exactly one `unified.tasks` row; zero `cal.bookings` rows (no such table)
- **BR**: `confirmation_code` in return payload is an 8-char uppercase hex
- **BR**: `auto_confirm = true` → `state_category = 'IN_PROGRESS'`; `auto_confirm = false` → `'NEW'`
- **Post**: `unified.tasks` row exists with `intent_type = 'calendar_booking'`; `cal.v_bookings` returns it

**TEST-CAL-C1**:
```sql
-- As anon: call via RPC (anon role, no JWT)
SELECT cal.book_appointment(
  $et_id,
  (CURRENT_DATE + '10:00:00'::time)::timestamptz,
  'Test Invitee',
  'test@example.com'
);
-- expect jsonb with: booking_id, confirmation_code (8 chars), status='IN_PROGRESS' if auto_confirm

-- Verify unified.tasks row
SELECT intent_type, task_type, state_category,
  details->>'invitee_name', details->>'confirmation_code'
FROM unified.tasks
WHERE id = ($result->>'booking_id')::uuid;
-- expect: intent_type='calendar_booking', task_type='appointment',
--         invitee_name='Test Invitee', confirmation_code=8chars

-- Verify view
SELECT * FROM cal.v_bookings WHERE booking_id = ($result->>'booking_id')::uuid;
-- expect 1 row with all fields extracted
```

---

### UC-CAL-C2 — Book with a specific resource (dispatcher)
**Actor**: Dispatcher · **Trigger**: Internal scheduling — assign a specific technician to a job
- **Steps**: Call `cal.book_appointment(..., p_resource_id := $id, p_resource_kind := 'contact')`
- **BR**: If specified resource is not available for the slot, returns an error `{error: 'slot_unavailable'}`
- **Post**: `details.assigned_resource_id` = specified resource's ID

**TEST-CAL-C2**:
```sql
-- Book a specific resource
SELECT cal.book_appointment(
  $et_id,
  (CURRENT_DATE + '14:00:00'::time)::timestamptz,
  'Corp Client', 'corp@example.com',
  $contact_id, 'contact'
);
-- expect: assigned_resource_id = $contact_id in return json

-- Attempt to book the same slot again for the same resource (conflict)
SELECT cal.book_appointment(
  $et_id,
  (CURRENT_DATE + '14:00:00'::time)::timestamptz,
  'Other Client', 'other@example.com',
  $contact_id, 'contact'
);
-- expect: error object {error: 'slot_unavailable'} or exception
```

---

### UC-CAL-C3 — Double-booking prevention under concurrency
**Actor**: System · **Trigger**: Two anon users book the same slot simultaneously
- **BR**: Advisory lock on `(org_id, resource_id, slot_start)` inside `cal.book_appointment()` prevents double-booking
- **Post**: Exactly one booking succeeds; the other gets `{error: 'slot_unavailable'}`

---

### UC-CAL-C4 — Credit-based booking
**Actor**: Anon Invitee · **Trigger**: Invitee has a prepaid credit pack
- **Pre**: `cal.client_credits` row exists with `credits_remaining > 0`
- **Steps**: Call `cal.book_appointment()`
- **BR**: Credits are decremented atomically using `SELECT FOR UPDATE`
- **BR**: If `credits_remaining = 0`, booking is rejected with `{error: 'no_credits'}`
- **Post**: `cal.client_credits.credits_remaining` decremented by 1

**TEST-CAL-C4**:
```sql
-- Setup: 2 credits
INSERT INTO cal.client_credits (organization_id, contact_id, event_type_id,
  credits_purchased, credits_remaining, expires_at)
VALUES ($org_id, $client_contact_id, $et_id, 2, 2, now() + interval '1 year');

-- Book once → credits_remaining should be 1
SELECT cal.book_appointment($et_id, $slot1, 'Credit User', 'cu@example.com');
SELECT credits_remaining FROM cal.client_credits WHERE contact_id = $client_contact_id; -- expect 1

-- Book twice → expect 0
SELECT cal.book_appointment($et_id, $slot2, 'Credit User', 'cu@example.com');
SELECT credits_remaining FROM cal.client_credits WHERE contact_id = $client_contact_id; -- expect 0

-- Book third time → expect error
SELECT cal.book_appointment($et_id, $slot3, 'Credit User', 'cu@example.com');
-- expect {error: 'no_credits'}
```

---

## Area D — Lifecycle: Cancel & Reschedule

### UC-CAL-D1 — Invitee cancels their own booking (anon)
**Actor**: Anon Invitee · **Trigger**: Invitee clicks "Cancel my booking" link in confirmation email
- **Pre**: Booking exists; `state_category != 'CLOSED_WON'`
- **Steps**:
  1. `SELECT set_config('app.booking_code', $confirmation_code, true)`
  2. Call `cal.cancel_booking($booking_id, $reason)`
- **BR**: The function validates `details->>'confirmation_code' = current_setting('app.booking_code')`
- **BR**: If the booking is already completed (`CLOSED_WON`), cancellation is rejected
- **Post**: `unified.tasks.state_category = 'CLOSED_LOST'`; `details.cancellation_reason` and `details.cancelled_at` set; credits restored if applicable

**TEST-CAL-D1**:
```sql
-- Create a booking and grab its confirmation_code
SELECT cal.book_appointment($et_id, $slot, 'Cancel Me', 'cancel@test.com') INTO v_result;

-- Anon cancel with correct code
SELECT set_config('app.booking_code', v_result->>'confirmation_code', true);
SELECT cal.cancel_booking((v_result->>'booking_id')::uuid, 'Changed my mind');

-- Verify
SELECT state_category, details->>'cancellation_reason', details->>'cancelled_at'
FROM unified.tasks WHERE id = (v_result->>'booking_id')::uuid;
-- expect: state_category='CLOSED_LOST', cancellation_reason='Changed my mind', cancelled_at set

-- Wrong confirmation code should fail
SELECT set_config('app.booking_code', 'WRONGCOD', true);
SELECT cal.cancel_booking((v_result->>'booking_id')::uuid);
-- expect: error or no-op
```

---

### UC-CAL-D2 — Staff cancels a booking (authenticated)
**Actor**: Dispatcher / Resource Owner · **Trigger**: Client no-show; admin decision
- **Pre**: JWT org matches booking's org
- **Steps**: Call `cal.cancel_booking($booking_id, $reason)` without `set_config`
- **BR**: Authenticated call bypasses `app.booking_code` check; org match via JWT is sufficient
- **Post**: Same as UC-CAL-D1

---

### UC-CAL-D3 — Invitee reschedules their booking (anon)
**Actor**: Anon Invitee · **Trigger**: Invitee wants a different time
- **Pre**: New slot is available for the same resource; `state_category IN ('NEW','IN_PROGRESS')`
- **Steps**:
  1. `set_config('app.booking_code', ...)`
  2. `cal.reschedule_booking($booking_id, $new_start)`
- **BR**: `reschedule_count` in `details` increments; `last_rescheduled_at` set
- **BR**: Credits NOT affected (no deduction/restore)
- **Post**: `unified.tasks.scheduled_start/end` updated; original resource retained if no new resource provided

**TEST-CAL-D3**:
```sql
SELECT cal.book_appointment($et_id, $slot_a, 'Reschedule Me', 'rs@test.com') INTO v_result;

SELECT set_config('app.booking_code', v_result->>'confirmation_code', true);
SELECT cal.reschedule_booking((v_result->>'booking_id')::uuid, $slot_b);

SELECT scheduled_start, (details->>'reschedule_count')::int as rc,
  details->>'last_rescheduled_at'
FROM unified.tasks WHERE id = (v_result->>'booking_id')::uuid;
-- expect: scheduled_start = $slot_b, rc = 1, last_rescheduled_at set
```

---

### UC-CAL-D4 — Reschedule with resource change
**Actor**: Dispatcher · **Trigger**: Original resource unavailable; reassign
- **Steps**: `cal.reschedule_booking($booking_id, $new_start, $new_resource_id, 'contact')`
- **BR**: New resource must be available for the new slot
- **Post**: `details.assigned_resource_id/kind/name` updated; `unified.task_assignments` updated

---

## Area E — External Calendar Sync

### UC-CAL-E1 — Sync Google Calendar events → blocked_windows
**Actor**: Integration Sync edge function · **Trigger**: Periodic cron (hourly) or OAuth webhook
- **Pre**: `cal.calendar_integrations` row exists with `sync_enabled = true`
- **Steps**:
  1. Edge function calls Google Calendar API with access token
  2. For each event in `[now() - 1 day, now() + sync_window_days]`:
     - Upsert `cal.blocked_windows` on `(calendar_integration_id, external_ref)`
     - Set `is_blocking = (event.status != 'tentative')`
  3. Update `cal.calendar_integrations.last_synced_at = now()`
- **BR**: Tentative events stored with `is_blocking = false`; they show in calendar view but don't block slots
- **BR**: Re-syncing an existing `external_ref` must UPDATE (not INSERT duplicate)
- **Post**: `cal.get_available_slots()` returns `is_available = false` for slots that now overlap a blocking window

**TEST-CAL-E1**:
```sql
-- Insert a blocked_window as if synced from Google
INSERT INTO cal.blocked_windows (organization_id, resource_id, resource_kind,
  calendar_integration_id, external_ref, title,
  start_time, end_time, is_blocking, source)
VALUES ($org_id, $contact_id, 'contact',
  $integration_id, 'google_evt_001', 'External Meeting',
  now() + interval '2 hours', now() + interval '3 hours', true, 'google');

-- Verify the blocked slot is unavailable
SELECT is_available FROM cal.get_available_slots(
  $contact_id, 'contact', $et_id, CURRENT_DATE, CURRENT_DATE + 1)
WHERE slot_start >= now() + interval '2 hours'
  AND slot_start < now() + interval '3 hours';
-- expect: is_available = false

-- Upsert same external_ref: must not create a second row
INSERT INTO cal.blocked_windows (organization_id, resource_id, resource_kind,
  calendar_integration_id, external_ref, title,
  start_time, end_time, is_blocking, source)
VALUES ($org_id, $contact_id, 'contact',
  $integration_id, 'google_evt_001', 'External Meeting (updated)',
  now() + interval '2 hours', now() + interval '3 hours', true, 'google')
ON CONFLICT (calendar_integration_id, external_ref)
WHERE calendar_integration_id IS NOT NULL
DO UPDATE SET title = EXCLUDED.title, synced_at = now();

SELECT count(*) FROM cal.blocked_windows WHERE external_ref = 'google_evt_001';
-- expect: 1 (not 2)
```

---

### UC-CAL-E2 — Tentative event does not block availability
**Actor**: Integration Sync · **Trigger**: Tentative event in Google Calendar
- **Steps**: Insert `cal.blocked_windows` with `is_blocking = false`
- **Post**: Slot is still `is_available = true`; window appears in `cal.v_blocked_windows` with `is_blocking = false`

**TEST-CAL-E2**:
```sql
INSERT INTO cal.blocked_windows (organization_id, resource_id, resource_kind,
  start_time, end_time, is_blocking, source, title)
VALUES ($org_id, $contact_id, 'contact',
  now() + interval '4 hours', now() + interval '5 hours', false, 'google', 'Maybe meeting');

SELECT is_available FROM cal.get_available_slots(
  $contact_id, 'contact', $et_id, CURRENT_DATE, CURRENT_DATE + 1)
WHERE slot_start >= now() + interval '4 hours'
  AND slot_start < now() + interval '5 hours';
-- expect: is_available = true (tentative doesn't block)
```

---

## Area F — View & Read Queries

### UC-CAL-F1 — Read bookings via v_bookings view
**Actor**: Dispatcher / Resource Owner · **Trigger**: Dashboard / calendar view
- **Steps**: `SELECT * FROM cal.v_bookings WHERE organization_id = $org_id`
- **Post**: Returns rows only for the caller's org (RLS on `unified.tasks`); all invitee fields extracted from `details`

**TEST-CAL-F1**:
```sql
SELECT booking_id, event_type_title, invitee_name, invitee_email, confirmation_code,
  status, scheduled_start, scheduled_end,
  assigned_resource_name, assigned_resource_kind
FROM cal.v_bookings
WHERE organization_id = $org_id
ORDER BY scheduled_start;
-- expect: all created bookings; status matches state_category; fields match what was passed to book_appointment
```

---

### UC-CAL-F2 — Read blocked windows via v_blocked_windows
**Actor**: Dispatcher / UI calendar renderer · **Trigger**: Rendering a resource's calendar
- **Steps**: `SELECT * FROM cal.v_blocked_windows WHERE organization_id = $org_id`
- **Post**: Returns blocked windows with resolved `resource_name` and `integration_provider`

**TEST-CAL-F2**:
```sql
SELECT resource_name, resource_kind, start_time, end_time, is_blocking, source, title
FROM cal.v_blocked_windows
WHERE organization_id = $org_id;
-- expect: rows from manual + synced sources; resource_name resolved (not UUID)
```

---

### UC-CAL-F3 — List bookable resources
**Actor**: Public booking page · **Trigger**: User selects an event type; wants to pick a specific resource
- **Steps**: `SELECT * FROM cal.v_bookable_resources WHERE organization_id = $org_id`
- **Post**: Returns only resources with `booking_enabled = true`; UNION of contacts + assets

**TEST-CAL-F3**:
```sql
SELECT id, resource_kind, name, skills, calendar_name FROM cal.v_bookable_resources
WHERE organization_id = $org_id;
-- expect: contacts have resource_kind='contact' and skills[]; assets have resource_kind='asset'
-- expect: contacts with booking_enabled=false are NOT here

-- Disable a resource and re-query
UPDATE unified.contacts SET booking_enabled = false WHERE id = $contact_id;
SELECT count(*) FROM cal.v_bookable_resources WHERE id = $contact_id; -- expect 0
UPDATE unified.contacts SET booking_enabled = true WHERE id = $contact_id;
```

---

## Area G — RLS & Security

### UC-CAL-G1 — Cross-tenant isolation on cal tables
**Actor**: Malicious authenticated user · **Trigger**: Attempts to read another org's bookings
- **BR**: `unified.tasks` RLS uses `get_current_org_id()` from JWT; cross-org reads return empty
- **BR**: `cal.*` table policies are org-scoped; cross-org reads return empty

**TEST-CAL-G1**:
```sql
-- Set JWT to org_a, query org_b's bookings
SET LOCAL request.jwt.claims = '{"app_metadata":{"organization_id":"<org_b_id>"}}';
-- (use SET ROLE authenticated and set_config in test context)

SELECT count(*) FROM cal.v_bookings WHERE organization_id = '<org_a_id>';
-- expect: 0 (RLS hides org_a data when caller is org_b)
```

---

### UC-CAL-G2 — Anon cannot read cal tables directly
**Actor**: Anon user · **Trigger**: Direct table query attempt
- **BR**: All `cal.*` tables have `ENABLE ROW LEVEL SECURITY` with no anon SELECT policies
- **Post**: SELECT returns empty or permission denied

**TEST-CAL-G2**:
```sql
SET ROLE anon;
SELECT * FROM cal.event_types LIMIT 1; -- expect: 0 rows (RLS blocks) or permission denied
SELECT * FROM cal.blocked_windows LIMIT 1; -- expect: 0 rows
RESET ROLE;
```

---

### UC-CAL-G3 — Anon can call booking RPCs
**Actor**: Anon Invitee · **Trigger**: Public booking page calls
- **BR**: `cal.get_available_slots()`, `cal.book_appointment()` are SECURITY DEFINER GRANTed to `anon`
- **Post**: RPCs execute successfully with anon role

**TEST-CAL-G3**:
```sql
SET ROLE anon;
SELECT count(*) FROM cal.get_available_slots($contact_id, 'contact', $et_id, CURRENT_DATE, CURRENT_DATE + 7);
-- expect: ≥0 rows (no permission error)
RESET ROLE;
```

---

## Area H — Edge Cases & Error Handling

### UC-CAL-H1 — Booking outside advance window is rejected
**TEST-CAL-H1**:
```sql
-- min_advance_hours = 2; try to book 30 minutes from now
SELECT cal.book_appointment($et_id, now() + interval '30 minutes', 'Too Soon', 'ts@test.com');
-- expect: {error: 'slot_unavailable'} or slot returns is_available=false
```

### UC-CAL-H2 — Non-working day slot returns is_available=false
**TEST-CAL-H2**:
```sql
-- Find the next Sunday (day_of_week=0, no rules)
SELECT is_available FROM cal.get_available_slots(
  $contact_id, 'contact', $et_id,
  date_trunc('week', CURRENT_DATE + 7)::date,  -- next Sunday
  (date_trunc('week', CURRENT_DATE + 7) + interval '1 day')::date)
WHERE is_available = true;
-- expect: 0 rows (no working hours on Sunday by default)
```

### UC-CAL-H3 — max_concurrent_bookings = 2 allows two simultaneous bookings
**TEST-CAL-H3**:
```sql
UPDATE unified.contacts SET max_concurrent_bookings = 2 WHERE id = $contact_id;

-- Book slot X with resource
SELECT cal.book_appointment($et_id, $slot_x, 'Client A', 'a@t.com', $contact_id, 'contact');
-- Book same slot X again (different invitee, same resource)
SELECT cal.book_appointment($et_id, $slot_x, 'Client B', 'b@t.com', $contact_id, 'contact');
-- expect: both succeed

-- Try a third booking for the same slot
SELECT cal.book_appointment($et_id, $slot_x, 'Client C', 'c@t.com', $contact_id, 'contact');
-- expect: {error: 'slot_unavailable'} (at capacity)

-- Restore
UPDATE unified.contacts SET max_concurrent_bookings = 1 WHERE id = $contact_id;
```

### UC-CAL-H4 — Cancel a completed booking is rejected
**TEST-CAL-H4**:
```sql
-- Manually complete a booking
UPDATE unified.tasks SET state_category = 'CLOSED_WON' WHERE id = $booking_id;
SELECT cal.cancel_booking($booking_id);
-- expect: error {error: 'cannot_cancel_completed'}
```

---

## Full Setup Checklist (Test Readiness)

Run this checklist to confirm the module is fully operational for a tenant:

```sql
-- 1. Module enabled
SELECT is_enabled FROM identity.org_module_configs
WHERE organization_id = $org_id
  AND module_id = (SELECT id FROM identity.modules WHERE slug = 'calendar');
-- ✅ expect: true

-- 2. Use case config present
SELECT use_case, is_active FROM cal.use_case_configs
WHERE organization_id = $org_id OR organization_id IS NULL;
-- ✅ expect: ≥1 active row

-- 3. Bookable resources exist
SELECT count(*) FROM cal.v_bookable_resources WHERE organization_id = $org_id;
-- ✅ expect: ≥1

-- 4. Event type exists
SELECT count(*) FROM cal.event_types WHERE organization_id = $org_id AND is_active = true;
-- ✅ expect: ≥1

-- 5. Slots are available for a booking
SELECT count(*) FROM cal.get_available_slots(
  (SELECT id FROM cal.v_bookable_resources WHERE organization_id = $org_id LIMIT 1),
  (SELECT resource_kind FROM cal.v_bookable_resources WHERE organization_id = $org_id LIMIT 1),
  (SELECT id FROM cal.event_types WHERE organization_id = $org_id AND is_active = true LIMIT 1),
  CURRENT_DATE, CURRENT_DATE + 14
) WHERE is_available = true;
-- ✅ expect: ≥1

-- 6. End-to-end: book, read, cancel
DO $$
DECLARE
  v_et  uuid := (SELECT id FROM cal.event_types WHERE organization_id = $org_id LIMIT 1);
  v_slot timestamptz := (
    SELECT slot_start FROM cal.get_available_slots(
      (SELECT id FROM cal.v_bookable_resources WHERE organization_id = $org_id LIMIT 1),
      (SELECT resource_kind FROM cal.v_bookable_resources WHERE organization_id = $org_id LIMIT 1),
      v_et, CURRENT_DATE, CURRENT_DATE + 7)
    WHERE is_available = true LIMIT 1);
  v_res jsonb;
BEGIN
  v_res := cal.book_appointment(v_et, v_slot, 'E2E Test', 'e2e@test.com');
  RAISE NOTICE 'Booking: %', v_res;
  ASSERT (v_res->>'booking_id') IS NOT NULL, 'booking_id missing';
  ASSERT length(v_res->>'confirmation_code') = 8, 'confirmation_code wrong length';
  PERFORM cal.cancel_booking((v_res->>'booking_id')::uuid, 'E2E cleanup');
  RAISE NOTICE 'E2E PASS';
END $$;
```
