# calendar → cal Schema Migration Guide
**Source of truth for frontend changes**

> Date: 2026-06-11  
> Migrations: `20260611000200` (calendar schema), `20260611000300` (cal v1, superseded), `20260611000400` (cal lean — the live target)  
> Scope: Everything a frontend/API consumer needs to switch from `calendar.*` to `cal.*`

---

## 1. Why this change happened

The original `calendar` schema (POC, v7) had three design problems:

1. **`calendar.bookings` was a bonded table** (`id = unified.tasks.id`). Bookings ARE unified tasks — the bonded table was a pure join with no schema benefit. Invitee data now lives in `unified.tasks.details` JSONB.
2. **`calendar.synced_events` was also bonded** to `unified.tasks`. External blocking events are NOT enterprise tasks — they are time windows. `cal.blocked_windows` is a plain table with `start_time/end_time` directly.
3. **`calendar.resources` duplicated identity data** that already lives in `unified.contacts` (people) and `unified.assets` (rooms/equipment). `cal.v_bookable_resources` is now a view over those unified tables, not a standalone table.

---

## 2. Table-by-table map

### 2a. Dropped tables — where the data moved

| Old table | Status | Where data lives now |
|---|---|---|
| `calendar.bookings` | **DROPPED** | `unified.tasks` WHERE `intent_type = 'calendar_booking'` |
| `calendar.booking_resources` | **DROPPED** | `unified.task_assignments` (resource_id + assignment_role) |
| `calendar.synced_events` | **DROPPED** | `cal.blocked_windows` (source = 'google'/'microsoft'/etc.) |
| `calendar.calendar_events` | **DROPPED** | `cal.blocked_windows.raw_payload` + direct columns |
| `calendar.resources` | **DROPPED** | `cal.v_bookable_resources` (view over unified.contacts + unified.assets) |
| `calendar.skills` | **DROPPED** | `unified.contacts.skills text[]` |
| `calendar.resource_skills` | **DROPPED** | `unified.contacts.skills text[]` |
| `calendar.resource_date_overrides` | **DROPPED** | `unified.resource_unavailability` (same polymorphic pattern) |

### 2b. Renamed / restructured tables

| Old table | New table | Key changes |
|---|---|---|
| `calendar.event_types` | `cal.event_types` | `user_id` → `owner_contact_id` (FK now → `unified.contacts`, not `identity.users`) |
| `calendar.event_type_resources` | `cal.event_type_resources` | `resource_id` was FK → `calendar.resources`; now polymorphic `(resource_id, resource_kind)` |
| `calendar.resource_availability_rules` | `cal.resource_availability_rules` | `resource_id` was FK → `calendar.resources`; now polymorphic `(resource_id, resource_kind)` |
| `calendar.calendar_integrations` | `cal.calendar_integrations` | `resource_id` → `contact_id` (FK now → `unified.contacts`) |
| `calendar.resource_territories` | `cal.resource_territories` | `resource_id` was FK → `calendar.resources`; now polymorphic `(resource_id, resource_kind)` |
| `calendar.territories` | `cal.territories` | Unchanged |
| `calendar.use_case_configs` | `cal.use_case_configs` | Unchanged |
| `calendar.client_credits` | `cal.client_credits` | Unchanged |

### 2c. Tables that stayed in cal (unchanged concept)

`cal.territories`, `cal.use_case_configs`, `cal.client_credits` — structure is identical to the old `calendar.*` versions.

---

## 3. Column-by-column map for dropped tables

### 3a. `calendar.bookings` → `unified.tasks`

Every booking is now a row in `unified.tasks` with `intent_type = 'calendar_booking'`.

| Old column (calendar.bookings) | New location (unified.tasks) | Notes |
|---|---|---|
| `id` | `id` | Same UUID, same PK |
| `organization_id` | `organization_id` | Direct column |
| `event_type_id` | `details->>'event_type_id'` | Cast: `::uuid` |
| `assigned_resource_id` | `details->>'assigned_resource_id'` | Cast: `::uuid` |
| *(new)* | `details->>'assigned_resource_kind'` | `'contact'` or `'asset'` |
| *(new)* | `details->>'assigned_resource_name'` | Denormalized for display |
| `location_id` | `details->>'location_id'` | Cast: `::uuid` |
| `invitee_name` | `details->>'invitee_name'` | String |
| `invitee_email` | `details->>'invitee_email'` | String |
| `invitee_phone` | `details->>'invitee_phone'` | String, nullable |
| `invitee_notes` | `details->>'invitee_notes'` | String, nullable |
| `timezone` | `details->>'timezone'` | String |
| `assignment_strategy` | `details->>'assignment_strategy'` | String |
| `metadata` | merged into `details` | All metadata keys in same JSONB |
| *(new)* | `details->>'confirmation_code'` | 8-char uppercase hex |
| *(new)* | `details->>'reschedule_count'` | Integer as string; cast `::integer` |
| `cancellation_reason` | `details->>'cancellation_reason'` | Set on cancel |
| `state_category` | `state_category` | Direct column — same 5 values |
| `is_on_hold` | `is_on_hold` | Direct column |
| `is_active` | `is_active` | Direct column |
| `intent_type` | `intent_type` | Always `'calendar_booking'` |
| `created_at` / `updated_at` | `created_at` / `updated_at` | Direct columns |
| `created_by` / `updated_by` | `created_by` / `updated_by` | Direct columns |
| *(bonded)* start/end time | `scheduled_start` / `scheduled_end` | Direct columns (no join needed) |
| *(bonded)* display_id | `display_id` | Direct column |
| *(bonded)* name | `name` | `event_type.title + ' — ' + invitee_name` |

