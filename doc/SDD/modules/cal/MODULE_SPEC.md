# Cal Module — Specification

> **SDD Version**: 1.0 — 2026-06-11
> **Topic**: Bookable resource scheduling — appointments, availability, external calendar sync
> **Status**: ✅ Schema live in `20260611000400_cal_lean.sql` (alongside legacy `calendar` schema)
> **Migration history**: `20260611000200` (calendar v1, bonded — superseded) → `20260611000300` (cal v1 — superseded) → `20260611000400` (cal lean — authoritative)
> **Companion docs**: [`USE_CASES.md`](USE_CASES.md) · [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`GAP_ANALYSIS.md`](GAP_ANALYSIS.md)
> **Migration guide**: [`.agent/brain/06-11-26/calendar-to-cal-migration-guide.md`](../../../.agent/brain/06-11-26/calendar-to-cal-migration-guide.md)
> **Depends on**: `identity` · `unified` (contacts, assets, tasks, task_assignments, resource_calendars, resource_unavailability) · `core` (Composer, display_ids) · `automation` (ZWS)
> **Agent instructions**: §1 = business context. §2 = key design decisions. §3 = schema (9 tables + 6 functions + 3 views). §4 = business rules. §5 = tenant setup. §6 = RLS. §7 = testing. §8 = integration points. §9 = phased delivery.

---

## 1. Business Context & Purpose

The `cal` schema is the **bookable-resource scheduling layer** for Zo Core. It answers one question at scale:

> *"Which of my resources (people, rooms, equipment) is available at what time, and how do I let an end user book them without double-booking?"*

It serves three operating models:

| Model | Example tenants | Core need |
|---|---|---|
| **Service booking** | Salons, clinics, consultancies | Self-service public booking page; invitee books a slot with a specific staff member or the next available |
| **Internal scheduling** | Field-service firms, facilities management | Dispatcher assigns a technician or asset to an appointment; system enforces capacity |
| **Resource management** | Co-working spaces, equipment rental | Room/machine block-booking with credit / prepaid-session model |

### Design thesis

> **A booking is a `unified.tasks` row with `intent_type = 'calendar_booking'`.** There is no separate bookings table. The `cal` schema owns availability logic, configuration, and external sync — not the booking record itself.

This means:
- Every booking participates in the full unified lifecycle (state machine, notifications, blueprints, RLS, display_id, `core.object_*` for comments/attachments)
- The scheduling engine reads `unified.tasks` for conflict detection — single source of truth, no sync lag
- `unified.task_assignments` provides multi-resource bookings (e.g. a procedure needs doctor + nurse + room) without a bespoke `booking_resources` table

### Platform position

```
identity (org / users / locations)
    │
unified.contacts (staff, freelancers)          unified.assets (rooms, equipment)
    │   + booking_enabled / max_concurrent /       │   + booking_enabled / max_concurrent /
    │     booking_timezone (cal columns)            │     booking_timezone (cal columns)
    │   + skills[] / certifications[]               │
    │
cal.v_bookable_resources (UNION view)
    │
cal schema ────── event_types ─────── resource_availability_rules
    │                   │                   │
    │             use_case_configs     cal.territories
    │                   │
    │             calendar_integrations → OAuth (Google/MS/Apple)
    │                   │
    │             blocked_windows ← sync edge fn (external events)
    │
    ▼
cal.book_appointment()
    │
    ▼ (single INSERT)
unified.tasks (intent_type='calendar_booking')
    │   + unified.task_assignments (multi-resource)
    │
    ▼
ZWS automation (confirmation, reminders, follow-ups, no-show handling)
```

---

## 2. Key Design Decisions

### 2.1 No `cal.bookings` table

Bookings ARE unified tasks. The bonded extension pattern (`calendar.bookings.id = unified.tasks.id ON DELETE CASCADE`) from the v7 POC was dropped for the same reason `esm.work_orders` was dropped. All invitee data lives in `unified.tasks.details` JSONB. `cal.v_bookings` is a read-only view that extracts those fields as typed columns.

### 2.2 No `cal.resources` table

