--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: cal; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA cal;


--
-- Name: book_appointment(uuid, timestamp with time zone, text, text, uuid, text, text, text, text, uuid, jsonb); Type: FUNCTION; Schema: cal; Owner: -
--

CREATE FUNCTION cal.book_appointment(p_event_type_id uuid, p_slot_start timestamp with time zone, p_invitee_name text, p_invitee_email text, p_resource_id uuid DEFAULT NULL::uuid, p_resource_kind text DEFAULT 'contact'::text, p_invitee_phone text DEFAULT NULL::text, p_invitee_notes text DEFAULT NULL::text, p_timezone text DEFAULT 'UTC'::text, p_location_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'cal', 'unified', 'identity', 'public'
    AS $$
DECLARE
  v_et           cal.event_types%ROWTYPE;
  v_res          record;
  v_slot_end     timestamptz;
  v_task_id      uuid    := gen_random_uuid();
  v_confirm_code text;
  v_org_id       uuid;
  v_state_cat    text;
  v_auto_confirm boolean;
  v_next         record;
BEGIN
  SELECT * INTO v_et FROM cal.event_types WHERE id = p_event_type_id AND is_active;
  IF v_et IS NULL THEN
    RAISE EXCEPTION 'Event type not found or inactive: %', p_event_type_id;
  END IF;

  -- Auto-assign if no resource given
  IF p_resource_id IS NULL THEN
    SELECT n.resource_id, n.resource_kind, n.slot_start, n.slot_end INTO v_next
    FROM cal.find_next_available(
      p_event_type_id, p_slot_start,
      p_slot_start + make_interval(mins => v_et.duration_minutes + 1)
    ) n LIMIT 1;
    IF v_next IS NULL THEN
      RAISE EXCEPTION 'No available resource for the requested slot';
    END IF;
    p_resource_id   := v_next.resource_id;
    p_resource_kind := v_next.resource_kind;
  END IF;

  -- Resolve resource from unified layer
  SELECT * INTO v_res
  FROM cal.resolve_resource(p_resource_id, p_resource_kind)
  WHERE booking_enabled = true;
  IF v_res IS NULL THEN
    RAISE EXCEPTION 'Resource not found or not booking-enabled: % (%)', p_resource_id, p_resource_kind;
  END IF;

  v_org_id   := COALESCE(v_et.organization_id, v_res.organization_id);
  v_slot_end := p_slot_start + make_interval(mins => v_et.duration_minutes);

  -- Auto-confirm from calendar template
  SELECT COALESCE(rc.auto_confirm, true) INTO v_auto_confirm
  FROM unified.resource_calendars rc WHERE rc.id = v_res.calendar_id;
  v_auto_confirm := COALESCE(v_auto_confirm, true);
  v_state_cat    := CASE WHEN v_auto_confirm THEN 'IN_PROGRESS' ELSE 'NEW' END;

  v_confirm_code := upper(left(md5(v_task_id::text || p_invitee_email || p_slot_start::text), 8));

  -- Credit check
  IF COALESCE(v_et.credit_cost, 0) > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM cal.client_credits
      WHERE client_email      = p_invitee_email
        AND event_type_id     = p_event_type_id
        AND credits_remaining >= v_et.credit_cost
        AND (expires_at IS NULL OR expires_at > now())
    ) THEN
      RAISE EXCEPTION 'Insufficient credits for % (cost: %)', p_invitee_email, v_et.credit_cost;
    END IF;
  END IF;

  -- Conflict check
  IF EXISTS (
    SELECT 1 FROM unified.tasks t
    WHERE t.intent_type     = 'calendar_booking'
      AND t.state_category NOT IN ('CLOSED_WON','CLOSED_LOST')
      AND t.scheduled_start < v_slot_end
      AND t.scheduled_end   > p_slot_start
      AND (t.details->>'assigned_resource_id')::uuid = p_resource_id
      AND  t.details->>'assigned_resource_kind'      = p_resource_kind
  ) THEN
    RAISE EXCEPTION 'Slot no longer available: % – %', p_slot_start, v_slot_end;
  END IF;

  -- Create booking as unified task
  PERFORM core.api_new_core_upsert_data(
    'unified.tasks',
    jsonb_strip_nulls(jsonb_build_object(
      'id',              v_task_id,
      'organization_id', v_org_id,
      'name',            v_et.title || ' — ' || p_invitee_name,
      'intent_type',     'calendar_booking',
      'task_type',       'appointment',
      'module',          'calendar',
      'state_category',  v_state_cat,
      'scheduled_start', p_slot_start::text,
      'scheduled_end',   v_slot_end::text,
      'raci',            jsonb_build_object('responsible', v_res.user_id),
      'details',         jsonb_build_object(
          'invitee_name',           p_invitee_name,
          'invitee_email',          p_invitee_email,
          'invitee_phone',          p_invitee_phone,
          'invitee_notes',          p_invitee_notes,
          'timezone',               p_timezone,
          'confirmation_code',      v_confirm_code,
          'event_type_id',          p_event_type_id::text,
          'event_type_title',       v_et.title,
          'event_type_slug',        v_et.slug,
          'assigned_resource_id',   p_resource_id::text,
          'assigned_resource_kind', p_resource_kind,
          'assigned_resource_name', v_res.name,
          'location_id',            p_location_id::text,
          'assignment_strategy',    v_et.assignment_strategy,
          'reschedule_count',       0
      ) || COALESCE(p_metadata, '{}')
    ))
  );

  -- Deduct credits
  IF COALESCE(v_et.credit_cost, 0) > 0 THEN
    UPDATE cal.client_credits
    SET credits_remaining = credits_remaining - v_et.credit_cost, updated_at = now()
    WHERE client_email = p_invitee_email AND event_type_id = p_event_type_id;
  END IF;

  RETURN jsonb_build_object(
    'booking_id',        v_task_id,
    'confirmation_code', v_confirm_code,
    'start_time',        p_slot_start,
    'end_time',          v_slot_end,
    'resource_id',       p_resource_id,
    'resource_kind',     p_resource_kind,
    'resource_name',     v_res.name,
    'status',            v_state_cat,
    'auto_confirmed',    v_auto_confirm
  );
