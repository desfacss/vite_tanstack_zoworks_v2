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
-- Name: wa; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA wa;


--
-- Name: normalize_phone(text); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.normalize_phone(p_phone text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    -- Remove all non-digits
    RETURN regexp_replace(p_phone, '[^0-9]', '', 'g');
END;
$$;


--
-- Name: trg_auto_link_new_contact(); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.trg_auto_link_new_contact() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_resolved RECORD;
BEGIN
    IF NEW.linked_entity_id IS NULL THEN
        SELECT * INTO v_resolved
        FROM wa.wa_resolve_identity(NEW.wa_id, NEW.organization_id)
        LIMIT 1;
        
        IF v_resolved.entity_id IS NOT NULL THEN
            NEW.linked_entity_id := v_resolved.entity_id;
            NEW.linked_entity_type := v_resolved.entity_type;
            NEW.identity_type := v_resolved.identity_type;
            
            NEW.tags := ARRAY(
                SELECT DISTINCT unnest 
                FROM unnest(COALESCE(NEW.tags, '{}') || COALESCE(v_resolved.segment_tags, '{}'))
            );
            
            IF NEW.name IS NULL OR NEW.name = '' THEN
                NEW.name := v_resolved.display_name;
            END IF;
        ELSE
            NEW.identity_type := 'unknown';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION trg_auto_link_new_contact(); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.trg_auto_link_new_contact() IS 'Auto-link new wa_contacts to identity.users or external.contacts based on phone number';


--
-- Name: trg_v_wa_contact_metrics_shard(); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.trg_v_wa_contact_metrics_shard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'wa', 'public', 'core', 'unified', 'extensions'
    AS $$
        DECLARE v_item jsonb;
        BEGIN
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
                            IF (TG_OP = 'INSERT') AND NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
            IF (TG_OP = 'INSERT') AND NEW.organization_id IS NULL THEN NEW.organization_id := identity.get_current_org_id(); END IF;


-- Tier 1: Base Anchor insertion (Adaptive Mapping)

        IF (TG_OP = 'INSERT') THEN
            IF EXISTS (SELECT 1 FROM wa.wa_contact_metrics WHERE id = NEW.id AND organization_id = NEW.organization_id) THEN
                UPDATE wa.wa_contact_metrics SET contact_id = COALESCE(NEW.contact_id, wa.wa_contact_metrics.contact_id), contact_name = COALESCE(NEW.contact_name, wa.wa_contact_metrics.contact_name), wa_id = COALESCE(NEW.wa_id, wa.wa_contact_metrics.wa_id), tags = COALESCE(NEW.tags, wa.wa_contact_metrics.tags), identity_type = COALESCE(NEW.identity_type, wa.wa_contact_metrics.identity_type), resolution_status = COALESCE(NEW.resolution_status, wa.wa_contact_metrics.resolution_status), first_contact_at = COALESCE(NEW.first_contact_at, wa.wa_contact_metrics.first_contact_at), message_count = COALESCE(NEW.message_count, wa.wa_contact_metrics.message_count), last_message_at = COALESCE(NEW.last_message_at, wa.wa_contact_metrics.last_message_at), days_since_last_message = COALESCE(NEW.days_since_last_message, wa.wa_contact_metrics.days_since_last_message), conversation_count = COALESCE(NEW.conversation_count, wa.wa_contact_metrics.conversation_count), total_orders = COALESCE(NEW.total_orders, wa.wa_contact_metrics.total_orders), total_order_value = COALESCE(NEW.total_order_value, wa.wa_contact_metrics.total_order_value), last_order_at = COALESCE(NEW.last_order_at, wa.wa_contact_metrics.last_order_at), external_source = COALESCE(NEW.external_source, wa.wa_contact_metrics.external_source) WHERE id = NEW.id RETURNING id INTO NEW.id;
            ELSE
                INSERT INTO wa.wa_contact_metrics (contact_id, organization_id, contact_name, wa_id, tags, identity_type, resolution_status, first_contact_at, message_count, last_message_at, days_since_last_message, conversation_count, total_orders, total_order_value, last_order_at, external_source) VALUES (NEW.contact_id, NEW.organization_id, NEW.contact_name, NEW.wa_id, NEW.tags, NEW.identity_type, NEW.resolution_status, NEW.first_contact_at, NEW.message_count, NEW.last_message_at, NEW.days_since_last_message, NEW.conversation_count, NEW.total_orders, NEW.total_order_value, NEW.last_order_at, NEW.external_source) RETURNING id INTO NEW.id;
            END IF;
        ELSE
            UPDATE wa.wa_contact_metrics SET contact_id = COALESCE(NEW.contact_id, wa.wa_contact_metrics.contact_id), contact_name = COALESCE(NEW.contact_name, wa.wa_contact_metrics.contact_name), wa_id = COALESCE(NEW.wa_id, wa.wa_contact_metrics.wa_id), tags = COALESCE(NEW.tags, wa.wa_contact_metrics.tags), identity_type = COALESCE(NEW.identity_type, wa.wa_contact_metrics.identity_type), resolution_status = COALESCE(NEW.resolution_status, wa.wa_contact_metrics.resolution_status), first_contact_at = COALESCE(NEW.first_contact_at, wa.wa_contact_metrics.first_contact_at), message_count = COALESCE(NEW.message_count, wa.wa_contact_metrics.message_count), last_message_at = COALESCE(NEW.last_message_at, wa.wa_contact_metrics.last_message_at), days_since_last_message = COALESCE(NEW.days_since_last_message, wa.wa_contact_metrics.days_since_last_message), conversation_count = COALESCE(NEW.conversation_count, wa.wa_contact_metrics.conversation_count), total_orders = COALESCE(NEW.total_orders, wa.wa_contact_metrics.total_orders), total_order_value = COALESCE(NEW.total_order_value, wa.wa_contact_metrics.total_order_value), last_order_at = COALESCE(NEW.last_order_at, wa.wa_contact_metrics.last_order_at), external_source = COALESCE(NEW.external_source, wa.wa_contact_metrics.external_source) WHERE id = OLD.id RETURNING id INTO NEW.id;
        END IF;
                RETURN NEW;
            ELSIF (TG_OP = 'DELETE') THEN
                DELETE FROM wa.wa_contact_metrics WHERE id = OLD.id;
                RETURN OLD;
            END IF;
            RETURN NULL;
        END;
        $$;


--
-- Name: trg_v_wa_contacts_shard(); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.trg_v_wa_contacts_shard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'wa', 'public', 'core', 'unified', 'extensions'
    AS $$
        DECLARE v_item jsonb;
        BEGIN
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
                            IF (TG_OP = 'INSERT') AND NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
            IF (TG_OP = 'INSERT') AND NEW.organization_id IS NULL THEN NEW.organization_id := identity.get_current_org_id(); END IF;


-- Tier 1: Base Anchor insertion (Adaptive Mapping)

        IF (TG_OP = 'INSERT') THEN
            IF EXISTS (SELECT 1 FROM wa.wa_contacts WHERE id = NEW.id AND organization_id = NEW.organization_id) THEN
                UPDATE wa.wa_contacts SET location_id = COALESCE(NEW.location_id, wa.wa_contacts.location_id), wa_id = COALESCE(NEW.wa_id, wa.wa_contacts.wa_id), name = COALESCE(NEW.name, wa.wa_contacts.name), profile_picture_url = COALESCE(NEW.profile_picture_url, wa.wa_contacts.profile_picture_url), last_message_timestamp = COALESCE(NEW.last_message_timestamp, wa.wa_contacts.last_message_timestamp), opt_in_status = COALESCE(NEW.opt_in_status, wa.wa_contacts.opt_in_status), metadata = COALESCE(NEW.metadata, wa.wa_contacts.metadata), created_at = COALESCE(NEW.created_at, wa.wa_contacts.created_at), updated_at = COALESCE(NEW.updated_at, wa.wa_contacts.updated_at), created_by = COALESCE(NEW.created_by, wa.wa_contacts.created_by), updated_by = COALESCE(NEW.updated_by, wa.wa_contacts.updated_by), linked_entity_id = COALESCE(NEW.linked_entity_id, wa.wa_contacts.linked_entity_id), linked_entity_type = COALESCE(NEW.linked_entity_type, wa.wa_contacts.linked_entity_type), tags = COALESCE(NEW.tags, wa.wa_contacts.tags), identity_type = COALESCE(NEW.identity_type, wa.wa_contacts.identity_type), display_id = COALESCE(NEW.display_id, wa.wa_contacts.display_id), is_active = COALESCE(NEW.is_active, wa.wa_contacts.is_active), intent_type = COALESCE(NEW.intent_type, wa.wa_contacts.intent_type), state_category = COALESCE(NEW.state_category, wa.wa_contacts.state_category), is_on_hold = COALESCE(NEW.is_on_hold, wa.wa_contacts.is_on_hold), opted_out_at = COALESCE(NEW.opted_out_at, wa.wa_contacts.opted_out_at), opted_in_at = COALESCE(NEW.opted_in_at, wa.wa_contacts.opted_in_at), resolution_status = COALESCE(NEW.resolution_status, wa.wa_contacts.resolution_status) WHERE id = NEW.id RETURNING display_id INTO NEW.display_id;
            ELSE
                INSERT INTO wa.wa_contacts (id, organization_id, location_id, wa_id, name, profile_picture_url, last_message_timestamp, opt_in_status, metadata, created_at, updated_at, created_by, updated_by, linked_entity_id, linked_entity_type, tags, identity_type, display_id, is_active, intent_type, state_category, is_on_hold, opted_out_at, opted_in_at, resolution_status) VALUES (COALESCE(NEW.id, uuid_generate_v4()), NEW.organization_id, NEW.location_id, NEW.wa_id, NEW.name, NEW.profile_picture_url, NEW.last_message_timestamp, COALESCE(NEW.opt_in_status, true), COALESCE(NEW.metadata, '{}'::jsonb), COALESCE(NEW.created_at, now()), COALESCE(NEW.updated_at, now()), NEW.created_by, NEW.updated_by, NEW.linked_entity_id, NEW.linked_entity_type, COALESCE(NEW.tags, '{}'::text[]), NEW.identity_type, NEW.display_id, COALESCE(NEW.is_active, true), NEW.intent_type, NEW.state_category, COALESCE(NEW.is_on_hold, false), NEW.opted_out_at, NEW.opted_in_at, COALESCE(NEW.resolution_status, 'pending'::text)) RETURNING display_id INTO NEW.display_id;
            END IF;
        ELSE
            UPDATE wa.wa_contacts SET location_id = COALESCE(NEW.location_id, wa.wa_contacts.location_id), wa_id = COALESCE(NEW.wa_id, wa.wa_contacts.wa_id), name = COALESCE(NEW.name, wa.wa_contacts.name), profile_picture_url = COALESCE(NEW.profile_picture_url, wa.wa_contacts.profile_picture_url), last_message_timestamp = COALESCE(NEW.last_message_timestamp, wa.wa_contacts.last_message_timestamp), opt_in_status = COALESCE(NEW.opt_in_status, wa.wa_contacts.opt_in_status), metadata = COALESCE(NEW.metadata, wa.wa_contacts.metadata), created_at = COALESCE(NEW.created_at, wa.wa_contacts.created_at), updated_at = COALESCE(NEW.updated_at, wa.wa_contacts.updated_at), created_by = COALESCE(NEW.created_by, wa.wa_contacts.created_by), updated_by = COALESCE(NEW.updated_by, wa.wa_contacts.updated_by), linked_entity_id = COALESCE(NEW.linked_entity_id, wa.wa_contacts.linked_entity_id), linked_entity_type = COALESCE(NEW.linked_entity_type, wa.wa_contacts.linked_entity_type), tags = COALESCE(NEW.tags, wa.wa_contacts.tags), identity_type = COALESCE(NEW.identity_type, wa.wa_contacts.identity_type), display_id = COALESCE(NEW.display_id, wa.wa_contacts.display_id), is_active = COALESCE(NEW.is_active, wa.wa_contacts.is_active), intent_type = COALESCE(NEW.intent_type, wa.wa_contacts.intent_type), state_category = COALESCE(NEW.state_category, wa.wa_contacts.state_category), is_on_hold = COALESCE(NEW.is_on_hold, wa.wa_contacts.is_on_hold), opted_out_at = COALESCE(NEW.opted_out_at, wa.wa_contacts.opted_out_at), opted_in_at = COALESCE(NEW.opted_in_at, wa.wa_contacts.opted_in_at), resolution_status = COALESCE(NEW.resolution_status, wa.wa_contacts.resolution_status) WHERE id = OLD.id RETURNING display_id INTO NEW.display_id;
        END IF;
-- Tier 2 Extension: core.unified_objects\n
            IF (TG_OP = 'INSERT') THEN
                IF EXISTS (SELECT 1 FROM core.unified_objects WHERE id = NEW.id) THEN
                    UPDATE core.unified_objects SET object_type = COALESCE(NEW.object_type, core.unified_objects.object_type), object_subtype = COALESCE(NEW.object_subtype, core.unified_objects.object_subtype), entity_schema = COALESCE(NEW.entity_schema, core.unified_objects.entity_schema), entity_type = COALESCE(NEW.entity_type, core.unified_objects.entity_type), module = COALESCE(NEW.module, core.unified_objects.module) WHERE id = NEW.id RETURNING id INTO NEW.id;
                ELSE
                    INSERT INTO core.unified_objects (object_type, object_subtype, entity_schema, entity_type, module, id) VALUES (NEW.object_type, NEW.object_subtype, NEW.entity_schema, NEW.entity_type, NEW.module, NEW.id) RETURNING id INTO NEW.id;
                END IF;
            ELSE
                UPDATE core.unified_objects SET object_type = COALESCE(NEW.object_type, core.unified_objects.object_type), object_subtype = COALESCE(NEW.object_subtype, core.unified_objects.object_subtype), entity_schema = COALESCE(NEW.entity_schema, core.unified_objects.entity_schema), entity_type = COALESCE(NEW.entity_type, core.unified_objects.entity_type), module = COALESCE(NEW.module, core.unified_objects.module) WHERE id = OLD.id RETURNING id INTO NEW.id;
            END IF;
                RETURN NEW;
            ELSIF (TG_OP = 'DELETE') THEN
                DELETE FROM wa.wa_contacts WHERE id = OLD.id;
                RETURN OLD;
            END IF;
            RETURN NULL;
        END;
        $$;


--
-- Name: trg_wa_drip_steps_check_cycle(); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.trg_wa_drip_steps_check_cycle() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_cursor UUID := NEW.parent_step_id;
  v_depth  INT  := 0;
BEGIN
  -- A step with no parent cannot create a cycle
  IF v_cursor IS NULL THEN RETURN NEW; END IF;
  -- A step cannot be its own parent
  IF v_cursor = NEW.id THEN
    RAISE EXCEPTION 'Cycle detected: step % cannot be its own parent', NEW.id;
  END IF;

  LOOP
    SELECT parent_step_id INTO v_cursor
    FROM wa.wa_drip_steps
    WHERE id = v_cursor;

    EXIT WHEN v_cursor IS NULL;           -- clean root reached

    IF v_cursor = NEW.id THEN
      RAISE EXCEPTION
        'Cycle detected in drip campaign %: inserting step % would create a loop',
        NEW.campaign_id, NEW.id;
    END IF;

    v_depth := v_depth + 1;
    IF v_depth > 50 THEN
      RAISE EXCEPTION
        'Drip step graph too deep (>50 levels) in campaign % — possible pre-existing cycle',
        NEW.campaign_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION trg_wa_drip_steps_check_cycle(); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.trg_wa_drip_steps_check_cycle() IS 'Prevents circular parent_step_id chains in wa_drip_steps. Traverses ancestry up to depth 50 before raising an exception. Must fire BEFORE INSERT OR UPDATE OF parent_step_id.';


--
-- Name: util_resolve_contact(uuid, text, text); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.util_resolve_contact(p_organization_id uuid, p_phone text DEFAULT NULL::text, p_wa_id text DEFAULT NULL::text) RETURNS TABLE(id uuid, wa_contact_id uuid, name text, email text, phone text, persona_type text, source_module text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF p_wa_id IS NOT NULL THEN
        RETURN QUERY
        SELECT uc.id, wc.id, uc.name, uc.email, uc.phone, uc.persona_type, uc.module
        FROM wa.wa_contacts wc
        JOIN unified.contacts uc ON uc.id = wc.id
        WHERE wc.organization_id = p_organization_id AND wc.wa_id = p_wa_id
        LIMIT 1;
        IF FOUND THEN RETURN; END IF;
    END IF;

    IF p_phone IS NOT NULL THEN
        RETURN QUERY
        SELECT uc.id, wc.id, uc.name, uc.email, uc.phone, uc.persona_type, uc.module
        FROM unified.contacts uc
        JOIN wa.wa_contacts wc ON wc.id = uc.id
        WHERE uc.organization_id = p_organization_id AND uc.phone = p_phone
        LIMIT 1;
    END IF;
    
    RETURN;
END;
$$;


--
-- Name: wa_assign_agent(uuid, uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_assign_agent(p_conversation_id uuid, p_agent_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF p_agent_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM identity.users WHERE id = p_agent_user_id) THEN
        RAISE EXCEPTION 'Agent User ID % does not exist in identity.users.', p_agent_user_id;
    END IF;

    UPDATE wa.wa_conversations
    SET 
        assignee_id = p_agent_user_id,
        updated_at = NOW()
    WHERE id = p_conversation_id
      AND organization_id = (SELECT organization_id FROM wa.wa_conversations WHERE id = p_conversation_id);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conversation ID % not found.', p_conversation_id;
    END IF;
END;
$$;


--
-- Name: wa_assign_to_team_role(uuid, uuid, uuid, uuid, uuid, text); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_assign_to_team_role(p_conversation_id uuid, p_target_user_id uuid DEFAULT NULL::uuid, p_target_team_id uuid DEFAULT NULL::uuid, p_target_role_id uuid DEFAULT NULL::uuid, p_transferred_by_user_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_org_id     UUID;
  v_loc_id     UUID;
  v_contact_id UUID;
BEGIN
  SELECT organization_id, location_id, contact_id
  INTO v_org_id, v_loc_id, v_contact_id
  FROM wa.wa_conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation % not found', p_conversation_id;
  END IF;

  -- Guard: team must belong to same org
  IF p_target_team_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM identity.teams
      WHERE id = p_target_team_id AND organization_id = v_org_id
    ) THEN
      RAISE EXCEPTION 'Team % does not exist in organization %',
        p_target_team_id, v_org_id;
    END IF;
  END IF;

  -- Guard: role must belong to same org
  IF p_target_role_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM identity.roles
      WHERE id = p_target_role_id AND organization_id = v_org_id
    ) THEN
      RAISE EXCEPTION 'Role % does not exist in organization %',
        p_target_role_id, v_org_id;
    END IF;
  END IF;

  -- Guard: user must be active in same org
  IF p_target_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM identity.organization_users
      WHERE id = p_target_user_id
        AND organization_id = v_org_id
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'User % is not an active member of organization %',
        p_target_user_id, v_org_id;
    END IF;
  END IF;

  -- Cancel any outstanding pending transfers
  UPDATE wa.wa_agent_transfers
  SET status = 'cancelled', updated_at = NOW()
  WHERE conversation_id = p_conversation_id AND status = 'pending';

  IF p_target_user_id IS NOT NULL THEN
    -- Direct assignment
    UPDATE wa.wa_conversations
    SET assignee_id = p_target_user_id,
        team_id     = p_target_team_id,
        role_id     = p_target_role_id,
        updated_at  = NOW()
    WHERE id = p_conversation_id;

    INSERT INTO wa.wa_agent_transfers (
      organization_id, location_id, contact_id, conversation_id,
      status, assigned_user_id, target_team_id, target_role_id,
      transferred_by_user_id, picked_up_at, metadata
    ) VALUES (
      v_org_id, v_loc_id, v_contact_id, p_conversation_id,
      'assigned', p_target_user_id, p_target_team_id, p_target_role_id,
      p_transferred_by_user_id, NOW(),
      jsonb_build_object('notes', p_notes)
    );
  ELSE
    -- Queue to team/role
    UPDATE wa.wa_conversations
    SET assignee_id = NULL,
        team_id     = p_target_team_id,
        role_id     = p_target_role_id,
        updated_at  = NOW()
    WHERE id = p_conversation_id;

    INSERT INTO wa.wa_agent_transfers (
      organization_id, location_id, contact_id, conversation_id,
      status, target_team_id, target_role_id,
      transferred_by_user_id, metadata
    ) VALUES (
      v_org_id, v_loc_id, v_contact_id, p_conversation_id,
      'pending', p_target_team_id, p_target_role_id,
      p_transferred_by_user_id,
      jsonb_build_object('notes', p_notes)
    );
  END IF;
END;
$$;


--
-- Name: FUNCTION wa_assign_to_team_role(p_conversation_id uuid, p_target_user_id uuid, p_target_team_id uuid, p_target_role_id uuid, p_transferred_by_user_id uuid, p_notes text); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_assign_to_team_role(p_conversation_id uuid, p_target_user_id uuid, p_target_team_id uuid, p_target_role_id uuid, p_transferred_by_user_id uuid, p_notes text) IS 'Assigns a WA conversation to a user / team / role. Validates that team, role, and user all belong to the conversation''s org (runtime guard). No FK changes to identity schema — guards via EXISTS checks only. Direct user → status=assigned. Team/role-only → status=pending (queue).';


--
-- Name: wa_auto_route_conversation(uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_auto_route_conversation(p_conversation_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_org_id       UUID;
  v_loc_id       UUID;
  v_contact_id   UUID;
  v_contact_tags TEXT[];
  v_hour         INT;
  v_dow          INT;
  v_rule         RECORD;
  v_tags_match   BOOLEAN;
  v_hours_match  BOOLEAN;
  v_days_match   BOOLEAN;
BEGIN
  SELECT organization_id, location_id, contact_id
  INTO v_org_id, v_loc_id, v_contact_id
  FROM wa.wa_conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation % not found', p_conversation_id;
  END IF;

  -- Contact tags stored in wa_contacts.metadata->'tags' as a JSON array
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(COALESCE(metadata->'tags', '[]'::jsonb))
  )
  INTO v_contact_tags
  FROM wa.wa_contacts
  WHERE id = v_contact_id;

  v_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC')::INT;
  v_dow  := EXTRACT(DOW  FROM NOW() AT TIME ZONE 'UTC')::INT;

  FOR v_rule IN
    SELECT *
    FROM wa.wa_routing_rules
    WHERE organization_id = v_org_id
      AND is_active = true
      AND (location_id IS NULL OR location_id = v_loc_id)
    ORDER BY priority ASC, created_at ASC
  LOOP
    -- contact_tags: any overlap
    IF v_rule.match_config ? 'contact_tags' THEN
      SELECT bool_or(t = ANY(v_contact_tags))
      INTO v_tags_match
      FROM jsonb_array_elements_text(v_rule.match_config->'contact_tags') t;
      IF NOT COALESCE(v_tags_match, false) THEN CONTINUE; END IF;
    END IF;

    -- inbound hour window (UTC)
    IF v_rule.match_config ? 'inbound_hour_from' OR v_rule.match_config ? 'inbound_hour_to' THEN
      v_hours_match :=
            v_hour >= COALESCE((v_rule.match_config->>'inbound_hour_from')::INT, 0)
        AND v_hour <  COALESCE((v_rule.match_config->>'inbound_hour_to')::INT,   24);
      IF NOT v_hours_match THEN CONTINUE; END IF;
    END IF;

    -- days of week
    IF v_rule.match_config ? 'days_of_week' THEN
      SELECT bool_or((d::INT) = v_dow)
      INTO v_days_match
      FROM jsonb_array_elements_text(v_rule.match_config->'days_of_week') d;
      IF NOT COALESCE(v_days_match, false) THEN CONTINUE; END IF;
    END IF;

    -- All conditions passed
    PERFORM wa.wa_assign_to_team_role(
      p_conversation_id        := p_conversation_id,
      p_target_user_id         := v_rule.target_user_id,
      p_target_team_id         := v_rule.target_team_id,
      p_target_role_id         := v_rule.target_role_id,
      p_transferred_by_user_id := NULL,
      p_notes                  := 'Auto-routed by rule: ' || v_rule.name
    );

    RETURN v_rule.id;
  END LOOP;

  RETURN NULL;
END;
$$;


--
-- Name: FUNCTION wa_auto_route_conversation(p_conversation_id uuid); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_auto_route_conversation(p_conversation_id uuid) IS 'Evaluates active wa_routing_rules for the conversation''s org/location. First matching rule (lowest priority value) calls wa_assign_to_team_role(). Returns matched rule id or NULL. Call from whatsapp-receiver after upsert_conversation.';


--
-- Name: wa_check_sla_breaches(uuid, integer); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_check_sla_breaches(p_organization_id uuid, p_threshold_hours integer DEFAULT 4) RETURNS TABLE(conversation_id uuid, contact_id uuid, assignee_id uuid, team_id uuid, last_inbound_at timestamp with time zone, hours_waiting numeric, breach_level text)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT
    c.id                                                   AS conversation_id,
    c.contact_id,
    c.assignee_id,
    c.team_id,
    c.last_message_at                                      AS last_inbound_at,
    ROUND(
      EXTRACT(EPOCH FROM (NOW() - c.last_message_at)) / 3600.0,
      1
    )                                                      AS hours_waiting,
    CASE
      WHEN EXTRACT(EPOCH FROM (NOW() - c.last_message_at)) / 3600.0
           >= p_threshold_hours * 2 THEN 'critical'
      ELSE 'warning'
    END                                                    AS breach_level
  FROM wa.wa_conversations c
  WHERE c.organization_id = p_organization_id
    AND c.status = 'open'
    AND c.last_message_at IS NOT NULL
    AND c.last_message_at < NOW() - (p_threshold_hours || ' hours')::INTERVAL
    -- Exclude conversations that already have a recent outbound (agent replied)
    AND NOT EXISTS (
      SELECT 1 FROM wa.wa_messages m
      WHERE m.conversation_id = c.id
        AND m.direction = 'outbound'
        AND m.timestamp  > c.last_message_at
    )
  ORDER BY hours_waiting DESC;
$$;


--
-- Name: FUNCTION wa_check_sla_breaches(p_organization_id uuid, p_threshold_hours integer); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_check_sla_breaches(p_organization_id uuid, p_threshold_hours integer) IS 'Returns open conversations breaching the SLA threshold (default 4h). warning = between 1×–2× threshold. critical = ≥2× threshold. Excludes conversations where an agent already replied after the last inbound message.';


--
-- Name: wa_claim_campaign_batch(uuid, integer); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_claim_campaign_batch(p_campaign_id uuid, p_limit integer DEFAULT 50) RETURNS TABLE(id uuid, contact_id uuid)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  UPDATE wa.wa_manual_campaign_recipients r
  SET status = 'processing', updated_at = NOW()
  WHERE r.id IN (
    SELECT id
    FROM wa.wa_manual_campaign_recipients
    WHERE campaign_id = p_campaign_id
      AND status = 'pending'
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING r.id, r.contact_id;
$$;


--
-- Name: wa_claim_retry_batch(integer); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_claim_retry_batch(p_limit integer DEFAULT 20) RETURNS TABLE(id uuid, organization_id uuid, contact_id uuid, wa_message_id uuid, recipient_wa_id text, message_type text, message_content jsonb, attempt_count integer, max_attempts integer, meta_error_code integer)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  UPDATE wa.wa_message_retry_queue q
  SET status        = 'processing',
      attempt_count = attempt_count + 1,
      updated_at    = NOW()
  WHERE q.id IN (
    SELECT id
    FROM wa.wa_message_retry_queue
    WHERE status = 'pending'
      AND next_attempt_at <= NOW()
    ORDER BY next_attempt_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING
    q.id, q.organization_id, q.contact_id, q.wa_message_id,
    q.recipient_wa_id, q.message_type, q.message_content,
    q.attempt_count, q.max_attempts, q.meta_error_code;
$$;


--
-- Name: wa_clear_conversation_messages(uuid, integer); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_clear_conversation_messages(p_conversation_id uuid, p_retention_hours integer DEFAULT 24) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_remaining_count int;
    v_last_message_at timestamptz;
    v_last_message_summary text;
BEGIN
    DELETE FROM wa.wa_messages
    WHERE conversation_id = p_conversation_id
      AND "timestamp" < NOW() - (p_retention_hours || ' hours')::interval;

    SELECT count(*), max("timestamp")
    INTO v_remaining_count, v_last_message_at
    FROM wa.wa_messages
    WHERE conversation_id = p_conversation_id;

    IF v_remaining_count = 0 THEN
        UPDATE wa.wa_conversations
        SET 
            last_message_at = NULL,
            last_message_summary = NULL
        WHERE id = p_conversation_id;
    ELSE
        SELECT 
            CASE 
                WHEN type = 'text' THEN (content->'text'->>'body')
                WHEN type = 'template' THEN 'Template: ' || (content->'template'->>'name')
                ELSE '[' || type || ']'
            END
        INTO v_last_message_summary
        FROM wa.wa_messages
        WHERE conversation_id = p_conversation_id
        ORDER BY "timestamp" DESC
        LIMIT 1;

        UPDATE wa.wa_conversations
        SET 
            last_message_at = v_last_message_at,
            last_message_summary = v_last_message_summary
        WHERE id = p_conversation_id;
    END IF;
END;
$$;


--
-- Name: wa_close_conversation(uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_close_conversation(p_conversation_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    UPDATE wa.wa_conversations
    SET 
        status = 'closed',
        updated_at = NOW(),
        assignee_id = NULL
    WHERE id = p_conversation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conversation ID % not found.', p_conversation_id;
    END IF;
END;
$$;


--
-- Name: wa_complete_retry(uuid, boolean, text, text); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_complete_retry(p_retry_id uuid, p_success boolean, p_new_whatsapp_msg_id text DEFAULT NULL::text, p_error_msg text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_row          RECORD;
  v_backoff_secs INT;
BEGIN
  SELECT * INTO v_row
  FROM wa.wa_message_retry_queue
  WHERE id = p_retry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retry queue row % not found', p_retry_id;
  END IF;

  IF p_success THEN
    UPDATE wa.wa_message_retry_queue
    SET status = 'succeeded', updated_at = NOW()
    WHERE id = p_retry_id;

    IF v_row.wa_message_id IS NOT NULL THEN
      UPDATE wa.wa_messages
      SET status              = 'sent',
          whatsapp_message_id = COALESCE(p_new_whatsapp_msg_id, whatsapp_message_id),
          updated_at          = NOW()
      WHERE id = v_row.wa_message_id;
    END IF;

  ELSE
    -- Exponential backoff: 5m → 30m → 2h → 8h → permanent
    v_backoff_secs := CASE v_row.attempt_count
      WHEN 1 THEN   300
      WHEN 2 THEN  1800
      WHEN 3 THEN  7200
      WHEN 4 THEN 28800
      ELSE         28800
    END;

    IF v_row.attempt_count >= v_row.max_attempts THEN
      UPDATE wa.wa_message_retry_queue
      SET status     = 'failed_permanent',
          last_error = p_error_msg,
          updated_at = NOW()
      WHERE id = p_retry_id;

      IF v_row.wa_message_id IS NOT NULL THEN
        UPDATE wa.wa_messages
        SET status = 'failed', updated_at = NOW()
        WHERE id = v_row.wa_message_id;
      END IF;

    ELSE
      UPDATE wa.wa_message_retry_queue
      SET status          = 'pending',
          next_attempt_at = NOW() + (v_backoff_secs || ' seconds')::INTERVAL,
          last_error      = p_error_msg,
          updated_at      = NOW()
      WHERE id = p_retry_id;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION wa_complete_retry(p_retry_id uuid, p_success boolean, p_new_whatsapp_msg_id text, p_error_msg text); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_complete_retry(p_retry_id uuid, p_success boolean, p_new_whatsapp_msg_id text, p_error_msg text) IS 'Finalises a retry attempt. Success → queue=succeeded, wa_messages.status=sent. Failure with attempts left → reschedule with backoff (5m/30m/2h/8h). Failure at max_attempts → queue=failed_permanent, wa_messages.status=failed.';


--
-- Name: wa_create_contact(uuid, text, text); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_create_contact(p_organization_id uuid, p_wa_id text, p_name text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_contact_id uuid;
  v_error_msg  text;
BEGIN
  SELECT id INTO v_contact_id
  FROM wa.wa_contacts
  WHERE organization_id = p_organization_id AND wa_id = p_wa_id;

  IF v_contact_id IS NOT NULL THEN
    RETURN v_contact_id::text;
  END IF;

  BEGIN
    INSERT INTO wa.wa_contacts (
      organization_id, wa_id, name, opt_in_status, resolution_status
    ) VALUES (
      p_organization_id,
      p_wa_id,
      COALESCE(p_name, p_wa_id),
      TRUE,
      'pending'
    )
    RETURNING id INTO v_contact_id;

    RETURN v_contact_id::text;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
    RETURN 'DB_ERROR: ' || v_error_msg;
  END;
END;
$$;


--
-- Name: wa_create_manual_order(uuid, uuid, uuid, jsonb); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_create_manual_order(p_organization_id uuid, p_conversation_id uuid, p_created_by uuid, p_order_details jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_order_id            uuid;
  v_contact_id          uuid;
  v_total_amount        numeric(19,4) := 0;
  v_item                jsonb;
  v_item_subtotal       numeric(19,4);
  v_item_list           text := '';
  v_template_components jsonb;
BEGIN
  SELECT contact_id INTO v_contact_id
  FROM wa.wa_conversations WHERE id = p_conversation_id;

  IF v_contact_id IS NULL THEN
    RAISE EXCEPTION 'Conversation ID % not found or has no associated contact.', p_conversation_id;
  END IF;

  SELECT
    COALESCE(SUM((item->>'quantity')::numeric * (item->>'unit_price')::numeric), 0),
    STRING_AGG((item->>'name') || ' (x' || (item->>'quantity') || ')', ', ')
  INTO v_total_amount, v_item_list
  FROM jsonb_array_elements(p_order_details->'items') AS item;

  INSERT INTO wa.x_wa_orders (
    organization_id, wa_conversation_id, contact_id, total_amount, notes, created_by
  ) VALUES (
    p_organization_id, p_conversation_id, v_contact_id,
    v_total_amount, p_order_details->>'notes', p_created_by
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_details->'items') LOOP
    v_item_subtotal := (v_item->>'quantity')::numeric * (v_item->>'unit_price')::numeric;
    INSERT INTO wa.x_wa_order_items (
      order_id, organization_id, offering_id, offering_variant_id,
      name, quantity, unit_price, subtotal
    ) VALUES (
      v_order_id, p_organization_id,
      (v_item->>'offering_id')::uuid,
      (v_item->>'offering_variant_id')::uuid,
      v_item->>'name',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price')::numeric,
      v_item_subtotal
    );
  END LOOP;

  v_template_components := jsonb_build_array(
    jsonb_build_object('type', 'body', 'parameters', jsonb_build_array(
      jsonb_build_object('type', 'text', 'text', 'Customer Name Placeholder'),
      jsonb_build_object('type', 'text', 'text', v_item_list),
      jsonb_build_object('type', 'text', 'text', v_order_id::text)
    ))
  );

  PERFORM wa.wa_send_template(
    p_organization_id, p_conversation_id, 'order_management_1', v_template_components
  );

  RETURN v_order_id;
END;
$$;


--
-- Name: FUNCTION wa_create_manual_order(p_organization_id uuid, p_conversation_id uuid, p_created_by uuid, p_order_details jsonb); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_create_manual_order(p_organization_id uuid, p_conversation_id uuid, p_created_by uuid, p_order_details jsonb) IS 'Creates a commerce order from a WA conversation. Auto-promotes the WA contact to unified.contacts + crm.contacts (shared UUID) so commerce.orders.customer_id is always a valid unified entity. No WA-specific FK columns on commerce schema — channel=whatsapp and external_identifiers->>wa_conversation_id carry the WA context.';


--
-- Name: wa_drip_campaign_performance(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_drip_campaign_performance(p_organization_id uuid, p_from timestamp with time zone DEFAULT (now() - '30 days'::interval), p_to timestamp with time zone DEFAULT now()) RETURNS TABLE(campaign_id uuid, campaign_name text, is_active boolean, total_enrolled bigint, active_count bigint, completed_count bigint, cancelled_count bigint, total_sent bigint, total_delivered bigint, total_read bigint, total_replied bigint, overall_reply_rate numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT
    c.id                                       AS campaign_id,
    c.name                                     AS campaign_name,
    c.is_active,
    COUNT(DISTINCT e.id)                       AS total_enrolled,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active')    AS active_count,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'completed') AS completed_count,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'cancelled') AS cancelled_count,
    COUNT(l.id)          FILTER (WHERE l.action = 'sent')      AS total_sent,
    COUNT(l.id)          FILTER (WHERE l.action = 'delivered') AS total_delivered,
    COUNT(l.id)          FILTER (WHERE l.action = 'read')      AS total_read,
    COUNT(l.id)          FILTER (WHERE l.action = 'replied')   AS total_replied,
    CASE
      WHEN COUNT(l.id) FILTER (WHERE l.action = 'delivered') > 0
      THEN ROUND(
        100.0 * COUNT(l.id) FILTER (WHERE l.action = 'replied')
              / COUNT(l.id) FILTER (WHERE l.action = 'delivered'), 1)
      ELSE 0
    END                                        AS overall_reply_rate
  FROM wa.wa_drip_campaigns c
  LEFT JOIN wa.wa_drip_enrollments e ON e.campaign_id = c.id
                                     AND e.created_at BETWEEN p_from AND p_to
  LEFT JOIN wa.wa_drip_execution_log l ON l.enrollment_id = e.id
  WHERE c.organization_id = p_organization_id
  GROUP BY c.id, c.name, c.is_active
  ORDER BY total_enrolled DESC;
$$;


--
-- Name: wa_drip_campaign_stats(uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_drip_campaign_stats(p_campaign_id uuid) RETURNS TABLE(total_enrolled bigint, active_count bigint, completed_count bigint, paused_count bigint, cancelled_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) AS total_enrolled,
        COUNT(*) FILTER (WHERE status = 'active') AS active_count,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
        COUNT(*) FILTER (WHERE status = 'paused') AS paused_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count
    FROM wa.wa_drip_enrollments
    WHERE campaign_id = p_campaign_id;
END;
$$;


--
-- Name: wa_drip_cancel_enrollment(uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_drip_cancel_enrollment(p_enrollment_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE wa.wa_drip_enrollments
    SET status = 'cancelled', last_activity_at = NOW()
    WHERE id = p_enrollment_id AND status IN ('active', 'paused');
END;
$$;


--
-- Name: wa_drip_enroll_contact(uuid, uuid, jsonb); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_drip_enroll_contact(p_campaign_id uuid, p_contact_id uuid, p_variables jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_enrollment_id UUID;
    v_first_step_id UUID;
    v_campaign_active BOOLEAN;
BEGIN
    SELECT is_active INTO v_campaign_active
    FROM wa.wa_drip_campaigns
    WHERE id = p_campaign_id;
    
    IF v_campaign_active IS NULL THEN
        RAISE EXCEPTION 'Campaign % not found', p_campaign_id;
    END IF;
    
    IF NOT v_campaign_active THEN
        RAISE EXCEPTION 'Campaign % is not active', p_campaign_id;
    END IF;
    
    UPDATE wa.wa_drip_enrollments
    SET status = 'cancelled',
        completed_at = NOW()
    WHERE campaign_id = p_campaign_id
      AND contact_id = p_contact_id
      AND status = 'active';
    
    v_first_step_id := wa.wa_drip_get_first_step(p_campaign_id);
    
    IF v_first_step_id IS NULL THEN
        RAISE EXCEPTION 'Campaign % has no steps', p_campaign_id;
    END IF;
    
    INSERT INTO wa.wa_drip_enrollments (
        campaign_id,
        contact_id,
        current_step_id,
        status,
        next_execution_at,
        variables
    ) VALUES (
        p_campaign_id,
        p_contact_id,
        v_first_step_id,
        'active',
        NOW(),
        p_variables
    )
    RETURNING id INTO v_enrollment_id;
    
    INSERT INTO wa.wa_drip_execution_log (enrollment_id, step_id, action, result)
    VALUES (v_enrollment_id, v_first_step_id, 'enrolled', jsonb_build_object('contact_id', p_contact_id));
    
    RETURN v_enrollment_id;
END;
$$;


--
-- Name: wa_drip_execute_step(uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_drip_execute_step(p_enrollment_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_enrollment RECORD;
    v_contact RECORD;
    v_next_step_id UUID;
    v_result TEXT;
    v_delay_hours NUMERIC;
BEGIN
    SELECT 
        e.*,
        s.step_type,
        s.content AS step_content,
        c.organization_id
    INTO v_enrollment
    FROM wa.wa_drip_enrollments e
    JOIN wa.wa_drip_steps s ON e.current_step_id = s.id
    JOIN wa.wa_drip_campaigns c ON e.campaign_id = c.id
    WHERE e.id = p_enrollment_id
      AND e.status = 'active';
    
    IF v_enrollment IS NULL THEN
        RETURN 'error:enrollment_not_found_or_inactive';
    END IF;
    
    SELECT * INTO v_contact
    FROM wa.wa_contacts
    WHERE id = v_enrollment.contact_id;
    
    IF v_contact IS NULL THEN
        RETURN 'error:contact_not_found';
    END IF;
    
    CASE v_enrollment.step_type
        WHEN 'message' THEN
            INSERT INTO wa.wa_drip_execution_log (enrollment_id, step_id, action, result)
            VALUES (
                p_enrollment_id, 
                v_enrollment.current_step_id, 
                'execute_message',
                jsonb_build_object(
                    'contact_wa_id', v_contact.wa_id,
                    'organization_id', v_enrollment.organization_id,
                    'content', v_enrollment.step_content
                )
            );
            
            v_next_step_id := wa.wa_drip_get_next_step(v_enrollment.current_step_id);
            
            IF v_next_step_id IS NOT NULL THEN
                UPDATE wa.wa_drip_enrollments
                SET 
                    current_step_id = v_next_step_id,
                    next_execution_at = NOW(),
                    last_activity_at = NOW()
                WHERE id = p_enrollment_id;
                v_result := 'advanced';
            ELSE
                IF EXISTS (
                    SELECT 1 FROM wa.wa_drip_steps 
                    WHERE parent_step_id = v_enrollment.current_step_id 
                      AND (content->>'trigger_payload' IS NOT NULL AND content->>'trigger_payload' <> '')
                ) THEN
                    UPDATE wa.wa_drip_enrollments
                    SET next_execution_at = NULL, last_activity_at = NOW()
                    WHERE id = p_enrollment_id;
                    v_result := 'waiting_for_trigger';
                ELSE
                    UPDATE wa.wa_drip_enrollments
                    SET status = 'completed', completed_at = NOW(), last_activity_at = NOW(), next_execution_at = NULL
                    WHERE id = p_enrollment_id;
                    
                    INSERT INTO wa.wa_drip_execution_log (enrollment_id, step_id, action, result)
                    VALUES (p_enrollment_id, v_enrollment.current_step_id, 'complete', '{"reason": "no_next_step_no_branches"}'::jsonb);
                    
                    v_result := 'completed';
                END IF;
            END IF;
            
        WHEN 'delay' THEN
            v_delay_hours := COALESCE((v_enrollment.step_content->>'delay_hours')::NUMERIC, 1.0);
            v_next_step_id := wa.wa_drip_get_next_step(v_enrollment.current_step_id);
            
            IF v_next_step_id IS NOT NULL THEN
                UPDATE wa.wa_drip_enrollments
                SET 
                    current_step_id = v_next_step_id,
                    next_execution_at = NOW() + (v_delay_hours || ' hours')::INTERVAL,
                    last_activity_at = NOW()
                WHERE id = p_enrollment_id;
                
                INSERT INTO wa.wa_drip_execution_log (enrollment_id, step_id, action, result)
                VALUES (p_enrollment_id, v_enrollment.current_step_id, 'execute_delay', jsonb_build_object('delay', v_delay_hours, 'next', v_next_step_id));
                v_result := 'delayed';
            ELSE
                IF EXISTS (
                    SELECT 1 FROM wa.wa_drip_steps 
                    WHERE parent_step_id = v_enrollment.current_step_id 
                      AND (content->>'trigger_payload' IS NOT NULL AND content->>'trigger_payload' <> '')
                ) THEN
                    UPDATE wa.wa_drip_enrollments SET next_execution_at = NULL, last_activity_at = NOW() WHERE id = p_enrollment_id;
                    v_result := 'waiting_for_trigger';
                ELSE
                    UPDATE wa.wa_drip_enrollments SET status = 'completed', completed_at = NOW(), last_activity_at = NOW(), next_execution_at = NULL WHERE id = p_enrollment_id;
                    INSERT INTO wa.wa_drip_execution_log (enrollment_id, step_id, action, result)
                    VALUES (p_enrollment_id, v_enrollment.current_step_id, 'complete', '{"reason": "delay_endpoint"}'::jsonb);
                    v_result := 'completed';
                END IF;
            END IF;

        WHEN 'action' THEN
            INSERT INTO wa.wa_drip_execution_log (enrollment_id, step_id, action, result)
            VALUES (p_enrollment_id, v_enrollment.current_step_id, 'execute_action', jsonb_build_object('content', v_enrollment.step_content));

            v_next_step_id := wa.wa_drip_get_next_step(v_enrollment.current_step_id);
            
            IF v_next_step_id IS NOT NULL THEN
                UPDATE wa.wa_drip_enrollments SET current_step_id = v_next_step_id, next_execution_at = NOW(), last_activity_at = NOW() WHERE id = p_enrollment_id;
                v_result := 'advanced';
            ELSE
                IF EXISTS (
                    SELECT 1 FROM wa.wa_drip_steps 
                    WHERE parent_step_id = v_enrollment.current_step_id 
                      AND (content->>'trigger_payload' IS NOT NULL AND content->>'trigger_payload' <> '')
                ) THEN
                    UPDATE wa.wa_drip_enrollments SET next_execution_at = NULL, last_activity_at = NOW() WHERE id = p_enrollment_id;
                    v_result := 'waiting_for_trigger';
                ELSE
                    UPDATE wa.wa_drip_enrollments SET status = 'completed', completed_at = NOW(), last_activity_at = NOW(), next_execution_at = NULL WHERE id = p_enrollment_id;
                    INSERT INTO wa.wa_drip_execution_log (enrollment_id, step_id, action, result)
                    VALUES (p_enrollment_id, v_enrollment.current_step_id, 'complete', '{"reason": "action_endpoint"}'::jsonb);
                    v_result := 'completed';
                END IF;
            END IF;
            
        ELSE
            v_result := 'error:unknown_step_type';
    END CASE;
    
    RETURN v_result;
END;
$$;


--
-- Name: wa_drip_get_due_enrollments(integer); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_drip_get_due_enrollments(p_limit integer DEFAULT 100) RETURNS TABLE(enrollment_id uuid, contact_id uuid, contact_wa_id text, organization_id uuid, step_id uuid, step_type text, step_content jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id AS enrollment_id,
        e.contact_id,
        c.wa_id AS contact_wa_id,
        camp.organization_id,
        e.current_step_id AS step_id,
        s.step_type,
        CASE 
            WHEN s.step_type = 'message' THEN
                wa.wa_resolve_variables(s.content, e.contact_id)
            ELSE
                s.content
        END AS step_content
    FROM wa.wa_drip_enrollments e
    JOIN wa.wa_drip_steps s ON e.current_step_id = s.id
    JOIN wa.wa_drip_campaigns camp ON e.campaign_id = camp.id
    JOIN wa.wa_contacts c ON e.contact_id = c.id
    WHERE e.status = 'active'
      AND e.next_execution_at <= NOW()
    ORDER BY e.next_execution_at ASC
    LIMIT p_limit;
END;
$$;


--
-- Name: wa_drip_get_first_step(uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_drip_get_first_step(p_campaign_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_first_step_id UUID;
BEGIN
    SELECT id INTO v_first_step_id
    FROM wa.wa_drip_steps
    WHERE campaign_id = p_campaign_id
    ORDER BY 
        (parent_step_id IS NULL) DESC,
        sequence_order ASC, 
        created_at ASC
    LIMIT 1;
    
    RETURN v_first_step_id;
END;
$$;


--
-- Name: wa_drip_get_next_step(uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_drip_get_next_step(p_current_step_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_campaign_id UUID;
    v_current_order INT;
    v_next_step_id UUID;
BEGIN
    SELECT id INTO v_next_step_id
    FROM wa.wa_drip_steps
    WHERE parent_step_id = p_current_step_id
      AND (content->>'trigger_payload' IS NULL OR content->>'trigger_payload' = '')
    ORDER BY sequence_order ASC
    LIMIT 1;

    IF v_next_step_id IS NULL THEN
        SELECT campaign_id, sequence_order 
        INTO v_campaign_id, v_current_order
        FROM wa.wa_drip_steps
        WHERE id = p_current_step_id;
        
        IF v_campaign_id IS NOT NULL THEN
            SELECT id INTO v_next_step_id
            FROM wa.wa_drip_steps
            WHERE campaign_id = v_campaign_id
              AND sequence_order > v_current_order
              AND (parent_step_id IS NULL OR parent_step_id = p_current_step_id)
            ORDER BY sequence_order ASC
            LIMIT 1;
        END IF;
    END IF;
    
    RETURN v_next_step_id;
END;
$$;


--
-- Name: wa_drip_pause_enrollment(uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_drip_pause_enrollment(p_enrollment_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE wa.wa_drip_enrollments
    SET status = 'paused', last_activity_at = NOW()
    WHERE id = p_enrollment_id AND status = 'active';
END;
$$;


--
-- Name: wa_drip_resume_enrollment(uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_drip_resume_enrollment(p_enrollment_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE wa.wa_drip_enrollments
    SET 
        status = 'active', 
        next_execution_at = NOW(),
        last_activity_at = NOW()
    WHERE id = p_enrollment_id AND status = 'paused';
END;
$$;


--
-- Name: wa_drip_step_funnel(uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_drip_step_funnel(p_campaign_id uuid) RETURNS TABLE(step_id uuid, sequence_order integer, step_type text, enrolled bigint, sent bigint, delivered bigint, read_count bigint, replied bigint, failed bigint, delivery_rate numeric, read_rate numeric, reply_rate numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT
    s.id                                       AS step_id,
    s.sequence_order,
    s.step_type,
    COUNT(DISTINCT e.id)                       AS enrolled,
    COUNT(DISTINCT l.id) FILTER (WHERE l.action = 'sent')      AS sent,
    COUNT(DISTINCT l.id) FILTER (WHERE l.action = 'delivered') AS delivered,
    COUNT(DISTINCT l.id) FILTER (WHERE l.action = 'read')      AS read_count,
    COUNT(DISTINCT l.id) FILTER (WHERE l.action = 'replied')   AS replied,
    COUNT(DISTINCT l.id) FILTER (WHERE l.action = 'failed')    AS failed,
    CASE
      WHEN COUNT(DISTINCT l.id) FILTER (WHERE l.action = 'sent') > 0
      THEN ROUND(
        100.0 * COUNT(DISTINCT l.id) FILTER (WHERE l.action = 'delivered')
              / COUNT(DISTINCT l.id) FILTER (WHERE l.action = 'sent'), 1)
      ELSE 0
    END                                        AS delivery_rate,
    CASE
      WHEN COUNT(DISTINCT l.id) FILTER (WHERE l.action = 'delivered') > 0
      THEN ROUND(
        100.0 * COUNT(DISTINCT l.id) FILTER (WHERE l.action = 'read')
              / COUNT(DISTINCT l.id) FILTER (WHERE l.action = 'delivered'), 1)
      ELSE 0
    END                                        AS read_rate,
    CASE
      WHEN COUNT(DISTINCT l.id) FILTER (WHERE l.action = 'delivered') > 0
      THEN ROUND(
        100.0 * COUNT(DISTINCT l.id) FILTER (WHERE l.action = 'replied')
              / COUNT(DISTINCT l.id) FILTER (WHERE l.action = 'delivered'), 1)
      ELSE 0
    END                                        AS reply_rate
  FROM wa.wa_drip_steps s
  LEFT JOIN wa.wa_drip_enrollments e ON e.campaign_id = s.campaign_id
  LEFT JOIN wa.wa_drip_execution_log l ON l.step_id = s.id
                                       AND l.enrollment_id = e.id
  WHERE s.campaign_id = p_campaign_id
  GROUP BY s.id, s.sequence_order, s.step_type
  ORDER BY s.sequence_order ASC;
$$;


--
-- Name: wa_drip_trigger_new_contact(); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_drip_trigger_new_contact() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_campaign RECORD;
BEGIN
    FOR v_campaign IN
        SELECT id 
        FROM wa.wa_drip_campaigns
        WHERE organization_id = NEW.organization_id
          AND is_active = TRUE
          AND trigger_type = 'new_lead'
    LOOP
        PERFORM wa.wa_drip_enroll_contact(v_campaign.id, NEW.id);
    END LOOP;
    
    RETURN NEW;
END;
$$;


--
-- Name: wa_drip_trigger_tag_added(); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_drip_trigger_tag_added() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_campaign RECORD;
    v_new_tags TEXT[];
    v_old_tags TEXT[];
    v_added_tags TEXT[];
    v_tag TEXT;
BEGIN
    v_new_tags := COALESCE(NEW.tags, ARRAY[]::TEXT[]);
    v_old_tags := COALESCE(OLD.tags, ARRAY[]::TEXT[]);
    
    v_added_tags := ARRAY(
        SELECT tag FROM UNNEST(v_new_tags) AS tag
        WHERE tag NOT IN (SELECT t FROM UNNEST(v_old_tags) AS t)
    );
    
    IF array_length(v_added_tags, 1) IS NULL THEN
        RETURN NEW;
    END IF;
    
    FOREACH v_tag IN ARRAY v_added_tags
    LOOP
        FOR v_campaign IN
            SELECT id 
            FROM wa.wa_drip_campaigns
            WHERE organization_id = NEW.organization_id
              AND is_active = TRUE
              AND trigger_type = 'tag_added'
              AND (
                  trigger_config->>'tag_name' = v_tag
                  OR trigger_config->'tag_ids' ? v_tag
              )
        LOOP
            PERFORM wa.wa_drip_enroll_contact(v_campaign.id, NEW.id);
        END LOOP;
    END LOOP;
    
    RETURN NEW;
END;
$$;


--
-- Name: wa_enqueue_retry(uuid, uuid, uuid, text, text, jsonb, integer, text, integer); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_enqueue_retry(p_organization_id uuid, p_contact_id uuid, p_wa_message_id uuid, p_recipient_wa_id text, p_message_type text, p_message_content jsonb, p_meta_error_code integer DEFAULT NULL::integer, p_meta_error_msg text DEFAULT NULL::text, p_max_attempts integer DEFAULT 5) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Idempotency: skip if this message already has a live queue entry
  IF p_wa_message_id IS NOT NULL THEN
    SELECT id INTO v_id
    FROM wa.wa_message_retry_queue
    WHERE wa_message_id = p_wa_message_id
      AND status IN ('pending', 'processing')
    LIMIT 1;

    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;

  INSERT INTO wa.wa_message_retry_queue (
    organization_id, contact_id, wa_message_id,
    recipient_wa_id, message_type, message_content,
    meta_error_code, meta_error_msg,
    max_attempts, next_attempt_at
  ) VALUES (
    p_organization_id, p_contact_id, p_wa_message_id,
    p_recipient_wa_id, p_message_type, p_message_content,
    p_meta_error_code, p_meta_error_msg,
    p_max_attempts,
    NOW() + INTERVAL '1 minute'   -- first retry after 1 min
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


--
-- Name: wa_fetch_variable_value(text, uuid, uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_fetch_variable_value(p_variable text, p_contact_id uuid, p_org_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
    v_parts text[];
    v_schema text;
    v_table text;
    v_mode text;
    v_column text;
    v_query text;
    v_result text;
    v_contact_val jsonb;
    v_has_is_active boolean;
    v_org_col text;
BEGIN
    IF p_variable LIKE 'contact.%' THEN
        v_column := substring(p_variable from 9);
        IF v_column = 'phone' THEN v_column := 'wa_id'; END IF;
        
        SELECT to_jsonb(c) INTO v_contact_val FROM wa.wa_contacts c WHERE c.id = p_contact_id;
        RETURN COALESCE(v_contact_val->>v_column, '');
    END IF;

    v_parts := string_to_array(p_variable, '.');
    IF array_length(v_parts, 1) < 4 THEN RETURN NULL; END IF;
    
    v_schema := v_parts[1];
    v_table := v_parts[2];
    v_mode := v_parts[3];
    v_column := v_parts[4];
    
    IF v_mode = 'list' THEN
        SELECT column_name INTO v_org_col
        FROM information_schema.columns 
        WHERE table_schema = v_schema AND table_name = v_table 
        AND column_name IN ('organization_id', 'context_org_id', 'pref_organization_id')
        ORDER BY (CASE column_name 
            WHEN 'organization_id' THEN 1 
            WHEN 'context_org_id' THEN 2 
            WHEN 'pref_organization_id' THEN 3 END)
        LIMIT 1;

        IF v_schema = 'identity' AND v_table = 'users' THEN
             v_query := format(
                'SELECT string_agg(u.%I::text, E''\n'') FROM identity.users u 
                 JOIN identity.organization_users ou ON u.id = ou.user_id 
                 WHERE ou.organization_id = $1 AND ou.is_active = true',
                v_column
            );
        ELSIF v_org_col IS NOT NULL THEN
            SELECT EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_schema = v_schema AND table_name = v_table AND column_name = 'is_active') 
            INTO v_has_is_active;

            v_query := format('SELECT string_agg(%I::text, E''\n'') FROM %I.%I WHERE %I = $1',
                v_column, v_schema, v_table, v_org_col);
            
            IF v_has_is_active THEN v_query := v_query || ' AND is_active = true'; END IF;
        ELSE
            RETURN NULL;
        END IF;

        BEGIN
            EXECUTE v_query INTO v_result USING p_org_id;
            RETURN COALESCE(v_result, '');
        EXCEPTION WHEN OTHERS THEN
            RETURN NULL;
        END;
    END IF;

    RETURN NULL;
END;
$_$;


--
-- Name: wa_get_available_agents(uuid, uuid, uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_get_available_agents(p_organization_id uuid, p_team_id uuid DEFAULT NULL::uuid, p_role_id uuid DEFAULT NULL::uuid) RETURNS TABLE(org_user_id uuid, full_name text, email text, role_id uuid, role_name text, team_id uuid, team_name text, open_convs bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  -- identity.organization_users has no full_name/email — these live in identity.users
  -- joined via organization_users.user_id.
  -- Team membership: identity.user_teams (not team_members) keyed on organization_user_id.
  -- Role: identity.user_roles keyed on organization_user_id.
  SELECT
    ou.id                                                           AS org_user_id,
    CONCAT_WS(' ',
      NULLIF(u.details #>> '{person,name,given}',  ''),
      NULLIF(u.details #>> '{person,name,family}', '')
    )                                                               AS full_name,
    u.email,
    ur.role_id,
    r.name                                                          AS role_name,
    tm.id                                                           AS team_id,
    tm.name                                                         AS team_name,
    COUNT(c.id) FILTER (
      WHERE c.status = 'open' AND c.assignee_id = ou.id
    )                                                               AS open_convs
  FROM identity.organization_users ou
  JOIN  identity.users       u    ON u.id  = ou.user_id
  LEFT JOIN identity.user_roles  ur   ON ur.organization_user_id = ou.id
                                      AND ur.is_active = true
  LEFT JOIN identity.roles       r    ON r.id  = ur.role_id
  LEFT JOIN identity.user_teams  ut   ON ut.organization_user_id = ou.id
                                      AND ut.is_active = true
  LEFT JOIN identity.teams       tm   ON tm.id = ut.team_id
                                      AND tm.organization_id = p_organization_id
  LEFT JOIN wa.wa_conversations  c    ON c.assignee_id = ou.id
                                      AND c.organization_id = p_organization_id
  WHERE ou.organization_id = p_organization_id
    AND ou.is_active = true
    AND (p_team_id IS NULL OR tm.id = p_team_id)
    AND (p_role_id IS NULL OR ur.role_id = p_role_id)
  GROUP BY ou.id, u.details, u.email, ur.role_id, r.name, tm.id, tm.name
  ORDER BY open_convs ASC, full_name ASC;
$$;


--
-- Name: FUNCTION wa_get_available_agents(p_organization_id uuid, p_team_id uuid, p_role_id uuid); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_get_available_agents(p_organization_id uuid, p_team_id uuid, p_role_id uuid) IS 'Read-only RPC: lists active org members for WA conversation assignment. Returns org_user_id = identity.organization_users.id — the value stored in wa_conversations.assignee_id. Name/email resolved via identity.users join. Team via identity.user_teams (keyed on organization_user_id). Role via identity.user_roles. open_convs ascending = lightest load first.';


--
-- Name: wa_get_catalog_for_org(uuid, integer, uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_get_catalog_for_org(p_organization_id uuid, p_limit integer DEFAULT 50, p_category_id uuid DEFAULT NULL::uuid) RETURNS TABLE(offering_id uuid, name text, short_code text, description text, type text, currency text, price numeric, is_physical boolean, is_digital boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT
    o.id,
    o.name,
    o.short_code,
    o.description,
    o.type,
    COALESCE(op.currency, 'INR'),
    op.price,
    o.is_physical,
    o.is_digital
  FROM catalog.offerings o
  LEFT JOIN LATERAL (
    SELECT currency, price
    FROM catalog.offering_prices
    WHERE offering_id = o.id
      AND (valid_to IS NULL OR valid_to > NOW())
    ORDER BY created_at DESC
    LIMIT 1
  ) op ON TRUE
  WHERE o.organization_id = p_organization_id
    AND o.is_active = true
    AND o.enable_checkout = true
    AND (p_category_id IS NULL OR o.category_id = p_category_id)
  ORDER BY o.name
  LIMIT p_limit;
$$;


--
-- Name: wa_get_contact_context(uuid, uuid, uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_get_contact_context(p_contact_id uuid, p_organization_id uuid, p_conversation_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_ctx       JSONB := '{}'::JSONB;
  v_wa        RECORD;
  v_unified   RECORD;
  v_crm       RECORD;
  v_order     RECORD;
  v_agent     RECORD;
  v_org       RECORD;
  v_assignee  UUID;
BEGIN
  -- ── WA contact (always available) ──────────────────────────────────────────
  SELECT id, wa_id, name, identity_type, linked_entity_id, metadata
  INTO v_wa
  FROM wa.wa_contacts
  WHERE id = p_contact_id AND organization_id = p_organization_id;

  IF NOT FOUND THEN RETURN v_ctx; END IF;

  v_ctx := v_ctx
    || jsonb_build_object(
         'contact.phone',     COALESCE(v_wa.wa_id, ''),
         'contact.wa_id',     COALESCE(v_wa.wa_id, ''),
         'contact.name',      COALESCE(v_wa.name, v_wa.wa_id, ''),
         'contact.first_name', COALESCE(
           split_part(v_wa.name, ' ', 1),
           v_wa.wa_id, ''
         ),
         'contact.last_name',  NULLIF(
           TRIM(SUBSTRING(v_wa.name FROM POSITION(' ' IN v_wa.name) + 1)),
           ''
         )
       );

  -- ── unified.contacts (if promoted — richer name/email/phone) ───────────────
  IF v_wa.linked_entity_id IS NOT NULL THEN
    SELECT id, name, first_name, last_name, email, phone
    INTO v_unified
    FROM unified.contacts
    WHERE id = v_wa.linked_entity_id;

    IF FOUND THEN
      v_ctx := v_ctx
        || jsonb_strip_nulls(jsonb_build_object(
             'contact.name',       COALESCE(v_unified.name, v_ctx->>'contact.name'),
             'contact.first_name', COALESCE(v_unified.first_name,
                                     split_part(COALESCE(v_unified.name,''), ' ', 1),
                                     v_ctx->>'contact.first_name'),
             'contact.last_name',  COALESCE(v_unified.last_name,
                                     NULLIF(TRIM(SUBSTRING(COALESCE(v_unified.name,'')
                                       FROM POSITION(' ' IN COALESCE(v_unified.name,'')) + 1)), ''),
                                     v_ctx->>'contact.last_name'),
             'contact.email',      v_unified.email,
             'contact.phone',      COALESCE(v_unified.phone, v_ctx->>'contact.phone')
           ));
    END IF;

    -- ── crm.contacts (score, stage, account) ─────────────────────────────────
    -- crm.accounts has no `name` column — name is in details->>'name'
    SELECT cc.score, cc.stage_id, cc.tags,
           ca.details->>'name' AS account_name
    INTO v_crm
    FROM crm.contacts cc
    LEFT JOIN crm.accounts ca ON ca.id = cc.account_id
    WHERE cc.id = v_wa.linked_entity_id;

    IF FOUND THEN
      v_ctx := v_ctx
        || jsonb_strip_nulls(jsonb_build_object(
             'crm.score',        v_crm.score::TEXT,
             'crm.stage',        v_crm.stage_id,
             'crm.tags',         array_to_string(v_crm.tags, ', '),
             'crm.account_name', v_crm.account_name
           ));
    END IF;
  END IF;

  -- ── Latest commerce order for this contact ────────────────────────────────
  -- customer_id = unified.contacts.id = wa_contacts.id (shared UUID, or linked_entity_id)
  SELECT o.order_number, o.total_price, o.currency, o.status
  INTO v_order
  FROM commerce.orders o
  WHERE o.customer_id = COALESCE(v_wa.linked_entity_id, p_contact_id)
    AND o.organization_id = p_organization_id
  ORDER BY o.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    v_ctx := v_ctx
      || jsonb_build_object(
           'order.number',   COALESCE(v_order.order_number, ''),
           'order.total',    COALESCE(v_order.total_price::TEXT, ''),
           'order.currency', COALESCE(v_order.currency, ''),
           'order.status',   COALESCE(v_order.status, '')
         );
  END IF;

  -- ── Assigned agent (from conversation) ────────────────────────────────────
  IF p_conversation_id IS NOT NULL THEN
    SELECT assignee_id INTO v_assignee
    FROM wa.wa_conversations
    WHERE id = p_conversation_id AND organization_id = p_organization_id;

    IF v_assignee IS NOT NULL THEN
      -- organization_users has no full_name/email — join to identity.users via user_id
      SELECT CONCAT_WS(' ',
               NULLIF(u.details #>> '{person,name,given}',  ''),
               NULLIF(u.details #>> '{person,name,family}', '')
             ) AS full_name,
             u.email
      INTO v_agent
      FROM identity.organization_users ou
      JOIN identity.users u ON u.id = ou.user_id
      WHERE ou.id = v_assignee AND ou.organization_id = p_organization_id;

      IF FOUND THEN
        v_ctx := v_ctx
          || jsonb_strip_nulls(jsonb_build_object(
               'agent.name',  v_agent.full_name,
               'agent.email', v_agent.email
             ));
      END IF;
    END IF;
  END IF;

  -- ── Organization ─────────────────────────────────────────────────────────
  SELECT name,
         COALESCE(app_settings->>'displayName', name) AS display_name
  INTO v_org
  FROM identity.organizations
  WHERE id = p_organization_id;

  IF FOUND THEN
    v_ctx := v_ctx
      || jsonb_build_object(
           'org.name',         COALESCE(v_org.name, ''),
           'org.display_name', COALESCE(v_org.display_name, v_org.name, '')
         );
  END IF;

  RETURN v_ctx;
END;
$$;


--
-- Name: FUNCTION wa_get_contact_context(p_contact_id uuid, p_organization_id uuid, p_conversation_id uuid); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_get_contact_context(p_contact_id uuid, p_organization_id uuid, p_conversation_id uuid) IS 'Builds a flat JSONB variable map for template resolution. Layers: wa_contacts → unified.contacts → crm.contacts → commerce.orders → agent → org. Keys: contact.name/first_name/last_name/email/phone, crm.score/stage/tags/account_name, order.number/total/currency/status, agent.name/email, org.name/display_name. Merges caller-supplied p_context on top (caller values take precedence).';


--
-- Name: wa_get_contact_orders(uuid, integer); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_get_contact_orders(p_wa_contact_id uuid, p_limit integer DEFAULT 10) RETURNS TABLE(order_id uuid, order_number text, status text, total_price numeric, currency text, item_count bigint, created_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT
    o.id,
    o.order_number,
    o.status,
    o.total_price,
    o.currency,
    COUNT(li.id) AS item_count,
    o.created_at
  FROM commerce.orders o
  LEFT JOIN commerce.order_items li ON li.order_id = o.id
  WHERE o.customer_id = p_wa_contact_id   -- shared UUID: wa_contact.id = unified.contacts.id
  GROUP BY o.id, o.order_number, o.status, o.total_price, o.currency, o.created_at
  ORDER BY o.created_at DESC
  LIMIT p_limit;
$$;


--
-- Name: FUNCTION wa_get_contact_orders(p_wa_contact_id uuid, p_limit integer); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_get_contact_orders(p_wa_contact_id uuid, p_limit integer) IS 'Returns orders for a WA contact. Works because wa_contacts.id = unified.contacts.id after promotion (shared UUID pattern) — no join through a bridge table needed.';


--
-- Name: wa_get_context_value(jsonb, text); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_get_context_value(p_context jsonb, p_path text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    v_parts text[];
    v_val jsonb;
BEGIN
    IF p_context IS NULL OR p_path IS NULL THEN
        RETURN NULL;
    END IF;

    -- Split path by dot
    v_parts := string_to_array(p_path, '.');
    
    -- Extract path
    v_val := p_context #> v_parts;
    
    -- Return text representation (unquoted)
    IF v_val IS NULL OR jsonb_typeof(v_val) = 'null' THEN
        RETURN NULL;
    END IF;
    
    RETURN v_val #>> '{}';
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


--
-- Name: wa_get_or_create_conversation(uuid, uuid, uuid, text); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_get_or_create_conversation(p_organization_id uuid, p_contact_id uuid, p_location_id uuid DEFAULT NULL::uuid, p_whatsapp_conversation_id text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'identity'
    AS $$
DECLARE
    conversation_uuid UUID;
    v_current_status text;
BEGIN
    -- 1. Check for ANY existing conversation for this contact
    SELECT id, status INTO conversation_uuid, v_current_status
    FROM wa.wa_conversations
    WHERE organization_id = p_organization_id
      AND contact_id = p_contact_id
    LIMIT 1;

    -- 2. If found, ensure it is OPEN
    IF conversation_uuid IS NOT NULL THEN
        IF v_current_status <> 'open' THEN
            UPDATE wa.wa_conversations
            SET status = 'open',
                updated_at = NOW()
            WHERE id = conversation_uuid;
        END IF;
        RETURN conversation_uuid;
    END IF;

    -- 3. If not found, create a NEW one
    INSERT INTO wa.wa_conversations (
        organization_id, 
        contact_id, 
        location_id, 
        channel_conversation_id,
        status
    )
    VALUES (
        p_organization_id, 
        p_contact_id, 
        p_location_id, 
        p_whatsapp_conversation_id,
        'open'
    )
    RETURNING id INTO conversation_uuid;

    RETURN conversation_uuid;
END;
$$;


--
-- Name: wa_get_organization_by_phone_number_id(text); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_get_organization_by_phone_number_id(p_phone_number_id text) RETURNS TABLE(id uuid, app_settings jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
    SELECT
      o.id,
      o.app_settings
    FROM
      identity.organizations AS o
    WHERE
      o.app_settings->'channels'->'whatsapp'->'configuration'->>'phoneNumberId' = p_phone_number_id
    LIMIT 1;
END;
$$;


--
-- Name: wa_handle_optin(uuid, uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_handle_optin(p_contact_id uuid, p_organization_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE wa.wa_contacts
  SET opt_in_status = true,
      opted_in_at   = NOW(),
      opted_out_at  = NULL,
      updated_at    = NOW()
  WHERE id = p_contact_id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact % not found in org %', p_contact_id, p_organization_id;
  END IF;
END;
$$;


--
-- Name: FUNCTION wa_handle_optin(p_contact_id uuid, p_organization_id uuid); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_handle_optin(p_contact_id uuid, p_organization_id uuid) IS 'Marks a WA contact as opted-in. Call from whatsapp-receiver when START keyword fires. Sets opt_in_status=true, records opted_in_at, clears opted_out_at.';


--
-- Name: wa_handle_optout(uuid, uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_handle_optout(p_contact_id uuid, p_organization_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE wa.wa_contacts
  SET opt_in_status = false,
      opted_out_at  = NOW(),
      updated_at    = NOW()
  WHERE id = p_contact_id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact % not found in org %', p_contact_id, p_organization_id;
  END IF;

  -- Cancel any active/paused drip enrollments so the drip processor
  -- doesn't keep attempting sends for an opted-out contact.
  UPDATE wa.wa_drip_enrollments
  SET status     = 'cancelled',
      updated_at = NOW()
  WHERE contact_id       = p_contact_id
    AND organization_id  = p_organization_id
    AND status IN ('active', 'paused');
END;
$$;


--
-- Name: FUNCTION wa_handle_optout(p_contact_id uuid, p_organization_id uuid); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_handle_optout(p_contact_id uuid, p_organization_id uuid) IS 'Marks a WA contact as opted-out. Call from whatsapp-receiver when STOP keyword fires. Sets opt_in_status=false, records opted_out_at, cancels active/paused drip enrollments.';


--
-- Name: wa_link_contact(uuid, uuid, text); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_link_contact(p_wa_contact_id uuid, p_linked_entity_id uuid, p_linked_entity_type text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_identity_type TEXT;
BEGIN
    CASE p_linked_entity_type

        WHEN 'identity.users' THEN
            IF EXISTS (
                SELECT 1 FROM workforce.timesheets
                WHERE user_id = p_linked_entity_id
                LIMIT 1
            ) THEN
                v_identity_type := 'field_worker';
            ELSE
                v_identity_type := 'employee';
            END IF;

        WHEN 'unified.contacts', 'external.contacts' THEN
            SELECT
                CASE
                    WHEN c.is_partner_delegate = TRUE
                         OR uc.persona_type = 'b2b_partner'     THEN 'b2b_partner'
                    WHEN c.lifecycle_stage::TEXT = 'customer'   THEN 'b2c_customer'
                    WHEN c.lifecycle_stage::TEXT = 'lead'       THEN 'b2c_lead'
                    ELSE 'b2c_customer'
                END
            INTO v_identity_type
            FROM crm.contacts c
            JOIN unified.contacts uc ON uc.id = c.id
            WHERE c.id = p_linked_entity_id;

            IF v_identity_type IS NULL THEN
                RAISE EXCEPTION
                    'Entity ID % not found in crm.contacts / unified.contacts',
                    p_linked_entity_id;
            END IF;

        ELSE
            RAISE EXCEPTION
                'Invalid linked_entity_type: %. Must be ''identity.users'' or ''unified.contacts''.',
                p_linked_entity_type;
    END CASE;

    UPDATE wa.wa_contacts
    SET
        linked_entity_id   = p_linked_entity_id,
        linked_entity_type = CASE
                                 WHEN p_linked_entity_type = 'external.contacts'
                                 THEN 'unified.contacts'
                                 ELSE p_linked_entity_type
                             END,
        identity_type      = v_identity_type,
        updated_at         = NOW()
    WHERE id = p_wa_contact_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'WA Contact ID % not found.', p_wa_contact_id;
    END IF;
END;
$$;


--
-- Name: FUNCTION wa_link_contact(p_wa_contact_id uuid, p_linked_entity_id uuid, p_linked_entity_type text); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_link_contact(p_wa_contact_id uuid, p_linked_entity_id uuid, p_linked_entity_type text) IS 'Link a wa_contact to identity.users or unified.contacts (was external.contacts) with auto identity_type detection. Updated 2026-05-05 to query crm.contacts.';


--
-- Name: wa_log_message(uuid, uuid, text, text, text, jsonb, text, timestamp with time zone); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_log_message(p_organization_id uuid, p_contact_id uuid, p_whatsapp_message_id text, p_direction text, p_type text, p_content jsonb, p_status text, p_timestamp timestamp with time zone) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$BEGIN
    INSERT INTO wa.wa_messages (
        organization_id,
        contact_id,
        whatsapp_message_id,
        direction,
        type,
        content,
        status,
        "timestamp"
    )
    VALUES (
        p_organization_id,
        p_contact_id,
        p_whatsapp_message_id,
        p_direction,
        p_type,
        p_content,
        p_status,
        p_timestamp
    );
END;$$;


--
-- Name: wa_log_message(uuid, uuid, text, text, text, jsonb, text, timestamp with time zone, text); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_log_message(p_organization_id uuid, p_contact_id uuid, p_whatsapp_message_id text, p_direction text, p_type text, p_content jsonb, p_status text, p_timestamp timestamp with time zone, p_channel text DEFAULT 'whatsapp'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO wa.wa_messages (
        organization_id,
        contact_id,
        whatsapp_message_id,
        direction,
        type,
        content,
        status,
        channel,
        "timestamp"
    ) VALUES (
        p_organization_id,
        p_contact_id,
        p_whatsapp_message_id,
        p_direction,
        p_type,
        p_content,
        COALESCE(p_status, CASE WHEN p_direction = 'inbound' THEN 'received' ELSE 'sent' END),
        COALESCE(p_channel, 'whatsapp'),
        p_timestamp
    );
END;
$$;


--
-- Name: wa_manual_campaign_increment_failed(uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_manual_campaign_increment_failed(p_campaign_id uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    AS $$
  UPDATE wa.wa_manual_campaigns
  SET failed_count = failed_count + 1, updated_at = NOW()
  WHERE id = p_campaign_id;
$$;


--
-- Name: wa_manual_campaign_increment_sent(uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_manual_campaign_increment_sent(p_campaign_id uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    AS $$
  UPDATE wa.wa_manual_campaigns
  SET sent_count = sent_count + 1, updated_at = NOW()
  WHERE id = p_campaign_id;
$$;


--
-- Name: wa_manual_campaign_send(uuid, uuid, uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_manual_campaign_send(p_campaign_id uuid, p_organization_id uuid, p_initiated_by uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_campaign     RECORD;
  v_contact      RECORD;
  v_queued       INT := 0;
  v_skipped      INT := 0;
BEGIN
  SELECT * INTO v_campaign
  FROM wa.wa_manual_campaigns
  WHERE id = p_campaign_id AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign % not found in org %', p_campaign_id, p_organization_id;
  END IF;

  IF v_campaign.status NOT IN ('draft', 'scheduled') THEN
    RAISE EXCEPTION 'Campaign % is in status % — can only send from draft or scheduled',
      p_campaign_id, v_campaign.status;
  END IF;

  IF v_campaign.template_id IS NULL THEN
    RAISE EXCEPTION 'Campaign % has no template_id set — assign a template before sending',
      p_campaign_id;
  END IF;

  -- Mark campaign as sending
  UPDATE wa.wa_manual_campaigns
  SET status = 'sending', updated_at = NOW(), updated_by = p_initiated_by
  WHERE id = p_campaign_id;

  -- Build recipient list: opted-in contacts matching target_filter
  -- target_filter keys supported: tags[], identity_types[], location_id
  FOR v_contact IN
    SELECT c.id, c.wa_id, c.opt_in_status
    FROM wa.wa_contacts c
    WHERE c.organization_id = p_organization_id
      AND c.opt_in_status = true
      AND c.wa_id IS NOT NULL
      -- tag filter (any overlap if specified)
      AND (
        NOT (v_campaign.target_filter ? 'tags')
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(v_campaign.target_filter->'tags') t
          WHERE t = ANY(
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(c.metadata->'tags', '[]')))
          )
        )
      )
      -- identity_type filter
      AND (
        NOT (v_campaign.target_filter ? 'identity_types')
        OR c.identity_type = ANY(
          ARRAY(SELECT jsonb_array_elements_text(v_campaign.target_filter->'identity_types'))
        )
      )
  LOOP
    INSERT INTO wa.wa_manual_campaign_recipients (
      campaign_id, organization_id, contact_id, status
    ) VALUES (
      p_campaign_id, p_organization_id, v_contact.id, 'pending'
    )
    ON CONFLICT (campaign_id, contact_id) DO NOTHING;
    -- Only count if actually inserted (not a duplicate)
    IF FOUND THEN v_queued := v_queued + 1; END IF;
  END LOOP;

  -- Count opted-out contacts in the same filtered audience (accurate skip metric)
  SELECT COUNT(*) INTO v_skipped
  FROM wa.wa_contacts c
  WHERE c.organization_id = p_organization_id
    AND c.opt_in_status = false
    AND c.wa_id IS NOT NULL
    AND (
      NOT (v_campaign.target_filter ? 'tags')
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(v_campaign.target_filter->'tags') t
        WHERE t = ANY(
          ARRAY(SELECT jsonb_array_elements_text(COALESCE(c.metadata->'tags', '[]')))
        )
      )
    )
    AND (
      NOT (v_campaign.target_filter ? 'identity_types')
      OR c.identity_type = ANY(
        ARRAY(SELECT jsonb_array_elements_text(v_campaign.target_filter->'identity_types'))
      )
    );

  -- Update campaign counters
  UPDATE wa.wa_manual_campaigns
  SET target_count = v_queued, updated_at = NOW()
  WHERE id = p_campaign_id;

  RETURN jsonb_build_object(
    'campaign_id',       p_campaign_id,
    'queued',            v_queued,
    'skipped_optout',    v_skipped,
    'status',            'sending'
  );
END;
$$;


--
-- Name: FUNCTION wa_manual_campaign_send(p_campaign_id uuid, p_organization_id uuid, p_initiated_by uuid); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_manual_campaign_send(p_campaign_id uuid, p_organization_id uuid, p_initiated_by uuid) IS 'Queues a manual broadcast campaign for sending. Filters to opted-in contacts only (Meta policy compliance). Populates wa_manual_campaign_recipients with status=pending. Actual Meta API calls are made by process-manual-campaigns edge function which reads pending rows and calls whatsapp-sender per contact.';


--
-- Name: wa_preview_variables(uuid, uuid, uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_preview_variables(p_contact_id uuid, p_organization_id uuid, p_conversation_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT wa.wa_get_contact_context(p_contact_id, p_organization_id, p_conversation_id);
$$;


--
-- Name: FUNCTION wa_preview_variables(p_contact_id uuid, p_organization_id uuid, p_conversation_id uuid); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_preview_variables(p_contact_id uuid, p_organization_id uuid, p_conversation_id uuid) IS 'Returns the full resolved variable map for a contact + conversation. Used by the template composer UI to show a live {{variable}} preview. Returns JSONB like: {"contact.name":"Priya", "order.number":"WA-20260528-AB12", ...}';


--
-- Name: wa_promote_contact(uuid, uuid, uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_promote_contact(p_wa_contact_id uuid, p_organization_id uuid, p_promoted_by uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_wa     RECORD;
  v_name   TEXT;
  v_phone  TEXT;
  v_email  TEXT;
BEGIN
  SELECT id, organization_id, name, wa_id,
         linked_entity_id, resolution_status, metadata
  INTO v_wa
  FROM wa.wa_contacts
  WHERE id = p_wa_contact_id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WA contact % not found in org %', p_wa_contact_id, p_organization_id;
  END IF;

  -- Idempotent: already promoted → return existing entity id
  IF v_wa.linked_entity_id IS NOT NULL THEN
    RETURN v_wa.linked_entity_id;
  END IF;

  v_name  := COALESCE(NULLIF(v_wa.name, ''), v_wa.wa_id);
  v_phone := v_wa.wa_id;
  v_email := 'wa+' || v_phone || '@noreply.zoworks.com';

  -- Create unified.contacts using the SAME UUID as wa_contacts.id
  INSERT INTO unified.contacts (
    id, organization_id, name, phone, email,
    contact_type, module, lifecycle_stage,
    created_by, created_at, updated_at
  ) VALUES (
    p_wa_contact_id,
    p_organization_id,
    v_name,
    v_phone,
    v_email,
    'person',
    'wa',
    'lead',
    p_promoted_by,
    NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create crm.contacts with the SAME UUID.
  -- NOTE: is_active removed — column dropped by this migration (0097).
  INSERT INTO crm.contacts (
    id, organization_id,
    lead_source, tags,
    created_by, created_at, updated_at
  ) VALUES (
    p_wa_contact_id,
    p_organization_id,
    'whatsapp',
    ARRAY['wa-promoted'],
    p_promoted_by,
    NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Mark wa_contact as resolved
  UPDATE wa.wa_contacts
  SET linked_entity_id    = p_wa_contact_id,
      linked_entity_type  = 'unified.contacts',   -- platform convention; used by wa_get_contact_context()
      resolution_status   = 'resolved',
      identity_type       = COALESCE(identity_type, 'b2c_lead'),
      updated_at          = NOW()
  WHERE id = p_wa_contact_id;

  RETURN p_wa_contact_id;
END;
$$;


--
-- Name: FUNCTION wa_promote_contact(p_wa_contact_id uuid, p_organization_id uuid, p_promoted_by uuid); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_promote_contact(p_wa_contact_id uuid, p_organization_id uuid, p_promoted_by uuid) IS 'Promotes a WA channel contact into the shared contact graph. Creates unified.contacts + crm.contacts using the SAME UUID as wa_contacts.id (shared UUID pattern). Idempotent: safe to call multiple times. Patched by migration 0097: removed is_active from crm.contacts INSERT (column dropped by domain deduplication).';


--
-- Name: wa_promote_to_lead(uuid, text); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_promote_to_lead(p_wa_contact_id uuid, p_identity_type text DEFAULT 'b2c_lead'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_wc     RECORD;
  v_new_id uuid;
BEGIN
  SELECT * INTO v_wc FROM wa.wa_contacts WHERE id = p_wa_contact_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wa_contact % not found', p_wa_contact_id;
  END IF;

  IF v_wc.linked_entity_type = 'identity.users' THEN
    RAISE EXCEPTION 'wa_contact % is an internal user (identity_type=%) and cannot be promoted to a CRM lead',
      p_wa_contact_id, v_wc.identity_type;
  END IF;

  -- Already linked to a CRM contact — update classification only
  IF v_wc.linked_entity_id IS NOT NULL AND v_wc.linked_entity_type = 'unified.contacts' THEN
    UPDATE wa.wa_contacts
    SET identity_type     = p_identity_type,
        resolution_status = 'resolved',
        updated_at        = NOW()
    WHERE id = p_wa_contact_id;
    RETURN v_wc.linked_entity_id;
  END IF;

  -- Unknown contact — create unified + crm anchor, then link
  v_new_id := gen_random_uuid();

  INSERT INTO unified.contacts (
    id, organization_id, name, phone, module, contact_type, persona_type, lifecycle_stage
  ) VALUES (
    v_new_id,
    v_wc.organization_id,
    COALESCE(v_wc.name, v_wc.wa_id),
    v_wc.wa_id,
    'wa',
    'person',
    'contact',
    'lead'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO crm.contacts (id, organization_id)
  VALUES (v_new_id, v_wc.organization_id)
  ON CONFLICT (id) DO NOTHING;

  UPDATE wa.wa_contacts
  SET linked_entity_id   = v_new_id,
      linked_entity_type = 'unified.contacts',
      identity_type      = p_identity_type,
      resolution_status  = 'resolved',
      updated_at         = NOW()
  WHERE id = p_wa_contact_id;

  RETURN v_new_id;
END;
$$;


--
-- Name: FUNCTION wa_promote_to_lead(p_wa_contact_id uuid, p_identity_type text); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_promote_to_lead(p_wa_contact_id uuid, p_identity_type text) IS 'Promotes a WA channel contact to a CRM lead. The wa_contacts row is retained as the channel record; a new unified.contacts + crm.contacts anchor is created and linked back. Internal users (identity.users) are rejected — they are never CRM leads.';


--
-- Name: wa_provision_tenant(uuid, text, text, text, text, boolean); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_provision_tenant(p_organization_id uuid, p_phone_number_id text, p_waba_id text, p_access_token text, p_display_name text DEFAULT NULL::text, p_activate_org boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_org_name     TEXT;
  v_existing_pnid TEXT;
  v_wa_config    JSONB;
BEGIN
  -- ── Validate org exists ─────────────────────────────────────────────────
  SELECT name INTO v_org_name
  FROM identity.organizations
  WHERE id = p_organization_id;

  IF v_org_name IS NULL THEN
    RAISE EXCEPTION 'Organization % not found', p_organization_id;
  END IF;

  -- ── Guard: don't silently steal a phone_number_id already assigned elsewhere ─
  SELECT o.app_settings->'channels'->'whatsapp'->'configuration'->>'phoneNumberId'
  INTO v_existing_pnid
  FROM identity.organizations o
  WHERE o.app_settings->'channels'->'whatsapp'->'configuration'->>'phoneNumberId' = p_phone_number_id
    AND o.id <> p_organization_id
  LIMIT 1;

  IF v_existing_pnid IS NOT NULL THEN
    RAISE EXCEPTION 'phoneNumberId % is already registered to a different organization', p_phone_number_id;
  END IF;

  -- ── 1. Write WABA config into app_settings ──────────────────────────────
  v_wa_config := jsonb_build_object(
    'phoneNumberId', p_phone_number_id,
    'wabaId',        p_waba_id,
    'accessToken',   p_access_token,
    'displayName',   COALESCE(p_display_name, v_org_name),
    'provisionedAt', now()
  );

  UPDATE identity.organizations
  SET
    app_settings = COALESCE(app_settings, '{}'::jsonb)
      || jsonb_build_object(
           'channels', COALESCE(app_settings->'channels', '{}'::jsonb)
             || jsonb_build_object(
                  'whatsapp', COALESCE(app_settings->'channels'->'whatsapp', '{}'::jsonb)
                    || jsonb_build_object('configuration', v_wa_config)
                )
         ),
    is_active = CASE WHEN p_activate_org THEN true ELSE is_active END,
    updated_at = now()
  WHERE id = p_organization_id;

  -- ── 2. Seed mandatory baseline automation rules ─────────────────────────
  -- STOP / opt-out — every WABA must honour this per Meta policy
  INSERT INTO wa.wa_automation_rules (
    organization_id, name, trigger_type, is_active, priority,
    trigger_config, response_config,
    -- legacy flat columns kept in sync
    keywords, response_type, response_content
  ) VALUES (
    p_organization_id,
    'Opt-Out (STOP)',
    'keyword',
    true,
    1,   -- highest priority
    '{"keywords": ["STOP", "stop", "unsubscribe", "opt out", "optout"]}',
    '{"type": "text", "content": "You have been unsubscribed. Reply START to re-subscribe."}',
    ARRAY['STOP','stop','unsubscribe','opt out','optout'],
    'text',
    'You have been unsubscribed. Reply START to re-subscribe.'
  )
  ON CONFLICT (organization_id, name) DO NOTHING;

  -- START / re-subscribe
  INSERT INTO wa.wa_automation_rules (
    organization_id, name, trigger_type, is_active, priority,
    trigger_config, response_config,
    keywords, response_type, response_content
  ) VALUES (
    p_organization_id,
    'Re-Subscribe (START)',
    'keyword',
    true,
    2,
    '{"keywords": ["START", "start", "subscribe"]}',
    '{"type": "text", "content": "You have been re-subscribed. Reply STOP at any time to unsubscribe."}',
    ARRAY['START','start','subscribe'],
    'text',
    'You have been re-subscribed. Reply STOP at any time to unsubscribe.'
  )
  ON CONFLICT (organization_id, name) DO NOTHING;

  -- HELP
  INSERT INTO wa.wa_automation_rules (
    organization_id, name, trigger_type, is_active, priority,
    trigger_config, response_config,
    keywords, response_type, response_content
  ) VALUES (
    p_organization_id,
    'Help',
    'keyword',
    true,
    10,
    '{"keywords": ["HELP", "help", "?"]}',
    '{"type": "text", "content": "Need assistance? A team member will be with you shortly. Reply STOP to unsubscribe."}',
    ARRAY['HELP','help','?'],
    'text',
    'Need assistance? A team member will be with you shortly. Reply STOP to unsubscribe.'
  )
  ON CONFLICT (organization_id, name) DO NOTHING;

  RETURN jsonb_build_object(
    'status',           'provisioned',
    'organization_id',  p_organization_id,
    'org_name',         v_org_name,
    'phone_number_id',  p_phone_number_id,
    'waba_id',          p_waba_id,
    'seeded_rules',     3
  );
END;
$$;


--
-- Name: FUNCTION wa_provision_tenant(p_organization_id uuid, p_phone_number_id text, p_waba_id text, p_access_token text, p_display_name text, p_activate_org boolean); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_provision_tenant(p_organization_id uuid, p_phone_number_id text, p_waba_id text, p_access_token text, p_display_name text, p_activate_org boolean) IS 'Admin RPC: wires a new or existing tenant into the WA channel. Writes phoneNumberId/wabaId/accessToken into identity.organizations.app_settings, activates the org, and seeds the mandatory STOP/START/HELP automation rules. Idempotent — safe to re-run to rotate the access token or update the phone number.';


--
-- Name: wa_resolve_identity(text, uuid); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_resolve_identity(p_phone_number text, p_organization_id uuid) RETURNS TABLE(entity_id uuid, entity_type text, identity_type text, display_name text, segment_tags text[])
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_normalized_phone TEXT;
  v_user             RECORD;
  v_contact          RECORD;
  v_has_orders       BOOLEAN;
  v_has_deals        BOOLEAN;
  v_score            NUMERIC;
BEGIN
  v_normalized_phone := RIGHT(regexp_replace(p_phone_number, '[^0-9]', '', 'g'), 10);

  -- Population A: identity.users (employees, field workers, contractors)
  SELECT u.* INTO v_user
  FROM identity.users u
  LEFT JOIN identity.organization_users ou
         ON u.id = ou.user_id AND ou.organization_id = p_organization_id
  WHERE RIGHT(regexp_replace(u.mobile, '[^0-9]', '', 'g'), 10) = v_normalized_phone
    AND u.deleted_at IS NULL
  ORDER BY CASE WHEN ou.organization_id = p_organization_id THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_user.id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM workforce.timesheets WHERE user_id = v_user.id LIMIT 1) THEN
      RETURN QUERY SELECT v_user.id, 'identity.users'::TEXT, 'field_worker'::TEXT,
                          v_user.name, ARRAY['internal','field_worker']::TEXT[];
      RETURN;
    END IF;
    RETURN QUERY SELECT v_user.id, 'identity.users'::TEXT, 'employee'::TEXT,
                        v_user.name, ARRAY['internal','employee']::TEXT[];
    RETURN;
  END IF;

  -- Population B: crm.contacts (existing customers, partners, leads)
  SELECT c.*, uc.phone, uc.name, uc.contact_type, uc.persona_type INTO v_contact
  FROM crm.contacts c
  JOIN unified.contacts uc ON c.id = uc.id
  WHERE RIGHT(regexp_replace(uc.phone, '[^0-9]', '', 'g'), 10) = v_normalized_phone
    AND c.organization_id = p_organization_id
    AND c.deleted_at IS NULL
  LIMIT 1;

  IF v_contact.id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM wa.x_wa_orders
      WHERE contact_id IN (
        SELECT wc.id FROM wa.wa_contacts wc
        WHERE RIGHT(regexp_replace(wc.wa_id, '[^0-9]', '', 'g'), 10) = v_normalized_phone
          AND wc.organization_id = p_organization_id
      )
    ) INTO v_has_orders;

    v_has_deals := false;
    BEGIN
      SELECT EXISTS (SELECT 1 FROM crm.deals WHERE contact_id = v_contact.id)
      INTO v_has_deals;
    EXCEPTION WHEN undefined_table THEN
      v_has_deals := false;
    END;

    v_score := COALESCE(v_contact.score, 0);

    IF v_contact.is_partner_delegate = true THEN
      RETURN QUERY SELECT v_contact.id, 'unified.contacts'::TEXT, 'b2b_partner'::TEXT,
                          v_contact.name, ARRAY['b2b','partner']::TEXT[]; RETURN;
    END IF;
    IF v_contact.account_id IS NOT NULL AND v_contact.contact_type = 'business' THEN
      RETURN QUERY SELECT v_contact.id, 'unified.contacts'::TEXT, 'b2b_customer'::TEXT,
                          v_contact.name, ARRAY['b2b','customer']::TEXT[]; RETURN;
    END IF;
    IF v_has_orders THEN
      RETURN QUERY SELECT v_contact.id, 'unified.contacts'::TEXT, 'b2c_customer'::TEXT,
                          v_contact.name, ARRAY['b2c','customer','has_orders']::TEXT[]; RETURN;
    END IF;
    IF v_has_deals THEN
      RETURN QUERY SELECT v_contact.id, 'unified.contacts'::TEXT, 'b2c_lead_sql'::TEXT,
                          v_contact.name, ARRAY['b2c','lead','sql','has_deal']::TEXT[]; RETURN;
    END IF;
    IF v_score >= 50 THEN
      RETURN QUERY SELECT v_contact.id, 'unified.contacts'::TEXT, 'b2c_lead_mql'::TEXT,
                          v_contact.name, ARRAY['b2c','lead','mql']::TEXT[]; RETURN;
    END IF;
    RETURN QUERY SELECT v_contact.id, 'unified.contacts'::TEXT, 'b2c_lead'::TEXT,
                        v_contact.name, ARRAY['b2c','lead']::TEXT[]; RETURN;
  END IF;

  -- Unknown — stays in WA inbox; no CRM entity created
  RETURN QUERY SELECT NULL::UUID, 'unknown'::TEXT, 'unknown'::TEXT,
                      NULL::TEXT, ARRAY['unknown']::TEXT[];
END;
$$;


--
-- Name: wa_resolve_json_vars(jsonb, jsonb); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_resolve_json_vars(p_element jsonb, p_context jsonb) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    v_key text;
    v_value jsonb;
    v_output_obj jsonb := '{}'::jsonb;
    v_output_arr jsonb := '[]'::jsonb;
    v_text text;
    v_rec record;
BEGIN
    IF jsonb_typeof(p_element) = 'object' THEN
        FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_element) LOOP
            v_output_obj := v_output_obj || jsonb_build_object(
                v_key, 
                wa.wa_resolve_json_vars(v_value, p_context)
            );
        END LOOP;
        RETURN v_output_obj;
        
    ELSIF jsonb_typeof(p_element) = 'array' THEN
        FOR v_value IN SELECT value FROM jsonb_array_elements(p_element) LOOP
            v_output_arr := v_output_arr || jsonb_build_array(
                wa.wa_resolve_json_vars(v_value, p_context)
            );
        END LOOP;
        RETURN v_output_arr;
        
    ELSIF jsonb_typeof(p_element) = 'string' THEN
        v_text := p_element #>> '{}';
        
        FOR v_rec IN SELECT key, value FROM jsonb_each_text(p_context) LOOP
            v_text := regexp_replace(v_text, '\{\{\s*' || v_rec.key || '\s*\}\}', COALESCE(v_rec.value, ''), 'g');
        END LOOP;
        
        RETURN to_jsonb(v_text);
        
    ELSE
        RETURN p_element;
    END IF;
END;
$$;


--
-- Name: wa_resolve_json_vars(jsonb, uuid, uuid, jsonb); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_resolve_json_vars(p_element jsonb, p_contact_id uuid, p_org_id uuid, p_context jsonb) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_key text;
    v_value jsonb;
    v_output_obj jsonb := '{}'::jsonb;
    v_output_arr jsonb := '[]'::jsonb;
    v_text text;
    v_match text;
    v_resolved_val text;
BEGIN
    IF jsonb_typeof(p_element) = 'object' THEN
        FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_element) LOOP
            v_output_obj := v_output_obj || jsonb_build_object(
                v_key, 
                wa.wa_resolve_json_vars(v_value, p_contact_id, p_org_id, p_context)
            );
        END LOOP;
        RETURN v_output_obj;
        
    ELSIF jsonb_typeof(p_element) = 'array' THEN
        FOR v_value IN SELECT value FROM jsonb_array_elements(p_element) LOOP
            v_output_arr := v_output_arr || jsonb_build_array(
                wa.wa_resolve_json_vars(v_value, p_contact_id, p_org_id, p_context)
            );
        END LOOP;
        RETURN v_output_arr;
        
    ELSIF jsonb_typeof(p_element) = 'string' THEN
        v_text := p_element #>> '{}';
        
        FOR v_match IN 
            SELECT DISTINCT (regexp_matches(v_text, '\{\{([^}]+)\}\}', 'g'))[1]
        -- Note: using regexp_matches in FROM requires subquery or array access
        LOOP
            v_resolved_val := wa.wa_get_context_value(p_context, v_match);
            
            IF v_resolved_val IS NULL THEN
                v_resolved_val := wa.wa_fetch_variable_value(v_match, p_contact_id, p_org_id);
            END IF;
            
            v_text := replace(v_text, '{{' || v_match || '}}', COALESCE(v_resolved_val, ''));
        END LOOP;
        
        RETURN to_jsonb(v_text);
        
    ELSE
        RETURN p_element;
    END IF;
END;
$$;


--
-- Name: wa_resolve_variables(jsonb, uuid, jsonb); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_resolve_variables(p_template_content jsonb, p_contact_id uuid, p_context jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_org_id       UUID;
  v_conv_id      UUID;
  v_base_context JSONB;
  v_merged       JSONB;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM wa.wa_contacts
  WHERE id = p_contact_id;

  -- Find the most recent open conversation for this contact (for agent context)
  SELECT id INTO v_conv_id
  FROM wa.wa_conversations
  WHERE contact_id = p_contact_id
    AND organization_id = v_org_id
    AND status = 'open'
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Build structured context from cross-schema data
  v_base_context := wa.wa_get_contact_context(p_contact_id, v_org_id, v_conv_id);

  -- Caller-supplied p_context takes highest precedence
  v_merged := v_base_context || p_context;

  -- Resolve using the merged context + legacy fallback for unmatched vars
  RETURN wa.wa_resolve_json_vars(p_template_content, p_contact_id, v_org_id, v_merged);
END;
$$;


--
-- Name: FUNCTION wa_resolve_variables(p_template_content jsonb, p_contact_id uuid, p_context jsonb); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_resolve_variables(p_template_content jsonb, p_contact_id uuid, p_context jsonb) IS 'Resolves {{variable}} placeholders in a template JSONB payload. Resolution order:   1. p_context overrides (caller-supplied, highest precedence)   2. wa_get_contact_context() — structured cross-schema map      (wa_contacts → unified → crm → commerce → agent → org)   3. wa_fetch_variable_value() — legacy dynamic-SQL fallback for      schema.table.mode.column style variables. Signature unchanged — existing callers (drip processor, whatsapp-sender) work without changes.';


--
-- Name: wa_search_contacts(uuid, text, integer); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_search_contacts(p_organization_id uuid, p_query text, p_limit integer DEFAULT 20) RETURNS TABLE(contact_id uuid, wa_id text, display_name text, email text, phone text, is_promoted boolean, crm_account_name text, open_conv_count bigint, identity_type text, opt_in_status boolean)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT
    wc.id                                               AS contact_id,
    wc.wa_id,
    COALESCE(uc.name, wc.name, wc.wa_id)               AS display_name,
    uc.email,
    COALESCE(uc.phone, wc.wa_id)                        AS phone,
    (wc.linked_entity_id IS NOT NULL)                  AS is_promoted,
    ca.details->>'name'                                 AS crm_account_name,
    COUNT(conv.id) FILTER (WHERE conv.status = 'open') AS open_conv_count,
    wc.identity_type,
    wc.opt_in_status
  FROM wa.wa_contacts wc
  LEFT JOIN unified.contacts uc ON uc.id = wc.linked_entity_id
  LEFT JOIN crm.contacts cc     ON cc.id = wc.linked_entity_id
  LEFT JOIN crm.accounts ca     ON ca.id = cc.account_id
  LEFT JOIN wa.wa_conversations conv
         ON conv.contact_id = wc.id
        AND conv.organization_id = p_organization_id
  WHERE wc.organization_id = p_organization_id
    AND (
      p_query IS NULL OR p_query = ''
      OR wc.wa_id      ILIKE '%' || p_query || '%'
      OR wc.name       ILIKE '%' || p_query || '%'
      OR uc.name       ILIKE '%' || p_query || '%'
      OR uc.email      ILIKE '%' || p_query || '%'
    )
  GROUP BY
    wc.id, wc.wa_id, wc.name, wc.linked_entity_id,
    wc.identity_type, wc.opt_in_status,
    uc.name, uc.email, uc.phone,
    ca.details->>'name'
  ORDER BY open_conv_count DESC, display_name ASC
  LIMIT p_limit;
$$;


--
-- Name: FUNCTION wa_search_contacts(p_organization_id uuid, p_query text, p_limit integer); Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON FUNCTION wa.wa_search_contacts(p_organization_id uuid, p_query text, p_limit integer) IS 'Searches WA contacts with unified/CRM enrichment. Matches on wa_id (phone), wa_contacts.name, unified.contacts.name, email. Returns is_promoted flag, CRM account name, and open conversation count. Used by inbox new-conversation, assign-contact, and campaign audience flows.';


--
-- Name: wa_send_template(uuid, uuid, text, jsonb, jsonb); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_send_template(p_organization_id uuid, p_conversation_id uuid, p_template_name text, p_dynamic_parameters jsonb DEFAULT '[]'::jsonb, p_attachments jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_template_record wa.wa_templates;
    v_contact_wa_id text;
    v_template_components jsonb;
    v_final_message_content jsonb;
BEGIN
    SELECT 
        wac.wa_id
    INTO 
        v_contact_wa_id
    FROM 
        wa.wa_conversations wc
    JOIN 
        wa.wa_contacts wac ON wc.contact_id = wac.id
    WHERE 
        wc.id = p_conversation_id
        AND wc.organization_id = p_organization_id;

    IF v_contact_wa_id IS NULL THEN
        RAISE EXCEPTION 'Conversation or contact not found for conversation ID %', p_conversation_id;
    END IF;

    SELECT *
    INTO v_template_record
    FROM wa.wa_templates
    WHERE organization_id = p_organization_id
      AND name = p_template_name;

    IF v_template_record IS NULL THEN
        RAISE EXCEPTION 'Template "%" not found for organization %', p_template_name, p_organization_id;
    END IF;

    IF v_template_record.status <> 'APPROVED' THEN
        RAISE EXCEPTION 'Template "%" status is "%" and cannot be sent.', p_template_name, v_template_record.status;
    END IF;

    v_template_components := p_dynamic_parameters;

    v_final_message_content := jsonb_build_object(
        'name', v_template_record.name,
        'language', jsonb_build_object('code', v_template_record.language),
        'components', v_template_components
    );

    RETURN extensions.uuid_generate_v4(); 
END;
$$;


--
-- Name: wa_standardize_message_content(); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_standardize_message_content() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_details    JSONB := '{}'::jsonb;
  v_media_root JSONB;
BEGIN
  IF NEW.type = 'text' THEN
    v_details := jsonb_build_object(
      'body',
      CASE
        WHEN NEW.content ? 'text' AND NEW.content->'text' ? 'body'
          THEN NEW.content->'text'->>'body'
        ELSE NULL
      END
    );

  ELSIF NEW.type IN ('image', 'audio', 'video', 'document', 'sticker') THEN
    v_media_root := NEW.content->NEW.type;
    v_details := jsonb_build_object(
      'body',
        CASE
          WHEN v_media_root ? 'caption'
            THEN v_media_root->>'caption'
          WHEN NEW.type = 'document' AND v_media_root ? 'filename'
            THEN v_media_root->>'filename'
          ELSE NULL
        END,
      'media_url',
        CASE
          WHEN v_media_root ? 'link' THEN v_media_root->>'link'
          WHEN v_media_root ? 'id'   THEN v_media_root->>'id'
          ELSE NULL
        END,
      'media_type', NEW.type
    );

  ELSIF NEW.type = 'template' THEN
    v_details := jsonb_build_object(
      'template_name',
        CASE
          -- Nested format from wa_send_template RPC: {"template": {"name": "..."}}
          WHEN NEW.content ? 'template' AND NEW.content->'template' ? 'name'
            THEN NEW.content->'template'->>'name'
          -- Flat format from whatsapp-sender edge fn: {"name": "...", "language": {...}}
          WHEN NEW.content ? 'name'
            THEN NEW.content->>'name'
          ELSE NULL
        END,
      'body', '[Template Message]'
    );

  ELSIF NEW.type = 'interactive' THEN
    v_details := jsonb_build_object(
      'interactive_type', NEW.content->'interactive'->>'type',
      'body',
        CASE
          WHEN NEW.direction = 'inbound'
               AND NEW.content->'interactive' ? 'button_reply'
            THEN NEW.content->'interactive'->'button_reply'->>'title'
          WHEN NEW.direction = 'inbound'
               AND NEW.content->'interactive' ? 'list_reply'
            THEN NEW.content->'interactive'->'list_reply'->>'title'
          WHEN NEW.content->'interactive' ? 'body'
               AND NEW.content->'interactive'->'body' ? 'text'
            THEN NEW.content->'interactive'->'body'->>'text'
          ELSE NULL
        END
    );

  ELSIF NEW.type = 'location' THEN
    v_details := jsonb_build_object(
      'body',          NEW.content->'location'->>'name',
      'location_data', NEW.content->'location'
    );

  ELSIF NEW.type = 'order' THEN
    v_details := jsonb_build_object(
      'body',       '[Order] ' || (NEW.content->'order'->>'catalog_id'),
      'order_data', NEW.content->'order'
    );

  ELSE
    v_details := jsonb_build_object(
      'body', '[Unsupported Type: ' || NEW.type || ']'
    );

  END IF;

  NEW.details := v_details;
  RETURN NEW;
END;
$$;


--
-- Name: wa_update_contact_tags(uuid, text[], text[]); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_update_contact_tags(p_wa_contact_id uuid, p_tags_to_add text[] DEFAULT '{}'::text[], p_tags_to_remove text[] DEFAULT '{}'::text[]) RETURNS text[]
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_current_tags text[];
    v_new_tags text[];
BEGIN
    SELECT COALESCE(tags, '{}') INTO v_current_tags
    FROM wa.wa_contacts
    WHERE id = p_wa_contact_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'WA Contact ID % not found.', p_wa_contact_id;
    END IF;

    v_new_tags := ARRAY(
        SELECT DISTINCT UNNEST(v_current_tags || p_tags_to_add)
    );

    IF array_length(p_tags_to_remove, 1) > 0 THEN
        v_new_tags := ARRAY(
            SELECT tag
            FROM UNNEST(v_new_tags) AS tag
            WHERE tag NOT IN (SELECT UNNEST(p_tags_to_remove))
        );
    END IF;

    UPDATE wa.wa_contacts
    SET 
        tags = v_new_tags,
        updated_at = NOW()
    WHERE id = p_wa_contact_id
    RETURNING tags INTO v_current_tags;

    RETURN v_current_tags;
END;
$$;


--
-- Name: wa_update_conversation_on_message(); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_update_conversation_on_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
BEGIN
    IF NEW.conversation_id IS NULL THEN
        NEW.conversation_id := wa.wa_get_or_create_conversation(
            NEW.organization_id,
            NEW.contact_id,
            NEW.location_id,
            NULL
        );
    END IF;

    UPDATE wa.wa_conversations
    SET 
        last_message_at = NEW.timestamp,
        last_message_summary = CASE
            WHEN NEW.details ? 'body' AND NEW.details->>'body' IS NOT NULL THEN
                LEFT(NEW.details->>'body', 100)
            WHEN NEW.details ? 'media_type' THEN
                '[' || INITCAP(NEW.details->>'media_type') || ']'
            WHEN NEW.details ? 'template_name' THEN
                '[Template: ' || (NEW.details->>'template_name') || ']'
            ELSE
                '[' || NEW.type || ']'
        END,
        updated_at = NOW(),
        status = 'open',
        snoozed_until = NULL
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$;


--
-- Name: wa_update_message_status(uuid, text, text); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_update_message_status(p_organization_id uuid, p_whatsapp_message_id text, p_status text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_contact_id        uuid;
    v_message_timestamp timestamptz;
    v_status_priority   int;
BEGIN
    v_status_priority := CASE p_status
        WHEN 'sent'      THEN 1
        WHEN 'delivered' THEN 2
        WHEN 'read'      THEN 3
        ELSE 0
    END;

    UPDATE wa.wa_messages
       SET status     = p_status,
           updated_at = now()
     WHERE organization_id      = p_organization_id
       AND whatsapp_message_id  = p_whatsapp_message_id
    RETURNING contact_id, timestamp INTO v_contact_id, v_message_timestamp;

    IF NOT FOUND THEN
        RAISE WARNING 'wa_update_message_status: message % not found for org %',
            p_whatsapp_message_id, p_organization_id;
        RETURN;
    END IF;

    IF v_status_priority >= 2 AND v_contact_id IS NOT NULL THEN
        UPDATE wa.wa_messages
           SET status     = p_status,
               updated_at = now()
         WHERE organization_id     = p_organization_id
           AND contact_id          = v_contact_id
           AND direction           = 'outbound'
           AND timestamp           <= v_message_timestamp
           AND whatsapp_message_id <> p_whatsapp_message_id
           AND (
               (p_status = 'delivered' AND COALESCE(status, 'sent') = 'sent')
            OR (p_status = 'read'      AND COALESCE(status, 'sent') IN ('sent', 'delivered'))
           );
    END IF;
END;
$$;


--
-- Name: wa_utils_testonly_dev_switch_active_org(uuid, text, text); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_utils_testonly_dev_switch_active_org(p_target_org_id uuid, p_test_wa_id text DEFAULT '918095063070'::text, p_real_phone_id text DEFAULT NULL::text) RETURNS TABLE(org_name text, org_status text, phone_id text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- 1. Turn OFF all other orgs by prefixing with OFF_ (if not already prefixed)
    UPDATE identity.organizations AS o
    SET app_settings = jsonb_set(
        o.app_settings, 
        '{channels,whatsapp,configuration,phoneNumberId}', 
        to_jsonb(
            CASE 
                WHEN (o.app_settings->'channels'->'whatsapp'->'configuration'->>'phoneNumberId') LIKE 'OFF_%' 
                THEN o.app_settings->'channels'->'whatsapp'->'configuration'->>'phoneNumberId'
                ELSE 'OFF_' || (o.app_settings->'channels'->'whatsapp'->'configuration'->>'phoneNumberId')
            END
        )
    )
    WHERE o.id <> p_target_org_id 
      AND o.app_settings->'channels'->'whatsapp'->'configuration'->>'phoneNumberId' IS NOT NULL;

    -- 2. Turn ON target org by removing OFF_ prefix
    UPDATE identity.organizations AS o
    SET app_settings = jsonb_set(
        o.app_settings, 
        '{channels,whatsapp,configuration,phoneNumberId}', 
        to_jsonb(
            REGEXP_REPLACE(
                COALESCE(p_real_phone_id, o.app_settings->'channels'->'whatsapp'->'configuration'->>'phoneNumberId'),
                '^OFF_', 
                ''
            )
        )
    )
    WHERE o.id = p_target_org_id;

    -- 3. Pause all active drip campaigns for this test contact across OTHER orgs
    UPDATE wa.wa_drip_enrollments AS en
    SET status = 'paused'
    WHERE en.contact_id IN (SELECT c.id FROM wa.wa_contacts c WHERE c.wa_id = p_test_wa_id)
      AND en.campaign_id IN (SELECT camp.id FROM wa.wa_drip_campaigns camp WHERE camp.organization_id <> p_target_org_id);

    -- 4. Resume paused drip campaigns for this test contact in the TARGET org
    UPDATE wa.wa_drip_enrollments AS en
    SET status = 'active'
    WHERE en.contact_id IN (SELECT c.id FROM wa.wa_contacts c WHERE c.wa_id = p_test_wa_id)
      AND en.campaign_id IN (SELECT camp.id FROM wa.wa_drip_campaigns camp WHERE camp.organization_id = p_target_org_id)
      AND en.status = 'paused';

    -- 5. Ensure the contact exists in the target org so drips work
    PERFORM wa.wa_create_contact(p_target_org_id, p_test_wa_id, 'Tester (' || p_test_wa_id || ')');

    RETURN QUERY 
    SELECT 
        org.name::TEXT, 
        CASE WHEN org.id = p_target_org_id THEN 'LIVE'::TEXT ELSE 'PARKED'::TEXT END,
        (org.app_settings->'channels'->'whatsapp'->'configuration'->>'phoneNumberId')::TEXT
    FROM identity.organizations org
    WHERE org.app_settings->'channels'->'whatsapp'->'configuration'->>'phoneNumberId' IS NOT NULL;
END;
$$;


--
-- Name: wa_validate_message_content(); Type: FUNCTION; Schema: wa; Owner: -
--

CREATE FUNCTION wa.wa_validate_message_content() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.type = 'text' THEN
    IF NOT (NEW.details ? 'body' AND NEW.details->>'body' IS NOT NULL) THEN
      RAISE EXCEPTION 'Text messages must have a body in details';
    END IF;
    
  ELSIF NEW.type IN ('image', 'audio', 'video', 'document', 'sticker') THEN
    IF NOT (NEW.details ? 'media_url' AND NEW.details->>'media_url' IS NOT NULL) THEN
      RAISE EXCEPTION 'Media messages must have a media_url in details';
    END IF;
    
  ELSIF NEW.type = 'template' THEN
    IF NOT (NEW.details ? 'template_name' AND NEW.details->>'template_name' IS NOT NULL) THEN
      RAISE EXCEPTION 'Template messages must have a template_name in details';
    END IF;
    
  ELSIF NEW.type = 'interactive' THEN
    IF NOT (NEW.details ? 'interactive_type' AND NEW.details->>'interactive_type' IS NOT NULL) THEN
      RAISE EXCEPTION 'Interactive messages must have an interactive_type in details';
    END IF;
    
  ELSIF NEW.type = 'order' THEN
    IF NOT (NEW.content ? 'order') THEN
      RAISE EXCEPTION 'Order messages must include order object';
    END IF;
  END IF;

  IF NEW.direction NOT IN ('inbound', 'outbound') THEN
    RAISE EXCEPTION 'Direction must be either "inbound" or "outbound"';
  END IF;

  IF NEW.status IS NULL THEN
     RAISE EXCEPTION 'Status cannot be NULL';
  END IF;

  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: call_logs; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.call_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    start_time timestamp with time zone,
    caller_name text,
    caller_phone text,
    caller_email text,
    user_intent text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    tenant_name text,
    extracted_data jsonb,
    transcript jsonb,
    is_active boolean DEFAULT true
);

ALTER TABLE ONLY wa.call_logs FORCE ROW LEVEL SECURITY;


--
-- Name: campaigns; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    trigger_type text NOT NULL,
    trigger_config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    definition jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE ONLY wa.campaigns FORCE ROW LEVEL SECURITY;


--
-- Name: contact_external_data; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.contact_external_data (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    contact_id uuid NOT NULL,
    source text NOT NULL,
    external_id text,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now(),
    CONSTRAINT contact_external_data_source_check CHECK ((source = ANY (ARRAY['erp'::text, 'crm'::text, 'shopify'::text, 'zoho'::text, 'csv'::text, 'api'::text])))
);

ALTER TABLE ONLY wa.contact_external_data FORCE ROW LEVEL SECURITY;


--
-- Name: contact_segments; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.contact_segments (
    contact_id uuid NOT NULL,
    segment_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid,
    assignment_type text DEFAULT 'manual'::text,
    CONSTRAINT contact_segments_assignment_type_check CHECK ((assignment_type = ANY (ARRAY['manual'::text, 'auto'::text, 'import'::text, 'rule'::text])))
);

ALTER TABLE ONLY wa.contact_segments FORCE ROW LEVEL SECURITY;


--
-- Name: game_scores; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.game_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    game_type text NOT NULL,
    score integer NOT NULL,
    result text NOT NULL,
    played_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY wa.game_scores FORCE ROW LEVEL SECURITY;


--
-- Name: game_sessions; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.game_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    game_type text NOT NULL,
    transcript jsonb,
    turns integer DEFAULT 0,
    result text,
    score integer,
    state_data jsonb,
    started_at timestamp with time zone,
    ended_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY wa.game_sessions FORCE ROW LEVEL SECURITY;


--
-- Name: wa_contact_external_data; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_contact_external_data (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    contact_id uuid NOT NULL,
    source text NOT NULL,
    external_id text,
    data jsonb DEFAULT '{}'::jsonb,
    synced_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY wa.wa_contact_external_data FORCE ROW LEVEL SECURITY;


--
-- Name: wa_contacts; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_contacts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    location_id uuid,
    wa_id text NOT NULL,
    name text,
    profile_picture_url text,
    last_message_timestamp timestamp with time zone,
    opt_in_status boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    linked_entity_id uuid,
    linked_entity_type text,
    tags text[] DEFAULT '{}'::text[],
    identity_type text,
    display_id text,
    is_active boolean DEFAULT true NOT NULL,
    intent_type text,
    state_category text,
    is_on_hold boolean DEFAULT false NOT NULL,
    opted_out_at timestamp with time zone,
    opted_in_at timestamp with time zone,
    resolution_status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT wa_contacts_identity_type_check CHECK ((identity_type = ANY (ARRAY['employee'::text, 'field_worker'::text, 'contractor'::text, 'b2b_partner'::text, 'b2b_customer'::text, 'b2b_lead'::text, 'b2c_customer'::text, 'b2c_lead_mql'::text, 'b2c_lead_sql'::text, 'b2c_lead'::text, 'b2c_cart_abandoner'::text, 'unknown'::text]))),
    CONSTRAINT wa_contacts_resolution_status_check CHECK ((resolution_status = ANY (ARRAY['pending'::text, 'resolved'::text, 'unresolvable'::text, 'ambiguous'::text])))
);

ALTER TABLE ONLY wa.wa_contacts FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN wa_contacts.opted_out_at; Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON COLUMN wa.wa_contacts.opted_out_at IS 'Timestamp of most recent STOP / opt-out event';


--
-- Name: COLUMN wa_contacts.opted_in_at; Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON COLUMN wa.wa_contacts.opted_in_at IS 'Timestamp of most recent START / opt-in event';


--
-- Name: wa_conversations; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_conversations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    location_id uuid,
    contact_id uuid NOT NULL,
    channel_conversation_id text,
    last_message_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    assignee_id uuid,
    last_message_summary text,
    created_by uuid,
    snoozed_until timestamp with time zone,
    team_id uuid,
    role_id uuid,
    is_active boolean DEFAULT true,
    status text DEFAULT 'open'::text NOT NULL,
    channel text DEFAULT 'whatsapp'::text NOT NULL,
    CONSTRAINT wa_conversations_channel_check CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'email'::text, 'sms'::text, 'slack'::text, 'telegram'::text, 'teams'::text, 'telephony'::text]))),
    CONSTRAINT wa_conversations_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text, 'snoozed'::text])))
);

ALTER TABLE ONLY wa.wa_conversations FORCE ROW LEVEL SECURITY;


--
-- Name: wa_messages; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    location_id uuid,
    contact_id uuid NOT NULL,
    whatsapp_message_id text NOT NULL,
    direction text NOT NULL,
    type text NOT NULL,
    content jsonb NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    template_id uuid,
    cost numeric(10,4),
    is_manual_outbound boolean DEFAULT false NOT NULL,
    manual_campaign_tracking_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    conversation_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    status text DEFAULT 'sent'::text,
    channel text DEFAULT 'whatsapp'::text NOT NULL,
    recipient_status text,
    CONSTRAINT wa_messages_channel_check CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'email'::text, 'sms'::text, 'slack'::text, 'telegram'::text, 'teams'::text, 'telephony'::text]))),
    CONSTRAINT wa_messages_status_check CHECK ((status = ANY (ARRAY['received'::text, 'sent'::text, 'delivered'::text, 'read'::text, 'failed'::text, 'pending'::text])))
);

ALTER TABLE ONLY wa.wa_messages FORCE ROW LEVEL SECURITY;


--
-- Name: wa_contact_metrics; Type: VIEW; Schema: wa; Owner: -
--

CREATE VIEW wa.wa_contact_metrics WITH (security_invoker='on') AS
 SELECT c.id AS contact_id,
    c.organization_id,
    c.name AS contact_name,
    c.wa_id,
    c.tags,
    c.identity_type,
    c.resolution_status,
    c.created_at AS first_contact_at,
    (COALESCE(msg.msg_count, (0)::bigint))::integer AS message_count,
    msg.last_at AS last_message_at,
    (EXTRACT(day FROM (now() - msg.last_at)))::integer AS days_since_last_message,
    (COALESCE(conv.conv_count, (0)::bigint))::integer AS conversation_count,
    ((ext.data ->> 'total_orders'::text))::integer AS total_orders,
    ((ext.data ->> 'total_order_value'::text))::numeric AS total_order_value,
    ((ext.data ->> 'last_order_at'::text))::timestamp with time zone AS last_order_at,
    ext.source AS external_source
   FROM (((wa.wa_contacts c
     LEFT JOIN ( SELECT wa_messages.contact_id,
            count(*) AS msg_count,
            max(wa_messages.created_at) AS last_at
           FROM wa.wa_messages
          GROUP BY wa_messages.contact_id) msg ON ((msg.contact_id = c.id)))
     LEFT JOIN ( SELECT wa_conversations.contact_id,
            count(*) AS conv_count
           FROM wa.wa_conversations
          GROUP BY wa_conversations.contact_id) conv ON ((conv.contact_id = c.id)))
     LEFT JOIN wa.wa_contact_external_data ext ON ((ext.contact_id = c.id)));


--
-- Name: v_wa_contact_metrics; Type: VIEW; Schema: wa; Owner: -
--

CREATE VIEW wa.v_wa_contact_metrics WITH (security_invoker='on') AS
 SELECT contact_id,
    contact_display,
    contact_name,
    conversation_count,
    days_since_last_message,
    external_source,
    first_contact_at,
    identity_type,
    last_message_at,
    last_order_at,
    message_count,
    organization_id,
    organization_display,
    resolution_status,
    tags,
    total_order_value,
    total_orders,
    wa_id
   FROM ( SELECT base.contact_id,
            fk_contact.name AS contact_display,
            base.contact_name,
            base.conversation_count,
            base.days_since_last_message,
            base.external_source,
            base.first_contact_at,
            base.identity_type,
            base.last_message_at,
            base.last_order_at,
            base.message_count,
            base.organization_id,
            fk_organization.name AS organization_display,
            base.resolution_status,
            base.tags,
            base.total_order_value,
            base.total_orders,
            base.wa_id
           FROM ((wa.wa_contact_metrics base
             LEFT JOIN unified.contacts fk_contact ON ((base.contact_id = fk_contact.id)))
             LEFT JOIN unified.organizations fk_organization ON ((base.organization_id = fk_organization.id)))) base_query;


--
-- Name: v_wa_contacts; Type: VIEW; Schema: wa; Owner: -
--

CREATE VIEW wa.v_wa_contacts WITH (security_invoker='on') AS
 SELECT wc.id,
    wc.organization_id,
    wc.location_id,
    wc.wa_id,
    wc.name,
    wc.profile_picture_url,
    wc.last_message_timestamp,
    wc.opt_in_status,
    wc.metadata,
    wc.tags,
    wc.identity_type,
    wc.display_id,
    wc.is_active,
    wc.intent_type,
    wc.state_category,
    wc.is_on_hold,
    wc.linked_entity_id,
    wc.linked_entity_type,
    wc.resolution_status,
    wc.created_at,
    wc.updated_at,
    wc.created_by,
    wc.updated_by,
    COALESCE(uc.name, iu.name) AS resolved_name,
    COALESCE(uc.email, iu.email) AS resolved_email,
    COALESCE(uc.phone, iu.mobile) AS resolved_phone,
    uc.lifecycle_stage,
    uc.persona_type,
    uc.contact_type,
    iu.name AS user_display_name,
    iu.mobile AS user_mobile,
    loc.name AS location_display,
    org.name AS organization_display
   FROM ((((wa.wa_contacts wc
     LEFT JOIN unified.contacts uc ON (((wc.linked_entity_type = 'unified.contacts'::text) AND (wc.linked_entity_id = uc.id))))
     LEFT JOIN identity.users iu ON (((wc.linked_entity_type = 'identity.users'::text) AND (wc.linked_entity_id = iu.id))))
     LEFT JOIN identity.locations loc ON ((wc.location_id = loc.id)))
     LEFT JOIN identity.organizations org ON ((wc.organization_id = org.id)));


--
-- Name: wa_agent_transfers; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_agent_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    location_id uuid,
    contact_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    source text DEFAULT 'chatbot'::text,
    target_team_id uuid,
    target_role_id uuid,
    assigned_user_id uuid,
    transferred_by_user_id uuid,
    sla_response_deadline timestamp with time zone,
    sla_breached_at timestamp with time zone,
    picked_up_at timestamp with time zone,
    first_response_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT wa_agent_transfers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'assigned'::text, 'cancelled'::text, 'completed'::text])))
);

ALTER TABLE ONLY wa.wa_agent_transfers FORCE ROW LEVEL SECURITY;


--
-- Name: wa_automation_rules; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_automation_rules (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    location_id uuid,
    name text NOT NULL,
    trigger_type text NOT NULL,
    keywords text[],
    response_type text NOT NULL,
    response_content text,
    response_template_id uuid,
    order_status_trigger text,
    payment_status_trigger text,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    trigger_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    response_config jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE ONLY wa.wa_automation_rules FORCE ROW LEVEL SECURITY;


--
-- Name: wa_contact_segments; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_contact_segments (
    contact_id uuid NOT NULL,
    segment_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid,
    assignment_type text DEFAULT 'manual'::text
);

ALTER TABLE ONLY wa.wa_contact_segments FORCE ROW LEVEL SECURITY;


--
-- Name: wa_drip_campaigns; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_drip_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    trigger_type text NOT NULL,
    trigger_config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    location_id uuid
);

ALTER TABLE ONLY wa.wa_drip_campaigns FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN wa_drip_campaigns.location_id; Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON COLUMN wa.wa_drip_campaigns.location_id IS 'Optional scope: FK to identity.locations.id. NULL = campaign applies to all locations in the org.';


--
-- Name: wa_drip_enrollments; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_drip_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    current_step_id uuid,
    last_activity_at timestamp with time zone DEFAULT now(),
    next_execution_at timestamp with time zone,
    variables jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    is_active boolean DEFAULT true,
    status text DEFAULT 'active'::text NOT NULL,
    channel text DEFAULT 'whatsapp'::text NOT NULL,
    CONSTRAINT wa_drip_enrollments_channel_check CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'email'::text, 'sms'::text, 'slack'::text, 'telegram'::text, 'teams'::text]))),
    CONSTRAINT wa_drip_enrollments_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY wa.wa_drip_enrollments FORCE ROW LEVEL SECURITY;


--
-- Name: wa_drip_execution_log; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_drip_execution_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enrollment_id uuid,
    step_id uuid,
    action text NOT NULL,
    result jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY wa.wa_drip_execution_log FORCE ROW LEVEL SECURITY;


--
-- Name: wa_drip_steps; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_drip_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    step_type text NOT NULL,
    content jsonb NOT NULL,
    parent_step_id uuid,
    "position" jsonb,
    created_at timestamp with time zone DEFAULT now(),
    sequence_order integer DEFAULT 0
);

ALTER TABLE ONLY wa.wa_drip_steps FORCE ROW LEVEL SECURITY;


--
-- Name: wa_manual_campaign_recipients; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_manual_campaign_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    wa_message_id uuid,
    error_msg text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wa_manual_campaign_recipients_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'skipped'::text])))
);

ALTER TABLE ONLY wa.wa_manual_campaign_recipients FORCE ROW LEVEL SECURITY;


--
-- Name: TABLE wa_manual_campaign_recipients; Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON TABLE wa.wa_manual_campaign_recipients IS 'Per-contact send status for a manual broadcast campaign. Populated by wa_manual_campaign_send(). Processed (sent to Meta) by process-manual-campaigns edge function.';


--
-- Name: wa_manual_campaigns; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_manual_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    name text,
    description text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    scheduled_at timestamp with time zone,
    stats jsonb,
    is_active boolean DEFAULT true,
    status text DEFAULT 'draft'::text NOT NULL,
    target_count integer DEFAULT 0,
    sent_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    completed_at timestamp with time zone,
    template_id uuid,
    target_filter jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT wa_manual_campaigns_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'sending'::text, 'completed'::text, 'cancelled'::text, 'failed'::text])))
);

ALTER TABLE ONLY wa.wa_manual_campaigns FORCE ROW LEVEL SECURITY;


--
-- Name: COLUMN wa_manual_campaigns.status; Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON COLUMN wa.wa_manual_campaigns.status IS 'draft → scheduled → sending → completed|cancelled|failed';


--
-- Name: COLUMN wa_manual_campaigns.target_filter; Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON COLUMN wa.wa_manual_campaigns.target_filter IS 'Audience criteria JSONB: {tags:[], identity_types:[], location_id, segment_id}';


--
-- Name: wa_message_retry_queue; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_message_retry_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    wa_message_id uuid,
    recipient_wa_id text NOT NULL,
    message_type text NOT NULL,
    message_content jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    last_error text,
    meta_error_code integer,
    meta_error_msg text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wa_message_retry_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'succeeded'::text, 'failed_permanent'::text])))
);

ALTER TABLE ONLY wa.wa_message_retry_queue FORCE ROW LEVEL SECURITY;


--
-- Name: TABLE wa_message_retry_queue; Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON TABLE wa.wa_message_retry_queue IS 'Outbound messages that failed to reach Meta API. No credentials stored here — process-wa-retry looks them up from identity.organizations.app_settings at retry time so token rotation is free. Backoff schedule: immediate → 5m → 30m → 2h → 8h → failed_permanent.';


--
-- Name: wa_quick_replies; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_quick_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    title text NOT NULL,
    shortcut text,
    category text NOT NULL,
    content text,
    media_url text,
    media_type text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    usage_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    CONSTRAINT wa_quick_replies_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text, 'document'::text, 'audio'::text, 'none'::text])))
);

ALTER TABLE ONLY wa.wa_quick_replies FORCE ROW LEVEL SECURITY;


--
-- Name: wa_routing_rules; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_routing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    location_id uuid,
    name text NOT NULL,
    description text,
    priority integer DEFAULT 10 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    match_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    target_team_id uuid,
    target_role_id uuid,
    target_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY wa.wa_routing_rules FORCE ROW LEVEL SECURITY;


--
-- Name: TABLE wa_routing_rules; Type: COMMENT; Schema: wa; Owner: -
--

COMMENT ON TABLE wa.wa_routing_rules IS 'Auto-assignment rules for new/reopened WA conversations. Rules evaluated in ascending priority order; first match fires wa_assign_to_team_role(). target_team_id / target_role_id / target_user_id are soft refs — no FK constraints — to keep the wa schema independent of identity schema changes.';


--
-- Name: wa_template_variable_mappings; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_template_variable_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid,
    variable_index integer,
    variable_label text,
    data_source text,
    data_field text,
    default_value text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY wa.wa_template_variable_mappings FORCE ROW LEVEL SECURITY;


--
-- Name: wa_templates; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_templates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    language text NOT NULL,
    components jsonb NOT NULL,
    meta_template_id text,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    is_active boolean DEFAULT true,
    status text DEFAULT 'PENDING'::text NOT NULL,
    channel text DEFAULT 'whatsapp'::text NOT NULL,
    CONSTRAINT wa_templates_channel_check CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'email'::text, 'sms'::text]))),
    CONSTRAINT wa_templates_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text, 'PAUSED'::text, 'DISABLED'::text])))
);

ALTER TABLE ONLY wa.wa_templates FORCE ROW LEVEL SECURITY;


--
-- Name: wa_variable_definitions; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.wa_variable_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    variable_syntax text NOT NULL,
    description text,
    category text DEFAULT 'General'::text,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY wa.wa_variable_definitions FORCE ROW LEVEL SECURITY;


--
-- Name: x_wa_order_items; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.x_wa_order_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    offering_id uuid NOT NULL,
    offering_variant_id uuid,
    name text NOT NULL,
    quantity numeric(19,4) DEFAULT 1.0000 NOT NULL,
    unit_price numeric(19,4) NOT NULL,
    subtotal numeric(19,4) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY wa.x_wa_order_items FORCE ROW LEVEL SECURITY;


--
-- Name: x_wa_orders; Type: TABLE; Schema: wa; Owner: -
--

CREATE TABLE wa.x_wa_orders (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    wa_conversation_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    order_date timestamp with time zone DEFAULT now() NOT NULL,
    total_amount numeric(19,4) DEFAULT 0.00 NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    is_active boolean DEFAULT true
);

ALTER TABLE ONLY wa.x_wa_orders FORCE ROW LEVEL SECURITY;


--
-- Data for Name: call_logs; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.call_logs (id, start_time, caller_name, caller_phone, caller_email, user_intent, metadata, created_at, tenant_name, extracted_data, transcript, is_active) FROM stdin;
\.


--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.campaigns (id, organization_id, name, description, trigger_type, trigger_config, is_active, created_at, updated_at, definition) FROM stdin;
\.


--
-- Data for Name: contact_external_data; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.contact_external_data (id, contact_id, source, external_id, data, synced_at) FROM stdin;
\.


--
-- Data for Name: contact_segments; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.contact_segments (contact_id, segment_id, assigned_at, assigned_by, assignment_type) FROM stdin;
\.


--
-- Data for Name: game_scores; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.game_scores (id, phone, game_type, score, result, played_at) FROM stdin;
\.


--
-- Data for Name: game_sessions; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.game_sessions (id, phone, game_type, transcript, turns, result, score, state_data, started_at, ended_at) FROM stdin;
\.


--
-- Data for Name: wa_agent_transfers; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_agent_transfers (id, organization_id, location_id, contact_id, conversation_id, source, target_team_id, target_role_id, assigned_user_id, transferred_by_user_id, sla_response_deadline, sla_breached_at, picked_up_at, first_response_at, completed_at, created_at, updated_at, metadata, is_active, status) FROM stdin;
\.


--
-- Data for Name: wa_automation_rules; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_automation_rules (id, organization_id, location_id, name, trigger_type, keywords, response_type, response_content, response_template_id, order_status_trigger, payment_status_trigger, is_active, priority, created_at, updated_at, created_by, updated_by, trigger_config, response_config) FROM stdin;
\.


--
-- Data for Name: wa_contact_external_data; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_contact_external_data (id, contact_id, source, external_id, data, synced_at) FROM stdin;
\.


--
-- Data for Name: wa_contact_segments; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_contact_segments (contact_id, segment_id, assigned_at, assigned_by, assignment_type) FROM stdin;
\.


--
-- Data for Name: wa_contacts; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_contacts (id, organization_id, location_id, wa_id, name, profile_picture_url, last_message_timestamp, opt_in_status, metadata, created_at, updated_at, created_by, updated_by, linked_entity_id, linked_entity_type, tags, identity_type, display_id, is_active, intent_type, state_category, is_on_hold, opted_out_at, opted_in_at, resolution_status) FROM stdin;
\.


--
-- Data for Name: wa_conversations; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_conversations (id, organization_id, location_id, contact_id, channel_conversation_id, last_message_at, metadata, created_at, updated_at, assignee_id, last_message_summary, created_by, snoozed_until, team_id, role_id, is_active, status, channel) FROM stdin;
\.


--
-- Data for Name: wa_drip_campaigns; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_drip_campaigns (id, organization_id, name, description, trigger_type, trigger_config, is_active, created_at, updated_at, location_id) FROM stdin;
\.


--
-- Data for Name: wa_drip_enrollments; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_drip_enrollments (id, campaign_id, contact_id, current_step_id, last_activity_at, next_execution_at, variables, created_at, completed_at, is_active, status, channel) FROM stdin;
\.


--
-- Data for Name: wa_drip_execution_log; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_drip_execution_log (id, enrollment_id, step_id, action, result, created_at) FROM stdin;
\.


--
-- Data for Name: wa_drip_steps; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_drip_steps (id, campaign_id, step_type, content, parent_step_id, "position", created_at, sequence_order) FROM stdin;
\.


--
-- Data for Name: wa_manual_campaign_recipients; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_manual_campaign_recipients (id, campaign_id, organization_id, contact_id, status, wa_message_id, error_msg, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: wa_manual_campaigns; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_manual_campaigns (id, organization_id, name, description, created_at, updated_at, created_by, updated_by, scheduled_at, stats, is_active, status, target_count, sent_count, failed_count, completed_at, template_id, target_filter) FROM stdin;
\.


--
-- Data for Name: wa_message_retry_queue; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_message_retry_queue (id, organization_id, contact_id, wa_message_id, recipient_wa_id, message_type, message_content, status, attempt_count, max_attempts, next_attempt_at, last_error, meta_error_code, meta_error_msg, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: wa_messages; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_messages (id, organization_id, location_id, contact_id, whatsapp_message_id, direction, type, content, "timestamp", template_id, cost, is_manual_outbound, manual_campaign_tracking_id, created_at, updated_at, created_by, conversation_id, details, is_active, status, channel, recipient_status) FROM stdin;
\.


--
-- Data for Name: wa_quick_replies; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_quick_replies (id, organization_id, title, shortcut, category, content, media_url, media_type, created_at, updated_at, usage_count, is_active) FROM stdin;
0a7ba7d4-1dde-4a55-bf22-da7eaf2c3784	55555555-5555-5555-5555-555555555555	audio test with ilnk	audio	Sales	some text with audio	https://freesound.org/s/837380/	audio	2025-12-13 22:58:09.917288+05:30	2025-12-13 22:58:09.917288+05:30	0	t
41c4a6d3-9928-45d4-b90d-87b939d10a88	55555555-5555-5555-5555-555555555555	hello	hello	General	hfgg hghg hjghghj. ghghjg hjghgh	\N	none	2025-12-18 22:43:06.612567+05:30	2025-12-18 22:43:06.612567+05:30	0	t
cc786bc4-51c6-4993-85d2-0f9c750dfa4f	55555555-5555-5555-5555-555555555555	jbhb	nbb	General	mnbbn b 	\N	none	2026-03-09 09:28:19.71273+05:30	2026-03-09 09:28:19.71273+05:30	0	t
53ea01e4-228a-4827-adfc-dff52ec25af3	55555555-5555-5555-5555-555555555555	Greetings	greetings	General	Hello {{contact.name}}, Thanks for connecting!	https://zoworks.ai/Zoworks-logo.png	image	2025-12-19 12:57:23.9191+05:30	2025-12-19 12:57:23.9191+05:30	1	t
edad6575-b959-480a-930d-2f50010f2c80	55555555-5555-5555-5555-555555555555	Greetings	greetings	General	Welcome to connect with zoworks.ai!	https://zoworks.ai/Zoworks-logo.png	image	2025-12-13 22:32:19.107574+05:30	2025-12-13 22:32:19.107574+05:30	5	t
3d33a56d-f4eb-4a76-a6e0-c1ce686b98d1	55555555-5555-5555-5555-555555555555	kkkk	\N	General	kkkk	\N	none	2026-04-16 16:01:34.645591+05:30	2026-04-16 16:01:34.645591+05:30	0	t
bb3f0192-956d-4553-a664-a8a074c385c2	55555555-5555-5555-5555-555555555555	Shipping Policy	/shipping	Support	Our standard shipping takes 3-5 business days.	\N	none	2026-05-07 16:25:43.242787+05:30	2026-05-07 16:25:43.242787+05:30	0	t
\.


--
-- Data for Name: wa_routing_rules; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_routing_rules (id, organization_id, location_id, name, description, priority, is_active, match_config, target_team_id, target_role_id, target_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: wa_template_variable_mappings; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_template_variable_mappings (id, template_id, variable_index, variable_label, data_source, data_field, default_value, created_at) FROM stdin;
\.


--
-- Data for Name: wa_templates; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_templates (id, organization_id, name, category, language, components, meta_template_id, rejection_reason, created_at, updated_at, created_by, updated_by, is_active, status, channel) FROM stdin;
a171878a-533c-41c3-a5de-a36ade486701	55555555-5555-5555-5555-555555555555	order_confirmation	TRANSACTIONAL	en	[{"text": "Your order #{{1}} is confirmed.", "type": "body"}, {"text": "Thank you for shopping.", "type": "footer"}]	\N	\N	2026-05-07 16:21:30.782165+05:30	2026-05-07 16:21:30.782165+05:30	6ba504d2-65b7-4018-b8a1-323dd686996c	\N	t	APPROVED	whatsapp
caeaeece-c5b8-4546-8b81-ee5db83f69b9	55555555-5555-5555-5555-555555555555	account_creation_confirmation_1_copy_823	UTILITY	en_US	[{"text": "Finalize account set-up", "type": "HEADER", "format": "TEXT"}, {"text": "Hi {{1}}, Your new account has been created successfully. Please verify {{2}} to complete your profile.", "type": "BODY", "example": {"body_text": [["Alex", "your email"]]}}, {"type": "BUTTONS", "buttons": [{"url": "https://example.com/verify", "text": "Verify account", "type": "URL"}]}]	866346062612019	\N	2025-12-19 13:02:25.546002+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
d8b3c9b8-68d1-4905-8344-d3bebaa8e268	55555555-5555-5555-5555-555555555555	feedback_request_copy_2_copy_402	MARKETING	en_US	[{"text": "Hi {{1}}, we hope you enjoyed your experience with us. Would you mind rating us?", "type": "BODY", "example": {"body_text": [["Alex"]]}}, {"type": "BUTTONS", "buttons": [{"text": "Excellent", "type": "QUICK_REPLY"}, {"text": "Good", "type": "QUICK_REPLY"}, {"text": "Poor", "type": "QUICK_REPLY"}]}]	1158256156481359	\N	2025-12-19 13:02:25.356389+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
45549c5e-2d86-46a5-8948-0222f7a4eed5	55555555-5555-5555-5555-555555555555	feedback_survey_form_2	UTILITY	en_US	[{"text": "At {{1}}, we value customer feedback and use it to continually improve our {{2}}. \\n\\nPlease fill out a short {{3}}, linked below, to let us know more about your recent {{4}} with us. \\n\\nThank you in advance.", "type": "BODY", "example": {"body_text": [["Jasper's Market", "products", "survey", "purchase"]]}}, {"type": "BUTTONS", "buttons": [{"text": "Take survey", "type": "FLOW", "flow_id": 1577978456737179, "flow_action": "NAVIGATE", "navigate_screen": "SURVEY"}]}]	796835590058791	\N	2025-12-19 13:02:25.820091+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
779d853c-eb9e-4d8b-aa86-68e1420ad76a	55555555-5555-5555-5555-555555555555	delivery_failed_form_1	UTILITY	en_US	[{"text": "We were unable to deliver order {{1}} today. \\n\\nPlease {{2}} to schedule another delivery attempt.", "type": "BODY", "example": {"body_text": [["#12345", "try a redelivery"]]}}, {"type": "BUTTONS", "buttons": [{"text": "Reschedule", "type": "FLOW", "flow_id": 1249462796971567, "flow_action": "NAVIGATE", "navigate_screen": "RECOMMEND"}]}]	1194662151997198	\N	2025-12-19 13:02:25.973922+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
562c165b-7644-4f98-b5ac-c22a7296652c	55555555-5555-5555-5555-555555555555	feedback_survey_form_1	UTILITY	en_US	[{"text": "Rate your experience", "type": "HEADER", "format": "TEXT"}, {"text": "Your feedback is important to us. \\n\\nPlease take a quick survey about your recent {{1}} experience.", "type": "BODY", "example": {"body_text": [["flight booking"]]}}, {"type": "BUTTONS", "buttons": [{"text": "Take survey", "type": "FLOW", "flow_id": 1149438130511845, "flow_action": "NAVIGATE", "navigate_screen": "SURVEY"}]}]	1209991731050339	\N	2025-12-19 13:02:26.099726+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
80bfe622-59b5-4cad-8920-b3fd4b2abd99	55555555-5555-5555-5555-555555555555	feedback_request_copy_2	MARKETING	en_US	[{"text": "Hi {{1}}, we hope you enjoyed your experience with us. Would you mind rating us?", "type": "BODY", "example": {"body_text": [["Alex"]]}}, {"type": "BUTTONS", "buttons": [{"text": "Excellent", "type": "QUICK_REPLY"}, {"text": "Good", "type": "QUICK_REPLY"}, {"text": "Poor", "type": "QUICK_REPLY"}]}]	4297345343810332	\N	2025-12-19 13:02:26.234353+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
e6955d99-d30b-402a-9cfd-a24166343a58	55555555-5555-5555-5555-555555555555	feedback_request_copy_748	MARKETING	en_US	[{"text": "Hi {{1}}, we hope you enjoyed your experience with us. Would you mind rating us?", "type": "BODY", "example": {"body_text": [["Alex"]]}}, {"type": "BUTTONS", "buttons": [{"text": "Excellent", "type": "QUICK_REPLY"}, {"text": "Good", "type": "QUICK_REPLY"}, {"text": "Poor", "type": "QUICK_REPLY"}]}]	1205541277593157	\N	2025-12-19 13:02:26.363952+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
09fde770-0d71-408c-b1f9-ec049918287f	55555555-5555-5555-5555-555555555555	order_confirmation_v1_copy_779	UTILITY	en_US	[{"text": "Order Confirmation", "type": "HEADER", "format": "TEXT"}, {"text": "Hi {{1}}, thank you for your order #{{2}}! We have received your payment of {{3}}. We will notify you when it ships.", "type": "BODY"}, {"text": "Thank you for shopping with us!", "type": "FOOTER"}, {"type": "BUTTONS", "buttons": [{"url": "https://example.com/orders/{{1}}", "text": "View Order", "type": "URL"}]}]	720644760670127	\N	2025-12-19 13:02:26.75623+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
6e144623-7975-4280-8724-997314ad3996	55555555-5555-5555-5555-555555555555	appointment_reminder_v1_copy_607	UTILITY	en_US	[{"text": "Appointment Reminder", "type": "HEADER", "format": "TEXT"}, {"text": "Hello {{1}}, this is a reminder for your appointment on {{2}} at {{3}}. Please arrive 10 minutes early.", "type": "BODY"}, {"type": "BUTTONS", "buttons": [{"text": "Confirm", "type": "QUICK_REPLY"}, {"text": "Reschedule", "type": "QUICK_REPLY"}]}]	1186248933008918	\N	2025-12-19 13:02:26.87828+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
e0e753e9-3d0d-42a9-94e5-0449b9a23f32	55555555-5555-5555-5555-555555555555	appointment_reminder_v1_copy_777	UTILITY	en_US	[{"text": "Appointment Reminder", "type": "HEADER", "format": "TEXT"}, {"text": "Hello {{1}}, this is a reminder for your appointment on {{2}} at {{3}}. Please arrive 10 minutes early.", "type": "BODY"}, {"type": "BUTTONS", "buttons": [{"text": "Confirm", "type": "QUICK_REPLY"}, {"text": "Reschedule", "type": "QUICK_REPLY"}]}]	1410179987122641	\N	2025-12-19 13:02:27.003076+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
9a6eb3bb-e714-491f-b42c-3ee4e776e29a	55555555-5555-5555-5555-555555555555	shipment_confirmation_5	UTILITY	en_US	[{"text": "Order shipped", "type": "HEADER", "format": "TEXT"}, {"text": "Hi {{1}},\\n\\nWe’re happy to inform you that your order {{2}} has shipped! Click below to view the status of your shipment.", "type": "BODY", "example": {"body_text": [["Pavan", "#12345"]]}}, {"type": "BUTTONS", "buttons": [{"url": "https://www.example.com/", "text": "View order", "type": "URL"}]}]	772539545832665	\N	2025-12-19 13:02:27.125563+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
d518a216-cef8-41f9-822d-c49817b5a4fe	55555555-5555-5555-5555-555555555555	feedback_survey	UTILITY	en_US	[{"text": "Hi {{1}},\\n\\nThank you for your recent {{2}} on {{3}}.\\n\\nWe value your feedback and would appreciate you sharing more about your experience with us at the link below.\\n\\nThis should only take {{4}} minutes. We appreciate your time.", "type": "BODY", "example": {"body_text": [["John", "visit", "Jan 1, 2025", "5"]]}}, {"type": "BUTTONS", "buttons": [{"url": "https://www.zoworks.ai/", "text": "Leave feedback", "type": "URL"}]}]	1373880797484692	\N	2025-12-19 13:02:27.541+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
6e763464-6cda-4603-8d71-97c3987ddd8b	55555555-5555-5555-5555-555555555555	hello_world	UTILITY	en_US	[{"text": "Hello World", "type": "HEADER", "format": "TEXT"}, {"text": "Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta. Thank you for taking the time to test with us.", "type": "BODY"}, {"text": "WhatsApp Business Platform sample message", "type": "FOOTER"}]	1428538274949169	\N	2025-12-19 13:02:27.627241+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
96c3d07b-1d01-4cd4-b129-ccd1ac433ccf	55555555-5555-5555-5555-555555555555	appointment_reminder_v1_copy_979	UTILITY	en_US	[{"text": "Appointment Reminder", "type": "HEADER", "format": "TEXT"}, {"text": "Hello {{1}}, this is a reminder for your appointment on {{2}} at {{3}}. Please arrive 10 minutes early.", "type": "BODY", "example": {"body_text": [["John", "Monday", "10:00 AM"]]}}, {"type": "BUTTONS", "buttons": [{"text": "Confirm", "type": "QUICK_REPLY"}, {"text": "Reschedule", "type": "QUICK_REPLY"}]}]	1441587044239977	\N	2025-12-19 13:02:26.498949+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
e057a5ca-964f-4c84-8bb6-7a6184a34ef0	55555555-5555-5555-5555-555555555555	event_rsvp_confirmation_1	UTILITY	en_US	[{"text": "Thank you for RSVP’ing to {{1}} by {{2}}. \\n\\nSee you on {{3}} at {{4}} local time.\\n", "type": "BODY", "example": {"body_text": [["John's 30th birthday party", "John and Jane", "January 1st", "7 pm"]]}}]	764036190020222	\N	2025-12-19 13:02:27.328641+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
bd613470-b953-4a26-ad51-1baeada74567	55555555-5555-5555-5555-555555555555	retail_store_discovery	MARKETING	en_US	[{"text": "Welcome to the Store!", "type": "HEADER", "format": "TEXT"}, {"text": "Hi {{1}}, thanks for reaching out! What would you like to do today?", "type": "BODY"}, {"type": "BUTTONS", "buttons": [{"text": "Browse Catalog", "type": "QUICK_REPLY"}, {"text": "View Offers", "type": "QUICK_REPLY"}, {"text": "Talk to Agent", "type": "QUICK_REPLY"}]}]	\N	\N	2025-12-20 09:13:53.509652+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
7ac7c7af-f862-4df2-b6cc-250d8f25e874	55555555-5555-5555-5555-555555555555	retail_checkout_reminder	MARKETING	en_US	[{"text": "Hi {{1}}, we noticed you left some items in your cart. Would you like to complete your order now?", "type": "BODY"}, {"type": "BUTTONS", "buttons": [{"text": "Complete Order", "type": "QUICK_REPLY"}, {"text": "Apply 10% Discount", "type": "QUICK_REPLY"}, {"text": "Empty Cart", "type": "QUICK_REPLY"}]}]	\N	\N	2025-12-20 09:13:53.509652+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
2ea81558-7463-4c7b-975e-40cae0cd7e5b	55555555-5555-5555-5555-555555555555	appointment_reminder_v1_copy_672	UTILITY	en_US	[{"text": "Appointment Reminder", "type": "HEADER", "format": "TEXT"}, {"text": "Hello {{1}}, this is a reminder for your appointment on {{2}} at {{3}}. Please arrive 10 minutes early.", "type": "BODY"}, {"type": "BUTTONS", "buttons": [{"text": "Confirm", "type": "QUICK_REPLY"}, {"text": "Reschedule", "type": "QUICK_REPLY"}]}]	894583056562280	\N	2025-12-19 13:02:26.626757+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
3ac147dc-5d55-47a5-a02e-8859db19a5a0	55555555-5555-5555-5555-555555555555	order_management_1	UTILITY	en_US	[{"text": "Order confirmed", "type": "HEADER", "format": "TEXT"}, {"text": "Hi {{1}},\\n\\nThank you for your {{2}}! Your order number is {{3}}.\\n\\nWe'll start getting {{4}} ready to ship.\\n\\nEstimated delivery: {{5}} \\n\\nWe will let you know when your order ships.", "type": "BODY", "example": {"body_text": [["John", "purchase", "#12345", "2 12-pack of Jasper's paper towels", "Jan 1, 2024"]]}}, {"type": "BUTTONS", "buttons": [{"url": "https://www.example.com/", "text": "View order details", "type": "URL"}]}]	1191502976234499	\N	2025-12-19 13:02:27.252507+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
1463c564-20a8-419c-a206-e5758f6a1a3f	55555555-5555-5555-5555-555555555555	followup_missed_calls	UTILITY	en_US	[{"text": "Missed call", "type": "HEADER", "format": "TEXT"}, {"text": "Hi {{1}}, we missed your call. Please let us know if you're available to reschedule.", "type": "BODY", "example": {"body_text": [["John"]]}}, {"type": "BUTTONS", "buttons": [{"text": "Reschedule Call", "type": "QUICK_REPLY"}]}]	858316456656281	\N	2025-12-19 13:02:27.442016+05:30	2026-05-05 21:47:40.456525+05:30	\N	\N	t	APPROVED	whatsapp
\.


--
-- Data for Name: wa_variable_definitions; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.wa_variable_definitions (id, organization_id, name, variable_syntax, description, category, is_system, created_at, updated_at) FROM stdin;
2953231a-6925-46e5-9262-980d0e2050a5	55555555-5555-5555-5555-555555555555	Active Products	{{catalog.offerings.list.name}}	Active products or services	General	f	2025-12-13 21:28:16.864561+05:30	2025-12-13 21:28:16.864561+05:30
3cca9f76-729f-4279-b413-eb7cb7296956	55555555-5555-5555-5555-555555555555	User list	{{identity.users.list.name}}	Active User list	General	f	2025-12-14 21:47:41.045581+05:30	2025-12-14 21:47:41.045581+05:30
b8475cba-918e-48c4-a256-b41ce3be6eff	55555555-5555-5555-5555-555555555555	Contact Name	{{contact.name}}	Full name of the contact	Contact	f	2025-12-13 20:44:36.424665+05:30	2025-12-13 20:44:36.424665+05:30
fc81e5ea-2cd0-4481-bf5d-78b765f29651	55555555-5555-5555-5555-555555555555	Contact Phone	{{contact.wa_id}}	WhatsApp ID of the contact	Contact	f	2025-12-13 20:44:36.424665+05:30	2025-12-13 20:44:36.424665+05:30
6445c6fd-acc3-4121-be33-fb3d0c1e25cf	55555555-5555-5555-5555-555555555555	active offering	{{catalog.offerings.list.name}}	active offering	General	f	2025-12-19 12:56:55.658993+05:30	2025-12-19 12:56:55.658993+05:30
c123140d-a52c-4e5b-ac05-be9afe708e15	55555555-5555-5555-5555-555555555555	Contact Name	{{contact.name}}	contact name	General	f	2025-12-20 09:32:13.544915+05:30	2025-12-20 09:32:13.544915+05:30
cacc571d-de0c-48cd-af46-b11248389e3e	55555555-5555-5555-5555-555555555555	Contact Phone	{{contact.wa_id}}	Contact Phone	General	f	2025-12-20 09:32:43.599497+05:30	2025-12-20 09:32:43.599497+05:30
67f9afb8-1833-41a4-8dee-5c7cdf28a31f	55555555-5555-5555-5555-555555555555	Active Users (C1)	{{identity.v_users.list.name}}	active users	General	f	2025-12-20 09:36:31.936108+05:30	2025-12-20 09:36:31.936108+05:30
8dd3ca82-c984-404c-8ee4-323cea9bb472	55555555-5555-5555-5555-555555555555	active accounts	{{external.accounts.list.name}}	active accounts	General	f	2025-12-20 09:56:12.950118+05:30	2025-12-20 09:56:12.950118+05:30
ea6f7cc2-dd25-4176-a3ac-4a6fd5a42fda	55555555-5555-5555-5555-555555555555	active contacts	{{external.contacts.list.name}}	active contacts	General	f	2025-12-20 09:56:42.42612+05:30	2025-12-20 09:56:42.42612+05:30
936b69bd-fd74-44a9-a3c6-a6300f36dcd8	55555555-5555-5555-5555-555555555555	active accounts	{{external.accounts.list.name}}	active accounts	General	f	2025-12-20 09:57:36.917906+05:30	2025-12-20 09:57:36.917906+05:30
14532601-46e2-4fbd-b7b3-bf486a0a81cc	55555555-5555-5555-5555-555555555555	active contacts	{{external.contacts.list.name}}	active contacts	General	f	2025-12-20 09:57:56.885867+05:30	2025-12-20 09:57:56.885867+05:30
20285448-717b-4b14-896c-6226494257c1	55555555-5555-5555-5555-555555555555	var	{{schema.table.list.column}}	desc	General	f	2026-02-13 22:06:22.859723+05:30	2026-02-13 22:06:22.859723+05:30
5d29af49-9d51-41a2-8391-00b3ac2cbaab	55555555-5555-5555-5555-555555555555	var (Copy)	{{schema.table.list.column}}	desc	General	f	2026-02-13 22:06:33.341793+05:30	2026-02-13 22:06:33.341793+05:30
142e8caf-f238-4ea4-b5ab-d463b8be8ec3	55555555-5555-5555-5555-555555555555	Order Number	{{order_number}}	Unique order identifier	Commerce	f	2026-05-07 16:22:55.404155+05:30	2026-05-07 16:22:55.404155+05:30
\.


--
-- Data for Name: x_wa_order_items; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.x_wa_order_items (id, order_id, organization_id, offering_id, offering_variant_id, name, quantity, unit_price, subtotal, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: x_wa_orders; Type: TABLE DATA; Schema: wa; Owner: -
--

COPY wa.x_wa_orders (id, organization_id, wa_conversation_id, contact_id, order_date, total_amount, currency, notes, metadata, created_at, created_by, updated_at, updated_by, is_active) FROM stdin;
\.


--
-- Name: wa_automation_rules automation_rules_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_automation_rules
    ADD CONSTRAINT automation_rules_pkey PRIMARY KEY (id);


--
-- Name: call_logs call_logs_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.call_logs
    ADD CONSTRAINT call_logs_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: contact_external_data contact_external_data_contact_id_source_key; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.contact_external_data
    ADD CONSTRAINT contact_external_data_contact_id_source_key UNIQUE (contact_id, source);


--
-- Name: contact_external_data contact_external_data_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.contact_external_data
    ADD CONSTRAINT contact_external_data_pkey PRIMARY KEY (id);


--
-- Name: contact_segments contact_segments_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.contact_segments
    ADD CONSTRAINT contact_segments_pkey PRIMARY KEY (contact_id, segment_id);


--
-- Name: game_scores game_scores_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.game_scores
    ADD CONSTRAINT game_scores_pkey PRIMARY KEY (id);


--
-- Name: game_sessions game_sessions_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.game_sessions
    ADD CONSTRAINT game_sessions_pkey PRIMARY KEY (id);


--
-- Name: wa_automation_rules uq_wa_automation_rules_org_name; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_automation_rules
    ADD CONSTRAINT uq_wa_automation_rules_org_name UNIQUE (organization_id, name);


--
-- Name: wa_agent_transfers wa_agent_transfers_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_agent_transfers
    ADD CONSTRAINT wa_agent_transfers_pkey PRIMARY KEY (id);


--
-- Name: wa_contact_external_data wa_contact_external_data_contact_id_source_key; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_contact_external_data
    ADD CONSTRAINT wa_contact_external_data_contact_id_source_key UNIQUE (contact_id, source);


--
-- Name: wa_contact_external_data wa_contact_external_data_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_contact_external_data
    ADD CONSTRAINT wa_contact_external_data_pkey PRIMARY KEY (id);


--
-- Name: wa_contact_segments wa_contact_segments_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_contact_segments
    ADD CONSTRAINT wa_contact_segments_pkey PRIMARY KEY (contact_id, segment_id);


--
-- Name: wa_contacts wa_contacts_display_id_key; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_contacts
    ADD CONSTRAINT wa_contacts_display_id_key UNIQUE (display_id);


--
-- Name: wa_conversations wa_conversations_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_conversations
    ADD CONSTRAINT wa_conversations_pkey PRIMARY KEY (id);


--
-- Name: wa_drip_campaigns wa_drip_campaigns_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_drip_campaigns
    ADD CONSTRAINT wa_drip_campaigns_pkey PRIMARY KEY (id);


--
-- Name: wa_drip_enrollments wa_drip_enrollments_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_drip_enrollments
    ADD CONSTRAINT wa_drip_enrollments_pkey PRIMARY KEY (id);


--
-- Name: wa_drip_execution_log wa_drip_execution_log_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_drip_execution_log
    ADD CONSTRAINT wa_drip_execution_log_pkey PRIMARY KEY (id);


--
-- Name: wa_drip_steps wa_drip_steps_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_drip_steps
    ADD CONSTRAINT wa_drip_steps_pkey PRIMARY KEY (id);


--
-- Name: wa_manual_campaign_recipients wa_manual_campaign_recipients_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_manual_campaign_recipients
    ADD CONSTRAINT wa_manual_campaign_recipients_pkey PRIMARY KEY (id);


--
-- Name: wa_manual_campaigns wa_manual_campaigns_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_manual_campaigns
    ADD CONSTRAINT wa_manual_campaigns_pkey PRIMARY KEY (id);


--
-- Name: wa_message_retry_queue wa_message_retry_queue_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_message_retry_queue
    ADD CONSTRAINT wa_message_retry_queue_pkey PRIMARY KEY (id);


--
-- Name: x_wa_order_items wa_order_items_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.x_wa_order_items
    ADD CONSTRAINT wa_order_items_pkey PRIMARY KEY (id);


--
-- Name: x_wa_orders wa_orders_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.x_wa_orders
    ADD CONSTRAINT wa_orders_pkey PRIMARY KEY (id);


--
-- Name: wa_quick_replies wa_quick_replies_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_quick_replies
    ADD CONSTRAINT wa_quick_replies_pkey PRIMARY KEY (id);


--
-- Name: wa_routing_rules wa_routing_rules_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_routing_rules
    ADD CONSTRAINT wa_routing_rules_pkey PRIMARY KEY (id);


--
-- Name: wa_template_variable_mappings wa_template_variable_mappings_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_template_variable_mappings
    ADD CONSTRAINT wa_template_variable_mappings_pkey PRIMARY KEY (id);


--
-- Name: wa_variable_definitions wa_variable_definitions_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_variable_definitions
    ADD CONSTRAINT wa_variable_definitions_pkey PRIMARY KEY (id);


--
-- Name: wa_contacts whatsapp_contacts_organization_id_wa_id_key; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_contacts
    ADD CONSTRAINT whatsapp_contacts_organization_id_wa_id_key UNIQUE (organization_id, wa_id);


--
-- Name: wa_contacts whatsapp_contacts_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_contacts
    ADD CONSTRAINT whatsapp_contacts_pkey PRIMARY KEY (id);


--
-- Name: wa_messages whatsapp_messages_organization_id_whatsapp_message_id_key; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_messages
    ADD CONSTRAINT whatsapp_messages_organization_id_whatsapp_message_id_key UNIQUE (organization_id, whatsapp_message_id);


--
-- Name: wa_messages whatsapp_messages_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_messages
    ADD CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id);


--
-- Name: wa_templates whatsapp_templates_organization_id_name_key; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_templates
    ADD CONSTRAINT whatsapp_templates_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: wa_templates whatsapp_templates_pkey; Type: CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_templates
    ADD CONSTRAINT whatsapp_templates_pkey PRIMARY KEY (id);


--
-- Name: idx_contact_external_contact; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_contact_external_contact ON wa.contact_external_data USING btree (contact_id);


--
-- Name: idx_contact_external_source; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_contact_external_source ON wa.contact_external_data USING btree (source);


--
-- Name: idx_contact_segments_contact; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_contact_segments_contact ON wa.contact_segments USING btree (contact_id);


--
-- Name: idx_contact_segments_segment; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_contact_segments_segment ON wa.contact_segments USING btree (segment_id);


--
-- Name: idx_drip_enrollments_campaign; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_drip_enrollments_campaign ON wa.wa_drip_enrollments USING btree (campaign_id);


--
-- Name: idx_drip_steps_campaign_order; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_drip_steps_campaign_order ON wa.wa_drip_steps USING btree (campaign_id, sequence_order);


--
-- Name: idx_game_scores_leaderboard; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_game_scores_leaderboard ON wa.game_scores USING btree (game_type, score, played_at DESC);


--
-- Name: idx_game_scores_phone; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_game_scores_phone ON wa.game_scores USING btree (phone, game_type);


--
-- Name: idx_game_sessions_phone; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_game_sessions_phone ON wa.game_sessions USING btree (phone, game_type);


--
-- Name: idx_wa_agent_transfers_conv_status; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_agent_transfers_conv_status ON wa.wa_agent_transfers USING btree (conversation_id, status);


--
-- Name: idx_wa_agent_transfers_org_status; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_agent_transfers_org_status ON wa.wa_agent_transfers USING btree (organization_id, status);


--
-- Name: idx_wa_agent_transfers_status; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_agent_transfers_status ON wa.wa_agent_transfers USING btree (status);


--
-- Name: idx_wa_automation_rules_org_active; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_automation_rules_org_active ON wa.wa_automation_rules USING btree (organization_id, is_active) WHERE (is_active = true);


--
-- Name: idx_wa_contact_external_contact; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_contact_external_contact ON wa.wa_contact_external_data USING btree (contact_id);


--
-- Name: idx_wa_contact_external_source; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_contact_external_source ON wa.wa_contact_external_data USING btree (source);


--
-- Name: idx_wa_contact_segments_contact; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_contact_segments_contact ON wa.wa_contact_segments USING btree (contact_id);


--
-- Name: idx_wa_contact_segments_segment; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_contact_segments_segment ON wa.wa_contact_segments USING btree (segment_id);


--
-- Name: idx_wa_contacts_org_id; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_contacts_org_id ON wa.wa_contacts USING btree (organization_id);


--
-- Name: idx_wa_conversations_contact_id; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_conversations_contact_id ON wa.wa_conversations USING btree (contact_id);


--
-- Name: idx_wa_conversations_last_message_at; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_conversations_last_message_at ON wa.wa_conversations USING btree (last_message_at);


--
-- Name: idx_wa_conversations_org_channel_status; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_conversations_org_channel_status ON wa.wa_conversations USING btree (organization_id, channel, status);


--
-- Name: idx_wa_conversations_org_contact; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_conversations_org_contact ON wa.wa_conversations USING btree (organization_id, contact_id);


--
-- Name: idx_wa_conversations_org_status; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_conversations_org_status ON wa.wa_conversations USING btree (organization_id, status);


--
-- Name: idx_wa_conversations_snoozed_until; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_conversations_snoozed_until ON wa.wa_conversations USING btree (snoozed_until);


--
-- Name: idx_wa_conversations_status; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_conversations_status ON wa.wa_conversations USING btree (status);


--
-- Name: idx_wa_drip_campaigns_location; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_drip_campaigns_location ON wa.wa_drip_campaigns USING btree (organization_id, location_id) WHERE (location_id IS NOT NULL);


--
-- Name: idx_wa_drip_enrollments_campaign_status; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_drip_enrollments_campaign_status ON wa.wa_drip_enrollments USING btree (campaign_id, status);


--
-- Name: idx_wa_drip_enrollments_status; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_drip_enrollments_status ON wa.wa_drip_enrollments USING btree (status);


--
-- Name: idx_wa_manual_campaigns_status; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_manual_campaigns_status ON wa.wa_manual_campaigns USING btree (organization_id, status) WHERE (status = ANY (ARRAY['scheduled'::text, 'sending'::text]));


--
-- Name: idx_wa_mcr_campaign_pending; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_mcr_campaign_pending ON wa.wa_manual_campaign_recipients USING btree (campaign_id, status) WHERE (status = 'pending'::text);


--
-- Name: idx_wa_mcr_contact; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_mcr_contact ON wa.wa_manual_campaign_recipients USING btree (contact_id);


--
-- Name: idx_wa_mcr_unique_campaign_contact; Type: INDEX; Schema: wa; Owner: -
--

CREATE UNIQUE INDEX idx_wa_mcr_unique_campaign_contact ON wa.wa_manual_campaign_recipients USING btree (campaign_id, contact_id);


--
-- Name: idx_wa_messages_contact_id_timestamp; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_messages_contact_id_timestamp ON wa.wa_messages USING btree (contact_id, "timestamp");


--
-- Name: idx_wa_messages_conversation_id; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_messages_conversation_id ON wa.wa_messages USING btree (conversation_id);


--
-- Name: idx_wa_messages_details; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_messages_details ON wa.wa_messages USING gin (details);


--
-- Name: idx_wa_messages_org_channel_status; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_messages_org_channel_status ON wa.wa_messages USING btree (organization_id, channel, status);


--
-- Name: idx_wa_messages_org_contact; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_messages_org_contact ON wa.wa_messages USING btree (organization_id, contact_id);


--
-- Name: idx_wa_messages_status; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_messages_status ON wa.wa_messages USING btree (status);


--
-- Name: idx_wa_messages_whatsapp_id; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_messages_whatsapp_id ON wa.wa_messages USING btree (whatsapp_message_id);


--
-- Name: idx_wa_order_items_order_id; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_order_items_order_id ON wa.x_wa_order_items USING btree (order_id);


--
-- Name: idx_wa_orders_conversation_org; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_orders_conversation_org ON wa.x_wa_orders USING btree (organization_id, wa_conversation_id);


--
-- Name: idx_wa_retry_queue_contact; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_retry_queue_contact ON wa.wa_message_retry_queue USING btree (contact_id, status);


--
-- Name: idx_wa_retry_queue_due; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_retry_queue_due ON wa.wa_message_retry_queue USING btree (organization_id, next_attempt_at) WHERE (status = 'pending'::text);


--
-- Name: idx_wa_routing_rules_location; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_routing_rules_location ON wa.wa_routing_rules USING btree (organization_id, location_id, priority) WHERE ((is_active = true) AND (location_id IS NOT NULL));


--
-- Name: idx_wa_routing_rules_org_active; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_routing_rules_org_active ON wa.wa_routing_rules USING btree (organization_id, priority) WHERE (is_active = true);


--
-- Name: idx_wa_templates_org_channel_status; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_templates_org_channel_status ON wa.wa_templates USING btree (organization_id, channel, status);


--
-- Name: idx_wa_templates_status; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_wa_templates_status ON wa.wa_templates USING btree (status);


--
-- Name: idx_whatsapp_messages_contact_id; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_whatsapp_messages_contact_id ON wa.wa_messages USING btree (contact_id);


--
-- Name: idx_whatsapp_messages_timestamp; Type: INDEX; Schema: wa; Owner: -
--

CREATE INDEX idx_whatsapp_messages_timestamp ON wa.wa_messages USING btree ("timestamp");


--
-- Name: campaigns sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.campaigns FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: contact_external_data sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.contact_external_data FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: wa_automation_rules sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.wa_automation_rules FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: wa_contact_external_data sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.wa_contact_external_data FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: wa_contacts sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.wa_contacts FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: wa_conversations sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.wa_conversations FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: wa_drip_campaigns sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.wa_drip_campaigns FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: wa_drip_enrollments sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.wa_drip_enrollments FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: wa_drip_execution_log sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.wa_drip_execution_log FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();

ALTER TABLE wa.wa_drip_execution_log DISABLE TRIGGER sys_trg_register_unified_object;


--
-- Name: wa_drip_steps sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.wa_drip_steps FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: wa_manual_campaigns sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.wa_manual_campaigns FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: wa_messages sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.wa_messages FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();

ALTER TABLE wa.wa_messages DISABLE TRIGGER sys_trg_register_unified_object;


--
-- Name: wa_quick_replies sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.wa_quick_replies FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: wa_template_variable_mappings sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.wa_template_variable_mappings FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: wa_templates sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.wa_templates FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: wa_variable_definitions sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.wa_variable_definitions FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: x_wa_order_items sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.x_wa_order_items FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();

ALTER TABLE wa.x_wa_order_items DISABLE TRIGGER sys_trg_register_unified_object;


--
-- Name: x_wa_orders sys_trg_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER sys_trg_register_unified_object AFTER INSERT OR UPDATE ON wa.x_wa_orders FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: x_wa_orders trg_sys_register_unified_object; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER trg_sys_register_unified_object AFTER INSERT ON wa.x_wa_orders FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();


--
-- Name: v_wa_contact_metrics trg_v_wa_contact_metrics_shard_exec; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER trg_v_wa_contact_metrics_shard_exec INSTEAD OF INSERT OR DELETE OR UPDATE ON wa.v_wa_contact_metrics FOR EACH ROW EXECUTE FUNCTION wa.trg_v_wa_contact_metrics_shard();


--
-- Name: v_wa_contacts trg_v_wa_contacts_shard_exec; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER trg_v_wa_contacts_shard_exec INSTEAD OF INSERT OR DELETE OR UPDATE ON wa.v_wa_contacts FOR EACH ROW EXECUTE FUNCTION wa.trg_v_wa_contacts_shard();


--
-- Name: wa_contacts trg_wa_contacts_auto_link; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER trg_wa_contacts_auto_link BEFORE INSERT ON wa.wa_contacts FOR EACH ROW EXECUTE FUNCTION wa.trg_auto_link_new_contact();


--
-- Name: wa_drip_steps trg_wa_drip_steps_check_cycle; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER trg_wa_drip_steps_check_cycle BEFORE INSERT OR UPDATE OF parent_step_id ON wa.wa_drip_steps FOR EACH ROW EXECUTE FUNCTION wa.trg_wa_drip_steps_check_cycle();


--
-- Name: wa_messages trg_wa_msg_10_standardize; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER trg_wa_msg_10_standardize BEFORE INSERT ON wa.wa_messages FOR EACH ROW EXECUTE FUNCTION wa.wa_standardize_message_content();


--
-- Name: wa_messages trg_wa_msg_20_update_conversation; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER trg_wa_msg_20_update_conversation BEFORE INSERT ON wa.wa_messages FOR EACH ROW EXECUTE FUNCTION wa.wa_update_conversation_on_message();


--
-- Name: wa_messages trg_wa_msg_30_validate; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER trg_wa_msg_30_validate BEFORE INSERT ON wa.wa_messages FOR EACH ROW EXECUTE FUNCTION wa.wa_validate_message_content();


--
-- Name: wa_automation_rules update_automation_rules_updated_at; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON wa.wa_automation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wa_conversations update_wa_conversations_updated_at; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER update_wa_conversations_updated_at BEFORE UPDATE ON wa.wa_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wa_contacts update_whatsapp_contacts_updated_at; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER update_whatsapp_contacts_updated_at BEFORE UPDATE ON wa.wa_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wa_messages update_whatsapp_messages_updated_at; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER update_whatsapp_messages_updated_at BEFORE UPDATE ON wa.wa_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wa_templates update_whatsapp_templates_updated_at; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON wa.wa_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wa_contacts wa_drip_on_new_contact; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER wa_drip_on_new_contact AFTER INSERT ON wa.wa_contacts FOR EACH ROW EXECUTE FUNCTION wa.wa_drip_trigger_new_contact();


--
-- Name: wa_contacts wa_drip_on_tag_added; Type: TRIGGER; Schema: wa; Owner: -
--

CREATE TRIGGER wa_drip_on_tag_added AFTER UPDATE OF tags ON wa.wa_contacts FOR EACH ROW WHEN ((old.tags IS DISTINCT FROM new.tags)) EXECUTE FUNCTION wa.wa_drip_trigger_tag_added();


--
-- Name: wa_automation_rules automation_rules_response_template_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_automation_rules
    ADD CONSTRAINT automation_rules_response_template_id_fkey FOREIGN KEY (response_template_id) REFERENCES wa.wa_templates(id) ON DELETE SET NULL;


--
-- Name: campaigns campaigns_organization_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.campaigns
    ADD CONSTRAINT campaigns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES identity.organizations(id);


--
-- Name: contact_segments contact_segments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.contact_segments
    ADD CONSTRAINT contact_segments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES identity.users(id);


--
-- Name: wa_agent_transfers wa_agent_transfers_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_agent_transfers
    ADD CONSTRAINT wa_agent_transfers_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES identity.users(id);


--
-- Name: wa_agent_transfers wa_agent_transfers_contact_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_agent_transfers
    ADD CONSTRAINT wa_agent_transfers_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES wa.wa_contacts(id);


--
-- Name: wa_agent_transfers wa_agent_transfers_conversation_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_agent_transfers
    ADD CONSTRAINT wa_agent_transfers_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES wa.wa_conversations(id);


--
-- Name: wa_agent_transfers wa_agent_transfers_location_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_agent_transfers
    ADD CONSTRAINT wa_agent_transfers_location_id_fkey FOREIGN KEY (location_id) REFERENCES identity.locations(id);


--
-- Name: wa_agent_transfers wa_agent_transfers_organization_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_agent_transfers
    ADD CONSTRAINT wa_agent_transfers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES identity.organizations(id);


--
-- Name: wa_agent_transfers wa_agent_transfers_target_role_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_agent_transfers
    ADD CONSTRAINT wa_agent_transfers_target_role_id_fkey FOREIGN KEY (target_role_id) REFERENCES identity.roles(id);


--
-- Name: wa_agent_transfers wa_agent_transfers_target_team_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_agent_transfers
    ADD CONSTRAINT wa_agent_transfers_target_team_id_fkey FOREIGN KEY (target_team_id) REFERENCES identity.teams(id);


--
-- Name: wa_agent_transfers wa_agent_transfers_transferred_by_user_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_agent_transfers
    ADD CONSTRAINT wa_agent_transfers_transferred_by_user_id_fkey FOREIGN KEY (transferred_by_user_id) REFERENCES identity.users(id);


--
-- Name: wa_contact_external_data wa_contact_external_data_contact_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_contact_external_data
    ADD CONSTRAINT wa_contact_external_data_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES wa.wa_contacts(id) ON DELETE CASCADE;


--
-- Name: wa_contact_segments wa_contact_segments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_contact_segments
    ADD CONSTRAINT wa_contact_segments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES identity.users(id);


--
-- Name: wa_contact_segments wa_contact_segments_contact_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_contact_segments
    ADD CONSTRAINT wa_contact_segments_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES wa.wa_contacts(id) ON DELETE CASCADE;


--
-- Name: wa_conversations wa_conversations_contact_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_conversations
    ADD CONSTRAINT wa_conversations_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES wa.wa_contacts(id) ON DELETE CASCADE;


--
-- Name: wa_conversations wa_conversations_role_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_conversations
    ADD CONSTRAINT wa_conversations_role_id_fkey FOREIGN KEY (role_id) REFERENCES identity.roles(id);


--
-- Name: wa_conversations wa_conversations_team_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_conversations
    ADD CONSTRAINT wa_conversations_team_id_fkey FOREIGN KEY (team_id) REFERENCES identity.teams(id);


--
-- Name: wa_drip_campaigns wa_drip_campaigns_organization_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_drip_campaigns
    ADD CONSTRAINT wa_drip_campaigns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES identity.organizations(id);


--
-- Name: wa_drip_enrollments wa_drip_enrollments_campaign_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_drip_enrollments
    ADD CONSTRAINT wa_drip_enrollments_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES wa.wa_drip_campaigns(id);


--
-- Name: wa_drip_enrollments wa_drip_enrollments_contact_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_drip_enrollments
    ADD CONSTRAINT wa_drip_enrollments_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES wa.wa_contacts(id);


--
-- Name: wa_drip_enrollments wa_drip_enrollments_current_step_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_drip_enrollments
    ADD CONSTRAINT wa_drip_enrollments_current_step_id_fkey FOREIGN KEY (current_step_id) REFERENCES wa.wa_drip_steps(id);


--
-- Name: wa_drip_execution_log wa_drip_execution_log_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_drip_execution_log
    ADD CONSTRAINT wa_drip_execution_log_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES wa.wa_drip_enrollments(id) ON DELETE CASCADE;


--
-- Name: wa_drip_execution_log wa_drip_execution_log_step_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_drip_execution_log
    ADD CONSTRAINT wa_drip_execution_log_step_id_fkey FOREIGN KEY (step_id) REFERENCES wa.wa_drip_steps(id) ON DELETE SET NULL;


--
-- Name: wa_drip_steps wa_drip_steps_campaign_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_drip_steps
    ADD CONSTRAINT wa_drip_steps_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES wa.wa_drip_campaigns(id) ON DELETE CASCADE;


--
-- Name: wa_drip_steps wa_drip_steps_parent_step_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_drip_steps
    ADD CONSTRAINT wa_drip_steps_parent_step_id_fkey FOREIGN KEY (parent_step_id) REFERENCES wa.wa_drip_steps(id);


--
-- Name: wa_manual_campaign_recipients wa_manual_campaign_recipients_campaign_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_manual_campaign_recipients
    ADD CONSTRAINT wa_manual_campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES wa.wa_manual_campaigns(id) ON DELETE CASCADE;


--
-- Name: wa_messages wa_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_messages
    ADD CONSTRAINT wa_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES wa.wa_conversations(id) ON DELETE CASCADE;


--
-- Name: x_wa_order_items wa_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.x_wa_order_items
    ADD CONSTRAINT wa_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES wa.x_wa_orders(id) ON DELETE CASCADE;


--
-- Name: x_wa_orders wa_orders_contact_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.x_wa_orders
    ADD CONSTRAINT wa_orders_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES wa.wa_contacts(id);


--
-- Name: x_wa_orders wa_orders_wa_conversation_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.x_wa_orders
    ADD CONSTRAINT wa_orders_wa_conversation_id_fkey FOREIGN KEY (wa_conversation_id) REFERENCES wa.wa_conversations(id) ON DELETE CASCADE;


--
-- Name: wa_template_variable_mappings wa_template_variable_mappings_template_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_template_variable_mappings
    ADD CONSTRAINT wa_template_variable_mappings_template_id_fkey FOREIGN KEY (template_id) REFERENCES wa.wa_templates(id);


--
-- Name: wa_variable_definitions wa_variable_definitions_organization_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_variable_definitions
    ADD CONSTRAINT wa_variable_definitions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES identity.organizations(id);


--
-- Name: wa_messages whatsapp_messages_contact_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_messages
    ADD CONSTRAINT whatsapp_messages_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES wa.wa_contacts(id) ON DELETE CASCADE;


--
-- Name: wa_messages whatsapp_messages_template_id_fkey; Type: FK CONSTRAINT; Schema: wa; Owner: -
--

ALTER TABLE ONLY wa.wa_messages
    ADD CONSTRAINT whatsapp_messages_template_id_fkey FOREIGN KEY (template_id) REFERENCES wa.wa_templates(id) ON DELETE SET NULL;


--
-- Name: call_logs Authenticated_Access_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Authenticated_Access_V5" ON wa.call_logs TO authenticated USING (true);


--
-- Name: contact_external_data Authenticated_Access_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Authenticated_Access_V5" ON wa.contact_external_data TO authenticated USING (true);


--
-- Name: contact_segments Authenticated_Access_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Authenticated_Access_V5" ON wa.contact_segments TO authenticated USING (true);


--
-- Name: game_scores Authenticated_Access_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Authenticated_Access_V5" ON wa.game_scores TO authenticated USING (true);


--
-- Name: game_sessions Authenticated_Access_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Authenticated_Access_V5" ON wa.game_sessions TO authenticated USING (true);


--
-- Name: wa_contact_external_data Authenticated_Access_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Authenticated_Access_V5" ON wa.wa_contact_external_data TO authenticated USING (true);


--
-- Name: wa_contact_segments Authenticated_Access_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Authenticated_Access_V5" ON wa.wa_contact_segments TO authenticated USING (true);


--
-- Name: wa_drip_enrollments Authenticated_Access_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Authenticated_Access_V5" ON wa.wa_drip_enrollments TO authenticated USING (true);


--
-- Name: wa_drip_execution_log Authenticated_Access_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Authenticated_Access_V5" ON wa.wa_drip_execution_log TO authenticated USING (true);


--
-- Name: wa_drip_steps Authenticated_Access_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Authenticated_Access_V5" ON wa.wa_drip_steps TO authenticated USING (true);


--
-- Name: wa_template_variable_mappings Authenticated_Access_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Authenticated_Access_V5" ON wa.wa_template_variable_mappings TO authenticated USING (true);


--
-- Name: wa_templates Config_Delete_V6; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Config_Delete_V6" ON wa.wa_templates FOR DELETE TO authenticated USING (((organization_id = identity.get_current_org_id()) OR identity.is_saas_admin()));


--
-- Name: wa_templates Config_Tenant_Or_Platform_V6; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Config_Tenant_Or_Platform_V6" ON wa.wa_templates FOR SELECT TO authenticated USING (((organization_id = identity.get_current_org_id()) OR (EXISTS ( SELECT 1
   FROM identity.organizations o
  WHERE ((o.id = wa_templates.organization_id) AND (o.is_system_org = true))))));


--
-- Name: wa_templates Config_Update_V6; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Config_Update_V6" ON wa.wa_templates FOR UPDATE TO authenticated USING (((organization_id = identity.get_current_org_id()) OR identity.is_saas_admin())) WITH CHECK (((organization_id = identity.get_current_org_id()) OR identity.is_saas_admin()));


--
-- Name: wa_templates Config_Write_V6; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Config_Write_V6" ON wa.wa_templates FOR INSERT TO authenticated WITH CHECK (((organization_id = identity.get_current_org_id()) OR identity.is_saas_admin()));


--
-- Name: campaigns Standard_Insert_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Standard_Insert_V5" ON wa.campaigns FOR INSERT TO authenticated WITH CHECK (((organization_id = identity.get_current_org_id()) AND (EXISTS ( SELECT 1
   FROM identity.rls_get_session_context() ctx(current_org_id, my_user_id, my_org_user_id, my_persona, contact_id, account_ids, vendor_ids, subordinate_user_ids, my_location_id, accessible_location_ids, role_names, permissions, has_hr_access, has_finance_access, team_ids, team_location_ids, is_saas_admin, my_org_path, my_location_path)
  WHERE (ctx.is_saas_admin OR (ctx.my_persona = 'worker'::text))))));


--
-- Name: wa_contacts Standard_Insert_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Standard_Insert_V5" ON wa.wa_contacts FOR INSERT TO authenticated WITH CHECK (((organization_id = identity.get_current_org_id()) AND (EXISTS ( SELECT 1
   FROM identity.rls_get_session_context() ctx(current_org_id, my_user_id, my_org_user_id, my_persona, contact_id, account_ids, vendor_ids, subordinate_user_ids, my_location_id, accessible_location_ids, role_names, permissions, has_hr_access, has_finance_access, team_ids, team_location_ids, is_saas_admin, my_org_path, my_location_path)
  WHERE (ctx.my_persona = 'worker'::text)))));