Resources are `unified.contacts` (people) and `unified.assets` (rooms/equipment). Three booking-specific columns were added to both: `booking_enabled`, `max_concurrent_bookings`, `booking_timezone`. To make a resource bookable, set `booking_enabled = true` — no separate INSERT into a resource registry.

`cal.v_bookable_resources` is the read interface: a UNION of contacts + assets WHERE `booking_enabled = true`.

### 2.3 No `cal.skills` / `cal.resource_skills` tables

Skills already exist on `unified.contacts.skills text[]`. Skill-based routing on an event type uses `cal.event_types.required_skill_name text` matched against `unified.contacts.skills @> ARRAY[required_skill_name]`. No skill catalog table needed.

### 2.4 No `cal.synced_events` bonded table

External calendar events (Google, MS, Apple) that block availability are stored in `cal.blocked_windows` — a plain table with `start_time`/`end_time` directly, no bond to `unified.tasks`. External events are not enterprise tasks.

### 2.5 Polymorphic resource references

All `cal` tables that reference a resource use `(resource_id uuid, resource_kind text CHECK IN ('contact','asset'))` — the same pattern as `unified.resource_unavailability`. No FK enforcement by design (consistent with platform convention for polymorphic references).

### 2.6 `unified.resource_unavailability` for date blocks

Instead of `cal.resource_date_overrides`, resource-level date blocks (vacations, non-working days) use `unified.resource_unavailability` (created in migration `20260611000100`). Availability function checks it before generating slots.

---

## 3. Schema Reference

### 3.1 Tables

#### `cal.use_case_configs`
Group-2 Global Config (Additive). Configures which booking mode is active per tenant. Seeded globally; tenant rows override.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `organization_id` | uuid → identity.organizations (nullable) | NULL = global default |
| `use_case` | text | e.g. `appointment_booking`, `resource_rental`, `field_dispatch` |
| `config` | jsonb | Feature flags, UI options |
| `is_active` | boolean | |

Unique: `(organization_id, use_case)`.

#### `cal.territories`
Geographic/operational zone grouping for round-robin or territory-based routing.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `organization_id` | uuid → identity.organizations | |
| `name`, `slug` | text | |
| `metadata` | jsonb | Polygon, ZIP codes, etc. |

#### `cal.event_types`
A bookable service offering: "30-min Consultation", "Room 101 — Half Day", "Haircut + Colour".

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `organization_id` | uuid | |
| `title`, `slug` | text | Slug is URL-safe, unique per org |
| `description` | text | |
| `duration_minutes` | integer | Slot length |
| `buffer_before_minutes`, `buffer_after_minutes` | integer | Break padding |
| `owner_contact_id` | uuid → unified.contacts | Was `user_id → identity.users` in `calendar` POC |
| `location_id` | uuid → identity.locations | Physical location |
| `assignment_strategy` | text CHECK (`round_robin`, `least_busy`, `manual`, `fixed`) | |
| `required_skill_name` | text | Replaces `p_required_skill uuid` param from old find_next_available |
| `max_bookings_per_slot` | integer | For group-session events |
| `requires_confirmation` | boolean | false = auto-confirm |
| `min_advance_hours` | integer | Minimum notice before booking |
| `max_advance_days` | integer | Rolling window |
| `is_public` | boolean | Appears on public booking page |
| `metadata` | jsonb | Custom fields |
| `is_active` | boolean | |

Unique: `(organization_id, slug)`.

#### `cal.event_type_resources`
Which resources can serve this event type (for round-robin / least-busy routing). If empty, all bookable resources in the org are eligible.

| Column | Type | Notes |
|---|---|---|
| `event_type_id` | uuid → cal.event_types CASCADE | |
| `resource_id` | uuid | Polymorphic — no FK |
| `resource_kind` | text CHECK (`contact`, `asset`) | **New in cal** |
| `role` | text | `primary`, `support`, `room` |
| `is_required` | boolean | |

Unique: `(event_type_id, resource_id, resource_kind)`.

#### `cal.resource_availability_rules`
Working hours per resource per day-of-week. If no rules exist for a resource, they default to 9am–5pm Mon–Fri or the org's `use_case_config` default.

