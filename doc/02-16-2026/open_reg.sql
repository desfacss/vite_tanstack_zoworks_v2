create table crm.accounts (
  id uuid not null default extensions.uuid_generate_v4 (),
  details jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  organization_id uuid null,
  name text null,
  notes text null,
  x_client_type text null default 'customer'::text,
  geofence geography null,
  location_id uuid null,
  is_active boolean null default true,
  short_code text null,
  lat double precision null,
  lng double precision null,
  parent_account_id uuid null,
  type public.account_type null default 'prospect'::account_type,
  domain text null,
  deleted_at timestamp with time zone null,
  entity_instance_id uuid null,
  search_vector tsvector null,
  industry text null,
  sub_industry text null,
  engagement_score numeric null default 0,
  churn_risk_score numeric null default 0,
  is_individual boolean null default false,
  details__supplier_name text GENERATED ALWAYS as ((details #>> '{supplier_name}'::text[])) STORED null,
  vertical jsonb null default '{}'::jsonb,
  custom jsonb null default '{}'::jsonb,
  updated_by uuid null,
  stage_id character varying(50) null,
  automation_bp_instance_id uuid null,
  automation_esm_instance_id uuid null,
  estimated_value numeric(15, 2) null,
  probability numeric(5, 2) null default 0,
  expected_close_date date null,
  status text null default 'active'::text,
  priority text null default 'Medium'::text,
  state_category text null,
  intent_category text null,
  constraint accounts_pkey primary key (id),
  constraint accounts_short_code_key unique (short_code),
  constraint accounts_entity_instance_id_key unique (entity_instance_id),
  constraint accounts_parent_account_id_fkey foreign KEY (parent_account_id) references crm.accounts (id) on delete set null,
  constraint accounts_updated_by_fkey foreign KEY (updated_by) references identity.users (id),
  constraint accounts_automation_esm_instance_id_fkey foreign KEY (automation_esm_instance_id) references automation.esm_instances (id) on delete set null,
  constraint accounts_id_fkey foreign KEY (id) references unified.organizations (id) on delete CASCADE,
  constraint accounts_automation_bp_instance_id_fkey foreign KEY (automation_bp_instance_id) references automation.bp_instances (id) on delete set null,
  constraint accounts_client_type_check check (
    (
      x_client_type = any (
        array['lead'::text, 'customer'::text, 'both'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_crm_accounts_identity_lookup on crm.accounts using btree (organization_id) INCLUDE (name, status, priority, stage_id) TABLESPACE pg_default;

create index IF not exists idx_crm_accounts_workflow_execution on crm.accounts using btree (organization_id, stage_id, created_at desc) INCLUDE (name, status, priority) TABLESPACE pg_default;

create index IF not exists idx_crm_accounts_automation_esm_link on crm.accounts using btree (automation_esm_instance_id) TABLESPACE pg_default;

create index IF not exists idx_crm_accounts_automation_bp_link on crm.accounts using btree (automation_bp_instance_id) TABLESPACE pg_default;

create unique INDEX IF not exists accounts_name_org_unique on crm.accounts using btree (name, organization_id) TABLESPACE pg_default
where
  (organization_id is not null);

create index IF not exists idx_crm_accounts_recovery_shell on crm.accounts using btree (deleted_at) TABLESPACE pg_default
where
  (deleted_at is not null);

create index IF not exists idx_crm_accounts_universal_timeline on crm.accounts using btree (organization_id, location_id, created_at desc, id) INCLUDE (
  name,
  stage_id,
  details__supplier_name,
  id,
  domain
) TABLESPACE pg_default;

create trigger sys_trg_register_unified_object
after INSERT
or
update on crm.accounts for EACH row
execute FUNCTION core.sys_trg_register_unified_object ();

create trigger trg_cleanup_orphaned_org
after DELETE on crm.accounts for EACH row
execute FUNCTION unified.trg_cleanup_orphaned_organization ();

create trigger trg_cleanup_orphaned_organizations
after DELETE on crm.accounts for EACH row
execute FUNCTION unified.trg_cleanup_orphaned_organizations ();

create trigger update_accounts_updated_at BEFORE
update on crm.accounts for EACH row
execute FUNCTION update_updated_at_column ();









create table crm.contacts (
  id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  email text null,
  phone text null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  account_id uuid null,
  is_primary boolean null default false,
  details jsonb null default '{}'::jsonb,
  organization_id uuid null default '55555555-5555-5555-5555-555555555555'::uuid,
  location_id uuid null,
  lifecycle_stage public.lifecycle_stage null default 'lead'::lifecycle_stage,
  status text null default 'NEW'::text,
  contact_type text null default 'standard'::text,
  is_partner_delegate boolean null default false,
  lead_source text null,
  score numeric null default 0,
  company text null,
  industry text null,
  tags text[] null default '{}'::text[],
  last_contacted_at timestamp with time zone null,
  communication_preferences jsonb null default '{}'::jsonb,
  deleted_at timestamp with time zone null,
  source_lead_id uuid null,
  source_customer_id uuid null,
  entity_instance_id uuid null,
  persona_type text null,
  linkedin_url text null,
  last_engaged_at timestamp with time zone null,
  search_vector tsvector GENERATED ALWAYS as (
    setweight(
      to_tsvector(
        'simple'::regconfig,
        (
          (
            (
              (COALESCE(name, ''::text) || ' '::text) || COALESCE(email, ''::text)
            ) || ' '::text
          ) || COALESCE((details #>> '{title}'::text[]), ''::text)
        )
      ),
      'A'::"char"
    )
  ) STORED null,
  vertical jsonb null default '{}'::jsonb,
  custom jsonb null default '{}'::jsonb,
  stage_id text null,
  priority text null default 'Medium'::text,
  display_id text null,
  state_category text null,
  intent_category text null,
  created_by uuid null,
  updated_by uuid null,
  constraint contacts_pkey primary key (id),
  constraint contacts_display_id_key unique (display_id),
  constraint contacts_email_key unique (email),
  constraint contacts_entity_instance_id_key unique (entity_instance_id),
  constraint contacts_id_fkey foreign KEY (id) references unified.contacts (id) on delete CASCADE,
  constraint contacts_account_id_fkey foreign KEY (account_id) references crm.accounts (id) on delete CASCADE,
  constraint fk_external_contacts_unified foreign KEY (id) references unified.contacts (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_crm_contacts_recovery_shell on crm.contacts using btree (deleted_at) TABLESPACE pg_default
where
  (deleted_at is not null);

create index IF not exists idx_crm_contacts_identity_lookup on crm.contacts using btree (organization_id, display_id) INCLUDE (name, status, priority, stage_id) TABLESPACE pg_default;

create index IF not exists idx_crm_contacts_workflow_execution on crm.contacts using btree (organization_id, stage_id, created_at desc) INCLUDE (name, display_id, status, priority) TABLESPACE pg_default;

create index IF not exists idx_crm_contacts_universal_timeline on crm.contacts using btree (organization_id, location_id, created_at desc, id) INCLUDE (name, email, id, phone, company) TABLESPACE pg_default;

create trigger sys_trg_register_unified_object
after INSERT
or
update on crm.contacts for EACH row
execute FUNCTION core.sys_trg_register_unified_object ();

create trigger trg_cleanup_orphaned_contact
after DELETE on crm.contacts for EACH row
execute FUNCTION unified.trg_cleanup_orphaned_contact ();

create trigger trg_cleanup_orphaned_contacts
after DELETE on crm.contacts for EACH row
execute FUNCTION unified.trg_cleanup_orphaned_contacts ();

create trigger trg_set_display_id BEFORE INSERT on crm.contacts for EACH row
execute FUNCTION core.core_trigger_set_display_id_v3 ();

create trigger update_contacts_updated_at BEFORE
update on crm.contacts for EACH row
execute FUNCTION update_updated_at_column ();

create trigger utils_ensure_single_primary_contact
after INSERT
or
update on crm.contacts for EACH row when (new.is_primary is true)
execute FUNCTION crm.utils_set_single_primary_contact_trigger ();






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

create index IF not exists idx_identity_organizations_recovery_shell on identity.organizations using btree (deleted_at) TABLESPACE pg_default
where
  (deleted_at is not null);









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
  details__name__family text GENERATED ALWAYS as ((details #>> '{person,name,family}'::text[])) STORED null,
  details__name__given text GENERATED ALWAYS as ((details #>> '{person,name,given}'::text[])) STORED null,
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
  constraint organization_users_pkey primary key (id),
  constraint uq_organization_user unique (organization_id, user_id),
  constraint organization_users_location_id_fkey foreign KEY (location_id) references identity.locations (id) not VALID,
  constraint organization_users_manager_id_fkey foreign KEY (manager_id) references identity.users (id) not VALID,
  constraint organization_users_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint organization_users_updated_by_fkey foreign KEY (updated_by) references identity.users (id),
  constraint organization_users_user_id_fkey foreign KEY (user_id) references identity.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_identity_organization_users_universal_timeline on identity.organization_users using btree (organization_id, created_at desc, id) TABLESPACE pg_default;

create index IF not exists idx_identity_organization_users_hierarchy_gist on identity.organization_users using gist (path) TABLESPACE pg_default
where
  (deleted_at is null);

create index IF not exists idx_identity_organization_users_identity_lookup on identity.organization_users using btree (organization_id, created_by) INCLUDE (
  details__name__family,
  details__name__given,
  user_id,
  persona_type
) TABLESPACE pg_default
where
  (deleted_at is null);

create index IF not exists idx_identity_organization_users_recovery_shell on identity.organization_users using btree (deleted_at) TABLESPACE pg_default
where
  (deleted_at is not null);

create trigger reassign_reports_on_deactivation_trg
after
update OF is_active on identity.organization_users for EACH row
execute FUNCTION identity.reassign_reports_on_deactivation ();

create trigger trg_update_org_user_path BEFORE INSERT
or
update OF manager_id on identity.organization_users for EACH row
execute FUNCTION identity.update_organization_user_path ();