END;
$$;


--
-- Name: cancel_booking(uuid, text); Type: FUNCTION; Schema: cal; Owner: -
--

CREATE FUNCTION cal.cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'cal', 'unified', 'identity', 'public'
    AS $$
DECLARE v_rows integer;
BEGIN
  UPDATE unified.tasks
  SET state_category = 'CLOSED_LOST',
      details    = details || jsonb_strip_nulls(jsonb_build_object(
        'cancellation_reason', p_reason,
        'cancelled_at',        now()::text
      )),
      updated_at = now()
  WHERE id          = p_booking_id
    AND intent_type = 'calendar_booking'
    AND state_category NOT IN ('CLOSED_WON','CLOSED_LOST')
    AND (
      organization_id = identity.get_current_org_id()
      OR (details->>'confirmation_code') = current_setting('app.booking_code', true)
    );
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Booking not found, already closed, or access denied: %', p_booking_id;
  END IF;
  RETURN jsonb_build_object('booking_id', p_booking_id, 'status', 'CLOSED_LOST');
END;
$$;


--
-- Name: find_next_available(uuid, timestamp with time zone, timestamp with time zone, uuid); Type: FUNCTION; Schema: cal; Owner: -
--

CREATE FUNCTION cal.find_next_available(p_event_type_id uuid, p_preferred_from timestamp with time zone DEFAULT now(), p_preferred_to timestamp with time zone DEFAULT (now() + '7 days'::interval), p_territory_id uuid DEFAULT NULL::uuid) RETURNS TABLE(resource_id uuid, resource_kind text, slot_start timestamp with time zone, slot_end timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'cal', 'unified', 'identity', 'public'
    AS $$
DECLARE
  v_et    cal.event_types%ROWTYPE;
  v_rec   record;
  v_slot  record;
BEGIN
  SELECT * INTO v_et FROM cal.event_types WHERE id = p_event_type_id AND is_active;
  IF v_et IS NULL THEN RETURN; END IF;

  FOR v_rec IN
    SELECT etr.resource_id, etr.resource_kind
    FROM cal.event_type_resources etr
    -- Skill-based filter: require skill name in unified.contacts.skills[]
    WHERE etr.event_type_id = p_event_type_id
      AND (
        v_et.required_skill_name IS NULL
        OR (etr.resource_kind = 'contact' AND EXISTS (
          SELECT 1 FROM unified.contacts c
          WHERE c.id = etr.resource_id
            AND c.skills @> ARRAY[v_et.required_skill_name]
        ))
      )
      -- Booking-enabled check from unified layer
      AND (
        (etr.resource_kind = 'contact' AND EXISTS (
          SELECT 1 FROM unified.contacts c WHERE c.id = etr.resource_id AND c.booking_enabled AND c.is_active
        ))
        OR (etr.resource_kind = 'asset' AND EXISTS (
          SELECT 1 FROM unified.assets a WHERE a.id = etr.resource_id AND a.booking_enabled AND a.is_active
        ))
      )
      -- Territory filter
      AND (p_territory_id IS NULL OR EXISTS (
        SELECT 1 FROM cal.resource_territories rt
        WHERE rt.resource_id = etr.resource_id AND rt.resource_kind = etr.resource_kind
          AND rt.territory_id = p_territory_id
      ))
    ORDER BY
      -- load-balanced: fewest bookings in window
      CASE WHEN v_et.assignment_strategy IN ('load-balanced','weighted_round_robin') THEN
        (SELECT count(*) FROM unified.tasks t
         WHERE t.intent_type = 'calendar_booking'
           AND t.state_category NOT IN ('CLOSED_WON','CLOSED_LOST')
           AND (t.details->>'assigned_resource_id')::uuid = etr.resource_id
           AND t.scheduled_start BETWEEN p_preferred_from AND p_preferred_to)
      ELSE 0 END ASC,
      -- round-robin: least recently assigned first
      CASE WHEN v_et.assignment_strategy = 'round-robin' THEN
        COALESCE(
          (SELECT max(t.created_at) FROM unified.tasks t
           WHERE t.intent_type = 'calendar_booking'
             AND (t.details->>'assigned_resource_id')::uuid = etr.resource_id),
          '1970-01-01'::timestamptz
        )
      ELSE now() END ASC,
      etr.resource_id ASC
  LOOP
    FOR v_slot IN
      SELECT s.slot_start, s.slot_end
      FROM cal.get_available_slots(
        v_rec.resource_id, v_rec.resource_kind,
        p_event_type_id,
        p_preferred_from::date, p_preferred_to::date
      ) s
      WHERE s.is_available = true
        AND s.slot_start >= p_preferred_from
        AND s.slot_end   <= p_preferred_to
      ORDER BY s.slot_start
      LIMIT 1
    LOOP
      RETURN QUERY SELECT v_rec.resource_id, v_rec.resource_kind, v_slot.slot_start, v_slot.slot_end;
      RETURN;
    END LOOP;
  END LOOP;
END;
$$;


--
-- Name: get_available_slots(uuid, text, uuid, date, date); Type: FUNCTION; Schema: cal; Owner: -
--

CREATE FUNCTION cal.get_available_slots(p_resource_id uuid, p_resource_kind text, p_event_type_id uuid, p_date_from date, p_date_to date) RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, is_available boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'cal', 'unified', 'identity', 'public'
    AS $$
DECLARE
  v_et         cal.event_types%ROWTYPE;
  v_res        record;
  v_tz         text;
  v_dur        integer;
  v_step       integer;
  v_min_adv    interval;
  v_max_date   date;
BEGIN
  SELECT * INTO v_et FROM cal.event_types WHERE id = p_event_type_id AND is_active;
  SELECT * INTO v_res FROM cal.resolve_resource(p_resource_id, p_resource_kind)
  WHERE booking_enabled = true;

  IF v_et IS NULL OR v_res IS NULL THEN RETURN; END IF;

  v_tz   := v_res.timezone;
  v_dur  := v_et.duration_minutes;
  v_step := v_dur + COALESCE(v_et.buffer_minutes, 0);

  -- Booking horizon from the resource's calendar template
  SELECT
    make_interval(hours => COALESCE(rc.min_advance_hours, 1)),
    LEAST(p_date_to, (CURRENT_DATE + COALESCE(rc.max_advance_days, 60))::date)
  INTO v_min_adv, v_max_date
  FROM unified.resource_calendars rc WHERE rc.id = v_res.calendar_id;

  v_min_adv  := COALESCE(v_min_adv,  '1 hour'::interval);
  v_max_date := COALESCE(v_max_date, p_date_to);

  RETURN QUERY
  WITH
    -- Weekly availability windows from normalized rules
    weekly_windows AS (
      SELECT
        (d.dt + rar.start_time) AT TIME ZONE v_tz AS win_start,
        (d.dt + rar.end_time)   AT TIME ZONE v_tz AS win_end
      FROM generate_series(
             GREATEST(p_date_from, CURRENT_DATE)::timestamp,
             v_max_date::timestamp,
             '1 day'::interval
           ) AS d(dt)
      JOIN cal.resource_availability_rules rar
        ON  rar.resource_id   = p_resource_id
        AND rar.resource_kind = p_resource_kind
        AND rar.day_of_week   = EXTRACT(DOW FROM d.dt)::integer
        AND rar.is_available  = true
        AND rar.end_time > rar.start_time
      -- Suppress if a date override exists for this day
      WHERE NOT EXISTS (
        SELECT 1 FROM unified.resource_unavailability u
        WHERE u.resource_id   = p_resource_id
          AND u.resource_kind = p_resource_kind
          AND d.dt::date BETWEEN u.start_time::date AND u.end_time::date
      )
    ),
    all_windows AS (SELECT * FROM weekly_windows),
    -- Chop windows into candidate slots
    candidate_slots AS (
      SELECT
        w.win_start + (gs.offset_mins || ' minutes')::interval           AS s_start,
        w.win_start + ((gs.offset_mins + v_dur) || ' minutes')::interval AS s_end
      FROM all_windows w
      JOIN generate_series(
             0,
             EXTRACT(EPOCH FROM (w.win_end - w.win_start))::integer / 60 - v_dur,
             v_step
           ) AS gs(offset_mins) ON true
      WHERE EXTRACT(EPOCH FROM (w.win_end - w.win_start))::integer / 60 >= v_dur
    ),
    valid_slots AS (
      SELECT DISTINCT s_start, s_end
      FROM candidate_slots
      WHERE s_start > now() + v_min_adv
      ORDER BY s_start
    )
  SELECT
    vs.s_start,
    vs.s_end,
    NOT (
      -- Conflict: existing booking task for this resource in this window
      EXISTS (
        SELECT 1 FROM unified.tasks t
        WHERE t.intent_type     = 'calendar_booking'
          AND t.state_category NOT IN ('CLOSED_WON','CLOSED_LOST')
          AND t.scheduled_start < vs.s_end
          AND t.scheduled_end   > vs.s_start
          AND (t.details->>'assigned_resource_id')::uuid    = p_resource_id
          AND  t.details->>'assigned_resource_kind'         = p_resource_kind
      )
      OR
      -- Conflict: blocking external window for this resource
      EXISTS (
        SELECT 1 FROM cal.blocked_windows bw
        WHERE bw.resource_id   = p_resource_id
          AND bw.resource_kind = p_resource_kind
          AND bw.is_blocking   = true
          AND bw.is_active     = true
          AND bw.start_time    < vs.s_end
          AND bw.end_time      > vs.s_start
      )
    ) AS is_available
  FROM valid_slots vs;
END;
$$;


--
-- Name: reschedule_booking(uuid, timestamp with time zone, uuid, text); Type: FUNCTION; Schema: cal; Owner: -
--

CREATE FUNCTION cal.reschedule_booking(p_booking_id uuid, p_new_start timestamp with time zone, p_new_resource_id uuid DEFAULT NULL::uuid, p_new_resource_kind text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'cal', 'unified', 'identity', 'public'
    AS $$
DECLARE
  v_task        unified.tasks%ROWTYPE;
  v_et          cal.event_types%ROWTYPE;
  v_new_end     timestamptz;
  v_rid         uuid;
  v_rkind       text;
  v_reschedules integer;
BEGIN
  SELECT * INTO v_task
  FROM unified.tasks
  WHERE id = p_booking_id AND intent_type = 'calendar_booking'
    AND state_category NOT IN ('CLOSED_WON','CLOSED_LOST');
  IF v_task IS NULL THEN
    RAISE EXCEPTION 'Booking not reschedulable: %', p_booking_id;
  END IF;

  SELECT * INTO v_et FROM cal.event_types
  WHERE id = (v_task.details->>'event_type_id')::uuid;

  v_rid     := COALESCE(p_new_resource_id,   (v_task.details->>'assigned_resource_id')::uuid);
  v_rkind   := COALESCE(p_new_resource_kind,  v_task.details->>'assigned_resource_kind');
  v_new_end := p_new_start + make_interval(mins => v_et.duration_minutes);
  v_reschedules := COALESCE((v_task.details->>'reschedule_count')::integer, 0) + 1;

  -- Conflict check (excluding this booking)
  IF EXISTS (
    SELECT 1 FROM unified.tasks t
    WHERE t.intent_type     = 'calendar_booking'
      AND t.id             <> p_booking_id
      AND t.state_category NOT IN ('CLOSED_WON','CLOSED_LOST')
      AND t.scheduled_start < v_new_end
      AND t.scheduled_end   > p_new_start
      AND (t.details->>'assigned_resource_id')::uuid = v_rid
      AND  t.details->>'assigned_resource_kind'      = v_rkind
  ) THEN
    RAISE EXCEPTION 'New slot not available: % – %', p_new_start, v_new_end;
  END IF;

  UPDATE unified.tasks
  SET scheduled_start = p_new_start,
      scheduled_end   = v_new_end,
      details = details || jsonb_build_object(
        'reschedule_count',       v_reschedules,
        'assigned_resource_id',   v_rid::text,
        'assigned_resource_kind', v_rkind,
        'last_rescheduled_at',    now()::text
      ),
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'booking_id',       p_booking_id,
    'new_start',        p_new_start,
    'new_end',          v_new_end,
    'resource_id',      v_rid,
    'resource_kind',    v_rkind,
    'reschedule_count', v_reschedules
  );
END;
$$;


--
-- Name: resolve_resource(uuid, text); Type: FUNCTION; Schema: cal; Owner: -
--

CREATE FUNCTION cal.resolve_resource(p_resource_id uuid, p_resource_kind text) RETURNS TABLE(id uuid, organization_id uuid, name text, user_id uuid, calendar_id uuid, timezone text, booking_enabled boolean, max_concurrent integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'unified', 'cal', 'public'
    AS $$
  SELECT
    c.id, c.organization_id, c.name,
    (c.details->>'user_id')::uuid AS user_id, c.calendar_id,
    COALESCE(c.booking_timezone, 'UTC'),
    c.booking_enabled,
    c.max_concurrent_bookings
  FROM unified.contacts c
  WHERE c.id = p_resource_id AND p_resource_kind = 'contact'
  UNION ALL
  SELECT
    a.id, a.organization_id, a.name,
    NULL::uuid AS user_id, a.calendar_id,
    COALESCE(a.booking_timezone, 'UTC'),
    a.booking_enabled,
    a.max_concurrent_bookings
  FROM unified.assets a
  WHERE a.id = p_resource_id AND p_resource_kind = 'asset'
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: blocked_windows; Type: TABLE; Schema: cal; Owner: -
--

CREATE TABLE cal.blocked_windows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    resource_kind text NOT NULL,
    calendar_integration_id uuid,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    is_blocking boolean DEFAULT true NOT NULL,
    is_all_day boolean DEFAULT false NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    external_ref text,
    title text,
    reason text,
    raw_payload jsonb DEFAULT '{}'::jsonb,
    synced_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT blocked_windows_resource_kind_check CHECK ((resource_kind = ANY (ARRAY['contact'::text, 'asset'::text]))),
    CONSTRAINT blocked_windows_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'google'::text, 'microsoft'::text, 'apple'::text, 'ical'::text])))
);