| Column | Type | Notes |
|---|---|---|
| `resource_id` | uuid | Polymorphic |
| `resource_kind` | text CHECK (`contact`, `asset`) | **New in cal** |
| `organization_id` | uuid | |
| `day_of_week` | integer 0–6 | 0=Sun |
| `start_time`, `end_time` | time | |
| `is_available` | boolean | false = explicitly closed |
| `override_date` | date | For specific-date overrides |

Unique: `(resource_id, resource_kind, day_of_week, start_time, end_time)`.

#### `cal.calendar_integrations`
OAuth calendar connections for external sync (Google, Microsoft, Apple).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `organization_id` | uuid | |
| `contact_id` | uuid → unified.contacts | **Was `resource_id → calendar.resources`** |
| `provider` | text CHECK (`google`, `microsoft`, `apple`, `ical`) | |
| `external_calendar_id` | text | Provider's calendar ID |
| `access_token_enc`, `refresh_token_enc` | text | Encrypted via Vault |
| `token_expires_at` | timestamptz | |
| `sync_enabled` | boolean | |
| `last_synced_at` | timestamptz | |
| `sync_window_days` | integer DEFAULT 30 | |
| `is_active` | boolean | |

#### `cal.blocked_windows`
External calendar events and manual blocks that block availability for a resource. Replaces both `calendar.synced_events` and `calendar.calendar_events`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Own PK — NOT bonded to unified.tasks |
| `organization_id` | uuid | |
| `resource_id` | uuid | Polymorphic |
| `resource_kind` | text CHECK (`contact`, `asset`) | |
| `calendar_integration_id` | uuid → cal.calendar_integrations (nullable) | NULL for manual blocks |
| `external_ref` | text | Provider's event ID (was `external_event_id`) |
| `title` | text | Event title |
| `start_time`, `end_time` | timestamptz | **Direct on row — no task bond** |
| `is_blocking` | boolean DEFAULT true | Tentative events: false |
| `is_all_day` | boolean | |
| `source` | text CHECK (`manual`, `google`, `microsoft`, `apple`, `ical`) | |
| `reason` | text | For manual blocks |
| `raw_payload` | jsonb | Full provider event body |
| `synced_at` | timestamptz | |
| `is_active` | boolean | |

Unique NULLS NOT DISTINCT: `(calendar_integration_id, external_ref)`.

#### `cal.client_credits`
Prepaid session credits. Deducted when a booking is confirmed.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `organization_id` | uuid | |
| `contact_id` | uuid → unified.contacts | Client/customer |
| `event_type_id` | uuid → cal.event_types | Service type |
| `credits_remaining` | integer | |
| `credits_purchased` | integer | |
| `expires_at` | timestamptz | |
| `notes` | text | |

#### `cal.resource_territories`
Associates a resource with territories for territory-based routing.

| Column | Type | Notes |
|---|---|---|
| `resource_id` | uuid | Polymorphic |
| `resource_kind` | text CHECK (`contact`, `asset`) | |
| `territory_id` | uuid → cal.territories | |
| `is_primary` | boolean | |

Unique: `(resource_id, resource_kind, territory_id)`.

---

### 3.2 Columns added to unified tables

#### `unified.contacts` (booking config columns, added in `20260611000400`)
```sql
booking_enabled         boolean NOT NULL DEFAULT false
max_concurrent_bookings integer NOT NULL DEFAULT 1
booking_timezone        text    NOT NULL DEFAULT 'UTC'
```

#### `unified.assets` (same three columns)
```sql
booking_enabled         boolean NOT NULL DEFAULT false
max_concurrent_bookings integer NOT NULL DEFAULT 1
booking_timezone        text    NOT NULL DEFAULT 'UTC'
```

#### `unified.contacts.calendar_id` + `unified.assets.calendar_id`
Added in `20260611000100`. FK → `unified.resource_calendars`. Binds the resource to a named availability schedule template (default slot duration, advance window, auto-confirm flag, holiday calendar).

#### `unified.tasks` — booking identity columns (standard columns, not new)
Bookings are identified in `unified.tasks` by:
- `intent_type = 'calendar_booking'`
- `task_type = 'appointment'`
- `module = 'calendar'`

