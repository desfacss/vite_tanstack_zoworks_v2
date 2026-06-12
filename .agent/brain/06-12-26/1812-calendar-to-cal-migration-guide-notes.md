can you review /Users/macbookpro/zo/zo_core_v6_supa/v7_calendar_full_dump_20260611_173312.sql for the calendars? - this calendar poc had multiple mock data. if we need to cleanthis up and link to the existing hr and identity modules and the unified modules. how would we model this calendar module - this is the individual resource calendar, available for customer booking based on the slots defined and gap  defined. give me a coherent new migration file to use the above unified.resource_calendars and see how this schema works for website booking appointments cohesively. if we need any update to the unified.resource_calendars do it part of this migration only

---

### Migration summary

**16 tables created in `calendar` schema:**

| Layer | Tables |
|---|---|
| Config (Group 2 / seeds) | `use_case_configs` |
| Territory | `territories` |
| Skills | `skills`, `resource_skills` |
| Resource | `resources` (with `contact_id → unified.contacts`, `asset_id → unified.assets`, `calendar_id → unified.resource_calendars`) |
| Availability | `resource_availability_rules` (weekly pattern), `resource_date_overrides` (date exceptions) |
| Resource ops | `resource_territories` |
| Booking catalog | `event_types`, `event_type_resources` |
| Booking ledger | `bookings` (bonded to `unified.tasks` id), `booking_resources`, `client_credits` |
| External sync | `calendar_integrations`, `calendar_events` (raw), `synced_events` (bonded to `unified.tasks`) |

**`unified.resource_calendars` extended with:** `slot_duration_minutes`, `min_advance_hours`, `max_advance_days`, `auto_confirm`, `booking_page_slug`

**3 functions (callable by `anon` for public website):**
- `calendar.get_available_slots(resource_id, event_type_id, date_from, date_to)` — generates open slots from weekly rules + date overrides, subtracts conflicts live from `unified.tasks`
- `calendar.find_next_available(event_type_id, ...)` — assignment strategy dispatcher (round-robin, load-balanced, skill-based, geo-clustered)
- `calendar.book_appointment(...)` — atomic booking creation: creates `unified.tasks` + `calendar.bookings` + deducts credits in one SECURITY DEFINER call

**Key architectural decisions carried forward:**
- `calendar.bookings.id = unified.tasks.id` — every booking IS a unified task; time lives in `tasks.scheduled_start/end`, lifecycle in `tasks.state_category`
- `calendar.resources` bridges to `unified.contacts`/`unified.assets` — no duplicate identity data
- `calendar.synced_events` bonds the same way — blocking external events are also tasks (`intent_type = 'calendar_sync'`)
- 30 RLS policies: public `anon` access for availability/event-type discovery; `anon` self-service via `app.booking_code`/`app.invitee_email` set_config; `authenticated` for all management operations


since we dropped the esm.work_orders and the bonded patter - similarly should we drop calendar.bookings and use unified.tasks directly for each resource or is there any benefit keping the bonded pattern and mapping calendar.bookings.id = unified.tasks.id? similarly do we need this also calendar.synced_events or use unified schema to check necessary data ? 

instead of making direct change to calendar schema (since this is working wiht the existing frontend) can you create a new schema called cal and have only the necessary tables (with corrected f keys& triggers etc..) , functions (with corrected tables pointers) so we can switch the UI to work with the enhanced cal schema and then drop the calendar schema completely later after testing

**The bonded pattern (`calendar.bookings.id = unified.tasks.id`)** exists because `unified.tasks` has a fixed schema. But following the same logic as the `esm.work_orders` drop: booking-specific invitee data (`invitee_name`, `invitee_email`, `confirmation_code`, `event_type_id`) lives perfectly in `unified.tasks.details` JSONB. The bonded table adds a join with no schema benefit.

**`calendar.synced_events`** bonded to `unified.tasks` is even worse — external blocking events don't need to be enterprise tasks. They're just time windows to subtract from availability. A simple `cal.blocked_windows` table (resource_id + start/end + is_blocking + source) is the right model. No task bond needed.

**`calendar.booking_resources`** (multi-resource fulfillment) → already solved by `unified.task_assignments` from migration 20260611000100.

So the `cal` schema drops 4 tables and gets 1 in return:

| Drop | Replace with |
|---|---|
| `calendar.bookings` | `unified.tasks` WHERE `intent_type = 'calendar_booking'` |
| `calendar.booking_resources` | `unified.task_assignments` |
| `calendar.synced_events` | `cal.blocked_windows` (simple window table) |
| `calendar.calendar_events` | merged into `cal.blocked_windows.raw_payload` |

13 tables, 5 functions, 26 RLS policies, 18 indexes, 3 views. Clean.

Here's the full picture of what changed and why:

---

### What the `cal` schema drops vs `calendar`

