create table identity.locations (
  id uuid not null default extensions.uuid_generate_v4 (),
  organization_id uuid not null,
  name text not null,
  details jsonb null default '{}'::jsonb,
  time_zone text not null default 'UTC'::text,
  working_hours jsonb null default '{}'::jsonb,
  settings jsonb null default '[]'::jsonb,
  service_area jsonb null default '{}'::jsonb,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  is_active boolean null default true,
  short_code text null,
  app_settings jsonb null,
  parent_id uuid null,
  location_type_id uuid null,
  path extensions.ltree null,
  deleted_at timestamp with time zone null,
  vertical jsonb null default '{}'::jsonb,
  custom jsonb null default '{}'::jsonb,
  search_vector tsvector GENERATED ALWAYS as (
    setweight(
      to_tsvector('simple'::regconfig, COALESCE(name, ''::text)),
      'A'::"char"
    )
  ) STORED null,
  constraint locations_pkey primary key (id),
  constraint locations_organization_id_name_key unique (organization_id, name),
  constraint locations_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint locations_location_type_id_fkey foreign KEY (location_type_id) references identity.location_types (id) on delete set null,
  constraint locations_parent_id_fkey foreign KEY (parent_id) references identity.locations (id) on delete set null,
  constraint locations_updated_by_fkey foreign KEY (updated_by) references identity.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_locations_org_id on identity.locations using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_locations_search on identity.locations using gin (search_vector) TABLESPACE pg_default;

create trigger trg_provision_core_unified_objects
after INSERT on identity.locations for EACH row
execute FUNCTION core.util_trg_provision_bonded_extension ('core.unified_objects');

create trigger trg_update_location_path BEFORE INSERT
or
update OF parent_id on identity.locations for EACH row
execute FUNCTION identity.update_location_path ();

create trigger trg_updated_at BEFORE
update on identity.locations for EACH row
execute FUNCTION update_updated_at_column ();




















create table identity.location_types (
  id uuid not null default extensions.uuid_generate_v4 (),
  organization_id uuid not null,
  name text not null,
  level smallint not null default 0,
  created_at timestamp with time zone null default now(),
  created_by uuid null,
  search_vector tsvector GENERATED ALWAYS as (
    setweight(
      to_tsvector('simple'::regconfig, COALESCE(name, ''::text)),
      'A'::"char"
    )
  ) STORED null,
  updated_at timestamp with time zone null default now(),
  updated_by uuid null,
  is_active boolean not null default true,
  constraint location_types_pkey primary key (id),
  constraint location_types_organization_id_name_key unique (organization_id, name),
  constraint location_types_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint location_types_organization_id_fkey foreign KEY (organization_id) references identity.organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger trg_updated_at BEFORE
update on identity.location_types for EACH row
execute FUNCTION update_updated_at_column ();