--
-- Name: wa_conversations Standard_Insert_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Standard_Insert_V5" ON wa.wa_conversations FOR INSERT TO authenticated WITH CHECK (((organization_id = identity.get_current_org_id()) AND (EXISTS ( SELECT 1
   FROM identity.rls_get_session_context() ctx(current_org_id, my_user_id, my_org_user_id, my_persona, contact_id, account_ids, vendor_ids, subordinate_user_ids, my_location_id, accessible_location_ids, role_names, permissions, has_hr_access, has_finance_access, team_ids, team_location_ids, is_saas_admin, my_org_path, my_location_path)
  WHERE (ctx.my_user_id IS NOT NULL)))));


--
-- Name: wa_messages Standard_Insert_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Standard_Insert_V5" ON wa.wa_messages FOR INSERT TO authenticated WITH CHECK (((organization_id = identity.get_current_org_id()) AND (EXISTS ( SELECT 1
   FROM identity.rls_get_session_context() ctx(current_org_id, my_user_id, my_org_user_id, my_persona, contact_id, account_ids, vendor_ids, subordinate_user_ids, my_location_id, accessible_location_ids, role_names, permissions, has_hr_access, has_finance_access, team_ids, team_location_ids, is_saas_admin, my_org_path, my_location_path)
  WHERE (ctx.my_user_id IS NOT NULL)))));