All invitee and booking-specific data is in `details` JSONB:
```jsonc
{
  "invitee_name": "string",
  "invitee_email": "string",
  "invitee_phone": "string | null",
  "invitee_notes": "string | null",
  "timezone": "string",
  "confirmation_code": "ABCD1234",        // 8-char uppercase hex
  "event_type_id": "uuid",
  "event_type_title": "string",
  "event_type_slug": "string",
  "assigned_resource_id": "uuid",
  "assigned_resource_kind": "contact|asset",
  "assigned_resource_name": "string",
  "location_id": "uuid | null",
  "assignment_strategy": "string",
  "reschedule_count": 0,
  "cancellation_reason": "string | null",
  "cancelled_at": "timestamptz | null",
  "last_rescheduled_at": "timestamptz | null"
}
```

---

### 3.3 Functions

All functions: `SECURITY DEFINER`, SET `search_path = cal, unified, identity, public`, GRANTed to `anon` and `authenticated`.

#### `cal.resolve_resource(p_resource_id uuid, p_resource_kind text)`
Helper. Returns unified resource record regardless of kind. Used internally by all other functions.
- Queries `unified.contacts` when `p_resource_kind = 'contact'`
- Queries `unified.assets` when `p_resource_kind = 'asset'`
- Returns: `(id, organization_id, name, user_id, calendar_id, timezone, booking_enabled, max_concurrent)`

#### `cal.get_available_slots(p_resource_id, p_resource_kind, p_event_type_id, p_date_from, p_date_to)`
Returns a time-series of candidate slots and their availability.

Business logic:
1. Resolve resource via `cal.resolve_resource()`
2. Fetch working hours from `cal.resource_availability_rules` (default: Mon–Fri 9am–5pm in resource timezone if no rules)
3. Filter out date-level blocks from `unified.resource_unavailability`
4. Generate slot grid with `duration_minutes` + buffer from `cal.event_types`
5. For each slot: conflict-check against existing `unified.tasks WHERE intent_type = 'calendar_booking'` using `scheduled_start`/`scheduled_end` and `max_concurrent_bookings`
6. Conflict-check against `cal.blocked_windows WHERE is_blocking = true`
7. Enforce `min_advance_hours` (no past/near-future slots)
8. Returns `(slot_start, slot_end, is_available)` — returns unavailable slots too so UI can render a greyed-out calendar

Returns: `TABLE(slot_start timestamptz, slot_end timestamptz, is_available boolean)`

#### `cal.find_next_available(p_event_type_id, p_preferred_from, p_preferred_to, p_territory_id DEFAULT NULL)`
Round-trip scan across all eligible resources for an event type, returning the first open slot per resource.

Business logic:
1. Load event type: `required_skill_name`, `assignment_strategy`, `duration_minutes`
2. Collect eligible resources from `cal.event_type_resources` (or all `booking_enabled` resources in org if no rows)
3. If `p_territory_id` is set: filter by `cal.resource_territories`
4. If `required_skill_name` is set: filter contacts by `unified.contacts.skills @> ARRAY[required_skill_name]`
5. For each resource: call slot-generation logic (same as `get_available_slots`)
6. Apply `assignment_strategy`: `round_robin` = fewest bookings in period, `least_busy` = lowest total hours scheduled
7. Return first available slot per matched resource

Returns: `TABLE(resource_id uuid, resource_kind text, slot_start timestamptz, slot_end timestamptz)`

#### `cal.book_appointment(p_event_type_id, p_slot_start, p_invitee_name, p_invitee_email, [p_resource_id, p_resource_kind, p_invitee_phone, p_invitee_notes, p_timezone, p_location_id, p_metadata])`
Creates the booking. The ONLY write path for bookings.

Business logic:
1. Lock: advisory lock on `(org_id, resource_id, slot_start)` to prevent race-condition double-books
2. If `p_resource_id IS NULL`: call `find_next_available()` auto-assign
3. Re-validate slot availability (double-check under lock)
4. Check `max_concurrent_bookings` — reject if at capacity
5. Check `min_advance_hours` — reject if too soon
6. If credit-based: `SELECT FOR UPDATE cal.client_credits` — reject if `credits_remaining = 0`, decrement
7. Determine `auto_confirm`: from `resource_calendars.auto_confirm` or event type `requires_confirmation`
8. `INSERT INTO unified.tasks`: `intent_type='calendar_booking'`, `task_type='appointment'`, `module='calendar'`, `scheduled_start/end`, `state_category = auto_confirm ? 'IN_PROGRESS' : 'NEW'`, all invitee data + resource data in `details`
9. `INSERT INTO unified.task_assignments` for multi-resource bookings (e.g. event type has `role=room` resource)
10. Emit `pg_notify('cal_booking_created', ...)` for real-time feed and ZWS webhook trigger

