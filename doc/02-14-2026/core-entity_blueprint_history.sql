create table core.entity_blueprint_history (
  id uuid not null default gen_random_uuid (),
  blueprint_id uuid not null,
  entity_type text not null,
  entity_schema text not null,
  data jsonb not null,
  version integer not null,
  created_at timestamp with time zone null default now(),
  created_by uuid null,
  constraint entity_blueprint_history_pkey primary key (id)
) TABLESPACE pg_default;