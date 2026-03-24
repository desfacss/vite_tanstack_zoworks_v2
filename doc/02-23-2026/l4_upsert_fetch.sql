-- SYSTEM / HIDDEN FIELDS IN UI
--     "location_id": "cf974129-c4cf-4cca-aa36-62ba353c0708",
--     "organization_id": "a41b2216-736c-4c00-99ca-30a0cd8ca0d2",
--     "created_by": "ebd74adb-ad53-4342-ae75-de17196d99b0",
--     "updated_by": "ebd74adb-ad53-4342-ae75-de17196d99b0",




-- 1 - BOOTSTRAP ENTITIES FROM CORE.ENTITY_BLUEPRINTS
SELECT core.comp_util_ops_bootstrap_entity('crm', 'leads', NULL, true); 
SELECT core.util_auto_suggest_views('crm', 'leads', false);



-- 2 - FORM GENERATION
-- Step A: Minimal Form (Required fields only)
SELECT jsonb_pretty(core.api_new_generate_form_schema('crm.contacts', '{"mode": "minimal"}'::jsonb));

-- Step B: Full Form (All fields + Extensions)
SELECT jsonb_pretty(core.api_new_generate_form_schema('crm.contacts', '{}'::jsonb));




{
    "db_schema": {
        "table": "crm.leads"
    },
    "ui_schema": {
        "name": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Name"
        },
        "status": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Status"
        },
        "details": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Details"
        },
        "ui:order": [
            "contact_type",
            "details",
            "name",
            "status"
        ],
        "contact_type": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Contact Type"
        }
    },
    "data_schema": {
        "type": "object",
        "title": "Leads",
        "required": [
            "contact_type",
            "name",
            "status"
        ],
        "properties": {
            "name": {
                "type": "string",
                "title": "Name"
            },
            "status": {
                "type": "string",
                "title": "Status"
            },
            "details": {
                "type": "string",
                "title": "Details"
            },
            "contact_type": {
                "type": "string",
                "title": "Contact Type"
            }
        }
    }
}





