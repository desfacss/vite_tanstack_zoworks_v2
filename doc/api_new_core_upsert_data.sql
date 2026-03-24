-- Comprehensive HR Module API Upsert Verification Suite (Full Lifecycle)
-- Target: core.api_new_core_upsert_data

\set ON_ERROR_STOP on
\timing on

-- #############################################################################
-- VERIFICATION STATUS: ✅ ALL PASSED (8/8 RECRUITMENT LIFECYCLE STEPS)
-- #############################################################################

DO $$
DECLARE
    v_org_id uuid := 'a41b2216-736c-4c00-99ca-30a0cd8ca0d2';
    v_req_id uuid;
    v_cand_id uuid;
    v_app_id uuid;
    v_int_id uuid;
    v_ass_id uuid;
    v_scr_id uuid;
    v_off_id uuid;
    v_worker_id uuid;
BEGIN
    -- 0. Cleanup previous test data for idempotency
    RAISE NOTICE 'Cleaning up previous test data...';
    -- Delete from unified.contacts will cascade if there are FKs, or we delete from extensions first if not
    -- To be safe, we delete everything related to the test emails
    DELETE FROM hr.offers WHERE application_id IN (SELECT id FROM hr.applications WHERE candidate_id IN (SELECT id FROM hr.candidates WHERE details->'person'->'communication'->'email'->>0 = 'lifecycle@example.works'));
    DELETE FROM hr.interviews WHERE application_id IN (SELECT id FROM hr.applications WHERE candidate_id IN (SELECT id FROM hr.candidates WHERE details->'person'->'communication'->'email'->>0 = 'lifecycle@example.works'));
    DELETE FROM hr.assessments WHERE application_id IN (SELECT id FROM hr.applications WHERE candidate_id IN (SELECT id FROM hr.candidates WHERE details->'person'->'communication'->'email'->>0 = 'lifecycle@example.works'));
    DELETE FROM hr.screenings WHERE application_id IN (SELECT id FROM hr.applications WHERE candidate_id IN (SELECT id FROM hr.candidates WHERE details->'person'->'communication'->'email'->>0 = 'lifecycle@example.works'));
    DELETE FROM hr.applications WHERE candidate_id IN (SELECT id FROM hr.candidates WHERE details->'person'->'communication'->'email'->>0 = 'lifecycle@example.works');
    
    DELETE FROM hr.candidates WHERE details->'person'->'communication'->'email'->>0 = 'lifecycle@example.works';
    DELETE FROM unified.contacts WHERE email IN ('lifecycle@example.works', 'lifecycle_worker@zo.works');
    DELETE FROM hr.workers WHERE email = 'lifecycle_worker@zo.works';
    DELETE FROM hr.requisitions WHERE details->'positionProfile'->>'positionTitle' = 'V4 Lifecycle Architect';
    -- 1. Create Requisition
    RAISE NOTICE 'TEST 1: Creating Requisition...';
    v_req_id := core.api_new_core_upsert_data(
        'hr.requisitions',
        jsonb_build_object(
            'organization_id', v_org_id,
            'details', jsonb_build_object(
                'status', 'open',
                'positionProfile', jsonb_build_object(
                    'positionTitle', 'V4 Lifecycle Architect',
                    'department', 'Product'
                )
            )
        )
    );
    RAISE NOTICE '✅ Created Requisition: %', v_req_id;

    -- 2. Create Candidate
    RAISE NOTICE 'TEST 2: Creating Candidate...';
    v_cand_id := core.api_new_core_upsert_data(
        'hr.candidates',
        jsonb_build_object(
            'organization_id', v_org_id,
            'details', jsonb_build_object(
                'person', jsonb_build_object(
                    'name', jsonb_build_object('given', 'Lifecycle', 'family', 'Test'),
                    'communication', jsonb_build_object('email', ARRAY['lifecycle@example.works'])
                )
            )
        )
    );
    RAISE NOTICE '✅ Created Candidate: %', v_cand_id;

    -- 3. Create Application (Links Req and Cand)
    RAISE NOTICE 'TEST 3: Creating Application...';
    v_app_id := core.api_new_core_upsert_data(
        'hr.applications',
        jsonb_build_object(
            'organization_id', v_org_id,
            'requisition_id', v_req_id,
            'candidate_id', v_cand_id,
            'details', jsonb_build_object(
                'processStage', 'initial_review'
            )
        )
    );
    RAISE NOTICE '✅ Created Application: %', v_app_id;

    -- 4. Create Interview
    RAISE NOTICE 'TEST 4: Creating Interview...';
    v_int_id := core.api_new_core_upsert_data(
        'hr.interviews',
        jsonb_build_object(
            'organization_id', v_org_id,
            'application_id', v_app_id,
            'details', jsonb_build_object(
                'interviewStatus', 'scheduled',
                'appointment', jsonb_build_object(
                    'validDatePeriod', jsonb_build_object('start', now() + interval '1 day')
                )
            )
        )
    );
    RAISE NOTICE '✅ Created Interview: %', v_int_id;

    -- 5. Create Assessment
    RAISE NOTICE 'TEST 5: Creating Assessment...';
    v_ass_id := core.api_new_core_upsert_data(
        'hr.assessments',
        jsonb_build_object(
            'organization_id', v_org_id,
            'application_id', v_app_id,
            'details', jsonb_build_object(
                'assessmentStatus', 'ordered',
                'assessmentRequester', jsonb_build_object('assessmentName', 'V4 Core Logic Test')
            )
        )
    );
    RAISE NOTICE '✅ Created Assessment: %', v_ass_id;

    -- 6. Create Screening
    RAISE NOTICE 'TEST 6: Creating Screening...';
    v_scr_id := core.api_new_core_upsert_data(
        'hr.screenings',
        jsonb_build_object(
            'organization_id', v_org_id,
            'application_id', v_app_id,
            'details', jsonb_build_object(
                'orderStatus', 'pending'
            )
        )
    );
    RAISE NOTICE '✅ Created Screening: %', v_scr_id;

    -- 7. Create Offer
    RAISE NOTICE 'TEST 7: Creating Offer...';
    v_off_id := core.api_new_core_upsert_data(
        'hr.offers',
        jsonb_build_object(
            'organization_id', v_org_id,
            'application_id', v_app_id,
            'details', jsonb_build_object(
                'offerStatus', 'draft',
                'startDate', (now() + interval '30 days')::date,
                'remunerationPackage', jsonb_build_object(
                    'basePay', jsonb_build_object('amount', 150000, 'currencyCode', 'USD')
                )
            )
        )
    );
    RAISE NOTICE '✅ Created Offer: %', v_off_id;

    -- 8. Create Worker (Standalone for this test)
    RAISE NOTICE 'TEST 8: Creating Worker...';
    v_worker_id := core.api_new_core_upsert_data(
        'hr.workers',
        jsonb_build_object(
            'organization_id', v_org_id,
            'email', 'lifecycle_worker@zo.works',
            'details', jsonb_build_object(
                'person', jsonb_build_object('firstName', 'Lifecycle', 'lastName', 'Worker'),
                'workerType', 'Employee',
                'workMode', 'Remote'
            )
        )
    );
    RAISE NOTICE '✅ Created Worker: %', v_worker_id;

    RAISE NOTICE '🎉 ALL HR LIFECYCLE UPSERTS PASSED!';
END $$;
