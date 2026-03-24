CREATE TYPE identity.rls_session_context_t AS (
	current_org_id uuid,
	my_user_id uuid,
	my_org_user_id uuid,
	my_persona text,
	contact_id uuid,
	account_ids uuid[],
	vendor_ids uuid[],
	subordinate_user_ids uuid[],
	my_location_id uuid,
	accessible_location_ids uuid[],
	role_names text[],
	permissions jsonb,
	has_hr_access boolean,
	has_finance_access boolean,
	team_ids uuid[],
	team_location_ids uuid[],
	is_saas_admin boolean,
	my_org_path text,
	my_location_path text
);

CREATE TABLE identity.location_types (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    level smallint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    search_vector tsvector GENERATED ALWAYS AS (setweight(to_tsvector('simple'::regconfig, COALESCE(name, ''::text)), 'A'::"char")) STORED,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);

CREATE TABLE identity.locations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    time_zone text DEFAULT 'UTC'::text NOT NULL,
    working_hours jsonb DEFAULT '{}'::jsonb,
    settings jsonb DEFAULT '[]'::jsonb,
    service_area jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    short_code text,
    app_settings jsonb,
    parent_id uuid,
    location_type_id uuid,
    path extensions.ltree,
    deleted_at timestamp with time zone,
    vertical jsonb DEFAULT '{}'::jsonb,
    custom jsonb DEFAULT '{}'::jsonb,
    search_vector tsvector GENERATED ALWAYS AS (setweight(to_tsvector('simple'::regconfig, COALESCE(name, ''::text)), 'A'::"char")) STORED
);

CREATE TABLE identity.modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    prefix text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    sub_modules jsonb DEFAULT '{}'::jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    notes jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    settings__expense__categories text[] GENERATED ALWAYS AS (NULLIF(core.met_util_cast_jsonb_array((settings #> '{expense,categories}'::text[])), ARRAY[]::text[])) STORED,
    settings__expense_policy__categories text[] GENERATED ALWAYS AS (NULLIF(core.met_util_cast_jsonb_array((settings #> '{expense_policy,categories}'::text[])), ARRAY[]::text[])) STORED,
    search_vector tsvector GENERATED ALWAYS AS (setweight(to_tsvector('simple'::regconfig, ((((((((COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(((settings #> '{expense,categories}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((settings #> '{expense_policy,categories}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((settings #> '{public,expense,categories}'::text[]))::text, ''::text))), 'A'::"char")) STORED,
    settings__ai_enabled boolean GENERATED ALWAYS AS (((settings #>> '{ai_enabled}'::text[]))::boolean) STORED,
    settings__data_partition text GENERATED ALWAYS AS ((settings #>> '{data_partition}'::text[])) STORED,
    settings__default_agents text GENERATED ALWAYS AS ((settings #>> '{default_agents}'::text[])) STORED,
    settings__expense__approval_required boolean GENERATED ALWAYS AS (((settings #>> '{public,expense,approval_required}'::text[]))::boolean) STORED,
    settings__expense__currency text GENERATED ALWAYS AS ((settings #>> '{expense,currency}'::text[])) STORED,
    settings__expense__max_limit_per_day integer GENERATED ALWAYS AS (((settings #>> '{expense,max_limit_per_day}'::text[]))::integer) STORED,
    settings__expense__receipt_required boolean GENERATED ALWAYS AS (((settings #>> '{expense,receipt_required}'::text[]))::boolean) STORED,
    settings__expense_policy__approval_required boolean GENERATED ALWAYS AS (((settings #>> '{expense_policy,approval_required}'::text[]))::boolean) STORED,
    settings__expense_policy__currency text GENERATED ALWAYS AS ((settings #>> '{expense_policy,currency}'::text[])) STORED,
    settings__expense_policy__max_limit_per_day integer GENERATED ALWAYS AS (((settings #>> '{expense_policy,max_limit_per_day}'::text[]))::integer) STORED,
    settings__expense_policy__receipt_required boolean GENERATED ALWAYS AS (((settings #>> '{expense_policy,receipt_required}'::text[]))::boolean) STORED,
    settings__h text GENERATED ALWAYS AS ((settings #>> '{h}'::text[])) STORED,
    settings__inventory_management__auto_reorder boolean GENERATED ALWAYS AS (((settings #>> '{inventory_management,auto_reorder}'::text[]))::boolean) STORED,
    settings__leaves__annual_leave integer GENERATED ALWAYS AS (((settings #>> '{public,leaves,annual_leave}'::text[]))::integer) STORED,
    settings__leaves__approval_levels integer GENERATED ALWAYS AS (((settings #>> '{leaves,approval_levels}'::text[]))::integer) STORED,
    settings__leaves__carry_forward boolean GENERATED ALWAYS AS (((settings #>> '{public,leaves,carry_forward}'::text[]))::boolean) STORED,
    settings__leaves__casual_leave integer GENERATED ALWAYS AS (((settings #>> '{public,leaves,casual_leave}'::text[]))::integer) STORED,
    settings__leaves__default_approval text GENERATED ALWAYS AS ((settings #>> '{public,leaves,default_approval}'::text[])) STORED,
    settings__leaves__encashment_enabled boolean GENERATED ALWAYS AS (((settings #>> '{leaves,encashment_enabled}'::text[]))::boolean) STORED,
    settings__leaves__leave_half_day_enabled boolean GENERATED ALWAYS AS (((settings #>> '{leaves,leave_half_day_enabled}'::text[]))::boolean) STORED,
    settings__leaves__max_carry_forward_days integer GENERATED ALWAYS AS (((settings #>> '{public,leaves,max_carry_forward_days}'::text[]))::integer) STORED,
    settings__leaves__schema text GENERATED ALWAYS AS ((settings #>> '{leaves,schema}'::text[])) STORED,
    settings__leaves__sick_leave integer GENERATED ALWAYS AS (((settings #>> '{public,leaves,sick_leave}'::text[]))::integer) STORED,
    settings__leaves_policy__annual_leave integer GENERATED ALWAYS AS (((settings #>> '{leaves_policy,annual_leave}'::text[]))::integer) STORED,
    settings__leaves_policy__approval_levels integer GENERATED ALWAYS AS (((settings #>> '{leaves_policy,approval_levels}'::text[]))::integer) STORED,
    settings__leaves_policy__carry_forward boolean GENERATED ALWAYS AS (((settings #>> '{leaves_policy,carry_forward}'::text[]))::boolean) STORED,
    settings__leaves_policy__casual_leave integer GENERATED ALWAYS AS (((settings #>> '{leaves_policy,casual_leave}'::text[]))::integer) STORED,
    settings__leaves_policy__default_approval text GENERATED ALWAYS AS ((settings #>> '{leaves_policy,default_approval}'::text[])) STORED,
    settings__leaves_policy__encashment_enabled boolean GENERATED ALWAYS AS (((settings #>> '{leaves_policy,encashment_enabled}'::text[]))::boolean) STORED,
    settings__leaves_policy__leave_half_day_enabled boolean GENERATED ALWAYS AS (((settings #>> '{leaves_policy,leave_half_day_enabled}'::text[]))::boolean) STORED,
    settings__leaves_policy__max_carry_forward_days integer GENERATED ALWAYS AS (((settings #>> '{leaves_policy,max_carry_forward_days}'::text[]))::integer) STORED,
    settings__leaves_policy__sick_leave integer GENERATED ALWAYS AS (((settings #>> '{leaves_policy,sick_leave}'::text[]))::integer) STORED,
    settings__stock_thresholds__low_stock integer GENERATED ALWAYS AS (((settings #>> '{inventory_management,stock_thresholds,low_stock}'::text[]))::integer) STORED,
    settings__stock_thresholds__reorder_point integer GENERATED ALWAYS AS (((settings #>> '{inventory_management,stock_thresholds,reorder_point}'::text[]))::integer) STORED,
    sub_modules__accounts__description text GENERATED ALWAYS AS ((sub_modules #>> '{accounts,description}'::text[])) STORED,
    sub_modules__accounts__enabled boolean GENERATED ALWAYS AS (((sub_modules #>> '{accounts,enabled}'::text[]))::boolean) STORED,
    sub_modules__activities boolean GENERATED ALWAYS AS (((sub_modules #>> '{activities}'::text[]))::boolean) STORED,
    sub_modules__ai boolean GENERATED ALWAYS AS (((sub_modules #>> '{ai}'::text[]))::boolean) STORED,
    sub_modules__analytics boolean GENERATED ALWAYS AS (((sub_modules #>> '{analytics}'::text[]))::boolean) STORED,
    sub_modules__barcode_scanning boolean GENERATED ALWAYS AS (((sub_modules #>> '{barcode_scanning}'::text[]))::boolean) STORED,
    sub_modules__businesses boolean GENERATED ALWAYS AS (((sub_modules #>> '{businesses}'::text[]))::boolean) STORED,
    sub_modules__catalog boolean GENERATED ALWAYS AS (((sub_modules #>> '{catalog}'::text[]))::boolean) STORED,
    "sub_modules__client-contacts" boolean GENERATED ALWAYS AS (((sub_modules #>> '{client-contacts}'::text[]))::boolean) STORED,
    sub_modules__clients boolean GENERATED ALWAYS AS (((sub_modules #>> '{clients}'::text[]))::boolean) STORED,
    sub_modules__config boolean GENERATED ALWAYS AS (((sub_modules #>> '{config}'::text[]))::boolean) STORED,
    "sub_modules__crud-view" boolean GENERATED ALWAYS AS (((sub_modules #>> '{crud-view}'::text[]))::boolean) STORED,
    sub_modules__cycle_counting boolean GENERATED ALWAYS AS (((sub_modules #>> '{cycle_counting}'::text[]))::boolean) STORED,
    sub_modules__dashboards__description text GENERATED ALWAYS AS ((sub_modules #>> '{dashboards,description}'::text[])) STORED,
    sub_modules__dashboards__enabled boolean GENERATED ALWAYS AS (((sub_modules #>> '{dashboards,enabled}'::text[]))::boolean) STORED,
    sub_modules__data boolean GENERATED ALWAYS AS (((sub_modules #>> '{data}'::text[]))::boolean) STORED,
    "sub_modules__eventPass" boolean GENERATED ALWAYS AS (((sub_modules #>> '{eventPass}'::text[]))::boolean) STORED,
    sub_modules__expenses boolean GENERATED ALWAYS AS (((sub_modules #>> '{expenses}'::text[]))::boolean) STORED,
    sub_modules__insights__description text GENERATED ALWAYS AS ((sub_modules #>> '{insights,description}'::text[])) STORED,
    sub_modules__insights__enabled boolean GENERATED ALWAYS AS (((sub_modules #>> '{insights,enabled}'::text[]))::boolean) STORED,
    sub_modules__inventory_reports boolean GENERATED ALWAYS AS (((sub_modules #>> '{inventory_reports}'::text[]))::boolean) STORED,
    sub_modules__inventory_transactions boolean GENERATED ALWAYS AS (((sub_modules #>> '{inventory_transactions}'::text[]))::boolean) STORED,
    sub_modules__inventory_valuation boolean GENERATED ALWAYS AS (((sub_modules #>> '{inventory_valuation}'::text[]))::boolean) STORED,
    sub_modules__invoices boolean GENERATED ALWAYS AS (((sub_modules #>> '{invoices}'::text[]))::boolean) STORED,
    sub_modules__item_category boolean GENERATED ALWAYS AS (((sub_modules #>> '{item_category}'::text[]))::boolean) STORED,
    sub_modules__item_master boolean GENERATED ALWAYS AS (((sub_modules #>> '{item_master}'::text[]))::boolean) STORED,
    sub_modules__leaves boolean GENERATED ALWAYS AS (((sub_modules #>> '{leaves}'::text[]))::boolean) STORED,
    "sub_modules__location-categories" boolean GENERATED ALWAYS AS (((sub_modules #>> '{location-categories}'::text[]))::boolean) STORED,
    sub_modules__login boolean GENERATED ALWAYS AS (((sub_modules #>> '{login}'::text[]))::boolean) STORED,
    sub_modules__logistics__description text GENERATED ALWAYS AS ((sub_modules #>> '{logistics,description}'::text[])) STORED,
    sub_modules__logistics__enabled boolean GENERATED ALWAYS AS (((sub_modules #>> '{logistics,enabled}'::text[]))::boolean) STORED,
    sub_modules__members boolean GENERATED ALWAYS AS (((sub_modules #>> '{members}'::text[]))::boolean) STORED,
    "sub_modules__my-tickets" boolean GENERATED ALWAYS AS (((sub_modules #>> '{my-tickets}'::text[]))::boolean) STORED,
    sub_modules__networking boolean GENERATED ALWAYS AS (((sub_modules #>> '{networking}'::text[]))::boolean) STORED,
    sub_modules__nlp boolean GENERATED ALWAYS AS (((sub_modules #>> '{nlp}'::text[]))::boolean) STORED,
    sub_modules__notifications boolean GENERATED ALWAYS AS (((sub_modules #>> '{notifications}'::text[]))::boolean) STORED,
    sub_modules__onboarding__description text GENERATED ALWAYS AS ((sub_modules #>> '{onboarding,description}'::text[])) STORED,
    sub_modules__onboarding__enabled boolean GENERATED ALWAYS AS (((sub_modules #>> '{onboarding,enabled}'::text[]))::boolean) STORED,
    sub_modules__organizations boolean GENERATED ALWAYS AS (((sub_modules #>> '{organizations}'::text[]))::boolean) STORED,
    sub_modules__permissions boolean GENERATED ALWAYS AS (((sub_modules #>> '{permissions}'::text[]))::boolean) STORED,
    sub_modules__process boolean GENERATED ALWAYS AS (((sub_modules #>> '{process}'::text[]))::boolean) STORED,
    sub_modules__profile boolean GENERATED ALWAYS AS (((sub_modules #>> '{profile}'::text[]))::boolean) STORED,
    sub_modules__projects boolean GENERATED ALWAYS AS (((sub_modules #>> '{projects}'::text[]))::boolean) STORED,
    sub_modules__replenishment boolean GENERATED ALWAYS AS (((sub_modules #>> '{replenishment}'::text[]))::boolean) STORED,
    sub_modules__reports__description text GENERATED ALWAYS AS ((sub_modules #>> '{reports,description}'::text[])) STORED,
    sub_modules__reports__enabled boolean GENERATED ALWAYS AS (((sub_modules #>> '{reports,enabled}'::text[]))::boolean) STORED,
    sub_modules__returns_handling boolean GENERATED ALWAYS AS (((sub_modules #>> '{returns_handling}'::text[]))::boolean) STORED,
    sub_modules__risk__description text GENERATED ALWAYS AS ((sub_modules #>> '{risk,description}'::text[])) STORED,
    sub_modules__risk__enabled boolean GENERATED ALWAYS AS (((sub_modules #>> '{risk,enabled}'::text[]))::boolean) STORED,
    sub_modules__sales__description text GENERATED ALWAYS AS ((sub_modules #>> '{sales,description}'::text[])) STORED,
    sub_modules__sales__enabled boolean GENERATED ALWAYS AS (((sub_modules #>> '{sales,enabled}'::text[]))::boolean) STORED,
    sub_modules__scheduling__description text GENERATED ALWAYS AS ((sub_modules #>> '{scheduling,description}'::text[])) STORED,
    sub_modules__scheduling__enabled boolean GENERATED ALWAYS AS (((sub_modules #>> '{scheduling,enabled}'::text[]))::boolean) STORED,
    sub_modules__screening__description text GENERATED ALWAYS AS ((sub_modules #>> '{screening,description}'::text[])) STORED,
    sub_modules__screening__enabled boolean GENERATED ALWAYS AS (((sub_modules #>> '{screening,enabled}'::text[]))::boolean) STORED,
    "sub_modules__service-assets" boolean GENERATED ALWAYS AS (((sub_modules #>> '{service-assets}'::text[]))::boolean) STORED,
    "sub_modules__service-categories" boolean GENERATED ALWAYS AS (((sub_modules #>> '{service-categories}'::text[]))::boolean) STORED,
    "sub_modules__service-contracts" boolean GENERATED ALWAYS AS (((sub_modules #>> '{service-contracts}'::text[]))::boolean) STORED,
    "sub_modules__service-invoices" boolean GENERATED ALWAYS AS (((sub_modules #>> '{service-invoices}'::text[]))::boolean) STORED,
    "sub_modules__service-offerings" boolean GENERATED ALWAYS AS (((sub_modules #>> '{service-offerings}'::text[]))::boolean) STORED,
    "sub_modules__service-reports" boolean GENERATED ALWAYS AS (((sub_modules #>> '{service-reports}'::text[]))::boolean) STORED,
    "sub_modules__service-types" boolean GENERATED ALWAYS AS (((sub_modules #>> '{service-types}'::text[]))::boolean) STORED,
    sub_modules__settings boolean GENERATED ALWAYS AS (((sub_modules #>> '{settings}'::text[]))::boolean) STORED,
    sub_modules__settlement__description text GENERATED ALWAYS AS ((sub_modules #>> '{settlement,description}'::text[])) STORED,
    sub_modules__settlement__enabled boolean GENERATED ALWAYS AS (((sub_modules #>> '{settlement,enabled}'::text[]))::boolean) STORED,
    sub_modules__shopping boolean GENERATED ALWAYS AS (((sub_modules #>> '{shopping}'::text[]))::boolean) STORED,
    sub_modules__signup boolean GENERATED ALWAYS AS (((sub_modules #>> '{signup}'::text[]))::boolean) STORED,
    sub_modules__sourcing__description text GENERATED ALWAYS AS ((sub_modules #>> '{sourcing,description}'::text[])) STORED,
    sub_modules__sourcing__enabled boolean GENERATED ALWAYS AS (((sub_modules #>> '{sourcing,enabled}'::text[]))::boolean) STORED,
    sub_modules__stock_management boolean GENERATED ALWAYS AS (((sub_modules #>> '{stock_management}'::text[]))::boolean) STORED,
    sub_modules__stock_transfers boolean GENERATED ALWAYS AS (((sub_modules #>> '{stock_transfers}'::text[]))::boolean) STORED,
    sub_modules__subscriptions boolean GENERATED ALWAYS AS (((sub_modules #>> '{subscriptions}'::text[]))::boolean) STORED,
    sub_modules__support__description text GENERATED ALWAYS AS ((sub_modules #>> '{support,description}'::text[])) STORED,
    sub_modules__support__enabled boolean GENERATED ALWAYS AS (((sub_modules #>> '{support,enabled}'::text[]))::boolean) STORED,
    sub_modules__tasks boolean GENERATED ALWAYS AS (((sub_modules #>> '{tasks}'::text[]))::boolean) STORED,
    sub_modules__teams boolean GENERATED ALWAYS AS (((sub_modules #>> '{teams}'::text[]))::boolean) STORED,
    sub_modules__test__enabled boolean GENERATED ALWAYS AS (((sub_modules #>> '{test,enabled}'::text[]))::boolean) STORED,
    sub_modules__test__entity_schema text GENERATED ALWAYS AS ((sub_modules #>> '{test,entity_schema}'::text[])) STORED,
    sub_modules__test__entity_type text GENERATED ALWAYS AS ((sub_modules #>> '{test,entity_type}'::text[])) STORED,
    sub_modules__tickets boolean GENERATED ALWAYS AS (((sub_modules #>> '{tickets}'::text[]))::boolean) STORED,
    sub_modules__timesheets boolean GENERATED ALWAYS AS (((sub_modules #>> '{timesheets}'::text[]))::boolean) STORED,
    sub_modules__tracking boolean GENERATED ALWAYS AS (((sub_modules #>> '{tracking}'::text[]))::boolean) STORED,
    sub_modules__trading__description text GENERATED ALWAYS AS ((sub_modules #>> '{trading,description}'::text[])) STORED,
    sub_modules__trading__enabled boolean GENERATED ALWAYS AS (((sub_modules #>> '{trading,enabled}'::text[]))::boolean) STORED,
    "sub_modules__user-setting" boolean GENERATED ALWAYS AS (((sub_modules #>> '{user-setting}'::text[]))::boolean) STORED,
    "sub_modules__user-settings" boolean GENERATED ALWAYS AS (((sub_modules #>> '{user-settings}'::text[]))::boolean) STORED,
    sub_modules__users boolean GENERATED ALWAYS AS (((sub_modules #>> '{users}'::text[]))::boolean) STORED,
    "sub_modules__users-view" boolean GENERATED ALWAYS AS (((sub_modules #>> '{users-view}'::text[]))::boolean) STORED,
    sub_modules__warehousing boolean GENERATED ALWAYS AS (((sub_modules #>> '{warehousing}'::text[]))::boolean) STORED,
    sub_modules__workflows boolean GENERATED ALWAYS AS (((sub_modules #>> '{workflows}'::text[]))::boolean) STORED,
    organization_id uuid,
    created_by uuid,
    updated_by uuid
);

CREATE TABLE identity.org_module_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    module_id uuid,
    location_id uuid,
    sub_modules jsonb DEFAULT '{}'::jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    scope_level text DEFAULT 'organization'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    settings__leave_policies__name text GENERATED ALWAYS AS ((settings #>> '{leave_policies,name}'::text[])) STORED,
    search_vector tsvector GENERATED ALWAYS AS (setweight(to_tsvector('simple'::regconfig, ((COALESCE(((settings #> '{expense,categories}'::text[]))::text, ''::text) || ' '::text) || COALESCE((settings #>> '{leave_policies,name}'::text[]), ''::text))), 'A'::"char")) STORED
);

CREATE TABLE identity.organization_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    location_id uuid,
    manager_id uuid,
    is_active boolean DEFAULT true,
    role_status public.user_status DEFAULT 'OFFLINE'::public.user_status,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    path extensions.ltree,
    details jsonb DEFAULT '{}'::jsonb,
    deleted_at timestamp with time zone,
    persona_type text DEFAULT 'worker'::text,
    is_field_staff boolean DEFAULT false,
    search_vector tsvector GENERATED ALWAYS AS (setweight(to_tsvector('simple'::regconfig, ((COALESCE((details #>> '{person,name,family}'::text[]), ''::text) || ' '::text) || COALESCE((details #>> '{person,name,given}'::text[]), ''::text))), 'A'::"char")) STORED,
    display_id text
);

CREATE TABLE identity.organizations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    subdomain text,
    module_features jsonb DEFAULT '["core", "contracts", "public", "auth", "crm", "fsm", "admin", "inventory", "settings", "support"]'::jsonb,
    details jsonb DEFAULT '{}'::jsonb,
    app_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    subscription_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000'::uuid,
    settings jsonb DEFAULT '{"holidays": [{"date": "2025-04-09", "name": "zz"}], "localization": {"currency": "INR", "time_zone": "GMT+5:30", "date_format": "DD/MM/YYYY", "time_format": "24-hour", "week_start_day": "Monday"}}'::jsonb,
    auth_id uuid,
    created_by uuid,
    updated_by uuid,
    theme_config jsonb DEFAULT '{"mode": "light", "brandName": "Zoworks", "primaryColor": "#1890ff"}'::jsonb,
    enabled_languages text[] DEFAULT '{en}'::text[],
    default_language text DEFAULT 'en'::text,
    is_demo boolean DEFAULT false,
    claimed_by_contact_id uuid,
    claimed_at timestamp with time zone,
    tier text DEFAULT 'free'::text,
    deleted_at timestamp with time zone,
    vertical jsonb DEFAULT '{}'::jsonb,
    app_settings__name text GENERATED ALWAYS AS ((app_settings #>> '{name}'::text[])) STORED,
    custom jsonb DEFAULT '{}'::jsonb,
    custom__ai_overrides__name text GENERATED ALWAYS AS ((custom #>> '{ai_overrides,name}'::text[])) STORED,
    details__supplier_name text GENERATED ALWAYS AS ((details #>> '{supplier_name}'::text[])) STORED,
    is_system_org boolean DEFAULT false,
    search_vector tsvector GENERATED ALWAYS AS (setweight(to_tsvector('simple'::regconfig, ((((((COALESCE((app_settings #>> '{name}'::text[]), ''::text) || ' '::text) || COALESCE((custom #>> '{ai_overrides,name}'::text[]), ''::text)) || ' '::text) || COALESCE((details #>> '{supplier_name}'::text[]), ''::text)) || ' '::text) || COALESCE(name, ''::text))), 'A'::"char")) STORED,
    is_active boolean DEFAULT true,
    organization_id uuid,
    CONSTRAINT organizations_tier_check CHECK ((tier = ANY (ARRAY['free'::text, 'pro'::text, 'enterprise'::text])))
);

CREATE TABLE identity.roles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid,
    name text NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb,
    is_sassadmin boolean DEFAULT false,
    ui_order bigint,
    rls_policy jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    feature jsonb DEFAULT '{}'::jsonb,
    location_id uuid,
    is_active boolean DEFAULT true,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    search_vector tsvector GENERATED ALWAYS AS (setweight(to_tsvector('simple'::regconfig, ((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((COALESCE(name, ''::text) || ' '::text) || COALESCE(((permissions #> '{crm,deals}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{crm,leads}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{crm,contacts}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{crm,crm-deals}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{crm,crm-leads}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{crm,crm-accounts}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{crm,crm-contacts}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{fsm,tracking}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{fsm,my-tickets}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{core,profile}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{core,user-setting}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{core,organizations}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{core,user-settings}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{admin,teams}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{admin,catalog}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{admin,process}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{admin,tickets}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{admin,projects}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{admin,settings}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{admin,crud-page}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{admin,businesses}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{admin,"users copy"}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{admin,notifications}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{admin,organizations}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{admin,subscriptions}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{admin,"users copy copy"}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{admin,"organizations copy"}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{public,subscriptions}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{support,service-invoices}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{settings,ai}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{settings,nlp}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{settings,data}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{settings,config}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{settings,settings}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{settings,workflow}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{settings,workflows}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{settings,permissions}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{settings,user-setting}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{settings,user-settings}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{workforce,users}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{workforce,expenses}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{workforce,timesheets}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{networking,members}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{networking,profile}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{networking,eventPass}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{networking,businesses}'::text[]))::text, ''::text)) || ' '::text) || COALESCE(((permissions #> '{networking,networking}'::text[]))::text, ''::text))), 'A'::"char")) STORED,
    vertical jsonb DEFAULT '{}'::jsonb,
    custom jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE identity.teams (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    location_id uuid NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    search_vector tsvector GENERATED ALWAYS AS (setweight(to_tsvector('simple'::regconfig, COALESCE(name, ''::text)), 'A'::"char")) STORED
);

CREATE TABLE identity.user_roles (
    organization_user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    team_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_assigned_at timestamp with time zone,
    created_by uuid,
    organization_id uuid,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    updated_by uuid
);

CREATE TABLE identity.user_teams (
    organization_user_id uuid NOT NULL,
    team_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    last_assigned_at timestamp with time zone,
    id uuid DEFAULT gen_random_uuid(),
    organization_id uuid,
    updated_by uuid
);

CREATE TABLE identity.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auth_id uuid,
    name text,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    privacy jsonb DEFAULT '{"groups": ["Contact Info"]}'::jsonb,
    password_confirmed boolean,
    subscriptions jsonb DEFAULT '{}'::jsonb,
    relationship_details jsonb DEFAULT '{}'::jsonb,
    profile_privacy jsonb DEFAULT '{"Contact Info": false}'::jsonb,
    post_read_statuses jsonb DEFAULT '{}'::jsonb,
    pref_organization_id uuid,
    email text,
    mobile text,
    auth_provider text DEFAULT 'email'::text,
    auth_provider_id text,
    last_login_at timestamp with time zone,
    deleted_at timestamp with time zone,
    search_vector tsvector,
    CONSTRAINT users_auth_provider_check CHECK ((auth_provider = ANY (ARRAY['email'::text, 'google'::text, 'microsoft'::text, 'github'::text, 'saml'::text]))),
    CONSTRAINT users_email_format_check CHECK (((email IS NULL) OR (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))),
    CONSTRAINT users_mobile_format_check CHECK (((mobile IS NULL) OR (mobile ~ '^\+?[1-9]\d{1,14}$'::text)))
);

ALTER TABLE ONLY identity.location_types
    ADD CONSTRAINT location_types_pkey PRIMARY KEY (id);

ALTER TABLE ONLY identity.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY identity.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY identity.org_module_configs
    ADD CONSTRAINT org_module_configs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY identity.organization_users
    ADD CONSTRAINT organization_users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY identity.organizations
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);

ALTER TABLE ONLY identity.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY identity.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);

ALTER TABLE ONLY identity.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY identity.user_teams
    ADD CONSTRAINT user_teams_pkey PRIMARY KEY (organization_user_id, team_id);

ALTER TABLE ONLY identity.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY identity.location_types
    ADD CONSTRAINT location_types_created_by_fkey FOREIGN KEY (created_by) REFERENCES identity.users(id);

ALTER TABLE ONLY identity.location_types
    ADD CONSTRAINT location_types_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES identity.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY identity.location_types
    ADD CONSTRAINT location_types_organization_id_name_key UNIQUE (organization_id, name);

ALTER TABLE ONLY identity.locations
    ADD CONSTRAINT locations_created_by_fkey FOREIGN KEY (created_by) REFERENCES identity.users(id);

ALTER TABLE ONLY identity.locations
    ADD CONSTRAINT locations_location_type_id_fkey FOREIGN KEY (location_type_id) REFERENCES identity.location_types(id) ON DELETE SET NULL;

ALTER TABLE ONLY identity.locations
    ADD CONSTRAINT locations_organization_id_name_key UNIQUE (organization_id, name);

ALTER TABLE ONLY identity.locations
    ADD CONSTRAINT locations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES identity.locations(id) ON DELETE SET NULL;

ALTER TABLE ONLY identity.locations
    ADD CONSTRAINT locations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES identity.users(id);

ALTER TABLE ONLY identity.modules
    ADD CONSTRAINT modules_name_key UNIQUE (name);

ALTER TABLE ONLY identity.org_module_configs
    ADD CONSTRAINT org_module_configs_module_id_fkey FOREIGN KEY (module_id) REFERENCES identity.modules(id);

ALTER TABLE ONLY identity.org_module_configs
    ADD CONSTRAINT org_module_configs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES identity.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY identity.organization_users
    ADD CONSTRAINT organization_users_created_by_fkey FOREIGN KEY (created_by) REFERENCES identity.users(id);

ALTER TABLE ONLY identity.organization_users
    ADD CONSTRAINT organization_users_location_id_fkey FOREIGN KEY (location_id) REFERENCES identity.locations(id) NOT VALID;

ALTER TABLE ONLY identity.organization_users
    ADD CONSTRAINT organization_users_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES identity.organization_users(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE ONLY identity.organization_users
    ADD CONSTRAINT organization_users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES identity.organizations(id);

ALTER TABLE ONLY identity.organization_users
    ADD CONSTRAINT organization_users_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES identity.users(id);

ALTER TABLE ONLY identity.organization_users
    ADD CONSTRAINT organization_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES identity.users(id);

ALTER TABLE ONLY identity.organization_users
    ADD CONSTRAINT uq_organization_user UNIQUE (organization_id, user_id);

ALTER TABLE ONLY identity.organizations
    ADD CONSTRAINT organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES identity.users(id);

ALTER TABLE ONLY identity.organizations
    ADD CONSTRAINT organizations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES identity.users(id);

ALTER TABLE ONLY identity.organizations
    ADD CONSTRAINT tenants_subdomain_key UNIQUE (subdomain);

ALTER TABLE ONLY identity.roles
    ADD CONSTRAINT roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES identity.users(id) NOT VALID;

ALTER TABLE ONLY identity.roles
    ADD CONSTRAINT roles_location_id_fkey FOREIGN KEY (location_id) REFERENCES identity.locations(id) NOT VALID;

ALTER TABLE ONLY identity.roles
    ADD CONSTRAINT roles_organization_id_name_key UNIQUE (organization_id, name);

ALTER TABLE ONLY identity.roles
    ADD CONSTRAINT roles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES identity.users(id) NOT VALID;

ALTER TABLE ONLY identity.teams
    ADD CONSTRAINT teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES identity.users(id) NOT VALID;

ALTER TABLE ONLY identity.teams
    ADD CONSTRAINT teams_location_id_fkey FOREIGN KEY (location_id) REFERENCES identity.locations(id) NOT VALID;

ALTER TABLE ONLY identity.teams
    ADD CONSTRAINT teams_location_name_unique UNIQUE (location_id, name);

ALTER TABLE ONLY identity.teams
    ADD CONSTRAINT teams_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES identity.users(id) NOT VALID;

ALTER TABLE ONLY identity.user_roles
    ADD CONSTRAINT uq_user_roles_assignment UNIQUE NULLS NOT DISTINCT (organization_user_id, role_id, team_id);

ALTER TABLE ONLY identity.user_roles
    ADD CONSTRAINT uq_user_roles_id UNIQUE (id);

ALTER TABLE ONLY identity.user_roles
    ADD CONSTRAINT user_roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES identity.users(id);

ALTER TABLE ONLY identity.user_roles
    ADD CONSTRAINT user_roles_organization_user_id_fkey FOREIGN KEY (organization_user_id) REFERENCES identity.organization_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY identity.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES identity.roles(id) NOT VALID;

ALTER TABLE ONLY identity.user_roles
    ADD CONSTRAINT user_roles_team_id_fkey FOREIGN KEY (team_id) REFERENCES identity.teams(id) NOT VALID;

ALTER TABLE ONLY identity.user_teams
    ADD CONSTRAINT user_teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES identity.users(id) NOT VALID;

ALTER TABLE ONLY identity.user_teams
    ADD CONSTRAINT user_teams_id_key UNIQUE (id);

ALTER TABLE ONLY identity.user_teams
    ADD CONSTRAINT user_teams_organization_user_id_fkey FOREIGN KEY (organization_user_id) REFERENCES identity.organization_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY identity.user_teams
    ADD CONSTRAINT user_teams_team_id_fkey FOREIGN KEY (team_id) REFERENCES identity.teams(id) NOT VALID;

ALTER TABLE ONLY identity.users
    ADD CONSTRAINT users_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY identity.users
    ADD CONSTRAINT users_auth_id_key UNIQUE (auth_id);

ALTER TABLE ONLY identity.users
    ADD CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES identity.users(id) NOT VALID;

ALTER TABLE ONLY identity.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);

ALTER TABLE ONLY identity.users
    ADD CONSTRAINT users_mobile_unique UNIQUE (mobile);

ALTER TABLE ONLY identity.users
    ADD CONSTRAINT users_pref_organization_id_fkey FOREIGN KEY (pref_organization_id) REFERENCES identity.organizations(id) ON DELETE SET NULL;

ALTER TABLE ONLY identity.users
    ADD CONSTRAINT users_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES identity.users(id);

CREATE INDEX idx_identity_modules_org_id ON identity.modules USING btree (organization_id);

CREATE INDEX idx_identity_modules_search ON identity.modules USING gin (search_vector);

CREATE INDEX idx_identity_org_module_configs_search ON identity.org_module_configs USING gin (search_vector);

CREATE INDEX idx_identity_org_module_configs_universal_timeline ON identity.org_module_configs USING btree (organization_id, created_at DESC, id) INCLUDE (settings__leave_policies__name, id, scope_level, created_at, updated_at);

CREATE INDEX idx_identity_organizations_org_id ON identity.organizations USING btree (organization_id);

CREATE INDEX idx_identity_organizations_recovery_shell ON identity.organizations USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);

CREATE INDEX idx_identity_organizations_search ON identity.organizations USING gin (search_vector);

CREATE INDEX idx_identity_users_recovery_shell ON identity.users USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);

CREATE INDEX idx_identity_users_search ON identity.users USING gin (search_vector);

CREATE INDEX idx_locations_org_id ON identity.locations USING btree (organization_id);

CREATE INDEX idx_locations_search ON identity.locations USING gin (search_vector);

CREATE INDEX idx_org_users_org_id ON identity.organization_users USING btree (organization_id);

CREATE INDEX idx_organization_users_compound ON identity.organization_users USING btree (organization_id, user_id, is_active, path) WHERE (is_active = true);

CREATE INDEX idx_organization_users_path_btree ON identity.organization_users USING btree (path);

CREATE INDEX idx_organization_users_path_gist ON identity.organization_users USING gist (path);

CREATE INDEX idx_roles_org_id ON identity.roles USING btree (organization_id);

CREATE POLICY "Allow public registration requests" ON identity.organizations FOR INSERT TO anon WITH CHECK ((is_active = false));

CREATE POLICY "Authenticated_Access_V5" ON identity.x_segment_rules TO authenticated USING (true);

CREATE POLICY "Config_Insert_V5" ON identity.roles FOR INSERT TO authenticated WITH CHECK ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Config_Tenant_Or_Global_V5" ON identity.roles TO authenticated USING (((organization_id IS NULL) OR (organization_id = identity.get_current_org_id())));

CREATE POLICY "Global_Read_V5" ON identity.modules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Multi_Org_Access_V5" ON identity.locations TO authenticated USING ((organization_id = ANY (identity.get_my_org_ids())));

CREATE POLICY "Multi_Org_Access_V5" ON identity.organization_users TO authenticated USING ((organization_id = ANY (identity.get_my_org_ids())));

CREATE POLICY "Multi_Org_Access_V5" ON identity.organizations TO authenticated USING ((id = ANY (identity.get_my_org_ids())));

CREATE POLICY "Tenant_Isolation_V5" ON identity.location_types TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON identity.org_module_configs TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON identity.teams TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON identity.user_roles TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON identity.user_teams TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON identity.x_customer_segments TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Write_V5" ON identity.modules TO authenticated USING (((organization_id IS NULL) OR (organization_id = identity.get_current_org_id()))) WITH CHECK ((organization_id = identity.get_current_org_id()));

CREATE POLICY identity_users_cohesion_policy ON identity.users TO authenticated USING (((auth_id = auth.uid()) OR (id IN ( SELECT organization_users.user_id
   FROM identity.organization_users
  WHERE (organization_users.organization_id = ANY (identity.get_my_org_ids()))))));

CREATE TRIGGER reassign_reports_on_deactivation_trg AFTER UPDATE OF is_active ON identity.organization_users FOR EACH ROW EXECUTE FUNCTION identity.reassign_reports_on_deactivation();

CREATE TRIGGER trg_provision_core_unified_objects AFTER INSERT ON identity.locations FOR EACH ROW EXECUTE FUNCTION core.util_trg_provision_bonded_extension('core.unified_objects');

CREATE TRIGGER trg_provision_core_unified_objects AFTER INSERT ON identity.organization_users FOR EACH ROW EXECUTE FUNCTION core.util_trg_provision_bonded_extension('core.unified_objects');

CREATE TRIGGER trg_provision_finance_financial_profiles AFTER INSERT ON identity.organization_users FOR EACH ROW EXECUTE FUNCTION core.util_trg_provision_bonded_extension('finance.financial_profiles');

CREATE TRIGGER trg_provision_hr_profiles AFTER INSERT ON identity.organization_users FOR EACH ROW EXECUTE FUNCTION core.util_trg_provision_bonded_extension('hr.profiles');

CREATE TRIGGER trg_provision_unified_contacts AFTER INSERT ON identity.organization_users FOR EACH ROW EXECUTE FUNCTION core.util_trg_provision_bonded_extension('unified.contacts');

CREATE TRIGGER trg_sync_user_to_unified AFTER INSERT OR UPDATE OF email, name, mobile ON identity.users FOR EACH ROW EXECUTE FUNCTION identity.trg_sync_user_to_unified();

CREATE TRIGGER trg_update_location_path BEFORE INSERT OR UPDATE OF parent_id ON identity.locations FOR EACH ROW EXECUTE FUNCTION identity.update_location_path();

CREATE TRIGGER trg_update_org_user_path BEFORE INSERT OR UPDATE OF manager_id ON identity.organization_users FOR EACH ROW EXECUTE FUNCTION identity.update_organization_user_path();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON identity.location_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON identity.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON identity.modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON identity.org_module_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON identity.organization_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON identity.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON identity.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON identity.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON identity.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON identity.user_teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON identity.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_v_location_types_shard_exec INSTEAD OF INSERT OR UPDATE ON identity.v_location_types FOR EACH ROW EXECUTE FUNCTION identity.trg_v_location_types_shard();

CREATE TRIGGER trg_v_locations_shard_exec INSTEAD OF INSERT OR UPDATE ON identity.v_locations FOR EACH ROW EXECUTE FUNCTION identity.trg_v_locations_shard();

CREATE TRIGGER trg_v_modules_shard_exec INSTEAD OF INSERT OR UPDATE ON identity.v_modules FOR EACH ROW EXECUTE FUNCTION identity.trg_v_modules_shard();

CREATE TRIGGER trg_v_org_module_configs_shard_exec INSTEAD OF INSERT OR UPDATE ON identity.v_org_module_configs FOR EACH ROW EXECUTE FUNCTION identity.trg_v_org_module_configs_shard();

CREATE TRIGGER trg_v_organization_users_shard_exec INSTEAD OF INSERT OR UPDATE ON identity.v_organization_users FOR EACH ROW EXECUTE FUNCTION identity.trg_v_organization_users_shard();

CREATE TRIGGER trg_v_organizations_shard_exec INSTEAD OF INSERT OR UPDATE ON identity.v_organizations FOR EACH ROW EXECUTE FUNCTION identity.trg_v_organizations_shard();

CREATE TRIGGER trg_v_roles_shard_exec INSTEAD OF INSERT OR UPDATE ON identity.v_roles FOR EACH ROW EXECUTE FUNCTION identity.trg_v_roles_shard();

CREATE TRIGGER trg_v_teams_shard_exec INSTEAD OF INSERT OR UPDATE ON identity.v_teams FOR EACH ROW EXECUTE FUNCTION identity.trg_v_teams_shard();

CREATE TRIGGER trg_v_user_roles_shard_exec INSTEAD OF INSERT OR UPDATE ON identity.v_user_roles FOR EACH ROW EXECUTE FUNCTION identity.trg_v_user_roles_shard();

CREATE TRIGGER trg_v_user_teams_shard_exec INSTEAD OF INSERT OR UPDATE ON identity.v_user_teams FOR EACH ROW EXECUTE FUNCTION identity.trg_v_user_teams_shard();

CREATE TRIGGER trg_validate_user_role_assignment BEFORE INSERT OR UPDATE ON identity.user_roles FOR EACH ROW EXECUTE FUNCTION identity.validate_team_assignment();

CREATE FUNCTION identity._rls_get_location_access(p_location_id uuid, p_org_id uuid, p_has_hr_role boolean) RETURNS uuid[]
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_my_loc_path ltree;    -- Now resolves correctly with extensions in search_path
    v_locations uuid[];
BEGIN
    IF NOT COALESCE(p_has_hr_role, false) THEN
        RETURN ARRAY[]::uuid[];
    END IF;
    IF p_location_id IS NULL THEN
        RETURN ARRAY[]::uuid[];
    END IF;
    SELECT l.path INTO v_my_loc_path
    FROM identity.locations l
    WHERE l.id = p_location_id
      AND l.organization_id = p_org_id;
    IF v_my_loc_path IS NOT NULL THEN
        SELECT COALESCE(array_agg(l.id), ARRAY[p_location_id])
        INTO v_locations
        FROM identity.locations l
        WHERE l.path <@ v_my_loc_path      -- ← Now works: extensions schema in search_path
          AND l.organization_id = p_org_id;
    ELSE
        v_locations := ARRAY[p_location_id];
    END IF;
    RETURN v_locations;
END;
$$;

CREATE FUNCTION identity._rls_get_role_context(p_org_user_id uuid, p_org_id uuid) RETURNS TABLE(role_names text[], permissions jsonb, has_hr_access boolean, has_finance_access boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_role_names text[];
    v_permissions jsonb;
BEGIN
    IF p_org_user_id IS NULL THEN
        role_names := ARRAY[]::text[];
        permissions := '{}'::jsonb;
        has_hr_access := false;
        has_finance_access := false;
        RETURN NEXT;
        RETURN;
    END IF;
    SELECT
        COALESCE(array_agg(DISTINCT r.name), ARRAY[]::text[]),
        COALESCE(identity.jwt_jsonb_deep_merge_agg(r.permissions), '{}'::jsonb)
    INTO v_role_names, v_permissions
    FROM identity.user_roles ur
    JOIN identity.roles r ON r.id = ur.role_id
    WHERE ur.organization_user_id = p_org_user_id
      AND ur.organization_id = p_org_id
      AND r.is_active = true;
    role_names := COALESCE(v_role_names, ARRAY[]::text[]);
    permissions := COALESCE(v_permissions, '{}'::jsonb);
    has_hr_access := EXISTS (
        SELECT 1 FROM unnest(v_role_names) rn
        WHERE rn IN ('Superadmin', 'HR Approver', 'HR Manager', 'HR Administrator')
    );
    has_finance_access := (
        v_permissions ? 'finance'
        OR v_permissions ? 'procurement'
        OR EXISTS (
            SELECT 1 FROM unnest(v_role_names) rn
            WHERE rn ILIKE '%finance%' OR rn ILIKE '%accountant%' OR rn ILIKE '%procurement%'
        )
    );
    RETURN NEXT;
END;
$$;

CREATE FUNCTION identity._rls_get_team_context(p_org_user_id uuid, p_org_id uuid) RETURNS TABLE(team_ids uuid[], team_location_ids uuid[])
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    IF p_org_user_id IS NULL THEN
        team_ids := ARRAY[]::uuid[];
        team_location_ids := ARRAY[]::uuid[];
        RETURN NEXT;
        RETURN;
    END IF;
    SELECT
        COALESCE(array_agg(DISTINCT ut.team_id), ARRAY[]::uuid[]),
        COALESCE(array_agg(DISTINCT t.location_id) FILTER (WHERE t.location_id IS NOT NULL), ARRAY[]::uuid[])
    INTO team_ids, team_location_ids
    FROM identity.user_teams ut
    JOIN identity.teams t ON ut.team_id = t.id
    WHERE ut.organization_user_id = p_org_user_id
      AND t.organization_id = p_org_id;
    RETURN NEXT;
END;
$$;

CREATE FUNCTION identity._rls_resolve_contact(p_user_id uuid, p_org_id uuid, p_org_user_id uuid) RETURNS TABLE(contact_id uuid, account_ids uuid[], vendor_ids uuid[])
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_contact_id uuid;
    v_account_ids uuid[];
    v_vendor_ids uuid[];
BEGIN
    v_contact_id := NULLIF(current_setting('resonance.contact_id', true), '')::uuid;
    IF v_contact_id IS NULL THEN
        v_contact_id := (auth.jwt() -> 'app_metadata' ->> 'contact_id')::uuid;
    END IF;
    IF v_contact_id IS NULL AND p_org_user_id IS NOT NULL THEN
        SELECT uc.id INTO v_contact_id
        FROM unified.contacts uc
        WHERE uc.id = p_org_user_id      -- shared UUID: org_user.id = contact.id
          AND uc.organization_id = p_org_id
        LIMIT 1;
    END IF;
    IF v_contact_id IS NOT NULL THEN
        SELECT COALESCE(array_agg(DISTINCT c.account_id), ARRAY[]::uuid[])
        INTO v_account_ids
        FROM crm.contacts c
        WHERE c.id = v_contact_id
          AND c.account_id IS NOT NULL;
        IF array_length(v_account_ids, 1) > 0 THEN
            SELECT COALESCE(
                v_account_ids || array_agg(DISTINCT related_account),
                v_account_ids
            )
            INTO v_account_ids
            FROM (
                SELECT CASE
                    WHEN ar.from_account_id = ANY(v_account_ids) THEN ar.to_account_id
                    ELSE ar.from_account_id
                END AS related_account
                FROM crm.account_relationships ar
                WHERE ar.organization_id = p_org_id
                  AND (ar.from_account_id = ANY(v_account_ids)
                       OR ar.to_account_id = ANY(v_account_ids))
            ) rel
            WHERE related_account IS NOT NULL;
        END IF;
        SELECT COALESCE(array_agg(DISTINCT vc.vendor_id), ARRAY[]::uuid[])
        INTO v_vendor_ids
        FROM procurement.vendor_contacts vc
        WHERE vc.id = v_contact_id
          AND vc.vendor_id IS NOT NULL;
    ELSE
        v_account_ids := ARRAY[]::uuid[];
        v_vendor_ids := ARRAY[]::uuid[];
    END IF;
    contact_id  := v_contact_id;
    account_ids := v_account_ids;
    vendor_ids  := v_vendor_ids;
    RETURN NEXT;
END;
$$;

CREATE FUNCTION identity."A_jwt_get_user_session_NEW"(p_organization_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
    v_auth_id       UUID := auth.uid();
    v_user_id       UUID;
    v_org_id        UUID;
    v_org_name      TEXT;
    v_org_user_id   UUID;
    v_org_user_path ltree;
    v_claims        JSONB;
    v_is_sassadmin  BOOLEAN;
BEGIN
    SELECT 
        u.id, 
        o.id, 
        o.name, 
        ou.id, 
        ou.path
    INTO 
        v_user_id, 
        v_org_id, 
        v_org_name, 
        v_org_user_id, 
        v_org_user_path
    FROM identity.users u
    JOIN identity.organization_users ou ON u.id = ou.user_id
    JOIN identity.organizations o ON ou.organization_id = o.id
    WHERE u.auth_id = v_auth_id 
      AND o.id = p_organization_id;
    IF NOT FOUND THEN 
        RETURN '{}'::jsonb; 
    END IF;
    v_is_sassadmin := identity.is_user_sassadmin(v_user_id, v_org_id);
    IF v_org_name = 'zoworks' OR v_is_sassadmin THEN
        RETURN jsonb_build_object(
            'user_id', v_user_id,
            'org_user_id', v_org_user_id,
            'org_id', v_org_id,
            'is_saas_admin', true,
            'bypass', true,
            'permissions', '{"*": {"*": "all"}}'::jsonb,
            'roles', '[]'::jsonb,
            'teams', '[]'::jsonb,
            'locations', '[]'::jsonb,
            'subordinates', '[]'::jsonb
        );
    END IF;
    WITH perms AS (
        SELECT
            jsonb_agg(DISTINCT jsonb_build_object('id', r.id, 'name', r.name)) AS roles,
            identity.jwt_jsonb_deep_merge_agg(r.permissions) AS permissions
        FROM identity.user_roles ur
        JOIN identity.roles r ON ur.role_id = r.id
        WHERE ur.organization_user_id = v_org_user_id
    ),
    locs AS (
        SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', l.id, 'name', l.name)), '[]'::jsonb) AS locations
        FROM (
            SELECT location_id FROM identity.organization_users WHERE id = v_org_user_id AND location_id IS NOT NULL
            UNION
            SELECT t.location_id FROM identity.user_teams ut
            JOIN identity.teams t ON ut.team_id = t.id
            WHERE ut.organization_user_id = v_org_user_id AND t.location_id IS NOT NULL
        ) src
        JOIN identity.locations l ON src.location_id = l.id
    ),
    teams AS (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name)), '[]'::jsonb) AS teams
        FROM identity.user_teams ut
        JOIN identity.teams t ON ut.team_id = t.id
        WHERE ut.organization_user_id = v_org_user_id
    ),
    subs AS (
        SELECT COALESCE(jsonb_agg(ou.user_id), '[]'::jsonb) AS user_ids
        FROM identity.organization_users ou
        WHERE ou.path <@ v_org_user_path
          AND ou.id <> v_org_user_id
          AND ou.organization_id = v_org_id
    )
    SELECT jsonb_build_object(
        'user_id', v_user_id,
        'org_user_id', v_org_user_id,
        'org_id', v_org_id,
        'is_saas_admin', false,
        'bypass', false,
        'roles', COALESCE((SELECT roles FROM perms), '[]'::jsonb),
        'permissions', COALESCE((SELECT permissions FROM perms), '{}'::jsonb),
        'teams', (SELECT teams FROM teams),
        'locations', (SELECT locations FROM locs),
        'subordinates', (SELECT user_ids FROM subs)
    ) INTO v_claims;
    RETURN v_claims;
END;$$;

CREATE FUNCTION identity."rls_util_sync_engine-v1"(dry_run boolean) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$DECLARE
    v_tier3_sql text := ''; -- Account linkage
    v_tier4_sql text := ''; -- Contact linkage
    v_rec record;
    v_final_sql text;
    v_table_count integer := 0;
BEGIN
    SELECT string_agg(
        format('            SELECT account_id FROM %I.%I WHERE id = p_record_id AND account_id IS NOT NULL', 
               table_schema, table_name),
        E'\n            UNION ALL\n'
    )
    INTO v_tier3_sql
    FROM information_schema.columns
    WHERE column_name = 'account_id'
      AND table_schema IN ('crm', 'esm', 'procurement', 'unified', 'blueprint')
      AND table_name NOT LIKE 'v_%'
      AND table_name NOT LIKE 'bak_%'
      AND table_name NOT LIKE 'tmp_%';
    SELECT count(*) INTO v_table_count
    FROM information_schema.columns
    WHERE column_name IN ('account_id', 'contact_id', 'requester_id', 'sender_id', 'receiver_id', 'assigned_to')
      AND table_schema IN ('crm', 'esm', 'procurement', 'unified', 'blueprint')
      AND table_name NOT LIKE 'v_%'
      AND table_name NOT LIKE 'bak_%'
      AND table_name NOT LIKE 'tmp_%';
    SELECT string_agg(
        format('            SELECT %I as contact_id FROM %I.%I WHERE id = p_record_id AND %I IS NOT NULL', 
               column_name, table_schema, table_name, column_name),
        E'\n            UNION ALL\n'
    )
    INTO v_tier4_sql
    FROM information_schema.columns
    WHERE column_name IN ('contact_id', 'requester_id', 'sender_id', 'receiver_id', 'assigned_to')
      AND table_schema IN ('crm', 'esm', 'procurement', 'unified', 'blueprint')
      AND table_name NOT LIKE 'v_%'
      AND table_name NOT LIKE 'bak_%'
      AND table_name NOT LIKE 'tmp_%';
    v_final_sql := format(
$func$
CREATE OR REPLACE FUNCTION identity.rls_util_has_access(p_record_id uuid, p_org_id uuid) 
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
    v_persona TEXT;
    v_contact_id UUID;
BEGIN
    v_persona := identity.rls_get_current_persona();
    IF v_persona = 'worker' THEN
        RETURN true;
    END IF;
    v_contact_id := NULLIF(current_setting('resonance.contact_id', true), '')::uuid;
    IF v_contact_id IS NULL THEN
        v_contact_id := (auth.jwt() -> 'app_metadata' ->> 'contact_id')::uuid;
    END IF;
    IF v_contact_id IS NULL THEN
        RETURN false; -- Unknown/No link
    END IF;
    IF p_record_id = v_contact_id THEN
        RETURN true;
    END IF;
    IF EXISTS (
        SELECT 1 FROM (
            SELECT account_id as acc_id FROM crm.contacts WHERE id = v_contact_id AND account_id IS NOT NULL
            UNION ALL
            SELECT vendor_id as acc_id FROM procurement.vendor_contacts WHERE id = v_contact_id AND vendor_id IS NOT NULL
        ) user_accounts
        INNER JOIN (
%s
            UNION ALL
            SELECT id as account_id FROM crm.accounts WHERE id = p_record_id
            UNION ALL
            SELECT id as account_id FROM procurement.vendors WHERE id = p_record_id
        ) record_links ON user_accounts.acc_id = record_links.account_id
    ) THEN
        RETURN true;
    END IF;
    IF EXISTS (
        SELECT 1 FROM (
%s
        ) record_contacts
        WHERE record_contacts.contact_id = v_contact_id
    ) THEN
        RETURN true;
    END IF;
    RETURN false;
END;
$$;
COMMENT ON FUNCTION identity.rls_util_has_access(uuid, uuid) IS 
'RLS Scoping Engine - Auto-generated with %s relationship table links';
$func$,
        COALESCE(v_tier3_sql, '            SELECT NULL::uuid as account_id WHERE false'),
        COALESCE(v_tier4_sql, '            SELECT NULL::uuid as contact_id WHERE false'),
        v_table_count
    );
    IF dry_run THEN
        RETURN v_final_sql;
    ELSE
        EXECUTE v_final_sql;
        RAISE NOTICE 'RLS Scoping Engine synchronized. Tables analyzed: %', v_table_count;
        RETURN format('RLS Scoping Engine synchronized successfully. Tables processed: %s', v_table_count);
    END IF;
END;$_$;

CREATE FUNCTION identity."zz_get_current_org_id_M20-no pref org nomultiorg"() RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$BEGIN
     RETURN COALESCE(
         NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'organization_id', '')::uuid,
         NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'organization_id', '')::uuid,
         NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id', '')::uuid,
         NULLIF(current_setting('request.jwt.claims.organization_id', true), '')::uuid,
         NULLIF(current_setting('request.jwt.claims.org_id', true), '')::uuid,
         NULLIF(current_setting('app.current_org_id', true), '')::uuid,
         (SELECT organization_id FROM identity.organization_users
          WHERE user_id = identity.get_my_user_id() AND is_active = true
          ORDER BY created_at DESC LIMIT 1)
     );
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;$$;

CREATE FUNCTION identity."zz_rls_bootstrap_entity_policy_M21"(p_schema text, p_entity text, p_dry_run boolean) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
    v_template      text;
    v_owner_col     text;
    v_status_col    text;
    v_location_col  text;
    v_approver_col  text;
    v_account_col   text;
    v_contact_col   text;
    v_vendor_col    text;
    v_owner_is_org_user boolean;
    v_classification text;
    v_policy_sql    text;
    v_policy_name   text;
    v_using_clause  text;
    v_bp            record;
BEGIN
    SELECT * INTO v_bp FROM core.entity_blueprints
    WHERE entity_schema = p_schema AND entity_type = p_entity AND is_active;
    IF v_bp IS NULL THEN
        RAISE EXCEPTION 'No active blueprint found for %.%', p_schema, p_entity;
    END IF;
    v_classification    := COALESCE(v_bp.classification, 'transactional');
    v_template          := COALESCE(v_bp.rls_config->>'template', '');
    v_owner_col         := v_bp.rls_config->>'owner_col';
    v_status_col        := v_bp.rls_config->>'status_col';
    v_location_col      := v_bp.rls_config->>'location_col';
    v_approver_col      := v_bp.rls_config->>'approver_col';
    v_account_col       := v_bp.rls_config->>'account_col';
    v_contact_col       := v_bp.rls_config->>'contact_col';
    v_vendor_col        := v_bp.rls_config->>'vendor_col';
    v_owner_is_org_user := COALESCE((v_bp.rls_config->>'owner_is_org_user')::boolean, false);
    IF v_template = '' OR v_template IS NULL THEN
        IF v_classification = 'configuration' THEN
            v_template := 'configuration';
        ELSIF v_classification = 'analytical' THEN
            v_template := 'analytical';
        ELSIF p_schema IN ('workforce', 'hr') THEN
            v_template := 'workforce';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_schema = p_schema AND table_name = p_entity
              AND column_name IN ('account_id', 'contact_id', 'vendor_id')) THEN
            v_template := 'standard';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_schema = p_schema AND table_name = p_entity
              AND column_name = 'organization_id') THEN
            v_template := 'tenant_isolation';
        ELSE
            v_template := 'authenticated_access';
        END IF;
    END IF;
    IF v_template = 'multi_org' THEN
        v_using_clause := 'organization_id = ANY(identity.get_my_org_ids())';
    ELSIF v_template = 'configuration' THEN
        IF v_location_col IS NOT NULL THEN
            v_using_clause := format(
                '(organization_id IS NULL OR organization_id = identity.get_current_org_id()) AND (%I IS NULL OR %I = ANY(identity.get_accessible_location_ids()))',
                v_location_col, v_location_col);
        ELSE
            v_using_clause := 'organization_id IS NULL OR organization_id = identity.get_current_org_id()';
        END IF;
    ELSIF v_template IN ('analytical', 'authenticated_access') THEN
        v_using_clause := 'true';
    ELSIF v_template = 'user_scope' THEN
        v_using_clause := 'user_id = identity.get_my_user_id()';
    ELSIF v_template = 'tenant_isolation' THEN
        v_using_clause := 'organization_id = identity.get_current_org_id()';
    ELSIF v_template = 'standard' THEN
        DECLARE
            v_parts text[] := ARRAY['ctx.is_saas_admin', 'ctx.my_persona = ''worker'''];
        BEGIN
            IF v_account_col IS NOT NULL THEN
                v_parts := array_append(v_parts, format('%I.%I = ANY(ctx.account_ids)', p_entity, v_account_col));
            END IF;
            IF v_contact_col IS NOT NULL THEN
                v_parts := array_append(v_parts, format('%I.%I = ctx.contact_id', p_entity, v_contact_col));
            END IF;
            IF v_vendor_col IS NOT NULL THEN
                v_parts := array_append(v_parts, format('%I.%I = ANY(ctx.vendor_ids)', p_entity, v_vendor_col));
            END IF;
            v_using_clause := format(
                '%I.organization_id = identity.get_current_org_id() AND EXISTS (SELECT 1 FROM identity.rls_get_session_context() ctx WHERE %s)',
                p_entity, array_to_string(v_parts, ' OR '));
        END;
    ELSIF v_template = 'workforce' THEN
        DECLARE
            v_owner      text := COALESCE(v_owner_col, 'user_id');
            v_status     text := COALESCE(v_status_col, 'stage_id');
            v_loc        text := v_location_col;
            v_self_check text;
            v_draft_check text;
            v_parts text[];
        BEGIN
            v_self_check  := CASE WHEN v_owner_is_org_user
                THEN format('%I.%I = ctx.my_org_user_id', p_entity, v_owner)
                ELSE format('%I.%I = ctx.my_user_id',     p_entity, v_owner) END;
            v_draft_check := format('(%I.%I IS NOT NULL AND %I.%I NOT IN (''Draft'', ''draft''))',
                p_entity, v_status, p_entity, v_status);
            v_parts := ARRAY[
                'ctx.is_saas_admin',
                v_self_check,
                format('(%s AND %I.%I = ANY(ctx.subordinate_user_ids))', v_draft_check, p_entity, v_owner),
                CASE WHEN v_loc IS NOT NULL
                    THEN format('(ctx.has_hr_access AND %s AND (array_length(ctx.accessible_location_ids, 1) = 0 OR %I.%I = ANY(ctx.accessible_location_ids)))', v_draft_check, p_entity, v_loc)
                    ELSE format('(ctx.has_hr_access AND %s)', v_draft_check)
                END
            ];
            IF v_approver_col IS NOT NULL THEN
                v_parts := array_append(v_parts, format('%I.%I = ctx.my_user_id', p_entity, v_approver_col));
            END IF;
            v_using_clause := format(
                '%I.organization_id = identity.get_current_org_id() AND EXISTS (SELECT 1 FROM identity.rls_get_session_context() ctx WHERE %s)',
                p_entity, array_to_string(v_parts, ' OR '));
        END;
    ELSE
        v_using_clause := 'organization_id = identity.get_current_org_id()';
    END IF;
    v_policy_name := CASE v_template
        WHEN 'standard'             THEN 'Unified_Security_V5'
        WHEN 'workforce'            THEN 'Unified_Security_V5_Workforce'
        WHEN 'configuration'        THEN 'Config_Tenant_Or_Global_V5'
        WHEN 'tenant_isolation'     THEN 'Tenant_Isolation_V5'
        WHEN 'multi_org'            THEN 'Multi_Org_Access_V5'
        WHEN 'analytical'           THEN 'Authenticated_Access_V5'
        WHEN 'authenticated_access' THEN 'Authenticated_Access_V5'
        WHEN 'user_scope'           THEN 'User_Scope_V5'
        ELSE                             'Tenant_Isolation_V5'
    END;
    v_policy_sql := format(
        'CREATE POLICY %I ON %I.%I FOR ALL TO authenticated USING (%s)',
        v_policy_name, p_schema, p_entity, v_using_clause);
    IF p_dry_run THEN
        RETURN format('-- DRY RUN for %s.%s (template: %s, classification: %s)%s%s',
            p_schema, p_entity, v_template, v_classification, E'\n', v_policy_sql);
    END IF;
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', p_schema, p_entity);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',  p_schema, p_entity);
    PERFORM identity.rls_drop_all_policies(p_schema, p_entity);
    EXECUTE v_policy_sql;
    IF EXISTS (SELECT 1 FROM information_schema.views
        WHERE table_schema = p_schema AND table_name = 'v_' || p_entity) THEN
        EXECUTE format('ALTER VIEW %I.v_%I SET (security_invoker = on)', p_schema, p_entity);
    END IF;
    RETURN format('Applied %s to %s.%s (classification: %s)', v_policy_name, p_schema, p_entity, v_classification);
END;$$;

CREATE FUNCTION identity."zz_rls_bootstrap_entity_policy_v1-m18"(p_schema text, p_entity text, p_dry_run boolean DEFAULT false) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
    v_bp            record;             -- Blueprint row
    v_table         text;               -- Fully qualified table name
    v_template      text;               -- Resolved template name
    v_config        jsonb;              -- rls_config from blueprint
    v_policy_name   text;               -- Policy name to create
    v_using_clause  text;               -- The USING(...) predicate
    v_policy_sql    text;               -- Full CREATE POLICY statement
    v_enable_sql    text;               -- ALTER TABLE ENABLE RLS
    v_force_sql     text;               -- ALTER TABLE FORCE RLS
    v_drop_result   text;               -- Result from dropping old policies
    v_result        text := '';         -- Accumulated result messages
    v_account_col   text;
    v_contact_col   text;
    v_vendor_col    text;
    v_owner_col     text;
    v_status_col    text;
    v_location_col  text;
    v_approver_col  text;
BEGIN
    SELECT classification, rls_config
    INTO v_bp
    FROM core.entity_blueprints
    WHERE entity_schema = p_schema
      AND entity_type = p_entity
      AND is_active = true
    LIMIT 1;
    IF NOT FOUND THEN
        RETURN format('ERROR: No active blueprint found for %I.%I', p_schema, p_entity);
    END IF;
    v_config := COALESCE(v_bp.rls_config, '{}'::jsonb);
    v_table  := format('%I.%I', p_schema, p_entity);
    v_template := v_config->>'template';
    IF v_template IS NULL THEN
        IF v_bp.classification = 'configuration' THEN
            v_template := 'configuration';
        ELSIF v_bp.classification = 'analytical' THEN
            v_template := 'analytical';
        ELSIF p_schema = 'workforce' THEN
            v_template := 'workforce';
        ELSE
            v_template := 'standard';
        END IF;
    END IF;
    v_account_col  := v_config->>'account_col';
    v_contact_col  := v_config->>'contact_col';
    v_vendor_col   := v_config->>'vendor_col';
    v_owner_col    := v_config->>'owner_col';
    v_status_col   := v_config->>'status_col';
    v_location_col := v_config->>'location_col';
    v_approver_col := v_config->>'approver_col';
    IF v_template = 'standard' THEN
        v_policy_name := 'Unified_Security_V5';
        v_using_clause := format(
            E'organization_id = identity.get_current_org_id()\n'
            '    AND EXISTS (\n'
            '        SELECT 1 FROM identity.rls_get_session_context() ctx\n'
            '        WHERE ctx.is_saas_admin\n'
            '           OR ctx.my_persona = ''worker''\n'
            '%s'   -- account_col branch (optional)
            '%s'   -- contact_col branch (optional)
            '%s'   -- vendor_col branch (optional)
            '           OR ctx.contact_id = id\n'  -- direct contact ownership (shared UUID)
            '    )',
            CASE WHEN v_account_col IS NOT NULL THEN
                format('           OR %I = ANY(ctx.account_ids)\n', v_account_col)
            ELSE '' END,
            CASE WHEN v_contact_col IS NOT NULL THEN
                format('           OR %I = ctx.contact_id\n', v_contact_col)
            ELSE '' END,
            CASE WHEN v_vendor_col IS NOT NULL THEN
                format('           OR %I = ANY(ctx.vendor_ids)\n', v_vendor_col)
            ELSE '' END
        );
    ELSIF v_template = 'workforce' THEN
        v_policy_name := 'Unified_Security_V5_Workforce';
        IF v_owner_col IS NULL THEN
            RETURN format('ERROR: workforce template requires owner_col in rls_config for %s', v_table);
        END IF;
        IF v_status_col IS NULL THEN
            RETURN format('ERROR: workforce template requires status_col in rls_config for %s', v_table);
        END IF;
        v_using_clause := format(
            E'organization_id = identity.get_current_org_id()\n'
            '    AND EXISTS (\n'
            '        SELECT 1 FROM identity.rls_get_session_context() ctx\n'
            '        WHERE\n'
            '            -- SaaS Admin: full bypass\n'
            '            ctx.is_saas_admin\n'
            '\n'
            '            -- Self: owner always sees all their records (including Draft)\n'
            '            OR %I = ctx.my_user_id\n'
            '\n'
            '            -- Manager: sees subordinates'' non-draft records\n'
            '            OR (%I NOT IN (''Draft'', ''draft'')\n'
            '                AND %I = ANY(ctx.subordinate_user_ids))\n'
            '%s'   -- approver_col branch (optional)
            '\n'
            '            -- HR: non-draft, location-scoped\n'
            '            OR (ctx.has_hr_access\n'
            '                AND %I NOT IN (''Draft'', ''draft'')\n'
            '                AND (\n'
            '                    -- HR with no location restriction (empty array = all locations)\n'
            '                    array_length(ctx.accessible_location_ids, 1) IS NULL\n'
            '%s'   -- location_col restriction (optional)
            '                ))\n'
            '    )',
            v_owner_col,
            v_status_col, v_owner_col,
            CASE WHEN v_approver_col IS NOT NULL THEN
                format(
                    E'\n'
                    '            -- Explicit Approver: bp_process_blueprint assigned approver\n'
                    '            OR (%I IS NOT NULL AND %I = ctx.my_user_id)\n',
                    v_approver_col, v_approver_col
                )
            ELSE '' END,
            v_status_col,
            CASE WHEN v_location_col IS NOT NULL THEN
                format(
                    '                    OR %I = ANY(ctx.accessible_location_ids)\n',
                    v_location_col
                )
            ELSE
                '                    OR true\n'
            END
        );
    ELSIF v_template = 'configuration' THEN
        v_policy_name := 'Config_Tenant_Or_Global';
        v_using_clause :=
            E'organization_id IS NULL\n'
            '    OR organization_id = identity.get_current_org_id()';
    ELSIF v_template = 'analytical' THEN
        v_policy_name := 'Analytical_Worker_Read';
        v_using_clause :=
            'organization_id = identity.get_current_org_id()';
    ELSE
        RETURN format('ERROR: Unknown template "%s" for %s', v_template, v_table);
    END IF;
    v_enable_sql := format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', v_table);
    v_force_sql  := format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', v_table);
    IF v_template IN ('configuration', 'analytical') THEN
        v_policy_sql := format(
            E'CREATE POLICY %I ON %s\n'
            'FOR SELECT TO authenticated\n'
            'USING (\n'
            '    %s\n'
            ')',
            v_policy_name, v_table, v_using_clause
        );
    ELSE
        v_policy_sql := format(
            E'CREATE POLICY %I ON %s\n'
            'FOR ALL TO authenticated\n'
            'USING (\n'
            '    %s\n'
            ')',
            v_policy_name, v_table, v_using_clause
        );
    END IF;
    IF p_dry_run THEN
        v_result := format(
            E'-- DRY RUN for %s (template: %s, classification: %s)\n'
            '-- ================================================\n\n'
            '%s;\n'
            '%s;\n\n'
            '-- Drop existing policies:\n'
            '-- SELECT identity.rls_drop_all_policies(''%s'', ''%s'');\n\n'
            '%s;\n',
            v_table, v_template, v_bp.classification,
            v_enable_sql, v_force_sql,
            p_schema, p_entity,
            v_policy_sql
        );
        RETURN v_result;
    ELSE
        EXECUTE v_enable_sql;
        v_result := v_result || format('✓ RLS enabled on %s', v_table) || E'\n';
        EXECUTE v_force_sql;
        v_result := v_result || format('✓ RLS forced on %s', v_table) || E'\n';
        v_drop_result := identity.rls_drop_all_policies(p_schema, p_entity);
        v_result := v_result || '✓ ' || v_drop_result || E'\n';
        EXECUTE v_policy_sql;
        v_result := v_result || format('✓ Created policy "%s" on %s (template: %s)',
                                        v_policy_name, v_table, v_template) || E'\n';
        IF EXISTS (
            SELECT 1 FROM pg_views
            WHERE schemaname = p_schema
              AND viewname = 'v_' || p_entity
        ) THEN
            EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = on)',
                           p_schema, 'v_' || p_entity);
            v_result := v_result || format('✓ security_invoker=on on %I.v_%I',
                                            p_schema, p_entity) || E'\n';
        END IF;
        RETURN v_result;
    END IF;
END;$$;

CREATE FUNCTION identity."zz_rls_recommend_policy_v1-M20"(p_schema text, p_entity text) RETURNS TABLE(table_schema text, table_name text, has_rls boolean, current_policy text, has_blueprint boolean, blueprint_template text, recommended text, reason text, action_sql text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
    v_has_org_id    boolean;
    v_has_user_id   boolean;
    v_has_stage_id  boolean;
    v_has_account   boolean;
    v_has_contact   boolean;
    v_has_vendor    boolean;
    v_has_location  boolean;
    v_rls_enabled   boolean;
    v_policy_name   text;
    v_bp_template   text;
    v_bp_exists     boolean;
    v_rec_template  text;
    v_rec_reason    text;
    v_action        text;
BEGIN
    SELECT
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='organization_id'),
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='user_id'),
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='stage_id'),
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='account_id'),
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='contact_id'),
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='vendor_id'),
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='location_id')
    INTO v_has_org_id, v_has_user_id, v_has_stage_id, v_has_account, v_has_contact, v_has_vendor, v_has_location;
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = p_schema AND c.relname = p_entity;
    SELECT p.policyname INTO v_policy_name
    FROM pg_policies p
    WHERE p.schemaname = p_schema AND p.tablename = p_entity
    LIMIT 1;
    SELECT true, b.rls_config->>'template'
    INTO v_bp_exists, v_bp_template
    FROM core.entity_blueprints b
    WHERE b.entity_schema = p_schema AND b.entity_type = p_entity AND b.is_active;
    IF v_bp_exists IS NULL THEN v_bp_exists := false; END IF;
    IF p_schema IN ('workforce', 'hr') AND v_has_user_id AND v_has_org_id THEN
        v_rec_template := 'workforce';
        v_rec_reason := 'Has user_id + organization_id in workforce/hr schema → workforce template with draft wall';
    ELSIF v_has_org_id AND (v_has_account OR v_has_contact OR v_has_vendor) THEN
        v_rec_template := 'standard';
        v_rec_reason := 'Has organization_id + external identity columns → standard template with portal access';
    ELSIF v_has_org_id THEN
        v_rec_template := 'tenant_isolation';
        v_rec_reason := 'Has organization_id, no external identity columns → simple tenant isolation';
    ELSIF v_has_user_id THEN
        v_rec_template := 'user_scope';
        v_rec_reason := 'Has user_id but no organization_id → user-scoped access';
    ELSE
        v_rec_template := 'authenticated_access';
        v_rec_reason := 'No organization_id or user_id → authenticated access (review if correct)';
    END IF;
    IF v_bp_exists AND v_bp_template IS NOT NULL THEN
        v_action := format('SELECT identity.rls_bootstrap_entity_policy(%L, %L);', p_schema, p_entity);
    ELSE
        v_action := format(
            'UPDATE core.entity_blueprints SET rls_config = ''{"template":"%s"}''::jsonb WHERE entity_schema = %L AND entity_type = %L; ' ||
            'SELECT identity.rls_bootstrap_entity_policy(%L, %L);',
            v_rec_template, p_schema, p_entity, p_schema, p_entity
        );
    END IF;
    RETURN QUERY SELECT
        p_schema,
        p_entity,
        COALESCE(v_rls_enabled, false),
        v_policy_name,
        v_bp_exists,
        v_bp_template,
        v_rec_template,
        v_rec_reason,
        v_action;
END;$$;

CREATE FUNCTION identity."zz_rls_recommend_policy_v2-M20"(p_schema text, p_entity text) RETURNS TABLE(table_schema text, table_name text, has_rls boolean, current_policy text, has_blueprint boolean, blueprint_classification text, blueprint_template text, recommended text, reason text, action_sql text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
    v_has_org_id    boolean;
    v_has_user_id   boolean;
    v_has_account   boolean;
    v_has_contact   boolean;
    v_has_vendor    boolean;
    v_rls_enabled   boolean;
    v_policy_name   text;
    v_bp_template   text;
    v_bp_class      text;
    v_bp_exists     boolean;
    v_rec_template  text;
    v_rec_reason    text;
    v_action        text;
BEGIN
    SELECT
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='organization_id'),
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='user_id'),
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='account_id'),
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='contact_id'),
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='vendor_id')
    INTO v_has_org_id, v_has_user_id, v_has_account, v_has_contact, v_has_vendor;
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = p_schema AND c.relname = p_entity;
    SELECT p.policyname INTO v_policy_name
    FROM pg_policies p
    WHERE p.schemaname = p_schema AND p.tablename = p_entity
    LIMIT 1;
    SELECT true, b.classification, b.rls_config->>'template'
    INTO v_bp_exists, v_bp_class, v_bp_template
    FROM core.entity_blueprints b
    WHERE b.entity_schema = p_schema AND b.entity_type = p_entity AND b.is_active;
    IF v_bp_exists IS NULL THEN v_bp_exists := false; END IF;
    IF v_bp_template IS NOT NULL AND v_bp_template != '' THEN
        v_rec_template := v_bp_template;
        v_rec_reason := 'Explicit rls_config.template set in blueprint';
    ELSIF v_bp_class = 'configuration' THEN
        v_rec_template := 'configuration';
        v_rec_reason := 'Blueprint classification = configuration → Config_Tenant_Or_Global_V5 (org IS NULL = global default)';
    ELSIF v_bp_class = 'analytical' THEN
        v_rec_template := 'analytical';
        v_rec_reason := 'Blueprint classification = analytical → Authenticated_Access_V5 (global read)';
    ELSIF p_schema IN ('workforce', 'hr') AND v_has_user_id AND v_has_org_id THEN
        v_rec_template := 'workforce';
        v_rec_reason := 'Workforce/hr schema + user_id + organization_id → workforce template with draft wall';
    ELSIF v_has_org_id AND (v_has_account OR v_has_contact OR v_has_vendor) THEN
        v_rec_template := 'standard';
        v_rec_reason := 'Has organization_id + external identity columns → standard template with portal access';
    ELSIF v_has_org_id THEN
        v_rec_template := 'tenant_isolation';
        v_rec_reason := 'Has organization_id, no external identity columns → simple tenant isolation';
    ELSIF v_has_user_id THEN
        v_rec_template := 'user_scope';
        v_rec_reason := 'Has user_id but no organization_id → user-scoped access';
    ELSE
        v_rec_template := 'authenticated_access';
        v_rec_reason := 'No organization_id or user_id → authenticated access (review if correct)';
    END IF;
    IF v_bp_exists AND v_bp_template IS NOT NULL THEN
        v_action := format('SELECT identity.rls_bootstrap_entity_policy(%L, %L);', p_schema, p_entity);
    ELSE
        v_action := format(
            'UPDATE core.entity_blueprints SET rls_config = jsonb_set(COALESCE(rls_config, ''{}''::jsonb), ''{template}'', to_jsonb(%L::text)) WHERE entity_schema = %L AND entity_type = %L; SELECT identity.rls_bootstrap_entity_policy(%L, %L);',
            v_rec_template, p_schema, p_entity, p_schema, p_entity
        );
    END IF;
    RETURN QUERY SELECT
        p_schema, p_entity,
        COALESCE(v_rls_enabled, false),
        v_policy_name,
        v_bp_exists,
        v_bp_class,
        v_bp_template,
        v_rec_template,
        v_rec_reason,
        v_action;
END;$$;

CREATE FUNCTION identity."zz_rls_util_has_workforce_access-m18"(p_record_user_id uuid, p_record_org_id uuid, p_record_status text, p_record_location_id uuid, p_approver_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$DECLARE
    v_my_id uuid := identity.get_my_user_id(); -- Use internal identity UUID
    v_my_path extensions.ltree;  -- Explicitly qualify with extensions schema
    v_my_loc uuid;
BEGIN
    IF identity.is_saas_admin() THEN RETURN true; END IF;
    IF p_record_user_id = v_my_id THEN RETURN true; END IF;
    IF v_my_id = p_approver_id THEN RETURN true; END IF;
    SELECT path, location_id INTO v_my_path, v_my_loc
    FROM identity.organization_users
    WHERE user_id = v_my_id AND organization_id = p_record_org_id AND is_active = true;
    IF v_my_path IS NULL THEN RETURN false; END IF;
    IF COALESCE(p_record_status, 'submitted') NOT IN ('Draft', 'draft') THEN
        IF EXISTS (
            SELECT 1 FROM identity.organization_users ou
            WHERE ou.user_id = p_record_user_id
              AND ou.organization_id = p_record_org_id
              AND ou.path <@ v_my_path  -- Now works with extensions in search_path
              AND ou.user_id != v_my_id
        ) THEN
            RETURN true;
        END IF;
    END IF;
    IF EXISTS (
        SELECT 1 
        FROM identity.user_roles ur
        JOIN identity.organization_users ou ON ur.organization_user_id = ou.id
        JOIN identity.roles r ON ur.role_id = r.id
        WHERE ou.user_id = v_my_id 
          AND ou.organization_id = p_record_org_id 
          AND r.name IN ('Superadmin', 'HR Approver', 'HR Manager', 'HR Administrator')
          AND (
              v_my_loc IS NULL OR p_record_location_id IS NULL OR v_my_loc = p_record_location_id
              OR
              EXISTS (
                  SELECT 1 FROM identity.locations l_rec
                  JOIN identity.locations l_my ON l_my.id = v_my_loc
                  WHERE l_rec.id = p_record_location_id
                    AND l_rec.path <@ l_my.path  -- Now works with extensions in search_path
              )
          )
    ) THEN
        RETURN true;
    END IF;
    RETURN false;
END;$$;

CREATE FUNCTION identity.bootstrap_user_to_org(p_user_id uuid, p_organization_id uuid, p_is_admin boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_location_id UUID;
    v_role_id UUID;
    v_team_id UUID;
    v_org_user_id UUID;
    v_org_name TEXT;
    v_user_name TEXT;
    v_result jsonb := '{}'::jsonb;
BEGIN
    SELECT name INTO v_org_name FROM identity.organizations WHERE id = p_organization_id;
    IF v_org_name IS NULL THEN
        RAISE EXCEPTION 'Organization % not found', p_organization_id;
    END IF;
    SELECT name INTO v_user_name FROM identity.users WHERE id = p_user_id;
    IF v_user_name IS NULL THEN
        RAISE EXCEPTION 'User % not found', p_user_id;
    END IF;
    SELECT id INTO v_org_user_id 
    FROM identity.organization_users 
    WHERE organization_id = p_organization_id AND user_id = p_user_id;
    IF v_org_user_id IS NOT NULL THEN
        RAISE NOTICE 'User already exists in organization. Org User ID: %', v_org_user_id;
        v_result := v_result || jsonb_build_object('existing_org_user_id', v_org_user_id);
    END IF;
    SELECT id INTO v_location_id 
    FROM identity.locations 
    WHERE organization_id = p_organization_id 
    LIMIT 1;
    IF v_location_id IS NULL THEN
        INSERT INTO identity.locations (
            organization_id, 
            name, 
            time_zone, 
            is_active,
            details,
            created_by
        ) VALUES (
            p_organization_id, 
            v_org_name || ' - HQ',
            'Asia/Kolkata',
            true,
            jsonb_build_object('address', 'Default Location', 'type', 'headquarters'),
            p_user_id
        )
        RETURNING id INTO v_location_id;
        RAISE NOTICE 'Created default location: %', v_location_id;
        v_result := v_result || jsonb_build_object('created_location_id', v_location_id);
    ELSE
        v_result := v_result || jsonb_build_object('existing_location_id', v_location_id);
    END IF;
    SELECT id INTO v_role_id 
    FROM identity.roles 
    WHERE organization_id = p_organization_id 
    AND (p_is_admin = false OR name ILIKE '%admin%')
    LIMIT 1;
    IF v_role_id IS NULL THEN
        INSERT INTO identity.roles (
            organization_id,
            location_id,
            name,
            permissions,
            is_active,
            is_sassadmin,
            feature,
            created_by
        ) VALUES (
            p_organization_id,
            v_location_id,
            CASE WHEN p_is_admin THEN 'Administrator' ELSE 'Staff' END,
            CASE WHEN p_is_admin 
                THEN '{"all": true}'::jsonb 
                ELSE '{"read": true, "write": true}'::jsonb 
            END,
            true,
            p_is_admin,
            '["inbox", "contacts", "templates", "sequences", "analytics", "settings"]'::jsonb,
            p_user_id
        )
        RETURNING id INTO v_role_id;
        RAISE NOTICE 'Created role: %', v_role_id;
        v_result := v_result || jsonb_build_object('created_role_id', v_role_id);
    ELSE
        v_result := v_result || jsonb_build_object('existing_role_id', v_role_id);
    END IF;
    SELECT id INTO v_team_id 
    FROM identity.teams 
    WHERE organization_id = p_organization_id 
    AND location_id = v_location_id
    LIMIT 1;
    IF v_team_id IS NULL THEN
        INSERT INTO identity.teams (
            organization_id,
            location_id,
            name,
            details,
            created_by
        ) VALUES (
            p_organization_id,
            v_location_id,
            'General Team',
            jsonb_build_object('description', 'Default team for ' || v_org_name),
            p_user_id
        )
        RETURNING id INTO v_team_id;
        RAISE NOTICE 'Created team: %', v_team_id;
        v_result := v_result || jsonb_build_object('created_team_id', v_team_id);
    ELSE
        v_result := v_result || jsonb_build_object('existing_team_id', v_team_id);
    END IF;
    IF v_org_user_id IS NULL THEN
        INSERT INTO identity.organization_users (
            organization_id,
            user_id,
            location_id,
            is_active,
            status,
            created_by
        ) VALUES (
            p_organization_id,
            p_user_id,
            v_location_id,
            true,
            'ONLINE'::public.user_status,
            p_user_id
        )
        RETURNING id INTO v_org_user_id;
        RAISE NOTICE 'Created org user: %', v_org_user_id;
        v_result := v_result || jsonb_build_object('created_org_user_id', v_org_user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM identity.user_roles 
        WHERE organization_user_id = v_org_user_id AND role_id = v_role_id
    ) THEN
        INSERT INTO identity.user_roles (
            organization_id,
            organization_user_id,
            role_id,
            team_id,
            created_by,
            last_assigned_at
        ) VALUES (
            p_organization_id,
            v_org_user_id,
            v_role_id,
            v_team_id,
            p_user_id,
            NOW()
        );
        RAISE NOTICE 'Assigned role to user';
        v_result := v_result || jsonb_build_object('assigned_role', true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM identity.user_teams 
        WHERE organization_user_id = v_org_user_id AND team_id = v_team_id
    ) THEN
        INSERT INTO identity.user_teams (
            organization_user_id,
            team_id,
            created_by,
            last_assigned_at
        ) VALUES (
            v_org_user_id,
            v_team_id,
            p_user_id,
            NOW()
        );
        RAISE NOTICE 'Assigned team to user';
        v_result := v_result || jsonb_build_object('assigned_team', true);
    END IF;
    UPDATE identity.users
    SET pref_organization_id = COALESCE(pref_organization_id, p_organization_id)
    WHERE id = p_user_id
    AND pref_organization_id IS NULL;
    v_result := v_result || jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'organization_id', p_organization_id,
        'organization_name', v_org_name,
        'user_name', v_user_name
    );
    RETURN v_result;
END;
$$;

CREATE FUNCTION identity.cleanup_org_data(p_organization_id uuid, p_confirm text DEFAULT ''::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result jsonb := '{}'::jsonb;
    v_count INT;
BEGIN
    IF p_confirm != 'DELETE_ALL' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Must pass p_confirm := ''DELETE_ALL'' to confirm deletion'
        );
    END IF;
    DELETE FROM identity.user_roles WHERE organization_id = p_organization_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('deleted_user_roles', v_count);
    DELETE FROM identity.user_teams 
    WHERE organization_user_id IN (
        SELECT id FROM identity.organization_users WHERE organization_id = p_organization_id
    );
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('deleted_user_teams', v_count);
    DELETE FROM identity.organization_users WHERE organization_id = p_organization_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('deleted_org_users', v_count);
    DELETE FROM identity.teams WHERE organization_id = p_organization_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('deleted_teams', v_count);
    DELETE FROM identity.roles WHERE organization_id = p_organization_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('deleted_roles', v_count);
    DELETE FROM identity.locations WHERE organization_id = p_organization_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_result := v_result || jsonb_build_object('deleted_locations', v_count);
    RETURN v_result || jsonb_build_object(
        'success', true,
        'organization_id', p_organization_id
    );
END;
$$;

CREATE FUNCTION identity.cleanup_user_from_org(p_user_id uuid, p_organization_id uuid, p_hard_delete boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_org_user_id UUID;
    v_deleted_roles INT := 0;
    v_deleted_teams INT := 0;
    v_result jsonb := '{}'::jsonb;
BEGIN
    SELECT id INTO v_org_user_id 
    FROM identity.organization_users 
    WHERE organization_id = p_organization_id AND user_id = p_user_id;
    IF v_org_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found in organization');
    END IF;
    IF p_hard_delete THEN
        DELETE FROM identity.user_roles WHERE organization_user_id = v_org_user_id;
        GET DIAGNOSTICS v_deleted_roles = ROW_COUNT;
        DELETE FROM identity.user_teams WHERE organization_user_id = v_org_user_id;
        GET DIAGNOSTICS v_deleted_teams = ROW_COUNT;
        DELETE FROM identity.organization_users WHERE id = v_org_user_id;
        v_result := jsonb_build_object('success', true, 'action', 'hard_delete', 'deleted_roles', v_deleted_roles, 'deleted_teams', v_deleted_teams, 'deleted_org_user', true);
    ELSE
        UPDATE identity.organization_users 
        SET is_active = false, 
            status = 'OFFLINE'::public.user_status,
            deleted_at = NOW(),
            updated_at = NOW()
        WHERE id = v_org_user_id;
        v_result := jsonb_build_object('success', true, 'action', 'soft_delete', 'org_user_deactivated', true, 'deleted_at_set', true);
    END IF;
    UPDATE identity.users SET pref_organization_id = NULL WHERE id = p_user_id AND pref_organization_id = p_organization_id;
    RETURN v_result || jsonb_build_object('user_id', p_user_id, 'organization_id', p_organization_id);
END;
$$;

CREATE FUNCTION identity.complete_onboarding(p_org_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_current_settings jsonb;
BEGIN
    SELECT settings INTO v_current_settings
    FROM identity.organizations
    WHERE id = p_org_id;
    IF v_current_settings IS NULL THEN
        v_current_settings := '{}'::jsonb;
    END IF;
    UPDATE identity.organizations
    SET settings = v_current_settings || '{"onboarding_completed": true}'::jsonb,
        updated_at = now()
    WHERE id = p_org_id;
END;
$$;

CREATE FUNCTION identity.confirm_user_password() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE identity.users
    SET password_confirmed = true,
        updated_at = now()
    WHERE auth_id = auth.uid();
    RETURN TRUE;
END;
$$;

CREATE FUNCTION identity.ensure_unified_contact(p_user_id uuid, p_organization_id uuid DEFAULT NULL::uuid, p_persona_type text DEFAULT 'worker'::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_user_email text;
    v_user_name text;
    v_user_phone text;
    v_target_org_id uuid;
    v_contact_id uuid;
BEGIN
    SELECT email, name, mobile INTO v_user_email, v_user_name, v_user_phone
    FROM identity.users WHERE id = p_user_id;
    SELECT COALESCE(p_organization_id, pref_organization_id) INTO v_target_org_id
    FROM identity.users WHERE id = p_user_id;
    IF v_target_org_id IS NULL THEN
        RAISE EXCEPTION 'No organization specified or set as preference for user %', p_user_id;
    END IF;
    SELECT id INTO v_contact_id 
    FROM unified.contacts 
    WHERE organization_id = v_target_org_id 
      AND email = v_user_email 
      AND persona_type = p_persona_type;
    IF v_contact_id IS NULL THEN
        IF NOT EXISTS (SELECT 1 FROM unified.contacts WHERE id = p_user_id) THEN
            v_contact_id := p_user_id;
        ELSE
            v_contact_id := gen_random_uuid();
        END IF;
        INSERT INTO unified.contacts (
            id, organization_id, name, email, phone,
            status, contact_type, module, persona_type,
            created_at, updated_at
        ) VALUES (
            v_contact_id,
            v_target_org_id,
            COALESCE(v_user_name, 'User'),
            v_user_email,
            v_user_phone,
            'active',
            'person',
            'identity',
            p_persona_type,
            NOW(),
            NOW()
        );
    ELSE
        UPDATE unified.contacts SET
            phone = v_user_phone,
            name = v_user_name,
            updated_at = NOW()
        WHERE id = v_contact_id;
    END IF;
    RETURN v_contact_id;
END;
$$;

CREATE FUNCTION identity.get_all_approvers_from_blueprint(p_submitter_org_user_id uuid, p_organization_id uuid, p_blueprint_definition jsonb, p_current_stage_id text, p_created_at timestamp with time zone, p_current_time timestamp with time zone) RETURNS TABLE(approver_user_id uuid, eligibility_window text)
    LANGUAGE plpgsql STABLE
    AS $$DECLARE
    /*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    get_all_approvers_from_blueprint
     * PURPOSE:     Dynamic approval routing based on Blueprint JSON definitions.
     * FALLBACK:    Auto-returns submitter if they are Top-Level (nlevel=1) and no managers exist.
     * ======================================================================================
     */
    v_stage_rules jsonb;
    v_active_phase jsonb;
    v_approver_definition jsonb;
    v_window_end timestamptz;
    v_time_window_hours integer;
    v_phase_is_active boolean := FALSE;
    v_submitter_path extensions.ltree;
    v_row RECORD;
    v_found_any boolean := FALSE;
BEGIN
    SELECT ou.path INTO v_submitter_path
    FROM identity.organization_users ou
    WHERE ou.id = p_submitter_org_user_id;
    SELECT stage -> 'approval_rules'
    INTO v_stage_rules
    FROM jsonb_array_elements(p_blueprint_definition -> 'lifecycle' -> 'stages') AS stage
    WHERE stage ->> 'id' = p_current_stage_id;
    IF v_stage_rules IS NULL OR v_stage_rules -> 'phases' IS NULL THEN
        RAISE WARNING 'No approval rules or phases found for stage %', p_current_stage_id;
        RETURN;
    END IF;
    FOR v_active_phase IN
        SELECT x.value 
        FROM jsonb_array_elements(v_stage_rules -> 'phases') AS x(value)
        ORDER BY (x.value->>'time_window_hours')::integer NULLS LAST
    LOOP
        v_time_window_hours := (v_active_phase ->> 'time_window_hours')::integer;
        v_phase_is_active := FALSE;
        IF v_time_window_hours IS NOT NULL THEN
            v_window_end := p_created_at + (v_time_window_hours || ' hours')::interval;
            v_phase_is_active := p_current_time < v_window_end;
        ELSE
            v_phase_is_active := TRUE;
        END IF;
        IF v_phase_is_active THEN
            v_found_any := FALSE;
            FOR v_approver_definition IN
                SELECT y.value FROM jsonb_array_elements(v_active_phase -> 'approvers') AS y(value)
            LOOP
                IF v_approver_definition ->> 'type' = 'MANAGER_LEVEL' THEN
                    FOR v_row IN
                        SELECT 
                            ou.user_id, 
                            v_active_phase ->> 'window_tag' AS window_tag
                        FROM identity.organization_users ou
                        WHERE ou.path OPERATOR(extensions.@>) v_submitter_path
                          AND ou.id != p_submitter_org_user_id
                          AND ou.organization_id = p_organization_id
                          AND (
                            (extensions.nlevel(v_submitter_path) - extensions.nlevel(ou.path)) >= (v_approver_definition ->> 'level_start')::integer
                            AND (
                                v_approver_definition ->> 'level_end' = 'infinity' 
                                OR (extensions.nlevel(v_submitter_path) - extensions.nlevel(ou.path)) <= (v_approver_definition ->> 'level_end')::integer
                            )
                          )
                    LOOP
                        approver_user_id := v_row.user_id;
                        eligibility_window := v_row.window_tag;
                        v_found_any := TRUE;
                        RETURN NEXT;
                    END LOOP;
                ELSIF v_approver_definition ->> 'type' = 'ROLE' THEN
                    FOR v_row IN
                        SELECT ou.user_id, v_active_phase ->> 'window_tag' AS window_tag
                        FROM identity.organization_users ou JOIN identity.user_roles ur ON ou.id = ur.organization_user_id
                        WHERE ou.organization_id = p_organization_id
                          AND ur.role_id = (v_approver_definition ->> 'role_id')::uuid
                          AND ou.is_active = TRUE
                    LOOP
                        approver_user_id := v_row.user_id;
                        eligibility_window := v_row.window_tag;
                        v_found_any := TRUE;
                        RETURN NEXT;
                    END LOOP;
                END IF;
            END LOOP;
            IF NOT v_found_any AND extensions.nlevel(v_submitter_path) = 1 THEN
                SELECT user_id INTO approver_user_id FROM identity.organization_users WHERE id = p_submitter_org_user_id;
                eligibility_window := v_active_phase ->> 'window_tag';
                v_found_any := TRUE;
                RETURN NEXT;
            END IF;
            IF v_found_any THEN
                RETURN;
            END IF;
        END IF;
    END LOOP;
    RETURN;
END;$$;

CREATE FUNCTION identity.get_applicable_config_type_values(p_entity_schema text, p_entity_type text, p_org_id uuid DEFAULT identity.get_current_org_id(), p_location_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_has_location_col boolean;
    v_location_path   ltree;
    v_result          jsonb;
    v_fqn             text;
BEGIN
    v_fqn := format('%I.%I', p_entity_schema, p_entity_type);
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = p_entity_schema
          AND table_name   = p_entity_type
          AND column_name  = 'location_id'
    ) INTO v_has_location_col;
    IF p_location_id IS NOT NULL AND v_has_location_col THEN
        SELECT path INTO v_location_path
        FROM identity.locations
        WHERE id = p_location_id;
    END IF;
    IF v_has_location_col THEN
        EXECUTE format(
            $q$
            WITH ranked AS (
                SELECT *,
                    CASE
                        WHEN organization_id = $1 AND location_id = $2
                            THEN 1
                        WHEN organization_id = $1 AND location_id IS NOT NULL
                             AND $3 IS NOT NULL
                             AND (SELECT path FROM identity.locations WHERE id = location_id)
                                 @> $3
                            THEN 2
                        WHEN organization_id = $1 AND location_id IS NULL
                            THEN 3
                        WHEN organization_id IS NULL AND location_id IS NULL
                            THEN 4
                        ELSE NULL
                    END AS priority,
                    CASE
                        WHEN organization_id = $1 AND location_id IS NOT NULL
                             AND $3 IS NOT NULL
                            THEN nlevel(
                                (SELECT path FROM identity.locations WHERE id = location_id)
                            )
                        ELSE 0
                    END AS depth
                FROM %s
            )
            SELECT COALESCE(jsonb_agg(
                row_to_json(r.*)::jsonb - 'priority' - 'depth'
                ORDER BY r.priority, r.depth DESC  -- higher depth = nearer ancestor
            ), '[]'::jsonb)
            FROM ranked r
            WHERE r.priority = (SELECT min(priority) FROM ranked WHERE priority IS NOT NULL)
            $q$,
            v_fqn
        )
        INTO v_result
        USING p_org_id, p_location_id, v_location_path;
    ELSE
        EXECUTE format(
            $q$
            WITH ranked AS (
                SELECT *,
                    CASE
                        WHEN organization_id = $1 THEN 1   -- org-level
                        WHEN organization_id IS NULL THEN 2 -- global
                        ELSE NULL
                    END AS priority
                FROM %s
            )
            SELECT COALESCE(jsonb_agg(
                row_to_json(r.*)::jsonb - 'priority'
            ), '[]'::jsonb)
            FROM ranked r
            WHERE r.priority = (SELECT min(priority) FROM ranked WHERE priority IS NOT NULL)
            $q$,
            v_fqn
        )
        INTO v_result
        USING p_org_id;
    END IF;
    RETURN v_result;
END;
$_$;

CREATE FUNCTION identity.get_current_org_id() RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
     RETURN COALESCE(
         NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'organization_id', '')::uuid,
         NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'organization_id', '')::uuid,
         NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id', '')::uuid,
         NULLIF(current_setting('request.jwt.claims.organization_id', true), '')::uuid,
         NULLIF(current_setting('request.jwt.claims.org_id', true), '')::uuid,
         NULLIF(current_setting('app.current_org_id', true), '')::uuid,
         (SELECT pref_organization_id FROM identity.users
          WHERE auth_id = auth.uid()
          AND pref_organization_id IS NOT NULL),
         (SELECT organization_id FROM identity.organization_users
          WHERE user_id = identity.get_my_user_id() AND is_active = true
          ORDER BY created_at ASC LIMIT 1)
     );
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE FUNCTION identity.get_current_org_user_id_v2() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT COALESCE(
        NULLIF(current_setting('request.jwt.claims.org_user_id', true), '')::uuid,
        (SELECT id FROM identity.organization_users 
         WHERE user_id = auth.uid() 
         AND organization_id = identity.get_current_org_id()
         AND is_active = true 
         LIMIT 1)
    );
$$;

CREATE FUNCTION identity.get_current_org_user_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT (current_setting('request.jwt.claims.org_user_id', true))::uuid;
$$;

CREATE FUNCTION identity.get_manager_at_level(p_org_user_id uuid, p_organization_id uuid, p_level integer) RETURNS uuid
    LANGUAGE plpgsql STABLE
    AS $$-- DECLARE
DECLARE
 /*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    get_manager_at_level
     * PURPOSE:     Identifies a specific management node (e.g., L2 Manager) via hierarchy.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. RELATIVE DEPTH: Level is relative to the user. p_level=1 is the direct manager.
     * 2. BOUNDS CHECK: Returns NULL if the requested level exceeds the tree depth 
     *    (e.g., asking for L5 manager when the CEO is only 2 levels away).
     * 3. ORG ISOLATION: Strictly scoped to the organization in context.
     * 
     * USE CASES:
     * - "Send notification to the Department Head (L3)".
     * - Approval routing requiring a specific seniority level.
     * 
     * TECHNICAL LOGIC:
     * - Leverages LTREE path string slicing for O(1) depth calculation.
     * - nlevel() determines current depth; subpath() extracts the target ancestor path.
     * ======================================================================================
     */
    v_submitter_path extensions.ltree;
    v_manager_path_level int;
    v_manager_path extensions.ltree;
    v_manager_org_user_id UUID;
BEGIN
    IF p_level < 1 THEN
        RETURN NULL;
    END IF;
    SELECT ou.path
    INTO v_submitter_path
    FROM identity.organization_users ou
    WHERE ou.id = p_org_user_id
      AND ou.organization_id = p_organization_id;
    IF v_submitter_path IS NULL THEN
        RETURN NULL; -- Submitter not found or has no path
    END IF;
    v_manager_path_level := nlevel(v_submitter_path) - p_level;
    IF v_manager_path_level < 1 THEN
        RETURN NULL; -- e.g., asking for L3 manager of an L2 employee
    END IF;
    v_manager_path := subpath(v_submitter_path, 0, v_manager_path_level);
    SELECT ou.id
    INTO v_manager_org_user_id
    FROM identity.organization_users ou
    WHERE ou.path = v_manager_path
      AND ou.organization_id = p_organization_id
    LIMIT 1;
    RETURN v_manager_org_user_id;
END;$$;

CREATE FUNCTION identity.get_module_hierarchy() RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN (
    SELECT jsonb_object_agg(
      m.name,
      CASE
        WHEN sub_modules_data = '{}'::jsonb AND settings_data = '{}'::jsonb THEN NULL
        WHEN sub_modules_data = '{}'::jsonb THEN jsonb_build_object('settings', settings_data)
        WHEN settings_data = '{}'::jsonb THEN jsonb_build_object('sub_modules', sub_modules_data)
        ELSE jsonb_build_object('sub_modules', sub_modules_data, 'settings', settings_data)
      END
    ) FILTER (WHERE sub_modules_data != '{}'::jsonb OR settings_data != '{}'::jsonb)
    FROM (
      SELECT
        name,
        COALESCE(sub_modules, '{}'::jsonb) AS sub_modules_data,
        COALESCE(settings, '{}'::jsonb) AS settings_data
      FROM identity.modules  -- Changed from core.modules to identity.modules
      WHERE is_active = true
      ORDER BY name
    ) m
  );
END;
$$;

CREATE FUNCTION identity.get_my_active_org_ids() RETURNS uuid[]
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN identity.get_my_org_ids();
END;
$$;

CREATE FUNCTION identity.get_my_org_ids() RETURNS uuid[]
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_is_admin boolean;
BEGIN
    SELECT identity.is_saas_admin() INTO v_is_admin;
    IF v_is_admin THEN
        RETURN ARRAY(SELECT id FROM identity.organizations WHERE is_active = true);
    ELSE
        RETURN ARRAY(
            SELECT organization_id 
            FROM identity.organization_users 
            WHERE user_id = identity.get_my_user_id() 
              AND is_active = true
        );
    END IF;
END;
$$;

CREATE FUNCTION identity.get_my_organizations_v2() RETURNS TABLE(organization_id uuid, organization_name text, role_names text[], is_primary boolean, joined_at timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as organization_id,
        o.name as organization_name,
        COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as role_names,
        (u.pref_organization_id = o.id) as is_primary,
        ou.created_at as joined_at
    FROM identity.organization_users ou
    JOIN identity.organizations o ON ou.organization_id = o.id
    JOIN identity.users u ON ou.user_id = u.id
    LEFT JOIN identity.user_roles ur ON ou.id = ur.organization_user_id
    LEFT JOIN identity.roles r ON ur.role_id = r.id
    WHERE u.auth_id = auth.uid()
      AND ou.is_active = true
    GROUP BY o.id, o.name, u.pref_organization_id, ou.created_at
    ORDER BY joined_at DESC;
END;
$$;

CREATE FUNCTION identity.get_my_organizations() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
    /*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    get_my_organizations
     * PURPOSE:     Retrieves the tenant landscape for the current user session.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. MULTI-TENANCY: Users may belong to multiple organizations. This function returns
     *    all active memberships for the caller (auth.uid()).
     * 2. LOCATION DISCOVERY: Aggregates all accessible locations:
     *    - Direct: assigned to the 'organization_users' record.
     *    - Team: inherited from any 'teams' the user is a member of.
     * 3. DATA ELEVATION: The primary (default) location is elevated to the root of the
     *    org object for UI convenience.
     * 
     * USE CASES:
     * - Initial login "Organization Selector".
     * - Populating the "Switch Context" dropdown in the application header.
     * 
     * TECHNICAL LOGIC:
     * - Uses a sequence of CTEs to resolve user -> memberships -> teams -> locations.
     * - Ensures deduplication of location IDs using UNION + DISTINCT.
     * - Returns a JSONB array, strictly ordered by organization_name.
     * ======================================================================================
     */
    v_user_id UUID;
    v_result jsonb;
BEGIN
    SELECT id INTO v_user_id
    FROM identity.users
    WHERE auth_id = auth.uid();
    IF v_user_id IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;
    WITH org_user_info AS (
        SELECT 
            ou.organization_id,
            o.name AS organization_name,
            ou.location_id AS default_location_id, 
            ou.id AS organization_user_id
        FROM identity.organization_users ou
        JOIN identity.organizations o ON ou.organization_id = o.id
        WHERE ou.user_id = v_user_id
          AND ou.is_active = true
    ),
    org_user_with_default_location AS (
        SELECT 
            oui.organization_id,
            oui.organization_name,
            oui.default_location_id,
            oui.organization_user_id,
            l.name AS default_location_name
        FROM org_user_info oui
        LEFT JOIN identity.locations l ON oui.default_location_id = l.id
    ),
    direct_location_access AS (
        SELECT 
            ouwdl.organization_id,
            ouwdl.default_location_id AS location_id,
            ouwdl.default_location_name AS location_name
        FROM org_user_with_default_location ouwdl
        WHERE ouwdl.default_location_id IS NOT NULL
    ),
    team_locations AS (
        SELECT 
            ouwdl.organization_id,
            l.id AS location_id,
            l.name AS location_name
        FROM identity.user_teams ut
        JOIN identity.teams t ON ut.team_id = t.id
        JOIN identity.locations l ON t.location_id = l.id
        JOIN org_user_with_default_location ouwdl 
            ON ut.organization_user_id = ouwdl.organization_user_id
        WHERE t.location_id IS NOT NULL
    ),
    all_accessible_locations AS (
        SELECT DISTINCT organization_id, location_id, location_name
        FROM (
            SELECT * FROM direct_location_access
            UNION 
            SELECT * FROM team_locations
        ) combined
    ),
    org_with_locations AS (
        SELECT 
            ouwdl.organization_id,
            ouwdl.organization_name,
            ouwdl.default_location_id,
            ouwdl.default_location_name,
            COALESCE(jsonb_agg(
                jsonb_build_object(
                    'location_id', al.location_id,
                    'location_name', al.location_name
                ) ORDER BY al.location_name
            ) FILTER (WHERE al.location_id IS NOT NULL), '[]'::jsonb) AS locations
        FROM org_user_with_default_location ouwdl
        LEFT JOIN all_accessible_locations al 
            ON al.organization_id = ouwdl.organization_id
        GROUP BY 
            ouwdl.organization_id, ouwdl.organization_name, 
            ouwdl.default_location_id, ouwdl.default_location_name
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'organization_id', organization_id,
            'organization_name', organization_name,
            'default_location_id', default_location_id,      -- New field
            'default_location_name', default_location_name,  -- New field
            'locations', locations
        ) ORDER BY organization_name
    ) INTO v_result
    FROM org_with_locations;
    RETURN COALESCE(v_result, '[]'::jsonb);
END;$$;

CREATE FUNCTION identity.get_my_user_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT id FROM identity.users WHERE auth_id = auth.uid();
$$;

CREATE FUNCTION identity.get_organization_module_configs(p_organization_id uuid, p_scope_level text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_object_agg(config.name, config.data), '{}'::jsonb)
    FROM (
      SELECT DISTINCT ON (m.name)
        m.name,
        CASE
          WHEN COALESCE(mc.sub_modules, '{}'::jsonb) = '{}'::jsonb 
               AND COALESCE(mc.settings, '{}'::jsonb) = '{}'::jsonb THEN NULL
          ELSE jsonb_strip_nulls(jsonb_build_object(
            'sub_modules', NULLIF(mc.sub_modules, '{}'::jsonb),
            'settings', NULLIF(mc.settings, '{}'::jsonb)
          ))
        END as data
      FROM identity.modules m
      LEFT JOIN identity.org_module_configs mc ON m.id = mc.module_id
      WHERE m.is_active = true
        AND mc.scope_level = p_scope_level
        AND (mc.organization_id = p_organization_id OR mc.organization_id IS NULL)
      ORDER BY m.name, (mc.organization_id IS NULL) ASC
    ) config
    WHERE config.data IS NOT NULL
  );
END;
$$;

CREATE FUNCTION identity.get_subordinates_by_user(p_manager_user_id uuid, p_organization_id uuid) RETURNS TABLE(subordinate_user_id uuid)
    LANGUAGE plpgsql STABLE
    AS $$-- DECLARE
DECLARE
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    get_subordinates_by_user
     * PURPOSE:     Retrieves the entire direct/indirect reporting sub-tree.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. RECURSIVE DISCOVERY: Returns ALL nodes where the manager's path is an ancestor.
     * 2. EXCLUSION: The manager themselves is excluded from the result set.
     * 3. ORG BOUNDARY: Strictly limited to the p_organization_id.
     * 
     * USE CASES:
     * - "Show my Team" UI view.
     * - Filtering reports/dashboards to only show data for a manager's sub-tree.
     * - Global "CEO View" of the entire organization.
     * 
     * TECHNICAL LOGIC:
     * - Uses LTREE's <@ (descendant) operator for high-speed sub-tree scanning.
     * - Leverages the GIST index on the 'path' column.
     * ======================================================================================
     */
    v_manager_record RECORD; -- Will hold the manager's ID and ltree path
BEGIN
    SELECT ou.id, ou.path
    INTO v_manager_record
    FROM identity.organization_users ou
    WHERE ou.user_id = p_manager_user_id
      AND ou.organization_id = p_organization_id;
    IF v_manager_record.id IS NULL THEN
        RETURN;
    END IF;
    RETURN QUERY
    SELECT
      ou.user_id -- Return the actual user_ids
    FROM
      identity.organization_users ou
    WHERE
      ou.path <@ v_manager_record.path
      AND ou.id != v_manager_record.id
      AND ou.organization_id = p_organization_id;
END;$$;

CREATE FUNCTION identity.is_saas_admin(p_user_id uuid DEFAULT identity.get_my_user_id()) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM identity.organization_users ou
        JOIN identity.user_roles ur ON ur.organization_user_id = ou.id
        JOIN identity.roles r ON r.id = ur.role_id
        JOIN identity.organizations o ON ou.organization_id = o.id
        WHERE ou.user_id = p_user_id
          AND o.is_system_org = true
          AND r.is_sassadmin = true
    );
END;
$$;

CREATE FUNCTION identity.is_user_sassadmin(p_user_id uuid, p_org_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM identity.user_roles ur
        JOIN identity.roles r ON ur.role_id = r.id
        WHERE ur.organization_user_id IN (
            SELECT id FROM identity.organization_users 
            WHERE user_id = p_user_id AND organization_id = p_org_id
        )
        AND r.is_sassadmin = true
    );
$$;

CREATE FUNCTION identity.jwt_generate_thin_claims(p_auth_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_record RECORD;
    v_is_zoworks_member BOOLEAN := false;
    v_db_role TEXT := 'authenticated';
    v_preferred_org_id UUID;
    v_org_user_id UUID;
BEGIN
    SELECT id, pref_organization_id
    INTO v_user_record
    FROM identity.users
    WHERE auth_id = p_auth_id;
    IF v_user_record IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;
    SELECT EXISTS (
        SELECT 1
        FROM identity.organization_users ou
        JOIN identity.organizations o ON ou.organization_id = o.id
        WHERE ou.user_id = v_user_record.id AND o.name = 'zoworks'
    ) INTO v_is_zoworks_member;
    IF v_is_zoworks_member THEN
        v_db_role := 'service_role';
        v_preferred_org_id := v_user_record.pref_organization_id;
        SELECT ou.id INTO v_org_user_id
        FROM identity.organization_users ou
        JOIN identity.organizations o ON ou.organization_id = o.id
        WHERE ou.user_id = v_user_record.id AND o.name = 'zoworks'
        LIMIT 1;
    ELSE
        v_db_role := 'authenticated';
        SELECT ou.organization_id, ou.id INTO v_preferred_org_id, v_org_user_id
        FROM identity.organization_users ou
        WHERE ou.user_id = v_user_record.id
          AND ou.organization_id = v_user_record.pref_organization_id
          AND ou.is_active = true;
        IF v_preferred_org_id IS NULL THEN
            SELECT ou.organization_id, ou.id INTO v_preferred_org_id, v_org_user_id
            FROM identity.organization_users ou
            WHERE ou.user_id = v_user_record.id AND ou.is_active = true
            ORDER BY ou.created_at
            LIMIT 1;
        END IF;
    END IF;
    RETURN jsonb_build_object(
        'user_id', v_user_record.id,
        'role', v_db_role,
        'org_id', v_preferred_org_id,              -- Legacy
        'organization_id', v_preferred_org_id,     -- Active
        'org_user_id', v_org_user_id,
        'app_metadata', jsonb_build_object(        -- Standardized location
            'organization_id', v_preferred_org_id,
            'org_user_id', v_org_user_id
        )
    );
END;
$$;

CREATE FUNCTION identity.jwt_get_user_session(p_organization_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
    v_auth_id       UUID := auth.uid();
    v_user_id       UUID;
    v_org_id        UUID;
    v_org_name      TEXT;
    v_org_user_id   UUID;
    v_org_user_path ltree;
    v_claims        JSONB;
    v_is_sassadmin  BOOLEAN;
BEGIN
    SELECT 
        u.id, 
        o.id, 
        o.name, 
        ou.id, 
        ou.path
    INTO 
        v_user_id, 
        v_org_id, 
        v_org_name, 
        v_org_user_id, 
        v_org_user_path
    FROM identity.users u
    JOIN identity.organization_users ou ON u.id = ou.user_id
    JOIN identity.organizations o ON ou.organization_id = o.id
    WHERE u.auth_id = v_auth_id 
      AND o.id = p_organization_id;
    IF NOT FOUND THEN 
        RETURN '{}'::jsonb; 
    END IF;
    v_is_sassadmin := identity.is_user_sassadmin(v_user_id, v_org_id);
IF v_org_name = 'zoworks' OR v_is_sassadmin THEN
    WITH perms AS (
        SELECT
            jsonb_agg(DISTINCT jsonb_build_object('id', r.id, 'name', r.name)) AS roles,
            identity.jwt_jsonb_deep_merge_agg(r.permissions) AS permissions
        FROM identity.user_roles ur
        JOIN identity.roles r ON ur.role_id = r.id
        WHERE ur.organization_user_id = v_org_user_id
    ),
    locs AS (
        SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', l.id, 'name', l.name)), '[]'::jsonb) AS locations
        FROM (
            SELECT location_id FROM identity.organization_users WHERE id = v_org_user_id AND location_id IS NOT NULL
            UNION
            SELECT t.location_id FROM identity.user_teams ut
            JOIN identity.teams t ON ut.team_id = t.id
            WHERE ut.organization_user_id = v_org_user_id AND t.location_id IS NOT NULL
        ) src
        JOIN identity.locations l ON src.location_id = l.id
    ),
    teams AS (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name)), '[]'::jsonb) AS teams
        FROM identity.user_teams ut
        JOIN identity.teams t ON ut.team_id = t.id
        WHERE ut.organization_user_id = v_org_user_id
    ),
    subs AS (
        SELECT COALESCE(jsonb_agg(ou.user_id), '[]'::jsonb) AS user_ids
        FROM identity.organization_users ou
        WHERE ou.path <@ v_org_user_path
          AND ou.id <> v_org_user_id
          AND ou.organization_id = v_org_id
    )
    SELECT jsonb_build_object(
        'user_id', v_user_id,
        'org_user_id', v_org_user_id,
        'org_id', v_org_id,
        'is_saas_admin', true,
        'bypass', true,
        'permissions', '{"*": {"*": "all"}}'::jsonb,
        'roles', COALESCE((SELECT roles FROM perms), '[]'::jsonb),
        'teams', (SELECT teams FROM teams),
        'locations', (SELECT locations FROM locs),
        'subordinates', (SELECT user_ids FROM subs)
    ) INTO v_claims;  -- Use INTO clause
    RETURN v_claims;  -- Return the variable
END IF;
    WITH perms AS (
        SELECT
            jsonb_agg(DISTINCT jsonb_build_object('id', r.id, 'name', r.name)) AS roles,
            identity.jwt_jsonb_deep_merge_agg(r.permissions) AS permissions
        FROM identity.user_roles ur
        JOIN identity.roles r ON ur.role_id = r.id
        WHERE ur.organization_user_id = v_org_user_id
    ),
    locs AS (
        SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', l.id, 'name', l.name)), '[]'::jsonb) AS locations
        FROM (
            SELECT location_id FROM identity.organization_users WHERE id = v_org_user_id AND location_id IS NOT NULL
            UNION
            SELECT t.location_id FROM identity.user_teams ut
            JOIN identity.teams t ON ut.team_id = t.id
            WHERE ut.organization_user_id = v_org_user_id AND t.location_id IS NOT NULL
        ) src
        JOIN identity.locations l ON src.location_id = l.id
    ),
    teams AS (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name)), '[]'::jsonb) AS teams
        FROM identity.user_teams ut
        JOIN identity.teams t ON ut.team_id = t.id
        WHERE ut.organization_user_id = v_org_user_id
    ),
    subs AS (
        SELECT COALESCE(jsonb_agg(ou.user_id), '[]'::jsonb) AS user_ids
        FROM identity.organization_users ou
        WHERE ou.path <@ v_org_user_path
          AND ou.id <> v_org_user_id
          AND ou.organization_id = v_org_id
    )
    SELECT jsonb_build_object(
        'user_id', v_user_id,
        'org_user_id', v_org_user_id,
        'org_id', v_org_id,
        'is_saas_admin', false,
        'bypass', false,
        'roles', COALESCE((SELECT roles FROM perms), '[]'::jsonb),
        'permissions', COALESCE((SELECT permissions FROM perms), '{}'::jsonb),
        'teams', (SELECT teams FROM teams),
        'locations', (SELECT locations FROM locs),
        'subordinates', (SELECT user_ids FROM subs)
    ) INTO v_claims;
    RETURN v_claims;
END;$$;

CREATE FUNCTION identity.jwt_jsonb_merge_deep(val1 jsonb, val2 jsonb) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$BEGIN
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    jwt_jsonb_merge_deep
     * PURPOSE:     Recursively merges two JSONB objects.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. HIERARCHICAL OVERRIDE: If a key exists in both, and the values are objects,
     *    they are merged recursively. Otherwise, the value from val2 overrides val1.
     * 2. NULL STRIPPING: Uses jsonb_strip_nulls to remove keys with null values.
     * 
     * USE CASES:
     * - Merging permission objects from multiple roles into a single session claim.
     * - Layering organization defaults over system defaults.
     * 
     * TECHNICAL LOGIC:
     * - Uses FULL OUTER JOIN on jsonb_each to identify matching keys.
     * - Recurses only when both values are of jsonb type 'object'.
     * ======================================================================================
     */
    RETURN jsonb_strip_nulls(jsonb_object_agg(
        COALESCE(ka, kb),
        CASE
            WHEN va IS NULL THEN vb
            WHEN vb IS NULL THEN va
            WHEN jsonb_typeof(va) = 'object' AND jsonb_typeof(vb) = 'object'
            THEN identity.jwt_jsonb_merge_deep(va, vb) -- Schema-qualified recursive call
            ELSE vb
        END
    ))
    FROM jsonb_each(val1) AS t1(ka, va)
    FULL OUTER JOIN jsonb_each(val2) AS t2(kb, vb) ON ka = kb;
END;$$;

CREATE FUNCTION identity.onboard_invite_user_to_org(p_email text, p_first_name text, p_last_name text, p_org_id uuid, p_role_id uuid, p_team_id uuid, p_location_id uuid, p_auth_id uuid DEFAULT NULL::uuid, p_details jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_org_user_id UUID;
    v_full_name TEXT := TRIM(COALESCE(p_first_name, '') || ' ' || COALESCE(p_last_name, ''));
    v_current_user_id UUID := auth.uid();
BEGIN
    SET LOCAL search_path = identity, hr, core, public;
    SELECT id INTO v_user_id FROM identity.users WHERE email = p_email;
    IF v_user_id IS NULL THEN
        IF p_auth_id IS NULL THEN
            RAISE EXCEPTION 'auth_id is required for new users';
        END IF;
        INSERT INTO identity.users (
            auth_id, name, email, details, created_by, updated_by, pref_organization_id, password_confirmed
        )
        VALUES (
            p_auth_id, v_full_name, p_email, 
            p_details || jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name, 'email', p_email),
            v_current_user_id, v_current_user_id, p_org_id, false
        )
        RETURNING id INTO v_user_id;
    ELSE
        UPDATE identity.users 
        SET 
            pref_organization_id = COALESCE(pref_organization_id, p_org_id),
            auth_id = COALESCE(auth_id, p_auth_id),
            updated_at = now()
        WHERE id = v_user_id;
    END IF;
    INSERT INTO identity.organization_users (
        organization_id, user_id, location_id, is_active, persona_type,
        details, created_by, updated_by
    ) VALUES (
        p_org_id, v_user_id, p_location_id, true, 'worker',
        jsonb_build_object('person', jsonb_build_object('name', jsonb_build_object('family', p_last_name, 'given', p_first_name))),
        v_current_user_id, v_current_user_id
    )
    ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET 
        location_id = EXCLUDED.location_id,
        is_active = true,
        updated_at = now()
    RETURNING id INTO v_org_user_id;
    BEGIN
        UPDATE hr.profiles SET
            job_title = p_details->>'designation',
            department = p_details->>'department',
            employment_type = COALESCE(p_details->>'employment_type', 'full-time'),
            employment_status = 'active', 
            updated_at = now(),
            updated_by = v_current_user_id
        WHERE id = v_org_user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'HR Profile Enrichment skipped for org_user %: %', v_org_user_id, SQLERRM;
    END;
    IF p_team_id IS NOT NULL THEN
        INSERT INTO identity.user_teams (organization_user_id, team_id, organization_id, created_by)
        VALUES (v_org_user_id, p_team_id, p_org_id, v_current_user_id)
        ON CONFLICT (organization_user_id, team_id) DO NOTHING;
    END IF;
    IF p_role_id IS NOT NULL AND p_team_id IS NOT NULL THEN
        INSERT INTO identity.user_roles (organization_user_id, role_id, team_id, organization_id, created_by)
        VALUES (v_org_user_id, p_role_id, p_team_id, p_org_id, v_current_user_id)
        ON CONFLICT (organization_user_id, role_id, team_id) DO NOTHING;
    END IF;
    RETURN jsonb_build_object(
        'status', 'success',
        'user_id', v_user_id,
        'org_user_id', v_org_user_id
    );
END;
$$;

CREATE FUNCTION identity.onboard_promote_to_tenant(p_org_id uuid, p_auth_id uuid DEFAULT NULL::uuid, p_approved_modules jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
    v_contact_id     UUID;
    v_contact_email  TEXT;
    v_contact_name   TEXT;
    v_contact_mobile TEXT;
    v_user_id        UUID;
    v_org_user_id    UUID;
    v_role_id        UUID;
    v_location_id    UUID;
    v_team_id        UUID;
    v_settings       JSONB;
    v_requested_mods JSONB;
    v_final_mods     JSONB;
    v_res            JSONB;
    v_first_name     TEXT;
    v_last_name      TEXT;
BEGIN
    SET LOCAL search_path = identity, crm, hr, public, catalog;
    SELECT
        o.claimed_by_contact_id, o.settings, c.name, c.email, c.phone
    INTO
        v_contact_id, v_settings, v_contact_name, v_contact_email, v_contact_mobile
    FROM identity.organizations o
    JOIN unified.contacts c ON o.claimed_by_contact_id = c.id
    WHERE o.id = p_org_id;
    IF v_contact_id IS NULL THEN
        RAISE EXCEPTION 'Organization % not found or has no claiming contact.', p_org_id;
    END IF;
    v_first_name := split_part(v_contact_name, ' ', 1);
    v_last_name  := NULLIF(substring(v_contact_name from ' (.*)$'), '');
    SELECT id INTO v_user_id FROM identity.users WHERE email = v_contact_email;
    IF v_user_id IS NULL AND p_auth_id IS NULL THEN
        RETURN jsonb_build_object(
            'status',     'NEED_INVITE',
            'email',      v_contact_email,
            'first_name', v_first_name,
            'last_name',  v_last_name
        );
    END IF;
    UPDATE identity.organizations
    SET is_active = true, updated_at = now()
    WHERE id = p_org_id;
    v_final_mods := COALESCE(p_approved_modules, v_settings->'requested_modules', '[]'::jsonb);
    INSERT INTO identity.org_module_configs (organization_id, module_id)
    SELECT p_org_id, m.id
    FROM catalog.offerings o,
         jsonb_array_elements_text(o.meta->'bundles') as b_schema,
         identity.modules m
    WHERE o.organization_id = '55555555-5555-5555-5555-555555555555' -- Zoworks master
      AND o.short_code = ANY(ARRAY(SELECT jsonb_array_elements_text(v_final_mods)))
      AND m.name = b_schema
      AND m.organization_id = '55555555-5555-5555-5555-555555555555' -- System modules
      AND NOT EXISTS (
          SELECT 1 FROM identity.org_module_configs 
          WHERE organization_id = p_org_id AND module_id = m.id
      );
    INSERT INTO identity.roles (organization_id, name, permissions, is_active)
    VALUES (p_org_id, 'SuperAdmin', '{"*": true}'::jsonb, true)
    ON CONFLICT (organization_id, name) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_role_id;
    INSERT INTO identity.locations (organization_id, name, time_zone, is_active)
    VALUES (p_org_id, 'Headquarters', 'GMT+5:30', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_location_id;
    INSERT INTO identity.teams (organization_id, location_id, name)
    VALUES (p_org_id, v_location_id, 'Leadership Team')
    ON CONFLICT (location_id, name) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_team_id;
    SELECT identity.onboard_invite_user_to_org(
        p_email      := v_contact_email,
        p_first_name := v_first_name,
        p_last_name  := COALESCE(v_last_name, ''),
        p_org_id     := p_org_id,
        p_role_id    := v_role_id,
        p_team_id    := v_team_id,
        p_location_id := v_location_id,
        p_auth_id    := p_auth_id,
        p_details    := jsonb_build_object('mobile', v_contact_mobile, 'persona', 'admin')
    ) INTO v_res;
    UPDATE crm.v_contacts SET status = 'CONVERTED' WHERE id = v_contact_id;
    RETURN jsonb_build_object(
        'status',          'success',
        'organization_id', p_org_id,
        'user_id',         COALESCE(v_user_id, (v_res->>'user_id')::uuid),
        'message',         'Tenant activated and modules provisioned from catalog.'
    );
END;
$_$;

CREATE FUNCTION identity.reassign_reports_on_deactivation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$DECLARE
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    reassign_reports_on_deactivation
     * PURPOSE:     Prevents orphaned reports when a manager is deactivated.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. SKIP-LEVEL REASSIGNMENT: If a manager's status changes to 'inactive', their 
     *    direct reports are automatically moved to the deactivated manager's manager.
     * 2. ROOT DISCOVERY: If no skip-level manager exists, the reports are moved to 
     *    the root level (manager_id = NULL).
     * 3. TRIGGER MOMENT: Fires AFTER UPDATE on organization_users when status changes.
     * 
     * USE CASES:
     * - Employee offboarding or transition.
     * - Maintaining hierarchy integrity without manual HR intervention.
     * 
     * TECHNICAL LOGIC:
     * - Performs an atomic UPDATE on all rows where manager_id = OLD.id.
     * - Uses the OLD.manager_id as the new parent for the orphaned subtree.
     * ======================================================================================
     */
    v_l2_manager_org_user_id uuid;
BEGIN
    IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
        SELECT manager_id INTO v_l2_manager_org_user_id
        FROM identity.organization_users
        WHERE id = OLD.manager_id
          AND organization_id = OLD.organization_id;
        IF v_l2_manager_org_user_id IS NULL THEN
            RAISE WARNING 'User % (org_user_id %) is being deactivated but their manager (org_user_id %) has no manager. Reassigning % reports to NULL.',
                OLD.user_id, OLD.id, OLD.manager_id,
                (SELECT COUNT(*) FROM identity.organization_users WHERE manager_id = OLD.id AND organization_id = OLD.organization_id);
        END IF;
        UPDATE identity.organization_users
        SET manager_id = v_l2_manager_org_user_id
        WHERE manager_id = OLD.id
          AND organization_id = OLD.organization_id;
    END IF;
    RETURN NEW;
END;$$;

CREATE FUNCTION identity.rls_apply_tenant_isolation(p_schema text, p_table text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_table text;
    v_result text := '';
BEGIN
    v_table := format('%I.%I', p_schema, p_table);
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', v_table);
    v_result := v_result || format('OK: RLS enabled+forced on %s', v_table) || chr(10);
    v_result := v_result || 'OK: ' || identity.rls_drop_all_policies(p_schema, p_table) || chr(10);
    EXECUTE format(
        'CREATE POLICY "Tenant_Isolation_V5" ON %s FOR ALL TO authenticated USING (organization_id = identity.get_current_org_id())',
        v_table);
    v_result := v_result || format('OK: Created Tenant_Isolation_V5 on %s', v_table) || chr(10);
    RETURN v_result;
END;
$$;

CREATE FUNCTION identity.rls_audit_gaps(p_schemas text[] DEFAULT ARRAY['crm'::text, 'esm'::text, 'procurement'::text, 'unified'::text, 'workforce'::text, 'hr'::text, 'identity'::text, 'automation'::text, 'ai_mcp'::text, 'core'::text, 'accounting'::text, 'inventory'::text, 'assets'::text, 'public'::text, 'capabilities'::text, 'organization'::text, 'blueprint'::text, 'catalog'::text, 'ctrm'::text, 'wa'::text, 'templates'::text, 'documents'::text, 'analytics'::text, 'process_library'::text, 'calendar'::text, 'logistics'::text, 'construction'::text, 'insurance'::text]) RETURNS TABLE(table_schema text, table_name text, issue text, current_policy text, recommended text, action_sql text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_rec record;
BEGIN
    FOR v_rec IN
        SELECT * FROM identity.rls_recommend_all(p_schemas)
    LOOP
        IF NOT v_rec.has_rls THEN
            RETURN QUERY SELECT
                v_rec.table_schema, v_rec.table_name,
                'NO_RLS'::text, v_rec.current_policy,
                v_rec.recommended, v_rec.action_sql;
        ELSIF v_rec.current_policy IS NULL THEN
            RETURN QUERY SELECT
                v_rec.table_schema, v_rec.table_name,
                'RLS_NO_POLICY'::text, v_rec.current_policy,
                v_rec.recommended, v_rec.action_sql;
        ELSIF v_rec.has_blueprint AND v_rec.blueprint_template IS DISTINCT FROM v_rec.recommended THEN
            RETURN QUERY SELECT
                v_rec.table_schema, v_rec.table_name,
                'TEMPLATE_MISMATCH'::text, v_rec.current_policy,
                v_rec.recommended, v_rec.action_sql;
        END IF;
    END LOOP;
END;
$$;

CREATE FUNCTION identity.rls_bootstrap_entity_policy(p_schema text, p_entity text, p_dry_run boolean DEFAULT false) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_template      text;
    v_owner_col     text;
    v_status_col    text;
    v_location_col  text;
    v_approver_col  text;
    v_account_col   text;
    v_contact_col   text;
    v_vendor_col    text;
    v_owner_is_org_user boolean;
    v_classification text;
    v_policy_sql    text;
    v_insert_sql    text;
    v_policy_name   text;
    v_using_clause  text;
    v_insert_check  text;
    v_bp            record;
    v_result        text;
BEGIN
    SELECT * INTO v_bp FROM core.entity_blueprints
    WHERE entity_schema = p_schema AND entity_type = p_entity AND is_active;
    IF v_bp IS NULL THEN
        RAISE EXCEPTION 'No active blueprint found for %.% — only catalog entities can be bootstrapped', p_schema, p_entity;
    END IF;
    v_classification    := COALESCE(v_bp.classification, 'transactional');
    v_template          := COALESCE(v_bp.rls_config->>'template', '');
    v_owner_col         := v_bp.rls_config->>'owner_col';
    v_status_col        := v_bp.rls_config->>'status_col';
    v_location_col      := v_bp.rls_config->>'location_col';
    v_approver_col      := v_bp.rls_config->>'approver_col';
    v_account_col       := v_bp.rls_config->>'account_col';
    v_contact_col       := v_bp.rls_config->>'contact_col';
    v_vendor_col        := v_bp.rls_config->>'vendor_col';
    v_owner_is_org_user := COALESCE((v_bp.rls_config->>'owner_is_org_user')::boolean, false);
    IF v_template = '' OR v_template IS NULL THEN
        IF v_classification = 'configuration' THEN
            v_template := 'configuration';
        ELSIF v_classification = 'analytical' THEN
            v_template := 'analytical';
        ELSIF p_schema IN ('workforce', 'hr') THEN
            v_template := 'workforce';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_schema = p_schema AND table_name = p_entity
              AND column_name IN ('account_id', 'contact_id', 'vendor_id')) THEN
            v_template := 'standard';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_schema = p_schema AND table_name = p_entity
              AND column_name = 'organization_id') THEN
            v_template := 'tenant_isolation';
        ELSE
            v_template := 'authenticated_access';
        END IF;
    END IF;
    v_insert_check := NULL;
    IF v_template = 'multi_org' THEN
        v_using_clause := 'organization_id = ANY(identity.get_my_org_ids())';
    ELSIF v_template = 'configuration' THEN
        IF v_location_col IS NOT NULL THEN
            v_using_clause := format(
                '(organization_id IS NULL OR organization_id = identity.get_current_org_id()) AND (%I IS NULL OR %I = ANY(identity.get_accessible_location_ids()))',
                v_location_col, v_location_col);
        ELSE
            v_using_clause := 'organization_id IS NULL OR organization_id = identity.get_current_org_id()';
        END IF;
        v_insert_check := 'organization_id = identity.get_current_org_id()';
    ELSIF v_template IN ('analytical', 'authenticated_access') THEN
        v_using_clause := 'true';
    ELSIF v_template = 'user_scope' THEN
        v_using_clause := 'user_id = identity.get_my_user_id()';
    ELSIF v_template = 'tenant_isolation' THEN
        v_using_clause := 'organization_id = identity.get_current_org_id()';
    ELSIF v_template = 'standard' THEN
        DECLARE
            v_parts text[] := ARRAY['ctx.is_saas_admin', 'ctx.my_persona = ''worker'''];
        BEGIN
            IF v_account_col IS NOT NULL THEN
                v_parts := array_append(v_parts, format('%I.%I = ANY(ctx.account_ids)', p_entity, v_account_col));
            END IF;
            IF v_contact_col IS NOT NULL THEN
                v_parts := array_append(v_parts, format('%I.%I = ctx.contact_id', p_entity, v_contact_col));
            END IF;
            IF v_vendor_col IS NOT NULL THEN
                v_parts := array_append(v_parts, format('%I.%I = ANY(ctx.vendor_ids)', p_entity, v_vendor_col));
            END IF;
            v_using_clause := format(
                '%I.organization_id = identity.get_current_org_id() AND EXISTS (SELECT 1 FROM identity.rls_get_session_context() ctx WHERE %s)',
                p_entity, array_to_string(v_parts, ' OR '));
        END;
        v_insert_check := format(
            '%I.organization_id = identity.get_current_org_id() AND EXISTS (SELECT 1 FROM identity.rls_get_session_context() ctx WHERE ctx.my_persona = ''worker'')',
            p_entity);
    ELSIF v_template = 'workforce' THEN
        DECLARE
            v_owner      text := COALESCE(v_owner_col, 'user_id');
            v_status     text := COALESCE(v_status_col, 'stage_id');
            v_loc        text := v_location_col;
            v_self_check text;
            v_draft_check text;
            v_parts text[];
        BEGIN
            v_self_check  := CASE WHEN v_owner_is_org_user
                THEN format('%I.%I = ctx.my_org_user_id', p_entity, v_owner)
                ELSE format('%I.%I = ctx.my_user_id',     p_entity, v_owner) END;
            v_draft_check := format('(%I.%I IS NOT NULL AND %I.%I NOT IN (''Draft'', ''draft''))',
                p_entity, v_status, p_entity, v_status);
            v_parts := ARRAY[
                'ctx.is_saas_admin',
                v_self_check,
                format('(%s AND %I.%I = ANY(ctx.subordinate_user_ids))', v_draft_check, p_entity, v_owner),
                CASE WHEN v_loc IS NOT NULL
                    THEN format('(ctx.has_hr_access AND %s AND (array_length(ctx.accessible_location_ids, 1) = 0 OR %I.%I = ANY(ctx.accessible_location_ids)))', v_draft_check, p_entity, v_loc)
                    ELSE format('(ctx.has_hr_access AND %s)', v_draft_check)
                END
            ];
            IF v_approver_col IS NOT NULL THEN
                v_parts := array_append(v_parts, format('%I.%I = ctx.my_user_id', p_entity, v_approver_col));
            END IF;
            v_using_clause := format(
                '%I.organization_id = identity.get_current_org_id() AND EXISTS (SELECT 1 FROM identity.rls_get_session_context() ctx WHERE %s)',
                p_entity, array_to_string(v_parts, ' OR '));
        END;
        v_insert_check := format(
            '%I.organization_id = identity.get_current_org_id() AND EXISTS (SELECT 1 FROM identity.rls_get_session_context() ctx WHERE ctx.my_user_id IS NOT NULL)',
            p_entity);
    ELSE
        v_using_clause := 'organization_id = identity.get_current_org_id()';
    END IF;
    v_policy_name := CASE v_template
        WHEN 'standard'             THEN 'Unified_Security_V5'
        WHEN 'workforce'            THEN 'Unified_Security_V5_Workforce'
        WHEN 'configuration'        THEN 'Config_Tenant_Or_Global_V5'
        WHEN 'tenant_isolation'     THEN 'Tenant_Isolation_V5'
        WHEN 'multi_org'            THEN 'Multi_Org_Access_V5'
        WHEN 'analytical'           THEN 'Authenticated_Access_V5'
        WHEN 'authenticated_access' THEN 'Authenticated_Access_V5'
        WHEN 'user_scope'           THEN 'User_Scope_V5'
        ELSE                             'Tenant_Isolation_V5'
    END;
    v_policy_sql := format(
        'CREATE POLICY %I ON %I.%I FOR ALL TO authenticated USING (%s)',
        v_policy_name, p_schema, p_entity, v_using_clause);
    IF v_insert_check IS NOT NULL THEN
        v_insert_sql := format(
            'CREATE POLICY %I ON %I.%I FOR INSERT TO authenticated WITH CHECK (%s)',
            CASE v_template
                WHEN 'workforce'      THEN 'Workforce_Insert_V5'
                WHEN 'standard'       THEN 'Standard_Insert_V5'
                WHEN 'configuration'  THEN 'Config_Insert_V5'
                ELSE                       v_policy_name || '_Insert'
            END,
            p_schema, p_entity, v_insert_check);
    END IF;
    IF p_dry_run THEN
        v_result := format('-- DRY RUN for %s.%s (template: %s, classification: %s)%s%s',
            p_schema, p_entity, v_template, v_classification, E'\n', v_policy_sql);
        IF v_insert_sql IS NOT NULL THEN
            v_result := v_result || E'\n' || v_insert_sql;
        END IF;
        RETURN v_result;
    END IF;
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', p_schema, p_entity);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',  p_schema, p_entity);
    PERFORM identity.rls_drop_all_policies(p_schema, p_entity);
    EXECUTE v_policy_sql;
    IF v_insert_sql IS NOT NULL THEN
        EXECUTE v_insert_sql;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.views
        WHERE table_schema = p_schema AND table_name = 'v_' || p_entity) THEN
        EXECUTE format('ALTER VIEW %I.v_%I SET (security_invoker = on)', p_schema, p_entity);
    END IF;
    v_result := format('Applied %s to %s.%s (classification: %s)', v_policy_name, p_schema, p_entity, v_classification);
    IF v_insert_sql IS NOT NULL THEN
        v_result := v_result || ' + INSERT policy';
    END IF;
    RETURN v_result;
END;
$$;

CREATE FUNCTION identity.rls_drop_all_policies(p_schema text, p_table text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_policy    record;
    v_dropped   text[] := ARRAY[]::text[];
    v_count     integer := 0;
BEGIN
    FOR v_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = p_schema
          AND tablename = p_table
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                       v_policy.policyname, p_schema, p_table);
        v_dropped := array_append(v_dropped, v_policy.policyname);
        v_count := v_count + 1;
    END LOOP;
    IF v_count = 0 THEN
        RETURN format('%I.%I: no existing policies found', p_schema, p_table);
    ELSE
        RETURN format('%I.%I: dropped %s policies: %s',
                      p_schema, p_table, v_count, array_to_string(v_dropped, ', '));
    END IF;
END;
$$;

CREATE FUNCTION identity.rls_get_current_location_id() RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_loc_id UUID;
BEGIN
    v_loc_id := NULLIF(current_setting('resonance.location_id', true), '')::uuid;
    IF v_loc_id IS NOT NULL THEN RETURN v_loc_id; END IF;
    v_loc_id := (auth.jwt() -> 'app_metadata' ->> 'location_id')::uuid;
    IF v_loc_id IS NOT NULL THEN RETURN v_loc_id; END IF;
    SELECT location_id INTO v_loc_id
    FROM identity.organization_users
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1;
    RETURN v_loc_id;
END;
$$;

CREATE FUNCTION identity.rls_get_current_persona() RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_persona TEXT;
BEGIN
    v_persona := current_setting('resonance.persona', true);
    IF v_persona IS NOT NULL THEN RETURN v_persona; END IF;
    v_persona := (auth.jwt() -> 'app_metadata' ->> 'persona');
    IF v_persona IS NOT NULL THEN RETURN v_persona; END IF;
    IF EXISTS (SELECT 1 FROM identity.organization_users WHERE user_id = auth.uid() AND is_active = true) THEN
        RETURN 'worker';
    END IF;
    RETURN 'unknown';
END;
$$;

CREATE FUNCTION identity.rls_get_session_context(p_org_id uuid DEFAULT NULL::uuid) RETURNS identity.rls_session_context_t
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    ctx             identity.rls_session_context_t;
    v_org_id        uuid;
    v_my_path       ltree;          -- Now resolves with extensions in path
    v_my_loc_path   ltree;
    v_contact_rec   record;
    v_role_rec      record;
    v_team_rec      record;
BEGIN
    ctx.my_user_id := identity.get_my_user_id();
    IF p_org_id IS NOT NULL THEN
        v_org_id := p_org_id;
    ELSE
        v_org_id := NULLIF(current_setting('resonance.org_id', true), '')::uuid;
        IF v_org_id IS NULL THEN
            v_org_id := identity.get_current_org_id();
        END IF;
    END IF;
    ctx.current_org_id := v_org_id;
    ctx.is_saas_admin := identity.is_saas_admin(ctx.my_user_id);
    SELECT
        ou.id,
        ou.location_id,
        ou.path,
        l.path
    INTO
        ctx.my_org_user_id,
        ctx.my_location_id,
        v_my_path,
        v_my_loc_path
    FROM identity.organization_users ou
    LEFT JOIN identity.locations l ON l.id = ou.location_id
    WHERE ou.user_id = ctx.my_user_id
      AND ou.organization_id = v_org_id
      AND ou.is_active = true
    LIMIT 1;
    ctx.my_org_path      := v_my_path::text;
    ctx.my_location_path := v_my_loc_path::text;
    IF ctx.my_org_user_id IS NOT NULL THEN
        SELECT COALESCE(ou.persona_type, 'worker')
        INTO ctx.my_persona
        FROM identity.organization_users ou
        WHERE ou.id = ctx.my_org_user_id;
        IF ctx.my_persona IN ('employee', 'staff', 'internal') THEN
            ctx.my_persona := 'worker';
        END IF;
    ELSE
        ctx.my_persona := identity.rls_get_current_persona();
        IF ctx.my_persona IS NULL OR ctx.my_persona = 'unknown' THEN
            ctx.my_persona := 'unknown';
        END IF;
    END IF;
    SELECT * INTO v_contact_rec
    FROM identity._rls_resolve_contact(ctx.my_user_id, v_org_id, ctx.my_org_user_id);
    ctx.contact_id  := v_contact_rec.contact_id;
    ctx.account_ids := COALESCE(v_contact_rec.account_ids, ARRAY[]::uuid[]);
    ctx.vendor_ids  := COALESCE(v_contact_rec.vendor_ids, ARRAY[]::uuid[]);
    IF ctx.my_persona = 'unknown' AND ctx.contact_id IS NOT NULL THEN
        IF array_length(ctx.vendor_ids, 1) > 0 THEN
            ctx.my_persona := 'vendor';
        ELSIF array_length(ctx.account_ids, 1) > 0 THEN
            ctx.my_persona := 'customer';
        END IF;
    END IF;
    SELECT * INTO v_role_rec
    FROM identity._rls_get_role_context(ctx.my_org_user_id, v_org_id);
    ctx.role_names      := COALESCE(v_role_rec.role_names, ARRAY[]::text[]);
    ctx.permissions     := COALESCE(v_role_rec.permissions, '{}'::jsonb);
    ctx.has_hr_access   := COALESCE(v_role_rec.has_hr_access, false);
    ctx.has_finance_access := COALESCE(v_role_rec.has_finance_access, false);
    IF v_my_path IS NOT NULL THEN
        SELECT COALESCE(array_agg(DISTINCT ou.user_id), ARRAY[]::uuid[])
        INTO ctx.subordinate_user_ids
        FROM identity.organization_users ou
        WHERE ou.organization_id = v_org_id
          AND ou.is_active = true
          AND ou.path <@ v_my_path              -- ltree descendant check
          AND ou.user_id != ctx.my_user_id;
    ELSE
        ctx.subordinate_user_ids := ARRAY[]::uuid[];
    END IF;
    ctx.accessible_location_ids := identity._rls_get_location_access(
        ctx.my_location_id,
        v_org_id,
        ctx.has_hr_access
    );
    SELECT * INTO v_team_rec
    FROM identity._rls_get_team_context(ctx.my_org_user_id, v_org_id);
    ctx.team_ids          := COALESCE(v_team_rec.team_ids, ARRAY[]::uuid[]);
    ctx.team_location_ids := COALESCE(v_team_rec.team_location_ids, ARRAY[]::uuid[]);
    RETURN ctx;
END;
$$;

CREATE FUNCTION identity.rls_recommend_all(p_schemas text[] DEFAULT ARRAY['crm'::text, 'esm'::text, 'procurement'::text, 'unified'::text, 'workforce'::text, 'hr'::text, 'identity'::text, 'automation'::text, 'ai_mcp'::text, 'core'::text, 'blueprint'::text, 'ctrm'::text, 'documents'::text, 'finance'::text, 'wa'::text, 'public'::text, 'construction'::text]) RETURNS TABLE(table_schema text, table_name text, has_rls boolean, current_policy text, has_blueprint boolean, blueprint_template text, recommended text, reason text, action_sql text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_rec record;
BEGIN
    FOR v_rec IN
        SELECT t.table_schema AS ts, t.table_name AS tn
        FROM information_schema.tables t
        WHERE t.table_schema = ANY(p_schemas)
          AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_schema, t.table_name
    LOOP
        RETURN QUERY SELECT * FROM identity.rls_recommend_policy(v_rec.ts, v_rec.tn);
    END LOOP;
END;
$$;

CREATE FUNCTION identity.rls_recommend_policy(p_schema text, p_entity text) RETURNS TABLE(table_schema text, table_name text, has_rls boolean, current_policy text, has_blueprint boolean, blueprint_classification text, blueprint_template text, recommended text, reason text, action_sql text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_has_org_id    boolean;
    v_has_user_id   boolean;
    v_has_account   boolean;
    v_has_contact   boolean;
    v_has_vendor    boolean;
    v_rls_enabled   boolean;
    v_policy_name   text;
    v_bp_template   text;
    v_bp_class      text;
    v_bp_exists     boolean;
    v_rec_template  text;
    v_rec_reason    text;
    v_action        text;
BEGIN
    SELECT
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='organization_id'),
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='user_id'),
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='account_id'),
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='contact_id'),
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=p_schema AND c.table_name=p_entity AND c.column_name='vendor_id')
    INTO v_has_org_id, v_has_user_id, v_has_account, v_has_contact, v_has_vendor;
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = p_schema AND c.relname = p_entity;
    SELECT p.policyname INTO v_policy_name
    FROM pg_policies p
    WHERE p.schemaname = p_schema AND p.tablename = p_entity
    LIMIT 1;
    SELECT true, b.classification, b.rls_config->>'template'
    INTO v_bp_exists, v_bp_class, v_bp_template
    FROM core.entity_blueprints b
    WHERE b.entity_schema = p_schema AND b.entity_type = p_entity AND b.is_active;
    IF v_bp_exists IS NULL THEN v_bp_exists := false; END IF;
    IF v_bp_template IS NOT NULL AND v_bp_template != '' THEN
        v_rec_template := v_bp_template;
        v_rec_reason := 'Explicit rls_config.template set in blueprint';
    ELSIF v_bp_class = 'configuration' THEN
        v_rec_template := 'configuration';
        v_rec_reason := 'Blueprint classification = configuration → Config_Tenant_Or_Global_V5 (org IS NULL = global default)';
    ELSIF v_bp_class = 'analytical' THEN
        v_rec_template := 'analytical';
        v_rec_reason := 'Blueprint classification = analytical → Authenticated_Access_V5 (global read)';
    ELSIF p_schema IN ('workforce', 'hr') AND v_has_user_id AND v_has_org_id THEN
        v_rec_template := 'workforce';
        v_rec_reason := 'Workforce/hr schema + user_id + organization_id → workforce template with draft wall';
    ELSIF v_has_org_id AND (v_has_account OR v_has_contact OR v_has_vendor) THEN
        v_rec_template := 'standard';
        v_rec_reason := 'Has organization_id + external identity columns → standard template with portal access';
    ELSIF v_has_org_id THEN
        v_rec_template := 'tenant_isolation';
        v_rec_reason := 'Has organization_id, no external identity columns → simple tenant isolation';
    ELSIF v_has_user_id THEN
        v_rec_template := 'user_scope';
        v_rec_reason := 'Has user_id but no organization_id → user-scoped access';
    ELSE
        v_rec_template := 'authenticated_access';
        v_rec_reason := 'No organization_id or user_id → authenticated access (review if correct)';
    END IF;
    IF v_bp_exists AND v_bp_template IS NOT NULL THEN
        v_action := format('SELECT identity.rls_bootstrap_entity_policy(%L, %L);', p_schema, p_entity);
    ELSE
        v_action := format(
            'UPDATE core.entity_blueprints SET rls_config = jsonb_set(COALESCE(rls_config, ''{}''::jsonb), ''{template}'', to_jsonb(%L::text)) WHERE entity_schema = %L AND entity_type = %L; SELECT identity.rls_bootstrap_entity_policy(%L, %L);',
            v_rec_template, p_schema, p_entity, p_schema, p_entity
        );
    END IF;
    RETURN QUERY SELECT
        p_schema, p_entity,
        COALESCE(v_rls_enabled, false),
        v_policy_name,
        v_bp_exists,
        v_bp_class,
        v_bp_template,
        v_rec_template,
        v_rec_reason,
        v_action;
END;
$$;

CREATE FUNCTION identity.rls_resonance_init_context(p_phone text, p_org_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_res RECORD;
BEGIN
    SELECT entity_id, identity_type, display_name
    INTO v_res
    FROM wa.wa_resolve_identity(p_phone, p_org_id);
    IF v_res.entity_id IS NOT NULL THEN
        PERFORM set_config('resonance.contact_id', v_res.entity_id::text, true);
        PERFORM set_config('resonance.persona', v_res.identity_type, true);
        PERFORM set_config('resonance.org_id', p_org_id::text, true);
        RETURN jsonb_build_object(
            'status', 'resonated',
            'contact_id', v_res.entity_id,
            'persona', v_res.identity_type,
            'display_name', v_res.display_name
        );
    END IF;
    RETURN jsonb_build_object('status', 'unknown', 'message', 'Identity not found for phone signal');
END;
$$;

CREATE FUNCTION identity.rls_util_has_access(p_record_id uuid, p_org_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_persona TEXT;
    v_contact_id UUID;
BEGIN
    v_persona := identity.rls_get_current_persona();
    IF v_persona = 'worker' THEN
        RETURN true;
    END IF;
    v_contact_id := NULLIF(current_setting('resonance.contact_id', true), '')::uuid;
    IF v_contact_id IS NULL THEN
        v_contact_id := (auth.jwt() -> 'app_metadata' ->> 'contact_id')::uuid;
    END IF;
    IF v_contact_id IS NULL THEN
        RETURN false; -- Unknown persona, no access
    END IF;
    IF p_record_id = v_contact_id THEN
        RETURN true;
    END IF;
    IF EXISTS (
        SELECT 1 FROM crm.accounts a
        WHERE a.organization_id = p_org_id
          AND a.id IN (
              SELECT account_id FROM crm.contacts WHERE id = v_contact_id
              UNION ALL
              SELECT vendor_id FROM procurement.vendor_contacts WHERE id = v_contact_id
          )
    ) THEN
        RETURN true;
    END IF;
    IF EXISTS (
        SELECT 1 FROM crm.account_relationships ar
        WHERE ar.organization_id = p_org_id
          AND (ar.from_account_id IN (SELECT account_id FROM crm.contacts WHERE id = v_contact_id)
               OR ar.to_account_id IN (SELECT account_id FROM crm.contacts WHERE id = v_contact_id))
    ) THEN
        RETURN true;
    END IF;
    RETURN false;
END;
$$;

CREATE FUNCTION identity.rls_util_has_workforce_access(p_record_user_id uuid, p_record_org_id uuid, p_record_status text, p_record_location_id uuid DEFAULT NULL::uuid, p_approver_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_my_user_id uuid := identity.get_my_user_id();
    v_my_path extensions.ltree;
    v_my_loc uuid;
    v_my_loc_path extensions.ltree;
    v_target_org_id uuid := COALESCE(p_record_org_id, identity.get_current_org_id());
BEGIN
    IF identity.is_saas_admin(v_my_user_id) THEN RETURN true; END IF;
    IF v_my_user_id = p_record_user_id THEN RETURN true; END IF;
    IF COALESCE(p_record_status, 'submitted') IN ('Draft', 'draft') THEN RETURN false; END IF;
    IF p_approver_id IS NOT NULL AND v_my_user_id = p_approver_id THEN RETURN true; END IF;
    SELECT ou.path INTO v_my_path
    FROM identity.organization_users ou
    WHERE ou.user_id = v_my_user_id AND ou.organization_id = v_target_org_id LIMIT 1;
    IF v_my_path IS NULL THEN RETURN false; END IF;
    IF EXISTS (
        SELECT 1 FROM identity.organization_users ou
        WHERE ou.user_id = p_record_user_id AND ou.organization_id = v_target_org_id
        AND ou.path <@ v_my_path
    ) THEN RETURN true; END IF;
    IF EXISTS (
        SELECT 1 FROM identity.user_roles ur
        JOIN identity.roles r ON r.id = ur.role_id
        JOIN identity.organization_users ou ON ou.id = ur.organization_user_id
        WHERE ou.user_id = v_my_user_id
          AND ur.organization_id = v_target_org_id
          AND r.name IN ('Superadmin', 'HR Approver', 'HR Manager', 'HR Administrator')
    ) THEN
        IF p_record_location_id IS NULL THEN RETURN true; END IF;
        SELECT location_id INTO v_my_loc
        FROM identity.organization_users
        WHERE user_id = v_my_user_id AND organization_id = v_target_org_id LIMIT 1;
        IF v_my_loc = p_record_location_id THEN RETURN true; END IF;
        SELECT path INTO v_my_loc_path FROM identity.locations WHERE id = v_my_loc;
        IF v_my_loc_path IS NOT NULL AND EXISTS (
            SELECT 1 FROM identity.locations l
            WHERE l.id = p_record_location_id AND l.path <@ v_my_loc_path
        ) THEN RETURN true; END IF;
    END IF;
    RETURN false;
END;
$$;

CREATE FUNCTION identity.set_preferred_organization(new_org_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$BEGIN
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    set_preferred_organization
     * PURPOSE:     Persists the user's selected organization for future sessions.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. SESSION PERSISTENCE: Updates the 'pref_organization_id' in identity.users.
     * 2. SECURITY: Uses SECURITY DEFINER to ensure the update succeeds even if RLS 
     *    on identity.users is restrictive during the organization switching phase.
     * 
     * USE CASES:
     * - User selects an organization from the switcher UI.
     * - Auto-redirecting users to their last used org on login.
     * 
     * TECHNICAL LOGIC:
     * - Matches records based on auth.uid().
     * - Updates the updated_at timestamp for auditing.
     * ======================================================================================
     */
  UPDATE identity.users
  SET pref_organization_id = new_org_id,
      updated_at = now()
  WHERE auth_id = auth.uid(); 
  IF NOT FOUND THEN
    RAISE WARNING 'No user found in identity.users for auth_id %', auth.uid();
  END IF;
END;$$;

CREATE FUNCTION identity.trg_cleanup_orphaned_organization_users() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
                    BEGIN
                        DELETE FROM identity.organization_users WHERE id = OLD.id AND NOT EXISTS (SELECT 1 FROM core.unified_objects sib WHERE sib.id = OLD.id) AND NOT EXISTS (SELECT 1 FROM finance.financial_profiles sib WHERE sib.id = OLD.id) AND NOT EXISTS (SELECT 1 FROM hr.profiles sib WHERE sib.id = OLD.id) AND NOT EXISTS (SELECT 1 FROM unified.contacts sib WHERE sib.id = OLD.id);
                        RETURN OLD;
                    END;
                    $$;

CREATE FUNCTION identity.trg_org_user_to_unified() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_email text;
    v_name text;
BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
    v_name := COALESCE(
        NULLIF(TRIM(COALESCE(NEW.details->'person'->'name'->>'given', '') || ' ' || COALESCE(NEW.details->'person'->'name'->>'family', '')), ''),
        split_part(COALESCE(v_email, ''), '@', 1),
        'Unknown Employee'
    );
    INSERT INTO core.unified_objects (
        id, organization_id, object_type, object_subtype,
        entity_schema, entity_type, name, module
    ) VALUES (
        NEW.id, NEW.organization_id,
        'contact', 'employee',
        'identity', 'organization_users',
        v_name, 'identity'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = now();
    INSERT INTO unified.contacts (
        id, organization_id, name, email,
        first_name, last_name,
        contact_type, persona_type, intent_category, module
    ) VALUES (
        NEW.id, NEW.organization_id,
        v_name, v_email,
        COALESCE(NEW.details->'person'->'name'->>'given', split_part(COALESCE(v_email, ''), '@', 1)),
        COALESCE(NEW.details->'person'->'name'->>'family', ''),
        'person', 'employee', 'HR_EMPLOYEE', 'identity'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        updated_at = now();
    RETURN NEW;
END;
$$;

CREATE FUNCTION identity.trg_register_org_user_to_unified() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_contact_id uuid;
BEGIN
    v_contact_id := identity.ensure_unified_contact(NEW.user_id, NEW.organization_id, 'worker');
    IF NEW.id != v_contact_id THEN
        NEW.id := v_contact_id;
    END IF;
    UPDATE unified.contacts 
    SET status = CASE 
        WHEN NEW.deleted_at IS NOT NULL THEN 'deleted'
        WHEN NEW.role_status = 'INACTIVE' THEN 'inactive'
        ELSE 'active'
    END,
    updated_at = NOW(),
    contact_type = 'worker',
    persona_type = COALESCE(NEW.persona_type, 'worker')
    WHERE id = v_contact_id;
    RETURN NEW;
END;
$$;

CREATE FUNCTION identity.trg_sync_org_user_to_contact() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_name TEXT;
    v_user_email TEXT;
    v_user_mobile TEXT;
BEGIN
    SELECT name, email, mobile INTO v_user_name, v_user_email, v_user_mobile
    FROM identity.users WHERE id = NEW.user_id;
    INSERT INTO unified.contacts (
        id, organization_id, name, email, phone, 
        contact_type, persona_type, module, status
    )
    VALUES (
        NEW.id, 
        NEW.organization_id,
        COALESCE(v_user_name, 'Staff Member'),
        v_user_email,
        v_user_mobile,
        'staff',
        COALESCE(NEW.persona_type, 'worker'),
        'identity',
        'active'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        updated_at = now();
    RETURN NEW;
END;
$$;

CREATE FUNCTION identity.trg_sync_user_to_unified() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR 
       (TG_OP = 'UPDATE' AND (OLD.email IS DISTINCT FROM NEW.email OR 
                              OLD.name IS DISTINCT FROM NEW.name OR
                              OLD.mobile IS DISTINCT FROM NEW.mobile)) THEN
        UPDATE unified.contacts 
        SET email = NEW.email,
            phone = NEW.mobile,
            name = NEW.name,
            updated_at = NOW()
        WHERE email = NEW.email OR id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION identity.trg_v_location_types_shard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        DECLARE
            v_item jsonb;
        BEGIN
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
                            IF (TG_OP = 'INSERT') AND NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
            IF (TG_OP = 'INSERT') AND NEW.organization_id IS NULL THEN NEW.organization_id := identity.get_current_org_id(); END IF;
        IF (TG_OP = 'INSERT') THEN
            IF EXISTS (SELECT 1 FROM identity.location_types WHERE id = NEW.id AND organization_id = NEW.organization_id) THEN
                UPDATE identity.location_types SET name = COALESCE(NEW.name::text::text, identity.location_types.name), level = COALESCE(NEW.level::text::int2, identity.location_types.level), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.location_types.created_at), created_by = COALESCE(NEW.created_by::text::uuid, identity.location_types.created_by), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.location_types.updated_at), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.location_types.updated_by) WHERE id = NEW.id
                RETURNING id INTO NEW.id;
            ELSE
                INSERT INTO identity.location_types (id, organization_id, name, level, created_at, created_by, updated_at, updated_by) VALUES (COALESCE(NEW.id::text::uuid, uuid_generate_v4()), NEW.organization_id::text::uuid, NEW.name::text::text, COALESCE(NEW.level::text::int2, 0), COALESCE(NEW.created_at::text::timestamptz, now()), NEW.created_by::text::uuid, COALESCE(NEW.updated_at::text::timestamptz, now()), NEW.updated_by::text::uuid)
                RETURNING id INTO NEW.id;
            END IF;
        ELSE
            UPDATE identity.location_types SET name = COALESCE(NEW.name::text::text, identity.location_types.name), level = COALESCE(NEW.level::text::int2, identity.location_types.level), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.location_types.created_at), created_by = COALESCE(NEW.created_by::text::uuid, identity.location_types.created_by), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.location_types.updated_at), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.location_types.updated_by) WHERE id = OLD.id
            RETURNING id INTO NEW.id;
        END IF;
                RETURN NEW;
            END IF;
            RETURN NULL;
        END;
        $$;

CREATE FUNCTION identity.trg_v_locations_shard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        DECLARE
            v_item jsonb;
        BEGIN
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
                            IF (TG_OP = 'INSERT') AND NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
            IF (TG_OP = 'INSERT') AND NEW.organization_id IS NULL THEN NEW.organization_id := identity.get_current_org_id(); END IF;
        IF (TG_OP = 'INSERT') THEN
            IF EXISTS (SELECT 1 FROM identity.locations WHERE id = NEW.id AND organization_id = NEW.organization_id) THEN
                UPDATE identity.locations SET name = COALESCE(NEW.name::text::text, identity.locations.name), details = COALESCE(to_jsonb(NEW.details::text), identity.locations.details), time_zone = COALESCE(NEW.time_zone::text::text, identity.locations.time_zone), working_hours = COALESCE(to_jsonb(NEW.working_hours::text), identity.locations.working_hours), settings = COALESCE(to_jsonb(NEW.settings::text), identity.locations.settings), service_area = COALESCE(to_jsonb(NEW.service_area::text), identity.locations.service_area), created_by = COALESCE(NEW.created_by::text::uuid, identity.locations.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.locations.updated_by), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.locations.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.locations.updated_at), is_active = COALESCE(NEW.is_active::text::bool, identity.locations.is_active), short_code = COALESCE(NEW.short_code::text::text, identity.locations.short_code), app_settings = COALESCE(to_jsonb(NEW.app_settings::text), identity.locations.app_settings), parent_id = COALESCE(NEW.parent_id::text::uuid, identity.locations.parent_id), location_type_id = COALESCE(NEW.location_type_id::text::uuid, identity.locations.location_type_id), path = COALESCE(NEW.path::text::ltree, identity.locations.path), deleted_at = COALESCE(NEW.deleted_at::text::timestamptz, identity.locations.deleted_at), vertical = COALESCE(to_jsonb(NEW.vertical::text), identity.locations.vertical), custom = COALESCE(to_jsonb(NEW.custom::text), identity.locations.custom) WHERE id = NEW.id
                RETURNING id INTO NEW.id;
            ELSE
                INSERT INTO identity.locations (id, organization_id, name, details, time_zone, working_hours, settings, service_area, created_by, updated_by, created_at, updated_at, is_active, short_code, app_settings, parent_id, location_type_id, path, deleted_at, vertical, custom) VALUES (COALESCE(NEW.id::text::uuid, uuid_generate_v4()), NEW.organization_id::text::uuid, NEW.name::text::text, COALESCE(to_jsonb(NEW.details::text), '{}'::jsonb), COALESCE(NEW.time_zone::text::text, 'UTC'::text), COALESCE(to_jsonb(NEW.working_hours::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.settings::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.service_area::text), '{}'::jsonb), NEW.created_by::text::uuid, NEW.updated_by::text::uuid, COALESCE(NEW.created_at::text::timestamptz, now()), COALESCE(NEW.updated_at::text::timestamptz, now()), COALESCE(NEW.is_active::text::bool, true), NEW.short_code::text::text, COALESCE(to_jsonb(NEW.app_settings::text), '{}'::jsonb), NEW.parent_id::text::uuid, NEW.location_type_id::text::uuid, NEW.path::text::ltree, NEW.deleted_at::text::timestamptz, COALESCE(to_jsonb(NEW.vertical::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.custom::text), '{}'::jsonb))
                RETURNING id INTO NEW.id;
            END IF;
        ELSE
            UPDATE identity.locations SET name = COALESCE(NEW.name::text::text, identity.locations.name), details = COALESCE(to_jsonb(NEW.details::text), identity.locations.details), time_zone = COALESCE(NEW.time_zone::text::text, identity.locations.time_zone), working_hours = COALESCE(to_jsonb(NEW.working_hours::text), identity.locations.working_hours), settings = COALESCE(to_jsonb(NEW.settings::text), identity.locations.settings), service_area = COALESCE(to_jsonb(NEW.service_area::text), identity.locations.service_area), created_by = COALESCE(NEW.created_by::text::uuid, identity.locations.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.locations.updated_by), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.locations.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.locations.updated_at), is_active = COALESCE(NEW.is_active::text::bool, identity.locations.is_active), short_code = COALESCE(NEW.short_code::text::text, identity.locations.short_code), app_settings = COALESCE(to_jsonb(NEW.app_settings::text), identity.locations.app_settings), parent_id = COALESCE(NEW.parent_id::text::uuid, identity.locations.parent_id), location_type_id = COALESCE(NEW.location_type_id::text::uuid, identity.locations.location_type_id), path = COALESCE(NEW.path::text::ltree, identity.locations.path), deleted_at = COALESCE(NEW.deleted_at::text::timestamptz, identity.locations.deleted_at), vertical = COALESCE(to_jsonb(NEW.vertical::text), identity.locations.vertical), custom = COALESCE(to_jsonb(NEW.custom::text), identity.locations.custom) WHERE id = OLD.id
            RETURNING id INTO NEW.id;
        END IF;-- Tier 0: Global Object Registration (Immediate)
            IF (TG_OP = 'INSERT') THEN
                INSERT INTO core.unified_objects (id, organization_id, object_type, name, display_id)
                VALUES (NEW.id, NEW.organization_id, 'locations', NEW.name, NEW.display_id)
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now();
            END IF;
            IF (TG_OP = 'INSERT') THEN
                IF EXISTS (SELECT 1 FROM core.unified_objects WHERE id = NEW.id) THEN
                    UPDATE core.unified_objects SET object_type = COALESCE(NEW.object_type::text::"varchar", core.unified_objects.object_type), object_subtype = COALESCE(NEW.object_subtype::text::"varchar", core.unified_objects.object_subtype), display_id = COALESCE(NEW.display_id::text::"varchar", core.unified_objects.display_id), created_at = COALESCE(NEW.created_at::text::timestamptz, core.unified_objects.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, core.unified_objects.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, core.unified_objects.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, core.unified_objects.updated_by), deleted_at = COALESCE(NEW.deleted_at::text::timestamptz, core.unified_objects.deleted_at), entity_schema = COALESCE(NEW.entity_schema::text::text, core.unified_objects.entity_schema), entity_type = COALESCE(NEW.entity_type::text::text, core.unified_objects.entity_type), name = COALESCE(NEW.name::text::text, core.unified_objects.name), module = COALESCE(NEW.module::text::text, core.unified_objects.module) WHERE id = NEW.id 
                    RETURNING display_id INTO NEW.display_id;
                ELSE
                    INSERT INTO core.unified_objects (id, organization_id, object_type, object_subtype, display_id, created_at, updated_at, created_by, updated_by, deleted_at, entity_schema, entity_type, name, module) VALUES (COALESCE(NEW.id::text::uuid, gen_random_uuid()), NEW.organization_id::text::uuid, NEW.object_type::text::"varchar", NEW.object_subtype::text::"varchar", NEW.display_id::text::"varchar", COALESCE(NEW.created_at::text::timestamptz, now()), COALESCE(NEW.updated_at::text::timestamptz, now()), NEW.created_by::text::uuid, NEW.updated_by::text::uuid, NEW.deleted_at::text::timestamptz, NEW.entity_schema::text::text, NEW.entity_type::text::text, NEW.name::text::text, NEW.module::text::text)
                    RETURNING display_id INTO NEW.display_id;
                END IF;
            ELSE
                UPDATE core.unified_objects SET object_type = COALESCE(NEW.object_type::text::"varchar", core.unified_objects.object_type), object_subtype = COALESCE(NEW.object_subtype::text::"varchar", core.unified_objects.object_subtype), display_id = COALESCE(NEW.display_id::text::"varchar", core.unified_objects.display_id), created_at = COALESCE(NEW.created_at::text::timestamptz, core.unified_objects.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, core.unified_objects.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, core.unified_objects.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, core.unified_objects.updated_by), deleted_at = COALESCE(NEW.deleted_at::text::timestamptz, core.unified_objects.deleted_at), entity_schema = COALESCE(NEW.entity_schema::text::text, core.unified_objects.entity_schema), entity_type = COALESCE(NEW.entity_type::text::text, core.unified_objects.entity_type), name = COALESCE(NEW.name::text::text, core.unified_objects.name), module = COALESCE(NEW.module::text::text, core.unified_objects.module) WHERE id = OLD.id 
                RETURNING display_id INTO NEW.display_id;
            END IF;
                RETURN NEW;
            END IF;
            RETURN NULL;
        END;
        $$;

CREATE FUNCTION identity.trg_v_modules_shard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        DECLARE
            v_item jsonb;
        BEGIN
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
                            IF (TG_OP = 'INSERT') AND NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
            IF (TG_OP = 'INSERT') AND NEW.organization_id IS NULL THEN NEW.organization_id := identity.get_current_org_id(); END IF;
        IF (TG_OP = 'INSERT') THEN
            IF EXISTS (SELECT 1 FROM identity.modules WHERE id = NEW.id AND organization_id = NEW.organization_id) THEN
                UPDATE identity.modules SET name = COALESCE(NEW.name::text::text, identity.modules.name), prefix = COALESCE(NEW.prefix::text::text, identity.modules.prefix), description = COALESCE(NEW.description::text::text, identity.modules.description), is_active = COALESCE(NEW.is_active::text::bool, identity.modules.is_active), sub_modules = COALESCE(to_jsonb(NEW.sub_modules::text), identity.modules.sub_modules), settings = COALESCE(to_jsonb(NEW.settings::text), identity.modules.settings), notes = COALESCE(to_jsonb(NEW.notes::text), identity.modules.notes), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.modules.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.modules.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, identity.modules.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.modules.updated_by) WHERE id = NEW.id;
            ELSE
                INSERT INTO identity.modules (id, name, prefix, description, is_active, sub_modules, settings, notes, created_at, updated_at, organization_id, created_by, updated_by) VALUES (NEW.id::text::uuid, NEW.name::text::text, NEW.prefix::text::text, NEW.description::text::text, NEW.is_active::text::bool, COALESCE(to_jsonb(NEW.sub_modules::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.settings::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.notes::text), '{}'::jsonb), NEW.created_at::text::timestamptz, NEW.updated_at::text::timestamptz, NEW.organization_id::text::uuid, NEW.created_by::text::uuid, NEW.updated_by::text::uuid);
            END IF;
        ELSE
            UPDATE identity.modules SET name = COALESCE(NEW.name::text::text, identity.modules.name), prefix = COALESCE(NEW.prefix::text::text, identity.modules.prefix), description = COALESCE(NEW.description::text::text, identity.modules.description), is_active = COALESCE(NEW.is_active::text::bool, identity.modules.is_active), sub_modules = COALESCE(to_jsonb(NEW.sub_modules::text), identity.modules.sub_modules), settings = COALESCE(to_jsonb(NEW.settings::text), identity.modules.settings), notes = COALESCE(to_jsonb(NEW.notes::text), identity.modules.notes), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.modules.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.modules.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, identity.modules.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.modules.updated_by) WHERE id = OLD.id;
        END IF;
                RETURN NEW;
            END IF;
            RETURN NULL;
        END;
        $$;

CREATE FUNCTION identity.trg_v_org_module_configs_shard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        DECLARE
            v_item jsonb;
        BEGIN
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
                            IF (TG_OP = 'INSERT') AND NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
            IF (TG_OP = 'INSERT') AND NEW.organization_id IS NULL THEN NEW.organization_id := identity.get_current_org_id(); END IF;
        IF (TG_OP = 'INSERT') THEN
            IF EXISTS (SELECT 1 FROM identity.org_module_configs WHERE id = NEW.id AND organization_id = NEW.organization_id) THEN
                UPDATE identity.org_module_configs SET module_id = COALESCE(NEW.module_id::text::uuid, identity.org_module_configs.module_id), location_id = COALESCE(NEW.location_id::text::uuid, identity.org_module_configs.location_id), sub_modules = COALESCE(to_jsonb(NEW.sub_modules::text), identity.org_module_configs.sub_modules), settings = COALESCE(to_jsonb(NEW.settings::text), identity.org_module_configs.settings), scope_level = COALESCE(NEW.scope_level::text::text, identity.org_module_configs.scope_level), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.org_module_configs.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.org_module_configs.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, identity.org_module_configs.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.org_module_configs.updated_by) WHERE id = NEW.id;
            ELSE
                INSERT INTO identity.org_module_configs (id, organization_id, module_id, location_id, sub_modules, settings, scope_level, created_at, updated_at, created_by, updated_by) VALUES (NEW.id::text::uuid, NEW.organization_id::text::uuid, NEW.module_id::text::uuid, NEW.location_id::text::uuid, COALESCE(to_jsonb(NEW.sub_modules::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.settings::text), '{}'::jsonb), NEW.scope_level::text::text, NEW.created_at::text::timestamptz, NEW.updated_at::text::timestamptz, NEW.created_by::text::uuid, NEW.updated_by::text::uuid);
            END IF;
        ELSE
            UPDATE identity.org_module_configs SET module_id = COALESCE(NEW.module_id::text::uuid, identity.org_module_configs.module_id), location_id = COALESCE(NEW.location_id::text::uuid, identity.org_module_configs.location_id), sub_modules = COALESCE(to_jsonb(NEW.sub_modules::text), identity.org_module_configs.sub_modules), settings = COALESCE(to_jsonb(NEW.settings::text), identity.org_module_configs.settings), scope_level = COALESCE(NEW.scope_level::text::text, identity.org_module_configs.scope_level), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.org_module_configs.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.org_module_configs.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, identity.org_module_configs.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.org_module_configs.updated_by) WHERE id = OLD.id;
        END IF;
                RETURN NEW;
            END IF;
            RETURN NULL;
        END;
        $$;

CREATE FUNCTION identity.trg_v_organization_users_shard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        DECLARE
            v_item jsonb;
        BEGIN
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
                            IF (TG_OP = 'INSERT') AND NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
            IF (TG_OP = 'INSERT') AND NEW.organization_id IS NULL THEN NEW.organization_id := identity.get_current_org_id(); END IF;
        IF (TG_OP = 'INSERT') THEN
            IF EXISTS (SELECT 1 FROM identity.organization_users WHERE id = NEW.id AND organization_id = NEW.organization_id) THEN
                UPDATE identity.organization_users SET user_id = COALESCE(NEW.user_id::text::uuid, identity.organization_users.user_id), location_id = COALESCE(NEW.location_id::text::uuid, identity.organization_users.location_id), manager_id = COALESCE(NEW.manager_id::text::uuid, identity.organization_users.manager_id), is_active = COALESCE(NEW.is_active::text::bool, identity.organization_users.is_active), role_status = COALESCE(NEW.role_status::text::user_status, identity.organization_users.role_status), last_synced_at = COALESCE(NEW.last_synced_at::text::timestamptz, identity.organization_users.last_synced_at), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.organization_users.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.organization_users.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, identity.organization_users.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.organization_users.updated_by), path = COALESCE(NEW.path::text::ltree, identity.organization_users.path), details = COALESCE(to_jsonb(NEW.details::text), identity.organization_users.details), deleted_at = COALESCE(NEW.deleted_at::text::timestamptz, identity.organization_users.deleted_at), persona_type = COALESCE(NEW.persona_type::text::text, identity.organization_users.persona_type), is_field_staff = COALESCE(NEW.is_field_staff::text::bool, identity.organization_users.is_field_staff), display_id = COALESCE(NEW.display_id::text::text, identity.organization_users.display_id) WHERE id = NEW.id
                RETURNING display_id INTO NEW.display_id;
            ELSE
                INSERT INTO identity.organization_users (id, organization_id, user_id, location_id, manager_id, is_active, role_status, last_synced_at, created_at, updated_at, created_by, updated_by, path, details, deleted_at, persona_type, is_field_staff, display_id) VALUES (COALESCE(NEW.id::text::uuid, gen_random_uuid()), NEW.organization_id::text::uuid, NEW.user_id::text::uuid, NEW.location_id::text::uuid, NEW.manager_id::text::uuid, COALESCE(NEW.is_active::text::bool, true), COALESCE(NEW.role_status::text::user_status, 'OFFLINE'::user_status), NEW.last_synced_at::text::timestamptz, COALESCE(NEW.created_at::text::timestamptz, now()), COALESCE(NEW.updated_at::text::timestamptz, now()), NEW.created_by::text::uuid, NEW.updated_by::text::uuid, NEW.path::text::ltree, COALESCE(to_jsonb(NEW.details::text), '{}'::jsonb), NEW.deleted_at::text::timestamptz, COALESCE(NEW.persona_type::text::text, 'worker'::text), COALESCE(NEW.is_field_staff::text::bool, false), NEW.display_id::text::text)
                RETURNING display_id INTO NEW.display_id;
            END IF;
        ELSE
            UPDATE identity.organization_users SET user_id = COALESCE(NEW.user_id::text::uuid, identity.organization_users.user_id), location_id = COALESCE(NEW.location_id::text::uuid, identity.organization_users.location_id), manager_id = COALESCE(NEW.manager_id::text::uuid, identity.organization_users.manager_id), is_active = COALESCE(NEW.is_active::text::bool, identity.organization_users.is_active), role_status = COALESCE(NEW.role_status::text::user_status, identity.organization_users.role_status), last_synced_at = COALESCE(NEW.last_synced_at::text::timestamptz, identity.organization_users.last_synced_at), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.organization_users.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.organization_users.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, identity.organization_users.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.organization_users.updated_by), path = COALESCE(NEW.path::text::ltree, identity.organization_users.path), details = COALESCE(to_jsonb(NEW.details::text), identity.organization_users.details), deleted_at = COALESCE(NEW.deleted_at::text::timestamptz, identity.organization_users.deleted_at), persona_type = COALESCE(NEW.persona_type::text::text, identity.organization_users.persona_type), is_field_staff = COALESCE(NEW.is_field_staff::text::bool, identity.organization_users.is_field_staff), display_id = COALESCE(NEW.display_id::text::text, identity.organization_users.display_id) WHERE id = OLD.id
            RETURNING display_id INTO NEW.display_id;
        END IF;-- Tier 0: Global Object Registration (Immediate)
            IF (TG_OP = 'INSERT') THEN
                INSERT INTO core.unified_objects (id, organization_id, object_type, name, display_id)
                VALUES (NEW.id, NEW.organization_id, 'organization_users', NEW.name, NEW.display_id)
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now();
            END IF;
            IF (TG_OP = 'INSERT') THEN
                IF EXISTS (SELECT 1 FROM unified.contacts WHERE id = NEW.id AND organization_id = NEW.organization_id) THEN
                    UPDATE unified.contacts SET display_id = COALESCE(NEW.display_id::text::text, unified.contacts.display_id), name = COALESCE(NEW.name::text::text, unified.contacts.name), email = COALESCE(NEW.email::text::text, unified.contacts.email), phone = COALESCE(NEW.phone::text::text, unified.contacts.phone), status = COALESCE(NEW.status::text::text, unified.contacts.status), contact_type = COALESCE(NEW.contact_type::text::text, unified.contacts.contact_type), module = COALESCE(NEW.module::text::text, unified.contacts.module), lifecycle_stage = COALESCE(NEW.lifecycle_stage::text::text, unified.contacts.lifecycle_stage), vertical = COALESCE(NEW.vertical::text::text, unified.contacts.vertical), vertical_payload = COALESCE(NEW.vertical_payload::text::jsonb, unified.contacts.vertical_payload), details = COALESCE(NEW.details::text::jsonb, unified.contacts.details), persona_type = COALESCE(NEW.persona_type::text::text, unified.contacts.persona_type), raci = COALESCE(NEW.raci::text::jsonb, unified.contacts.raci), is_trackable = COALESCE(NEW.is_trackable::text::bool, unified.contacts.is_trackable), skills = COALESCE(NEW.skills::text::_text, unified.contacts.skills), certifications = COALESCE(NEW.certifications::text::_text, unified.contacts.certifications), billing_rate_hourly = COALESCE(NEW.billing_rate_hourly::text::"numeric", unified.contacts.billing_rate_hourly), billing_rate_daily = COALESCE(NEW.billing_rate_daily::text::"numeric", unified.contacts.billing_rate_daily), preferred_work_hours = COALESCE(NEW.preferred_work_hours::text::jsonb, unified.contacts.preferred_work_hours), unavailable_periods = COALESCE(NEW.unavailable_periods::text::jsonb, unified.contacts.unavailable_periods), available_from = COALESCE(NEW.available_from::text::timestamptz, unified.contacts.available_from), available_until = COALESCE(NEW.available_until::text::timestamptz, unified.contacts.available_until), intent_category = COALESCE(NEW.intent_category::text::text, unified.contacts.intent_category), first_name = COALESCE(NEW.first_name::text::text, unified.contacts.first_name), last_name = COALESCE(NEW.last_name::text::text, unified.contacts.last_name), stage_id = COALESCE(NEW.stage_id::text::text, unified.contacts.stage_id), priority = COALESCE(NEW.priority::text::text, unified.contacts.priority), is_active = COALESCE(NEW.is_active::text::bool, unified.contacts.is_active), state_category = COALESCE(NEW.state_category::text::text, unified.contacts.state_category), intent_type = COALESCE(NEW.intent_type::text::text, unified.contacts.intent_type) WHERE id = NEW.id
                    RETURNING display_id INTO NEW.display_id;
                ELSE
                    INSERT INTO unified.contacts (display_id, name, email, phone, status, contact_type, module, lifecycle_stage, vertical, vertical_payload, details, persona_type, raci, is_trackable, skills, certifications, billing_rate_hourly, billing_rate_daily, preferred_work_hours, unavailable_periods, available_from, available_until, intent_category, first_name, last_name, stage_id, priority, is_active, state_category, intent_type, id, organization_id) VALUES (NEW.display_id::text::text, NEW.name::text::text, NEW.email::text::text, NEW.phone::text::text, COALESCE(NEW.status::text::text, 'active'::text), COALESCE(NEW.contact_type::text::text, 'person'::text), COALESCE(NEW.module::text::text, 'core'::text), NEW.lifecycle_stage::text::text, NEW.vertical::text::text, COALESCE(to_jsonb(NEW.vertical_payload::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.details::text), '{}'::jsonb), COALESCE(NEW.persona_type::text::text, 'standard'::text), COALESCE(to_jsonb(NEW.raci::text), '{}'::jsonb), COALESCE(NEW.is_trackable::text::bool, false), COALESCE(NEW.skills::text::_text, '{}'::text[]), COALESCE(NEW.certifications::text::_text, '{}'::text[]), NEW.billing_rate_hourly::text::"numeric", NEW.billing_rate_daily::text::"numeric", COALESCE(to_jsonb(NEW.preferred_work_hours::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.unavailable_periods::text), '{}'::jsonb), NEW.available_from::text::timestamptz, NEW.available_until::text::timestamptz, COALESCE(NEW.intent_category::text::text, 'UNCLASSIFIED'::text), NEW.first_name::text::text, NEW.last_name::text::text, NEW.stage_id::text::text, NEW.priority::text::text, COALESCE(NEW.is_active::text::bool, true), NEW.state_category::text::text, NEW.intent_type::text::text, NEW.id::text::uuid, NEW.organization_id::text::uuid)
                    RETURNING display_id INTO NEW.display_id;
                END IF;
            ELSE
                UPDATE unified.contacts SET display_id = COALESCE(NEW.display_id::text::text, unified.contacts.display_id), name = COALESCE(NEW.name::text::text, unified.contacts.name), email = COALESCE(NEW.email::text::text, unified.contacts.email), phone = COALESCE(NEW.phone::text::text, unified.contacts.phone), status = COALESCE(NEW.status::text::text, unified.contacts.status), contact_type = COALESCE(NEW.contact_type::text::text, unified.contacts.contact_type), module = COALESCE(NEW.module::text::text, unified.contacts.module), lifecycle_stage = COALESCE(NEW.lifecycle_stage::text::text, unified.contacts.lifecycle_stage), vertical = COALESCE(NEW.vertical::text::text, unified.contacts.vertical), vertical_payload = COALESCE(NEW.vertical_payload::text::jsonb, unified.contacts.vertical_payload), details = COALESCE(NEW.details::text::jsonb, unified.contacts.details), persona_type = COALESCE(NEW.persona_type::text::text, unified.contacts.persona_type), raci = COALESCE(NEW.raci::text::jsonb, unified.contacts.raci), is_trackable = COALESCE(NEW.is_trackable::text::bool, unified.contacts.is_trackable), skills = COALESCE(NEW.skills::text::_text, unified.contacts.skills), certifications = COALESCE(NEW.certifications::text::_text, unified.contacts.certifications), billing_rate_hourly = COALESCE(NEW.billing_rate_hourly::text::"numeric", unified.contacts.billing_rate_hourly), billing_rate_daily = COALESCE(NEW.billing_rate_daily::text::"numeric", unified.contacts.billing_rate_daily), preferred_work_hours = COALESCE(NEW.preferred_work_hours::text::jsonb, unified.contacts.preferred_work_hours), unavailable_periods = COALESCE(NEW.unavailable_periods::text::jsonb, unified.contacts.unavailable_periods), available_from = COALESCE(NEW.available_from::text::timestamptz, unified.contacts.available_from), available_until = COALESCE(NEW.available_until::text::timestamptz, unified.contacts.available_until), intent_category = COALESCE(NEW.intent_category::text::text, unified.contacts.intent_category), first_name = COALESCE(NEW.first_name::text::text, unified.contacts.first_name), last_name = COALESCE(NEW.last_name::text::text, unified.contacts.last_name), stage_id = COALESCE(NEW.stage_id::text::text, unified.contacts.stage_id), priority = COALESCE(NEW.priority::text::text, unified.contacts.priority), is_active = COALESCE(NEW.is_active::text::bool, unified.contacts.is_active), state_category = COALESCE(NEW.state_category::text::text, unified.contacts.state_category), intent_type = COALESCE(NEW.intent_type::text::text, unified.contacts.intent_type) WHERE id = OLD.id
                RETURNING display_id INTO NEW.display_id;
            END IF;
            IF (TG_OP = 'INSERT') THEN
                IF EXISTS (SELECT 1 FROM core.unified_objects WHERE id = NEW.id) THEN
                    UPDATE core.unified_objects SET object_type = COALESCE(NEW.object_type::text::"varchar", core.unified_objects.object_type), object_subtype = COALESCE(NEW.object_subtype::text::"varchar", core.unified_objects.object_subtype), display_id = COALESCE(NEW.display_id::text::"varchar", core.unified_objects.display_id), created_at = COALESCE(NEW.created_at::text::timestamptz, core.unified_objects.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, core.unified_objects.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, core.unified_objects.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, core.unified_objects.updated_by), deleted_at = COALESCE(NEW.deleted_at::text::timestamptz, core.unified_objects.deleted_at), entity_schema = COALESCE(NEW.entity_schema::text::text, core.unified_objects.entity_schema), entity_type = COALESCE(NEW.entity_type::text::text, core.unified_objects.entity_type), name = COALESCE(NEW.name::text::text, core.unified_objects.name), module = COALESCE(NEW.module::text::text, core.unified_objects.module) WHERE id = NEW.id 
                    RETURNING display_id INTO NEW.display_id;
                ELSE
                    INSERT INTO core.unified_objects (id, organization_id, object_type, object_subtype, display_id, created_at, updated_at, created_by, updated_by, deleted_at, entity_schema, entity_type, name, module) VALUES (COALESCE(NEW.id::text::uuid, gen_random_uuid()), NEW.organization_id::text::uuid, NEW.object_type::text::"varchar", NEW.object_subtype::text::"varchar", NEW.display_id::text::"varchar", COALESCE(NEW.created_at::text::timestamptz, now()), COALESCE(NEW.updated_at::text::timestamptz, now()), NEW.created_by::text::uuid, NEW.updated_by::text::uuid, NEW.deleted_at::text::timestamptz, NEW.entity_schema::text::text, NEW.entity_type::text::text, NEW.name::text::text, NEW.module::text::text)
                    RETURNING display_id INTO NEW.display_id;
                END IF;
            ELSE
                UPDATE core.unified_objects SET object_type = COALESCE(NEW.object_type::text::"varchar", core.unified_objects.object_type), object_subtype = COALESCE(NEW.object_subtype::text::"varchar", core.unified_objects.object_subtype), display_id = COALESCE(NEW.display_id::text::"varchar", core.unified_objects.display_id), created_at = COALESCE(NEW.created_at::text::timestamptz, core.unified_objects.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, core.unified_objects.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, core.unified_objects.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, core.unified_objects.updated_by), deleted_at = COALESCE(NEW.deleted_at::text::timestamptz, core.unified_objects.deleted_at), entity_schema = COALESCE(NEW.entity_schema::text::text, core.unified_objects.entity_schema), entity_type = COALESCE(NEW.entity_type::text::text, core.unified_objects.entity_type), name = COALESCE(NEW.name::text::text, core.unified_objects.name), module = COALESCE(NEW.module::text::text, core.unified_objects.module) WHERE id = OLD.id 
                RETURNING display_id INTO NEW.display_id;
            END IF;
            IF (TG_OP = 'INSERT') THEN
                IF EXISTS (SELECT 1 FROM finance.financial_profiles WHERE id = NEW.id) THEN
                    UPDATE finance.financial_profiles SET organization_user_id = COALESCE(NEW.organization_user_id::text::uuid, finance.financial_profiles.organization_user_id), base_salary = COALESCE(NEW.base_salary::text::"numeric", finance.financial_profiles.base_salary), currency = COALESCE(NEW.currency::text::text, finance.financial_profiles.currency), tax_id_encrypted = COALESCE(NEW.tax_id_encrypted::text::text, finance.financial_profiles.tax_id_encrypted), bank_details_jsonb = COALESCE(to_jsonb(NEW.bank_details_jsonb::text), finance.financial_profiles.bank_details_jsonb), payment_frequency = COALESCE(NEW.payment_frequency::text::text, finance.financial_profiles.payment_frequency), created_at = COALESCE(NEW.created_at::text::timestamptz, finance.financial_profiles.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, finance.financial_profiles.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, finance.financial_profiles.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, finance.financial_profiles.updated_by) WHERE id = NEW.id 
                    RETURNING id INTO NEW.id;
                ELSE
                    INSERT INTO finance.financial_profiles (id, organization_user_id, base_salary, currency, tax_id_encrypted, bank_details_jsonb, payment_frequency, created_at, updated_at, organization_id, created_by, updated_by) VALUES (COALESCE(NEW.id::text::uuid, gen_random_uuid()), NEW.organization_user_id::text::uuid, COALESCE(NEW.base_salary::text::"numeric", 0), COALESCE(NEW.currency::text::text, 'USD'::text), NEW.tax_id_encrypted::text::text, COALESCE(to_jsonb(NEW.bank_details_jsonb::text), '{}'::jsonb), COALESCE(NEW.payment_frequency::text::text, 'monthly'::text), COALESCE(NEW.created_at::text::timestamptz, now()), COALESCE(NEW.updated_at::text::timestamptz, now()), NEW.organization_id::text::uuid, NEW.created_by::text::uuid, NEW.updated_by::text::uuid)
                    RETURNING id INTO NEW.id;
                END IF;
            ELSE
                UPDATE finance.financial_profiles SET organization_user_id = COALESCE(NEW.organization_user_id::text::uuid, finance.financial_profiles.organization_user_id), base_salary = COALESCE(NEW.base_salary::text::"numeric", finance.financial_profiles.base_salary), currency = COALESCE(NEW.currency::text::text, finance.financial_profiles.currency), tax_id_encrypted = COALESCE(NEW.tax_id_encrypted::text::text, finance.financial_profiles.tax_id_encrypted), bank_details_jsonb = COALESCE(to_jsonb(NEW.bank_details_jsonb::text), finance.financial_profiles.bank_details_jsonb), payment_frequency = COALESCE(NEW.payment_frequency::text::text, finance.financial_profiles.payment_frequency), created_at = COALESCE(NEW.created_at::text::timestamptz, finance.financial_profiles.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, finance.financial_profiles.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, finance.financial_profiles.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, finance.financial_profiles.updated_by) WHERE id = OLD.id 
                RETURNING id INTO NEW.id;
            END IF;
            IF (TG_OP = 'INSERT') THEN
                IF EXISTS (SELECT 1 FROM hr.profiles WHERE id = NEW.id) THEN
                    UPDATE hr.profiles SET display_id = COALESCE(NEW.display_id::text::text, hr.profiles.display_id), hire_date = COALESCE(NEW.hire_date::text::date, hr.profiles.hire_date), termination_date = COALESCE(NEW.termination_date::text::date, hr.profiles.termination_date), employment_type = COALESCE(NEW.employment_type::text::text, hr.profiles.employment_type), work_schedule = COALESCE(to_jsonb(NEW.work_schedule::text), hr.profiles.work_schedule), job_title = COALESCE(NEW.job_title::text::text, hr.profiles.job_title), department = COALESCE(NEW.department::text::text, hr.profiles.department), cost_center = COALESCE(NEW.cost_center::text::text, hr.profiles.cost_center), employment_status = COALESCE(NEW.employment_status::text::text, hr.profiles.employment_status), created_at = COALESCE(NEW.created_at::text::timestamptz, hr.profiles.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, hr.profiles.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, hr.profiles.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, hr.profiles.updated_by), search_vector = COALESCE(NEW.search_vector::text::tsvector, hr.profiles.search_vector) WHERE id = NEW.id 
                    RETURNING display_id INTO NEW.display_id;
                ELSE
                    INSERT INTO hr.profiles (id, organization_id, display_id, hire_date, termination_date, employment_type, work_schedule, job_title, department, cost_center, employment_status, created_at, updated_at, created_by, updated_by, search_vector) VALUES (NEW.id::text::uuid, NEW.organization_id::text::uuid, NEW.display_id::text::text, NEW.hire_date::text::date, NEW.termination_date::text::date, NEW.employment_type::text::text, COALESCE(to_jsonb(NEW.work_schedule::text), '{}'::jsonb), NEW.job_title::text::text, NEW.department::text::text, NEW.cost_center::text::text, COALESCE(NEW.employment_status::text::text, 'active'::text), COALESCE(NEW.created_at::text::timestamptz, now()), COALESCE(NEW.updated_at::text::timestamptz, now()), NEW.created_by::text::uuid, NEW.updated_by::text::uuid, NEW.search_vector::text::tsvector)
                    RETURNING display_id INTO NEW.display_id;
                END IF;
            ELSE
                UPDATE hr.profiles SET display_id = COALESCE(NEW.display_id::text::text, hr.profiles.display_id), hire_date = COALESCE(NEW.hire_date::text::date, hr.profiles.hire_date), termination_date = COALESCE(NEW.termination_date::text::date, hr.profiles.termination_date), employment_type = COALESCE(NEW.employment_type::text::text, hr.profiles.employment_type), work_schedule = COALESCE(to_jsonb(NEW.work_schedule::text), hr.profiles.work_schedule), job_title = COALESCE(NEW.job_title::text::text, hr.profiles.job_title), department = COALESCE(NEW.department::text::text, hr.profiles.department), cost_center = COALESCE(NEW.cost_center::text::text, hr.profiles.cost_center), employment_status = COALESCE(NEW.employment_status::text::text, hr.profiles.employment_status), created_at = COALESCE(NEW.created_at::text::timestamptz, hr.profiles.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, hr.profiles.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, hr.profiles.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, hr.profiles.updated_by), search_vector = COALESCE(NEW.search_vector::text::tsvector, hr.profiles.search_vector) WHERE id = OLD.id 
                RETURNING display_id INTO NEW.display_id;
            END IF;
                RETURN NEW;
            END IF;
            RETURN NULL;
        END;
        $$;

CREATE FUNCTION identity.trg_v_organizations_shard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        DECLARE
            v_item jsonb;
        BEGIN
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
                            IF (TG_OP = 'INSERT') AND NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
            IF (TG_OP = 'INSERT') AND NEW.organization_id IS NULL THEN NEW.organization_id := identity.get_current_org_id(); END IF;
        IF (TG_OP = 'INSERT') THEN
            IF EXISTS (SELECT 1 FROM identity.organizations WHERE id = NEW.id AND organization_id = NEW.organization_id) THEN
                UPDATE identity.organizations SET name = COALESCE(NEW.name::text::text, identity.organizations.name), subdomain = COALESCE(NEW.subdomain::text::text, identity.organizations.subdomain), module_features = COALESCE(to_jsonb(NEW.module_features::text), identity.organizations.module_features), details = COALESCE(to_jsonb(NEW.details::text), identity.organizations.details), app_settings = COALESCE(to_jsonb(NEW.app_settings::text), identity.organizations.app_settings), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.organizations.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.organizations.updated_at), subscription_id = COALESCE(NEW.subscription_id::text::uuid, identity.organizations.subscription_id), settings = COALESCE(to_jsonb(NEW.settings::text), identity.organizations.settings), auth_id = COALESCE(NEW.auth_id::text::uuid, identity.organizations.auth_id), created_by = COALESCE(NEW.created_by::text::uuid, identity.organizations.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.organizations.updated_by), theme_config = COALESCE(to_jsonb(NEW.theme_config::text), identity.organizations.theme_config), enabled_languages = COALESCE(NEW.enabled_languages::text::_text, identity.organizations.enabled_languages), default_language = COALESCE(NEW.default_language::text::text, identity.organizations.default_language), is_demo = COALESCE(NEW.is_demo::text::bool, identity.organizations.is_demo), claimed_by_contact_id = COALESCE(NEW.claimed_by_contact_id::text::uuid, identity.organizations.claimed_by_contact_id), claimed_at = COALESCE(NEW.claimed_at::text::timestamptz, identity.organizations.claimed_at), tier = COALESCE(NEW.tier::text::text, identity.organizations.tier), deleted_at = COALESCE(NEW.deleted_at::text::timestamptz, identity.organizations.deleted_at), vertical = COALESCE(to_jsonb(NEW.vertical::text), identity.organizations.vertical), custom = COALESCE(to_jsonb(NEW.custom::text), identity.organizations.custom), is_system_org = COALESCE(NEW.is_system_org::text::bool, identity.organizations.is_system_org), is_active = COALESCE(NEW.is_active::text::bool, identity.organizations.is_active) WHERE id = NEW.id;
            ELSE
                INSERT INTO identity.organizations (id, name, subdomain, module_features, details, app_settings, created_at, updated_at, subscription_id, settings, auth_id, created_by, updated_by, theme_config, enabled_languages, default_language, is_demo, claimed_by_contact_id, claimed_at, tier, deleted_at, vertical, custom, is_system_org, is_active, organization_id) VALUES (NEW.id::text::uuid, NEW.name::text::text, NEW.subdomain::text::text, COALESCE(to_jsonb(NEW.module_features::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.details::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.app_settings::text), '{}'::jsonb), NEW.created_at::text::timestamptz, NEW.updated_at::text::timestamptz, NEW.subscription_id::text::uuid, COALESCE(to_jsonb(NEW.settings::text), '{}'::jsonb), NEW.auth_id::text::uuid, NEW.created_by::text::uuid, NEW.updated_by::text::uuid, COALESCE(to_jsonb(NEW.theme_config::text), '{}'::jsonb), NEW.enabled_languages::text::_text, NEW.default_language::text::text, NEW.is_demo::text::bool, NEW.claimed_by_contact_id::text::uuid, NEW.claimed_at::text::timestamptz, NEW.tier::text::text, NEW.deleted_at::text::timestamptz, COALESCE(to_jsonb(NEW.vertical::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.custom::text), '{}'::jsonb), NEW.is_system_org::text::bool, NEW.is_active::text::bool, NEW.organization_id::text::uuid);
            END IF;
        ELSE
            UPDATE identity.organizations SET name = COALESCE(NEW.name::text::text, identity.organizations.name), subdomain = COALESCE(NEW.subdomain::text::text, identity.organizations.subdomain), module_features = COALESCE(to_jsonb(NEW.module_features::text), identity.organizations.module_features), details = COALESCE(to_jsonb(NEW.details::text), identity.organizations.details), app_settings = COALESCE(to_jsonb(NEW.app_settings::text), identity.organizations.app_settings), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.organizations.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.organizations.updated_at), subscription_id = COALESCE(NEW.subscription_id::text::uuid, identity.organizations.subscription_id), settings = COALESCE(to_jsonb(NEW.settings::text), identity.organizations.settings), auth_id = COALESCE(NEW.auth_id::text::uuid, identity.organizations.auth_id), created_by = COALESCE(NEW.created_by::text::uuid, identity.organizations.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.organizations.updated_by), theme_config = COALESCE(to_jsonb(NEW.theme_config::text), identity.organizations.theme_config), enabled_languages = COALESCE(NEW.enabled_languages::text::_text, identity.organizations.enabled_languages), default_language = COALESCE(NEW.default_language::text::text, identity.organizations.default_language), is_demo = COALESCE(NEW.is_demo::text::bool, identity.organizations.is_demo), claimed_by_contact_id = COALESCE(NEW.claimed_by_contact_id::text::uuid, identity.organizations.claimed_by_contact_id), claimed_at = COALESCE(NEW.claimed_at::text::timestamptz, identity.organizations.claimed_at), tier = COALESCE(NEW.tier::text::text, identity.organizations.tier), deleted_at = COALESCE(NEW.deleted_at::text::timestamptz, identity.organizations.deleted_at), vertical = COALESCE(to_jsonb(NEW.vertical::text), identity.organizations.vertical), custom = COALESCE(to_jsonb(NEW.custom::text), identity.organizations.custom), is_system_org = COALESCE(NEW.is_system_org::text::bool, identity.organizations.is_system_org), is_active = COALESCE(NEW.is_active::text::bool, identity.organizations.is_active) WHERE id = OLD.id;
        END IF;
                RETURN NEW;
            END IF;
            RETURN NULL;
        END;
        $$;

CREATE FUNCTION identity.trg_v_roles_shard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        DECLARE
            v_item jsonb;
        BEGIN
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
                            IF (TG_OP = 'INSERT') AND NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
            IF (TG_OP = 'INSERT') AND NEW.organization_id IS NULL THEN NEW.organization_id := identity.get_current_org_id(); END IF;
        IF (TG_OP = 'INSERT') THEN
            IF EXISTS (SELECT 1 FROM identity.roles WHERE id = NEW.id AND organization_id = NEW.organization_id) THEN
                UPDATE identity.roles SET name = COALESCE(NEW.name::text::text, identity.roles.name), permissions = COALESCE(to_jsonb(NEW.permissions::text), identity.roles.permissions), is_sassadmin = COALESCE(NEW.is_sassadmin::text::bool, identity.roles.is_sassadmin), ui_order = COALESCE(NEW.ui_order::text::int8, identity.roles.ui_order), rls_policy = COALESCE(to_jsonb(NEW.rls_policy::text), identity.roles.rls_policy), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.roles.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.roles.updated_at), feature = COALESCE(to_jsonb(NEW.feature::text), identity.roles.feature), location_id = COALESCE(NEW.location_id::text::uuid, identity.roles.location_id), is_active = COALESCE(NEW.is_active::text::bool, identity.roles.is_active), created_by = COALESCE(NEW.created_by::text::uuid, identity.roles.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.roles.updated_by), deleted_at = COALESCE(NEW.deleted_at::text::timestamptz, identity.roles.deleted_at), vertical = COALESCE(to_jsonb(NEW.vertical::text), identity.roles.vertical), custom = COALESCE(to_jsonb(NEW.custom::text), identity.roles.custom) WHERE id = NEW.id
                RETURNING id INTO NEW.id;
            ELSE
                INSERT INTO identity.roles (id, organization_id, name, permissions, is_sassadmin, ui_order, rls_policy, created_at, updated_at, feature, location_id, is_active, created_by, updated_by, deleted_at, vertical, custom) VALUES (COALESCE(NEW.id::text::uuid, uuid_generate_v4()), NEW.organization_id::text::uuid, NEW.name::text::text, COALESCE(to_jsonb(NEW.permissions::text), '{}'::jsonb), COALESCE(NEW.is_sassadmin::text::bool, false), NEW.ui_order::text::int8, COALESCE(to_jsonb(NEW.rls_policy::text), '{}'::jsonb), COALESCE(NEW.created_at::text::timestamptz, now()), COALESCE(NEW.updated_at::text::timestamptz, now()), COALESCE(to_jsonb(NEW.feature::text), '{}'::jsonb), NEW.location_id::text::uuid, COALESCE(NEW.is_active::text::bool, true), NEW.created_by::text::uuid, NEW.updated_by::text::uuid, NEW.deleted_at::text::timestamptz, COALESCE(to_jsonb(NEW.vertical::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.custom::text), '{}'::jsonb))
                RETURNING id INTO NEW.id;
            END IF;
        ELSE
            UPDATE identity.roles SET name = COALESCE(NEW.name::text::text, identity.roles.name), permissions = COALESCE(to_jsonb(NEW.permissions::text), identity.roles.permissions), is_sassadmin = COALESCE(NEW.is_sassadmin::text::bool, identity.roles.is_sassadmin), ui_order = COALESCE(NEW.ui_order::text::int8, identity.roles.ui_order), rls_policy = COALESCE(to_jsonb(NEW.rls_policy::text), identity.roles.rls_policy), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.roles.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.roles.updated_at), feature = COALESCE(to_jsonb(NEW.feature::text), identity.roles.feature), location_id = COALESCE(NEW.location_id::text::uuid, identity.roles.location_id), is_active = COALESCE(NEW.is_active::text::bool, identity.roles.is_active), created_by = COALESCE(NEW.created_by::text::uuid, identity.roles.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.roles.updated_by), deleted_at = COALESCE(NEW.deleted_at::text::timestamptz, identity.roles.deleted_at), vertical = COALESCE(to_jsonb(NEW.vertical::text), identity.roles.vertical), custom = COALESCE(to_jsonb(NEW.custom::text), identity.roles.custom) WHERE id = OLD.id
            RETURNING id INTO NEW.id;
        END IF;
                RETURN NEW;
            END IF;
            RETURN NULL;
        END;
        $$;

CREATE FUNCTION identity.trg_v_teams_shard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        DECLARE
            v_item jsonb;
        BEGIN
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
                            IF (TG_OP = 'INSERT') AND NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
            IF (TG_OP = 'INSERT') AND NEW.organization_id IS NULL THEN NEW.organization_id := identity.get_current_org_id(); END IF;
        IF (TG_OP = 'INSERT') THEN
            IF EXISTS (SELECT 1 FROM identity.teams WHERE id = NEW.id AND organization_id = NEW.organization_id) THEN
                UPDATE identity.teams SET name = COALESCE(NEW.name::text::text, identity.teams.name), location_id = COALESCE(NEW.location_id::text::uuid, identity.teams.location_id), details = COALESCE(to_jsonb(NEW.details::text), identity.teams.details), created_by = COALESCE(NEW.created_by::text::uuid, identity.teams.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.teams.updated_by), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.teams.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.teams.updated_at) WHERE id = NEW.id
                RETURNING id INTO NEW.id;
            ELSE
                INSERT INTO identity.teams (id, organization_id, name, location_id, details, created_by, updated_by, created_at, updated_at) VALUES (COALESCE(NEW.id::text::uuid, uuid_generate_v4()), NEW.organization_id::text::uuid, NEW.name::text::text, NEW.location_id::text::uuid, COALESCE(to_jsonb(NEW.details::text), '{}'::jsonb), NEW.created_by::text::uuid, NEW.updated_by::text::uuid, COALESCE(NEW.created_at::text::timestamptz, now()), COALESCE(NEW.updated_at::text::timestamptz, now()))
                RETURNING id INTO NEW.id;
            END IF;
        ELSE
            UPDATE identity.teams SET name = COALESCE(NEW.name::text::text, identity.teams.name), location_id = COALESCE(NEW.location_id::text::uuid, identity.teams.location_id), details = COALESCE(to_jsonb(NEW.details::text), identity.teams.details), created_by = COALESCE(NEW.created_by::text::uuid, identity.teams.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.teams.updated_by), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.teams.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.teams.updated_at) WHERE id = OLD.id
            RETURNING id INTO NEW.id;
        END IF;
                RETURN NEW;
            END IF;
            RETURN NULL;
        END;
        $$;

CREATE FUNCTION identity.trg_v_user_roles_shard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        DECLARE
            v_item jsonb;
        BEGIN
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
                            IF (TG_OP = 'INSERT') AND NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
            IF (TG_OP = 'INSERT') AND NEW.organization_id IS NULL THEN NEW.organization_id := identity.get_current_org_id(); END IF;
        IF (TG_OP = 'INSERT') THEN
            IF EXISTS (SELECT 1 FROM identity.user_roles WHERE id = NEW.id AND organization_id = NEW.organization_id) THEN
                UPDATE identity.user_roles SET organization_user_id = COALESCE(NEW.organization_user_id::text::uuid, identity.user_roles.organization_user_id), role_id = COALESCE(NEW.role_id::text::uuid, identity.user_roles.role_id), team_id = COALESCE(NEW.team_id::text::uuid, identity.user_roles.team_id), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.user_roles.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.user_roles.updated_at), last_assigned_at = COALESCE(NEW.last_assigned_at::text::timestamptz, identity.user_roles.last_assigned_at), created_by = COALESCE(NEW.created_by::text::uuid, identity.user_roles.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.user_roles.updated_by) WHERE id = NEW.id
                RETURNING id INTO NEW.id;
            ELSE
                INSERT INTO identity.user_roles (organization_user_id, role_id, team_id, created_at, updated_at, last_assigned_at, created_by, organization_id, id, updated_by) VALUES (NEW.organization_user_id::text::uuid, NEW.role_id::text::uuid, NEW.team_id::text::uuid, COALESCE(NEW.created_at::text::timestamptz, now()), COALESCE(NEW.updated_at::text::timestamptz, now()), NEW.last_assigned_at::text::timestamptz, NEW.created_by::text::uuid, NEW.organization_id::text::uuid, COALESCE(NEW.id::text::uuid, gen_random_uuid()), NEW.updated_by::text::uuid)
                RETURNING id INTO NEW.id;
            END IF;
        ELSE
            UPDATE identity.user_roles SET organization_user_id = COALESCE(NEW.organization_user_id::text::uuid, identity.user_roles.organization_user_id), role_id = COALESCE(NEW.role_id::text::uuid, identity.user_roles.role_id), team_id = COALESCE(NEW.team_id::text::uuid, identity.user_roles.team_id), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.user_roles.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.user_roles.updated_at), last_assigned_at = COALESCE(NEW.last_assigned_at::text::timestamptz, identity.user_roles.last_assigned_at), created_by = COALESCE(NEW.created_by::text::uuid, identity.user_roles.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.user_roles.updated_by) WHERE id = OLD.id
            RETURNING id INTO NEW.id;
        END IF;
                RETURN NEW;
            END IF;
            RETURN NULL;
        END;
        $$;

CREATE FUNCTION identity.trg_v_user_teams_shard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        DECLARE
            v_item jsonb;
        BEGIN
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
                            IF (TG_OP = 'INSERT') AND NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
            IF (TG_OP = 'INSERT') AND NEW.organization_id IS NULL THEN NEW.organization_id := identity.get_current_org_id(); END IF;
        IF (TG_OP = 'INSERT') THEN
            IF EXISTS (SELECT 1 FROM identity.user_teams WHERE id = NEW.id AND organization_id = NEW.organization_id) THEN
                UPDATE identity.user_teams SET organization_user_id = COALESCE(NEW.organization_user_id::text::uuid, identity.user_teams.organization_user_id), team_id = COALESCE(NEW.team_id::text::uuid, identity.user_teams.team_id), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.user_teams.created_at), created_by = COALESCE(NEW.created_by::text::uuid, identity.user_teams.created_by), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.user_teams.updated_at), last_assigned_at = COALESCE(NEW.last_assigned_at::text::timestamptz, identity.user_teams.last_assigned_at), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.user_teams.updated_by) WHERE id = NEW.id
                RETURNING id INTO NEW.id;
            ELSE
                INSERT INTO identity.user_teams (organization_user_id, team_id, created_at, created_by, updated_at, last_assigned_at, id, organization_id, updated_by) VALUES (NEW.organization_user_id::text::uuid, NEW.team_id::text::uuid, COALESCE(NEW.created_at::text::timestamptz, now()), NEW.created_by::text::uuid, COALESCE(NEW.updated_at::text::timestamptz, now()), NEW.last_assigned_at::text::timestamptz, COALESCE(NEW.id::text::uuid, gen_random_uuid()), NEW.organization_id::text::uuid, NEW.updated_by::text::uuid)
                RETURNING id INTO NEW.id;
            END IF;
        ELSE
            UPDATE identity.user_teams SET organization_user_id = COALESCE(NEW.organization_user_id::text::uuid, identity.user_teams.organization_user_id), team_id = COALESCE(NEW.team_id::text::uuid, identity.user_teams.team_id), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.user_teams.created_at), created_by = COALESCE(NEW.created_by::text::uuid, identity.user_teams.created_by), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.user_teams.updated_at), last_assigned_at = COALESCE(NEW.last_assigned_at::text::timestamptz, identity.user_teams.last_assigned_at), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.user_teams.updated_by) WHERE id = OLD.id
            RETURNING id INTO NEW.id;
        END IF;
                RETURN NEW;
            END IF;
            RETURN NULL;
        END;
        $$;

CREATE FUNCTION identity.trg_v_users_shard() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        DECLARE
            v_item jsonb;
        BEGIN
            IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
                            IF (TG_OP = 'INSERT') AND NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
            IF (TG_OP = 'INSERT') AND NEW.organization_id IS NULL THEN NEW.organization_id := identity.get_current_org_id(); END IF;
        IF (TG_OP = 'INSERT') THEN
            IF EXISTS (SELECT 1 FROM identity.users WHERE id = NEW.id AND organization_id = NEW.organization_id) THEN
                UPDATE identity.users SET auth_id = COALESCE(NEW.auth_id::text::uuid, identity.users.auth_id), name = COALESCE(NEW.name::text::text, identity.users.name), details = COALESCE(to_jsonb(NEW.details::text), identity.users.details), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.users.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.users.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, identity.users.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.users.updated_by), privacy = COALESCE(to_jsonb(NEW.privacy::text), identity.users.privacy), password_confirmed = COALESCE(NEW.password_confirmed::text::bool, identity.users.password_confirmed), subscriptions = COALESCE(to_jsonb(NEW.subscriptions::text), identity.users.subscriptions), relationship_details = COALESCE(to_jsonb(NEW.relationship_details::text), identity.users.relationship_details), profile_privacy = COALESCE(to_jsonb(NEW.profile_privacy::text), identity.users.profile_privacy), post_read_statuses = COALESCE(to_jsonb(NEW.post_read_statuses::text), identity.users.post_read_statuses), pref_organization_id = COALESCE(NEW.pref_organization_id::text::uuid, identity.users.pref_organization_id), email = COALESCE(NEW.email::text::text, identity.users.email), mobile = COALESCE(NEW.mobile::text::text, identity.users.mobile), auth_provider = COALESCE(NEW.auth_provider::text::text, identity.users.auth_provider), auth_provider_id = COALESCE(NEW.auth_provider_id::text::text, identity.users.auth_provider_id), last_login_at = COALESCE(NEW.last_login_at::text::timestamptz, identity.users.last_login_at), deleted_at = COALESCE(NEW.deleted_at::text::timestamptz, identity.users.deleted_at), search_vector = COALESCE(NEW.search_vector::text::tsvector, identity.users.search_vector), vertical = COALESCE(to_jsonb(NEW.vertical::text), identity.users.vertical), custom = COALESCE(to_jsonb(NEW.custom::text), identity.users.custom) WHERE id = NEW.id;
            ELSE
                INSERT INTO identity.users (id, auth_id, name, details, created_at, updated_at, created_by, updated_by, privacy, password_confirmed, subscriptions, relationship_details, profile_privacy, post_read_statuses, pref_organization_id, email, mobile, organization_id, auth_provider, auth_provider_id, last_login_at, deleted_at, search_vector, vertical, custom) VALUES (NEW.id::text::uuid, NEW.auth_id::text::uuid, NEW.name::text::text, COALESCE(to_jsonb(NEW.details::text), '{}'::jsonb), NEW.created_at::text::timestamptz, NEW.updated_at::text::timestamptz, NEW.created_by::text::uuid, NEW.updated_by::text::uuid, COALESCE(to_jsonb(NEW.privacy::text), '{}'::jsonb), NEW.password_confirmed::text::bool, COALESCE(to_jsonb(NEW.subscriptions::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.relationship_details::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.profile_privacy::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.post_read_statuses::text), '{}'::jsonb), NEW.pref_organization_id::text::uuid, NEW.email::text::text, NEW.mobile::text::text, NEW.organization_id::text::uuid, NEW.auth_provider::text::text, NEW.auth_provider_id::text::text, NEW.last_login_at::text::timestamptz, NEW.deleted_at::text::timestamptz, NEW.search_vector::text::tsvector, COALESCE(to_jsonb(NEW.vertical::text), '{}'::jsonb), COALESCE(to_jsonb(NEW.custom::text), '{}'::jsonb));
            END IF;
        ELSE
            UPDATE identity.users SET auth_id = COALESCE(NEW.auth_id::text::uuid, identity.users.auth_id), name = COALESCE(NEW.name::text::text, identity.users.name), details = COALESCE(to_jsonb(NEW.details::text), identity.users.details), created_at = COALESCE(NEW.created_at::text::timestamptz, identity.users.created_at), updated_at = COALESCE(NEW.updated_at::text::timestamptz, identity.users.updated_at), created_by = COALESCE(NEW.created_by::text::uuid, identity.users.created_by), updated_by = COALESCE(NEW.updated_by::text::uuid, identity.users.updated_by), privacy = COALESCE(to_jsonb(NEW.privacy::text), identity.users.privacy), password_confirmed = COALESCE(NEW.password_confirmed::text::bool, identity.users.password_confirmed), subscriptions = COALESCE(to_jsonb(NEW.subscriptions::text), identity.users.subscriptions), relationship_details = COALESCE(to_jsonb(NEW.relationship_details::text), identity.users.relationship_details), profile_privacy = COALESCE(to_jsonb(NEW.profile_privacy::text), identity.users.profile_privacy), post_read_statuses = COALESCE(to_jsonb(NEW.post_read_statuses::text), identity.users.post_read_statuses), pref_organization_id = COALESCE(NEW.pref_organization_id::text::uuid, identity.users.pref_organization_id), email = COALESCE(NEW.email::text::text, identity.users.email), mobile = COALESCE(NEW.mobile::text::text, identity.users.mobile), auth_provider = COALESCE(NEW.auth_provider::text::text, identity.users.auth_provider), auth_provider_id = COALESCE(NEW.auth_provider_id::text::text, identity.users.auth_provider_id), last_login_at = COALESCE(NEW.last_login_at::text::timestamptz, identity.users.last_login_at), deleted_at = COALESCE(NEW.deleted_at::text::timestamptz, identity.users.deleted_at), search_vector = COALESCE(NEW.search_vector::text::tsvector, identity.users.search_vector), vertical = COALESCE(to_jsonb(NEW.vertical::text), identity.users.vertical), custom = COALESCE(to_jsonb(NEW.custom::text), identity.users.custom) WHERE id = OLD.id;
        END IF;
                RETURN NEW;
            END IF;
            RETURN NULL;
        END;
        $$;

CREATE FUNCTION identity.update_location_path() RETURNS trigger
    LANGUAGE plpgsql
    AS $$-- DECLARE
DECLARE
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    update_location_path
     * PURPOSE:     Maintains geographic/territorial hierarchy via LTREE.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. HIERARCHY MAINTENANCE: Triggered on INSERT or UPDATE of parent_id.
     * 2. PATH CONSTRUCTION: 
     *    - Root: path = self_uuid
     *    - Child: path = parent_path || self_uuid
     * 3. DATA INTEGRITY: Blocks updates if the parent does not exist or has a NULL path.
     * 
     * USE CASES:
     * - Nested locations (Country -> Region -> Site).
     * - Regional data inheritance and scoped reporting.
     * 
     * TECHNICAL LOGIC:
     * - Uses UUIDs directly as LTREE labels (valid in PostgreSQL ltree extension).
     * - Performs a lookup on its own table to fetch parent_path.
     * ======================================================================================
     */
    v_parent_path extensions.ltree;
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.path := NEW.id::text::extensions.ltree;
    ELSE
        SELECT path INTO v_parent_path
        FROM identity.locations
        WHERE id = NEW.parent_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent location with id=% not found', NEW.parent_id;
        END IF;
        IF v_parent_path IS NULL THEN
            RAISE EXCEPTION 'Parent location id=% has null path', NEW.parent_id;
        END IF;
        NEW.path := v_parent_path || '.' || NEW.id::text;
    END IF;
    RETURN NEW;
END;$$;

CREATE FUNCTION identity.update_organization_user_path_v2() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_parent_path extensions.ltree;
    v_new_node text;
BEGIN
    v_new_node := replace(NEW.id::text, '-', '_');
    IF NEW.manager_id IS NULL THEN
        NEW.path := v_new_node::extensions.ltree;
    ELSE
        SELECT path INTO v_parent_path
        FROM identity.organization_users
        WHERE id = NEW.manager_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Manager with id=% not found', NEW.manager_id;
        END IF;
        IF v_parent_path IS NULL THEN
            UPDATE identity.organization_users 
            SET path = replace(id::text, '-', '_')::extensions.ltree 
            WHERE id = NEW.manager_id;
            SELECT path INTO v_parent_path 
            FROM identity.organization_users WHERE id = NEW.manager_id;
        END IF;
        NEW.path := v_parent_path || v_new_node::extensions.ltree;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION identity.update_organization_user_path() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_parent_path extensions.ltree;
    v_new_node    text;
    v_old_path    extensions.ltree;
    v_new_path    extensions.ltree;
BEGIN
    v_new_node := replace(NEW.id::text, '-', '_');
    IF NEW.manager_id IS NULL THEN
        v_new_path := v_new_node::extensions.ltree;
    ELSE
        SELECT path INTO v_parent_path
        FROM identity.organization_users
        WHERE id = NEW.manager_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Manager with id=% not found', NEW.manager_id;
        END IF;
        IF v_parent_path IS NULL THEN
            UPDATE identity.organization_users 
            SET path = replace(id::text, '-', '_')::extensions.ltree 
            WHERE id = NEW.manager_id;
            SELECT path INTO v_parent_path 
            FROM identity.organization_users 
            WHERE id = NEW.manager_id;
        END IF;
        v_new_path := v_parent_path || v_new_node::extensions.ltree;
    END IF;
    v_old_path := OLD.path;
    NEW.path := v_new_path;
    IF v_old_path IS NOT NULL AND v_old_path IS DISTINCT FROM v_new_path THEN
        UPDATE identity.organization_users
        SET path = v_new_path || subpath(path, nlevel(v_old_path))
        WHERE path <@ v_old_path
          AND id != NEW.id
          AND organization_id = NEW.organization_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION identity.util_get_subordinate_count_v2() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count integer;
    v_my_path extensions.ltree;
BEGIN
    SELECT path INTO v_my_path 
    FROM identity.organization_users 
    WHERE user_id = auth.uid() 
      AND organization_id = identity.get_current_org_id()
    LIMIT 1;
    IF v_my_path IS NULL THEN RETURN 0; END IF;
    SELECT count(*)::int INTO v_count
    FROM identity.organization_users target
    WHERE target.path <@ v_my_path
      AND target.path != v_my_path
      AND target.organization_id = identity.get_current_org_id();
    RETURN COALESCE(v_count, 0);
END;
$$;

CREATE FUNCTION identity.util_get_subordinate_count() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count integer;
    v_my_path extensions.ltree;
BEGIN
    SELECT path INTO v_my_path 
    FROM identity.organization_users 
    WHERE user_id = auth.uid() 
    LIMIT 1;
    IF v_my_path IS NULL THEN RETURN 0; END IF;
    SELECT count(*)
    INTO v_count
    FROM identity.organization_users target
    WHERE target.path <@ v_my_path
      AND target.path != v_my_path; -- Exclude self
    RETURN COALESCE(v_count, 0);
END;
$$;

CREATE FUNCTION identity.util_impersonate_user(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    EXECUTE 'SET ROLE authenticated';
    EXECUTE format('SET LOCAL request.jwt.claims = %L', json_build_object('sub', p_user_id)::text);
END;
$$;

CREATE FUNCTION identity.util_merge_role_permissions(p_role_ids uuid[]) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_perms jsonb := '{}'::jsonb;
    v_role record;
BEGIN
    FOR v_role IN 
        SELECT * FROM identity.roles WHERE id = ANY(p_role_ids) AND is_active = true
    LOOP
        IF v_role.permissions IS NOT NULL THEN
            v_perms := v_perms || v_role.permissions;
        END IF;
    END LOOP;
    RETURN v_perms;
END;
$$;

CREATE FUNCTION identity.util_ops_delete_organization_user(p_organization_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_org_count int;
BEGIN
    SELECT user_id INTO v_user_id 
    FROM identity.organization_users 
    WHERE id = p_organization_user_id;
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM identity.users WHERE id = p_organization_user_id;
        IF v_user_id IS NULL THEN
            RETURN jsonb_build_object('status', 'error', 'message', 'Organization User not found');
        END IF;
    END IF;
    DELETE FROM core.unified_objects WHERE id = p_organization_user_id;
    DELETE FROM identity.organization_users WHERE id = p_organization_user_id;
    SELECT count(*) INTO v_org_count 
    FROM identity.organization_users 
    WHERE user_id = v_user_id;
    IF v_org_count = 0 THEN
        DELETE FROM identity.users WHERE id = v_user_id;
        RAISE NOTICE 'Deleted orphaned identity.users record: %', v_user_id;
    END IF;
    RETURN jsonb_build_object(
        'status', 'success', 
        'organization_user_id', p_organization_user_id,
        'identity_user_deleted', (v_org_count = 0)
    );
END;
$$;

CREATE FUNCTION identity.util_ops_delete_user(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_org_count int;
BEGIN
    SELECT count(*) INTO v_org_count 
    FROM identity.organization_users 
    WHERE user_id = p_user_id;
    IF v_org_count > 0 THEN
        RETURN jsonb_build_object(
            'status', 'error', 
            'message', 'User is still linked to ' || v_org_count || ' organization(s). Delete organization links first.',
            'org_count', v_org_count
        );
    END IF;
    DELETE FROM identity.users WHERE id = p_user_id;
    RETURN jsonb_build_object(
        'status', 'success', 
        'user_id', p_user_id,
        'message', 'Global identity record deleted.'
    );
END;
$$;

CREATE FUNCTION identity.utils_test_session_as_user(p_auth_id uuid, p_organization_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$DECLARE
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    utils_test_session_as_user
     * PURPOSE:     Developer utility to simulate and debug JWT claims.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. IMPERSONATION: Temporarily sets the request.jwt.claims configuration to 
     *    mimic a specific auth.uid().
     * 2. DB ROLE DETECTION: Correcty identifies if the impersonated user should
     *    be treated as 'service_role' (e.g., if member of zoworks).
     * 3. AUTOMATIC RESET: Since set_config is called with 'true' (local), the 
     *    impersonation is automatically cleared at the end of the transaction.
     * 
     * USE CASES:
     * - Debugging "Why can't User X see this row?" (Test RLS).
     * - Verifying complex RBAC permission merges without logging in/out.
     * 
     * TECHNICAL LOGIC:
     * - Manages transactional session variables via set_config.
     * - Proxies the call to jwt_get_user_session or get_user_session internally.
     * ======================================================================================
     */
  v_user_id UUID;
  v_db_role TEXT;
  v_claims TEXT;
  v_result jsonb;
BEGIN
  SELECT u.id,
         CASE WHEN EXISTS (
              SELECT 1 FROM identity.organization_users ou
              JOIN identity.organizations o ON ou.organization_id = o.id
              WHERE ou.user_id = u.id AND o.name = 'zoworks' -- Your master org name
             )
         THEN 'service_role' ELSE 'authenticated' END
  INTO v_user_id, v_db_role
  FROM identity.users u WHERE u.auth_id = p_auth_id;
  IF v_user_id IS NULL THEN
     RAISE EXCEPTION 'User with auth_id % not found in identity.users', p_auth_id;
  END IF;
  v_claims := jsonb_build_object(
      'sub', p_auth_id,
      'role', v_db_role,
      'user_id', v_user_id
  )::TEXT;
  PERFORM set_config('request.jwt.claims', v_claims, true);
  SELECT identity.get_user_session(p_organization_id) INTO v_result;
  RETURN v_result;
END;$$;

CREATE FUNCTION identity.validate_team_assignment() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.team_id IS NULL AND NOT EXISTS (
        SELECT 1 FROM identity.roles r 
        WHERE r.id = NEW.role_id AND r.is_sassadmin = true
    ) THEN
        RAISE EXCEPTION 'team_id is mandatory for standard (non-SassAdmin) roles';
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION identity.validate_workforce_details(details jsonb) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $_$
BEGIN
    IF details IS NULL OR details = '{}'::jsonb THEN
        RETURN true; -- Empty is valid
    END IF;
    IF details ? 'worker_category' THEN
        IF NOT (details->>'worker_category') IN ('permanent', 'contractor', 'intern', 'consultant') THEN
            RETURN false;
        END IF;
    END IF;
    IF details ? 'seniority_level' THEN
        IF NOT (details->>'seniority_level') ~ '^([1-9]|10)$' THEN
            RETURN false;
        END IF;
    END IF;
    IF details ? 'employment_type' THEN
        IF NOT (details->>'employment_type') IN ('full_time', 'part_time', 'hourly') THEN
            RETURN false;
        END IF;
    END IF;
    IF details ? 'hire_date' THEN
        BEGIN
            PERFORM (details->>'hire_date')::date;
        EXCEPTION WHEN OTHERS THEN
            RETURN false;
        END;
    END IF;
    IF details ? 'exit_date' THEN
        BEGIN
            IF details->>'exit_date' IS NOT NULL THEN
                PERFORM (details->>'exit_date')::date;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RETURN false;
        END;
    END IF;
    RETURN true;
END;
$_$;

CREATE FUNCTION identity.x_get_all_approvers(p_submitter_org_user_id uuid, p_organization_id uuid, p_hr_role_id uuid, p_created_at timestamp with time zone, p_current_time timestamp with time zone) RETURNS TABLE(approver_user_id uuid, eligibility_window text)
    LANGUAGE plpgsql STABLE
    AS $$-- DECLARE
DECLARE
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    get_all_approvers
     * PURPOSE:     Calculates the chain of command for workflow approvals.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. THE 48-HOUR RULE: If a request is < 48 hours old, only the direct manager (L1)
     *    is eligible to approve. This prevents "skip-level" approvals too early.
     * 2. ESCALATION: After 48 hours, or if no L1 manager exists, the "Full Pool" is released.
     * 3. FULL POOL: includes all managers up the hierarchy path AND all users with the
     *    specified HR role for the organization.
     * 4. ISOLATION: All lookups are strictly scoped by p_organization_id.
     * 
     * USE CASES:
     * - Standard leave requests (Manager only first 2 days).
     * - Escalated requests (VPs/HR can step in after 2 days).
     * - Automatic routing for organizations with flat structures.
     * 
     * TECHNICAL LOGIC:
     * - Uses PostgreSQL LTREE (@>) for sub-millisecond ancestor traversal.
     * - Avoids recursive CTEs for better performance at scale.
     * - window_tag provides audit labels for the UI ('L1_ONLY_48H' or 'FULL_POOL_AFTER_48H').
     * ======================================================================================
     */
    v_l1_manager_org_user_id uuid;
    v_window_end timestamptz := p_created_at + INTERVAL '48 hours';
    v_is_48_hours_passed boolean := p_current_time >= v_window_end;
    v_submitter_path extensions.ltree; -- For ltree query
BEGIN
    SELECT ou.path
    INTO v_submitter_path
    FROM identity.organization_users ou
    WHERE ou.id = p_submitter_org_user_id;
    SELECT manager_id INTO v_l1_manager_org_user_id
    FROM identity.organization_users
    WHERE id = p_submitter_org_user_id
      AND organization_id = p_organization_id;
    IF NOT v_is_48_hours_passed AND v_l1_manager_org_user_id IS NOT NULL THEN
        RETURN QUERY
        SELECT ou.user_id, 'L1_ONLY_48H'
        FROM identity.organization_users ou
        WHERE ou.id = v_l1_manager_org_user_id;
        RETURN;
    END IF;
    RETURN QUERY
    WITH manager_approvers AS (
        SELECT
          ou.user_id
        FROM
          identity.organization_users ou
        WHERE
          ou.path @> v_submitter_path
          AND ou.id != p_submitter_org_user_id
          AND ou.organization_id = p_organization_id
    ),
    hr_approvers AS (
        SELECT ou.user_id -- Fixed your query, it was selecting ur.user_id
        FROM identity.organization_users ou
        JOIN identity.user_roles ur ON ou.id = ur.organization_user_id
        WHERE ou.organization_id = p_organization_id
          AND ur.role_id = p_hr_role_id
    )
    SELECT ma.user_id, 'FULL_POOL_AFTER_48H' FROM manager_approvers ma
    UNION -- Use UNION to combine distinct users
    SELECT hra.user_id, 'FULL_POOL_AFTER_48H' FROM hr_approvers hra;
END;$$;

CREATE FUNCTION identity.zz_get_current_org_id_v1() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$SELECT COALESCE(
            NULLIF(current_setting('request.jwt.claims.org_id', true), '')::uuid,
            NULLIF(current_setting('request.jwt.claims.organization_id', true), '')::uuid,
            (SELECT organization_id FROM identity.organization_users 
             WHERE user_id = auth.uid() AND is_active = true 
             ORDER BY created_at DESC LIMIT 1)
        );$$;

CREATE FUNCTION identity.zz_jwt_generate_thin_claims_v1_woorg_users(p_auth_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    jwt_generate_thin_claims
     * PURPOSE:     Generates lightweight JWT claims for minimal overhead.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. EFFICIENCY: Designed for internal service-to-service calls where full RBAC 
     *    and hierarchy maps are unnecessary.
     * 2. PREFERRED TENANT: Detects the user's preferred organization or falls back 
     *    to the first available active membership.
     * 3. SERVICE ROLE LOGIC: If the user is a member of the 'zoworks' organization,
     *    they are granted the 'service_role' DB role for internal system actions.
     * 
     * USE CASES:
     * - Background worker processes (Edge Functions).
     * - Cron-job based automation triggers.
     * - High-frequency internal lookups.
     * 
     * TECHNICAL LOGIC:
     * - Skips expensive loops for roles, permissions, and ltrees.
     * - Returns a flat JSON object with user_id, role, and org_id.
     * ======================================================================================
     */
    v_user_record RECORD; -- Holds identity.users data
    v_is_zoworks_member BOOLEAN := false;
    v_db_role TEXT := 'authenticated';
    v_preferred_org_id UUID;
BEGIN
    SELECT id, pref_organization_id -- USE THE NEW NAME
    INTO v_user_record
    FROM identity.users
    WHERE auth_id = p_auth_id;
    IF v_user_record IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;
    SELECT EXISTS (
        SELECT 1
        FROM identity.organization_users ou
        JOIN identity.organizations o ON ou.organization_id = o.id
        WHERE ou.user_id = v_user_record.id AND o.name = 'zoworks' -- Use your master org name
    ) INTO v_is_zoworks_member;
    IF v_is_zoworks_member THEN
        v_db_role := 'service_role';
        v_preferred_org_id := v_user_record.pref_organization_id; -- Use the stored pref if any
    ELSE
        v_db_role := 'authenticated';
         SELECT ou.organization_id INTO v_preferred_org_id
         FROM identity.organization_users ou
         WHERE ou.user_id = v_user_record.id
           AND ou.organization_id = v_user_record.pref_organization_id -- USE THE NEW NAME
           AND ou.is_active = true;
        IF v_preferred_org_id IS NULL THEN
             SELECT ou.organization_id INTO v_preferred_org_id
             FROM identity.organization_users ou
             WHERE ou.user_id = v_user_record.id AND ou.is_active = true
             ORDER BY ou.created_at
             LIMIT 1;
        END IF;
    END IF;
    RETURN jsonb_build_object(
        'user_id', v_user_record.id,
        'role', v_db_role,
        'org_id', v_preferred_org_id -- Include the preferred/default org ID
    );
END;$$;

CREATE FUNCTION identity.zz_jwt_generate_thin_claims_v1(p_auth_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    jwt_generate_thin_claims
     * PURPOSE:     Generates lightweight JWT claims for minimal overhead.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. EFFICIENCY: Designed for internal service-to-service calls where full RBAC
     *    and hierarchy maps are unnecessary.
     * 2. PREFERRED TENANT: Detects the user's preferred organization or falls back
     *    to the first available active membership.
     * 3. SERVICE ROLE LOGIC: If the user is a member of the 'zoworks' organization,
     *    they are granted the 'service_role' DB role for internal system actions.
     *
     * USE CASES:
     * - Background worker processes (Edge Functions).
     * - Cron-job based automation triggers.
     * - High-frequency internal lookups.
     *
     * TECHNICAL LOGIC:
     * - Skips expensive loops for roles, permissions, and ltrees.
     * - Returns a flat JSON object with user_id, role, org_id, and organization_id.
     * 
     * CHANGE LOG:
     * - 2026-01-15: Added 'organization_id' alias for RLS compatibility
     * ======================================================================================
     */
DECLARE
    v_user_record RECORD; -- Holds identity.users data
    v_is_zoworks_member BOOLEAN := false;
    v_db_role TEXT := 'authenticated';
    v_preferred_org_id UUID;
    v_org_user_id UUID; -- Added for RLS context
BEGIN
    SELECT id, pref_organization_id
    INTO v_user_record
    FROM identity.users
    WHERE auth_id = p_auth_id;
    IF v_user_record IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;
    SELECT EXISTS (
        SELECT 1
        FROM identity.organization_users ou
        JOIN identity.organizations o ON ou.organization_id = o.id
        WHERE ou.user_id = v_user_record.id AND o.name = 'zoworks'
    ) INTO v_is_zoworks_member;
    IF v_is_zoworks_member THEN
        v_db_role := 'service_role';
        v_preferred_org_id := v_user_record.pref_organization_id;
        SELECT ou.id INTO v_org_user_id
        FROM identity.organization_users ou
        JOIN identity.organizations o ON ou.organization_id = o.id
        WHERE ou.user_id = v_user_record.id AND o.name = 'zoworks'
        LIMIT 1;
    ELSE
        v_db_role := 'authenticated';
        SELECT ou.organization_id, ou.id INTO v_preferred_org_id, v_org_user_id
        FROM identity.organization_users ou
        WHERE ou.user_id = v_user_record.id
          AND ou.organization_id = v_user_record.pref_organization_id
          AND ou.is_active = true;
        IF v_preferred_org_id IS NULL THEN
            SELECT ou.organization_id, ou.id INTO v_preferred_org_id, v_org_user_id
            FROM identity.organization_users ou
            WHERE ou.user_id = v_user_record.id AND ou.is_active = true
            ORDER BY ou.created_at
            LIMIT 1;
        END IF;
    END IF;
    RETURN jsonb_build_object(
        'user_id', v_user_record.id,
        'role', v_db_role,
        'org_id', v_preferred_org_id,              -- Keep for backward compatibility
        'organization_id', v_preferred_org_id,     -- Add for RLS compatibility
        'org_user_id', v_org_user_id               -- Essential for hierarchy-based RLS
    );
END;$$;

CREATE FUNCTION identity.zz_jwt_get_user_session_duplicate_v2(p_organization_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
    /*
     * ======================================================================================
     * SYSTEM:      Identity & Access Management (v2)
     * FUNCTION:    jwt_get_user_session
     * DESCRIPTION: Generates the session claims JSON object for a user within a specific Org.
     * ======================================================================================
     * ARCHITECTURAL NOTES (FUTURE REFERENCE):
     * --------------------------------------------------------------------------------------
     * 1. PERFORMANCE STRATEGY (Consolidated Lookup):
     * - Uses a single INNER JOIN to fetch User, Org, and Membership data.
     * - Reduces DB round-trips from 3 to 1. Fails fast if any link is missing.
     *
     * 2. SECURITY:
     * - SECURITY DEFINER with fixed SEARCH_PATH prevents schema injection.
     * - Hardcoded 'zoworks' check grants super-admin privileges.
     *
     * 3. HIERARCHY LOGIC (LTREE):
     * - Uses '<@' (descendant) operator on 'identity.organization_users.path'.
     * - Requires GIST index on 'path' column for performance.
     * 4. DATA AGGREGATION:
     * - Permissions: Deeply merged from all assigned roles using 'jwt_jsonb_deep_merge_agg'.
     * - Locations: Union of direct assignments + inherited team locations.
     * - Output: Returns a JSONB object. Empty arrays are ensured via COALESCE.
     *
     * --------------------------------------------------------------------------------------
     * DATA SPECIFICATION / SAMPLE OUTPUT:
     * --------------------------------------------------------------------------------------
     * Returns a JSONB object.
     *
     * SCENARIO A: Standard User (with merged permissions & hierarchy)
     * {
     * "user_id": "a1b2c3d4-...",
     * "org_user_id": "x9y8z7w6-...",     // The membership ID
     * "org_id": "org-uuid-...",
     * "is_saas_admin": false,
     * "roles": [
     * { "id": 1, "name": "Sales Manager" }
     * ],
     * "permissions": {                   // Deep merged from all roles
     * "crm": { "leads": { "read": true, "write": true } },
     * "inventory": { "read": true }
     * },
     * "teams": [
     * { "id": 10, "name": "North East Sales" }
     * ],
     * "locations": [
     * { "id": 5, "name": "New York" }  // Direct + Team Inherited
     * ],
     * "subordinates": [                  // Array of User UUIDs (Recursive/Tree)
     * "sub-user-uuid-1",
     * "sub-user-uuid-2"
     * ]
     * }
     *
     * SCENARIO B: SaaS Super Admin ('zoworks')
     * {
     * "user_id": "...",
     * "is_saas_admin": true,
     * "permissions": { "admin": "all" },
     * "roles": [], "teams": [], "locations": [], "subordinates": []
     * }
     * ======================================================================================
     */
/*
     * ======================================================================================
     * MODULE:      Identity & Access Management
     * FUNCTION:    jwt_get_user_session
     * PURPOSE:     The primary Pre-Auth hook for generating session claims.
     * ======================================================================================
     * BUSINESS RULES:
     * 1. SESSION ORCHESTRATION: Aggregates User, Org, Membership, Roles, and 
     *    Permissions into a single JSONB blob for the Supabase JWT.
     * 2. SAAS ADMIN BACKDOOR: If the organization name is 'zoworks', the user is 
     *    granted 'is_saas_admin: true' and global permissions '{"admin": "all"}'.
     * 3. RBAC AGGREGATION: Deep merges permissions from ALL roles assigned to the user.
     * 4. HIERARCHY MAP: Includes an array of all direct/indirect subordinate UUIDs 
     *    to power RLS-based management views.
     * 5. LOCATION INHERITANCE: Surfaces both direct and team-assigned locations.
     * 
     * USE CASES:
     * - Every user login/refresh in the application.
     * - Powering all Role-Based Access Control logic in the frontend and RLS.
     * 
     * TECHNICAL LOGIC:
     * - Uses a single optimized JOIN for core context discovery. Fails to '{}' if missing.
     * - Leverages GIST-indexed LTREE path comparisons for sub-tree calculation.
     * - Employs a recursive deep-merge aggregator for sophisticated permission sets.
     * ======================================================================================
     */
    v_auth_id       UUID := auth.uid();
    v_user_id       UUID;
    v_org_id        UUID;
    v_org_name      TEXT;
    v_org_user_id   UUID;
    v_org_user_path ltree;
    v_claims        JSONB;
BEGIN
    SELECT 
        u.id, 
        o.id, 
        o.name, 
        ou.id, 
        ou.path
    INTO 
        v_user_id, 
        v_org_id, 
        v_org_name, 
        v_org_user_id, 
        v_org_user_path
    FROM identity.users u
    JOIN identity.organization_users ou ON u.id = ou.user_id
    JOIN identity.organizations o ON ou.organization_id = o.id
    WHERE u.auth_id = v_auth_id 
      AND o.id = p_organization_id;
    IF NOT FOUND THEN 
        RETURN '{}'::jsonb; 
    END IF;
    IF v_org_name = 'zoworks' THEN
        RETURN jsonb_build_object(
            'user_id', v_user_id,
            'org_user_id', v_org_user_id,
            'org_id', v_org_id,
            'is_saas_admin', true,
            'permissions', '{"admin": "all"}'::jsonb,
            'roles', '[]'::jsonb,
            'teams', '[]'::jsonb,
            'locations', '[]'::jsonb,
            'subordinates', '[]'::jsonb
        );
    END IF;
    WITH perms AS (
        SELECT
            jsonb_agg(DISTINCT jsonb_build_object('id', r.id, 'name', r.name)) AS roles,
            identity.jwt_jsonb_deep_merge_agg(r.permissions) AS permissions
        FROM identity.user_roles ur
        JOIN identity.roles r ON ur.role_id = r.id
        WHERE ur.organization_user_id = v_org_user_id
    ),
    locs AS (
        SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', l.id, 'name', l.name)), '[]'::jsonb) AS locations
        FROM (
            SELECT location_id FROM identity.organization_users WHERE id = v_org_user_id AND location_id IS NOT NULL
            UNION
            SELECT t.location_id FROM identity.user_teams ut
            JOIN identity.teams t ON ut.team_id = t.id
            WHERE ut.organization_user_id = v_org_user_id AND t.location_id IS NOT NULL
        ) src
        JOIN identity.locations l ON src.location_id = l.id
    ),
    teams AS (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name)), '[]'::jsonb) AS teams
        FROM identity.user_teams ut
        JOIN identity.teams t ON ut.team_id = t.id
        WHERE ut.organization_user_id = v_org_user_id
    ),
    subs AS (
        SELECT COALESCE(jsonb_agg(ou.user_id), '[]'::jsonb) AS user_ids
        FROM identity.organization_users ou
        WHERE ou.path <@ v_org_user_path
          AND ou.id <> v_org_user_id
          AND ou.organization_id = v_org_id
    )
    SELECT jsonb_build_object(
        'user_id', v_user_id,
        'org_user_id', v_org_user_id,
        'org_id', v_org_id,
        'is_saas_admin', false,
        'roles', COALESCE((SELECT roles FROM perms), '[]'::jsonb),
        'permissions', COALESCE((SELECT permissions FROM perms), '{}'::jsonb),
        'teams', (SELECT teams FROM teams),
        'locations', (SELECT locations FROM locs),
        'subordinates', (SELECT user_ids FROM subs)
    ) INTO v_claims;
    RETURN v_claims;
END;$$;

CREATE FUNCTION identity.zz_jwt_get_user_session_v1(p_org_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
    v_user_id UUID;
    v_target_org_id UUID;
    v_session_data JSONB;
BEGIN
    SELECT id INTO v_user_id FROM identity.users WHERE auth_id = auth.uid();
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    v_target_org_id := COALESCE(p_org_id, 
        (SELECT pref_organization_id FROM identity.users WHERE id = v_user_id)
    );
    SELECT jsonb_build_object(
        'user_id', v_user_id,
        'organization_id', ou.organization_id,
        'org_user_id', ou.id,
        'location_id', ou.location_id,
        'role_names', (
            SELECT COALESCE(array_agg(r.name), ARRAY[]::text[])
            FROM identity.user_roles ur
            JOIN identity.roles r ON ur.role_id = r.id
            WHERE ur.organization_user_id = ou.id
        ),
        'permissions', (
            SELECT COALESCE(array_agg(DISTINCT p.name), ARRAY[]::text[])
            FROM identity.user_roles ur
            JOIN identity.role_permissions rp ON ur.role_id = rp.role_id
            JOIN identity.permissions p ON rp.permission_id = p.id
            WHERE ur.organization_user_id = ou.id
        ),
        'org_name', o.name,
        'is_saas_admin', (o.name = 'zoworks')
    ) INTO v_session_data
    FROM identity.organization_users ou
    JOIN identity.organizations o ON ou.organization_id = o.id
    WHERE ou.user_id = v_user_id
      AND ou.organization_id = v_target_org_id
      AND ou.is_active = true;
    RETURN v_session_data;
END;$$;

CREATE FUNCTION identity.zz_onboard_promote_to_tenant_zz(p_org_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
    v_user_id UUID;
    v_org_user_id UUID;
    v_role_id UUID := extensions.uuid_generate_v4();
    v_location_id UUID := extensions.uuid_generate_v4();
    v_team_id UUID := extensions.uuid_generate_v4();
    v_org_name TEXT;
BEGIN
    IF NOT identity.is_saas_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access Denied. SaaS Admin only.';
    END IF;
    SELECT name INTO v_org_name FROM identity.organizations WHERE id = p_org_id;
    IF v_org_name IS NULL THEN
        RAISE EXCEPTION 'Organization with ID % not found.', p_org_id;
    END IF;
    IF EXISTS (
        SELECT 1 
        FROM identity.organizations o
        JOIN crm.contacts c ON o.claimed_by_contact_id = c.id
        WHERE o.id = p_org_id AND c.status = 'PENDING_VERIFICATION'
    ) THEN
        RAISE EXCEPTION 'Activation Denied. Claiming contact has not verified their identity.';
    END IF;
    SELECT id, user_id INTO v_org_user_id, v_user_id
    FROM identity.organization_users 
    WHERE organization_id = p_org_id
    LIMIT 1;
    IF v_org_user_id IS NULL THEN
        RAISE EXCEPTION 'Promotion Failed: No user found in organization_users for Org %. Please link a user first.', p_org_id;
    END IF;
    UPDATE identity.organizations 
    SET is_active = true, updated_at = now()
    WHERE id = p_org_id;
    INSERT INTO identity.roles (id, organization_id, name, permissions, is_sassadmin, is_active)
    VALUES (v_role_id, p_org_id, 'SuperAdmin', '{"*": true}'::jsonb, false, true)
    ON CONFLICT (organization_id, name) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_role_id;
    INSERT INTO identity.locations (id, organization_id, name, time_zone, is_active, details)
    VALUES (v_location_id, p_org_id, 'Headquarters', 'UTC', true, jsonb_build_object('type', 'OFFICE'))
    ON CONFLICT (organization_id, name) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_location_id;
    INSERT INTO identity.teams (id, organization_id, location_id, name)
    VALUES (v_team_id, p_org_id, v_location_id, 'Leadership Team')
    ON CONFLICT (location_id, name) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_team_id;
    UPDATE identity.organization_users 
    SET is_active = true,
        location_id = v_location_id,
        persona_type = 'admin',
        updated_at = now()
    WHERE id = v_org_user_id;
    INSERT INTO identity.user_teams (organization_user_id, team_id, organization_id)
    VALUES (v_org_user_id, v_team_id, p_org_id)
    ON CONFLICT DO NOTHING;
    INSERT INTO identity.user_roles (organization_user_id, role_id, team_id, organization_id)
    VALUES (v_org_user_id, v_role_id, v_team_id, p_org_id)
    ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object(
        'status', 'promoted',
        'organization_id', p_org_id,
        'superadmin_user_id', v_user_id,
        'org_user_id', v_org_user_id,
        'role_id', v_role_id,
        'location_id', v_location_id,
        'team_id', v_team_id
    );
END;$$;

CREATE FUNCTION identity.zz_onboard_request_zoworks_account(p_org_name text DEFAULT NULL::text, p_account_id uuid DEFAULT NULL::uuid, p_admin_first_name text DEFAULT NULL::text, p_admin_last_name text DEFAULT NULL::text, p_admin_email text DEFAULT NULL::text, p_admin_mobile text DEFAULT NULL::text, p_details jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_account_id UUID := p_account_id;
    v_contact_id UUID;
    v_org_id UUID;
    v_org_name TEXT := p_org_name;
BEGIN
    SET LOCAL search_path = crm, identity, public;
    IF v_account_id IS NOT NULL THEN
        SELECT name INTO v_org_name FROM crm.accounts WHERE id = v_account_id;
        IF v_org_name IS NULL THEN
            RAISE EXCEPTION 'CRM Account % not found', v_account_id;
        END IF;
    ELSE
        SELECT id, name INTO v_account_id, v_org_name FROM crm.accounts WHERE name = p_org_name LIMIT 1;
        IF v_account_id IS NULL THEN
            INSERT INTO crm.accounts (name, details)
            VALUES (p_org_name, p_details)
            RETURNING id INTO v_account_id;
            v_org_name := p_org_name;
        END IF;
    END IF;
    IF p_admin_email IS NOT NULL THEN
        INSERT INTO crm.contacts (account_id, name, email, phone, details)
        VALUES (v_account_id, TRIM(COALESCE(p_admin_first_name, '') || ' ' || COALESCE(p_admin_last_name, '')), p_admin_email, p_admin_mobile, p_details)
        ON CONFLICT (email) DO UPDATE SET
            account_id = EXCLUDED.account_id,
            name = COALESCE(NULLIF(EXCLUDED.name, ' '), crm.contacts.name),
            phone = COALESCE(EXCLUDED.phone, crm.contacts.phone)
        RETURNING id INTO v_contact_id;
    ELSE
        SELECT id INTO v_contact_id FROM crm.contacts WHERE account_id = v_account_id AND is_primary = true LIMIT 1;
        IF v_contact_id IS NULL THEN
            RAISE EXCEPTION 'Admin contact details (email) are required for new requests.';
        END IF;
    END IF;
    INSERT INTO identity.organizations (name, is_active, claimed_by_contact_id, details)
    VALUES (v_org_name, false, v_contact_id, p_details)
    RETURNING id INTO v_org_id;
    RETURN jsonb_build_object(
        'status', 'requested',
        'organization_id', v_org_id,
        'contact_id', v_contact_id,
        'account_id', v_account_id
    );
END;
$$;

CREATE FUNCTION identity.zz_promote_context_to_tenant_v2(p_org_id uuid, p_created_by uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$DECLARE
    v_org RECORD;
    v_hq_location_id UUID;
    v_admin_role_id UUID;
BEGIN
    SELECT id, name, short_code, domain, details
    INTO v_org
    FROM unified.organizations
    WHERE id = p_org_id;
    IF NOT FOUND THEN
        SELECT id, name, short_code, domain, details
        INTO v_org
        FROM crm.accounts
        WHERE id = p_org_id;
    END IF;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source organization/account with ID % not found.', p_org_id;
    END IF;
    IF EXISTS (SELECT 1 FROM identity.organizations WHERE id = p_org_id) THEN
        RAISE NOTICE 'Tenant % already exists. Skipping promotion.', p_org_id;
        RETURN p_org_id;
    END IF;
    INSERT INTO identity.organizations (
        id, name, subdomain, details, app_settings, settings, theme_config, 
        tier, created_by, created_at, updated_at
    ) VALUES (
        v_org.id,
        v_org.name,
        lower(replace(v_org.name, ' ', '-')), -- Generate default subdomain
        COALESCE(v_org.details, '{}'::jsonb),
        '{}'::jsonb, -- Default app_settings
        '{}'::jsonb, -- Default settings
        '{}'::jsonb, -- Default theme_config
        'free', -- Default tier
        p_created_by,
        now(),
        now()
    );
    RAISE NOTICE 'Promoted % to Identity Tenant.', v_org.name;
    INSERT INTO identity.locations (
        id, organization_id, name, short_code, is_active, created_by, created_at
    ) VALUES (
        gen_random_uuid(),
        p_org_id,
        'HQ',
        'HQ',
        true,
        p_created_by,
        now()
    ) RETURNING id INTO v_hq_location_id;
    RAISE NOTICE 'Created HQ Location: %', v_hq_location_id;
    INSERT INTO identity.roles (
        id, organization_id, name, permissions, is_sassadmin, is_active, created_by, created_at
    ) VALUES (
        gen_random_uuid(),
        p_org_id,
        'Admin',
        '{"*": true}'::jsonb, -- Full permissions
        false,
        true,
        p_created_by,
        now()
    ) RETURNING id INTO v_admin_role_id;
    RAISE NOTICE 'Created Admin Role: %', v_admin_role_id;
    RETURN p_org_id;
END;$$;

CREATE FUNCTION identity.zz_promote_to_tenant_v1(p_org_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
    v_user_id UUID;
    v_org_user_id UUID;
    v_role_id UUID := gen_random_uuid();
    v_location_id UUID := gen_random_uuid();
    v_team_id UUID := gen_random_uuid();
BEGIN
    IF NOT identity.is_saas_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access Denied. SaaS Admin only.';
    END IF;
    IF EXISTS (
        SELECT 1 
        FROM identity.organizations o
        JOIN crm.contacts c ON o.claimed_by_contact_id = c.id
        WHERE o.id = p_org_id AND c.status = 'PENDING_VERIFICATION'
    ) THEN
        RAISE EXCEPTION 'Activation Denied. Claiming contact has not verified their identity.';
    END IF;
    UPDATE identity.organizations 
    SET is_active = true 
    WHERE id = p_org_id;
    UPDATE identity.organization_users 
    SET is_active = true 
    WHERE organization_id = p_org_id
    RETURNING id, user_id INTO v_org_user_id, v_user_id;
    INSERT INTO identity.roles (
        id,
        organization_id,
        name,
        is_sassadmin
    ) VALUES (
        v_role_id,
        p_org_id,
        'SuperAdmin',
        false
    );
    INSERT INTO identity.locations (
        id,
        organization_id,
        name
    ) VALUES (
        v_location_id,
        p_org_id,
        'Headquarters'
    );
    INSERT INTO identity.teams (
        id,
        organization_id,
        location_id,
        name
    ) VALUES (
        v_team_id,
        p_org_id,
        v_location_id,
        'Leadership Team'
    );
    INSERT INTO identity.user_teams (
        organization_user_id,
        organization_id,
        team_id
    ) VALUES (
        v_org_user_id,
        p_org_id,
        v_team_id
    );
    INSERT INTO identity.user_roles (
        organization_user_id,
        role_id,
        organization_id,
        team_id
    ) VALUES (
        v_org_user_id,
        v_role_id,
        p_org_id,
        v_team_id
    );
    RETURN jsonb_build_object(
        'status', 'promoted',
        'organization_id', p_org_id,
        'superadmin_user_id', v_user_id,
        'role_id', v_role_id,
        'location_id', v_location_id,
        'team_id', v_team_id
    );
END;$$;

CREATE FUNCTION identity.zz_promote_to_tenant_v2(p_org_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
    v_user_id UUID;
    v_org_user_id UUID;
    v_role_id UUID := gen_random_uuid();
    v_location_id UUID := gen_random_uuid();
    v_team_id UUID := gen_random_uuid();
BEGIN
    IF NOT identity.is_saas_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access Denied. SaaS Admin only.';
    END IF;
    IF EXISTS (
        SELECT 1 
        FROM identity.organizations o
        JOIN crm.contacts c ON o.claimed_by_contact_id = c.id
        WHERE o.id = p_org_id AND c.status = 'PENDING_VERIFICATION'
    ) THEN
        RAISE EXCEPTION 'Activation Denied. Claiming contact has not verified their identity.';
    END IF;
    SELECT id, user_id 
    INTO v_org_user_id, v_user_id
    FROM identity.organization_users 
    WHERE organization_id = p_org_id
    LIMIT 1;
    IF v_org_user_id IS NULL THEN
        RAISE EXCEPTION 'Promotion Failed: No user found in organization_users for ID %', p_org_id;
    END IF;
    UPDATE identity.organizations 
    SET is_active = true 
    WHERE id = p_org_id;
    UPDATE identity.organization_users 
    SET is_active = true 
    WHERE id = v_org_user_id;
    INSERT INTO identity.roles (
        id,
        organization_id,
        name,
        is_sassadmin
    ) VALUES (
        v_role_id,
        p_org_id,
        'SuperAdmin',
        false
    );
    INSERT INTO identity.locations (
        id,
        organization_id,
        name
    ) VALUES (
        v_location_id,
        p_org_id,
        'Headquarters'
    );
    INSERT INTO identity.teams (
        id,
        organization_id,
        location_id,
        name
    ) VALUES (
        v_team_id,
        p_org_id,
        v_location_id,
        'Leadership Team'
    );
    INSERT INTO identity.user_teams (
        organization_user_id,
        organization_id,
        team_id
    ) VALUES (
        v_org_user_id,
        p_org_id,
        v_team_id
    );
    INSERT INTO identity.user_roles (
        organization_user_id,
        role_id,
        organization_id,
        team_id
    ) VALUES (
        v_org_user_id,
        v_role_id,
        p_org_id,
        v_team_id
    );
    RETURN jsonb_build_object(
        'status', 'promoted',
        'organization_id', p_org_id,
        'superadmin_user_id', v_user_id,
        'organization_user_id', v_org_user_id,
        'role_id', v_role_id,
        'location_id', v_location_id,
        'team_id', v_team_id
    );
END;$$;

CREATE FUNCTION identity.zz_update_organization_user_path_v3() RETURNS trigger
    LANGUAGE plpgsql
    AS $$DECLARE
    v_parent_path extensions.ltree;
    v_new_node text;
BEGIN
    v_new_node := replace(NEW.id::text, '-', '_');
    IF NEW.manager_id IS NULL THEN
        NEW.path := v_new_node::extensions.ltree;
    ELSE
        SELECT path INTO v_parent_path
        FROM identity.organization_users
        WHERE id = NEW.manager_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Manager with id=% not found', NEW.manager_id;
        END IF;
        IF v_parent_path IS NULL THEN
            UPDATE identity.organization_users 
            SET path = replace(id::text, '-', '_')::extensions.ltree 
            WHERE id = NEW.manager_id;
            SELECT path INTO v_parent_path FROM identity.organization_users WHERE id = NEW.manager_id;
        END IF;
        NEW.path := v_parent_path || v_new_node::extensions.ltree;
    END IF;
    RETURN NEW;
END;$$;

CREATE VIEW identity.v_location_types WITH (security_invoker='on') AS
 SELECT created_at,
    created_by,
    created_by_display,
    id,
    level,
    name,
    organization_id,
    organization_display,
    search_vector,
    updated_at,
    updated_by
   FROM ( SELECT base.created_at,
            base.created_by,
            fk_created_by.name AS created_by_display,
            base.id,
            base.level,
            base.name,
            base.organization_id,
            fk_organization.name AS organization_display,
            base.search_vector,
            base.updated_at,
            base.updated_by
           FROM ((identity.location_types base
             LEFT JOIN identity.users fk_created_by ON ((base.created_by = fk_created_by.id)))
             LEFT JOIN identity.organizations fk_organization ON ((base.organization_id = fk_organization.id)))) base_query;

CREATE VIEW identity.v_locations WITH (security_invoker='on') AS
 SELECT app_settings,
    "app_settings__emailOverrides__email",
    "app_settings__emailOverrides__fromName",
    app_settings__support__email__email,
    "app_settings__support__email__fromName",
    "app_settings__support__whatsapp__accessTokenEncrypted",
    "app_settings__support__whatsapp__displayPhoneNumber",
    "app_settings__support__whatsapp__phoneNumberId",
    "app_settings__support__whatsapp__wabaId",
    "app_settings__whatsappOverrides__accessTokenEncrypted",
    "app_settings__whatsappOverrides__displayPhoneNumber",
    "app_settings__whatsappOverrides__phoneNumberId",
    "app_settings__whatsappOverrides__wabaId",
    created_at,
    created_by,
    created_by_display,
    custom,
    custom__ai_overrides__email,
    "custom__ai_overrides__emailOverrides__email",
    "custom__ai_overrides__emailOverrides__fromAddress",
    "custom__ai_overrides__emailOverrides__fromName",
    "custom__ai_overrides__whatsappOverrides__accessTokenEncrypted",
    "custom__ai_overrides__whatsappOverrides__displayPhoneNumber",
    "custom__ai_overrides__whatsappOverrides__phoneNumberId",
    "custom__ai_overrides__whatsappOverrides__wabaId",
    deleted_at,
    details,
    display_id,
    entity_schema,
    entity_type,
    id,
    is_active,
    location_type_id,
    location_type_display,
    module,
    name,
    object_subtype,
    object_type,
    organization_id,
    organization_display,
    parent_id,
    parent_display,
    path,
    search_vector,
    service_area,
    settings,
    short_code,
    time_zone,
    updated_at,
    updated_by,
    updated_by_display,
    urn,
    vertical,
    working_hours
   FROM ( SELECT base.app_settings,
            (base.app_settings #>> '{emailOverrides,email}'::text[]) AS "app_settings__emailOverrides__email",
            (base.app_settings #>> '{emailOverrides,fromName}'::text[]) AS "app_settings__emailOverrides__fromName",
            (base.app_settings #>> '{support,email,email}'::text[]) AS app_settings__support__email__email,
            (base.app_settings #>> '{support,email,fromName}'::text[]) AS "app_settings__support__email__fromName",
            (base.app_settings #>> '{support,whatsapp,accessTokenEncrypted}'::text[]) AS "app_settings__support__whatsapp__accessTokenEncrypted",
            (base.app_settings #>> '{support,whatsapp,displayPhoneNumber}'::text[]) AS "app_settings__support__whatsapp__displayPhoneNumber",
            (base.app_settings #>> '{support,whatsapp,phoneNumberId}'::text[]) AS "app_settings__support__whatsapp__phoneNumberId",
            (base.app_settings #>> '{support,whatsapp,wabaId}'::text[]) AS "app_settings__support__whatsapp__wabaId",
            (base.app_settings #>> '{whatsappOverrides,accessTokenEncrypted}'::text[]) AS "app_settings__whatsappOverrides__accessTokenEncrypted",
            (base.app_settings #>> '{whatsappOverrides,displayPhoneNumber}'::text[]) AS "app_settings__whatsappOverrides__displayPhoneNumber",
            (base.app_settings #>> '{whatsappOverrides,phoneNumberId}'::text[]) AS "app_settings__whatsappOverrides__phoneNumberId",
            (base.app_settings #>> '{whatsappOverrides,wabaId}'::text[]) AS "app_settings__whatsappOverrides__wabaId",
            base.created_at,
            base.created_by,
            fk_created_by.name AS created_by_display,
            base.custom,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.custom #> '{ai_overrides,email}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS custom__ai_overrides__email,
            (base.custom #>> '{ai_overrides,emailOverrides,email}'::text[]) AS "custom__ai_overrides__emailOverrides__email",
            (base.custom #>> '{ai_overrides,emailOverrides,fromAddress}'::text[]) AS "custom__ai_overrides__emailOverrides__fromAddress",
            (base.custom #>> '{ai_overrides,emailOverrides,fromName}'::text[]) AS "custom__ai_overrides__emailOverrides__fromName",
            (base.custom #>> '{ai_overrides,whatsappOverrides,accessTokenEncrypted}'::text[]) AS "custom__ai_overrides__whatsappOverrides__accessTokenEncrypted",
            (base.custom #>> '{ai_overrides,whatsappOverrides,displayPhoneNumber}'::text[]) AS "custom__ai_overrides__whatsappOverrides__displayPhoneNumber",
            (base.custom #>> '{ai_overrides,whatsappOverrides,phoneNumberId}'::text[]) AS "custom__ai_overrides__whatsappOverrides__phoneNumberId",
            (base.custom #>> '{ai_overrides,whatsappOverrides,wabaId}'::text[]) AS "custom__ai_overrides__whatsappOverrides__wabaId",
            base.deleted_at,
            base.details,
            ext1.display_id,
            ext1.entity_schema,
            ext1.entity_type,
            base.id,
            base.is_active,
            base.location_type_id,
            fk_location_type.name AS location_type_display,
            ext1.module,
            ext1.name,
            ext1.object_subtype,
            ext1.object_type,
            base.organization_id,
            fk_organization.name AS organization_display,
            base.parent_id,
            fk_parent.name AS parent_display,
            base.path,
            base.search_vector,
            base.service_area,
            base.settings,
            base.short_code,
            base.time_zone,
            base.updated_at,
            base.updated_by,
            fk_updated_by.name AS updated_by_display,
            ext1.urn,
            base.vertical,
            base.working_hours
           FROM ((((((identity.locations base
             JOIN core.unified_objects ext1 ON ((ext1.id = base.id)))
             LEFT JOIN identity.users fk_created_by ON ((base.created_by = fk_created_by.id)))
             LEFT JOIN identity.location_types fk_location_type ON ((base.location_type_id = fk_location_type.id)))
             LEFT JOIN identity.organizations fk_organization ON ((base.organization_id = fk_organization.id)))
             LEFT JOIN identity.locations fk_parent ON ((base.parent_id = fk_parent.id)))
             LEFT JOIN identity.users fk_updated_by ON ((base.updated_by = fk_updated_by.id)))) base_query;

CREATE VIEW identity.v_modules AS
 SELECT created_at,
    created_by,
    description,
    id,
    is_active,
    name,
    notes,
    organization_id,
    organization_display,
    prefix,
    search_vector,
    settings,
    settings__ai_enabled,
    settings__data_partition,
    settings__default_agents,
    settings__expense__approval_required,
    settings__expense__categories,
    settings__expense__currency,
    settings__expense__max_limit_per_day,
    settings__expense__receipt_required,
    settings__expense_policy__approval_required,
    settings__expense_policy__categories,
    settings__expense_policy__currency,
    settings__expense_policy__max_limit_per_day,
    settings__expense_policy__receipt_required,
    settings__h,
    settings__inventory_management__auto_reorder,
    settings__inventory_management__stock_thresholds__low_stock,
    settings__inventory_management__stock_thresholds__reorder_point,
    settings__leaves__annual_leave,
    settings__leaves__approval_levels,
    settings__leaves__carry_forward,
    settings__leaves__casual_leave,
    settings__leaves__default_approval,
    settings__leaves__encashment_enabled,
    settings__leaves__leave_half_day_enabled,
    settings__leaves__max_carry_forward_days,
    settings__leaves__schema,
    settings__leaves__sick_leave,
    settings__leaves_policy__annual_leave,
    settings__leaves_policy__approval_levels,
    settings__leaves_policy__carry_forward,
    settings__leaves_policy__casual_leave,
    settings__leaves_policy__default_approval,
    settings__leaves_policy__encashment_enabled,
    settings__leaves_policy__leave_half_day_enabled,
    settings__leaves_policy__max_carry_forward_days,
    settings__leaves_policy__sick_leave,
    settings__public__expense__approval_required,
    settings__public__expense__categories,
    settings__public__expense__currency,
    settings__public__expense__max_limit_per_day,
    settings__public__expense__receipt_required,
    settings__public__leaves__annual_leave,
    settings__public__leaves__approval_levels,
    settings__public__leaves__carry_forward,
    settings__public__leaves__casual_leave,
    settings__public__leaves__default_approval,
    settings__public__leaves__encashment_enabled,
    settings__public__leaves__leave_half_day_enabled,
    settings__public__leaves__max_carry_forward_days,
    settings__public__leaves__sick_leave,
    settings__stock_thresholds__low_stock,
    settings__stock_thresholds__reorder_point,
    sub_modules,
    sub_modules__accounts,
    sub_modules__accounts__description,
    sub_modules__accounts__enabled,
    sub_modules__activities,
    sub_modules__agents,
    sub_modules__ai,
    sub_modules__analytics,
    sub_modules__barcode_scanning,
    sub_modules__businesses,
    sub_modules__catalog,
    "sub_modules__client-contacts",
    sub_modules__clients,
    sub_modules__config,
    sub_modules__contacts,
    sub_modules__contracts,
    "sub_modules__crud-view",
    sub_modules__customer_segments,
    sub_modules__cycle_counting,
    sub_modules__dashboards__description,
    sub_modules__dashboards__enabled,
    sub_modules__data,
    sub_modules__deals,
    "sub_modules__eventPass",
    sub_modules__expenses,
    sub_modules__insights__description,
    sub_modules__insights__enabled,
    sub_modules__inventory_reports,
    sub_modules__inventory_transactions,
    sub_modules__inventory_valuation,
    sub_modules__invoices,
    sub_modules__item_category,
    sub_modules__item_master,
    sub_modules__leads,
    sub_modules__leaves,
    sub_modules__location_types,
    "sub_modules__location-categories",
    sub_modules__locations,
    sub_modules__login,
    sub_modules__logistics__description,
    sub_modules__logistics__enabled,
    sub_modules__members,
    sub_modules__memories,
    sub_modules__modules,
    "sub_modules__my-tickets",
    sub_modules__networking,
    sub_modules__nlp,
    sub_modules__notifications,
    sub_modules__onboarding__description,
    sub_modules__onboarding__enabled,
    sub_modules__org_module_configs,
    sub_modules__organization_users,
    sub_modules__organizations,
    sub_modules__permissions,
    sub_modules__process,
    sub_modules__profile,
    sub_modules__projects,
    sub_modules__prompts,
    sub_modules__prospects,
    sub_modules__quotes,
    sub_modules__replenishment,
    sub_modules__reports__description,
    sub_modules__reports__enabled,
    sub_modules__returns_handling,
    sub_modules__risk__description,
    sub_modules__risk__enabled,
    sub_modules__roles,
    sub_modules__run_traces,
    sub_modules__sales__description,
    sub_modules__sales__enabled,
    sub_modules__scheduling__description,
    sub_modules__scheduling__enabled,
    sub_modules__screening__description,
    sub_modules__screening__enabled,
    sub_modules__service_assets,
    sub_modules__service_catalog,
    sub_modules__service_reports,
    sub_modules__service_requests,
    "sub_modules__service-assets",
    "sub_modules__service-categories",
    "sub_modules__service-contracts",
    "sub_modules__service-invoices",
    "sub_modules__service-offerings",
    "sub_modules__service-reports",
    "sub_modules__service-types",
    sub_modules__settings,
    sub_modules__settlement__description,
    sub_modules__settlement__enabled,
    sub_modules__shopping,
    sub_modules__signup,
    sub_modules__sourcing__description,
    sub_modules__sourcing__enabled,
    sub_modules__stock_management,
    sub_modules__stock_transfers,
    sub_modules__subscriptions,
    sub_modules__support__description,
    sub_modules__support__enabled,
    sub_modules__tasks,
    sub_modules__teams,
    sub_modules__test__enabled,
    sub_modules__test__entity_schema,
    sub_modules__test__entity_type,
    sub_modules__tickets,
    sub_modules__timesheets,
    sub_modules__tools,
    sub_modules__tracking,
    sub_modules__trading__description,
    sub_modules__trading__enabled,
    sub_modules__user_roles,
    sub_modules__user_teams,
    "sub_modules__user-setting",
    "sub_modules__user-settings",
    sub_modules__users,
    "sub_modules__users-view",
    sub_modules__vector_docs,
    sub_modules__vendors,
    sub_modules__warehousing,
    sub_modules__workflows,
    updated_at,
    updated_by
   FROM ( SELECT base.created_at,
            base.created_by,
            base.description,
            base.id,
            base.is_active,
            base.name,
            base.notes,
            base.organization_id,
            fk_organization.name AS organization_display,
            base.prefix,
            base.search_vector,
            base.settings,
            base.settings__ai_enabled,
            base.settings__data_partition,
            base.settings__default_agents,
            base.settings__expense__approval_required,
            base.settings__expense__categories,
            base.settings__expense__currency,
            base.settings__expense__max_limit_per_day,
            base.settings__expense__receipt_required,
            base.settings__expense_policy__approval_required,
            base.settings__expense_policy__categories,
            base.settings__expense_policy__currency,
            base.settings__expense_policy__max_limit_per_day,
            base.settings__expense_policy__receipt_required,
            base.settings__h,
            base.settings__inventory_management__auto_reorder,
            ((base.settings #>> '{inventory_management,stock_thresholds,low_stock}'::text[]))::integer AS settings__inventory_management__stock_thresholds__low_stock,
            ((base.settings #>> '{inventory_management,stock_thresholds,reorder_point}'::text[]))::integer AS settings__inventory_management__stock_thresholds__reorder_point,
            base.settings__leaves__annual_leave,
            base.settings__leaves__approval_levels,
            base.settings__leaves__carry_forward,
            base.settings__leaves__casual_leave,
            base.settings__leaves__default_approval,
            base.settings__leaves__encashment_enabled,
            base.settings__leaves__leave_half_day_enabled,
            base.settings__leaves__max_carry_forward_days,
            base.settings__leaves__schema,
            base.settings__leaves__sick_leave,
            base.settings__leaves_policy__annual_leave,
            base.settings__leaves_policy__approval_levels,
            base.settings__leaves_policy__carry_forward,
            base.settings__leaves_policy__casual_leave,
            base.settings__leaves_policy__default_approval,
            base.settings__leaves_policy__encashment_enabled,
            base.settings__leaves_policy__leave_half_day_enabled,
            base.settings__leaves_policy__max_carry_forward_days,
            base.settings__leaves_policy__sick_leave,
            ((base.settings #>> '{public,expense,approval_required}'::text[]))::boolean AS settings__public__expense__approval_required,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.settings #> '{public,expense,categories}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS settings__public__expense__categories,
            (base.settings #>> '{public,expense,currency}'::text[]) AS settings__public__expense__currency,
            ((base.settings #>> '{public,expense,max_limit_per_day}'::text[]))::integer AS settings__public__expense__max_limit_per_day,
            ((base.settings #>> '{public,expense,receipt_required}'::text[]))::boolean AS settings__public__expense__receipt_required,
            ((base.settings #>> '{public,leaves,annual_leave}'::text[]))::integer AS settings__public__leaves__annual_leave,
            ((base.settings #>> '{public,leaves,approval_levels}'::text[]))::integer AS settings__public__leaves__approval_levels,
            ((base.settings #>> '{public,leaves,carry_forward}'::text[]))::boolean AS settings__public__leaves__carry_forward,
            ((base.settings #>> '{public,leaves,casual_leave}'::text[]))::integer AS settings__public__leaves__casual_leave,
            (base.settings #>> '{public,leaves,default_approval}'::text[]) AS settings__public__leaves__default_approval,
            ((base.settings #>> '{public,leaves,encashment_enabled}'::text[]))::boolean AS settings__public__leaves__encashment_enabled,
            ((base.settings #>> '{public,leaves,leave_half_day_enabled}'::text[]))::boolean AS settings__public__leaves__leave_half_day_enabled,
            ((base.settings #>> '{public,leaves,max_carry_forward_days}'::text[]))::integer AS settings__public__leaves__max_carry_forward_days,
            ((base.settings #>> '{public,leaves,sick_leave}'::text[]))::integer AS settings__public__leaves__sick_leave,
            base.settings__stock_thresholds__low_stock,
            base.settings__stock_thresholds__reorder_point,
            base.sub_modules,
            ((base.sub_modules #>> '{accounts}'::text[]))::boolean AS sub_modules__accounts,
            base.sub_modules__accounts__description,
            base.sub_modules__accounts__enabled,
            base.sub_modules__activities,
            ((base.sub_modules #>> '{agents}'::text[]))::boolean AS sub_modules__agents,
            base.sub_modules__ai,
            base.sub_modules__analytics,
            base.sub_modules__barcode_scanning,
            base.sub_modules__businesses,
            base.sub_modules__catalog,
            base."sub_modules__client-contacts",
            base.sub_modules__clients,
            base.sub_modules__config,
            ((base.sub_modules #>> '{contacts}'::text[]))::boolean AS sub_modules__contacts,
            ((base.sub_modules #>> '{contracts}'::text[]))::boolean AS sub_modules__contracts,
            base."sub_modules__crud-view",
            ((base.sub_modules #>> '{customer_segments}'::text[]))::boolean AS sub_modules__customer_segments,
            base.sub_modules__cycle_counting,
            base.sub_modules__dashboards__description,
            base.sub_modules__dashboards__enabled,
            base.sub_modules__data,
            ((base.sub_modules #>> '{deals}'::text[]))::boolean AS sub_modules__deals,
            base."sub_modules__eventPass",
            base.sub_modules__expenses,
            base.sub_modules__insights__description,
            base.sub_modules__insights__enabled,
            base.sub_modules__inventory_reports,
            base.sub_modules__inventory_transactions,
            base.sub_modules__inventory_valuation,
            base.sub_modules__invoices,
            base.sub_modules__item_category,
            base.sub_modules__item_master,
            ((base.sub_modules #>> '{leads}'::text[]))::boolean AS sub_modules__leads,
            base.sub_modules__leaves,
            ((base.sub_modules #>> '{location_types}'::text[]))::boolean AS sub_modules__location_types,
            base."sub_modules__location-categories",
            ((base.sub_modules #>> '{locations}'::text[]))::boolean AS sub_modules__locations,
            base.sub_modules__login,
            base.sub_modules__logistics__description,
            base.sub_modules__logistics__enabled,
            base.sub_modules__members,
            ((base.sub_modules #>> '{memories}'::text[]))::boolean AS sub_modules__memories,
            ((base.sub_modules #>> '{modules}'::text[]))::boolean AS sub_modules__modules,
            base."sub_modules__my-tickets",
            base.sub_modules__networking,
            base.sub_modules__nlp,
            base.sub_modules__notifications,
            base.sub_modules__onboarding__description,
            base.sub_modules__onboarding__enabled,
            ((base.sub_modules #>> '{org_module_configs}'::text[]))::boolean AS sub_modules__org_module_configs,
            ((base.sub_modules #>> '{organization_users}'::text[]))::boolean AS sub_modules__organization_users,
            base.sub_modules__organizations,
            base.sub_modules__permissions,
            base.sub_modules__process,
            base.sub_modules__profile,
            base.sub_modules__projects,
            ((base.sub_modules #>> '{prompts}'::text[]))::boolean AS sub_modules__prompts,
            ((base.sub_modules #>> '{prospects}'::text[]))::boolean AS sub_modules__prospects,
            ((base.sub_modules #>> '{quotes}'::text[]))::boolean AS sub_modules__quotes,
            base.sub_modules__replenishment,
            base.sub_modules__reports__description,
            base.sub_modules__reports__enabled,
            base.sub_modules__returns_handling,
            base.sub_modules__risk__description,
            base.sub_modules__risk__enabled,
            ((base.sub_modules #>> '{roles}'::text[]))::boolean AS sub_modules__roles,
            ((base.sub_modules #>> '{run_traces}'::text[]))::boolean AS sub_modules__run_traces,
            base.sub_modules__sales__description,
            base.sub_modules__sales__enabled,
            base.sub_modules__scheduling__description,
            base.sub_modules__scheduling__enabled,
            base.sub_modules__screening__description,
            base.sub_modules__screening__enabled,
            ((base.sub_modules #>> '{service_assets}'::text[]))::boolean AS sub_modules__service_assets,
            ((base.sub_modules #>> '{service_catalog}'::text[]))::boolean AS sub_modules__service_catalog,
            ((base.sub_modules #>> '{service_reports}'::text[]))::boolean AS sub_modules__service_reports,
            ((base.sub_modules #>> '{service_requests}'::text[]))::boolean AS sub_modules__service_requests,
            base."sub_modules__service-assets",
            base."sub_modules__service-categories",
            base."sub_modules__service-contracts",
            base."sub_modules__service-invoices",
            base."sub_modules__service-offerings",
            base."sub_modules__service-reports",
            base."sub_modules__service-types",
            base.sub_modules__settings,
            base.sub_modules__settlement__description,
            base.sub_modules__settlement__enabled,
            base.sub_modules__shopping,
            base.sub_modules__signup,
            base.sub_modules__sourcing__description,
            base.sub_modules__sourcing__enabled,
            base.sub_modules__stock_management,
            base.sub_modules__stock_transfers,
            base.sub_modules__subscriptions,
            base.sub_modules__support__description,
            base.sub_modules__support__enabled,
            base.sub_modules__tasks,
            base.sub_modules__teams,
            base.sub_modules__test__enabled,
            base.sub_modules__test__entity_schema,
            base.sub_modules__test__entity_type,
            base.sub_modules__tickets,
            base.sub_modules__timesheets,
            ((base.sub_modules #>> '{tools}'::text[]))::boolean AS sub_modules__tools,
            base.sub_modules__tracking,
            base.sub_modules__trading__description,
            base.sub_modules__trading__enabled,
            ((base.sub_modules #>> '{user_roles}'::text[]))::boolean AS sub_modules__user_roles,
            ((base.sub_modules #>> '{user_teams}'::text[]))::boolean AS sub_modules__user_teams,
            base."sub_modules__user-setting",
            base."sub_modules__user-settings",
            base.sub_modules__users,
            base."sub_modules__users-view",
            ((base.sub_modules #>> '{vector_docs}'::text[]))::boolean AS sub_modules__vector_docs,
            ((base.sub_modules #>> '{vendors}'::text[]))::boolean AS sub_modules__vendors,
            base.sub_modules__warehousing,
            base.sub_modules__workflows,
            base.updated_at,
            base.updated_by
           FROM (identity.modules base
             LEFT JOIN identity.organizations fk_organization ON ((base.organization_id = fk_organization.id)))) base_query;

CREATE VIEW identity.v_org_module_configs AS
 SELECT created_at,
    created_by,
    id,
    location_id,
    location_display,
    module_id,
    module_display,
    organization_id,
    organization_display,
    scope_level,
    search_vector,
    settings,
    settings__ai_enabled,
    settings__data_partition,
    settings__default_agents,
    settings__expense__approval_required,
    settings__expense__categories,
    settings__expense__currency,
    settings__expense__max_limit_per_day,
    settings__expense__receipt_required,
    settings__expense_policy__approval_required,
    settings__expense_policy__categories,
    settings__expense_policy__currency,
    settings__expense_policy__max_limit_per_day,
    settings__expense_policy__receipt_required,
    settings__h,
    settings__inventory_management__auto_reorder,
    settings__inventory_management__stock_thresholds__low_stock,
    settings__inventory_management__stock_thresholds__reorder_point,
    settings__leave_policies__name,
    settings__leaves__annual_leave,
    settings__leaves__approval_levels,
    settings__leaves__carry_forward,
    settings__leaves__casual_leave,
    settings__leaves__default_approval,
    settings__leaves__encashment_enabled,
    settings__leaves__leave_half_day_enabled,
    settings__leaves__max_carry_forward_days,
    settings__leaves__schema,
    settings__leaves__sick_leave,
    settings__leaves_policy__annual_leave,
    settings__leaves_policy__approval_levels,
    settings__leaves_policy__carry_forward,
    settings__leaves_policy__casual_leave,
    settings__leaves_policy__default_approval,
    settings__leaves_policy__encashment_enabled,
    settings__leaves_policy__leave_half_day_enabled,
    settings__leaves_policy__max_carry_forward_days,
    settings__leaves_policy__sick_leave,
    sub_modules,
    "sub_modules__location-categories",
    sub_modules__process,
    "sub_modules__service-categories",
    "sub_modules__service-offerings",
    "sub_modules__service-types",
    sub_modules__settings,
    sub_modules__subscriptions,
    sub_modules__users,
    updated_at,
    updated_by
   FROM ( SELECT base.created_at,
            base.created_by,
            base.id,
            base.location_id,
            fk_location.name AS location_display,
            base.module_id,
            fk_module.name AS module_display,
            base.organization_id,
            fk_organization.name AS organization_display,
            base.scope_level,
            base.search_vector,
            base.settings,
            ((base.settings #>> '{ai_enabled}'::text[]))::boolean AS settings__ai_enabled,
            (base.settings #>> '{data_partition}'::text[]) AS settings__data_partition,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.settings #> '{default_agents}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS settings__default_agents,
            ((base.settings #>> '{expense,approval_required}'::text[]))::boolean AS settings__expense__approval_required,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.settings #> '{expense,categories}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS settings__expense__categories,
            (base.settings #>> '{expense,currency}'::text[]) AS settings__expense__currency,
            ((base.settings #>> '{expense,max_limit_per_day}'::text[]))::integer AS settings__expense__max_limit_per_day,
            ((base.settings #>> '{expense,receipt_required}'::text[]))::boolean AS settings__expense__receipt_required,
            ((base.settings #>> '{expense_policy,approval_required}'::text[]))::boolean AS settings__expense_policy__approval_required,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.settings #> '{expense_policy,categories}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS settings__expense_policy__categories,
            (base.settings #>> '{expense_policy,currency}'::text[]) AS settings__expense_policy__currency,
            ((base.settings #>> '{expense_policy,max_limit_per_day}'::text[]))::integer AS settings__expense_policy__max_limit_per_day,
            ((base.settings #>> '{expense_policy,receipt_required}'::text[]))::boolean AS settings__expense_policy__receipt_required,
            (base.settings #>> '{h}'::text[]) AS settings__h,
            ((base.settings #>> '{inventory_management,auto_reorder}'::text[]))::boolean AS settings__inventory_management__auto_reorder,
            ((base.settings #>> '{inventory_management,stock_thresholds,low_stock}'::text[]))::integer AS settings__inventory_management__stock_thresholds__low_stock,
            ((base.settings #>> '{inventory_management,stock_thresholds,reorder_point}'::text[]))::integer AS settings__inventory_management__stock_thresholds__reorder_point,
            base.settings__leave_policies__name,
            ((base.settings #>> '{leaves,annual_leave}'::text[]))::integer AS settings__leaves__annual_leave,
            ((base.settings #>> '{leaves,approval_levels}'::text[]))::integer AS settings__leaves__approval_levels,
            ((base.settings #>> '{leaves,carry_forward}'::text[]))::boolean AS settings__leaves__carry_forward,
            ((base.settings #>> '{leaves,casual_leave}'::text[]))::integer AS settings__leaves__casual_leave,
            (base.settings #>> '{leaves,default_approval}'::text[]) AS settings__leaves__default_approval,
            ((base.settings #>> '{leaves,encashment_enabled}'::text[]))::boolean AS settings__leaves__encashment_enabled,
            ((base.settings #>> '{leaves,leave_half_day_enabled}'::text[]))::boolean AS settings__leaves__leave_half_day_enabled,
            ((base.settings #>> '{leaves,max_carry_forward_days}'::text[]))::integer AS settings__leaves__max_carry_forward_days,
            (base.settings #>> '{leaves,schema}'::text[]) AS settings__leaves__schema,
            ((base.settings #>> '{leaves,sick_leave}'::text[]))::integer AS settings__leaves__sick_leave,
            ((base.settings #>> '{leaves_policy,annual_leave}'::text[]))::integer AS settings__leaves_policy__annual_leave,
            ((base.settings #>> '{leaves_policy,approval_levels}'::text[]))::integer AS settings__leaves_policy__approval_levels,
            ((base.settings #>> '{leaves_policy,carry_forward}'::text[]))::boolean AS settings__leaves_policy__carry_forward,
            ((base.settings #>> '{leaves_policy,casual_leave}'::text[]))::integer AS settings__leaves_policy__casual_leave,
            (base.settings #>> '{leaves_policy,default_approval}'::text[]) AS settings__leaves_policy__default_approval,
            ((base.settings #>> '{leaves_policy,encashment_enabled}'::text[]))::boolean AS settings__leaves_policy__encashment_enabled,
            ((base.settings #>> '{leaves_policy,leave_half_day_enabled}'::text[]))::boolean AS settings__leaves_policy__leave_half_day_enabled,
            ((base.settings #>> '{leaves_policy,max_carry_forward_days}'::text[]))::integer AS settings__leaves_policy__max_carry_forward_days,
            ((base.settings #>> '{leaves_policy,sick_leave}'::text[]))::integer AS settings__leaves_policy__sick_leave,
            base.sub_modules,
            ((base.sub_modules #>> '{location-categories}'::text[]))::boolean AS "sub_modules__location-categories",
            ((base.sub_modules #>> '{process}'::text[]))::boolean AS sub_modules__process,
            ((base.sub_modules #>> '{service-categories}'::text[]))::boolean AS "sub_modules__service-categories",
            ((base.sub_modules #>> '{service-offerings}'::text[]))::boolean AS "sub_modules__service-offerings",
            ((base.sub_modules #>> '{service-types}'::text[]))::boolean AS "sub_modules__service-types",
            ((base.sub_modules #>> '{settings}'::text[]))::boolean AS sub_modules__settings,
            ((base.sub_modules #>> '{subscriptions}'::text[]))::boolean AS sub_modules__subscriptions,
            ((base.sub_modules #>> '{users}'::text[]))::boolean AS sub_modules__users,
            base.updated_at,
            base.updated_by
           FROM (((identity.org_module_configs base
             LEFT JOIN identity.locations fk_location ON ((base.location_id = fk_location.id)))
             LEFT JOIN identity.modules fk_module ON ((base.module_id = fk_module.id)))
             LEFT JOIN identity.organizations fk_organization ON ((base.organization_id = fk_organization.id)))) base_query;

CREATE VIEW identity.v_organization_users WITH (security_invoker='on') AS
 SELECT available_from,
    available_until,
    bank_details_jsonb,
    base_salary,
    billing_rate_daily,
    billing_rate_hourly,
    certifications,
    contact_type,
    cost_center,
    created_at,
    created_by,
    created_by_display,
    currency,
    deleted_at,
    department,
    details,
    details__onboarding_status,
    details__person__name__family,
    details__person__name__given,
    details__title,
    display_id,
    email,
    employment_status,
    employment_type,
    entity_schema,
    entity_type,
    first_name,
    hire_date,
    id,
    intent_category,
    intent_type,
    is_active,
    is_field_staff,
    is_trackable,
    job_title,
    last_name,
    last_synced_at,
    lifecycle_stage,
    location_id,
    location_display,
    manager_id,
    manager_display,
    module,
    name,
    object_subtype,
    object_type,
    organization_id,
    organization_display,
    organization_user_id,
    organization_user_display,
    path,
    payment_frequency,
    persona_type,
    phone,
    preferred_work_hours,
    priority,
    raci,
    role_status,
    search_vector,
    skills,
    stage_id,
    state_category,
    status,
    tax_id_encrypted,
    termination_date,
    unavailable_periods,
    updated_at,
    updated_by,
    updated_by_display,
    urn,
    user_id,
    user_display,
    vertical,
    vertical_payload,
    work_schedule,
    work_schedule__timezone,
    "work_schedule__weeklyHours"
   FROM ( SELECT ext4.available_from,
            ext4.available_until,
            ext2.bank_details_jsonb,
            ext2.base_salary,
            ext4.billing_rate_daily,
            ext4.billing_rate_hourly,
            ext4.certifications,
            ext4.contact_type,
            ext3.cost_center,
            base.created_at,
            base.created_by,
            fk_created_by.name AS created_by_display,
            ext2.currency,
            base.deleted_at,
            ext3.department,
            ext4.details,
            (ext4.details #>> '{onboarding_status}'::text[]) AS details__onboarding_status,
            (ext4.details #>> '{family,name,person}'::text[]) AS details__person__name__family,
            (ext4.details #>> '{given,name,person}'::text[]) AS details__person__name__given,
            (ext4.details #>> '{title}'::text[]) AS details__title,
            ext4.display_id,
            ext4.email,
            ext3.employment_status,
            ext3.employment_type,
            ext1.entity_schema,
            ext1.entity_type,
            ext4.first_name,
            ext3.hire_date,
            base.id,
            ext4.intent_category,
            ext4.intent_type,
            ext4.is_active,
            base.is_field_staff,
            ext4.is_trackable,
            ext3.job_title,
            ext4.last_name,
            base.last_synced_at,
            ext4.lifecycle_stage,
            base.location_id,
            fk_location.name AS location_display,
            base.manager_id,
            fk_manager.display_id AS manager_display,
            ext4.module,
            ext4.name,
            ext1.object_subtype,
            ext1.object_type,
            base.organization_id,
            fk_organization.name AS organization_display,
            ext2.organization_user_id,
            fk_organization_user.display_id AS organization_user_display,
            base.path,
            ext2.payment_frequency,
            ext4.persona_type,
            ext4.phone,
            ext4.preferred_work_hours,
            ext4.priority,
            ext4.raci,
            base.role_status,
            ext4.search_vector,
            ext4.skills,
            ext4.stage_id,
            ext4.state_category,
            ext4.status,
            ext2.tax_id_encrypted,
            ext3.termination_date,
            ext4.unavailable_periods,
            base.updated_at,
            base.updated_by,
            fk_updated_by.name AS updated_by_display,
            ext1.urn,
            base.user_id,
            fk_user.name AS user_display,
            ext4.vertical,
            ext4.vertical_payload,
            ext3.work_schedule,
            (ext3.work_schedule #>> '{timezone}'::text[]) AS work_schedule__timezone,
            ((ext3.work_schedule #>> '{weeklyHours}'::text[]))::integer AS "work_schedule__weeklyHours"
           FROM (((((((((((identity.organization_users base
             JOIN core.unified_objects ext1 ON ((ext1.id = base.id)))
             JOIN finance.financial_profiles ext2 ON ((ext2.id = base.id)))
             JOIN hr.profiles ext3 ON ((ext3.id = base.id)))
             JOIN unified.contacts ext4 ON ((ext4.id = base.id)))
             LEFT JOIN identity.users fk_created_by ON ((base.created_by = fk_created_by.id)))
             LEFT JOIN identity.locations fk_location ON ((base.location_id = fk_location.id)))
             LEFT JOIN identity.organization_users fk_manager ON ((base.manager_id = fk_manager.id)))
             LEFT JOIN identity.organizations fk_organization ON ((base.organization_id = fk_organization.id)))
             LEFT JOIN identity.organization_users fk_organization_user ON ((ext2.organization_user_id = fk_organization_user.id)))
             LEFT JOIN identity.users fk_updated_by ON ((base.updated_by = fk_updated_by.id)))
             LEFT JOIN identity.users fk_user ON ((base.user_id = fk_user.id)))) base_query;

CREATE VIEW identity.v_organizations AS
 SELECT app_settings,
    app_settings__business_user_count,
    app_settings__custom_domain,
    app_settings__customization__language,
    app_settings__customization__theme,
    app_settings__email,
    app_settings__holidays,
    app_settings__multi_branch__branch_count,
    app_settings__multi_branch__enabled,
    app_settings__name,
    app_settings__partition,
    app_settings__support__email__email,
    "app_settings__support__email__fromName",
    "app_settings__support__whatsapp__accessTokenEncrypted",
    "app_settings__support__whatsapp__displayPhoneNumber",
    "app_settings__support__whatsapp__phoneNumberId",
    "app_settings__support__whatsapp__wabaId",
    app_settings__workspace,
    auth_id,
    claimed_at,
    claimed_by_contact_id,
    created_at,
    created_by,
    created_by_display,
    custom,
    custom__ai_overrides__business_user_count,
    custom__ai_overrides__custom_domain,
    custom__ai_overrides__customization__language,
    custom__ai_overrides__customization__theme,
    custom__ai_overrides__email,
    custom__ai_overrides__holidays,
    custom__ai_overrides__multi_branch__branch_count,
    custom__ai_overrides__multi_branch__enabled,
    custom__ai_overrides__name,
    custom__ai_overrides__partition,
    custom__ai_overrides__workspace,
    default_language,
    deleted_at,
    details,
    details__address,
    details__admin_contact__email,
    "details__admin_contact__fullName",
    details__admin_contact__mobile,
    details__contact_email,
    details__contact_number,
    details__contact_person,
    details__country,
    details__registration_source,
    details__requested_at,
    details__supplier_name,
    details__zip,
    enabled_languages,
    id,
    is_active,
    is_demo,
    is_system_org,
    module_features,
    name,
    organization_id,
    organization_display,
    search_vector,
    settings,
    settings__holidays__date,
    settings__holidays__name,
    settings__localization__currency,
    settings__localization__date_format,
    settings__localization__time_format,
    settings__localization__time_zone,
    settings__localization__week_start_day,
    subdomain,
    subscription_id,
    theme_config,
    theme_config___preset,
    "theme_config__allowUserDarkMode",
    "theme_config__baseFontSize",
    "theme_config__borderRadius",
    "theme_config__brandName",
    "theme_config__compactMode",
    "theme_config__containerPadding",
    "theme_config__dark__cardBg",
    "theme_config__dark__headerBg",
    "theme_config__dark__layoutBg",
    "theme_config__dark__primaryColor",
    "theme_config__dark__secondaryColor",
    "theme_config__dark__siderBg",
    "theme_config__defaultMode",
    theme_config__description,
    "theme_config__fontFamily",
    "theme_config__heroHeader",
    "theme_config__light__cardBg",
    "theme_config__light__headerBg",
    "theme_config__light__layoutBg",
    "theme_config__light__primaryColor",
    "theme_config__light__secondaryColor",
    "theme_config__light__siderBg",
    theme_config__mode,
    theme_config__preset,
    "theme_config__PRESET",
    "theme_config__primaryColor",
    "theme_config__secondaryColor",
    tier,
    updated_at,
    updated_by,
    updated_by_display,
    vertical,
    vertical__type
   FROM ( SELECT base.app_settings,
            ((base.app_settings #>> '{business_user_count}'::text[]))::integer AS app_settings__business_user_count,
            (base.app_settings #>> '{custom_domain}'::text[]) AS app_settings__custom_domain,
            ((base.app_settings #>> '{customization,language}'::text[]))::boolean AS app_settings__customization__language,
            ((base.app_settings #>> '{customization,theme}'::text[]))::boolean AS app_settings__customization__theme,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.app_settings #> '{email}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS app_settings__email,
            ((base.app_settings #>> '{holidays}'::text[]))::boolean AS app_settings__holidays,
            ((base.app_settings #>> '{multi_branch,branch_count}'::text[]))::integer AS app_settings__multi_branch__branch_count,
            ((base.app_settings #>> '{multi_branch,enabled}'::text[]))::boolean AS app_settings__multi_branch__enabled,
            base.app_settings__name,
            (base.app_settings #>> '{partition}'::text[]) AS app_settings__partition,
            (base.app_settings #>> '{support,email,email}'::text[]) AS app_settings__support__email__email,
            (base.app_settings #>> '{support,email,fromName}'::text[]) AS "app_settings__support__email__fromName",
            (base.app_settings #>> '{support,whatsapp,accessTokenEncrypted}'::text[]) AS "app_settings__support__whatsapp__accessTokenEncrypted",
            (base.app_settings #>> '{support,whatsapp,displayPhoneNumber}'::text[]) AS "app_settings__support__whatsapp__displayPhoneNumber",
            (base.app_settings #>> '{support,whatsapp,phoneNumberId}'::text[]) AS "app_settings__support__whatsapp__phoneNumberId",
            (base.app_settings #>> '{support,whatsapp,wabaId}'::text[]) AS "app_settings__support__whatsapp__wabaId",
            (base.app_settings #>> '{workspace}'::text[]) AS app_settings__workspace,
            base.auth_id,
            base.claimed_at,
            base.claimed_by_contact_id,
            base.created_at,
            base.created_by,
            fk_created_by.name AS created_by_display,
            base.custom,
            ((base.custom #>> '{ai_overrides,business_user_count}'::text[]))::integer AS custom__ai_overrides__business_user_count,
            (base.custom #>> '{ai_overrides,custom_domain}'::text[]) AS custom__ai_overrides__custom_domain,
            ((base.custom #>> '{ai_overrides,customization,language}'::text[]))::boolean AS custom__ai_overrides__customization__language,
            ((base.custom #>> '{ai_overrides,customization,theme}'::text[]))::boolean AS custom__ai_overrides__customization__theme,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.custom #> '{ai_overrides,email}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS custom__ai_overrides__email,
            ((base.custom #>> '{ai_overrides,holidays}'::text[]))::boolean AS custom__ai_overrides__holidays,
            ((base.custom #>> '{ai_overrides,multi_branch,branch_count}'::text[]))::integer AS custom__ai_overrides__multi_branch__branch_count,
            ((base.custom #>> '{ai_overrides,multi_branch,enabled}'::text[]))::boolean AS custom__ai_overrides__multi_branch__enabled,
            base.custom__ai_overrides__name,
            (base.custom #>> '{ai_overrides,partition}'::text[]) AS custom__ai_overrides__partition,
            (base.custom #>> '{ai_overrides,workspace}'::text[]) AS custom__ai_overrides__workspace,
            base.default_language,
            base.deleted_at,
            base.details,
            (base.details #>> '{address}'::text[]) AS details__address,
            (base.details #>> '{admin_contact,email}'::text[]) AS details__admin_contact__email,
            (base.details #>> '{admin_contact,fullName}'::text[]) AS "details__admin_contact__fullName",
            (base.details #>> '{admin_contact,mobile}'::text[]) AS details__admin_contact__mobile,
            (base.details #>> '{contact_email}'::text[]) AS details__contact_email,
            (base.details #>> '{contact_number}'::text[]) AS details__contact_number,
            (base.details #>> '{contact_person}'::text[]) AS details__contact_person,
            (base.details #>> '{country}'::text[]) AS details__country,
            (base.details #>> '{registration_source}'::text[]) AS details__registration_source,
            (base.details #>> '{requested_at}'::text[]) AS details__requested_at,
            base.details__supplier_name,
            (base.details #>> '{zip}'::text[]) AS details__zip,
            base.enabled_languages,
            base.id,
            base.is_active,
            base.is_demo,
            base.is_system_org,
            base.module_features,
            base.name,
            base.organization_id,
            fk_organization.name AS organization_display,
            base.search_vector,
            base.settings,
            (base.settings #>> '{holidays,date}'::text[]) AS settings__holidays__date,
            (base.settings #>> '{holidays,name}'::text[]) AS settings__holidays__name,
            (base.settings #>> '{localization,currency}'::text[]) AS settings__localization__currency,
            (base.settings #>> '{localization,date_format}'::text[]) AS settings__localization__date_format,
            (base.settings #>> '{localization,time_format}'::text[]) AS settings__localization__time_format,
            (base.settings #>> '{localization,time_zone}'::text[]) AS settings__localization__time_zone,
            (base.settings #>> '{localization,week_start_day}'::text[]) AS settings__localization__week_start_day,
            base.subdomain,
            base.subscription_id,
            base.theme_config,
            (base.theme_config #>> '{_preset}'::text[]) AS theme_config___preset,
            ((base.theme_config #>> '{allowUserDarkMode}'::text[]))::boolean AS "theme_config__allowUserDarkMode",
            ((base.theme_config #>> '{baseFontSize}'::text[]))::integer AS "theme_config__baseFontSize",
            ((base.theme_config #>> '{borderRadius}'::text[]))::integer AS "theme_config__borderRadius",
            (base.theme_config #>> '{brandName}'::text[]) AS "theme_config__brandName",
            ((base.theme_config #>> '{compactMode}'::text[]))::boolean AS "theme_config__compactMode",
            ((base.theme_config #>> '{containerPadding}'::text[]))::integer AS "theme_config__containerPadding",
            (base.theme_config #>> '{dark,cardBg}'::text[]) AS "theme_config__dark__cardBg",
            (base.theme_config #>> '{dark,headerBg}'::text[]) AS "theme_config__dark__headerBg",
            (base.theme_config #>> '{dark,layoutBg}'::text[]) AS "theme_config__dark__layoutBg",
            (base.theme_config #>> '{dark,primaryColor}'::text[]) AS "theme_config__dark__primaryColor",
            (base.theme_config #>> '{dark,secondaryColor}'::text[]) AS "theme_config__dark__secondaryColor",
            (base.theme_config #>> '{dark,siderBg}'::text[]) AS "theme_config__dark__siderBg",
            (base.theme_config #>> '{defaultMode}'::text[]) AS "theme_config__defaultMode",
            (base.theme_config #>> '{description}'::text[]) AS theme_config__description,
            (base.theme_config #>> '{fontFamily}'::text[]) AS "theme_config__fontFamily",
            ((base.theme_config #>> '{heroHeader}'::text[]))::boolean AS "theme_config__heroHeader",
            (base.theme_config #>> '{light,cardBg}'::text[]) AS "theme_config__light__cardBg",
            (base.theme_config #>> '{light,headerBg}'::text[]) AS "theme_config__light__headerBg",
            (base.theme_config #>> '{light,layoutBg}'::text[]) AS "theme_config__light__layoutBg",
            (base.theme_config #>> '{light,primaryColor}'::text[]) AS "theme_config__light__primaryColor",
            (base.theme_config #>> '{light,secondaryColor}'::text[]) AS "theme_config__light__secondaryColor",
            (base.theme_config #>> '{light,siderBg}'::text[]) AS "theme_config__light__siderBg",
            (base.theme_config #>> '{mode}'::text[]) AS theme_config__mode,
            (base.theme_config #>> '{preset}'::text[]) AS theme_config__preset,
            (base.theme_config #>> '{PRESET}'::text[]) AS "theme_config__PRESET",
            (base.theme_config #>> '{primaryColor}'::text[]) AS "theme_config__primaryColor",
            (base.theme_config #>> '{secondaryColor}'::text[]) AS "theme_config__secondaryColor",
            base.tier,
            base.updated_at,
            base.updated_by,
            fk_updated_by.name AS updated_by_display,
            base.vertical,
            (base.vertical #>> '{type}'::text[]) AS vertical__type
           FROM (((identity.organizations base
             LEFT JOIN identity.users fk_created_by ON ((base.created_by = fk_created_by.id)))
             LEFT JOIN identity.organizations fk_organization ON ((base.organization_id = fk_organization.id)))
             LEFT JOIN identity.users fk_updated_by ON ((base.updated_by = fk_updated_by.id)))) base_query;

CREATE VIEW identity.v_roles WITH (security_invoker='on') AS
 SELECT created_at,
    created_by,
    created_by_display,
    custom,
    deleted_at,
    feature,
    id,
    is_active,
    is_sassadmin,
    location_id,
    location_display,
    name,
    organization_id,
    organization_display,
    permissions,
    "permissions__*",
    permissions__admin__all,
    permissions__admin__businesses,
    "permissions__admin__crud-page",
    permissions__admin__diagnostics,
    permissions__admin__notifications,
    permissions__admin__organizations,
    "permissions__admin__organizations copy",
    permissions__admin__projects,
    "permissions__admin__service-categories",
    "permissions__admin__service-offerings",
    "permissions__admin__service-types",
    permissions__admin__settings,
    permissions__admin__subscriptions,
    permissions__admin__teams,
    permissions__admin__tickets,
    permissions__admin__users,
    "permissions__admin__users copy",
    "permissions__admin__users copy copy",
    "permissions__admin__users-dyn",
    permissions__all,
    "permissions__contractmgmt__service-assets",
    "permissions__contractmgmt__service-categories",
    "permissions__contractmgmt__service-contracts",
    "permissions__contractmgmt__service-offerings",
    "permissions__contractmgmt__service-types",
    "permissions__contracts__client-contacts",
    permissions__contracts__clients,
    "permissions__contracts__service-assets",
    "permissions__contracts__service-contracts",
    permissions__core__businesses,
    "permissions__core__crud-view",
    permissions__core__organizations,
    permissions__core__profile,
    "permissions__core__user-setting",
    "permissions__core__user-settings",
    permissions__core__users,
    "permissions__core__users-view",
    permissions__crm__contacts,
    "permissions__crm__crm-accounts",
    "permissions__crm__crm-contacts",
    "permissions__crm__crm-deals",
    "permissions__crm__crm-leads",
    permissions__crm__customers,
    permissions__crm__deals,
    permissions__crm__leads,
    "permissions__fsm__my-tickets",
    permissions__fsm__tracking,
    permissions__identity__roles,
    permissions__identity__teams,
    permissions__identity__users,
    permissions__networking__businesses,
    "permissions__networking__eventPass",
    permissions__networking__members,
    permissions__networking__networking,
    permissions__networking__profile,
    permissions__platform__maintenance,
    permissions__public__subscriptions,
    permissions__settings__ai,
    permissions__settings__config,
    permissions__settings__nlp,
    permissions__settings__process,
    permissions__settings__settings,
    "permissions__settings__user-setting",
    "permissions__settings__user-settings",
    permissions__settings__workflow,
    permissions__settings__workflows,
    permissions__support__analytics,
    permissions__support__invoices,
    permissions__support__projects,
    "permissions__support__service-invoices",
    "permissions__support__service-reports",
    permissions__support__tasks,
    permissions__support__tickets,
    permissions__support__tracking,
    permissions__tenant__visibility,
    permissions__workforce__expenses,
    permissions__workforce__leaves,
    permissions__workforce__teams,
    "permissions__workforce__teams-users",
    permissions__workforce__timesheets,
    permissions__workforce__users,
    rls_policy,
    search_vector,
    ui_order,
    updated_at,
    updated_by,
    updated_by_display,
    vertical
   FROM ( SELECT base.created_at,
            base.created_by,
            fk_created_by.name AS created_by_display,
            base.custom,
            base.deleted_at,
            base.feature,
            base.id,
            base.is_active,
            base.is_sassadmin,
            base.location_id,
            fk_location.name AS location_display,
            base.name,
            base.organization_id,
            fk_organization.name AS organization_display,
            base.permissions,
            ((base.permissions #>> '{*}'::text[]))::boolean AS "permissions__*",
            ((base.permissions #>> '{admin,all}'::text[]))::boolean AS permissions__admin__all,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,businesses}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__admin__businesses,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,crud-page}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__admin__crud-page",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,diagnostics}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__admin__diagnostics,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,notifications}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__admin__notifications,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,organizations}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__admin__organizations,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,"organizations copy"}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__admin__organizations copy",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,projects}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__admin__projects,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,service-categories}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__admin__service-categories",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,service-offerings}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__admin__service-offerings",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,service-types}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__admin__service-types",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,settings}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__admin__settings,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,subscriptions}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__admin__subscriptions,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,teams}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__admin__teams,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,tickets}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__admin__tickets,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,users}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__admin__users,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,"users copy"}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__admin__users copy",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,"users copy copy"}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__admin__users copy copy",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{admin,users-dyn}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__admin__users-dyn",
            ((base.permissions #>> '{all}'::text[]))::boolean AS permissions__all,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{contractmgmt,service-assets}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__contractmgmt__service-assets",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{contractmgmt,service-categories}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__contractmgmt__service-categories",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{contractmgmt,service-contracts}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__contractmgmt__service-contracts",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{contractmgmt,service-offerings}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__contractmgmt__service-offerings",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{contractmgmt,service-types}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__contractmgmt__service-types",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{contracts,client-contacts}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__contracts__client-contacts",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{contracts,clients}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__contracts__clients,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{contracts,service-assets}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__contracts__service-assets",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{contracts,service-contracts}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__contracts__service-contracts",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{core,businesses}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__core__businesses,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{core,crud-view}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__core__crud-view",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{core,organizations}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__core__organizations,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{core,profile}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__core__profile,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{core,user-setting}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__core__user-setting",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{core,user-settings}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__core__user-settings",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{core,users}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__core__users,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{core,users-view}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__core__users-view",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{crm,contacts}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__crm__contacts,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{crm,crm-accounts}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__crm__crm-accounts",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{crm,crm-contacts}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__crm__crm-contacts",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{crm,crm-deals}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__crm__crm-deals",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{crm,crm-leads}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__crm__crm-leads",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{crm,customers}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__crm__customers,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{crm,deals}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__crm__deals,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{crm,leads}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__crm__leads,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{fsm,my-tickets}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__fsm__my-tickets",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{fsm,tracking}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__fsm__tracking,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{identity,roles}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__identity__roles,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{identity,teams}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__identity__teams,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{identity,users}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__identity__users,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{networking,businesses}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__networking__businesses,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{networking,eventPass}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__networking__eventPass",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{networking,members}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__networking__members,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{networking,networking}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__networking__networking,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{networking,profile}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__networking__profile,
            ((base.permissions #>> '{platform,maintenance}'::text[]))::boolean AS permissions__platform__maintenance,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{public,subscriptions}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__public__subscriptions,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{settings,ai}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__settings__ai,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{settings,config}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__settings__config,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{settings,nlp}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__settings__nlp,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{settings,process}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__settings__process,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{settings,settings}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__settings__settings,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{settings,user-setting}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__settings__user-setting",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{settings,user-settings}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__settings__user-settings",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{settings,workflow}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__settings__workflow,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{settings,workflows}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__settings__workflows,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{support,analytics}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__support__analytics,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{support,invoices}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__support__invoices,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{support,projects}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__support__projects,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{support,service-invoices}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__support__service-invoices",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{support,service-reports}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__support__service-reports",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{support,tasks}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__support__tasks,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{support,tickets}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__support__tickets,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{support,tracking}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__support__tracking,
            (base.permissions #>> '{tenant,visibility}'::text[]) AS permissions__tenant__visibility,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{workforce,expenses}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__workforce__expenses,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{workforce,leaves}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__workforce__leaves,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{workforce,teams}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__workforce__teams,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{workforce,teams-users}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS "permissions__workforce__teams-users",
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{workforce,timesheets}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__workforce__timesheets,
            ARRAY( SELECT jsonb_array_elements_text(COALESCE((base.permissions #> '{workforce,users}'::text[]), '[]'::jsonb)) AS jsonb_array_elements_text) AS permissions__workforce__users,
            base.rls_policy,
            base.search_vector,
            base.ui_order,
            base.updated_at,
            base.updated_by,
            fk_updated_by.name AS updated_by_display,
            base.vertical
           FROM ((((identity.roles base
             LEFT JOIN identity.users fk_created_by ON ((base.created_by = fk_created_by.id)))
             LEFT JOIN identity.locations fk_location ON ((base.location_id = fk_location.id)))
             LEFT JOIN identity.organizations fk_organization ON ((base.organization_id = fk_organization.id)))
             LEFT JOIN identity.users fk_updated_by ON ((base.updated_by = fk_updated_by.id)))) base_query;

CREATE VIEW identity.v_teams WITH (security_invoker='on') AS
 SELECT created_at,
    created_by,
    created_by_display,
    details,
    details__department,
    details__description,
    details__purpose,
    details__type,
    id,
    location_id,
    location_display,
    name,
    organization_id,
    organization_display,
    search_vector,
    updated_at,
    updated_by,
    updated_by_display
   FROM ( SELECT base.created_at,
            base.created_by,
            fk_created_by.name AS created_by_display,
            base.details,
            (base.details #>> '{department}'::text[]) AS details__department,
            (base.details #>> '{description}'::text[]) AS details__description,
            (base.details #>> '{purpose}'::text[]) AS details__purpose,
            (base.details #>> '{type}'::text[]) AS details__type,
            base.id,
            base.location_id,
            fk_location.name AS location_display,
            base.name,
            base.organization_id,
            fk_organization.name AS organization_display,
            base.search_vector,
            base.updated_at,
            base.updated_by,
            fk_updated_by.name AS updated_by_display
           FROM ((((identity.teams base
             LEFT JOIN identity.users fk_created_by ON ((base.created_by = fk_created_by.id)))
             LEFT JOIN identity.locations fk_location ON ((base.location_id = fk_location.id)))
             LEFT JOIN identity.organizations fk_organization ON ((base.organization_id = fk_organization.id)))
             LEFT JOIN identity.users fk_updated_by ON ((base.updated_by = fk_updated_by.id)))) base_query;

CREATE VIEW identity.v_user_access_context AS
 WITH user_roles_agg AS (
         SELECT user_roles.organization_user_id,
            array_agg(user_roles.role_id) AS role_ids
           FROM identity.user_roles
          GROUP BY user_roles.organization_user_id
        ), user_teams_agg AS (
         SELECT ut.organization_user_id,
            array_agg(ut.team_id) AS team_ids,
            array_agg(t.location_id) AS team_locations
           FROM (identity.user_teams ut
             JOIN identity.teams t ON ((ut.team_id = t.id)))
          GROUP BY ut.organization_user_id
        )
 SELECT ou.id AS org_user_id,
    ou.user_id,
    ou.organization_id,
    ou.location_id AS primary_location_id,
    ou.path AS hierarchy_path,
    COALESCE(uta.team_locations, ARRAY[]::uuid[]) AS team_locations,
    COALESCE(uta.team_ids, ARRAY[]::uuid[]) AS team_ids,
    COALESCE(ura.role_ids, ARRAY[]::uuid[]) AS role_ids,
    o.name AS organization_name,
    o.tier AS organization_tier,
    ou.persona_type,
    identity.util_merge_role_permissions(ura.role_ids) AS permissions
   FROM (((identity.organization_users ou
     JOIN identity.organizations o ON ((o.id = ou.organization_id)))
     LEFT JOIN user_roles_agg ura ON ((ura.organization_user_id = ou.id)))
     LEFT JOIN user_teams_agg uta ON ((uta.organization_user_id = ou.id)))
  WHERE (ou.is_active = true);

CREATE VIEW identity.v_user_roles WITH (security_invoker='on') AS
 SELECT created_at,
    created_by,
    created_by_display,
    id,
    last_assigned_at,
    organization_id,
    organization_display,
    organization_user_id,
    organization_user_display,
    role_id,
    role_display,
    team_id,
    team_display,
    updated_at,
    updated_by
   FROM ( SELECT base.created_at,
            base.created_by,
            fk_created_by.name AS created_by_display,
            base.id,
            base.last_assigned_at,
            base.organization_id,
            fk_organization.name AS organization_display,
            base.organization_user_id,
            fk_organization_user.display_id AS organization_user_display,
            base.role_id,
            fk_role.name AS role_display,
            base.team_id,
            fk_team.name AS team_display,
            base.updated_at,
            base.updated_by
           FROM (((((identity.user_roles base
             LEFT JOIN identity.users fk_created_by ON ((base.created_by = fk_created_by.id)))
             LEFT JOIN identity.organizations fk_organization ON ((base.organization_id = fk_organization.id)))
             LEFT JOIN identity.organization_users fk_organization_user ON ((base.organization_user_id = fk_organization_user.id)))
             LEFT JOIN identity.roles fk_role ON ((base.role_id = fk_role.id)))
             LEFT JOIN identity.teams fk_team ON ((base.team_id = fk_team.id)))) base_query;

CREATE VIEW identity.v_user_teams WITH (security_invoker='on') AS
 SELECT created_at,
    created_by,
    created_by_display,
    id,
    last_assigned_at,
    organization_id,
    organization_display,
    organization_user_id,
    organization_user_display,
    team_id,
    team_display,
    updated_at,
    updated_by
   FROM ( SELECT base.created_at,
            base.created_by,
            fk_created_by.name AS created_by_display,
            base.id,
            base.last_assigned_at,
            base.organization_id,
            fk_organization.name AS organization_display,
            base.organization_user_id,
            fk_organization_user.display_id AS organization_user_display,
            base.team_id,
            fk_team.name AS team_display,
            base.updated_at,
            base.updated_by
           FROM ((((identity.user_teams base
             LEFT JOIN identity.users fk_created_by ON ((base.created_by = fk_created_by.id)))
             LEFT JOIN identity.organizations fk_organization ON ((base.organization_id = fk_organization.id)))
             LEFT JOIN identity.organization_users fk_organization_user ON ((base.organization_user_id = fk_organization_user.id)))
             LEFT JOIN identity.teams fk_team ON ((base.team_id = fk_team.id)))) base_query;

ALTER TABLE identity.location_types ENABLE ROW LEVEL SECURITY;

ALTER TABLE identity.locations ENABLE ROW LEVEL SECURITY;

ALTER TABLE identity.modules ENABLE ROW LEVEL SECURITY;

ALTER TABLE identity.organization_users ENABLE ROW LEVEL SECURITY;

ALTER TABLE identity.organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE identity.roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE identity.teams ENABLE ROW LEVEL SECURITY;

ALTER TABLE identity.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE identity.user_teams ENABLE ROW LEVEL SECURITY;

ALTER TABLE ONLY identity.location_types FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY identity.locations FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY identity.modules FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY identity.org_module_configs FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY identity.organization_users FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY identity.organizations FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY identity.roles FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY identity.teams FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY identity.user_roles FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY identity.user_teams FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY identity.users FORCE ROW LEVEL SECURITY;

COMMENT ON COLUMN identity.locations.deleted_at IS 'Timestamp when this location was soft-deleted';

COMMENT ON COLUMN identity.organization_users.deleted_at IS 'Timestamp when this membership was soft-deleted';

COMMENT ON COLUMN identity.organizations.claimed_at IS 'Timestamp when the organization was claimed via self-onboarding';

COMMENT ON COLUMN identity.organizations.claimed_by_contact_id IS 'Reference to external.contacts - the contact who self-onboarded to create this org';

COMMENT ON COLUMN identity.organizations.deleted_at IS 'Timestamp when this organization was soft-deleted';

COMMENT ON COLUMN identity.organizations.tier IS 'Subscription tier: free, pro, enterprise. Used for module/feature gating.';

COMMENT ON COLUMN identity.organizations.vertical IS 'Industry vertical: hospital, construction, retail, etc.';

COMMENT ON COLUMN identity.roles.deleted_at IS 'Timestamp when this role was soft-deleted';

COMMENT ON COLUMN identity.users.auth_provider IS 'Authentication method used by this user: email, google, microsoft, github, saml';

COMMENT ON COLUMN identity.users.auth_provider_id IS 'External provider user ID for SSO linking (e.g., OAuth sub claim)';

COMMENT ON COLUMN identity.users.deleted_at IS 'Timestamp when this user was soft-deleted';

COMMENT ON COLUMN identity.users.last_login_at IS 'Timestamp of the user''s most recent authentication event';

COMMENT ON FUNCTION identity."zz_rls_bootstrap_entity_policy_v1-m18"(p_schema text, p_entity text, p_dry_run boolean) IS '[V5 RLS Architecture — 2026-03-18]
Bootstrap Entity Policy Generator: reads classification + rls_config from
entity_blueprints, picks the correct template, drops old policies, creates
the single correct policy.
Templates:
  standard      → Unified_Security_V5 (org + worker/account/contact/vendor)
  workforce     → Unified_Security_V5_Workforce (org + self/manager/approver/HR)
  configuration → Config_Tenant_Or_Global (org IS NULL OR org = current)
  analytical    → Analytical_Worker_Read (org = current, SELECT only)
Usage:
  SELECT identity.rls_bootstrap_entity_policy(''esm'', ''contracts'');        -- live
  SELECT identity.rls_bootstrap_entity_policy(''esm'', ''contracts'', true);  -- dry run
Hooks into comp_util_ops_bootstrap_entity for automatic application.';

COMMENT ON FUNCTION identity.bootstrap_user_to_org(p_user_id uuid, p_organization_id uuid, p_is_admin boolean) IS 'Bootstraps a user into an organization with all necessary supporting records (location, role, team, assignments)';

COMMENT ON FUNCTION identity.cleanup_org_data(p_organization_id uuid, p_confirm text) IS 'DANGEROUS: Removes all identity schema data for an organization. For testing only.';

COMMENT ON FUNCTION identity.cleanup_user_from_org(p_user_id uuid, p_organization_id uuid, p_hard_delete boolean) IS 'Removes or deactivates a user from an organization';

COMMENT ON FUNCTION identity.get_current_org_id() IS 'Resiliently retrieves the current organization_id from various JWT claim locations or DB fallback.';

COMMENT ON FUNCTION identity.get_current_org_user_id_v2() IS 'v2: Returns org_user_id from JWT claim with DB fallback for edge cases';

COMMENT ON FUNCTION identity.get_my_organizations_v2() IS 'v2: Lists all active organizations for the current authenticated user with roles.';

COMMENT ON FUNCTION identity.jwt_generate_thin_claims(p_auth_id uuid) IS 'Generates standardized JWT claims including app_metadata container for organization context.';

COMMENT ON FUNCTION identity.rls_bootstrap_entity_policy(p_schema text, p_entity text, p_dry_run boolean) IS '[V5 RLS Architecture — 2026-03-18, PATCH 005]
Fixed: All column references in USING clause are now qualified with table name
to prevent ambiguity with ctx.* fields inside EXISTS subquery.
Bug fixed: contact_id resolved to ctx.contact_id instead of table.contact_id.';

COMMENT ON FUNCTION identity.rls_drop_all_policies(p_schema text, p_table text) IS '[V5 RLS Architecture — 2026-03-18]
Drops ALL existing RLS policies on a table using pg_policies catalog.
Must be called before creating a new policy to prevent the dual-policy
OR bypass bug (PostgreSQL ORs permissive policies).';

COMMENT ON FUNCTION identity.rls_get_session_context(p_org_id uuid) IS '[V5 RLS Architecture — 2026-03-18, PATCH 006]
Fixed: extensions schema in search_path for ltree operators.
Fixed: employee/staff/internal persona normalized to worker.';

COMMENT ON FUNCTION identity.update_organization_user_path_v2() IS 'v2: Trigger function with self-healing for missing manager paths';

COMMENT ON FUNCTION identity.util_get_subordinate_count_v2() IS 'v2: Returns subordinate count scoped to current organization (multi-tenant safe)';

COMMENT ON FUNCTION identity.zz_jwt_get_user_session_v1(p_org_id uuid) IS 'v2: Returns detailed session metadata (Fat Token) for internal caching or JWT Hooks.';

COMMENT ON TABLE identity.organization_users IS 'Internal Persona: Links a Global Identity (users) to an Organization (Tenant).
     The details JSONB column should contain workforce (Persona) metadata:
     - worker_category: "permanent" | "contractor" | "intern" | "consultant" (Engagement type)
     - seniority_level: 1-10 integer (Rank/Pay-grade, independent of reporting hierarchy)
     - is_field_worker: boolean flag for FSM mobile UI triggers
     - department: string for organizational chart grouping
     - employment_type: "full_time" | "part_time" | "hourly"
     - employee_id: external HR system employee identifier
     - hire_date: ISO date string of employment start
     - exit_date: ISO date string for end of employment (can be future-dated for churn)
     - cost_center: accounting code for payroll allocation (can also be mapped via teams)
     Note: Personal attributes (DOB, Preferences) belong in identity.users.details (Global Person).
     Workforce attributes (ID, Hire Date, Cost Center) belong here (Org Persona).
     Example:
     {
         "worker_category": "permanent",
         "seniority_level": 5,
         "is_field_worker": false,
         "department": "Engineering",
         "employment_type": "full_time",
         "employee_id": "EMP-001",
         "hire_date": "2024-01-15",
         "exit_date": null,
         "cost_center": "ENG-001"
     }';

COMMENT ON TYPE identity.rls_session_context_t IS '[V5 RLS Architecture — 2026-03-18]
Composite return type for identity.rls_get_session_context().
All fields pre-resolved at query start, cached by STABLE semantics.
Used in policy templates via: EXISTS (SELECT 1 FROM identity.rls_get_session_context() ctx WHERE ...)';

CREATE AGGREGATE identity.jwt_jsonb_deep_merge_agg(jsonb) (
    SFUNC = identity.jwt_jsonb_merge_deep,
    STYPE = jsonb,
    INITCOND = '{}'
);

CREATE SCHEMA identity;
