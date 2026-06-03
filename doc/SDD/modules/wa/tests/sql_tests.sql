-- WA Module Test Suite
-- Run against a seeded development database.
-- Requires: org provisioned via wa_provision_tenant, at least one active drip campaign.
-- Replace UUIDs marked <<ORG_ID>>, <<CONTACT_ID>>, <<CAMPAIGN_ID>> with real values.

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 1: SCHEMA VALIDATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- T1.1: All required WA tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'wa'
ORDER BY table_name;
-- Expected: call_logs, campaigns, contact_external_data, contact_segments,
--   game_scores, game_sessions, wa_agent_transfers, wa_automation_rules,
--   wa_contact_external_data, wa_contact_segments, wa_contacts, wa_conversations,
--   wa_drip_campaigns, wa_drip_enrollments, wa_drip_execution_log, wa_drip_steps,
--   wa_manual_campaigns, wa_messages, wa_quick_replies, wa_templates,
--   wa_template_variable_mappings, wa_variable_definitions,
--   x_wa_order_items, x_wa_orders
-- NOT expected: wa_orders, wa_order_items (renamed to x_ prefix)

-- T1.2: wa_contacts has resolution_status column (added in 004417)
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'wa' AND table_name = 'wa_contacts'
  AND column_name IN ('resolution_status', 'linked_entity_id', 'linked_entity_type', 'identity_type');
-- Expected: 4 rows. resolution_status NOT NULL DEFAULT 'pending', others nullable

-- T1.3: wa_automation_rules has JSONB columns (added in 004418/004420)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'wa' AND table_name = 'wa_automation_rules'
  AND column_name IN ('trigger_config', 'response_config');
-- Expected: 2 rows, both jsonb, default '{}'

-- T1.4: wa_messages trigger pipeline exists with correct names
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'wa' AND event_object_table = 'wa_messages'
ORDER BY trigger_name;
-- Expected: trg_wa_msg_10_standardize (BEFORE INSERT),
--           trg_wa_msg_20_update_conversation (BEFORE INSERT),
--           trg_wa_msg_30_validate (BEFORE INSERT)

-- T1.5: wa_contacts triggers exist
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'wa' AND event_object_table = 'wa_contacts'
ORDER BY trigger_name;
-- Expected: trg_wa_contacts_auto_link (BEFORE INSERT),
--           wa_drip_on_new_contact (AFTER INSERT),
--           wa_drip_on_tag_added (AFTER UPDATE)

-- T1.6: wa_automation_rules old trigger_config = '{}' rows have been backfilled
SELECT COUNT(*) AS empty_trigger_config
FROM wa.wa_automation_rules
WHERE trigger_config = '{}'::jsonb AND trigger_type = 'keyword' AND keywords IS NOT NULL;
-- Expected: 0 (backfill migration ran)

-- T1.7: phoneNumberId index exists on identity.organizations
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'organizations' AND schemaname = 'identity'
  AND indexname = 'idx_identity_orgs_wa_phone_number_id';
-- Expected: 1 row

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 2: TENANT PROVISIONING
-- ═══════════════════════════════════════════════════════════════════════════════

-- T2.1: Provision a test org (replace with real org_id if org already exists)
-- SELECT wa.wa_provision_tenant(
--   '<<ORG_ID>>'::uuid,
--   'TEST_PHONE_NUMBER_ID_001',
--   'TEST_WABA_ID_001',
--   'TEST_ACCESS_TOKEN',
--   'Test Org WA'
-- );
-- Expected: {"status":"provisioned","seeded_rules":3,...}

-- T2.2: Org lookup works after provisioning
SELECT id, app_settings->'channels'->'whatsapp'->'configuration'->>'phoneNumberId' AS phone_number_id
FROM identity.organizations
WHERE app_settings->'channels'->'whatsapp'->'configuration'->>'phoneNumberId' = 'TEST_PHONE_NUMBER_ID_001';
-- Expected: 1 row with the org_id

-- T2.3: Three seed automation rules created
SELECT name, trigger_type, priority, trigger_config->>'keywords' AS keywords, is_active
FROM wa.wa_automation_rules
WHERE organization_id = '<<ORG_ID>>'
ORDER BY priority;
-- Expected: STOP (priority 1), START (priority 2), HELP (priority 10)