--
-- Name: wa_agent_transfers Tenant_Isolation_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Tenant_Isolation_V5" ON wa.wa_agent_transfers TO authenticated USING ((organization_id = identity.get_current_org_id()));


--
-- Name: wa_automation_rules Tenant_Isolation_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Tenant_Isolation_V5" ON wa.wa_automation_rules TO authenticated USING ((organization_id = identity.get_current_org_id()));


--
-- Name: wa_drip_campaigns Tenant_Isolation_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Tenant_Isolation_V5" ON wa.wa_drip_campaigns TO authenticated USING ((organization_id = identity.get_current_org_id()));


--
-- Name: wa_manual_campaign_recipients Tenant_Isolation_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Tenant_Isolation_V5" ON wa.wa_manual_campaign_recipients TO authenticated USING ((campaign_id IN ( SELECT wa_manual_campaigns.id
   FROM wa.wa_manual_campaigns
  WHERE (wa_manual_campaigns.organization_id = identity.get_current_org_id()))));


--
-- Name: wa_manual_campaigns Tenant_Isolation_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Tenant_Isolation_V5" ON wa.wa_manual_campaigns TO authenticated USING ((organization_id = identity.get_current_org_id()));


--
-- Name: wa_message_retry_queue Tenant_Isolation_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Tenant_Isolation_V5" ON wa.wa_message_retry_queue TO authenticated USING ((organization_id = identity.get_current_org_id()));