| `calendar` table | `cal` decision | Why |
|---|---|---|
| `bookings` (bonded to tasks) | **Dropped** | Bookings ARE `unified.tasks` with `intent_type='calendar_booking'`; invitee data in `details` JSONB |
| `booking_resources` | **Dropped** | Multi-resource uses `unified.task_assignments` (already exists from 20260611000100) |
| `synced_events` (bonded to tasks) | **Dropped** | External blocking events are NOT enterprise tasks |
| `calendar_events` (raw dump) | **Dropped** | Merged into `cal.blocked_windows.raw_payload` |
| *(new)* | **`cal.blocked_windows`** | Simple `resource_id + start/end + source + is_blocking` — no task bond, directly queried by availability algorithm |

**Net: 16 → 13 tables. No bonded FKs anywhere in `cal`.**

### How bookings work now

```sql
-- Create a booking
SELECT cal.book_appointment('event-type-id', '2026-06-15 10:00', 'Jane Smith', 'jane@example.com');

-- Query bookings (view over unified.tasks)
SELECT * FROM cal.v_bookings WHERE invitee_email = 'jane@example.com';

-- Cancel
SELECT cal.cancel_booking('booking-id', 'Client requested cancellation');

-- Reschedule
SELECT cal.reschedule_booking('booking-id', '2026-06-16 14:00');
```

### Migration path for the frontend

1. Deploy this migration (`cal` schema live alongside `calendar`)
2. Update UI to call `cal.*` functions and query `cal.v_bookings`
3. After validation → add a final migration: `DROP SCHEMA calendar CASCADE`




Great question. Let me map out what already exists before writing anything.

**What already exists in `unified` and related schemas:**

| Concept | Already in unified |
|---|---|
| Resource identity (name, email, phone) | `unified.contacts`, `unified.assets` |
| Skills, certifications | `unified.contacts.skills[]`, `unified.contacts.certifications[]` |
| Calendar template (schedule) | `unified.resource_calendars` + `contacts.calendar_id` (added in 000100) |
| Blocked windows for scheduling | `unified.resource_unavailability` (added in 000100) |
| User link | `unified.contacts.user_id` |
| Resource type | `unified.contacts.resource_type` (added in 000100) |

So `cal.resources` IS just a filtered view over `unified.contacts + unified.assets`. `cal.skills` IS `unified.contacts.skills[]`. `cal.resource_skills` IS `unified.contacts.skills[]`.

**Result: `cal` drops to 9 tables** — no resources, no skills, no resource_skills. All resource lookups go directly to `unified.contacts` or `unified.assets` via polymorphic `(resource_id, resource_kind)` pairs — the same pattern `unified.resource_unavailability` already uses.

Good — `unified.assets` has no timezone column and no booking flags. I need to add those. Let me now write the lean migration that drops 000300's schema and rebuilds with direct unified references.

9 tables, 6 functions, 15 RLS policies, 3 views. Clean.

Here's the full architectural comparison across the three versions:

---

### Evolution summary

| | `calendar` (POC) | `cal` v1 (000300) | `cal` lean (000400) |
|---|---|---|---|
| Tables | 16 | 13 | **9** |
| Resource identity | `calendar.resources` (standalone) | `cal.resources` (bridge table) | **`cal.v_bookable_resources` (view)** |
| Skills | `calendar.skills` + `calendar.resource_skills` | `cal.skills` + `cal.resource_skills` | **`unified.contacts.skills[]`** |
| Bookings | `calendar.bookings` (bonded table) | `cal.bookings` (bonded table) | **`unified.tasks` only** |
| Multi-resource | `calendar.booking_resources` | `cal.booking_resources` | **`unified.task_assignments`** |
| External events | `calendar_events` + `synced_events` (bonded) | `cal.blocked_windows` | **`cal.blocked_windows`** (same) |
| Resource config | In `cal.resources` | In `cal.resources` | **On `unified.contacts` + `unified.assets`** (3 columns each) |
| RLS on resource tables | Via `cal.resources.organization_id` | Via `cal.resources.organization_id` | **Polymorphic CASE on unified layer** |

### What the unified layer owns now

```
unified.contacts  → booking_enabled, max_concurrent_bookings, booking_timezone
                    + calendar_id (from 20260611000100)
                    + resource_type (from 20260611000100)
                    + skills[], certifications[] (always existed)

unified.assets    → booking_enabled, max_concurrent_bookings, booking_timezone
                    + calendar_id (from 20260611000100)

unified.resource_calendars → slot config (min_advance_hours, auto_confirm, etc.)
unified.resource_unavailability → used by get_available_slots as date-block filter
unified.task_assignments → used for multi-resource panel bookings
unified.tasks     → booking ledger (intent_type = 'calendar_booking')
```

### Frontend migration path

```
1. Run 20260611000400 (cal lean lives alongside calendar schema)
2. Update UI: swap calendar.* → cal.*, route bookings through cal.book_appointment()
3. Query bookings via cal.v_bookings or unified.tasks WHERE intent_type='calendar_booking'
4. After validation: DROP SCHEMA calendar CASCADE in a final migration
```