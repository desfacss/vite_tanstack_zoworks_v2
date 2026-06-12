# Cal Module — Architecture & Conceptual Block Diagram

> **Companion to**: [`MODULE_SPEC.md`](MODULE_SPEC.md) · [`USE_CASES.md`](USE_CASES.md) · [`GAP_ANALYSIS.md`](GAP_ANALYSIS.md)
> **Date**: 2026-06-11
> **Purpose**: System design, data flows, ER sketch, and integration points — the "picture" that contextualises all the tables and functions.

---

## 1. Layered block diagram

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  ENTRY POINTS                                                                        │
│                                                                                      │
│  Public booking page (anon)        Dispatcher UI (authenticated)                     │
│  "Book a slot with Dr. Rao"        "Assign technician to job #4512"                  │
│         │                                   │                                         │
│         │ anon RPC                          │ authenticated RPC                       │
└─────────┼───────────────────────────────────┼──────────────────────────────────────-─┘
          │                                   │
          ▼                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  CAL SCHEMA (schema: cal)                                                             │
│                                                                                       │
│  ┌──────────────────┐  ┌─────────────────┐  ┌───────────────────────────────────┐   │
│  │  use_case_configs│  │  event_types     │  │  resource_availability_rules      │   │
│  │  (Group-2 seed)  │  │  + slug          │  │  day_of_week + start/end_time     │   │
│  │  tenant override │  │  + duration_min  │  │  per resource + kind              │   │
│  │  via additive RLS│  │  + strategy      │  └───────────────────────────────────┘   │
│  └──────────────────┘  │  + req_skill     │                │                         │
│                        │  + advance rules │                │                         │
│                        └────────┬─────────┘                │                         │
│                                 │                           │                         │
│  ┌──────────────────────────────▼───────────────────────────▼───────────────────┐   │
│  │  AVAILABILITY ENGINE                                                          │   │
│  │                                                                               │   │
│  │  cal.get_available_slots(resource_id, resource_kind, event_type_id, dates)   │   │
│  │    ├── cal.resolve_resource()  → unified.contacts | unified.assets            │   │
│  │    ├── cal.resource_availability_rules  (working hours)                       │   │
│  │    ├── unified.resource_unavailability  (date blocks / PTO)                   │   │
│  │    ├── cal.blocked_windows WHERE is_blocking=true  (external events)          │   │
│  │    └── unified.tasks WHERE intent_type='calendar_booking'  (conflict check)   │   │
│  │                                                                               │   │
│  │  cal.find_next_available(event_type_id, from, to, territory_id?)             │   │
│  │    ├── cal.event_type_resources  (eligible pool)                              │   │
│  │    ├── cal.resource_territories  (territory filter)                           │   │
│  │    ├── unified.contacts.skills @> ARRAY[required_skill_name]                 │   │
│  │    └── assignment_strategy: round_robin | least_busy | manual | fixed         │   │
│  └──────────────────────────────┬────────────────────────────────────────────────┘  │
│                                 │                                                    │
│  ┌──────────────────────────────▼────────────────────────────────────────────────┐  │
│  │  BOOKING WRITE PATH                                                            │  │
│  │                                                                                │  │
│  │  cal.book_appointment()                                                        │  │
│  │    ├── advisory lock (org_id, resource_id, slot_start) — race prevention      │  │
│  │    ├── re-validate slot (under lock)                                           │  │
│  │    ├── check max_concurrent_bookings                                           │  │
│  │    ├── check min_advance_hours                                                 │  │
│  │    ├── deduct cal.client_credits (if applicable)                               │  │
│  │    ├── INSERT unified.tasks (intent_type='calendar_booking')                   │  │
│  │    ├── INSERT unified.task_assignments (multi-resource)                        │  │
│  │    └── pg_notify('cal_booking_created', payload)                               │  │
│  └─────────────────────────────────────────────────────────────────────────────-──┘  │
│                                                                                       │
│  READ VIEWS                                                                           │
│  cal.v_bookings ←── unified.tasks WHERE intent_type='calendar_booking'               │
│  cal.v_bookable_resources ←── unified.contacts UNION unified.assets (booking_enabled)│
│  cal.v_blocked_windows ←── cal.blocked_windows + unified.contacts/assets (name)      │
└────────────────────────────────────────────────────────────────────────────────────-─┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  UNIFIED WORK CORE (schema: unified)                                                  │
│                                                                                       │
│  unified.tasks (intent_type='calendar_booking', task_type='appointment')             │
│    ├── scheduled_start / scheduled_end                                               │
│    ├── state_category (NEW → IN_PROGRESS → CLOSED_WON | CLOSED_LOST)                │
│    ├── details JSONB (all invitee + resource data)                                   │
│    ├── display_id (Composer-generated: CAL-00001)                                    │
│    └── core.unified_objects anchor (comments, attachments, activity)                 │
│                                                                                       │
│  unified.task_assignments (multi-resource: doctor + nurse + room)                    │
│  unified.resource_unavailability (date-level blocks: vacation, holidays)             │
│  unified.resource_calendars (named schedule template: slot_duration, auto_confirm)   │
│  unified.contacts (+ booking_enabled, booking_timezone, max_concurrent)              │
│  unified.assets   (+ booking_enabled, booking_timezone, max_concurrent)              │
└──────────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  DOWNSTREAM                                                                            │
│                                                                                       │
│  ZWS Automation (automation.*)                                                        │
│    • on state_category=NEW + intent_type=cal_booking → send confirmation email/WA    │
│    • on state_category=IN_PROGRESS + 24h before scheduled_start → reminder           │
│    • on state_category=CLOSED_LOST (cancelled) → send cancellation notification      │
│    • no-show handling blueprint: if CLOSED_WON not set by scheduled_end+1h → flag    │
│                                                                                       │
│  External Calendar Sync Edge Function (cal-sync)                                     │
│    • periodic cron (hourly) + OAuth webhook                                           │
│    • reads cal.calendar_integrations, refreshes tokens                                │
│    • writes cal.blocked_windows (upsert on external_ref)                             │
│                                                                                       │
│  Public Booking Page (Next.js)                                                        │
│    • queries cal.v_bookable_resources, cal.event_types (public)                      │
│    • calls cal.get_available_slots() and cal.book_appointment() as anon               │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. ER sketch (cal schema relationships)