ALTER TABLE ONLY cal.blocked_windows FORCE ROW LEVEL SECURITY;


--
-- Name: calendar_integrations; Type: TABLE; Schema: cal; Owner: -
--

CREATE TABLE cal.calendar_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    provider text NOT NULL,
    provider_account_email text,
    access_token_encrypted text,
    refresh_token_encrypted text,
    token_expires_at timestamp with time zone,
    calendar_id text,
    sync_direction text DEFAULT 'read-only'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    auto_sync_enabled boolean DEFAULT true NOT NULL,
    sync_interval_minutes integer DEFAULT 15 NOT NULL,
    last_sync_at timestamp with time zone,
    last_sync_status text DEFAULT 'pending'::text,
    last_sync_error text,
    webhook_url text,
    webhook_secret text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT calendar_integrations_last_sync_status_check CHECK ((last_sync_status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'syncing'::text]))),
    CONSTRAINT calendar_integrations_provider_check CHECK ((provider = ANY (ARRAY['google'::text, 'microsoft'::text, 'apple'::text, 'ical'::text]))),
    CONSTRAINT calendar_integrations_sync_direction_check CHECK ((sync_direction = ANY (ARRAY['read-only'::text, 'write-only'::text, 'two-way'::text])))
);

ALTER TABLE ONLY cal.calendar_integrations FORCE ROW LEVEL SECURITY;