Returns: `jsonb { booking_id, confirmation_code, start_time, end_time, resource_id, resource_kind, resource_name, status, auto_confirmed }`

#### `cal.cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL)`
Cancels a booking with an optional reason.

Business logic:
1. Auth: authenticated users must own the booking's org; anon must have `app.booking_code = confirmation_code` (set via `set_config`)
2. `UPDATE unified.tasks SET state_category = 'CLOSED_LOST', details = details || jsonb_build_object('cancellation_reason', p_reason, 'cancelled_at', now())`
3. If credit-based: restore credit (`UPDATE cal.client_credits SET credits_remaining = credits_remaining + 1`)
4. Emit `pg_notify('cal_booking_cancelled', ...)`

Returns: `jsonb { booking_id, status, cancelled_at }`

#### `cal.reschedule_booking(p_booking_id, p_new_start, p_new_resource_id DEFAULT NULL, p_new_resource_kind DEFAULT NULL)`
Moves a booking to a new time slot, optionally reassigning the resource.

Business logic:
1. Auth: same as cancel
2. Load current booking from `unified.tasks`; read current resource from `details`
3. Validate new slot availability (same logic as book_appointment, excluding self from conflict check)
4. `UPDATE unified.tasks SET scheduled_start = p_new_start, scheduled_end = p_new_start + duration, details = details || jsonb_build_object('last_rescheduled_at', now(), 'reschedule_count', current + 1)`
5. If new resource provided: update `details.assigned_resource_*` fields + `unified.task_assignments`
6. Emit `pg_notify('cal_booking_rescheduled', ...)`

Returns: `jsonb { booking_id, new_start, new_end, resource_id, resource_kind, reschedule_count }`

---

### 3.4 Views

#### `cal.v_bookable_resources`
UNION of `unified.contacts WHERE booking_enabled = true` and `unified.assets WHERE booking_enabled = true`.
Includes: `id`, `resource_kind` ('contact'|'asset'), `organization_id`, `name`, `type`, `email` (contacts only), `phone` (contacts only), `user_id` (contacts only), `timezone` (= booking_timezone), `calendar_id`, `booking_enabled`, `max_concurrent_bookings`, `skills[]`, `certifications[]`, `calendar_name`, `slot_duration_minutes`, `min_advance_hours`, `max_advance_days`, `auto_confirm`.

#### `cal.v_bookings`
`SELECT FROM unified.tasks WHERE intent_type = 'calendar_booking'` with all `details` JSONB fields extracted as typed columns. Joins `cal.event_types`, `identity.locations`, `identity.organizations`.

Key columns: `booking_id` (= `tasks.id`), `organization_id`, `event_type_id`, `event_type_title`, `event_type_slug`, `assigned_resource_id`, `assigned_resource_kind`, `assigned_resource_name`, `invitee_name`, `invitee_email`, `invitee_phone`, `invitee_notes`, `timezone`, `confirmation_code`, `reschedule_count`, `cancellation_reason`, `status` (= `state_category`), `scheduled_start`, `scheduled_end`, `location_id`, `location_name`, `created_at`, `updated_at`.

#### `cal.v_blocked_windows`
`cal.blocked_windows` with resource name resolved: CASE WHEN `resource_kind = 'contact'` THEN join `unified.contacts` ELSE join `unified.assets` END. Adds `integration_provider` from `cal.calendar_integrations`.

---

## 4. Business Rules

### BR-1 — Booking uniqueness / concurrency
- A resource cannot have more concurrent bookings at any moment than `max_concurrent_bookings`
- Conflict check is on overlapping `scheduled_start`/`scheduled_end` windows: `NOT (new_end <= existing_start OR new_start >= existing_end)`
- Blocked windows (`cal.blocked_windows WHERE is_blocking = true`) are treated identically to confirmed bookings for conflict detection
- `max_concurrent_bookings = 1` (default) means no double-booking ever
- `max_concurrent_bookings > 1` enables group sessions (e.g. a fitness class with 10 slots)