{
    "db_schema": {
        "table": "crm.leads"
    },
    "ui_schema": {
        "name": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Name"
        },
        "raci": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Raci"
        },
        "tags": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Tags"
        },
        "email": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Email"
        },
        "phone": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Phone"
        },
        "score": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Score"
        },
        "custom": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Custom"
        },
        "skills": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Skills"
        },
        "status": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Status"
        },
        "company": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Company"
        },
        "details": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Details"
        },
        "industry": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Industry"
        },
        "priority": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Priority"
        },
        "stage_id": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Stage Id"
        },
        "ui:order": [
            "account_id",
            "account_display",
            "available_from",
            "available_until",
            "billing_rate_daily",
            "billing_rate_hourly",
            "certifications",
            "communication_preferences",
            "company",
            "contact_type",
            "custom",
            "deleted_at",
            "details",
            "email",
            "entity_instance_id",
            "entity_instance_display",
            "first_name",
            "id_display",
            "industry",
            "intent_category",
            "is_partner_delegate",
            "is_primary",
            "is_trackable",
            "last_contacted_at",
            "last_engaged_at",
            "last_name",
            "lead_source",
            "lifecycle_stage",
            "linkedin_url",
            "location_id",
            "location_display",
            "name",
            "organization_display",
            "persona_type",
            "phone",
            "preferred_work_hours",
            "priority",
            "raci",
            "score",
            "skills",
            "source_customer_id",
            "source_lead_id",
            "stage_id",
            "state_category",
            "status",
            "tags",
            "unavailable_periods",
            "vertical",
            "vertical_payload"
        ],
        "vertical": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Vertical"
        },
        "last_name": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Last Name"
        },
        "account_id": {
            "ui:widget": "SelectCustomWidget",
            "ui:options": {
                "colSpan": 12,
                "reference_api": "/api/v4/logical/fetch/crm.accounts",
                "reference_id_field": "id",
                "reference_search_field": "id",
                "reference_display_field": "id"
            },
            "ui:placeholder": "Select Account Id"
        },
        "deleted_at": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Deleted At"
        },
        "first_name": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter First Name"
        },
        "id_display": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Id Display"
        },
        "is_primary": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Is Primary"
        },
        "lead_source": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Lead Source"
        },
        "location_id": {
            "ui:widget": "SelectCustomWidget",
            "ui:options": {
                "colSpan": 12,
                "reference_api": "/api/v4/logical/fetch/identity.locations",
                "reference_id_field": "id",
                "reference_search_field": "name",
                "reference_display_field": "name"
            },
            "ui:placeholder": "Select Location Id"
        },
        "contact_type": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Contact Type"
        },
        "is_trackable": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Is Trackable"
        },
        "linkedin_url": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Linkedin Url"
        },
        "persona_type": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Persona Type"
        },
        "available_from": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Available From"
        },
        "certifications": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Certifications"
        },
        "source_lead_id": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Source Lead Id"
        },
        "state_category": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter State Category"
        },
        "account_display": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Account Display"
        },
        "available_until": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Available Until"
        },
        "intent_category": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Intent Category"
        },
        "last_engaged_at": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Last Engaged At"
        },
        "lifecycle_stage": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Lifecycle Stage"
        },
        "location_display": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Location Display"
        },
        "vertical_payload": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Vertical Payload"
        },
        "last_contacted_at": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Last Contacted At"
        },
        "billing_rate_daily": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Billing Rate Daily"
        },
        "entity_instance_id": {
            "ui:widget": "SelectCustomWidget",
            "ui:options": {
                "colSpan": 12,
                "reference_api": "/api/v4/logical/fetch/crm.entity_instances",
                "reference_id_field": "id",
                "reference_search_field": "id",
                "reference_display_field": "id"
            },
            "ui:placeholder": "Select Entity Instance Id"
        },
        "source_customer_id": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Source Customer Id"
        },
        "billing_rate_hourly": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Billing Rate Hourly"
        },
        "is_partner_delegate": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Is Partner Delegate"
        },
        "unavailable_periods": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Unavailable Periods"
        },
        "organization_display": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Organization Display"
        },
        "preferred_work_hours": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Preferred Work Hours"
        },
        "entity_instance_display": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Entity Instance Display"
        },
        "communication_preferences": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Communication Preferences"
        }
    },
    "data_schema": {
        "type": "object",
        "title": "Leads",
        "required": [
            "contact_type",
            "name",
            "status"
        ],
        "properties": {
            "name": {
                "type": "string",
                "title": "Name"
            },
            "raci": {
                "type": "string",
                "title": "Raci"
            },
            "tags": {
                "type": "string",
                "title": "Tags"
            },
            "email": {
                "type": "string",
                "title": "Email"
            },
            "phone": {
                "type": "string",
                "title": "Phone"
            },
            "score": {
                "type": "number",
                "title": "Score"
            },
            "custom": {
                "type": "string",
                "title": "Custom"
            },
            "skills": {
                "type": "string",
                "title": "Skills"
            },
            "status": {
                "type": "string",
                "title": "Status"
            },
            "company": {
                "type": "string",
                "title": "Company"
            },
            "details": {
                "type": "string",
                "title": "Details"
            },
            "industry": {
                "type": "string",
                "title": "Industry"
            },
            "priority": {
                "type": "string",
                "title": "Priority"
            },
            "stage_id": {
                "type": "string",
                "title": "Stage Id"
            },
            "vertical": {
                "type": "string",
                "title": "Vertical"
            },
            "last_name": {
                "type": "string",
                "title": "Last Name"
            },
            "account_id": {
                "enum": {
                    "table": "accounts",
                    "column": "id",
                    "schema": "crm"
                },
                "type": "string",
                "title": "Account Id"
            },
            "deleted_at": {
                "type": "string",
                "title": "Deleted At",
                "format": "date-time"
            },
            "first_name": {
                "type": "string",
                "title": "First Name"
            },
            "id_display": {
                "type": "string",
                "title": "Id Display",
                "readOnly": true
            },
            "is_primary": {
                "type": "boolean",
                "title": "Is Primary"
            },
            "lead_source": {
                "type": "string",
                "title": "Lead Source"
            },
            "location_id": {
                "enum": {
                    "table": "locations",
                    "column": "name",
                    "schema": "identity"
                },
                "type": "string",
                "title": "Location Id"
            },
            "contact_type": {
                "type": "string",
                "title": "Contact Type"
            },
            "is_trackable": {
                "type": "boolean",
                "title": "Is Trackable"
            },
            "linkedin_url": {
                "type": "string",
                "title": "Linkedin Url"
            },
            "persona_type": {
                "type": "string",
                "title": "Persona Type"
            },
            "available_from": {
                "type": "string",
                "title": "Available From",
                "format": "date-time"
            },
            "certifications": {
                "type": "string",
                "title": "Certifications"
            },
            "source_lead_id": {
                "type": "string",
                "title": "Source Lead Id"
            },
            "state_category": {
                "type": "string",
                "title": "State Category"
            },
            "account_display": {
                "type": "string",
                "title": "Account Display",
                "readOnly": true
            },
            "available_until": {
                "type": "string",
                "title": "Available Until",
                "format": "date-time"
            },
            "intent_category": {
                "type": "string",
                "title": "Intent Category"
            },
            "last_engaged_at": {
                "type": "string",
                "title": "Last Engaged At",
                "format": "date-time"
            },
            "lifecycle_stage": {
                "type": "string",
                "title": "Lifecycle Stage"
            },
            "location_display": {
                "type": "string",
                "title": "Location Display",
                "readOnly": true
            },
            "vertical_payload": {
                "type": "string",
                "title": "Vertical Payload"
            },
            "last_contacted_at": {
                "type": "string",
                "title": "Last Contacted At",
                "format": "date-time"
            },
            "billing_rate_daily": {
                "type": "number",
                "title": "Billing Rate Daily"
            },
            "entity_instance_id": {
                "enum": {
                    "table": "entity_instances",
                    "column": "id",
                    "schema": "crm"
                },
                "type": "string",
                "title": "Entity Instance Id"
            },
            "source_customer_id": {
                "type": "string",
                "title": "Source Customer Id"
            },
            "billing_rate_hourly": {
                "type": "number",
                "title": "Billing Rate Hourly"
            },
            "is_partner_delegate": {
                "type": "boolean",
                "title": "Is Partner Delegate"
            },
            "unavailable_periods": {
                "type": "string",
                "title": "Unavailable Periods"
            },
            "organization_display": {
                "type": "string",
                "title": "Organization Display",
                "readOnly": true
            },
            "preferred_work_hours": {
                "type": "string",
                "title": "Preferred Work Hours"
            },
            "entity_instance_display": {
                "type": "string",
                "title": "Entity Instance Display",
                "readOnly": true
            },
            "communication_preferences": {
                "type": "string",
                "title": "Communication Preferences"
            }
        }
    }
}




