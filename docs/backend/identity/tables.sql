create table identity.users (
  id uuid not null default gen_random_uuid (),
  auth_id uuid null,
  name text null,
  details jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  updated_by uuid null,
  privacy jsonb null default '{"groups": ["Contact Info"]}'::jsonb,
  password_confirmed boolean null,
  subscriptions jsonb null default '{}'::jsonb,
  relationship_details jsonb null default '{}'::jsonb,
  profile_privacy jsonb null default '{"Contact Info": false}'::jsonb,
  post_read_statuses jsonb null default '{}'::jsonb,
  pref_organization_id uuid null,
  email text null,
  mobile text null,
  constraint users_pkey primary key (id),
  constraint users_auth_id_key unique (auth_id),
  constraint users_auth_id_fkey foreign KEY (auth_id) references auth.users (id) on delete set null,
  constraint users_created_by_fkey foreign KEY (created_by) references identity.users (id) not VALID,
  constraint users_pref_organization_id_fkey foreign KEY (pref_organization_id) references identity.organizations (id) on delete set null,
  constraint users_updated_by_fkey foreign KEY (updated_by) references identity.users (id)
) TABLESPACE pg_default;

create unique INDEX IF not exists idx_users_auth_id on identity.users using btree (auth_id) TABLESPACE pg_default;

create index IF not exists idx_users_pref_organization_id on identity.users using btree (pref_organization_id) TABLESPACE pg_default;

create index IF not exists idx_users_search on identity.users using gin (name gin_trgm_ops, email gin_trgm_ops) TABLESPACE pg_default;

create index IF not exists idx_identity_users_trigram_search on identity.users using gin (name gin_trgm_ops, email gin_trgm_ops) TABLESPACE pg_default;











create table identity.user_roles (
  organization_user_id uuid not null,
  role_id uuid not null,
  team_id uuid not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  last_assigned_at timestamp with time zone null,
  created_by uuid null,
  organization_id uuid null,
  id uuid null default gen_random_uuid (),
  constraint user_roles_pkey primary key (organization_user_id, role_id, team_id),
  constraint user_roles_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint user_roles_organization_id_fkey foreign KEY (organization_id) references identity.organizations (id),
  constraint user_roles_organization_user_id_fkey foreign KEY (organization_user_id) references identity.organization_users (id) not VALID,
  constraint user_roles_role_id_fkey foreign KEY (role_id) references identity.roles (id) not VALID,
  constraint user_roles_team_id_fkey foreign KEY (team_id) references identity.teams (id) not VALID
) TABLESPACE pg_default;

create index IF not exists idx_user_roles_team_id on identity.user_roles using btree (team_id) TABLESPACE pg_default;

create index IF not exists idx_user_roles_role_id on identity.user_roles using btree (role_id) TABLESPACE pg_default;
















