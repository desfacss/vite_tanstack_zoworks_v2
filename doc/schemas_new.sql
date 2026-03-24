create table core.entities (
  id uuid not null default gen_random_uuid (),
  entity_type text not null,
  entity_schema text not null,
  description text null,
  metadata jsonb not null default '[]'::jsonb,
  semantics jsonb not null default '{}'::jsonb,
  rules jsonb not null default '{}'::jsonb,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  v_metadata jsonb null,
  capabilities jsonb null,
  display_name text null,
  classification text null default 'transactional'::text,
  base_source_type text null default 'table'::text,
  base_source_name text null,
  logical_partition_filter text null,
  is_read_only boolean null default false,
  is_logical_variant boolean null default false,
  ai_metadata jsonb null default '{"embedding_model": "text-embedding-3-large", "trainable_actions": [], "vector_dimensions": 1536}'::jsonb,
  unified_registry character varying(50) null,
  short_code text null,
  data_source_id uuid null,
  blueprint_id uuid null,
  version integer null,
  module text null,
  form_type text null default 'simple'::text,
  ai_resolution text null default 'direct'::text,
  jsonb_schema jsonb null,
  constraint entities_pkey primary key (id),
  constraint uq_entity_type_schema unique (entity_type, entity_schema),
  constraint entities_data_source_id_fkey foreign KEY (data_source_id) references ai_mcp.data_sources (id)
) TABLESPACE pg_default;

create index IF not exists idx_entities_data_source on core.entities using btree (data_source_id) TABLESPACE pg_default
where
  (data_source_id is not null);

create trigger met_entity_get_capabilities_trg BEFORE INSERT
or
update OF metadata,
v_metadata on core.entities for EACH row
execute FUNCTION core.met_entity_get_capabilities_trg ();

create trigger trg_after_insert_entity
after INSERT on core.entities for EACH row
execute FUNCTION core.trg_create_entity_dependencies ();