### BR-2 — Advance booking window
- `min_advance_hours`: bookings must be placed at least this many hours before the slot
- `max_advance_days`: bookings cannot be placed more than this many days ahead
- These are set per event type; the resource's `resource_calendars` row can also define defaults
- The slot API (`get_available_slots`) marks slots outside the window as `is_available = false`

### BR-3 — Auto-confirm vs manual confirm
- If `requires_confirmation = false` on the event type OR `resource_calendars.auto_confirm = true`: booking is created with `state_category = 'IN_PROGRESS'` (confirmed)
- If manual confirm required: `state_category = 'NEW'` (pending)
- A ZWS blueprint on `state_category = 'NEW' AND intent_type = 'calendar_booking'` handles confirmation reminders and auto-cancel of unconfirmed bookings after a configurable window

### BR-4 — Assignment strategies
- `round_robin`: select resource with fewest bookings in the `p_preferred_from`..`p_preferred_to` window
- `least_busy`: select resource with lowest total scheduled hours
- `manual`: `p_resource_id` must be provided; `find_next_available()` returns an error if called without a specific resource
- `fixed`: event type has exactly one resource; booking always goes to that resource

### BR-5 — Skill-based routing
- `cal.event_types.required_skill_name`: if set, only `unified.contacts` with `skills @> ARRAY[required_skill_name]` are eligible
- Skill matching is case-insensitive array containment
- If no eligible resource has the required skill, `find_next_available()` returns an empty set (do NOT fall back to unskilled resources)

### BR-6 — Territory-based routing
- If `p_territory_id` is provided to `find_next_available()`, only resources in `cal.resource_territories` with that territory are eligible
- If a resource has multiple territories with `is_primary = true`, that is an invalid state — enforce UNIQUE on `(resource_id, resource_kind, is_primary=true)` in seed/application layer

### BR-7 — Credit deductions
- If a `cal.client_credits` row exists for `(contact_id, event_type_id)`: each booking deducts one credit
- Credits are deducted atomically (SELECT FOR UPDATE) at booking time
- Cancelled bookings restore one credit
- Rescheduled bookings do NOT change the credit count
- Credits respect `expires_at`: expired credits are treated as zero

### BR-8 — External sync integrity
- A `cal.blocked_windows` row is unique on `(calendar_integration_id, external_ref)` NULLS NOT DISTINCT
- Re-syncing an already-seen `external_ref` must UPDATE the existing row (upsert), not INSERT a duplicate
- Tentative events (`status = 'tentative'` in provider payload) are stored with `is_blocking = false` — they appear in the calendar view but do NOT block slot availability
- Sync edge function must honour the `sync_window_days` setting: only import events within `[now() - 1 day, now() + sync_window_days]`

### BR-9 — Cancellation policy
- Any authenticated user can cancel their org's bookings
- Anon (public invitee) can cancel their own booking by providing their `confirmation_code` via `set_config('app.booking_code', code, false, true)`
- Once `state_category = 'CLOSED_WON'` (completed), cancellation is blocked (past appointments cannot be uncompleted)

### BR-10 — Timezone handling
- All timestamps stored as `timestamptz` (UTC in DB)
- Slot generation converts to the resource's `booking_timezone` for day/hour boundary calculations
- Invitee's `p_timezone` is stored in `details.timezone` for display purposes only — it does NOT affect storage
- `resource_availability_rules.start_time`/`end_time` are in the resource's `booking_timezone`

---

## 5. Tenant Setup (How to Make the Module Work for a Tenant)

### Step 1 — Enable the calendar module for the tenant

```sql
INSERT INTO identity.org_module_configs (organization_id, module_id, is_enabled)
VALUES ($org_id, (SELECT id FROM identity.modules WHERE slug = 'calendar'), true)
ON CONFLICT (organization_id, module_id) DO UPDATE SET is_enabled = true;
```

### Step 2 — Seed use_case_config (if not using global default)