create table identity.organization_users (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  user_id uuid not null,
  location_id uuid null,
  manager_id uuid null,
  is_active boolean null default true,
  status public.user_status null default 'OFFLINE'::user_status,
  last_synced_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  updated_by uuid null,
  path extensions.ltree null,
  constraint organization_users_pkey primary key (id),
  constraint uq_organization_user unique (organization_id, user_id),
  constraint organization_users_manager_id_fkey foreign KEY (manager_id) references identity.users (id) not VALID,
  constraint organization_users_organization_id_fkey foreign KEY (organization_id) references identity.organizations (id) not VALID,
  constraint organization_users_location_id_fkey foreign KEY (location_id) references identity.locations (id) not VALID,
  constraint organization_users_updated_by_fkey foreign KEY (updated_by) references identity.users (id),
  constraint organization_users_user_id_fkey foreign KEY (user_id) references identity.users (id),
  constraint organization_users_created_by_fkey foreign KEY (created_by) references identity.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_org_users_path_gist on identity.organization_users using gist (path) TABLESPACE pg_default;

create index IF not exists idx_organization_users_location_id on identity.organization_users using btree (location_id) TABLESPACE pg_default;

create index IF not exists idx_organization_users_manager_id on identity.organization_users using btree (manager_id) TABLESPACE pg_default;

create index IF not exists idx_organization_users_user_id on identity.organization_users using btree (user_id) TABLESPACE pg_default;

create trigger reassign_reports_on_deactivation_trg
after
update OF is_active on identity.organization_users for EACH row
execute FUNCTION identity.reassign_reports_on_deactivation ();

create trigger trg_update_org_user_path BEFORE INSERT
or
update OF manager_id on identity.organization_users for EACH row
execute FUNCTION identity.update_organization_user_path ();













create table identity.user_teams (
  organization_user_id uuid not null,
  team_id uuid not null,
  created_at timestamp with time zone null default now(),
  created_by uuid null,
  updated_at timestamp with time zone null default now(),
  last_assigned_at timestamp with time zone null,
  constraint user_teams_pkey primary key (organization_user_id, team_id),
  constraint user_teams_created_by_fkey foreign KEY (created_by) references identity.users (id) not VALID,
  constraint user_teams_organization_user_id_fkey foreign KEY (organization_user_id) references identity.organization_users (id) not VALID,
  constraint user_teams_team_id_fkey foreign KEY (team_id) references identity.teams (id) not VALID
) TABLESPACE pg_default;

create index IF not exists idx_user_teams_team_id on identity.user_teams using btree (team_id) TABLESPACE pg_default;









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
  "X_app_settings_after_zo_ai_override" jsonb null,
  parent_id uuid null,
  location_type_id uuid null,
  path extensions.ltree null,
  constraint locations_pkey primary key (id),
  constraint locations_organization_id_name_key unique (organization_id, name),
  constraint locations_organization_id_fkey foreign KEY (organization_id) references identity.organizations (id),
  constraint locations_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint locations_parent_id_fkey foreign KEY (parent_id) references identity.locations (id) on delete set null,
  constraint locations_location_type_id_fkey foreign KEY (location_type_id) references identity.location_types (id) on delete set null,
  constraint locations_updated_by_fkey foreign KEY (updated_by) references identity.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_identity_locations_trigram_search on identity.locations using gin (name gin_trgm_ops) TABLESPACE pg_default;

create index IF not exists idx_locations_parent_id on identity.locations using btree (parent_id) TABLESPACE pg_default;

create index IF not exists idx_locations_path_gist on identity.locations using gist (path) TABLESPACE pg_default;

create trigger trg_update_location_path BEFORE INSERT
or
update OF parent_id on identity.locations for EACH row
execute FUNCTION identity.update_location_path ();















create table identity.organizations (
  id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  subdomain text null,
  module_features jsonb null default '["core", "contracts", "public", "auth", "crm", "fsm", "admin", "inventory", "settings", "support"]'::jsonb,
  details jsonb null default '{}'::jsonb,
  app_settings jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  subscription_id uuid null default '550e8400-e29b-41d4-a716-446655440000'::uuid,
  settings jsonb null default '{"holidays": [{"date": "2025-04-09", "name": "zz"}], "localization": {"currency": "INR", "time_zone": "GMT+5:30", "date_format": "DD/MM/YYYY", "time_format": "24-hour", "week_start_day": "Monday"}}'::jsonb,
  auth_id uuid null,
  created_by uuid null,
  updated_by uuid null,
  "X_app_settings_after_zo_ai_override" jsonb null,
  theme_config jsonb null default '{"mode": "light", "brandName": "Zoworks", "primaryColor": "#1890ff"}'::jsonb,
  enabled_languages text[] null default '{en}'::text[],
  default_language text null default 'en'::text,
  is_demo boolean null default false,
  constraint tenants_pkey primary key (id),
  constraint tenants_subdomain_key unique (subdomain),
  constraint organizations_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint organizations_updated_by_fkey foreign KEY (updated_by) references identity.users (id)
) TABLESPACE pg_default;













create table identity.roles (
  id uuid not null default extensions.uuid_generate_v4 (),
  organization_id uuid null,
  name text not null,
  permissions jsonb null default '{}'::jsonb,
  is_sassadmin boolean null default false,
  ui_order bigint null,
  rls_policy jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  feature jsonb null default '{}'::jsonb,
  location_id uuid null,
  is_active boolean null default true,
  created_by uuid null,
  updated_by uuid null,
  constraint roles_pkey primary key (id),
  constraint roles_organization_id_name_key unique (organization_id, name),
  constraint roles_created_by_fkey foreign KEY (created_by) references identity.users (id) not VALID,
  constraint roles_location_id_fkey foreign KEY (location_id) references identity.locations (id) not VALID,
  constraint roles_organization_id_fkey foreign KEY (organization_id) references identity.organizations (id) not VALID,
  constraint roles_updated_by_fkey foreign KEY (updated_by) references identity.users (id) not VALID
) TABLESPACE pg_default;

create index IF not exists idx_identity_roles_trigram_search on identity.roles using gin (name gin_trgm_ops) TABLESPACE pg_default;

create index IF not exists idx_roles_organization_id on identity.roles using btree (organization_id) TABLESPACE pg_default;
















create table identity.teams (
  id uuid not null default extensions.uuid_generate_v4 (),
  organization_id uuid not null,
  name text not null,
  location_id uuid not null,
  details jsonb null default '{}'::jsonb,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint teams_pkey primary key (id),
  constraint teams_location_name_unique unique (location_id, name),
  constraint teams_created_by_fkey foreign KEY (created_by) references identity.users (id) not VALID,
  constraint teams_location_id_fkey foreign KEY (location_id) references identity.locations (id) not VALID,
  constraint teams_organization_id_fkey foreign KEY (organization_id) references identity.organizations (id) not VALID,
  constraint teams_updated_by_fkey foreign KEY (updated_by) references identity.users (id) not VALID
) TABLESPACE pg_default;

create index IF not exists idx_identity_teams_trigram_search on identity.teams using gin (name gin_trgm_ops) TABLESPACE pg_default;

create index IF not exists idx_teams_location_id on identity.teams using btree (location_id) TABLESPACE pg_default;

create index IF not exists idx_teams_organization_id on identity.teams using btree (organization_id) TABLESPACE pg_default;