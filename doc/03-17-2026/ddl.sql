create table automation.bp_process_blueprints (
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  name text not null,
  description text null,
  entity_schema text not null,
  entity_type text not null,
  definition jsonb not null,
  version integer not null default 1,
  is_active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null,
  updated_by uuid null,
  blueprint_type text not null default 'lifecycle'::text,
  intent text null,
  constraint bp_process_blueprints_pkey primary key (id),
  constraint bp_process_blueprints_name_org_key unique (organization_id, name),
  constraint bp_process_blueprints_unique_name_version unique (
    organization_id,
    entity_schema,
    entity_type,
    name,
    version
  ),
  constraint bp_process_blueprints_blueprint_type_check check (
    (
      blueprint_type = any (
        array[
          'lifecycle'::text,
          'approval'::text,
          'orchestration'::text,
          'agentic'::text
        ]
      )
    )
  ),
  constraint valid_blueprint_definition check (
    jsonb_matches_schema (
      '{
            "type": "object",
            "required": ["name", "entity_schema", "entity_type", "blueprint_type", "lifecycle"],
            "properties": {
                "name": {"type": "string"},
                "entity_schema": {"type": "string"},
                "entity_type": {"type": "string"},
                "blueprint_type": {
                    "type": "string",
                    "enum": ["lifecycle", "approval", "orchestration", "agentic"]
                },
                "lifecycle": {
                    "type": "object",
                    "required": ["startStateId", "stages"],
                    "properties": {
                        "startStateId": {"type": "string"},
                        "stages": {
                            "type": "array",
                            "minItems": 1,
                            "items": {
                                "type": "object",
                                "required": ["id", "name", "category"],
                                "properties": {
                                    "id": {"type": "string"},
                                    "name": {"type": "string"},
                                    "category": {
                                        "type": "string",
                                        "enum": ["NEW", "IN_PROGRESS", "CLOSED_WON", "CLOSED_LOST", "CANCELLED"]
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }'::json,
      definition
    )
  ),
  constraint bp_process_blueprints_unique_active_version EXCLUDE using btree (
    organization_id
    with
      =,
      entity_schema
    with
      =,
      entity_type
    with
      =,
      blueprint_type
    with
      =
  )
  where
    ((is_active = true))
) TABLESPACE pg_default;

create index IF not exists idx_bp_process_blueprints_active on automation.bp_process_blueprints using btree (is_active) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_bp_process_blueprints_org_entity on automation.bp_process_blueprints using btree (organization_id, entity_schema, entity_type) TABLESPACE pg_default;

create index IF not exists idx_bp_process_blueprints_type on automation.bp_process_blueprints using btree (organization_id, blueprint_type) TABLESPACE pg_default
where
  (is_active = true);

create trigger sys_trg_register_unified_object
after INSERT on automation.bp_process_blueprints for EACH row
execute FUNCTION core.sys_trg_register_unified_object ();

create trigger trg_automation_bp_history_snapshot BEFORE DELETE
or
update on automation.bp_process_blueprints for EACH row
execute FUNCTION automation.sys_trg_snapshot_process_blueprint_history ();

create trigger trg_update_bp_process_blueprints_updated_at BEFORE
update on automation.bp_process_blueprints for EACH row
execute FUNCTION update_updated_at_column ();








create table automation.bp_process_blueprints_history (
  id uuid not null default gen_random_uuid (),
  blueprint_id uuid not null,
  entity_type text null,
  entity_schema text null,
  data jsonb not null,
  version integer not null,
  created_at timestamp with time zone null default now(),
  created_by uuid null,
  intent text null,
  constraint bp_process_blueprints_history_pkey primary key (id)
) TABLESPACE pg_default;