-- T2.4: Duplicate phoneNumberId rejected
-- SELECT wa.wa_provision_tenant(
--   '<<DIFFERENT_ORG_ID>>'::uuid,
--   'TEST_PHONE_NUMBER_ID_001',  -- same as above
--   'TEST_WABA_ID_002',
--   'TEST_TOKEN_2'
-- );
-- Expected: ERROR: phoneNumberId TEST_PHONE_NUMBER_ID_001 is already registered to a different organization

-- T2.5: wa_get_organization_by_phone_number_id returns correct org
SELECT id FROM wa.wa_get_organization_by_phone_number_id('TEST_PHONE_NUMBER_ID_001');
-- Expected: <<ORG_ID>>

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 3: CONTACT CREATION & IDENTITY RESOLUTION
-- ═══════════════════════════════════════════════════════════════════════════════

-- T3.1: Create contact — new phone number
SELECT wa.wa_create_contact('<<ORG_ID>>'::uuid, '917000000001', 'Test User One');
-- Expected: UUID string

-- T3.2: Create contact — same phone again is idempotent (returns same UUID)
SELECT wa.wa_create_contact('<<ORG_ID>>'::uuid, '917000000001', 'Test User One Again');
-- Expected: Same UUID as T3.1

-- T3.3: Auto-link trigger fires on INSERT — check resolution_status
SELECT wa_id, resolution_status, identity_type, linked_entity_id
FROM wa.wa_contacts
WHERE wa_id = '917000000001' AND organization_id = '<<ORG_ID>>';
-- Expected: resolution_status IN ('resolved','unresolvable','pending'), identity_type set