**State category mapping (unchanged values):**

| Status | `state_category` value |
|---|---|
| Pending confirmation | `NEW` |
| Confirmed | `IN_PROGRESS` |
| Completed / attended | `CLOSED_WON` |
| Cancelled / no-show | `CLOSED_LOST` |
| On hold | `ON_HOLD` |

---

### 3b. `calendar.synced_events` + `calendar.calendar_events` → `cal.blocked_windows`

These two tables are merged. External events from Google/MS/Apple that block availability are now a single plain record with `start_time`/`end_time` directly on the row — no task bond needed.

| Old column | New column (cal.blocked_windows) | Notes |
|---|---|---|
| `calendar.synced_events.id` (bonded tasks.id) | `cal.blocked_windows.id` | New UUID — NOT the tasks.id |
| `synced_events.organization_id` | `organization_id` | Direct |
| `synced_events.calendar_integration_id` | `calendar_integration_id` | Direct, FK → `cal.calendar_integrations` |
| `synced_events.external_event_id` | `external_ref` | Renamed |
| `synced_events.provider` | `source` | Renamed; values: `'google'/'microsoft'/'apple'/'ical'/'manual'` |
| `synced_events.is_blocking` | `is_blocking` | Direct |
| `synced_events.is_all_day` | `is_all_day` | Direct |
| `synced_events.attendees` | `raw_payload->'attendees'` | Inside raw_payload |
| `synced_events.location` | `raw_payload->>'location'` | Inside raw_payload |
| `synced_events.raw_payload` | `raw_payload` | Direct |
| `synced_events.synced_at` | `synced_at` | Direct |
| `synced_events.is_active` | `is_active` | Direct |
| *(bonded)* `unified.tasks.scheduled_start` | `start_time` | **Direct on blocked_windows now** |
| *(bonded)* `unified.tasks.scheduled_end` | `end_time` | **Direct on blocked_windows now** |
| `calendar.calendar_events.title` | `title` | From calendar_events, now on blocked_windows |
| `calendar_events.start_time` | `start_time` | Direct |
| `calendar_events.end_time` | `end_time` | Direct |
| `calendar_events.status = 'tentative'` | `is_blocking = false` | Tentative events are informational only |
| `calendar_events.metadata` | `raw_payload` | Merged |
| — | `reason` | For manual blocks |
| — | `resource_id + resource_kind` | Polymorphic resource link |

**Sync edge function change:** previously inserted into `unified.tasks` + `calendar.synced_events`. Now inserts directly into `cal.blocked_windows` only. No task created for external calendar events.

---

### 3c. `calendar.resources` → `cal.v_bookable_resources` (view) + unified layer

`calendar.resources` was a standalone table with its own identity data. It is now a VIEW over `unified.contacts UNION unified.assets` where `booking_enabled = true`.

To make a person or asset bookable, set `booking_enabled = true` on the unified record — there is no separate `cal.resources` INSERT.

