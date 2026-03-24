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
  organization_id uuid null,
  auth_provider text null default 'email'::text,
  auth_provider_id text null,
  last_login_at timestamp with time zone null,
  deleted_at timestamp with time zone null,
  search_vector tsvector null,
  vertical jsonb null default '{}'::jsonb,
  custom jsonb null default '{}'::jsonb,
  constraint users_pkey primary key (id),
  constraint users_mobile_unique unique (mobile),
  constraint users_email_unique unique (email),
  constraint users_auth_id_key unique (auth_id),
  constraint users_updated_by_fkey foreign KEY (updated_by) references identity.users (id),
  constraint users_created_by_fkey foreign KEY (created_by) references identity.users (id) not VALID,
  constraint users_pref_organization_id_fkey foreign KEY (pref_organization_id) references identity.organizations (id) on delete set null,
  constraint users_auth_id_fkey foreign KEY (auth_id) references auth.users (id) on delete set null,
  constraint users_auth_provider_check check (
    (
      auth_provider = any (
        array[
          'email'::text,
          'google'::text,
          'microsoft'::text,
          'github'::text,
          'saml'::text
        ]
      )
    )
  ),
  constraint users_mobile_format_check check (
    (
      (mobile is null)
      or (mobile ~ '^\+?[1-9]\d{1,14}$'::text)
    )
  ),
  constraint users_email_format_check check (
    (
      (email is null)
      or (
        email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_identity_users_search on identity.users using gin (search_vector) TABLESPACE pg_default;

create index IF not exists idx_identity_users_identity_lookup on identity.users using btree (organization_id, created_by) INCLUDE (name, email, mobile, auth_provider) TABLESPACE pg_default
where
  (deleted_at is null);

create index IF not exists idx_identity_users_recovery_shell on identity.users using btree (deleted_at) TABLESPACE pg_default
where
  (deleted_at is not null);

create index IF not exists idx_identity_users_universal_timeline on identity.users using btree (organization_id, created_at desc, id) INCLUDE (name, email) TABLESPACE pg_default;

create trigger trg_sync_user_to_unified
after INSERT
or
update OF email,
name,
mobile on identity.users for EACH row
execute FUNCTION identity.trg_sync_user_to_unified ();

create trigger trg_updated_at BEFORE
update on identity.users for EACH row
execute FUNCTION update_updated_at_column ();













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
  theme_config jsonb null default '{"mode": "light", "brandName": "Zoworks", "primaryColor": "#1890ff"}'::jsonb,
  enabled_languages text[] null default '{en}'::text[],
  default_language text null default 'en'::text,
  is_demo boolean null default false,
  claimed_by_contact_id uuid null,
  claimed_at timestamp with time zone null,
  tier text null default 'free'::text,
  deleted_at timestamp with time zone null,
  vertical jsonb null default '{}'::jsonb,
  app_settings__name text GENERATED ALWAYS as ((app_settings #>> '{name}'::text[])) STORED null,
  custom jsonb null default '{}'::jsonb,
  custom__ai_overrides__name text GENERATED ALWAYS as ((custom #>> '{ai_overrides,name}'::text[])) STORED null,
  details__supplier_name text GENERATED ALWAYS as ((details #>> '{supplier_name}'::text[])) STORED null,
  is_system_org boolean null default false,
  search_vector tsvector GENERATED ALWAYS as (
    setweight(
      to_tsvector(
        'simple'::regconfig,
        (
          (
            (
              (
                (
                  (
                    COALESCE((app_settings #>> '{name}'::text[]), ''::text) || ' '::text
                  ) || COALESCE(
                    (custom #>> '{ai_overrides,name}'::text[]),
                    ''::text
                  )
                ) || ' '::text
              ) || COALESCE((details #>> '{supplier_name}'::text[]), ''::text)
            ) || ' '::text
          ) || COALESCE(name, ''::text)
        )
      ),
      'A'::"char"
    )
  ) STORED null,
  is_active boolean null default true,
  organization_id uuid null,
  constraint tenants_pkey primary key (id),
  constraint tenants_subdomain_key unique (subdomain),
  constraint organizations_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint organizations_updated_by_fkey foreign KEY (updated_by) references identity.users (id),
  constraint organizations_tier_check check (
    (
      tier = any (
        array['free'::text, 'pro'::text, 'enterprise'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_identity_organizations_org_id on identity.organizations using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_identity_organizations_search on identity.organizations using gin (search_vector) TABLESPACE pg_default;

create index IF not exists idx_identity_organizations_recovery_shell on identity.organizations using btree (deleted_at) TABLESPACE pg_default
where
  (deleted_at is not null);

create trigger trg_updated_at BEFORE
update on identity.organizations for EACH row
execute FUNCTION update_updated_at_column ();












create table identity.organization_users (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  user_id uuid not null,
  location_id uuid null,
  manager_id uuid null,
  is_active boolean null default true,
  role_status public.user_status null default 'OFFLINE'::user_status,
  last_synced_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  updated_by uuid null,
  path extensions.ltree null,
  details jsonb null default '{}'::jsonb,
  deleted_at timestamp with time zone null,
  persona_type text null default 'worker'::text,
  vertical jsonb null default '{}'::jsonb,
  custom jsonb null default '{}'::jsonb,
  is_field_staff boolean null default false,
  search_vector tsvector GENERATED ALWAYS as (
    setweight(
      to_tsvector(
        'simple'::regconfig,
        (
          (
            COALESCE(
              (details #>> '{person,name,family}'::text[]),
              ''::text
            ) || ' '::text
          ) || COALESCE(
            (details #>> '{person,name,given}'::text[]),
            ''::text
          )
        )
      ),
      'A'::"char"
    )
  ) STORED null,
  display_id text null,
  constraint organization_users_pkey primary key (id),
  constraint uq_organization_user unique (organization_id, user_id),
  constraint organization_users_manager_id_fkey foreign KEY (manager_id) references identity.users (id) not VALID,
  constraint organization_users_organization_id_fkey foreign KEY (organization_id) references identity.organizations (id),
  constraint organization_users_location_id_fkey foreign KEY (location_id) references identity.locations (id) not VALID,
  constraint organization_users_updated_by_fkey foreign KEY (updated_by) references identity.users (id),
  constraint organization_users_user_id_fkey foreign KEY (user_id) references identity.users (id),
  constraint organization_users_created_by_fkey foreign KEY (created_by) references identity.users (id)
) TABLESPACE pg_default;

create trigger reassign_reports_on_deactivation_trg
after
update OF is_active on identity.organization_users for EACH row
execute FUNCTION identity.reassign_reports_on_deactivation ();

create trigger trg_provision_core_unified_objects
after INSERT on identity.organization_users for EACH row
execute FUNCTION core.util_trg_provision_bonded_extension ('core.unified_objects');

create trigger trg_provision_hr_profiles
after INSERT on identity.organization_users for EACH row
execute FUNCTION core.util_trg_provision_bonded_extension ('hr.profiles');

create trigger trg_provision_unified_contacts
after INSERT on identity.organization_users for EACH row
execute FUNCTION core.util_trg_provision_bonded_extension ('unified.contacts');

create trigger trg_update_org_user_path BEFORE INSERT
or
update OF manager_id on identity.organization_users for EACH row
execute FUNCTION identity.update_organization_user_path ();

create trigger trg_updated_at BEFORE
update on identity.organization_users for EACH row
execute FUNCTION update_updated_at_column ();













create table identity.user_roles (
  organization_user_id uuid not null,
  role_id uuid not null,
  team_id uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  last_assigned_at timestamp with time zone null,
  created_by uuid null,
  organization_id uuid null,
  id uuid not null default gen_random_uuid (),
  updated_by uuid null,
  constraint user_roles_pkey primary key (id),
  constraint uq_user_roles_id unique (id),
  constraint uq_user_roles_assignment unique NULLS not distinct (organization_user_id, role_id, team_id),
  constraint user_roles_team_id_fkey foreign KEY (team_id) references identity.teams (id) not VALID,
  constraint user_roles_organization_user_id_fkey foreign KEY (organization_user_id) references identity.organization_users (id) not VALID,
  constraint user_roles_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint user_roles_role_id_fkey foreign KEY (role_id) references identity.roles (id) not VALID
) TABLESPACE pg_default;

create index IF not exists idx_identity_user_roles_universal_timeline on identity.user_roles using btree (organization_id, created_at desc, id) INCLUDE (
  id,
  role_id,
  organization_user_id,
  created_at,
  updated_at,
  last_assigned_at
) TABLESPACE pg_default;

create index IF not exists idx_identity_user_roles_identity_lookup on identity.user_roles using btree (organization_id, created_by) INCLUDE (
  role_id,
  organization_user_id,
  created_at,
  updated_at
) TABLESPACE pg_default;

create trigger trg_updated_at BEFORE
update on identity.user_roles for EACH row
execute FUNCTION update_updated_at_column ();

create trigger trg_validate_user_role_assignment BEFORE INSERT
or
update on identity.user_roles for EACH row
execute FUNCTION identity.validate_team_assignment ();
















create table identity.user_teams (
  organization_user_id uuid not null,
  team_id uuid not null,
  created_at timestamp with time zone null default now(),
  created_by uuid null,
  updated_at timestamp with time zone null default now(),
  last_assigned_at timestamp with time zone null,
  id uuid null default gen_random_uuid (),
  organization_id uuid null,
  updated_by uuid null,
  constraint user_teams_pkey primary key (organization_user_id, team_id),
  constraint user_teams_id_key unique (id),
  constraint user_teams_created_by_fkey foreign KEY (created_by) references identity.users (id) not VALID,
  constraint user_teams_organization_user_id_fkey foreign KEY (organization_user_id) references identity.organization_users (id) not VALID,
  constraint user_teams_team_id_fkey foreign KEY (team_id) references identity.teams (id) not VALID
) TABLESPACE pg_default;

create index IF not exists idx_identity_user_teams_identity_lookup on identity.user_teams using btree (organization_id, created_by) INCLUDE (
  team_id,
  organization_user_id,
  created_at,
  updated_at
) TABLESPACE pg_default;

create index IF not exists idx_identity_user_teams_universal_timeline on identity.user_teams using btree (organization_id, created_at desc, id) INCLUDE (
  team_id,
  organization_user_id,
  updated_at,
  created_at,
  last_assigned_at
) TABLESPACE pg_default;

create trigger trg_updated_at BEFORE
update on identity.user_teams for EACH row
execute FUNCTION update_updated_at_column ();










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

create index IF not exists idx_identity_locations_search on identity.locations using gin (search_vector) TABLESPACE pg_default;

create index IF not exists idx_identity_locations_hierarchy_gist on identity.locations using gist (path) TABLESPACE pg_default
where
  (deleted_at is null);

create index IF not exists idx_identity_locations_identity_lookup on identity.locations using btree (organization_id, created_by) INCLUDE (name, time_zone, short_code, created_at) TABLESPACE pg_default
where
  (deleted_at is null);

create index IF not exists idx_identity_locations_recovery_shell on identity.locations using btree (deleted_at) TABLESPACE pg_default
where
  (deleted_at is not null);

create index IF not exists idx_identity_locations_universal_timeline on identity.locations using btree (organization_id, created_at desc, id) INCLUDE (name, time_zone, id, organization_id, short_code) TABLESPACE pg_default;

create trigger trg_update_location_path BEFORE INSERT
or
update OF parent_id on identity.locations for EACH row
execute FUNCTION identity.update_location_path ();

create trigger trg_updated_at BEFORE
update on identity.locations for EACH row
execute FUNCTION update_updated_at_column ();















create table hr.profiles (
  id uuid not null,
  organization_id uuid not null,
  display_id text null,
  hire_date date null,
  termination_date date null,
  employment_type text null,
  work_schedule jsonb null default '{"timezone": "UTC", "weeklyHours": 40}'::jsonb,
  job_title text null,
  department text null,
  cost_center text null,
  employment_status text null default 'active'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  updated_by uuid null,
  search_vector tsvector null,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references identity.organization_users (id) on delete CASCADE,
  constraint hr_profiles_dates_check check (
    (
      (termination_date is null)
      or (termination_date > hire_date)
    )
  ),
  constraint profiles_employment_status_check check (
    (
      employment_status = any (
        array[
          'active'::text,
          'terminated'::text,
          'on_leave'::text,
          'suspended'::text
        ]
      )
    )
  ),
  constraint profiles_employment_type_check check (
    (
      employment_type = any (
        array[
          'full-time'::text,
          'part-time'::text,
          'contract'::text,
          'intern'::text,
          'temporary'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create trigger trg_cleanup_orphaned_organization_users
after DELETE on hr.profiles for EACH row
execute FUNCTION identity.trg_cleanup_orphaned_organization_users ();

create trigger trg_provision_core_unified_objects
after INSERT on hr.profiles for EACH row
execute FUNCTION core.util_trg_provision_bonded_extension ('core.unified_objects');

create trigger trg_provision_unified_contacts
after INSERT on hr.profiles for EACH row
execute FUNCTION core.util_trg_provision_bonded_extension ('unified.contacts');

create trigger trg_updated_at BEFORE
update on hr.profiles for EACH row
execute FUNCTION update_updated_at_column ();