--
-- Name: wa_quick_replies Tenant_Isolation_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Tenant_Isolation_V5" ON wa.wa_quick_replies TO authenticated USING ((organization_id = identity.get_current_org_id()));


--
-- Name: wa_routing_rules Tenant_Isolation_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Tenant_Isolation_V5" ON wa.wa_routing_rules TO authenticated USING ((organization_id = identity.get_current_org_id()));


--
-- Name: wa_variable_definitions Tenant_Isolation_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Tenant_Isolation_V5" ON wa.wa_variable_definitions TO authenticated USING ((organization_id = identity.get_current_org_id()));


--
-- Name: x_wa_order_items Tenant_Isolation_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Tenant_Isolation_V5" ON wa.x_wa_order_items TO authenticated USING ((organization_id = identity.get_current_org_id()));


--
-- Name: x_wa_orders Tenant_Isolation_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Tenant_Isolation_V5" ON wa.x_wa_orders TO authenticated USING ((organization_id = identity.get_current_org_id()));


--
-- Name: campaigns Unified_Security_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Unified_Security_V5" ON wa.campaigns TO authenticated USING (((organization_id = identity.get_current_org_id()) AND (EXISTS ( SELECT 1
   FROM identity.rls_get_session_context() ctx(current_org_id, my_user_id, my_org_user_id, my_persona, contact_id, account_ids, vendor_ids, subordinate_user_ids, my_location_id, accessible_location_ids, role_names, permissions, has_hr_access, has_finance_access, team_ids, team_location_ids, is_saas_admin, my_org_path, my_location_path)
  WHERE (ctx.is_saas_admin OR (ctx.my_persona = 'worker'::text))))));