| Old column (calendar.resources) | New location | Notes |
|---|---|---|
| `id` | `unified.contacts.id` or `unified.assets.id` | Same UUID |
| `organization_id` | `unified.contacts.organization_id` / `unified.assets.organization_id` | Direct |
| `type` | `unified.contacts.resource_type` (person) / `unified.assets.asset_type` | Different column names by kind |
| `name` | `unified.contacts.name` / `unified.assets.name` | Direct |
| `email` | `unified.contacts.email` | Only contacts have email; assets: NULL |
| `phone` | `unified.contacts.phone` | Only contacts; assets: NULL |
| `avatar_url` | `unified.contacts.details->>'avatar_url'` | In details JSONB |
| `timezone` | `unified.contacts.booking_timezone` / `unified.assets.booking_timezone` | **New column added in 20260611000400** |
| `user_id` | `unified.contacts.user_id` | Contacts only |
| `is_active` | `unified.contacts.is_active` / `unified.assets.is_active` | Direct |
| `metadata` | `unified.contacts.details` / `unified.assets.details` | JSONB |
| *(new)* | `resource_kind` | `'contact'` or `'asset'` — **required in all cal functions** |
| *(new)* | `booking_enabled` | `unified.contacts.booking_enabled` — **new column** |
| *(new)* | `max_concurrent_bookings` | `unified.contacts.max_concurrent_bookings` — **new column** |
| *(new)* | `skills` | `unified.contacts.skills text[]` |
| *(new)* | `certifications` | `unified.contacts.certifications text[]` |
| *(new)* | `calendar_id` | `unified.contacts.calendar_id` (added in 20260611000100) |

**New columns added to `unified.contacts` and `unified.assets`:**
```sql
booking_enabled         boolean DEFAULT false
max_concurrent_bookings integer DEFAULT 1
booking_timezone        text    DEFAULT 'UTC'
```

**To make a resource bookable (replaces `INSERT INTO calendar.resources`):**
```sql
-- Person resource
UPDATE unified.contacts
SET booking_enabled = true, booking_timezone = 'Asia/Kolkata'
WHERE id = $contact_id;

-- Room / equipment
UPDATE unified.assets
SET booking_enabled = true, booking_timezone = 'Asia/Kolkata'
WHERE id = $asset_id;
```

---

### 3d. `calendar.resource_date_overrides` → `unified.resource_unavailability`

| Old column | New column (unified.resource_unavailability) | Notes |
|---|---|---|
| `resource_id` (FK → calendar.resources) | `resource_id` | Now points to unified.contacts or unified.assets |
| *(new)* | `resource_kind` | `'contact'` or `'asset'` — required |
| `date` | `start_at::date` / `end_at::date` | Use `start_at = date::timestamptz`, `end_at = (date+1)::timestamptz` for all-day blocks |
| `is_available = false` | *(row existence)* | A row means the period is unavailable. No `is_available = true` rows needed. |
| `start_time` | `start_at` | Full timestamptz |
| `end_time` | `end_at` | Full timestamptz |
| `reason` | `reason` | Direct |

---

### 3e. `calendar.resource_availability_rules` → `cal.resource_availability_rules`

The table structure is almost identical but the FK target changed.

| Old | New | Change |
|---|---|---|
| `resource_id` FK → `calendar.resources(id)` | `resource_id` (no FK) | Polymorphic — no FK enforcement |
| *(none)* | `resource_kind text CHECK('contact','asset')` | **Required new column** |
| `day_of_week`, `start_time`, `end_time`, `is_available` | Unchanged | Same |

---

### 3f. `calendar.calendar_integrations` → `cal.calendar_integrations`

| Old | New | Change |
|---|---|---|
| `resource_id uuid` FK → `calendar.resources(id)` | `contact_id uuid` FK → `unified.contacts(id)` | **Renamed + FK target changed** |
| All other columns | Unchanged | Same names, same semantics |

Only contacts (people) have OAuth calendar integrations. Assets cannot have integrations.

---

### 3g. `calendar.event_types` → `cal.event_types`

| Old | New | Change |
|---|---|---|
| `user_id uuid` FK → `identity.users(id)` | `owner_contact_id uuid` FK → `unified.contacts(id)` | **Renamed + FK target changed** |
| *(none)* | `required_skill_name text` | Replaces `p_required_skill uuid` parameter in find_next_available |
| All other columns | Unchanged | Same names, same semantics |

---

### 3h. `calendar.event_type_resources` → `cal.event_type_resources`

| Old | New | Change |
|---|---|---|
| `resource_id uuid` FK → `calendar.resources(id)` | `resource_id uuid` (no FK) | Polymorphic — no FK enforcement |
| *(none)* | `resource_kind text CHECK('contact','asset')` | **Required new column** |
| `event_type_id`, `role`, `is_required` | Unchanged | Same |

---

### 3i. `calendar.resource_territories` → `cal.resource_territories`

| Old | New | Change |
|---|---|---|
| `resource_id uuid` FK → `calendar.resources(id)` | `resource_id uuid` (no FK) | Polymorphic |
| *(none)* | `resource_kind text CHECK('contact','asset')` | **Required new column** |
| `territory_id`, `is_primary` | Unchanged | Same |

---

## 4. Function-by-function map

### 4a. `calendar.get_available_slots()` → `cal.get_available_slots()`