```sql
INSERT INTO cal.use_case_configs (organization_id, use_case, config, is_active)
VALUES (
  $org_id,
  'appointment_booking',
  '{
    "default_slot_duration_minutes": 30,
    "default_min_advance_hours": 1,
    "default_max_advance_days": 60,
    "auto_confirm_default": true,
    "allow_anon_booking": true,
    "cancellation_window_hours": 24
  }',
  true
)
ON CONFLICT (organization_id, use_case) DO UPDATE
  SET config = EXCLUDED.config, is_active = true;
```

### Step 3 — Make resources bookable

```sql
-- Enable a staff member for booking
UPDATE unified.contacts
SET
  booking_enabled = true,
  booking_timezone = 'Asia/Kolkata',
  max_concurrent_bookings = 1
WHERE id = $contact_id AND organization_id = $org_id;

-- Enable a room/asset for booking
UPDATE unified.assets
SET
  booking_enabled = true,
  booking_timezone = 'Asia/Kolkata',
  max_concurrent_bookings = 1
WHERE id = $asset_id AND organization_id = $org_id;
```

### Step 4 — Create a resource calendar (availability schedule template)

```sql
INSERT INTO unified.resource_calendars (organization_id, name, slot_duration_minutes,
  min_advance_hours, max_advance_days, auto_confirm, timezone, working_hours)
VALUES (
  $org_id,
  'Standard Clinic Hours',
  30,
  1,       -- min 1 hour notice
  60,      -- up to 60 days ahead
  true,    -- auto-confirm
  'Asia/Kolkata',
  '{"mon":{"start":"09:00","end":"18:00"},"tue":{"start":"09:00","end":"18:00"},
    "wed":{"start":"09:00","end":"18:00"},"thu":{"start":"09:00","end":"18:00"},
    "fri":{"start":"09:00","end":"17:00"}}'
)
RETURNING id;

-- Assign the calendar to the resource
UPDATE unified.contacts
SET calendar_id = $calendar_id
WHERE id = $contact_id;
```

### Step 5 — Set working hours (granular override, optional)

```sql
-- If resource_calendars is not granular enough, use per-resource rules
INSERT INTO cal.resource_availability_rules
  (resource_id, resource_kind, organization_id, day_of_week, start_time, end_time, is_available)
VALUES
  ($contact_id, 'contact', $org_id, 1, '09:00', '17:00', true),  -- Mon
  ($contact_id, 'contact', $org_id, 2, '09:00', '17:00', true),  -- Tue
  ($contact_id, 'contact', $org_id, 3, '09:00', '13:00', true),  -- Wed half-day
  ($contact_id, 'contact', $org_id, 4, '09:00', '17:00', true),  -- Thu
  ($contact_id, 'contact', $org_id, 5, '09:00', '17:00', true)   -- Fri
ON CONFLICT (resource_id, resource_kind, day_of_week, start_time, end_time) DO NOTHING;
```

### Step 6 — Create an event type

```sql
INSERT INTO cal.event_types (
  organization_id, title, slug, description,
  duration_minutes, buffer_before_minutes, buffer_after_minutes,
  owner_contact_id, location_id,
  assignment_strategy, required_skill_name,
  min_advance_hours, max_advance_days,
  requires_confirmation, is_public
) VALUES (
  $org_id,
  '30-min Consultation',
  'consultation-30min',
  'Initial consultation with a specialist',
  30, 5, 5,
  $owner_contact_id,
  $location_id,
  'round_robin',
  'dermatology',          -- only contacts with skills @> ARRAY['dermatology'] eligible
  2,                      -- 2 hours advance notice
  30,                     -- up to 30 days ahead
  false,                  -- auto-confirm
  true
) RETURNING id;
```

### Step 7 — Assign eligible resources to the event type

```sql
-- Add specific contacts who can serve this event type
INSERT INTO cal.event_type_resources (event_type_id, resource_id, resource_kind, role, is_required)
VALUES
  ($event_type_id, $contact_id_1, 'contact', 'primary', true),
  ($event_type_id, $contact_id_2, 'contact', 'primary', true);

-- Add a room requirement (multi-resource booking)
INSERT INTO cal.event_type_resources (event_type_id, resource_id, resource_kind, role, is_required)
VALUES ($event_type_id, $room_asset_id, 'asset', 'room', false);
```

