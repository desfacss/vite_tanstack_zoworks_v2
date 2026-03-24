CREATE TABLE calendar.booking_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    role text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE calendar.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type_id uuid NOT NULL,
    assigned_resource_id uuid,
    location_id uuid,
    invitee_name text NOT NULL,
    invitee_email text NOT NULL,
    invitee_notes text,
    scheduled_at timestamp with time zone NOT NULL,
    timezone text NOT NULL,
    status text DEFAULT 'confirmed'::text,
    assignment_strategy text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE calendar.calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calendar_integration_id uuid NOT NULL,
    external_event_id text NOT NULL,
    title text,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    is_all_day boolean DEFAULT false,
    status text DEFAULT 'confirmed'::text,
    location text,
    attendees jsonb DEFAULT '[]'::jsonb,
    is_blocking boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT calendar_events_status_check CHECK ((status = ANY (ARRAY['confirmed'::text, 'tentative'::text, 'cancelled'::text])))
);

CREATE TABLE calendar.calendar_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_id uuid NOT NULL,
    provider text NOT NULL,
    provider_account_email text,
    access_token_encrypted text,
    refresh_token_encrypted text,
    token_expires_at timestamp with time zone,
    calendar_id text,
    sync_direction text DEFAULT 'read-only'::text,
    is_active boolean DEFAULT true,
    auto_sync_enabled boolean DEFAULT true,
    sync_interval_minutes integer DEFAULT 15,
    last_sync_at timestamp with time zone,
    last_sync_status text DEFAULT 'pending'::text,
    last_sync_error text,
    webhook_url text,
    webhook_secret text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT calendar_integrations_last_sync_status_check CHECK ((last_sync_status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'syncing'::text]))),
    CONSTRAINT calendar_integrations_provider_check CHECK ((provider = ANY (ARRAY['google'::text, 'microsoft'::text, 'apple'::text, 'ical'::text]))),
    CONSTRAINT calendar_integrations_sync_direction_check CHECK ((sync_direction = ANY (ARRAY['read-only'::text, 'write-only'::text, 'two-way'::text])))
);

CREATE TABLE calendar.client_credits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_email text NOT NULL,
    event_type_id uuid NOT NULL,
    credits_remaining integer DEFAULT 0,
    credits_total integer DEFAULT 0,
    expires_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE calendar.event_type_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    role text DEFAULT 'primary'::text,
    is_required boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT event_type_resources_role_check CHECK ((role = ANY (ARRAY['primary'::text, 'secondary'::text, 'optional'::text, 'required'::text])))
);

CREATE TABLE calendar.event_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    organization_id uuid NOT NULL,
    use_case_config_id uuid,
    location_id uuid,
    title text NOT NULL,
    slug text NOT NULL,
    duration_minutes integer NOT NULL,
    description text,
    color text DEFAULT '#3B82F6'::text,
    is_active boolean DEFAULT true,
    capacity_limit integer,
    requires_multi_resource boolean DEFAULT false,
    credit_cost integer DEFAULT 0,
    buffer_minutes integer DEFAULT 0,
    booking_mode text DEFAULT 'appointment'::text,
    assignment_strategy text DEFAULT 'round-robin'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT event_types_assignment_strategy_check CHECK ((assignment_strategy = ANY (ARRAY['round-robin'::text, 'geo-clustered'::text, 'skill-based'::text, 'load-balanced'::text, 'manual'::text, 'nearest_available'::text, 'panel_scheduling'::text, 'weighted_round_robin'::text, 'all_required'::text, 'instructor_match'::text, 'compatibility_match'::text, 'first-available'::text, 'first-to-claim'::text, 'first_available'::text, 'first_to_claim'::text]))),
    CONSTRAINT event_types_booking_mode_check CHECK ((booking_mode = ANY (ARRAY['appointment'::text, 'queue'::text, 'arrival-window'::text, 'open-shift'::text, 'open_shift'::text, 'series'::text, 'recursive'::text, 'asset-booking'::text, 'asset_booking'::text])))
);