--
-- Name: client_credits; Type: TABLE; Schema: cal; Owner: -
--

CREATE TABLE cal.client_credits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    client_email text NOT NULL,
    event_type_id uuid NOT NULL,
    credits_remaining integer DEFAULT 0 NOT NULL,
    credits_total integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

ALTER TABLE ONLY cal.client_credits FORCE ROW LEVEL SECURITY;


--
-- Name: event_type_resources; Type: TABLE; Schema: cal; Owner: -
--

CREATE TABLE cal.event_type_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    resource_kind text NOT NULL,
    role text DEFAULT 'primary'::text,
    is_required boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT event_type_resources_resource_kind_check CHECK ((resource_kind = ANY (ARRAY['contact'::text, 'asset'::text]))),
    CONSTRAINT event_type_resources_role_check CHECK ((role = ANY (ARRAY['primary'::text, 'secondary'::text, 'optional'::text, 'required'::text])))
);

ALTER TABLE ONLY cal.event_type_resources FORCE ROW LEVEL SECURITY;


--
-- Name: event_types; Type: TABLE; Schema: cal; Owner: -
--

CREATE TABLE cal.event_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    use_case_config_id uuid,
    location_id uuid,
    owner_contact_id uuid,
    title text NOT NULL,
    slug text NOT NULL,
    description text,
    color text DEFAULT '#3B82F6'::text,
    duration_minutes integer NOT NULL,
    buffer_minutes integer DEFAULT 0 NOT NULL,
    capacity_limit integer,
    requires_multi_resource boolean DEFAULT false NOT NULL,
    credit_cost integer DEFAULT 0 NOT NULL,
    booking_mode text DEFAULT 'appointment'::text NOT NULL,
    assignment_strategy text DEFAULT 'round-robin'::text NOT NULL,
    required_skill_name text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT event_types_assignment_strategy_check CHECK ((assignment_strategy = ANY (ARRAY['round-robin'::text, 'first-available'::text, 'load-balanced'::text, 'skill-based'::text, 'geo-clustered'::text, 'manual'::text, 'nearest_available'::text, 'panel_scheduling'::text, 'weighted_round_robin'::text, 'all_required'::text]))),
    CONSTRAINT event_types_booking_mode_check CHECK ((booking_mode = ANY (ARRAY['appointment'::text, 'queue'::text, 'arrival-window'::text, 'open-shift'::text, 'series'::text, 'asset-booking'::text])))
);

ALTER TABLE ONLY cal.event_types FORCE ROW LEVEL SECURITY;


--
-- Name: resource_availability_rules; Type: TABLE; Schema: cal; Owner: -
--

CREATE TABLE cal.resource_availability_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_id uuid NOT NULL,
    resource_kind text NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT resource_availability_rules_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT resource_availability_rules_resource_kind_check CHECK ((resource_kind = ANY (ARRAY['contact'::text, 'asset'::text])))
);