create table core.entity_blueprints (
  id uuid not null default gen_random_uuid (),
  entity_type text not null,
  entity_schema text not null,
  base_source text null,
  physical_ddl text null,
  extra_objects jsonb null default '{}'::jsonb,
  custom_view_sql text null,
  partition_filter text null,
  ui_config jsonb null default '{}'::jsonb,
  dependencies text[] null default '{}'::text[],
  status text null default 'draft'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  sub_panels jsonb null default '[]'::jsonb,
  display_name text null,
  semantics jsonb null default '{}'::jsonb,
  rules jsonb null default '{}'::jsonb,
  ai_metadata jsonb null default '{"embedding_model": "text-embedding-3-large"}'::jsonb,
  classification text null default 'transactional'::text,
  display_format jsonb null,
  version integer null default 1,
  blueprint_hash text null,
  module text null,
  form_type text null default 'simple'::text,
  ai_resolution text null default 'direct'::text,
  jsonb_schema jsonb null,
  constraint entity_blueprints_pkey primary key (id),
  constraint entity_blueprints_entity_type_entity_schema_key unique (entity_type, entity_schema),
  constraint chk_ai_resolution check (
    (
      ai_resolution = any (
        array[
          'direct'::text,
          'resolve_parent'::text,
          'chain_resolve'::text,
          'allocator_flow'::text,
          'nested_create'::text
        ]
      )
    )
  ),
  constraint chk_form_type check (
    (
      form_type = any (
        array[
          'simple'::text,
          'dependent'::text,
          'composite'::text,
          'allocator'::text,
          'nested'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create trigger core_entity_blueprint_history_snapshot_trg
after INSERT
or
update on core.entity_blueprints for EACH row
execute FUNCTION core.sys_trg_snapshot_blueprint_history ();







create table hr.applications (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  location_id uuid null,
  display_id text not null,
  requisition_id uuid null,
  candidate_id uuid null,
  stage text GENERATED ALWAYS as ((details ->> 'processStage'::text)) STORED null,
  details jsonb not null,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  search_vector tsvector GENERATED ALWAYS as (
    setweight(
      to_tsvector(
        'simple'::regconfig,
        COALESCE(display_id, ''::text)
      ),
      'A'::"char"
    )
  ) STORED null,
  json_content__candidate_name text GENERATED ALWAYS as ((details #>> '{candidate_name}'::text[])) STORED null,
  vertical jsonb null default '{}'::jsonb,
  custom jsonb null default '{}'::jsonb,
  details__candidate_name text GENERATED ALWAYS as ((details #>> '{candidate_name}'::text[])) STORED null,
  details__culture_score integer GENERATED ALWAYS as (
    ((details #>> '{culture_score}'::text[]))::integer
  ) STORED null,
  details__experience text GENERATED ALWAYS as ((details #>> '{experience}'::text[])) STORED null,
  details__internal_status text GENERATED ALWAYS as ((details #>> '{internal_status}'::text[])) STORED null,
  details__justification text GENERATED ALWAYS as ((details #>> '{justification}'::text[])) STORED null,
  "details__processStage" text GENERATED ALWAYS as ((details #>> '{processStage}'::text[])) STORED null,
  details__score_culture integer GENERATED ALWAYS as (
    ((details #>> '{score_culture}'::text[]))::integer
  ) STORED null,
  details__score_tech integer GENERATED ALWAYS as (((details #>> '{score_tech}'::text[]))::integer) STORED null,
  details__skills text GENERATED ALWAYS as ((details #>> '{skills}'::text[])) STORED null,
  details__tech_score integer GENERATED ALWAYS as (((details #>> '{tech_score}'::text[]))::integer) STORED null,
  stage_id character varying(100) null,
  automation_bp_instance_id uuid null,
  automation_esm_instance_id uuid null,
  constraint applications_pkey primary key (id),
  constraint applications_organization_id_display_id_key unique (organization_id, display_id),
  constraint applications_candidate_id_fkey foreign KEY (candidate_id) references hr.candidates (id) on delete RESTRICT,
  constraint applications_requisition_id_fkey foreign KEY (requisition_id) references hr.requisitions (id) on delete RESTRICT,
  constraint valid_application check (
    jsonb_matches_schema (
      '{
                "type": "object",
                "required": ["processStage"],
                "properties": {
                    "processStage": { "type": "string" },
                    "disposition": { "type": "object", "properties": { "status": { "type": "string" } } }
                }
            }'::json,
      details
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_apps_org_stage on hr.applications using btree (organization_id, stage) TABLESPACE pg_default;

create index IF not exists idx_hr_applications_universal_timeline on hr.applications using btree (organization_id, created_at desc, id) INCLUDE (
  display_id,
  json_content__candidate_name,
  details__candidate_name,
  organization_id,
  id
) TABLESPACE pg_default;

create index IF not exists idx_applications_search_vec on hr.applications using gin (search_vector) TABLESPACE pg_default;

create index IF not exists idx_applications_universal_timeline on hr.applications using btree (organization_id, created_at desc, id) INCLUDE (display_id, organization_id, id, created_at) TABLESPACE pg_default;

create index IF not exists idx_hr_applications_stage_id_board on hr.applications using btree (
  organization_id,
  location_id,
  stage_id,
  created_at desc
) INCLUDE (
  display_id,
  json_content__candidate_name,
  details__candidate_name,
  details
) TABLESPACE pg_default;

create trigger sys_trg_register_unified_object
after INSERT
or
update on hr.applications for EACH row
execute FUNCTION core.sys_trg_register_unified_object ();

create trigger trg_hr_applications_esm_orchestration_insert BEFORE INSERT on hr.applications for EACH row
execute FUNCTION automation.esm_orchestration_before_insert ();

create trigger trg_hr_applications_esm_orchestration_update
after
update OF stage_id on hr.applications for EACH row
execute FUNCTION automation.esm_orchestration_after_update ();

create trigger trg_set_display_id BEFORE INSERT on hr.applications for EACH row
execute FUNCTION core.core_trigger_set_display_id_v3 ();








create table hr.candidates (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  location_id uuid null,
  display_id text not null,
  details jsonb not null,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  json_content__communication__email text GENERATED ALWAYS as (
    (
      details #>> '{person,communication,email}'::text[]
    )
  ) STORED null,
  search_vector tsvector GENERATED ALWAYS as (
    setweight(
      to_tsvector(
        'simple'::regconfig,
        (
          (COALESCE(display_id, ''::text) || ' '::text) || COALESCE(
            (
              details #>> '{person,communication,email}'::text[]
            ),
            ''::text
          )
        )
      ),
      'A'::"char"
    )
  ) STORED null,
  json_content__person__name__given text GENERATED ALWAYS as ((details #>> '{person,name,given}'::text[])) STORED null,
  json_content__person__name__family text GENERATED ALWAYS as ((details #>> '{person,name,family}'::text[])) STORED null,
  json_content__person__communication__email ARRAY GENERATED ALWAYS as (
    NULLIF(
      core.met_util_cast_jsonb_array (
        (details #> '{person,communication,email}'::text[])
      ),
      array[]::text[]
    )
  ) STORED null,
  vertical jsonb null default '{}'::jsonb,
  custom jsonb null default '{}'::jsonb,
  details__communication__email text GENERATED ALWAYS as (
    (
      details #>> '{person,communication,email}'::text[]
    )
  ) STORED null,
  "details__documentId__value" text GENERATED ALWAYS as ((details #>> '{documentId,value}'::text[])) STORED null,
  details__name__family text GENERATED ALWAYS as ((details #>> '{person,name,family}'::text[])) STORED null,
  details__name__given text GENERATED ALWAYS as ((details #>> '{person,name,given}'::text[])) STORED null,
  details__person__communication__email ARRAY GENERATED ALWAYS as (
    core.comp_met_util_cast_jsonb_array (
      (details #> '{person,communication,email}'::text[])
    )
  ) STORED null,
  details__person__name__family text GENERATED ALWAYS as ((details #>> '{person,name,family}'::text[])) STORED null,
  details__person__name__given text GENERATED ALWAYS as ((details #>> '{person,name,given}'::text[])) STORED null,
  details__profiles__comments text GENERATED ALWAYS as ((details #>> '{profiles,comments}'::text[])) STORED null,
  "details__profiles__profileName" text GENERATED ALWAYS as ((details #>> '{profiles,profileName}'::text[])) STORED null,
  details__resume text GENERATED ALWAYS as ((details #>> '{resume}'::text[])) STORED null,
  details__resume_text text GENERATED ALWAYS as ((details #>> '{resume_text}'::text[])) STORED null,
  details__semantic_summary text GENERATED ALWAYS as ((details #>> '{semantic_summary}'::text[])) STORED null,
  details__status text GENERATED ALWAYS as ((details #>> '{status}'::text[])) STORED null,
  details__top_skills ARRAY GENERATED ALWAYS as (
    core.comp_met_util_cast_jsonb_array ((details #> '{top_skills}'::text[]))
  ) STORED null,
  details__years_of_experience integer GENERATED ALWAYS as (
    ((details #>> '{years_of_experience}'::text[]))::integer
  ) STORED null,
  details__department text GENERATED ALWAYS as ((details #>> '{department}'::text[])) STORED null,
  details__email text GENERATED ALWAYS as ((details #>> '{email}'::text[])) STORED null,
  "details__firstName" text GENERATED ALWAYS as ((details #>> '{firstName}'::text[])) STORED null,
  "details__joiningDate" text GENERATED ALWAYS as ((details #>> '{joiningDate}'::text[])) STORED null,
  "details__lastName" text GENERATED ALWAYS as ((details #>> '{lastName}'::text[])) STORED null,
  details__rate text GENERATED ALWAYS as ((details #>> '{rate}'::text[])) STORED null,
  details__role_id text GENERATED ALWAYS as ((details #>> '{role_id}'::text[])) STORED null,
  "details__userName" text GENERATED ALWAYS as ((details #>> '{userName}'::text[])) STORED null,
  stage_id character varying(100) null,
  automation_bp_instance_id uuid null,
  automation_esm_instance_id uuid null,
  constraint candidates_pkey primary key (id),
  constraint candidates_organization_id_display_id_key unique (organization_id, display_id),
  constraint candidates_id_fkey foreign KEY (id) references unified.contacts (id) on delete CASCADE,
  constraint valid_candidate check (
    jsonb_matches_schema (
      '{
                "type": "object",
                "required": ["person"],
                "properties": {
                    "person": {
                        "type": "object",
                        "required": ["name", "communication"],
                        "properties": {
                            "name": { "type": "object", "required": ["given", "family"], "properties": { "given": { "type": "string" }, "family": { "type": "string" } } },
                            "communication": { "type": "object", "properties": { "email": { "type": "array" } } }
                        }
                    }
                }
            }'::json,
      details
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_cand_org on hr.candidates using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_candidates_search_vec on hr.candidates using gin (search_vector) TABLESPACE pg_default;

create index IF not exists idx_candidates_universal_timeline on hr.candidates using btree (organization_id, created_at desc, id) INCLUDE (display_id, organization_id, id) TABLESPACE pg_default;

create index IF not exists idx_screenings_search_vec on hr.candidates using gin (search_vector) TABLESPACE pg_default;

create index IF not exists idx_screenings_universal_timeline on hr.candidates using btree (organization_id, created_at desc, id) INCLUDE (display_id, organization_id, id) TABLESPACE pg_default;

create index IF not exists idx_assessments_search_vec on hr.candidates using gin (search_vector) TABLESPACE pg_default;

create index IF not exists idx_assessments_universal_timeline on hr.candidates using btree (organization_id, created_at desc, id) INCLUDE (display_id, organization_id, id) TABLESPACE pg_default;

create index IF not exists idx_hr_candidates_universal_timeline on hr.candidates using btree (organization_id, created_at desc, id) INCLUDE (display_id) TABLESPACE pg_default;

create index IF not exists idx_hr_candidates_my_created_by_items on hr.candidates using btree (organization_id, created_by, created_at desc) INCLUDE (display_id) TABLESPACE pg_default;

create index IF not exists idx_hr_candidates_my_updated_by_items on hr.candidates using btree (organization_id, updated_by, created_at desc) INCLUDE (display_id) TABLESPACE pg_default;

create index IF not exists idx_hr_candidates_status_board on hr.candidates using btree (organization_id, created_at desc) INCLUDE (display_id) TABLESPACE pg_default;

create index IF not exists idx_hr_candidates_stage_id_board on hr.candidates using btree (
  organization_id,
  location_id,
  stage_id,
  created_at desc
) INCLUDE (display_id, details__name__given) TABLESPACE pg_default;

create trigger sys_trg_register_unified_object
after INSERT
or
update on hr.candidates for EACH row
execute FUNCTION core.sys_trg_register_unified_object ();

create trigger trg_candidate_unified_sync BEFORE INSERT
or
update on hr.candidates for EACH row
execute FUNCTION hr.trg_candidate_to_unified ();

create trigger trg_hr_candidates_esm_orchestration_insert BEFORE INSERT on hr.candidates for EACH row
execute FUNCTION automation.esm_orchestration_before_insert ();

create trigger trg_hr_candidates_esm_orchestration_update
after
update OF stage_id on hr.candidates for EACH row
execute FUNCTION automation.esm_orchestration_after_update ();

create trigger trg_set_display_id BEFORE INSERT on hr.candidates for EACH row
execute FUNCTION core.core_trigger_set_display_id_v3 ();














create table hr.interviews (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  location_id uuid null,
  application_id uuid null,
  start_time timestamp with time zone null,
  status text GENERATED ALWAYS as ((details ->> 'interviewStatus'::text)) STORED null,
  details jsonb not null,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  vertical jsonb null default '{}'::jsonb,
  custom jsonb null default '{}'::jsonb,
  "details__validDatePeriod__start" text GENERATED ALWAYS as (
    (
      details #>> '{appointment,validDatePeriod,start}'::text[]
    )
  ) STORED null,
  "details__appointment__validDatePeriod" text GENERATED ALWAYS as (
    (
      details #>> '{appointment,validDatePeriod}'::text[]
    )
  ) STORED null,
  "details__interviewStatus" text GENERATED ALWAYS as ((details #>> '{interviewStatus}'::text[])) STORED null,
  display_id character varying(200) null,
  constraint interviews_pkey primary key (id),
  constraint interviews_application_id_fkey foreign KEY (application_id) references hr.applications (id) on delete CASCADE,
  constraint valid_interview check (
    jsonb_matches_schema (
      '{
                "type": "object",
                "required": ["interviewStatus", "appointment"],
                "properties": {
                    "interviewStatus": { "type": "string" },
                    "appointment": { "type": "object", "required": ["validDatePeriod"], "properties": { "validDatePeriod": { "type": "object", "required": ["start"] } } }
                }
            }'::json,
      details
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_hr_interviews_universal_timeline on hr.interviews using btree (organization_id, created_at desc, id) INCLUDE (status, organization_id, id, details) TABLESPACE pg_default;

create index IF not exists idx_hr_interviews_status_board on hr.interviews using btree (organization_id, status, created_at desc) INCLUDE (details, start_time) TABLESPACE pg_default;

create trigger sync_interview_data BEFORE INSERT
or
update on hr.interviews for EACH row
execute FUNCTION hr.sync_json_to_columns ();

create trigger sys_trg_register_unified_object
after INSERT
or
update on hr.interviews for EACH row
execute FUNCTION core.sys_trg_register_unified_object ();

create trigger trg_interviews_updated_at BEFORE
update on hr.interviews for EACH row
execute FUNCTION update_updated_at_column ();

create trigger trg_set_display_id BEFORE INSERT on hr.interviews for EACH row
execute FUNCTION core.core_trigger_set_display_id_v3 ();












create table hr.requisitions (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  location_id uuid null,
  display_id text not null,
  title text GENERATED ALWAYS as (
    (
      (details -> 'positionProfile'::text) ->> 'positionTitle'::text
    )
  ) STORED null,
  status text GENERATED ALWAYS as ((details ->> 'status'::text)) STORED null,
  department text GENERATED ALWAYS as (
    (
      (details -> 'positionProfile'::text) ->> 'department'::text
    )
  ) STORED null,
  details jsonb not null,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  "json_content__positionProfile__positionFormattedDescription" ARRAY GENERATED ALWAYS as (
    NULLIF(
      core.met_util_cast_jsonb_array (
        (
          details #> '{positionProfile,positionFormattedDescription}'::text[]
        )
      ),
      array[]::text[]
    )
  ) STORED null,
  search_vector tsvector GENERATED ALWAYS as (
    (
      (
        (
          setweight(
            to_tsvector(
              'simple'::regconfig,
              COALESCE(display_id, ''::text)
            ),
            'A'::"char"
          ) || setweight(
            to_tsvector(
              'simple'::regconfig,
              COALESCE(
                (
                  (details -> 'positionProfile'::text) ->> 'positionTitle'::text
                ),
                ''::text
              )
            ),
            'A'::"char"
          )
        ) || setweight(
          to_tsvector(
            'simple'::regconfig,
            COALESCE(
              (
                (details -> 'positionProfile'::text) ->> 'department'::text
              ),
              ''::text
            )
          ),
          'B'::"char"
        )
      ) || setweight(
        to_tsvector(
          'simple'::regconfig,
          COALESCE((details)::text, ''::text)
        ),
        'C'::"char"
      )
    )
  ) STORED null,
  vertical jsonb null default '{}'::jsonb,
  custom jsonb null default '{}'::jsonb,
  "details__documentId__value" text GENERATED ALWAYS as ((details #>> '{documentId,value}'::text[])) STORED null,
  "details__positionProfile__department" text GENERATED ALWAYS as (
    (
      details #>> '{positionProfile,department}'::text[]
    )
  ) STORED null,
  "details__positionProfile__positionTitle" text GENERATED ALWAYS as (
    (
      details #>> '{positionProfile,positionTitle}'::text[]
    )
  ) STORED null,
  "details__postingInstruction__applicationCloseDate" text GENERATED ALWAYS as (
    (
      details #>> '{postingInstruction,applicationCloseDate}'::text[]
    )
  ) STORED null,
  constraint requisitions_pkey primary key (id),
  constraint requisitions_organization_id_display_id_key unique (organization_id, display_id),
  constraint valid_requisition check (
    jsonb_matches_schema (
      '{
                "type": "object",
                "required": ["positionProfile", "status"],
                "properties": {
                    "status": { "type": "string" },
                    "positionProfile": {
                        "type": "object",
                        "required": ["positionTitle"],
                        "properties": {
                            "positionTitle": { "type": "string" },
                            "department": { "type": "string" },
                            "positionFormattedDescription": { "type": "array" }
                        }
                    }
                }
            }'::json,
      details
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_hr_requisitions_status_board on hr.requisitions using btree (organization_id, status, created_at desc) INCLUDE (display_id, title, details, department) TABLESPACE pg_default;

create index IF not exists idx_req_org_loc on hr.requisitions using btree (organization_id, location_id) TABLESPACE pg_default;

create index IF not exists idx_req_status on hr.requisitions using btree (status) TABLESPACE pg_default;

create index IF not exists idx_requisitions_search on hr.requisitions using gin (search_vector) TABLESPACE pg_default;

create index IF not exists idx_hr_requisitions_universal_timeline on hr.requisitions using btree (organization_id, location_id, created_at desc, id) INCLUDE (display_id, title, status, id, organization_id) TABLESPACE pg_default;

create index IF not exists idx_requisitions_status_board on hr.requisitions using btree (organization_id, status, created_at desc) INCLUDE (display_id, title) TABLESPACE pg_default;

create trigger sys_trg_register_unified_object
after INSERT
or
update on hr.requisitions for EACH row
execute FUNCTION core.sys_trg_register_unified_object ();

create trigger trg_set_display_id BEFORE INSERT on hr.requisitions for EACH row
execute FUNCTION core.core_trigger_set_display_id_v3 ();










create table hr.workers (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  location_id uuid null,
  display_id text not null,
  worker_type text GENERATED ALWAYS as ((details ->> 'workerType'::text)) STORED null,
  details jsonb not null,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  search_vector tsvector GENERATED ALWAYS as (
    setweight(
      to_tsvector(
        'simple'::regconfig,
        COALESCE(display_id, ''::text)
      ),
      'A'::"char"
    )
  ) STORED null,
  "json_content__documentId__value" text GENERATED ALWAYS as ((details #>> '{documentId,value}'::text[])) STORED null,
  "json_content__employment__hireDate" text GENERATED ALWAYS as ((details #>> '{employment,hireDate}'::text[])) STORED null,
  "json_content__employment__jobTitle" text GENERATED ALWAYS as ((details #>> '{employment,jobTitle}'::text[])) STORED null,
  json_content__name__family text GENERATED ALWAYS as ((details #>> '{person,name,family}'::text[])) STORED null,
  json_content__name__given text GENERATED ALWAYS as ((details #>> '{person,name,given}'::text[])) STORED null,
  "json_content__workerType" text GENERATED ALWAYS as ((details #>> '{workerType}'::text[])) STORED null,
  vertical jsonb null default '{}'::jsonb,
  custom jsonb null default '{}'::jsonb,
  "details__documentId__value" text GENERATED ALWAYS as ((details #>> '{documentId,value}'::text[])) STORED null,
  "details__employment__hireDate" text GENERATED ALWAYS as ((details #>> '{employment,hireDate}'::text[])) STORED null,
  "details__employment__jobTitle" text GENERATED ALWAYS as ((details #>> '{employment,jobTitle}'::text[])) STORED null,
  details__name__family text GENERATED ALWAYS as ((details #>> '{person,name,family}'::text[])) STORED null,
  details__name__given text GENERATED ALWAYS as ((details #>> '{person,name,given}'::text[])) STORED null,
  "details__workerType" text GENERATED ALWAYS as ((details #>> '{workerType}'::text[])) STORED null,
  email text null,
  office_account_id text null,
  provider_type text null default 'google'::text,
  cal_username text null,
  "details__person__firstName" text GENERATED ALWAYS as ((details #>> '{person,firstName}'::text[])) STORED null,
  "details__person__lastName" text GENERATED ALWAYS as ((details #>> '{person,lastName}'::text[])) STORED null,
  user_id uuid null,
  "details__workMode" text GENERATED ALWAYS as ((details #>> '{workMode}'::text[])) STORED null,
  constraint workers_pkey primary key (id),
  constraint workers_organization_id_display_id_key unique (organization_id, display_id),
  constraint workers_user_id_fkey foreign KEY (user_id) references identity.users (id),
  constraint valid_worker check (
    jsonb_matches_schema (
      '{
          "type": "object",
          "required": ["person", "workerType"],
          "properties": {
              "workerType": { "type": "string", "enum": ["Employee", "Contractor", "Consultant"] },
              "workMode": { "type": "string", "enum": ["Office", "Remote", "Fieldstaff", "Hybrid"] },
              "person": { "type": "object" },
              "employment": { "type": "object", "properties": { "hireDate": { "type": "string" }, "jobTitle": { "type": "string" } } }
          }
      }'::json,
      details
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_workers_org on hr.workers using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_workers_id on hr.workers using btree (id) TABLESPACE pg_default;

create index IF not exists idx_workers_org_id on hr.workers using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_workers_contact_id on hr.workers using btree (id) TABLESPACE pg_default
where
  (id is not null);

create index IF not exists idx_workers_search_vec on hr.workers using gin (search_vector) TABLESPACE pg_default;

create index IF not exists idx_workers_universal_timeline on hr.workers using btree (organization_id, created_at desc, id) INCLUDE (display_id, organization_id, id, created_at) TABLESPACE pg_default;

create index IF not exists idx_requisitions_search_vec on hr.workers using gin (search_vector) TABLESPACE pg_default;

create index IF not exists idx_requisitions_universal_timeline on hr.workers using btree (organization_id, created_at desc, id) INCLUDE (display_id, organization_id, id, created_at) TABLESPACE pg_default;

create index IF not exists idx_hr_workers_universal_timeline on hr.workers using btree (organization_id, created_at desc, id) INCLUDE (display_id) TABLESPACE pg_default;

create index IF not exists idx_hr_workers_my_created_by_items on hr.workers using btree (organization_id, created_by, created_at desc) INCLUDE (display_id) TABLESPACE pg_default;

create index IF not exists idx_hr_workers_my_manager_items on hr.workers using btree (organization_id, created_at desc) INCLUDE (display_id) TABLESPACE pg_default;

create index IF not exists idx_hr_workers_my_updated_by_items on hr.workers using btree (organization_id, updated_by, created_at desc) INCLUDE (display_id) TABLESPACE pg_default;

create index IF not exists idx_hr_workers_my_user_items on hr.workers using btree (organization_id, created_at desc) INCLUDE (display_id) TABLESPACE pg_default;

create index IF not exists idx_hr_workers_status_board on hr.workers using btree (organization_id, created_at desc) INCLUDE (display_id) TABLESPACE pg_default;

create index IF not exists idx_workers_email on hr.workers using btree (email) TABLESPACE pg_default;

create trigger sys_trg_register_unified_object
after INSERT
or
update on hr.workers for EACH row
execute FUNCTION core.sys_trg_register_unified_object ();

create trigger trg_set_display_id BEFORE INSERT on hr.workers for EACH row
execute FUNCTION core.core_trigger_set_display_id_v3 ();

create trigger trg_sync_hr_worker_to_identity
after INSERT
or
update OF details,
user_id on hr.workers for EACH row
execute FUNCTION hr.sync_worker_details_to_identity ();














create table hr.offers (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  location_id uuid null,
  display_id text not null,
  application_id uuid null,
  base_salary numeric null,
  status text GENERATED ALWAYS as ((details ->> 'offerStatus'::text)) STORED null,
  details jsonb not null,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamp with time zone null default now(),
  search_vector tsvector GENERATED ALWAYS as (
    setweight(
      to_tsvector(
        'simple'::regconfig,
        COALESCE(display_id, ''::text)
      ),
      'A'::"char"
    )
  ) STORED null,
  updated_at timestamp with time zone null default now(),
  vertical jsonb null default '{}'::jsonb,
  custom jsonb null default '{}'::jsonb,
  "details__basePay__amount" integer GENERATED ALWAYS as (
    (
      (
        details #>> '{remunerationPackage,basePay,amount}'::text[]
      )
    )::integer
  ) STORED null,
  "details__basePay__currencyCode" text GENERATED ALWAYS as (
    (
      details #>> '{remunerationPackage,basePay,currencyCode}'::text[]
    )
  ) STORED null,
  "details__offerStatus" text GENERATED ALWAYS as ((details #>> '{offerStatus}'::text[])) STORED null,
  constraint offers_pkey primary key (id),
  constraint offers_organization_id_display_id_key unique (organization_id, display_id),
  constraint offers_application_id_fkey foreign KEY (application_id) references hr.applications (id) on delete CASCADE,
  constraint valid_offer check (
    jsonb_matches_schema (
      '{
                "type": "object",
                "required": ["offerStatus", "remunerationPackage"],
                "properties": {
                    "offerStatus": { "type": "string" },
                    "startDate": { "type": "string" },
                    "remunerationPackage": { "type": "object", "required": ["basePay"], "properties": { "basePay": { "type": "object", "required": ["amount", "currencyCode"] } } }
                }
            }'::json,
      details
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_hr_offers_universal_timeline on hr.offers using btree (organization_id, created_at desc, id) INCLUDE (display_id, status, id, organization_id, details) TABLESPACE pg_default;

create index IF not exists idx_hr_offers_status_board on hr.offers using btree (organization_id, status, created_at desc) INCLUDE (display_id, details, created_at) TABLESPACE pg_default;

create index IF not exists idx_offers_search_vec on hr.offers using gin (search_vector) TABLESPACE pg_default;

create index IF not exists idx_offers_universal_timeline on hr.offers using btree (organization_id, created_at desc, id) INCLUDE (display_id, organization_id, id, created_at) TABLESPACE pg_default;

create trigger sync_offer_data BEFORE INSERT
or
update on hr.offers for EACH row
execute FUNCTION hr.sync_json_to_columns ();

create trigger sys_trg_register_unified_object
after INSERT
or
update on hr.offers for EACH row
execute FUNCTION core.sys_trg_register_unified_object ();

create trigger trg_offers_updated_at BEFORE
update on hr.offers for EACH row
execute FUNCTION update_updated_at_column ();

create trigger trg_set_display_id BEFORE INSERT on hr.offers for EACH row
execute FUNCTION core.core_trigger_set_display_id_v3 ();









