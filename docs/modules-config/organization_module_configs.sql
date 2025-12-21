create table organization.module_configs (
  id uuid not null default extensions.uuid_generate_v4 (),
  organization_id uuid null,
  x_module_name text null,
  settings jsonb null,
  updated_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  module_id uuid null,
  sub_modules jsonb null default '{}'::jsonb,
  scope_level text null,
  location_id uuid null,
  created_by uuid null
) TABLESPACE pg_default;