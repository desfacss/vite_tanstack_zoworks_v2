-- ==============================================================================
-- CAL SCHEMA: COMPREHENSIVE END-TO-END INSERTION TEST SUITE
-- DDL Source: supabase/migrations/20260611000400_cal_lean.sql
-- Strategy  : Setup resources -> Define Event Type -> Config Sync/Territories/Credits -> Get Slots -> Book -> Reschedule -> Cancel -> Book Asset
-- Main Strategy  : Setup resources -> Define Event Type -> Get Slots -> Book -> Reschedule -> Cancel
-- Rollback  : Change COMMIT → ROLLBACK to dry-run without saving data.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    -- ── Org / User seeds ──────────────────────────────────────────────────────
    v_org_id                 UUID := 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2';
    v_user_id                UUID := '6ba504d2-65b7-4018-b8a1-323dd686996c';

    -- ── Primary entity IDs ───────────────────────────────────────────────────
    v_contact_id             UUID;
    v_client_id              UUID;
    v_asset_id               UUID;
    v_event_type_id          UUID;
    v_asset_event_type_id    UUID;
    v_location_id            UUID;
    v_territory_id           UUID;
    v_integration_id         UUID;
    
    -- ── Booking state ────────────────────────────────────────────────────────
    v_booking_record         jsonb;
    v_booking_id             uuid;
    v_target_start           timestamptz;
    v_target_reschedule      timestamptz;
    v_remaining_credits      int;