-- 3 UPSERT - CREATE ? UPDATES RECORD
SELECT core.api_new_core_upsert_data(
  'crm.v_leads',
  '{
    "name": "Test Lead - Minimal",
    "status": "active",
    "contact_type": "lead",
    "organization_id": "a41b2216-736c-4c00-99ca-30a0cd8ca0d2",
    "created_by": "ebd74adb-ad53-4342-ae75-de17196d99b0",
    "updated_by": "ebd74adb-ad53-4342-ae75-de17196d99b0",
    "intent_category": "lead",
    "state_category": "open"
  }'::jsonb
);

c9bc4a88-3c54-4b99-a25e-826d8de362a9



SELECT core.api_new_core_upsert_data(
  'crm.v_leads',
  '{
  
    "name": "Test Lead - Full Payload",
    "first_name": "Jane",
    "last_name": "Doe",
    "status": "active",
    "contact_type": "lead",
    "email": "jane.doe@testcorp.com",
    "phone": "+91-9876543210",
    "company": "TestCorp Industries",
    "industry": "Technology",
    "priority": "high",
    "score": 85,
    "lead_source": "website",
    "lifecycle_stage": "qualified",
    "persona_type": "decision_maker",
    "linkedin_url": "https://linkedin.com/in/janedoe",
    "is_primary": true,
    "is_trackable": true,
    "tags": "enterprise,saas",
    "skills": "negotiation,analytics",
    "raci": "responsible",
    "vertical": "saas",
    "account_id": "083a9e9d-06ff-4e55-aebb-0b1ed3ceedd6",
    "location_id": "cf974129-c4cf-4cca-aa36-62ba353c0708",
    "organization_id": "a41b2216-736c-4c00-99ca-30a0cd8ca0d2",
    "created_by": "ebd74adb-ad53-4342-ae75-de17196d99b0",
    "updated_by": "ebd74adb-ad53-4342-ae75-de17196d99b0",
    "intent_category": "lead",
    "state_category": "open",
    "details": {"notes": "High-value enterprise prospect from website form"}
  }'::jsonb
);

