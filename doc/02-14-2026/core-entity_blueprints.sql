create table core.entity_blueprints (
  id uuid not null default gen_random_uuid (),
  entity_type text not null,
  entity_schema text not null,
  base_source text null,
  custom_view_sql text null,
  partition_filter text null,
  dependencies text[] null default '{}'::text[],
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  sub_panels jsonb null default '[]'::jsonb,
  semantics jsonb null default '{}'::jsonb,
  rules jsonb null default '{}'::jsonb,
  ai_metadata jsonb null default '{"embedding_model": "text-embedding-3-large"}'::jsonb,
  classification text null default 'transactional'::text,
  display_format jsonb null,
  version integer null default 1,
  blueprint_hash text null,
  form_type text null default 'simple'::text,
  ai_resolution text null default 'direct'::text,
  jsonb_schema jsonb null,
  ui_general jsonb null default '{}'::jsonb,
  ui_details_overview jsonb null default '{}'::jsonb,
  ui_dashboard jsonb null default '{}'::jsonb,
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