--
-- Name: wa_contacts Unified_Security_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Unified_Security_V5" ON wa.wa_contacts TO authenticated USING (((organization_id = identity.get_current_org_id()) AND (EXISTS ( SELECT 1
   FROM identity.rls_get_session_context() ctx(current_org_id, my_user_id, my_org_user_id, my_persona, contact_id, account_ids, vendor_ids, subordinate_user_ids, my_location_id, accessible_location_ids, role_names, permissions, has_hr_access, has_finance_access, team_ids, team_location_ids, is_saas_admin, my_org_path, my_location_path)
  WHERE (ctx.is_saas_admin OR (ctx.my_persona = 'worker'::text))))));


--
-- Name: wa_conversations Unified_Security_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Unified_Security_V5" ON wa.wa_conversations TO authenticated USING (((organization_id = identity.get_current_org_id()) AND (EXISTS ( SELECT 1
   FROM identity.rls_get_session_context() ctx(current_org_id, my_user_id, my_org_user_id, my_persona, contact_id, account_ids, vendor_ids, subordinate_user_ids, my_location_id, accessible_location_ids, role_names, permissions, has_hr_access, has_finance_access, team_ids, team_location_ids, is_saas_admin, my_org_path, my_location_path)
  WHERE (ctx.is_saas_admin OR (ctx.my_persona = 'worker'::text) OR (wa_conversations.contact_id = ctx.contact_id))))));