### Step 8 — (Optional) Connect an external calendar

This step is done via the OAuth edge function (not raw SQL). After OAuth callback:
```sql
INSERT INTO cal.calendar_integrations (
  organization_id, contact_id, provider,
  external_calendar_id, access_token_enc, refresh_token_enc,
  token_expires_at, sync_enabled, sync_window_days
) VALUES (
  $org_id, $contact_id, 'google',
  'primary', $encrypted_access, $encrypted_refresh,
  now() + interval '1 hour', true, 30
) RETURNING id;
```

Then run the sync edge function once manually to populate `cal.blocked_windows`.

### Step 9 — (Optional) Set up territories

```sql
INSERT INTO cal.territories (organization_id, name, slug)
VALUES ($org_id, 'North Zone', 'north-zone') RETURNING id;

INSERT INTO cal.resource_territories (resource_id, resource_kind, territory_id, is_primary)
VALUES ($contact_id, 'contact', $territory_id, true);
```

### Step 10 — (Optional) Issue prepaid credits

```sql
INSERT INTO cal.client_credits (organization_id, contact_id, event_type_id,
  credits_purchased, credits_remaining, expires_at)
VALUES ($org_id, $client_contact_id, $event_type_id, 10, 10, now() + interval '1 year');
```

### Step 11 — Verify readiness

```sql
-- Should return at least one resource
SELECT id, resource_kind, name, timezone, skills FROM cal.v_bookable_resources
WHERE organization_id = $org_id;

-- Should return available slots
SELECT * FROM cal.get_available_slots(
  $resource_id, 'contact',
  $event_type_id,
  CURRENT_DATE, CURRENT_DATE + 7
) WHERE is_available = true LIMIT 5;
```

---

## 6. RLS Architecture

All `cal` tables follow the platform's **standard multi-tenant RLS pattern**. Caller personas:

| Persona | DB role | org_id source |
|---|---|---|
| UI user / AI agent | `authenticated` | JWT `app_metadata.organization_id` |
| Anon invitee | `anon` | Self-service only via RPCs; no direct table access |
| Sync edge function | `service_role` | Explicit WHERE clauses; bypasses RLS |
| SaaS admin | `authenticated` + `is_sassadmin=true` | Either global view OR tenant-context mode |

### Policy templates used

| Table | Template | Notes |
|---|---|---|
| `cal.use_case_configs` | `global_config` (Additive) | `organization_id IS NULL OR organization_id = get_current_org_id()` |
| `cal.territories` | `standard` | org-scoped |
| `cal.event_types` | `configuration` (Additive) | global defaults + tenant rows |
| `cal.event_type_resources` | `standard` | via event_type org join |
| `cal.resource_availability_rules` | `standard` | org-scoped |
| `cal.calendar_integrations` | `standard` | org-scoped; `service_role` only for token columns |
| `cal.blocked_windows` | `standard` | org-scoped |
| `cal.client_credits` | `standard` | org-scoped |
| `cal.resource_territories` | `standard` | via territory org join |

### Anon self-service access
`anon` cannot read `cal` tables directly. All anon access goes through SECURITY DEFINER RPCs:
- `cal.get_available_slots()` — no auth required (public booking page)
- `cal.book_appointment()` — no auth required
- `cal.cancel_booking()` — requires setting `app.booking_code` via `set_config`

---

## 7. Phased Delivery

| Phase | Scope | Status |
|---|---|---|
| **P0** | Schema (9 tables, 6 functions, 3 views, new unified columns) | ✅ `20260611000400` |
| **P1** | External calendar sync edge function (Google/MS OAuth + blocked_windows sync) | ⬜ Planned |
| **P2** | ZWS blueprints: auto-confirm reminder, no-show handling, post-booking follow-up | ⬜ Planned |
| **P3** | Public booking page (Next.js) using `cal.v_bookable_resources` + `get_available_slots` | ⬜ Planned |
| **P4** | Drop `calendar` schema (frontend migrated, regression tested) | ⬜ After P3 |
| **P5** | Multi-resource bookings UI (event type requires contact + room simultaneously) | ⬜ Planned |
| **P6** | Group bookings (max_bookings_per_slot > 1, waitlist) | ⬜ Planned |