```
identity.organizations
    │ 1
    │ N
    ├─── cal.use_case_configs ─────────────────────────────────────────── config only
    ├─── cal.territories ◄───── cal.resource_territories (resource_id, resource_kind)
    ├─── cal.event_types ─────► unified.contacts (owner_contact_id)
    │         │ 1
    │         │ N
    │         ├── cal.event_type_resources  (resource_id, resource_kind — polymorphic)
    │         └── cal.client_credits ──────► unified.contacts (client)
    │
    ├─── cal.resource_availability_rules  (resource_id, resource_kind — polymorphic)
    │
    └─── cal.calendar_integrations ──► unified.contacts (contact_id)
              │ 1
              │ N
              └── cal.blocked_windows (resource_id, resource_kind — polymorphic)

    unified.contacts (booking_enabled=true) ─┐
                                              ├── cal.v_bookable_resources (UNION view)
    unified.assets   (booking_enabled=true) ─┘

    unified.tasks (intent_type='calendar_booking') ── cal.v_bookings (view)
    unified.task_assignments ─────────────────────── multi-resource bookings
    unified.resource_unavailability ──────────────── date blocks (vacation/holiday)
    unified.resource_calendars ───────────────────── schedule template (slot config)
```

---

## 3. Booking flow (sequence)

```
Invitee browser                 cal schema                          unified schema
      │                             │                                     │
      │── get_available_slots() ───►│                                     │
      │                             │── resolve_resource() ──────────────►│ unified.contacts
      │                             │── resource_availability_rules query │
      │                             │── resource_unavailability query ────►│
      │                             │── blocked_windows query             │
      │                             │── unified.tasks conflict query ─────►│
      │◄── [(slot, is_available)] ──│                                     │
      │                             │                                     │
      │── book_appointment() ──────►│                                     │
      │    (slot_start, name, email)│                                     │
      │                             │── advisory pg_advisory_xact_lock()  │
      │                             │── re-validate slot ─────────────────►│
      │                             │── client_credits check              │
      │                             │── INSERT unified.tasks ─────────────►│ ← booking created
      │                             │── INSERT task_assignments ───────────►│ (multi-resource)
      │                             │── pg_notify('cal_booking_created')   │
      │◄── {booking_id, code, ...} ─│                                     │
      │                             │                           ZWS automation
      │                             │                               ├── confirmation email
      │                             │                               └── reminder scheduled
```

---

## 4. External sync flow (edge function)