ALTER TABLE ONLY cal.resource_availability_rules FORCE ROW LEVEL SECURITY;


--
-- Name: resource_territories; Type: TABLE; Schema: cal; Owner: -
--

CREATE TABLE cal.resource_territories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_id uuid NOT NULL,
    resource_kind text NOT NULL,
    territory_id uuid NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT resource_territories_resource_kind_check CHECK ((resource_kind = ANY (ARRAY['contact'::text, 'asset'::text])))
);

ALTER TABLE ONLY cal.resource_territories FORCE ROW LEVEL SECURITY;


--
-- Name: territories; Type: TABLE; Schema: cal; Owner: -
--

CREATE TABLE cal.territories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    name text NOT NULL,
    polygon_geojson jsonb,
    parent_territory_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

ALTER TABLE ONLY cal.territories FORCE ROW LEVEL SECURITY;


--
-- Name: use_case_configs; Type: TABLE; Schema: cal; Owner: -
--

CREATE TABLE cal.use_case_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    category text NOT NULL,
    icon text NOT NULL,
    description text,
    config_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_template boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT use_case_configs_category_check CHECK ((category = ANY (ARRAY['field_operations'::text, 'healthcare'::text, 'corporate'::text, 'facilities'::text, 'education'::text, 'wellness'::text, 'legal'::text, 'other'::text])))
);

ALTER TABLE ONLY cal.use_case_configs FORCE ROW LEVEL SECURITY;


--
-- Name: v_blocked_windows; Type: VIEW; Schema: cal; Owner: -
--

CREATE VIEW cal.v_blocked_windows WITH (security_invoker='on') AS
 SELECT bw.id,
    bw.organization_id,
    bw.resource_id,
    bw.resource_kind,
        CASE bw.resource_kind
            WHEN 'contact'::text THEN ( SELECT contacts.name
               FROM unified.contacts
              WHERE (contacts.id = bw.resource_id))
            WHEN 'asset'::text THEN ( SELECT assets.name
               FROM unified.assets
              WHERE (assets.id = bw.resource_id))
            ELSE NULL::text
        END AS resource_name,
    bw.start_time,
    bw.end_time,
    bw.is_blocking,
    bw.is_all_day,
    bw.source,
    bw.external_ref,
    bw.title,
    bw.reason,
    bw.is_active,
    bw.synced_at,
    ci.provider AS integration_provider,
    bw.created_at,
    bw.updated_at
   FROM (cal.blocked_windows bw
     LEFT JOIN cal.calendar_integrations ci ON ((ci.id = bw.calendar_integration_id)));


--
-- Name: v_bookable_resources; Type: VIEW; Schema: cal; Owner: -
--

CREATE VIEW cal.v_bookable_resources WITH (security_invoker='on') AS
 SELECT c.id,
    c.organization_id,
    'contact'::text AS resource_kind,
    c.name,
    c.email,
    c.phone,
    c.booking_timezone AS timezone,
    c.booking_enabled,
    c.max_concurrent_bookings,
    c.calendar_id,
    rc.name AS calendar_name,
    rc.slot_duration_minutes,
    rc.min_advance_hours,
    rc.max_advance_days,
    rc.auto_confirm,
    ((c.details ->> 'user_id'::text))::uuid AS user_id,
    c.resource_type AS type,
    c.skills,
    c.certifications,
    c.is_active
   FROM (unified.contacts c
     LEFT JOIN unified.resource_calendars rc ON ((rc.id = c.calendar_id)))
  WHERE (c.booking_enabled = true)
UNION ALL
 SELECT a.id,
    a.organization_id,
    'asset'::text AS resource_kind,
    a.name,
    NULL::text AS email,
    NULL::text AS phone,
    a.booking_timezone AS timezone,
    a.booking_enabled,
    a.max_concurrent_bookings,
    a.calendar_id,
    rc.name AS calendar_name,
    rc.slot_duration_minutes,
    rc.min_advance_hours,
    rc.max_advance_days,
    rc.auto_confirm,
    NULL::uuid AS user_id,
    a.asset_type AS type,
    NULL::text[] AS skills,
    NULL::text[] AS certifications,
    a.is_active
   FROM (unified.assets a
     LEFT JOIN unified.resource_calendars rc ON ((rc.id = a.calendar_id)))
  WHERE (a.booking_enabled = true);


--
-- Name: v_bookings; Type: VIEW; Schema: cal; Owner: -
--

CREATE VIEW cal.v_bookings WITH (security_invoker='on') AS
 SELECT t.id AS booking_id,
    t.organization_id,
    t.state_category AS status,
    t.scheduled_start,
    t.scheduled_end,
    (t.details ->> 'invitee_name'::text) AS invitee_name,
    (t.details ->> 'invitee_email'::text) AS invitee_email,
    (t.details ->> 'invitee_phone'::text) AS invitee_phone,
    (t.details ->> 'invitee_notes'::text) AS invitee_notes,
    (t.details ->> 'timezone'::text) AS timezone,
    (t.details ->> 'confirmation_code'::text) AS confirmation_code,
    COALESCE(((t.details ->> 'reschedule_count'::text))::integer, 0) AS reschedule_count,
    (t.details ->> 'cancellation_reason'::text) AS cancellation_reason,
    ((t.details ->> 'event_type_id'::text))::uuid AS event_type_id,
    (t.details ->> 'event_type_title'::text) AS event_type_title,
    (t.details ->> 'event_type_slug'::text) AS event_type_slug,
    ((t.details ->> 'assigned_resource_id'::text))::uuid AS assigned_resource_id,
    (t.details ->> 'assigned_resource_kind'::text) AS assigned_resource_kind,
    (t.details ->> 'assigned_resource_name'::text) AS assigned_resource_name,
    ((t.details ->> 'location_id'::text))::uuid AS location_id,
    loc.name AS location_name,
    t.created_at,
    t.updated_at
   FROM (unified.tasks t
     LEFT JOIN identity.locations loc ON ((loc.id = ((t.details ->> 'location_id'::text))::uuid)))
  WHERE (t.intent_type = 'calendar_booking'::text);


--
-- Data for Name: blocked_windows; Type: TABLE DATA; Schema: cal; Owner: -
--