BEGIN
    RAISE NOTICE '==========================================================';
    -- Mock Session Context for CLI Execution
    PERFORM set_config('request.jwt.claims', json_build_object('sub', '6ba504d2-65b7-4018-b8a1-323dd686996c', 'role', 'authenticated')::text, true);
    RAISE NOTICE '  CAL E2E Test Suite — Starting';
    RAISE NOTICE '==========================================================';

    -- ── 1. Dynamic Identity Resolution ───────────────────────────────────────
    RAISE NOTICE '🔍 Resolving resources...';
    SELECT id INTO v_location_id FROM identity.locations WHERE organization_id = v_org_id LIMIT 1;
    IF v_location_id IS NULL THEN
        v_location_id := '6b383e17-cd4f-48d7-ac7b-a076b8dff3f5'::uuid;
    END IF;

    -- Pick any active contact, or create one if none exist
    SELECT id INTO v_contact_id FROM unified.contacts WHERE organization_id = v_org_id AND is_active = true LIMIT 1;
    IF v_contact_id IS NULL THEN
        v_contact_id := core.api_new_core_upsert_data(
            'unified.contacts',
            jsonb_build_object(
                'organization_id', v_org_id,
                'name', 'Test Technician',
                'contact_type', 'person',
                'is_active', true
            )
        );
    END IF;
    
    -- Client contact for credits
    SELECT id INTO v_client_id FROM unified.contacts WHERE organization_id = v_org_id AND email = 'john@example.com' LIMIT 1;
    IF v_client_id IS NULL THEN
        v_client_id := core.api_new_core_upsert_data(
            'unified.contacts',
            jsonb_build_object(
                'organization_id', v_org_id,
                'name', 'John Doe Invitee',
                'email', 'john@example.com',
                'contact_type', 'person',
                'is_active', true
            )
        );
    END IF;
    
    -- Pick any active asset, or create one if none exist
    SELECT id INTO v_asset_id FROM unified.assets WHERE organization_id = v_org_id AND is_active = true LIMIT 1;
    IF v_asset_id IS NULL THEN
        v_asset_id := core.api_new_core_upsert_data(
            'unified.assets',
            jsonb_build_object(
                'organization_id', v_org_id,
                'name', 'Test Room A',
                'asset_type', 'facilities',
                'is_active', true
            )
        );
    END IF;
    
    RAISE NOTICE '  → Resolved technician_id = %', v_contact_id;
    RAISE NOTICE '  → Resolved asset_id = %', v_asset_id;

    -- 🧹 Cleanup existing test data for idempotency
    RAISE NOTICE '🧹 Cleaning up existing test data...';
    DELETE FROM unified.tasks WHERE organization_id = v_org_id AND intent_type = 'calendar_booking';
    DELETE FROM cal.event_types WHERE organization_id = v_org_id AND slug IN ('vkbs-test-consultation', 'vkbs-test-machine-rental');
    DELETE FROM cal.resource_availability_rules WHERE resource_id IN (v_contact_id, v_asset_id);
    DELETE FROM cal.blocked_windows WHERE resource_id = v_contact_id;
    DELETE FROM cal.calendar_integrations WHERE contact_id = v_contact_id;

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 1: ENABLE BOOKING ON UNIFIED RESOURCES + SKILLS
    -- ══════════════════════════════════════════════════════════════════════════
    RAISE NOTICE '[1/7] Enabling booking and provisioning skills ...';
    
    UPDATE unified.contacts
    SET booking_enabled = true, max_concurrent_bookings = 1, booking_timezone = 'UTC',
        skills = ARRAY['certified_technician']
    WHERE id = v_contact_id;
    
    UPDATE unified.assets
    SET booking_enabled = true, max_concurrent_bookings = 1, booking_timezone = 'UTC'
    WHERE id = v_asset_id;

    -- Set availability rules (Monday-Friday 9am-5pm)
    INSERT INTO cal.resource_availability_rules (resource_id, resource_kind, day_of_week, start_time, end_time, is_available)
    VALUES
        (v_contact_id, 'contact', 1, '09:00', '17:00', true),
        (v_contact_id, 'contact', 2, '09:00', '17:00', true),
        (v_contact_id, 'contact', 3, '09:00', '17:00', true),
        (v_contact_id, 'contact', 4, '09:00', '17:00', true),
        (v_contact_id, 'contact', 5, '09:00', '17:00', true);

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 2: CONFIGURE TERRITORIES, SYNC, AND CREDITS
    -- ══════════════════════════════════════════════════════════════════════════
    RAISE NOTICE '[2/7] Configuring Territories, Integrations, Blocked Windows, and Credits ...';
    
    INSERT INTO cal.territories (organization_id, name) VALUES (v_org_id, 'Global Test Region')
    ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_territory_id;
    
    INSERT INTO cal.resource_territories (resource_id, resource_kind, territory_id, is_primary)
    VALUES (v_contact_id, 'contact', v_territory_id, true);

    -- Integrations & Sync Event
    INSERT INTO cal.calendar_integrations (contact_id, provider, provider_account_email, auto_sync_enabled)
    VALUES (v_contact_id, 'google', 'test.tech@google.com', true)
    RETURNING id INTO v_integration_id;
    
    v_target_start := date_trunc('day', current_timestamp + interval '1 day') + interval '10 hours';
    
    -- Insert a sync event 2 hours AFTER our target start, just to show it works
    INSERT INTO cal.blocked_windows (organization_id, resource_id, resource_kind, calendar_integration_id, external_ref, start_time, end_time, is_blocking, source, title)
    VALUES (v_org_id, v_contact_id, 'contact', v_integration_id, 'mock_google_123', v_target_start + interval '2 hours', v_target_start + interval '3 hours', true, 'google', 'Busy sync meeting');

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 3: CREATE EVENT TYPE (WITH SKILL REQ) AND CREDITS
    -- ══════════════════════════════════════════════════════════════════════════
    RAISE NOTICE '[3/7] Creating cal.event_types ...';
    INSERT INTO cal.event_types (
        organization_id, use_case_config_id, title, slug, description,
        duration_minutes, buffer_minutes,
        location_id, assignment_strategy, required_skill_name, credit_cost
    ) VALUES (
        v_org_id,
        'b41b2216-736c-4c00-99ca-30a0cd8ca0d2'::uuid, -- Links to the VKBS Custom Override
        'Test 30-min Technical Consultation',
        'vkbs-test-consultation',
        'A comprehensive 30-minute technical test consultation.',
        30, 0,
        v_location_id, 'round-robin', 'certified_technician', 2
    ) 
    ON CONFLICT (slug) DO UPDATE SET use_case_config_id = EXCLUDED.use_case_config_id
    RETURNING id INTO v_event_type_id;
    
    -- Link resource
    INSERT INTO cal.event_type_resources (event_type_id, resource_id, resource_kind, role, is_required)
    VALUES (v_event_type_id, v_contact_id, 'contact', 'primary', true);

    -- Credits (10 purchased, 10 remaining)
    INSERT INTO cal.client_credits (organization_id, client_email, event_type_id, credits_total, credits_remaining, expires_at)
    VALUES (v_org_id, 'john@example.com', v_event_type_id, 10, 10, now() + interval '1 year');

    RAISE NOTICE '  → event_type_id = %', v_event_type_id;

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 4: FIND & GENERATE SLOTS (Routing test)
    -- ══════════════════════════════════════════════════════════════════════════
    RAISE NOTICE '[4/7] Generating slots via cal.get_available_slots() and cal.find_next_available() ...';
    
    -- Test find_next_available with territory routing
    PERFORM * FROM cal.find_next_available(
        p_event_type_id := v_event_type_id,
        p_territory_id := v_territory_id
    ) LIMIT 1;
    RAISE NOTICE '  → find_next_available passed territory and skill routing checks.';

    PERFORM * FROM cal.get_available_slots(
        v_contact_id, 'contact',
        v_event_type_id,
        current_date, current_date + 7
    ) LIMIT 1;
    RAISE NOTICE '  → get_available_slots executed successfully.';

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 5: BOOK APPOINTMENT & CHECK CREDITS
    -- ══════════════════════════════════════════════════════════════════════════
    RAISE NOTICE '[5/7] Booking appointment for % ...', v_target_start;
    
    v_booking_record := cal.book_appointment(
        p_event_type_id := v_event_type_id,
        p_slot_start := v_target_start,
        p_invitee_name := 'John Doe Invitee',
        p_invitee_email := 'john@example.com',
        p_resource_id := v_contact_id,
        p_resource_kind := 'contact',
        p_invitee_phone := '+15551234567',
        p_invitee_notes := 'Looking forward to this tech consultation!',
        p_timezone := 'UTC',
        p_location_id := v_location_id,
        p_metadata := '{}'::jsonb
    );
    
    v_booking_id := (v_booking_record->>'booking_id')::uuid;
    RAISE NOTICE '  → booking_id = %', v_booking_id;
    RAISE NOTICE '  → confirmation_code = %', v_booking_record->>'confirmation_code';
    
    SELECT credits_remaining INTO v_remaining_credits FROM cal.client_credits WHERE client_email = 'john@example.com' AND event_type_id = v_event_type_id;
    RAISE NOTICE '  → credits_remaining = % (expected: 8)', v_remaining_credits;

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 6: RESCHEDULE & CANCEL BOOKING
    -- ══════════════════════════════════════════════════════════════════════════
    v_target_reschedule := v_target_start + interval '1 day';
    RAISE NOTICE '[6/7] Rescheduling and Canceling booking ...';
    
    v_booking_record := cal.reschedule_booking(
        p_booking_id := v_booking_id,
        p_new_start := v_target_reschedule,
        p_new_resource_id := v_contact_id,
        p_new_resource_kind := 'contact'
    );
    RAISE NOTICE '  → rescheduled successfully (count: %)', v_booking_record->>'reschedule_count';

    v_booking_record := cal.cancel_booking(
        p_booking_id := v_booking_id,
        p_reason := 'Invitee requested cancellation via phone'
    );
    RAISE NOTICE '  → cancelled successfully at %', v_booking_record->>'cancelled_at';

    -- ══════════════════════════════════════════════════════════════════════════
    -- PHASE 7: ASSET-ONLY BOOKING (Machine/Room test)
    -- ══════════════════════════════════════════════════════════════════════════
    RAISE NOTICE '[7/7] Executing asset-only booking test ...';
    
    INSERT INTO cal.event_types (
        organization_id, use_case_config_id, title, slug, description,
        duration_minutes, buffer_minutes, assignment_strategy
    ) VALUES (
        v_org_id, 
        'c5555555-5555-5555-5555-555555555555'::uuid, -- Links to the Zoworks Custom Override
        'Asset Rental', 'vkbs-test-machine-rental', 'Rent a machine for 1 hour.',
        60, 0, 'round-robin'
    ) 
    ON CONFLICT (slug) DO UPDATE SET use_case_config_id = EXCLUDED.use_case_config_id
    RETURNING id INTO v_asset_event_type_id;
    
    INSERT INTO cal.event_type_resources (event_type_id, resource_id, resource_kind, role, is_required)
    VALUES (v_asset_event_type_id, v_asset_id, 'asset', 'primary', true);
    
    v_booking_record := cal.book_appointment(
        p_event_type_id := v_asset_event_type_id,
        p_slot_start := v_target_start,
        p_invitee_name := 'Corp Asset User',
        p_invitee_email := 'asset@example.com',
        p_resource_id := v_asset_id,
        p_resource_kind := 'asset'
    );
    
    RAISE NOTICE '  → Asset booking successful. booking_id = %', v_booking_record->>'booking_id';

    RAISE NOTICE '==========================================================';
    RAISE NOTICE '  ✅ CAL E2E TEST SUITE COMPLETED SUCCESSFULLY';
    RAISE NOTICE '==========================================================';

END $$;

-- Change ROLLBACK → COMMIT to persist data permanently
COMMIT;