```
cron (hourly)
    │
    ▼
cal-sync edge function (service_role)
    │
    ├── SELECT * FROM cal.calendar_integrations WHERE sync_enabled = true
    │
    ├── For each integration:
    │     ├── Refresh OAuth token if expires_at < now() + 10min
    │     ├── Call provider API: GET /calendars/{id}/events?timeMin=...&timeMax=...
    │     ├── For each event:
    │     │     INSERT INTO cal.blocked_windows (...)
    │     │     ON CONFLICT (calendar_integration_id, external_ref)
    │     │     WHERE calendar_integration_id IS NOT NULL
    │     │     DO UPDATE SET title=..., start_time=..., end_time=...,
    │     │                   is_blocking=(status!='tentative'), synced_at=now()
    │     └── UPDATE cal.calendar_integrations SET last_synced_at = now()
    │
    └── Availability queries now reflect updated blocked_windows automatically
```

---

## 5. Multi-resource booking (e.g. doctor + room)

```
Event type: "Procedure" — requires doctor (primary) + exam room (asset, role=room)

cal.event_type_resources:
  (event_type_id, doctor_contact_id, 'contact', 'primary', is_required=true)
  (event_type_id, room_asset_id,     'asset',   'room',    is_required=false)

book_appointment():
  1. Find an available slot where BOTH doctor AND room are free
  2. INSERT unified.tasks (primary booking, doctor as assigned_resource)
  3. INSERT unified.task_assignments (assignment_role='room', assignee_id=room_asset_id)

Result:
  unified.tasks.id = booking_id
  unified.tasks.details.assigned_resource_id = doctor_contact_id
  unified.task_assignments.assignee_id = room_asset_id (role='room')
```

---

## 6. State machine for bookings

```
                ┌─────────────────────────────┐
                │                             │
                ▼                             │
           ┌─────────┐   auto_confirm=true    │
  create ──►│  NEW    ├─────────────────────► IN_PROGRESS
  (pending) └────┬────┘                       │     │
                 │  staff confirms            │     │
                 └───────────────────────────►│     │
                                              │     │ reschedule
                                              │     │ (stays IN_PROGRESS)
                              staff/invitee   │     │
                              cancels ──────► CLOSED_LOST
                                              │
                              appointment     │
                              attended ──────► CLOSED_WON

```

Mapping to `unified.tasks.state_category`:
- `NEW` = pending confirmation
- `IN_PROGRESS` = confirmed
- `CLOSED_WON` = completed / attended
- `CLOSED_LOST` = cancelled / no-show
- `ON_HOLD` = deferred / waitlisted

---

## 7. Integration points with other modules

| Module | Integration | Direction |
|---|---|---|
| `unified.contacts` | bookable staff; invitee who books becomes a contact (upsert by email) | cal reads unified |
| `unified.assets` | bookable rooms, equipment | cal reads unified |
| `unified.tasks` | booking is a task row | cal writes to unified |
| `unified.task_assignments` | multi-resource bookings | cal writes to unified |
| `unified.resource_unavailability` | date blocks (vacation, holidays) | cal reads unified |
| `unified.resource_calendars` | named schedule template per resource | cal reads unified |
| `identity.locations` | physical location for event type | cal reads identity |
| `identity.organizations` | org scoping | cal reads identity |
| `automation.*` (ZWS) | post-booking lifecycle (confirmation, reminder, no-show) | unified.tasks triggers automation |
| `core.unified_objects` | every booking gets a URN anchor for comments/attachments | Composer tier-0.5 |
| `wa.wa_contacts` | WhatsApp reminders use WA contacts (invitee_phone → wa identity) | automation layer |
| `documents.*` | post-booking consent forms, receipts | document module reads booking details |

---

## 8. Key invariants

1. **No booking exists outside `unified.tasks`** — `cal.book_appointment()` is the only write path. Direct INSERT into `unified.tasks` with `intent_type='calendar_booking'` is allowed for service_role migrations only.
2. **Every bookable resource has `booking_enabled = true`** on its `unified.contacts` or `unified.assets` row. No bookings are created for resources with `booking_enabled = false`.
3. **`cal.blocked_windows` rows are never deleted** when an external event is removed — `is_active` is set to `false`. This preserves audit history.
4. **Conflicts are checked on `scheduled_start`/`scheduled_end` overlap** (half-open interval: `start < new_end AND end > new_start`) plus buffer time from event type.
5. **`pg_notify` fires on every booking mutation** (`cal_booking_created`, `cal_booking_cancelled`, `cal_booking_rescheduled`) for real-time UI and automation trigger.