9755f6eb-f3db-4d37-b66b-f2d41cf7c676


SELECT jsonb_pretty(core.api_new_fetch_entity_records(
  jsonb_build_object(
    'entity_name', 'leads',
    'entity_schema', 'crm',
    'search', jsonb_build_object('value', 'Jane Doe')
  )
));

{
    "api": "new_v4",
    "data": [
        {
            "id": "859c5eee-cde2-43e2-b95b-180ba1a9c5ed",
            "name": "Jane Alice Doe",
            "raci": {
            },
            "tags": null,
            "email": "jane.alice@example.com",
            "phone": null,
            "score": null,
            "custom": {
            },
            "module": "crm",
            "skills": null,
            "status": "active",
            "company": null,
            "details": {
                "person": {
                    "name": {
                        "given": "Jane",
                        "family": "Alice Doe"
                    },
                    "communication": {
                        "email": [
                            "jane.alice@example.com"
                        ]
                    }
                }
            },
            "industry": null,
            "priority": null,
            "stage_id": "new",
            "vertical": null,
            "last_name": "Alice Doe",
            "account_id": null,
            "created_at": "2026-02-22T21:38:41.475951+00:00",
            "created_by": null,
            "deleted_at": null,
            "display_id": "CON-000035",
            "first_name": "Jane",
            "id_display": "CON-000035",
            "is_primary": null,
            "updated_at": "2026-02-22T21:38:41.475951+00:00",
            "updated_by": null,
            "lead_source": null,
            "location_id": null,
            "contact_type": "person",
            "is_trackable": null,
            "linkedin_url": null,
            "persona_type": null,
            "available_from": null,
            "certifications": null,
            "source_lead_id": null,
            "state_category": "NEW",
            "account_display": null,
            "available_until": null,
            "intent_category": "CRM_LEAD",
            "last_engaged_at": null,
            "lifecycle_stage": null,
            "organization_id": "2401eb31-1a09-4ee1-91a9-8579cd14f025",
            "location_display": null,
            "vertical_payload": {
            },
            "last_contacted_at": null,
            "billing_rate_daily": null,
            "entity_instance_id": null,
            "source_customer_id": null,
            "billing_rate_hourly": null,
            "details__final_test": null,
            "is_partner_delegate": null,
            "unavailable_periods": {
            },
            "organization_display": null,
            "preferred_work_hours": {
            },
            "details__person__skills": null,
            "entity_instance_display": null,
            "communication_preferences": {
            },
            "raci__person__name__given": null,
            "raci__person__name__family": null,
            "details__person__name__given": "Jane",
            "details__person__name__family": "Alice Doe",
            "details__person__name__middle": null,
            "vertical_payload__person__name__given": null,
            "vertical_payload__person__name__family": null
        },
        {
            "id": "c83ca51a-8192-4318-9a95-53c843f4ad9f",
            "name": "Jane Alice Doe",
            "raci": {
            },
            "tags": null,
            "email": "jane.alice@example.com",
            "phone": null,
            "score": null,
            "custom": {
            },
            "module": "crm",
            "skills": null,
            "status": "active",
            "company": null,
            "details": {
                "person": {
                    "name": {
                        "given": "Jane",
                        "family": "Alice Doe"
                    },
                    "communication": {
                        "email": [
                            "jane.alice@example.com"
                        ]
                    }
                }
            },
            "industry": null,
            "priority": null,
            "stage_id": "new",
            "vertical": null,
            "last_name": "Alice Doe",
            "account_id": null,
            "created_at": "2026-02-22T21:37:43.644891+00:00",
            "created_by": null,
            "deleted_at": null,
            "display_id": "CON-000033",
            "first_name": "Jane",
            "id_display": "CON-000033",
            "is_primary": null,
            "updated_at": "2026-02-22T21:37:43.644891+00:00",
            "updated_by": null,
            "lead_source": null,
            "location_id": null,
            "contact_type": "person",
            "is_trackable": null,
            "linkedin_url": null,
            "persona_type": null,
            "available_from": null,
            "certifications": null,
            "source_lead_id": null,
            "state_category": "NEW",
            "account_display": null,
            "available_until": null,
            "intent_category": "CRM_LEAD",
            "last_engaged_at": null,
            "lifecycle_stage": null,
            "organization_id": "2401eb31-1a09-4ee1-91a9-8579cd14f025",
            "location_display": null,
            "vertical_payload": {
            },
            "last_contacted_at": null,
            "billing_rate_daily": null,
            "entity_instance_id": null,
            "source_customer_id": null,
            "billing_rate_hourly": null,
            "details__final_test": null,
            "is_partner_delegate": null,
            "unavailable_periods": {
            },
            "organization_display": null,
            "preferred_work_hours": {
            },
            "details__person__skills": null,
            "entity_instance_display": null,
            "communication_preferences": {
            },
            "raci__person__name__given": null,
            "raci__person__name__family": null,
            "details__person__name__given": "Jane",
            "details__person__name__family": "Alice Doe",
            "details__person__name__middle": null,
            "vertical_payload__person__name__given": null,
            "vertical_payload__person__name__family": null
        },
        {
            "id": "c28ec73d-96bb-4885-9971-0018d9a866e3",
            "name": "Jane Doe",
            "raci": {
            },
            "tags": [
                "log",
                "verification"
            ],
            "email": "jane.doe.log@testcorp.com",
            "phone": null,
            "score": null,
            "custom": {
            },
            "module": "crm",
            "skills": [
                "testing",
                "documentation"
            ],
            "status": "active",
            "company": null,
            "details": {
                "person": {
                    "name": {
                        "given": "Jane",
                        "family": "Doe"
                    },
                    "communication": {
                        "email": [
                            "jane.doe.log@testcorp.com"
                        ]
                    }
                }
            },
            "industry": null,
            "priority": null,
            "stage_id": "new",
            "vertical": null,
            "last_name": "Doe",
            "account_id": null,
            "created_at": "2026-02-22T21:33:46.162355+00:00",
            "created_by": null,
            "deleted_at": null,
            "display_id": "CON-000032",
            "first_name": "Jane",
            "id_display": "CON-000032",
            "is_primary": null,
            "updated_at": "2026-02-22T21:33:46.162355+00:00",
            "updated_by": null,
            "lead_source": null,
            "location_id": null,
            "contact_type": "person",
            "is_trackable": null,
            "linkedin_url": null,
            "persona_type": null,
            "available_from": null,
            "certifications": null,
            "source_lead_id": null,
            "state_category": "NEW",
            "account_display": null,
            "available_until": null,
            "intent_category": "CRM_LEAD",
            "last_engaged_at": null,
            "lifecycle_stage": null,
            "organization_id": "2401eb31-1a09-4ee1-91a9-8579cd14f025",
            "location_display": null,
            "vertical_payload": {
            },
            "last_contacted_at": null,
            "billing_rate_daily": null,
            "entity_instance_id": null,
            "source_customer_id": null,
            "billing_rate_hourly": null,
            "details__final_test": null,
            "is_partner_delegate": null,
            "unavailable_periods": {
            },
            "organization_display": null,
            "preferred_work_hours": {
            },
            "details__person__skills": null,
            "entity_instance_display": null,
            "communication_preferences": {
            },
            "raci__person__name__given": null,
            "raci__person__name__family": null,
            "details__person__name__given": "Jane",
            "details__person__name__family": "Doe",
            "details__person__name__middle": null,
            "vertical_payload__person__name__given": null,
            "vertical_payload__person__name__family": null
        },
        {
            "id": "45c2e590-30da-4928-a97d-265368b18225",
            "name": "Jane Doe",
            "raci": "\"responsible\"",
            "tags": [
                "enterprise",
                "saas"
            ],
            "email": "jane.doe.v4@testcorp.com",
            "phone": null,
            "score": 85,
            "custom": "{}",
            "module": "crm",
            "skills": [
                "negotiation",
                "analytics"
            ],
            "status": "active",
            "company": "TestCorp Industries",
            "details": {
                "person": {
                    "name": {
                        "given": "Jane",
                        "family": "Doe"
                    },
                    "communication": {
                        "email": [
                            "jane.doe.v4@testcorp.com"
                        ]
                    }
                }
            },
            "industry": "Technology",
            "priority": "urgent",
            "stage_id": "new",
            "vertical": "saas",
            "last_name": "Doe",
            "account_id": null,
            "created_at": "2026-02-22T21:31:01.411863+00:00",
            "created_by": null,
            "deleted_at": null,
            "display_id": "CON-000031",
            "first_name": "Jane",
            "id_display": "CON-000031",
            "is_primary": true,
            "updated_at": "2026-02-22T21:40:50.202996+00:00",
            "updated_by": null,
            "lead_source": "website",
            "location_id": null,
            "contact_type": "lead",
            "is_trackable": true,
            "linkedin_url": "https://linkedin.com/in/janedoe",
            "persona_type": "decision_maker",
            "available_from": null,
            "certifications": null,
            "source_lead_id": null,
            "state_category": "NEW",
            "account_display": null,
            "available_until": null,
            "intent_category": "CRM_LEAD",
            "last_engaged_at": null,
            "lifecycle_stage": "qualified",
            "organization_id": "2401eb31-1a09-4ee1-91a9-8579cd14f025",
            "location_display": null,
            "vertical_payload": {
            },
            "last_contacted_at": null,
            "billing_rate_daily": null,
            "entity_instance_id": null,
            "source_customer_id": null,
            "billing_rate_hourly": null,
            "details__final_test": null,
            "is_partner_delegate": null,
            "unavailable_periods": {
            },
            "organization_display": null,
            "preferred_work_hours": {
            },
            "details__person__skills": null,
            "entity_instance_display": null,
            "communication_preferences": "{}",
            "raci__person__name__given": null,
            "raci__person__name__family": null,
            "details__person__name__given": "Jane",
            "details__person__name__family": "Doe",
            "details__person__name__middle": null,
            "vertical_payload__person__name__given": null,
            "vertical_payload__person__name__family": null
        },
        {
            "id": "3dd5e987-e1ba-4ad1-b5fc-6830ffb46e86",
            "name": "Jane Doe - Array Fix Verification",
            "raci": {
            },
            "tags": [
                "enterprise",
                "saas"
            ],
            "email": "jane.doe.array@testcorp.com",
            "phone": null,
            "score": null,
            "custom": {
            },
            "module": "crm",
            "skills": [
                "negotiation",
                "analytics"
            ],
            "status": "active",
            "company": null,
            "details": {
                "person": {
                    "name": {
                        "given": "Jane",
                        "family": "Doe - Array Fix Verification"
                    },
                    "communication": {
                        "email": [
                            "jane.doe.array@testcorp.com"
                        ]
                    }
                }
            },
            "industry": null,
            "priority": null,
            "stage_id": "new",
            "vertical": null,
            "last_name": "Doe - Array Fix Verification",
            "account_id": null,
            "created_at": "2026-02-22T21:24:59.49809+00:00",
            "created_by": null,
            "deleted_at": null,
            "display_id": "CON-000030",
            "first_name": "Jane",
            "id_display": "CON-000030",
            "is_primary": null,
            "updated_at": "2026-02-22T21:24:59.49809+00:00",
            "updated_by": null,
            "lead_source": null,
            "location_id": null,
            "contact_type": "person",
            "is_trackable": null,
            "linkedin_url": null,
            "persona_type": null,
            "available_from": null,
            "certifications": null,
            "source_lead_id": null,
            "state_category": "NEW",
            "account_display": null,
            "available_until": null,
            "intent_category": "CRM_LEAD",
            "last_engaged_at": null,
            "lifecycle_stage": null,
            "organization_id": "2401eb31-1a09-4ee1-91a9-8579cd14f025",
            "location_display": null,
            "vertical_payload": {
            },
            "last_contacted_at": null,
            "billing_rate_daily": null,
            "entity_instance_id": null,
            "source_customer_id": null,
            "billing_rate_hourly": null,
            "details__final_test": null,
            "is_partner_delegate": null,
            "unavailable_periods": {
            },
            "organization_display": null,
            "preferred_work_hours": {
            },
            "details__person__skills": null,
            "entity_instance_display": null,
            "communication_preferences": {
            },
            "raci__person__name__given": null,
            "raci__person__name__family": null,
            "details__person__name__given": "Jane",
            "details__person__name__family": "Doe - Array Fix Verification",
            "details__person__name__middle": null,
            "vertical_payload__person__name__given": null,
            "vertical_payload__person__name__family": null
        }
    ],
    "entity": "leads",
    "hasMore": false,
    "resolved_relation": "crm.v_leads"
}