**Old signature:**
```sql
calendar.get_available_slots(
  p_resource_id   uuid,
  p_event_type_id uuid,
  p_date_from     date,
  p_date_to       date
) RETURNS TABLE (slot_start timestamptz, slot_end timestamptz, is_available boolean)
```

**New signature:**
```sql
cal.get_available_slots(
  p_resource_id   uuid,
  p_resource_kind text,   -- NEW: 'contact' | 'asset'
  p_event_type_id uuid,
  p_date_from     date,
  p_date_to       date
) RETURNS TABLE (slot_start timestamptz, slot_end timestamptz, is_available boolean)
```

**What changed internally:**
- Resource lookup: was `FROM calendar.resources WHERE id = p_resource_id` → now `FROM cal.resolve_resource(p_resource_id, p_resource_kind)` which queries `unified.contacts` or `unified.assets`
- Timezone: was `calendar.resources.timezone` → now `unified.contacts.booking_timezone` / `unified.assets.booking_timezone`
- Date overrides: was `calendar.resource_date_overrides` → now `unified.resource_unavailability` (same polymorphic pattern)
- Conflict check — was:
  ```sql
  EXISTS (SELECT 1 FROM calendar.bookings b WHERE b.assigned_resource_id = p_resource_id ...)
  ```
  Now:
  ```sql
  EXISTS (SELECT 1 FROM unified.tasks t
    WHERE t.intent_type = 'calendar_booking'
      AND (t.details->>'assigned_resource_id')::uuid = p_resource_id
      AND t.details->>'assigned_resource_kind' = p_resource_kind ...)
  ```
- Blocking window check — was `calendar.synced_events` → now `cal.blocked_windows`

**Frontend call change:**
```js
// OLD
supabase.rpc('get_available_slots', {
  p_resource_id: resourceId,
  p_event_type_id: eventTypeId,
  p_date_from: '2026-06-15',
  p_date_to: '2026-06-30'
})

// NEW — add p_resource_kind
supabase.schema('cal').rpc('get_available_slots', {
  p_resource_id: resourceId,
  p_resource_kind: 'contact',  // or 'asset'
  p_event_type_id: eventTypeId,
  p_date_from: '2026-06-15',
  p_date_to: '2026-06-30'
})
```

---

### 4b. `calendar.find_next_available()` → `cal.find_next_available()`

**Old signature:**
```sql
calendar.find_next_available(
  p_event_type_id  uuid,
  p_preferred_from timestamptz DEFAULT now(),
  p_preferred_to   timestamptz DEFAULT now() + interval '7 days',
  p_required_skill uuid        DEFAULT NULL,
  p_territory_id   uuid        DEFAULT NULL
) RETURNS TABLE (resource_id uuid, slot_start timestamptz, slot_end timestamptz)
```

**New signature:**
```sql
cal.find_next_available(
  p_event_type_id  uuid,
  p_preferred_from timestamptz DEFAULT now(),
  p_preferred_to   timestamptz DEFAULT now() + interval '7 days',
  p_territory_id   uuid        DEFAULT NULL
  -- p_required_skill REMOVED — set cal.event_types.required_skill_name instead
) RETURNS TABLE (resource_id uuid, resource_kind text, slot_start timestamptz, slot_end timestamptz)
```

**What changed:**
- `p_required_skill uuid` parameter **removed** — skill requirement is now a property of the event type itself (`cal.event_types.required_skill_name text`). Set it on the event type config, not on each call.
- Return set gains `resource_kind text` column.
- Resource eligibility check: was `FROM calendar.event_type_resources JOIN calendar.resources` → now `FROM cal.event_type_resources` with inline `booking_enabled` check against `unified.contacts`/`unified.assets`
- Skill filter: was `FROM calendar.resource_skills WHERE skill_id = p_required_skill` → now `unified.contacts.skills @> ARRAY[event_type.required_skill_name]`
- Round-robin/load-balanced: was counted from `calendar.bookings` → now from `unified.tasks WHERE intent_type = 'calendar_booking'`

**Frontend change:**
```js
// OLD
supabase.rpc('find_next_available', {
  p_event_type_id: eventTypeId,
  p_required_skill: skillId,  // was a UUID from calendar.skills
  p_territory_id: territoryId
})

// NEW — no skill param; set required_skill_name on the event type
// Result now includes resource_kind
supabase.schema('cal').rpc('find_next_available', {
  p_event_type_id: eventTypeId,
  p_territory_id: territoryId
})
// Response: { resource_id, resource_kind, slot_start, slot_end }
```

---

### 4c. `calendar.book_appointment()` → `cal.book_appointment()`

