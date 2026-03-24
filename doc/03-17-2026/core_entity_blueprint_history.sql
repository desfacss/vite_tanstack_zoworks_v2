create table core.entity_blueprint_history (
  id uuid not null default gen_random_uuid (),
  blueprint_id uuid not null,
  entity_type text not null,
  entity_schema text not null,
  data jsonb not null,
  version integer not null,
  created_at timestamp with time zone null default now(),
  created_by uuid null,
  organization_id uuid null,
  updated_at timestamp with time zone null default now(),
  updated_by uuid null,
  constraint entity_blueprint_history_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_core_entity_blueprint_history_org_id on core.entity_blueprint_history using btree (organization_id) TABLESPACE pg_default;

create trigger trg_updated_at BEFORE
update on core.entity_blueprint_history for EACH row
execute FUNCTION update_updated_at_column ();