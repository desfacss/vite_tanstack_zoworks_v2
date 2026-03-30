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
  is_active boolean null default true,
  organization_id uuid null,
  created_by uuid null,
  updated_by uuid null,
  metadata_intent jsonb null default '[]'::jsonb,
  physical_intent text null,
  ui_tableview jsonb null default '{}'::jsonb,
  ui_gridview jsonb null default '{}'::jsonb,
  ui_kanbanview jsonb null default '{}'::jsonb,
  ui_ganttview jsonb null default '{}'::jsonb,
  ui_calendarview jsonb null default '{}'::jsonb,
  ui_mapview jsonb null default '{}'::jsonb,
  ui_detailview jsonb null default '{}'::jsonb,
  rls_config jsonb null default '{}'::jsonb,
  registration_mode text null default 'none'::text,
  dependencies_locked boolean null default false,
  constraint entity_blueprints_pkey primary key (id),
  constraint entity_blueprints_entity_type_entity_schema_key unique (entity_type, entity_schema),
  constraint chk_form_type check (
    (
      form_type = any (
        array[
          'simple'::text,
          'dependent'::text,
          'composite'::text,
          'allocator'::text,
          'nested'::text,
          'junction'::text
        ]
      )
    )
  ),
  constraint chk_master_must_register check (
    (
      (classification <> 'master'::text)
      or (
        registration_mode = any (array['anchor'::text, 'graduated'::text])
      )
    )
  ),
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
  constraint chk_registration_mode check (
    (
      registration_mode = any (
        array['anchor'::text, 'graduated'::text, 'none'::text]
      )
    )
  ),
  constraint chk_nonlifecycle_no_register check (
    (
      (
        classification = any (array['master'::text, 'transactional'::text])
      )
      or (registration_mode = 'none'::text)
    )
  ),
  constraint chk_classification_taxonomy check (
    (
      classification = any (
        array[
          'master'::text,
          'transactional'::text,
          'configuration'::text,
          'analytical'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_entity_blueprints_reg_mode on core.entity_blueprints using btree (registration_mode) TABLESPACE pg_default
where
  (is_active = true);

create trigger core_entity_blueprint_history_snapshot_trg
after INSERT
or
update on core.entity_blueprints for EACH row
execute FUNCTION core.sys_trg_snapshot_blueprint_history ();

create trigger trg_updated_at BEFORE
update on core.entity_blueprints for EACH row
execute FUNCTION update_updated_at_column ();