**Old signature:**
```sql
calendar.book_appointment(
  p_event_type_id  uuid,
  p_slot_start     timestamptz,
  p_invitee_name   text,
  p_invitee_email  text,
  p_resource_id    uuid        DEFAULT NULL,
  p_invitee_phone  text        DEFAULT NULL,
  p_invitee_notes  text        DEFAULT NULL,
  p_timezone       text        DEFAULT 'UTC',
  p_metadata       jsonb       DEFAULT '{}'
) RETURNS jsonb
```

**New signature:**
```sql
cal.book_appointment(
  p_event_type_id  uuid,
  p_slot_start     timestamptz,
  p_invitee_name   text,
  p_invitee_email  text,
  p_resource_id    uuid        DEFAULT NULL,
  p_resource_kind  text        DEFAULT 'contact',  -- NEW
  p_invitee_phone  text        DEFAULT NULL,
  p_invitee_notes  text        DEFAULT NULL,
  p_timezone       text        DEFAULT 'UTC',
  p_location_id    uuid        DEFAULT NULL,        -- NEW (was in metadata before)
  p_metadata       jsonb       DEFAULT '{}'
) RETURNS jsonb
```

**What changed internally:**
- Resource lookup: was `FROM calendar.resources` → now `cal.resolve_resource()` → `unified.contacts` or `unified.assets`
- Auto-confirm: was `FROM unified.resource_calendars rc WHERE rc.id = (SELECT calendar_id FROM calendar.resources WHERE id = p_resource_id)` → now directly `rc.id = v_res.calendar_id`
- Creates **only** `unified.tasks` (no `calendar.bookings` INSERT)
- Stores all invitee data + event_type_id + resource_id/kind in `unified.tasks.details`
- `raci.responsible` = `v_res.user_id` (contact's platform user, if any)

**Return value changes:**
```jsonc
// OLD return
{
  "booking_id": "uuid",
  "confirmation_code": "ABCD1234",
  "start_time": "2026-06-15T10:00:00Z",
  "end_time": "2026-06-15T10:30:00Z",
  "status": "IN_PROGRESS",
  "auto_confirmed": true
}

// NEW return (adds resource_kind and resource_name)
{
  "booking_id": "uuid",
  "confirmation_code": "ABCD1234",
  "start_time": "2026-06-15T10:00:00Z",
  "end_time": "2026-06-15T10:30:00Z",
  "resource_id": "uuid",
  "resource_kind": "contact",
  "resource_name": "Dr. Sarah Chen",
  "status": "IN_PROGRESS",
  "auto_confirmed": true
}
```

**Frontend call change:**
```js
// OLD
supabase.rpc('book_appointment', {
  p_event_type_id: eventTypeId,
  p_slot_start: '2026-06-15T10:00:00+05:30',
  p_invitee_name: 'Jane Doe',
  p_invitee_email: 'jane@example.com',
  p_resource_id: resourceId,
  p_timezone: 'Asia/Kolkata'
})

// NEW — same params, add p_resource_kind; move location out of metadata
supabase.schema('cal').rpc('book_appointment', {
  p_event_type_id: eventTypeId,
  p_slot_start: '2026-06-15T10:00:00+05:30',
  p_invitee_name: 'Jane Doe',
  p_invitee_email: 'jane@example.com',
  p_resource_id: resourceId,
  p_resource_kind: 'contact',  // new
  p_timezone: 'Asia/Kolkata',
  p_location_id: locationId   // new (optional; was in p_metadata before)
})
```

---

### 4d. `calendar.cancel_booking()` → `cal.cancel_booking()`

**Signature: identical.**
```sql
cal.cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL) RETURNS jsonb
```

**What changed internally:**
- Was: `UPDATE calendar.bookings SET state_category = 'CLOSED_LOST'`
- Now: `UPDATE unified.tasks SET state_category = 'CLOSED_LOST'` WHERE `intent_type = 'calendar_booking'`
- Cancellation reason stored in `unified.tasks.details->>'cancellation_reason'`
- Auth check: same — either authenticated (org match) or anon with `app.booking_code` set_config

**No frontend change needed for the call signature.** Just change the schema:
```js
supabase.schema('cal').rpc('cancel_booking', { p_booking_id: id, p_reason: reason })
```

---

### 4e. `calendar.reschedule_booking()` → `cal.reschedule_booking()`

**Old signature:**
```sql
calendar.reschedule_booking(
  p_booking_id  uuid,
  p_new_start   timestamptz,
  p_new_resource uuid DEFAULT NULL
) RETURNS jsonb
```

**New signature:**
```sql
cal.reschedule_booking(
  p_booking_id         uuid,
  p_new_start          timestamptz,
  p_new_resource_id    uuid DEFAULT NULL,
  p_new_resource_kind  text DEFAULT NULL  -- NEW: 'contact' | 'asset'
) RETURNS jsonb
```

**What changed:**
- `p_new_resource` renamed to `p_new_resource_id`; `p_new_resource_kind` added
- Was: looked up current resource from `calendar.bookings.assigned_resource_id`
- Now: reads current resource from `unified.tasks.details->>'assigned_resource_id'` and `details->>'assigned_resource_kind'`
- Conflict check and update now target `unified.tasks` directly

---

### 4f. INSTEAD OF triggers — DROPPED (no replacement needed)

The original POC had three INSTEAD OF triggers on views:
- `calendar.trg_v_bookings_shard()` on `calendar.v_bookings`
- `calendar.trg_v_resources_shard()` on `calendar.v_resources`
- `calendar.trg_v_synced_events_shard()` on `calendar.v_synced_events`

These are **completely removed**. Writes no longer go through view triggers.

| Old write path | New write path |
|---|---|
| `INSERT INTO calendar.v_bookings` | Call `cal.book_appointment()` RPC |
| `UPDATE calendar.v_bookings` | `UPDATE unified.tasks` directly or `cal.cancel_booking()` / `cal.reschedule_booking()` |
| `INSERT INTO calendar.v_resources` | `UPDATE unified.contacts SET booking_enabled = true` |
| `UPDATE calendar.v_resources` | `UPDATE unified.contacts` or `UPDATE unified.assets` |
| `INSERT INTO calendar.v_synced_events` | `INSERT INTO cal.blocked_windows` (sync edge function) |

---

### 4g. New helper function (internal, available if needed)

```sql
cal.resolve_resource(p_resource_id uuid, p_resource_kind text)
RETURNS TABLE (id, organization_id, name, user_id, calendar_id, timezone, booking_enabled, max_concurrent)
```
Returns unified resource record regardless of whether it's a contact or asset. Useful for API routes that need resource details without knowing the kind ahead of time.

---

## 5. View-by-view map

### 5a. `calendar.v_bookings` → `cal.v_bookings`

Both are views. The old one joined `calendar.bookings` + `unified.tasks` (for time). The new one reads `unified.tasks` directly.

| Old column | New column | Change |
|---|---|---|
| `id` | `booking_id` | **Renamed** |
| `organization_id` | `organization_id` | Same |
| `event_type_id` | `event_type_id` | From `details->>'event_type_id'` |
| `event_type_title` | `event_type_title` | From `details->>'event_type_title'` (denormalized) |
| *(new)* | `event_type_slug` | From `details->>'event_type_slug'` |
| `assigned_resource_id` | `assigned_resource_id` | From `details->>'assigned_resource_id'` |
| *(new)* | `assigned_resource_kind` | `'contact'` or `'asset'` |
| *(new)* | `assigned_resource_name` | Denormalized |
| `resource_name` | `assigned_resource_name` | Renamed |
| `resource_email` | *(removed)* | Query `unified.contacts.email` directly if needed |
| `invitee_name` | `invitee_name` | Same (from details JSONB) |
| `invitee_email` | `invitee_email` | Same |
| `invitee_notes` | `invitee_notes` | Same |
| `timezone` | `timezone` | Same |
| *(new)* | `confirmation_code` | New field |
| *(new)* | `reschedule_count` | New field |
| *(new)* | `cancellation_reason` | New field |
| `state_category` | `status` | **Renamed** (same values) |
| `scheduled_start` | `scheduled_start` | Same |
| `scheduled_end` | `scheduled_end` | Same |
| `location_id` | `location_id` | From details JSONB |
| `location_name` | `location_name` | Via JOIN to identity.locations |
| `metadata` | *(removed as separate column)* | All in `unified.tasks.details` |
| `is_active` | *(removed from view)* | Query `unified.tasks.is_active` directly |
| `created_at` / `updated_at` | `created_at` / `updated_at` | Same |

**Query the view:**
```sql
-- List all bookings for an org
SELECT * FROM cal.v_bookings WHERE organization_id = $org_id ORDER BY scheduled_start;

-- Find booking by confirmation code (anon)
SELECT * FROM cal.v_bookings WHERE confirmation_code = $code;

-- Find booking by invitee email
SELECT * FROM cal.v_bookings WHERE invitee_email = $email AND status NOT IN ('CLOSED_WON','CLOSED_LOST');
```

---

### 5b. `calendar.v_resources` → `cal.v_bookable_resources`

**Renamed.** This is now a UNION view over `unified.contacts` and `unified.assets`.

| Old column | New column | Notes |
|---|---|---|
| `id` | `id` | Same |
| `organization_id` | `organization_id` | Same |
| `type` | `type` | From `resource_type` (contacts) / `asset_type` (assets) |
| `name` | `name` | Same |
| `email` | `email` | Contacts only; NULL for assets |
| `phone` | `phone` | Contacts only; NULL for assets |
| `timezone` | `timezone` | From `booking_timezone` |
| `user_id` | `user_id` | Contacts only; NULL for assets |
| `user_display_name` | *(removed)* | Join `identity.users` in your query if needed |
| `user_email` | *(removed)* | Join `identity.users` if needed |
| `metadata` | *(removed)* | Use `unified.contacts.details` / `unified.assets.details` |
| `avatar_url` | *(removed)* | `unified.contacts.details->>'avatar_url'` |
| *(new)* | `resource_kind` | `'contact'` or `'asset'` — **always present** |
| *(new)* | `skills` | `text[]` from unified.contacts |
| *(new)* | `certifications` | `text[]` from unified.contacts |
| *(new)* | `calendar_id` | FK → unified.resource_calendars |
| *(new)* | `calendar_name` | Resolved display name |
| *(new)* | `slot_duration_minutes` | From resource_calendars |
| *(new)* | `min_advance_hours` | From resource_calendars |
| *(new)* | `max_advance_days` | From resource_calendars |
| *(new)* | `auto_confirm` | From resource_calendars |

---

### 5c. `calendar.v_synced_events` → `cal.v_blocked_windows`

**Renamed.** No longer bonded to tasks.

| Old column | New column | Notes |
|---|---|---|
| `id` (was tasks.id) | `id` | Now cal.blocked_windows own PK |
| `organization_id` | `organization_id` | Same |
| `calendar_integration_id` | `calendar_integration_id` | Same |
| `external_event_id` | `external_ref` | Renamed |
| `provider` | `integration_provider` | Resolved from cal.calendar_integrations |
| `is_blocking` | `is_blocking` | Same |
| `is_all_day` | `is_all_day` | Same |
| `location` | *(in raw_payload)* | `raw_payload->>'location'` |
| `synced_at` | `synced_at` | Same |
| `name` (from tasks) | `title` | Renamed, now on blocked_windows directly |
| `start_time` (from tasks.scheduled_start) | `start_time` | **Direct on row now** |
| `end_time` (from tasks.scheduled_end) | `end_time` | **Direct on row now** |
| `resource_name` | `resource_name` | Resolved from unified.contacts/assets |
| `resource_type` | *(resolved inline)* | Available in v_blocked_windows |
| `resource_user_id` | *(removed)* | Query unified.contacts.user_id if needed |
| *(new)* | `resource_kind` | `'contact'` or `'asset'` |
| *(new)* | `source` | `'google'/'microsoft'/'apple'/'ical'/'manual'` |
| *(new)* | `reason` | For manual blocks |

---

## 6. Queries that need updating

### 6a. Public booking page — availability

```js
// OLD: no resource_kind needed
const { data } = await supabase.rpc('get_available_slots', {
  p_resource_id: id, p_event_type_id: etId,
  p_date_from: '2026-06-15', p_date_to: '2026-06-22'
})

// NEW: must pass resource_kind
const { data } = await supabase.schema('cal').rpc('get_available_slots', {
  p_resource_id: id, p_resource_kind: 'contact',  // ← add this
  p_event_type_id: etId,
  p_date_from: '2026-06-15', p_date_to: '2026-06-22'
})
```

### 6b. Reading resources for a booking page

```js
// OLD
const { data } = await supabase
  .from('resources')
  .select('id, name, email, type, timezone')
  .eq('organization_id', orgId)

// NEW: use the view or query unified.contacts directly
const { data } = await supabase.schema('cal')
  .from('v_bookable_resources')
  .select('id, resource_kind, name, email, type, timezone, skills, calendar_name')
  .eq('organization_id', orgId)
```

### 6c. Reading bookings (admin)

```js
// OLD
const { data } = await supabase
  .schema('calendar')
  .from('v_bookings')
  .select('*')
  .eq('organization_id', orgId)

// NEW
const { data } = await supabase
  .schema('cal')
  .from('v_bookings')
  .select('*')
  .eq('organization_id', orgId)
// Note: status (was state_category in old view), booking_id (was id)
```

### 6d. Inserting into calendar_integrations

```js
// OLD
await supabase.from('calendar_integrations').insert({
  resource_id: calendarResourceId,  // was calendar.resources.id
  provider: 'google', ...
})

// NEW
await supabase.schema('cal').from('calendar_integrations').insert({
  contact_id: unifiedContactId,  // unified.contacts.id — renamed field
  provider: 'google', ...
})
```

### 6e. Inserting into event_type_resources

```js
// OLD
await supabase.from('event_type_resources').insert({
  event_type_id: etId,
  resource_id: calResourceId,  // calendar.resources.id
  role: 'primary'
})

// NEW — must include resource_kind
await supabase.schema('cal').from('event_type_resources').insert({
  event_type_id: etId,
  resource_id: contactOrAssetId,  // unified.contacts.id or unified.assets.id
  resource_kind: 'contact',       // ← required new field
  role: 'primary'
})
```

### 6f. Syncing external calendar events (edge function)

```js
// OLD: sync edge function did two inserts
await supabase.from('unified.tasks').insert({ intent_type: 'calendar_sync', ... })
await supabase.from('calendar.synced_events').insert({ id: taskId, ... })

// NEW: single insert into cal.blocked_windows
await supabase.schema('cal').from('blocked_windows').insert({
  organization_id: orgId,
  resource_id: contactId,
  resource_kind: 'contact',
  calendar_integration_id: integrationId,
  start_time: event.start,
  end_time: event.end,
  is_blocking: !event.isTentative,
  source: 'google',
  external_ref: event.id,
  title: event.summary,
  raw_payload: event
})
```

---

## 7. New columns that must be set when creating resources

These columns are new on `unified.contacts` and `unified.assets` (added in migration 20260611000400). They default to `false`/`1`/`'UTC'` so existing records are not bookable until opted in.

| Column | Table | Default | Purpose |
|---|---|---|---|
| `booking_enabled` | `unified.contacts` | `false` | Must be `true` for the resource to appear in `cal.v_bookable_resources` and be assignable |
| `booking_enabled` | `unified.assets` | `false` | Same |
| `max_concurrent_bookings` | `unified.contacts` | `1` | How many simultaneous bookings this resource can hold |
| `max_concurrent_bookings` | `unified.assets` | `1` | Same |
| `booking_timezone` | `unified.contacts` | `'UTC'` | Resource's local timezone for slot computation |
| `booking_timezone` | `unified.assets` | `'UTC'` | Same |

The `calendar_id` column (FK → `unified.resource_calendars`) was added in migration `20260611000100` and carries the resource's named availability schedule template (slot duration, advance booking window, auto-confirm setting).

---

## 8. Migration checklist for frontend

- [ ] Replace all `supabase.schema('calendar')` with `supabase.schema('cal')`
- [ ] `get_available_slots`: add `p_resource_kind` parameter
- [ ] `find_next_available`: remove `p_required_skill` param; handle new `resource_kind` in return value; set `required_skill_name` on the event type instead
- [ ] `book_appointment`: add `p_resource_kind`; move `location_id` out of metadata into dedicated param
- [ ] `reschedule_booking`: rename `p_new_resource` → `p_new_resource_id`; add `p_new_resource_kind`
- [ ] Stop writing to `v_bookings`, `v_resources`, `v_synced_events` via INSTEAD OF triggers — use RPCs and direct table writes
- [ ] Replace `calendar.resources` reads with `cal.v_bookable_resources` or `unified.contacts`/`unified.assets` queries
- [ ] Replace `calendar.synced_events` writes with `cal.blocked_windows` inserts (no task creation needed)
- [ ] Update `calendar_integrations` inserts: `resource_id` → `contact_id`
- [ ] Update `event_type_resources` inserts: add `resource_kind`
- [ ] Update `event_type_resources` reads: handle new `resource_kind` column
- [ ] Replace `v_resources` references with `cal.v_bookable_resources`
- [ ] Replace `v_synced_events` references with `cal.v_blocked_windows`
- [ ] In `v_bookings` consumers: `id` → `booking_id`; `state_category` → `status`
- [ ] Set `booking_enabled = true` on `unified.contacts`/`unified.assets` for bookable resources (replaces `INSERT INTO calendar.resources`)
- [ ] Set `booking_timezone` on contacts/assets that had non-UTC timezones in `calendar.resources`

---

## 9. What did NOT change

- All public slot query endpoints remain callable by `anon` (no JWT required)
- State category values: `NEW`, `IN_PROGRESS`, `CLOSED_WON`, `CLOSED_LOST`, `ON_HOLD` — unchanged
- `cal.use_case_configs`, `cal.territories`, `cal.client_credits` — structure identical to old `calendar.*`
- `cal.event_types` booking modes, assignment strategies — same CHECK constraint values
- `cal.resource_availability_rules` columns (`day_of_week`, `start_time`, `end_time`, `is_available`) — same
- `cal.calendar_integrations` OAuth columns — same (only `resource_id` → `contact_id` renamed)
- Confirmation code self-service: anon can still read own booking by setting `app.booking_code` via `set_config`
- Credit deduction in `book_appointment` — same logic, same `cal.client_credits` table