--
-- Name: wa_messages Unified_Security_V5; Type: POLICY; Schema: wa; Owner: -
--

CREATE POLICY "Unified_Security_V5" ON wa.wa_messages TO authenticated USING (((organization_id = identity.get_current_org_id()) AND (EXISTS ( SELECT 1
   FROM identity.rls_get_session_context() ctx(current_org_id, my_user_id, my_org_user_id, my_persona, contact_id, account_ids, vendor_ids, subordinate_user_ids, my_location_id, accessible_location_ids, role_names, permissions, has_hr_access, has_finance_access, team_ids, team_location_ids, is_saas_admin, my_org_path, my_location_path)
  WHERE (ctx.is_saas_admin OR (ctx.my_persona = 'worker'::text) OR (wa_messages.contact_id = ctx.contact_id))))));


--
-- Name: call_logs; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.call_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: campaigns; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_external_data; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.contact_external_data ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_segments; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.contact_segments ENABLE ROW LEVEL SECURITY;

--
-- Name: game_scores; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.game_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: game_sessions; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.game_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_agent_transfers; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_agent_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_automation_rules; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_automation_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_contact_external_data; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_contact_external_data ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_contact_segments; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_contact_segments ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_contacts; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_conversations; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_drip_campaigns; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_drip_campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_drip_enrollments; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_drip_enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_drip_execution_log; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_drip_execution_log ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_drip_steps; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_drip_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_manual_campaign_recipients; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_manual_campaign_recipients ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_manual_campaigns; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_manual_campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_message_retry_queue; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_message_retry_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_messages; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_quick_replies; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_quick_replies ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_routing_rules; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_routing_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_template_variable_mappings; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_template_variable_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_templates; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: wa_variable_definitions; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.wa_variable_definitions ENABLE ROW LEVEL SECURITY;

--
-- Name: x_wa_order_items; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.x_wa_order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: x_wa_orders; Type: ROW SECURITY; Schema: wa; Owner: -
--

ALTER TABLE wa.x_wa_orders ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