-- T3.4: wa_resolve_identity classifies known employee
-- (requires a known employee's mobile in identity.users)
SELECT * FROM wa.wa_resolve_identity('<<EMPLOYEE_MOBILE>>', '<<ORG_ID>>'::uuid);
-- Expected: identity_type = 'employee' or 'field_worker', entity_type = 'identity.users'

-- T3.5: wa_resolve_identity returns unknown for random number
SELECT * FROM wa.wa_resolve_identity('919999999999', '<<ORG_ID>>'::uuid);
-- Expected: identity_type = 'unknown', entity_id = NULL

-- T3.6: Tag update triggers drip enrollment check
UPDATE wa.wa_contacts SET tags = array_append(tags, 'vip')
WHERE wa_id = '917000000001' AND organization_id = '<<ORG_ID>>';
-- Expected: wa_drip_on_tag_added trigger fires; if any campaign has trigger_config->>'tag_name' = 'vip', enrollment created

-- T3.7: Promote unknown contact to CRM lead
DO $$
DECLARE v_contact_id UUID;
        v_unified_id UUID;
BEGIN
  SELECT id INTO v_contact_id FROM wa.wa_contacts
  WHERE wa_id = '917000000001' AND organization_id = '<<ORG_ID>>';

  SELECT wa.wa_promote_to_lead(v_contact_id) INTO v_unified_id;
  RAISE NOTICE 'Promoted to unified.contacts: %', v_unified_id;
END $$;
-- Expected: NOTICE with a UUID. wa_contacts.linked_entity_id set. crm.contacts row created.

-- T3.8: Promote internal user → rejected
-- (requires a wa_contact linked to identity.users)
-- SELECT wa.wa_promote_to_lead('<<EMPLOYEE_WA_CONTACT_ID>>'::uuid);
-- Expected: ERROR: Internal users (identity.users) cannot be promoted to CRM leads

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 4: MESSAGE LOGGING & TRIGGER PIPELINE
-- ═══════════════════════════════════════════════════════════════════════════════

-- T4.1: Log inbound text message — happy path
DO $$
DECLARE v_contact_id UUID;
BEGIN
  SELECT id INTO v_contact_id FROM wa.wa_contacts
  WHERE wa_id = '917000000001' AND organization_id = '<<ORG_ID>>';

  PERFORM wa.wa_log_message(
    '<<ORG_ID>>'::uuid,
    v_contact_id,
    'wamid.TEST001',
    'inbound',
    'text',
    '{"from":"917000000001","id":"wamid.TEST001","timestamp":"1779684478","text":{"body":"Hello test"},"type":"text"}'::jsonb,
    'received',
    NOW(),
    'whatsapp'
  );
END $$;
-- Expected: No error. wa_messages row inserted with details->>'body' = 'Hello test'

-- T4.2: Verify standardized details populated
SELECT type, details->>'body' AS body, content->'text'->>'body' AS raw_body
FROM wa.wa_messages
WHERE whatsapp_message_id = 'wamid.TEST001';
-- Expected: body = 'Hello test', raw_body = 'Hello test'

-- T4.3: Verify conversation auto-created
SELECT c.status, c.last_message_at, c.summary
FROM wa.wa_conversations c
JOIN wa.wa_contacts wc ON wc.id = c.contact_id
WHERE wc.wa_id = '917000000001' AND c.organization_id = '<<ORG_ID>>'
ORDER BY c.created_at DESC LIMIT 1;
-- Expected: status = 'open', summary = 'Hello test', last_message_at set

-- T4.4: Text message without body → rejected by validate trigger
DO $$
DECLARE v_contact_id UUID;
BEGIN
  SELECT id INTO v_contact_id FROM wa.wa_contacts
  WHERE wa_id = '917000000001' AND organization_id = '<<ORG_ID>>';

  PERFORM wa.wa_log_message(
    '<<ORG_ID>>'::uuid, v_contact_id, 'wamid.BADTEST001', 'inbound', 'text',
    '{"type":"text","text":{}}'::jsonb,  -- no body
    'received', NOW(), 'whatsapp'
  );
END $$;
-- Expected: ERROR P0001: Text messages must have a body in details

-- T4.5: WRONG — passing content as string (not JSONB object) — should fail
-- This documents the known bug: always pass jsonb object, never JSON.stringify output
DO $$
DECLARE v_contact_id UUID;
BEGIN
  SELECT id INTO v_contact_id FROM wa.wa_contacts
  WHERE wa_id = '917000000001' AND organization_id = '<<ORG_ID>>';

  PERFORM wa.wa_log_message(
    '<<ORG_ID>>'::uuid, v_contact_id, 'wamid.BADTEST002', 'inbound', 'text',
    to_jsonb('{"type":"text","text":{"body":"Hi"}}'::text),  -- JSONB text node, not object
    'received', NOW(), 'whatsapp'
  );
END $$;
-- Expected: ERROR P0001: Text messages must have a body in details
-- (content->'text' returns NULL on a JSONB text node)

-- T4.6: Log media message — happy path
DO $$
DECLARE v_contact_id UUID;
BEGIN
  SELECT id INTO v_contact_id FROM wa.wa_contacts
  WHERE wa_id = '917000000001' AND organization_id = '<<ORG_ID>>';

  PERFORM wa.wa_log_message(
    '<<ORG_ID>>'::uuid, v_contact_id, 'wamid.TEST002', 'inbound', 'image',
    '{"type":"image","image":{"id":"IMG123","caption":"Look at this"}}'::jsonb,
    'received', NOW(), 'whatsapp'
  );
END $$;
-- Expected: details->>'media_url' = 'IMG123', details->>'body' = 'Look at this'

-- T4.7: Update message status
SELECT wa.wa_update_message_status('<<ORG_ID>>'::uuid, 'wamid.TEST001', 'delivered');
-- Expected: wa_messages.status = 'delivered' for wamid.TEST001

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 5: AUTOMATION RULES
-- ═══════════════════════════════════════════════════════════════════════════════

-- T5.1: STOP rule has correct trigger_config
SELECT name, priority, trigger_config
FROM wa.wa_automation_rules
WHERE organization_id = '<<ORG_ID>>' AND name = 'Opt-Out (STOP)';
-- Expected: trigger_config = {"keywords": ["STOP","stop","unsubscribe","opt out","optout"]}

-- T5.2: No rules have NULL trigger_config after migration 004420
SELECT COUNT(*) AS null_trigger_config_count
FROM wa.wa_automation_rules
WHERE trigger_config IS NULL;
-- Expected: 0

-- T5.3: Keyword rules with legacy keywords[] have been backfilled to trigger_config
SELECT name, keywords, trigger_config->'keywords' AS tc_keywords
FROM wa.wa_automation_rules
WHERE keywords IS NOT NULL
  AND trigger_type = 'keyword'
LIMIT 10;
-- Expected: tc_keywords matches keywords array for all rows

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 6: DRIP CAMPAIGNS
-- ═══════════════════════════════════════════════════════════════════════════════

-- T6.1: Manual enrollment
SELECT wa.wa_drip_enroll_contact(
  '<<CAMPAIGN_ID>>'::uuid,
  '<<CONTACT_ID>>'::uuid,
  '{}'::jsonb
);
-- Expected: UUID (enrollment_id)

-- T6.2: Enrollment row created with correct initial state
SELECT status, current_step_id, next_execution_at, channel
FROM wa.wa_drip_enrollments
WHERE campaign_id = '<<CAMPAIGN_ID>>' AND contact_id = '<<CONTACT_ID>>'
ORDER BY created_at DESC LIMIT 1;
-- Expected: status='active', current_step_id = first step of campaign, next_execution_at <= NOW()

-- T6.3: Due enrollments query returns the enrollment
SELECT enrollment_id, step_type, contact_wa_id
FROM wa.wa_drip_get_due_enrollments(10);
-- Expected: includes the enrollment from T6.1

-- T6.4: Execute step advances enrollment
DO $$
DECLARE v_enrollment_id UUID;
        v_result TEXT;
BEGIN
  SELECT id INTO v_enrollment_id
  FROM wa.wa_drip_enrollments
  WHERE campaign_id = '<<CAMPAIGN_ID>>' AND contact_id = '<<CONTACT_ID>>'
  ORDER BY created_at DESC LIMIT 1;

  SELECT wa.wa_drip_execute_step(v_enrollment_id) INTO v_result;
  RAISE NOTICE 'Step result: %', v_result;
END $$;
-- Expected: result in ('advanced', 'completed', 'wait_for_trigger', 'delayed')

-- T6.5: Execution logged
SELECT action, result
FROM wa.wa_drip_execution_log
WHERE enrollment_id = (
  SELECT id FROM wa.wa_drip_enrollments
  WHERE campaign_id = '<<CAMPAIGN_ID>>' AND contact_id = '<<CONTACT_ID>>'
  ORDER BY created_at DESC LIMIT 1
)
ORDER BY executed_at DESC LIMIT 5;
-- Expected: rows with action = 'executed' or 'enrolled'

-- T6.6: Pause enrollment
DO $$
DECLARE v_enrollment_id UUID;
BEGIN
  SELECT id INTO v_enrollment_id
  FROM wa.wa_drip_enrollments
  WHERE campaign_id = '<<CAMPAIGN_ID>>' AND contact_id = '<<CONTACT_ID>>'
    AND status = 'active'
  ORDER BY created_at DESC LIMIT 1;
  PERFORM wa.wa_drip_pause_enrollment(v_enrollment_id);
END $$;
SELECT status FROM wa.wa_drip_enrollments
WHERE campaign_id = '<<CAMPAIGN_ID>>' AND contact_id = '<<CONTACT_ID>>'
ORDER BY created_at DESC LIMIT 1;
-- Expected: status = 'paused'

-- T6.7: Paused enrollment NOT returned by due enrollments
SELECT COUNT(*) FROM wa.wa_drip_get_due_enrollments(100)
WHERE contact_wa_id = (SELECT wa_id FROM wa.wa_contacts WHERE id = '<<CONTACT_ID>>');
-- Expected: 0

-- T6.8: Resume enrollment — next_execution_at reset to NOW()
DO $$
DECLARE v_enrollment_id UUID;
BEGIN
  SELECT id INTO v_enrollment_id
  FROM wa.wa_drip_enrollments
  WHERE campaign_id = '<<CAMPAIGN_ID>>' AND contact_id = '<<CONTACT_ID>>'
    AND status = 'paused'
  ORDER BY created_at DESC LIMIT 1;
  PERFORM wa.wa_drip_resume_enrollment(v_enrollment_id);
END $$;
SELECT status, next_execution_at FROM wa.wa_drip_enrollments
WHERE campaign_id = '<<CAMPAIGN_ID>>' AND contact_id = '<<CONTACT_ID>>'
ORDER BY created_at DESC LIMIT 1;
-- Expected: status = 'active', next_execution_at ≤ NOW()

-- T6.9: Re-enroll cancels existing active enrollment first
SELECT wa.wa_drip_enroll_contact('<<CAMPAIGN_ID>>'::uuid, '<<CONTACT_ID>>'::uuid, '{}'::jsonb);
SELECT status, COUNT(*) FROM wa.wa_drip_enrollments
WHERE campaign_id = '<<CAMPAIGN_ID>>' AND contact_id = '<<CONTACT_ID>>'
GROUP BY status;
-- Expected: exactly 1 'active' row, previous active rows are 'cancelled'

-- T6.10: Campaign stats
SELECT * FROM wa.wa_drip_campaign_stats('<<CAMPAIGN_ID>>'::uuid);
-- Expected: total_enrolled > 0, various counts

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 7: CONVERSATION MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════════

-- T7.1: Get or create conversation — idempotent
SELECT wa.wa_get_or_create_conversation('<<ORG_ID>>'::uuid, '<<CONTACT_ID>>'::uuid);
SELECT wa.wa_get_or_create_conversation('<<ORG_ID>>'::uuid, '<<CONTACT_ID>>'::uuid);
-- Expected: both return the same UUID

-- T7.2: Assign agent to conversation
DO $$
DECLARE v_conv_id UUID;
BEGIN
  SELECT id INTO v_conv_id FROM wa.wa_conversations
  WHERE contact_id = '<<CONTACT_ID>>' AND organization_id = '<<ORG_ID>>'
  ORDER BY created_at DESC LIMIT 1;

  PERFORM wa.wa_assign_agent(v_conv_id, '<<AGENT_USER_ID>>'::uuid);
END $$;
SELECT assignee_id FROM wa.wa_conversations
WHERE contact_id = '<<CONTACT_ID>>' AND organization_id = '<<ORG_ID>>'
ORDER BY created_at DESC LIMIT 1;
-- Expected: assignee_id = <<AGENT_USER_ID>>

-- T7.3: Close conversation
DO $$
DECLARE v_conv_id UUID;
BEGIN
  SELECT id INTO v_conv_id FROM wa.wa_conversations
  WHERE contact_id = '<<CONTACT_ID>>' AND organization_id = '<<ORG_ID>>'
  ORDER BY created_at DESC LIMIT 1;
  PERFORM wa.wa_close_conversation(v_conv_id);
END $$;
SELECT status, assignee_id FROM wa.wa_conversations
WHERE contact_id = '<<CONTACT_ID>>' AND organization_id = '<<ORG_ID>>'
ORDER BY created_at DESC LIMIT 1;
-- Expected: status = 'closed', assignee_id = NULL

-- T7.4: New inbound message on closed conversation → reopens it
DO $$
DECLARE v_contact_id UUID := '<<CONTACT_ID>>';
BEGIN
  PERFORM wa.wa_log_message(
    '<<ORG_ID>>'::uuid, v_contact_id, 'wamid.REOPEN001', 'inbound', 'text',
    '{"type":"text","text":{"body":"I am back"}}'::jsonb,
    'received', NOW(), 'whatsapp'
  );
END $$;
SELECT status FROM wa.wa_conversations
WHERE contact_id = '<<CONTACT_ID>>' AND organization_id = '<<ORG_ID>>'
ORDER BY updated_at DESC LIMIT 1;
-- Expected: status = 'open' (trigger reopens closed/snoozed on inbound)

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 8: VARIABLE RESOLUTION
-- ═══════════════════════════════════════════════════════════════════════════════

-- T8.1: Resolve contact.name variable
SELECT wa.wa_fetch_variable_value(
  '{"source": "contact", "field": "name"}'::jsonb,
  '<<CONTACT_ID>>'::uuid,
  '<<ORG_ID>>'::uuid
);
-- Expected: contact's name string

-- T8.2: Resolve template with variables
SELECT wa.wa_resolve_variables(
  '{"type":"template","name":"hello_world","language":{"code":"en_US"},"components":[{"type":"body","parameters":[{"type":"text","text":"{{contact.name}}"}]}]}'::jsonb,
  '<<CONTACT_ID>>'::uuid
);
-- Expected: components with {{contact.name}} replaced by actual contact name

-- T8.3: Context value lookup
SELECT wa.wa_get_context_value('{"user":{"name":"Alice"}}'::jsonb, 'user.name');
-- Expected: 'Alice'

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 9: RLS ENFORCEMENT
-- ═══════════════════════════════════════════════════════════════════════════════

-- T9.1: Direct table queries without org context return 0 rows
-- (Run as authenticated user without org JWT claim set)
-- SET LOCAL request.jwt.claims = '{"sub":"<<AUTH_UUID>>","role":"authenticated"}';
-- SELECT COUNT(*) FROM wa.wa_contacts;
-- Expected: 0 (RLS blocks cross-org access)

-- T9.2: Correct org context returns org's contacts
-- SET LOCAL request.jwt.claims = '{"sub":"<<AUTH_UUID>>","org_id":"<<ORG_ID>>","role":"authenticated"}';
-- SELECT COUNT(*) FROM wa.wa_contacts WHERE organization_id = '<<ORG_ID>>';
-- Expected: rows for that org only