COPY cal.blocked_windows (id, organization_id, resource_id, resource_kind, calendar_integration_id, start_time, end_time, is_blocking, is_all_day, source, external_ref, title, reason, raw_payload, synced_at, is_active, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: calendar_integrations; Type: TABLE DATA; Schema: cal; Owner: -
--

COPY cal.calendar_integrations (id, contact_id, provider, provider_account_email, access_token_encrypted, refresh_token_encrypted, token_expires_at, calendar_id, sync_direction, is_active, auto_sync_enabled, sync_interval_minutes, last_sync_at, last_sync_status, last_sync_error, webhook_url, webhook_secret, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: client_credits; Type: TABLE DATA; Schema: cal; Owner: -
--

COPY cal.client_credits (id, organization_id, client_email, event_type_id, credits_remaining, credits_total, expires_at, metadata, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: event_type_resources; Type: TABLE DATA; Schema: cal; Owner: -
--

COPY cal.event_type_resources (id, event_type_id, resource_id, resource_kind, role, is_required, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: event_types; Type: TABLE DATA; Schema: cal; Owner: -
--

COPY cal.event_types (id, organization_id, use_case_config_id, location_id, owner_contact_id, title, slug, description, color, duration_minutes, buffer_minutes, capacity_limit, requires_multi_resource, credit_cost, booking_mode, assignment_strategy, required_skill_name, metadata, is_active, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: resource_availability_rules; Type: TABLE DATA; Schema: cal; Owner: -
--

COPY cal.resource_availability_rules (id, resource_id, resource_kind, day_of_week, start_time, end_time, is_available, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: resource_territories; Type: TABLE DATA; Schema: cal; Owner: -
--

COPY cal.resource_territories (id, resource_id, resource_kind, territory_id, is_primary, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: territories; Type: TABLE DATA; Schema: cal; Owner: -
--

COPY cal.territories (id, organization_id, name, polygon_geojson, parent_territory_id, metadata, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: use_case_configs; Type: TABLE DATA; Schema: cal; Owner: -
--

COPY cal.use_case_configs (id, name, slug, category, icon, description, config_json, is_template, display_order, created_at) FROM stdin;
\.


--
-- Name: blocked_windows blocked_windows_calendar_integration_id_external_ref_key; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.blocked_windows
    ADD CONSTRAINT blocked_windows_calendar_integration_id_external_ref_key UNIQUE NULLS NOT DISTINCT (calendar_integration_id, external_ref);


--
-- Name: blocked_windows blocked_windows_pkey; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.blocked_windows
    ADD CONSTRAINT blocked_windows_pkey PRIMARY KEY (id);


--
-- Name: calendar_integrations calendar_integrations_contact_id_provider_key; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.calendar_integrations
    ADD CONSTRAINT calendar_integrations_contact_id_provider_key UNIQUE (contact_id, provider);


--
-- Name: calendar_integrations calendar_integrations_pkey; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.calendar_integrations
    ADD CONSTRAINT calendar_integrations_pkey PRIMARY KEY (id);


--
-- Name: client_credits client_credits_client_email_event_type_id_key; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.client_credits
    ADD CONSTRAINT client_credits_client_email_event_type_id_key UNIQUE (client_email, event_type_id);


--
-- Name: client_credits client_credits_pkey; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.client_credits
    ADD CONSTRAINT client_credits_pkey PRIMARY KEY (id);


--
-- Name: event_type_resources event_type_resources_event_type_id_resource_id_resource_kin_key; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.event_type_resources
    ADD CONSTRAINT event_type_resources_event_type_id_resource_id_resource_kin_key UNIQUE (event_type_id, resource_id, resource_kind);


--
-- Name: event_type_resources event_type_resources_pkey; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.event_type_resources
    ADD CONSTRAINT event_type_resources_pkey PRIMARY KEY (id);


--
-- Name: event_types event_types_pkey; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.event_types
    ADD CONSTRAINT event_types_pkey PRIMARY KEY (id);


--
-- Name: event_types event_types_slug_key; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.event_types
    ADD CONSTRAINT event_types_slug_key UNIQUE (slug);


--
-- Name: resource_availability_rules resource_availability_rules_pkey; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.resource_availability_rules
    ADD CONSTRAINT resource_availability_rules_pkey PRIMARY KEY (id);


--
-- Name: resource_availability_rules resource_availability_rules_resource_id_resource_kind_day_o_key; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.resource_availability_rules
    ADD CONSTRAINT resource_availability_rules_resource_id_resource_kind_day_o_key UNIQUE (resource_id, resource_kind, day_of_week, start_time, end_time);


--
-- Name: resource_territories resource_territories_pkey; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.resource_territories
    ADD CONSTRAINT resource_territories_pkey PRIMARY KEY (id);


--
-- Name: resource_territories resource_territories_resource_id_resource_kind_territory_id_key; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.resource_territories
    ADD CONSTRAINT resource_territories_resource_id_resource_kind_territory_id_key UNIQUE (resource_id, resource_kind, territory_id);


--
-- Name: territories territories_organization_id_name_key; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.territories
    ADD CONSTRAINT territories_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: territories territories_pkey; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.territories
    ADD CONSTRAINT territories_pkey PRIMARY KEY (id);


--
-- Name: use_case_configs use_case_configs_pkey; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.use_case_configs
    ADD CONSTRAINT use_case_configs_pkey PRIMARY KEY (id);


--
-- Name: use_case_configs use_case_configs_slug_key; Type: CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.use_case_configs
    ADD CONSTRAINT use_case_configs_slug_key UNIQUE (slug);


--
-- Name: idx_bw_org_id; Type: INDEX; Schema: cal; Owner: -
--

CREATE INDEX idx_bw_org_id ON cal.blocked_windows USING btree (organization_id);


--
-- Name: idx_bw_resource_window; Type: INDEX; Schema: cal; Owner: -
--

CREATE INDEX idx_bw_resource_window ON cal.blocked_windows USING btree (resource_id, resource_kind, start_time, end_time) WHERE ((is_blocking = true) AND (is_active = true));


--
-- Name: idx_cc_et; Type: INDEX; Schema: cal; Owner: -
--

CREATE INDEX idx_cc_et ON cal.client_credits USING btree (event_type_id);


--
-- Name: idx_ci_contact_id; Type: INDEX; Schema: cal; Owner: -
--

CREATE INDEX idx_ci_contact_id ON cal.calendar_integrations USING btree (contact_id);


--
-- Name: idx_et_org_id; Type: INDEX; Schema: cal; Owner: -
--

CREATE INDEX idx_et_org_id ON cal.event_types USING btree (organization_id);


--
-- Name: idx_et_slug; Type: INDEX; Schema: cal; Owner: -
--

CREATE INDEX idx_et_slug ON cal.event_types USING btree (slug);


--
-- Name: idx_etr_event_type_id; Type: INDEX; Schema: cal; Owner: -
--

CREATE INDEX idx_etr_event_type_id ON cal.event_type_resources USING btree (event_type_id);


--
-- Name: idx_etr_resource; Type: INDEX; Schema: cal; Owner: -
--

CREATE INDEX idx_etr_resource ON cal.event_type_resources USING btree (resource_id, resource_kind);


--
-- Name: idx_rar_resource; Type: INDEX; Schema: cal; Owner: -
--

CREATE INDEX idx_rar_resource ON cal.resource_availability_rules USING btree (resource_id, resource_kind);


--
-- Name: idx_rte_resource; Type: INDEX; Schema: cal; Owner: -
--

CREATE INDEX idx_rte_resource ON cal.resource_territories USING btree (resource_id, resource_kind);


--
-- Name: blocked_windows trg_updated_at; Type: TRIGGER; Schema: cal; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON cal.blocked_windows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: calendar_integrations trg_updated_at; Type: TRIGGER; Schema: cal; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON cal.calendar_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_types trg_updated_at; Type: TRIGGER; Schema: cal; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON cal.event_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: territories trg_updated_at; Type: TRIGGER; Schema: cal; Owner: -
--

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON cal.territories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blocked_windows blocked_windows_calendar_integration_id_fkey; Type: FK CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.blocked_windows
    ADD CONSTRAINT blocked_windows_calendar_integration_id_fkey FOREIGN KEY (calendar_integration_id) REFERENCES cal.calendar_integrations(id) ON DELETE SET NULL;


--
-- Name: blocked_windows blocked_windows_organization_id_fkey; Type: FK CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.blocked_windows
    ADD CONSTRAINT blocked_windows_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES identity.organizations(id) ON DELETE CASCADE;


--
-- Name: calendar_integrations calendar_integrations_contact_id_fkey; Type: FK CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.calendar_integrations
    ADD CONSTRAINT calendar_integrations_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES unified.contacts(id) ON DELETE CASCADE;


--
-- Name: client_credits client_credits_event_type_id_fkey; Type: FK CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.client_credits
    ADD CONSTRAINT client_credits_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES cal.event_types(id) ON DELETE CASCADE;


--
-- Name: client_credits client_credits_organization_id_fkey; Type: FK CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.client_credits
    ADD CONSTRAINT client_credits_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES identity.organizations(id) ON DELETE CASCADE;


--
-- Name: event_type_resources event_type_resources_event_type_id_fkey; Type: FK CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.event_type_resources
    ADD CONSTRAINT event_type_resources_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES cal.event_types(id) ON DELETE CASCADE;


--
-- Name: event_types event_types_location_id_fkey; Type: FK CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.event_types
    ADD CONSTRAINT event_types_location_id_fkey FOREIGN KEY (location_id) REFERENCES identity.locations(id) ON DELETE SET NULL;


--
-- Name: event_types event_types_organization_id_fkey; Type: FK CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.event_types
    ADD CONSTRAINT event_types_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES identity.organizations(id) ON DELETE CASCADE;


--
-- Name: event_types event_types_owner_contact_id_fkey; Type: FK CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.event_types
    ADD CONSTRAINT event_types_owner_contact_id_fkey FOREIGN KEY (owner_contact_id) REFERENCES unified.contacts(id) ON DELETE SET NULL;


--
-- Name: event_types event_types_use_case_config_id_fkey; Type: FK CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.event_types
    ADD CONSTRAINT event_types_use_case_config_id_fkey FOREIGN KEY (use_case_config_id) REFERENCES cal.use_case_configs(id) ON DELETE SET NULL;


--
-- Name: resource_territories resource_territories_territory_id_fkey; Type: FK CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.resource_territories
    ADD CONSTRAINT resource_territories_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES cal.territories(id) ON DELETE CASCADE;


--
-- Name: territories territories_organization_id_fkey; Type: FK CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.territories
    ADD CONSTRAINT territories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES identity.organizations(id) ON DELETE CASCADE;


--
-- Name: territories territories_parent_territory_id_fkey; Type: FK CONSTRAINT; Schema: cal; Owner: -
--

ALTER TABLE ONLY cal.territories
    ADD CONSTRAINT territories_parent_territory_id_fkey FOREIGN KEY (parent_territory_id) REFERENCES cal.territories(id) ON DELETE SET NULL;


--
-- Name: blocked_windows; Type: ROW SECURITY; Schema: cal; Owner: -
--

ALTER TABLE cal.blocked_windows ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_windows bw_tenant_all; Type: POLICY; Schema: cal; Owner: -
--

CREATE POLICY bw_tenant_all ON cal.blocked_windows TO authenticated USING ((organization_id = identity.get_current_org_id())) WITH CHECK ((organization_id = identity.get_current_org_id()));


--
-- Name: calendar_integrations; Type: ROW SECURITY; Schema: cal; Owner: -
--

ALTER TABLE cal.calendar_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: client_credits cc_anon_own; Type: POLICY; Schema: cal; Owner: -
--

CREATE POLICY cc_anon_own ON cal.client_credits FOR SELECT TO anon USING ((client_email = current_setting('app.invitee_email'::text, true)));


--
-- Name: client_credits cc_tenant_all; Type: POLICY; Schema: cal; Owner: -
--

CREATE POLICY cc_tenant_all ON cal.client_credits TO authenticated USING ((organization_id = identity.get_current_org_id())) WITH CHECK ((organization_id = identity.get_current_org_id()));


--
-- Name: calendar_integrations ci_tenant_all; Type: POLICY; Schema: cal; Owner: -
--

CREATE POLICY ci_tenant_all ON cal.calendar_integrations TO authenticated USING ((contact_id IN ( SELECT contacts.id
   FROM unified.contacts
  WHERE (contacts.organization_id = identity.get_current_org_id())))) WITH CHECK ((contact_id IN ( SELECT contacts.id
   FROM unified.contacts
  WHERE (contacts.organization_id = identity.get_current_org_id()))));


--
-- Name: client_credits; Type: ROW SECURITY; Schema: cal; Owner: -
--

ALTER TABLE cal.client_credits ENABLE ROW LEVEL SECURITY;

--
-- Name: event_types et_public_read; Type: POLICY; Schema: cal; Owner: -
--

CREATE POLICY et_public_read ON cal.event_types FOR SELECT TO anon USING ((is_active = true));


--
-- Name: event_types et_tenant_all; Type: POLICY; Schema: cal; Owner: -
--

CREATE POLICY et_tenant_all ON cal.event_types TO authenticated USING ((organization_id = identity.get_current_org_id())) WITH CHECK ((organization_id = identity.get_current_org_id()));


--
-- Name: event_type_resources etr_public_read; Type: POLICY; Schema: cal; Owner: -
--

CREATE POLICY etr_public_read ON cal.event_type_resources FOR SELECT TO anon USING (true);


--
-- Name: event_type_resources etr_tenant_all; Type: POLICY; Schema: cal; Owner: -
--

CREATE POLICY etr_tenant_all ON cal.event_type_resources TO authenticated USING ((event_type_id IN ( SELECT event_types.id
   FROM cal.event_types
  WHERE (event_types.organization_id = identity.get_current_org_id())))) WITH CHECK ((event_type_id IN ( SELECT event_types.id
   FROM cal.event_types
  WHERE (event_types.organization_id = identity.get_current_org_id()))));


--
-- Name: event_type_resources; Type: ROW SECURITY; Schema: cal; Owner: -
--

ALTER TABLE cal.event_type_resources ENABLE ROW LEVEL SECURITY;

--
-- Name: event_types; Type: ROW SECURITY; Schema: cal; Owner: -
--

ALTER TABLE cal.event_types ENABLE ROW LEVEL SECURITY;

--
-- Name: resource_availability_rules rar_public_read; Type: POLICY; Schema: cal; Owner: -
--

CREATE POLICY rar_public_read ON cal.resource_availability_rules FOR SELECT TO anon USING (true);


--
-- Name: resource_availability_rules rar_tenant_all; Type: POLICY; Schema: cal; Owner: -
--

CREATE POLICY rar_tenant_all ON cal.resource_availability_rules TO authenticated USING (
CASE resource_kind
    WHEN 'contact'::text THEN (resource_id IN ( SELECT contacts.id
       FROM unified.contacts
      WHERE (contacts.organization_id = identity.get_current_org_id())))
    WHEN 'asset'::text THEN (resource_id IN ( SELECT assets.id
       FROM unified.assets
      WHERE (assets.organization_id = identity.get_current_org_id())))
    ELSE false
END) WITH CHECK (
CASE resource_kind
    WHEN 'contact'::text THEN (resource_id IN ( SELECT contacts.id
       FROM unified.contacts
      WHERE (contacts.organization_id = identity.get_current_org_id())))
    WHEN 'asset'::text THEN (resource_id IN ( SELECT assets.id
       FROM unified.assets
      WHERE (assets.organization_id = identity.get_current_org_id())))
    ELSE false
END);


--
-- Name: resource_availability_rules; Type: ROW SECURITY; Schema: cal; Owner: -
--

ALTER TABLE cal.resource_availability_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: resource_territories; Type: ROW SECURITY; Schema: cal; Owner: -
--

ALTER TABLE cal.resource_territories ENABLE ROW LEVEL SECURITY;

--
-- Name: resource_territories rte_public_read; Type: POLICY; Schema: cal; Owner: -
--

CREATE POLICY rte_public_read ON cal.resource_territories FOR SELECT TO anon USING (true);


--
-- Name: resource_territories rte_tenant_all; Type: POLICY; Schema: cal; Owner: -
--

CREATE POLICY rte_tenant_all ON cal.resource_territories TO authenticated USING (
CASE resource_kind
    WHEN 'contact'::text THEN (resource_id IN ( SELECT contacts.id
       FROM unified.contacts
      WHERE (contacts.organization_id = identity.get_current_org_id())))
    WHEN 'asset'::text THEN (resource_id IN ( SELECT assets.id
       FROM unified.assets
      WHERE (assets.organization_id = identity.get_current_org_id())))
    ELSE false
END) WITH CHECK (
CASE resource_kind
    WHEN 'contact'::text THEN (resource_id IN ( SELECT contacts.id
       FROM unified.contacts
      WHERE (contacts.organization_id = identity.get_current_org_id())))
    WHEN 'asset'::text THEN (resource_id IN ( SELECT assets.id
       FROM unified.assets
      WHERE (assets.organization_id = identity.get_current_org_id())))
    ELSE false
END);


--
-- Name: territories ter_public_read; Type: POLICY; Schema: cal; Owner: -
--

CREATE POLICY ter_public_read ON cal.territories FOR SELECT TO anon USING (true);


--
-- Name: territories ter_tenant_all; Type: POLICY; Schema: cal; Owner: -
--

CREATE POLICY ter_tenant_all ON cal.territories TO authenticated USING ((organization_id = identity.get_current_org_id())) WITH CHECK ((organization_id = identity.get_current_org_id()));


--
-- Name: territories; Type: ROW SECURITY; Schema: cal; Owner: -
--

ALTER TABLE cal.territories ENABLE ROW LEVEL SECURITY;

--
-- Name: use_case_configs ucc_global_read; Type: POLICY; Schema: cal; Owner: -
--

CREATE POLICY ucc_global_read ON cal.use_case_configs FOR SELECT TO authenticated, anon USING (true);


--
-- Name: use_case_configs; Type: ROW SECURITY; Schema: cal; Owner: -
--

ALTER TABLE cal.use_case_configs ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