CREATE TABLE calendar.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    city text,
    state text,
    postal_code text,
    country text DEFAULT 'US'::text,
    latitude numeric,
    longitude numeric,
    type text DEFAULT 'branch'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT locations_type_check CHECK ((type = ANY (ARRAY['branch'::text, 'zone'::text, 'warehouse'::text, 'office'::text, 'facility'::text, 'other'::text])))
);

CREATE TABLE calendar.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    timezone text DEFAULT 'UTC'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE calendar.resource_availability_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT resource_availability_rules_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);

CREATE TABLE calendar.resource_date_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_id uuid NOT NULL,
    date date NOT NULL,
    is_available boolean DEFAULT false,
    start_time time without time zone,
    end_time time without time zone,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE calendar.resource_skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    proficiency_level text DEFAULT 'proficient'::text,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT resource_skills_proficiency_level_check CHECK ((proficiency_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'proficient'::text, 'expert'::text])))
);

CREATE TABLE calendar.resource_territories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_id uuid NOT NULL,
    territory_id uuid NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE calendar.resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    avatar_url text,
    status text DEFAULT 'active'::text,
    timezone text DEFAULT 'UTC'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT resources_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'maintenance'::text, 'unavailable'::text]))),
    CONSTRAINT resources_type_check CHECK ((type = ANY (ARRAY['person'::text, 'room'::text, 'equipment'::text, 'vehicle'::text, 'asset'::text])))
);

CREATE TABLE calendar.skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT skills_category_check CHECK ((category = ANY (ARRAY['certification'::text, 'language'::text, 'specialty'::text, 'equipment_type'::text, 'role'::text, 'other'::text])))
);

CREATE TABLE calendar.territories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    polygon_geojson jsonb,
    parent_territory_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE calendar.use_case_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    category text NOT NULL,
    icon text NOT NULL,
    description text,
    config_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_template boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT use_case_configs_category_check CHECK ((category = ANY (ARRAY['field_operations'::text, 'healthcare'::text, 'corporate'::text, 'facilities'::text])))
);

