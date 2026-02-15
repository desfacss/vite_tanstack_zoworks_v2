-- Phase 3: Form Generation for hr.candidates
-- Step A: Minimal Form (Required fields only)
SELECT jsonb_pretty(core.api_new_generate_form_schema('hr.candidates', '{"mode": "minimal"}'::jsonb));

-- Step B: Full Form (All fields + Extensions)
SELECT jsonb_pretty(core.api_new_generate_form_schema('hr.candidates', '{}'::jsonb));



Minimal Form:
{
    "db_schema": {
        "table": "hr.candidates"
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
            "display_id",
            "name",
            "status"
        ],
        "display_id": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Display Id"
        },
        "contact_type": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Contact Type"
        }
    },
    "data_schema": {
        "type": "object",
        "title": "Candidates",
        "required": [
            "contact_type",
            "details",
            "display_id",
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
                "type": "object",
                "required": [
                    "person"
                ],
                "properties": {
                    "person": {
                        "type": "object",
                        "required": [
                            "name",
                            "communication"
                        ],
                        "properties": {
                            "name": {
                                "type": "object",
                                "required": [
                                    "given",
                                    "family"
                                ],
                                "properties": {
                                    "given": {
                                        "type": "string"
                                    },
                                    "family": {
                                        "type": "string"
                                    }
                                }
                            },
                            "communication": {
                                "type": "object",
                                "properties": {
                                    "email": {
                                        "type": "array"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "display_id": {
                "type": "string",
                "title": "Display Id"
            },
            "contact_type": {
                "type": "string",
                "title": "Contact Type"
            }
        }
    }
}






Full Form:
{
    "db_schema": {
        "table": "hr.candidates"
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
        "details": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Details"
        },
        "stage_id": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Stage Id"
        },
        "ui:order": [
            "automation_bp_instance_id",
            "automation_esm_instance_id",
            "available_from",
            "available_until",
            "billing_rate_daily",
            "billing_rate_hourly",
            "certifications",
            "contact_type",
            "created_by_display",
            "custom",
            "details",
            "display_id",
            "email",
            "id_display",
            "intent_category",
            "is_trackable",
            "lifecycle_stage",
            "location_id",
            "location_display",
            "name",
            "organization_display",
            "persona_type",
            "phone",
            "preferred_work_hours",
            "raci",
            "skills",
            "stage_id",
            "status",
            "unavailable_periods",
            "updated_by_display",
            "vertical",
            "vertical_payload"
        ],
        "vertical": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Vertical"
        },
        "display_id": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Display Id"
        },
        "id_display": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Id Display"
        },
        "location_id": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Location Id"
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
        "billing_rate_daily": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Billing Rate Daily"
        },
        "created_by_display": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Created By Display"
        },
        "updated_by_display": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Updated By Display"
        },
        "billing_rate_hourly": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Billing Rate Hourly"
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
        "automation_bp_instance_id": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Automation Bp Instance Id"
        },
        "automation_esm_instance_id": {
            "ui:options": {
                "colSpan": 12
            },
            "ui:placeholder": "Enter Automation Esm Instance Id"
        }
    },
    "data_schema": {
        "type": "object",
        "title": "Candidates",
        "required": [
            "contact_type",
            "details",
            "display_id",
            "name",
            "status"
        ],
        "properties": {
            "name": {
                "type": "string",
                "title": "Name"
            },
            "raci": {
                "type": "object",
                "required": [
                    "person"
                ],
                "properties": {
                    "person": {
                        "type": "object",
                        "required": [
                            "name",
                            "communication"
                        ],
                        "properties": {
                            "name": {
                                "type": "object",
                                "required": [
                                    "given",
                                    "family"
                                ],
                                "properties": {
                                    "given": {
                                        "type": "string"
                                    },
                                    "family": {
                                        "type": "string"
                                    }
                                }
                            },
                            "communication": {
                                "type": "object",
                                "properties": {
                                    "email": {
                                        "type": "array"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "email": {
                "type": "string",
                "title": "Email"
            },
            "phone": {
                "type": "string",
                "title": "Phone"
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
            "details": {
                "type": "object",
                "required": [
                    "person"
                ],
                "properties": {
                    "person": {
                        "type": "object",
                        "required": [
                            "name",
                            "communication"
                        ],
                        "properties": {
                            "name": {
                                "type": "object",
                                "required": [
                                    "given",
                                    "family"
                                ],
                                "properties": {
                                    "given": {
                                        "type": "string"
                                    },
                                    "family": {
                                        "type": "string"
                                    }
                                }
                            },
                            "communication": {
                                "type": "object",
                                "properties": {
                                    "email": {
                                        "type": "array"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "stage_id": {
                "type": "string",
                "title": "Stage Id"
            },
            "vertical": {
                "type": "object",
                "required": [
                    "person"
                ],
                "properties": {
                    "person": {
                        "type": "object",
                        "required": [
                            "name",
                            "communication"
                        ],
                        "properties": {
                            "name": {
                                "type": "object",
                                "required": [
                                    "given",
                                    "family"
                                ],
                                "properties": {
                                    "given": {
                                        "type": "string"
                                    },
                                    "family": {
                                        "type": "string"
                                    }
                                }
                            },
                            "communication": {
                                "type": "object",
                                "properties": {
                                    "email": {
                                        "type": "array"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "display_id": {
                "type": "string",
                "title": "Display Id"
            },
            "id_display": {
                "type": "string",
                "title": "Id Display"
            },
            "location_id": {
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
            "available_until": {
                "type": "string",
                "title": "Available Until",
                "format": "date-time"
            },
            "intent_category": {
                "type": "string",
                "title": "Intent Category"
            },
            "lifecycle_stage": {
                "type": "string",
                "title": "Lifecycle Stage"
            },
            "location_display": {
                "type": "string",
                "title": "Location Display"
            },
            "vertical_payload": {
                "type": "object",
                "required": [
                    "person"
                ],
                "properties": {
                    "person": {
                        "type": "object",
                        "required": [
                            "name",
                            "communication"
                        ],
                        "properties": {
                            "name": {
                                "type": "object",
                                "required": [
                                    "given",
                                    "family"
                                ],
                                "properties": {
                                    "given": {
                                        "type": "string"
                                    },
                                    "family": {
                                        "type": "string"
                                    }
                                }
                            },
                            "communication": {
                                "type": "object",
                                "properties": {
                                    "email": {
                                        "type": "array"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "billing_rate_daily": {
                "type": "number",
                "title": "Billing Rate Daily"
            },
            "created_by_display": {
                "type": "string",
                "title": "Created By Display"
            },
            "updated_by_display": {
                "type": "string",
                "title": "Updated By Display"
            },
            "billing_rate_hourly": {
                "type": "number",
                "title": "Billing Rate Hourly"
            },
            "unavailable_periods": {
                "type": "object",
                "required": [
                    "person"
                ],
                "properties": {
                    "person": {
                        "type": "object",
                        "required": [
                            "name",
                            "communication"
                        ],
                        "properties": {
                            "name": {
                                "type": "object",
                                "required": [
                                    "given",
                                    "family"
                                ],
                                "properties": {
                                    "given": {
                                        "type": "string"
                                    },
                                    "family": {
                                        "type": "string"
                                    }
                                }
                            },
                            "communication": {
                                "type": "object",
                                "properties": {
                                    "email": {
                                        "type": "array"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "organization_display": {
                "type": "string",
                "title": "Organization Display"
            },
            "preferred_work_hours": {
                "type": "object",
                "required": [
                    "person"
                ],
                "properties": {
                    "person": {
                        "type": "object",
                        "required": [
                            "name",
                            "communication"
                        ],
                        "properties": {
                            "name": {
                                "type": "object",
                                "required": [
                                    "given",
                                    "family"
                                ],
                                "properties": {
                                    "given": {
                                        "type": "string"
                                    },
                                    "family": {
                                        "type": "string"
                                    }
                                }
                            },
                            "communication": {
                                "type": "object",
                                "properties": {
                                    "email": {
                                        "type": "array"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "automation_bp_instance_id": {
                "type": "string",
                "title": "Automation Bp Instance Id"
            },
            "automation_esm_instance_id": {
                "type": "string",
                "title": "Automation Esm Instance Id"
            }
        }
    }
}





SELECT core.api_new_core_upsert_data(
    'hr.candidates',
    jsonb_build_object(
        -- 🔒 HIDDEN SYSTEM CONTEXT (Simulated by UI Container)
        'organization_id', '2401eb31-1a09-4ee1-91a9-8579cd14f025',
        'location_id', NULL,
        'created_by', 'c5a5b4d2-6891-4c98-bc96-205f1b7349e1', 
        'updated_by', 'c5a5b4d2-6891-4c98-bc96-205f1b7349e1',
        
        -- 📁 DYNAMIC FORM DATA (From Step 3A results)
        'name', 'Candidate One',
        'contact_type', 'External',
        'status', 'Active',
        'display_id', 'TEMP-CAND-001',
        'details', jsonb_build_object(
             'person', jsonb_build_object(
                 'name', jsonb_build_object('given', 'John', 'family', 'Doe'),
                 'communication', jsonb_build_object('email', jsonb_build_array('john.doe@example.com'))
             )
        )
    )
);