CREATE TABLE calendar.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    avatar_url text,
    bio text,
    timezone text DEFAULT 'UTC'::text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY calendar.booking_resources
    ADD CONSTRAINT booking_resources_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.calendar_integrations
    ADD CONSTRAINT calendar_integrations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.client_credits
    ADD CONSTRAINT client_credits_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.event_type_resources
    ADD CONSTRAINT event_type_resources_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.event_types
    ADD CONSTRAINT event_types_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.resource_availability_rules
    ADD CONSTRAINT resource_availability_rules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.resource_date_overrides
    ADD CONSTRAINT resource_date_overrides_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.resource_skills
    ADD CONSTRAINT resource_skills_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.resource_territories
    ADD CONSTRAINT resource_territories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.territories
    ADD CONSTRAINT territories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.use_case_configs
    ADD CONSTRAINT use_case_configs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY calendar.booking_resources
    ADD CONSTRAINT booking_resources_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES calendar.bookings(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.booking_resources
    ADD CONSTRAINT booking_resources_booking_id_resource_id_key UNIQUE (booking_id, resource_id);

ALTER TABLE ONLY calendar.booking_resources
    ADD CONSTRAINT booking_resources_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES calendar.resources(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.bookings
    ADD CONSTRAINT bookings_assigned_resource_id_fkey FOREIGN KEY (assigned_resource_id) REFERENCES calendar.resources(id) ON DELETE SET NULL;

ALTER TABLE ONLY calendar.bookings
    ADD CONSTRAINT bookings_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES calendar.event_types(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.bookings
    ADD CONSTRAINT bookings_location_id_fkey FOREIGN KEY (location_id) REFERENCES calendar.locations(id) ON DELETE SET NULL;

ALTER TABLE ONLY calendar.calendar_events
    ADD CONSTRAINT calendar_events_calendar_integration_id_external_event_id_key UNIQUE (calendar_integration_id, external_event_id);

ALTER TABLE ONLY calendar.calendar_events
    ADD CONSTRAINT calendar_events_calendar_integration_id_fkey FOREIGN KEY (calendar_integration_id) REFERENCES calendar.calendar_integrations(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.calendar_integrations
    ADD CONSTRAINT calendar_integrations_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES calendar.resources(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.calendar_integrations
    ADD CONSTRAINT calendar_integrations_resource_id_provider_key UNIQUE (resource_id, provider);

ALTER TABLE ONLY calendar.client_credits
    ADD CONSTRAINT client_credits_client_email_event_type_id_key UNIQUE (client_email, event_type_id);

ALTER TABLE ONLY calendar.client_credits
    ADD CONSTRAINT client_credits_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES calendar.event_types(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.event_type_resources
    ADD CONSTRAINT event_type_resources_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES calendar.event_types(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.event_type_resources
    ADD CONSTRAINT event_type_resources_event_type_id_resource_id_key UNIQUE (event_type_id, resource_id);

ALTER TABLE ONLY calendar.event_type_resources
    ADD CONSTRAINT event_type_resources_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES calendar.resources(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.event_types
    ADD CONSTRAINT event_types_location_id_fkey FOREIGN KEY (location_id) REFERENCES calendar.locations(id) ON DELETE SET NULL;

ALTER TABLE ONLY calendar.event_types
    ADD CONSTRAINT event_types_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES calendar.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.event_types
    ADD CONSTRAINT event_types_slug_key UNIQUE (slug);

ALTER TABLE ONLY calendar.event_types
    ADD CONSTRAINT event_types_use_case_config_id_fkey FOREIGN KEY (use_case_config_id) REFERENCES calendar.use_case_configs(id) ON DELETE SET NULL;

ALTER TABLE ONLY calendar.event_types
    ADD CONSTRAINT event_types_user_id_fkey FOREIGN KEY (user_id) REFERENCES calendar.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.locations
    ADD CONSTRAINT locations_org_id_name_key UNIQUE (organization_id, name);

ALTER TABLE ONLY calendar.locations
    ADD CONSTRAINT locations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES calendar.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);

ALTER TABLE ONLY calendar.resource_availability_rules
    ADD CONSTRAINT res_avail_rules_uniq_key UNIQUE (resource_id, day_of_week, start_time, end_time);

ALTER TABLE ONLY calendar.resource_availability_rules
    ADD CONSTRAINT resource_availability_rules_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES calendar.resources(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.resource_date_overrides
    ADD CONSTRAINT resource_date_overrides_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES calendar.resources(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.resource_skills
    ADD CONSTRAINT resource_skills_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES calendar.resources(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.resource_skills
    ADD CONSTRAINT resource_skills_resource_id_skill_id_key UNIQUE (resource_id, skill_id);

ALTER TABLE ONLY calendar.resource_skills
    ADD CONSTRAINT resource_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES calendar.skills(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.resource_territories
    ADD CONSTRAINT resource_territories_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES calendar.resources(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.resource_territories
    ADD CONSTRAINT resource_territories_resource_id_territory_id_key UNIQUE (resource_id, territory_id);

ALTER TABLE ONLY calendar.resource_territories
    ADD CONSTRAINT resource_territories_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES calendar.territories(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.resources
    ADD CONSTRAINT resources_org_id_name_key UNIQUE (organization_id, name);

ALTER TABLE ONLY calendar.resources
    ADD CONSTRAINT resources_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES calendar.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.skills
    ADD CONSTRAINT skills_org_id_name_key UNIQUE (organization_id, name);

ALTER TABLE ONLY calendar.skills
    ADD CONSTRAINT skills_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES calendar.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.territories
    ADD CONSTRAINT territories_org_id_name_key UNIQUE (organization_id, name);

ALTER TABLE ONLY calendar.territories
    ADD CONSTRAINT territories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES calendar.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY calendar.territories
    ADD CONSTRAINT territories_parent_territory_id_fkey FOREIGN KEY (parent_territory_id) REFERENCES calendar.territories(id) ON DELETE SET NULL;

ALTER TABLE ONLY calendar.use_case_configs
    ADD CONSTRAINT use_case_configs_slug_key UNIQUE (slug);

ALTER TABLE ONLY calendar.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

CREATE INDEX idx_bookings_scheduled_at ON calendar.bookings USING btree (scheduled_at);

CREATE INDEX idx_calendar_events_time_range ON calendar.calendar_events USING btree (start_time, end_time);

CREATE INDEX idx_event_types_slug ON calendar.event_types USING btree (slug);

CREATE INDEX idx_organizations_slug ON calendar.organizations USING btree (slug);

CREATE INDEX idx_resources_organization ON calendar.resources USING btree (organization_id);

CREATE POLICY "Authenticated_Access_V5" ON calendar.booking_resources TO authenticated USING (true);

CREATE POLICY "Authenticated_Access_V5" ON calendar.bookings TO authenticated USING (true);

CREATE POLICY "Authenticated_Access_V5" ON calendar.calendar_events TO authenticated USING (true);

CREATE POLICY "Authenticated_Access_V5" ON calendar.calendar_integrations TO authenticated USING (true);

CREATE POLICY "Authenticated_Access_V5" ON calendar.client_credits TO authenticated USING (true);

CREATE POLICY "Authenticated_Access_V5" ON calendar.event_type_resources TO authenticated USING (true);

CREATE POLICY "Authenticated_Access_V5" ON calendar.organizations TO authenticated USING (true);

CREATE POLICY "Authenticated_Access_V5" ON calendar.resource_availability_rules TO authenticated USING (true);

CREATE POLICY "Authenticated_Access_V5" ON calendar.resource_date_overrides TO authenticated USING (true);

CREATE POLICY "Authenticated_Access_V5" ON calendar.resource_skills TO authenticated USING (true);

CREATE POLICY "Authenticated_Access_V5" ON calendar.resource_territories TO authenticated USING (true);

CREATE POLICY "Authenticated_Access_V5" ON calendar.use_case_configs TO authenticated USING (true);

CREATE POLICY "Authenticated_Access_V5" ON calendar.users TO authenticated USING (true);

CREATE POLICY "Tenant_Isolation_V5" ON calendar.event_types TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON calendar.locations TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON calendar.resources TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON calendar.skills TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON calendar.territories TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar.calendar_events FOR EACH ROW EXECUTE FUNCTION calendar.update_updated_at_column();

CREATE TRIGGER update_calendar_integrations_updated_at BEFORE UPDATE ON calendar.calendar_integrations FOR EACH ROW EXECUTE FUNCTION calendar.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON calendar.organizations FOR EACH ROW EXECUTE FUNCTION calendar.update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON calendar.resources FOR EACH ROW EXECUTE FUNCTION calendar.update_updated_at_column();

CREATE FUNCTION calendar.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER TABLE calendar.booking_resources ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.bookings ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.calendar_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.calendar_integrations ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.client_credits ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.event_type_resources ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.event_types ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.locations ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.resource_availability_rules ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.resource_date_overrides ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.resource_skills ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.resource_territories ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.resources ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.skills ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.territories ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.use_case_configs ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar.users ENABLE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.booking_resources FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.bookings FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.calendar_events FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.calendar_integrations FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.client_credits FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.event_type_resources FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.event_types FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.locations FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.organizations FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.resource_availability_rules FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.resource_date_overrides FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.resource_skills FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.resource_territories FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.resources FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.skills FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.territories FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.use_case_configs FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY calendar.users FORCE ROW LEVEL SECURITY;

CREATE SCHEMA calendar;
