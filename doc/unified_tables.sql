create table core.unified_objects (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  object_type character varying(50) not null,
  object_subtype character varying(50) null,
  urn character varying GENERATED ALWAYS as (
    (
      (
        (
          ((object_type)::text || ':'::text) || (
            COALESCE(object_subtype, 'default'::character varying)
          )::text
        ) || ':'::text
      ) || (id)::text
    )
  ) STORED (255) null,
  display_id character varying(100) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  updated_by uuid null,
  deleted_at timestamp with time zone null,
  entity_schema text null,
  entity_type text null,
  name text null,
  constraint unified_objects_pkey primary key (id),
  constraint unified_objects_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint unified_objects_org_id_fkey foreign KEY (organization_id) references identity.organizations (id),
  constraint unified_objects_updated_by_fkey foreign KEY (updated_by) references identity.users (id)
) TABLESPACE pg_default;

create unique INDEX IF not exists idx_unified_objects_display_id on core.unified_objects using btree (organization_id, display_id) TABLESPACE pg_default
where
  (deleted_at is null);

create index IF not exists idx_unified_objects_org on core.unified_objects using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_unified_objects_subtype on core.unified_objects using btree (object_type, object_subtype) TABLESPACE pg_default;

create index IF not exists idx_unified_objects_type on core.unified_objects using btree (object_type) TABLESPACE pg_default;

create index IF not exists idx_unified_objects_urn on core.unified_objects using btree (urn) TABLESPACE pg_default;

create trigger trg_set_display_id BEFORE INSERT on core.unified_objects for EACH row
execute FUNCTION core.core_trigger_set_display_id_v3 ();












create table core.object_activities (
  id uuid not null default gen_random_uuid (),
  object_id uuid not null,
  organization_id uuid not null,
  activity_type character varying(50) not null,
  actor_id uuid null,
  data jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint object_activities_pkey primary key (id),
  constraint object_activities_actor_id_fkey foreign KEY (actor_id) references identity.users (id),
  constraint object_activities_object_id_fkey foreign KEY (object_id) references core.unified_objects (id) on delete CASCADE,
  constraint object_activities_organization_id_fkey foreign KEY (organization_id) references identity.organizations (id)
) TABLESPACE pg_default;

create index IF not exists idx_object_activities_created on core.object_activities using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_object_activities_object on core.object_activities using btree (object_id) TABLESPACE pg_default;

create index IF not exists idx_object_activities_org on core.object_activities using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_object_activities_type on core.object_activities using btree (activity_type) TABLESPACE pg_default;











create table core.object_attachments (
  id uuid not null default gen_random_uuid (),
  object_id uuid not null,
  file_name character varying(255) not null,
  file_url text not null,
  file_type character varying(100) null,
  file_size_bytes bigint null,
  description text null,
  category character varying(50) null,
  uploaded_by uuid null,
  created_at timestamp with time zone null default now(),
  deleted_at timestamp with time zone null,
  organization_id uuid null,
  metadata jsonb null default '{}'::jsonb,
  constraint object_attachments_pkey primary key (id),
  constraint object_attachments_object_id_fkey foreign KEY (object_id) references core.unified_objects (id) on delete CASCADE,
  constraint object_attachments_uploaded_by_fkey foreign KEY (uploaded_by) references identity.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_object_attachments_category on core.object_attachments using btree (category) TABLESPACE pg_default;

create index IF not exists idx_object_attachments_object on core.object_attachments using btree (object_id) TABLESPACE pg_default;








create table core.object_comments (
  id uuid not null default gen_random_uuid (),
  object_id uuid not null,
  parent_id uuid null,
  content text not null,
  content_format character varying(20) null default 'text'::character varying,
  is_internal boolean null default false,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  deleted_at timestamp with time zone null,
  organization_id uuid null,
  constraint object_comments_pkey primary key (id),
  constraint object_comments_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint object_comments_object_id_fkey foreign KEY (object_id) references core.unified_objects (id) on delete CASCADE,
  constraint object_comments_parent_id_fkey foreign KEY (parent_id) references core.object_comments (id)
) TABLESPACE pg_default;

create index IF not exists idx_object_comments_created on core.object_comments using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_object_comments_object on core.object_comments using btree (object_id) TABLESPACE pg_default;

create index IF not exists idx_object_comments_parent on core.object_comments using btree (parent_id) TABLESPACE pg_default;








create table core.object_relations (
  id uuid not null default gen_random_uuid (),
  source_object_id uuid not null,
  target_object_id uuid not null,
  relation_type character varying(100) not null,
  metadata jsonb null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  constraint object_relations_pkey primary key (id),
  constraint object_relations_source_object_id_target_object_id_relation_key unique (source_object_id, target_object_id, relation_type),
  constraint object_relations_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint object_relations_source_object_id_fkey foreign KEY (source_object_id) references core.unified_objects (id) on delete CASCADE,
  constraint object_relations_target_object_id_fkey foreign KEY (target_object_id) references core.unified_objects (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_object_relations_source on core.object_relations using btree (source_object_id) TABLESPACE pg_default;

create index IF not exists idx_object_relations_target on core.object_relations using btree (target_object_id) TABLESPACE pg_default;

create index IF not exists idx_object_relations_type on core.object_relations using btree (relation_type) TABLESPACE pg_default;







create table core.object_subscriptions (
  id uuid not null default gen_random_uuid (),
  object_id uuid not null,
  user_id uuid not null,
  subscription_type character varying(50) null default 'watch'::character varying,
  created_at timestamp with time zone null default now(),
  constraint object_subscriptions_pkey primary key (id),
  constraint object_subscriptions_object_id_user_id_subscription_type_key unique (object_id, user_id, subscription_type),
  constraint object_subscriptions_object_id_fkey foreign KEY (object_id) references core.unified_objects (id) on delete CASCADE,
  constraint object_subscriptions_user_id_fkey foreign KEY (user_id) references identity.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_object_subscriptions_object on core.object_subscriptions using btree (object_id) TABLESPACE pg_default;

create index IF not exists idx_object_subscriptions_user on core.object_subscriptions using btree (user_id) TABLESPACE pg_default;







create table core.object_tags (
  id uuid not null default gen_random_uuid (),
  object_id uuid not null,
  tag character varying(100) not null,
  tag_category character varying(50) null,
  color character varying(20) null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  organization_id uuid null,
  constraint object_tags_pkey primary key (id),
  constraint object_tags_object_id_tag_key unique (object_id, tag),
  constraint object_tags_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint object_tags_object_id_fkey foreign KEY (object_id) references core.unified_objects (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_object_tags_category on core.object_tags using btree (tag_category) TABLESPACE pg_default;

create index IF not exists idx_object_tags_object on core.object_tags using btree (object_id) TABLESPACE pg_default;

create index IF not exists idx_object_tags_tag on core.object_tags using btree (tag) TABLESPACE pg_default;











create table unified.contacts (
  id uuid not null,
  organization_id uuid not null,
  display_id text null,
  name text not null,
  email text null,
  phone text null,
  status text not null default 'active'::text,
  contact_type text not null default 'person'::text,
  module text not null default 'core'::text,
  lifecycle_stage text null,
  vertical text null,
  vertical_payload jsonb null default '{}'::jsonb,
  details jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  updated_by uuid null,
  persona_type text null default 'standard'::text,
  details__title text GENERATED ALWAYS as ((details #>> '{title}'::text[])) STORED null,
  search_vector tsvector GENERATED ALWAYS as (
    setweight(
      to_tsvector(
        'simple'::regconfig,
        (
          (
            (
              (
                (
                  (COALESCE(display_id, ''::text) || ' '::text) || COALESCE(name, ''::text)
                ) || ' '::text
              ) || COALESCE(email, ''::text)
            ) || ' '::text
          ) || COALESCE((details #>> '{title}'::text[]), ''::text)
        )
      ),
      'A'::"char"
    )
  ) STORED null,
  constraint contacts_pkey primary key (id),
  constraint contacts_display_id_key unique (display_id),
  constraint contacts_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint contacts_id_fkey foreign KEY (id) references core.unified_objects (id) on delete CASCADE,
  constraint contacts_organization_id_fkey foreign KEY (organization_id) references identity.organizations (id),
  constraint contacts_updated_by_fkey foreign KEY (updated_by) references identity.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_contacts_org on unified.contacts using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_contacts_type on unified.contacts using btree (contact_type) TABLESPACE pg_default;

create index IF not exists idx_contacts_vertical on unified.contacts using btree (vertical) TABLESPACE pg_default;

create index IF not exists idx_contacts_details on unified.contacts using gin (details) TABLESPACE pg_default;

create index IF not exists idx_contacts_workers on unified.contacts using btree (organization_id, id) TABLESPACE pg_default
where
  (contact_type = 'worker'::text);

create index IF not exists idx_contacts_external on unified.contacts using btree (organization_id, id) TABLESPACE pg_default
where
  (contact_type = 'external'::text);

create index IF not exists idx_contacts_agents on unified.contacts using btree (organization_id, id) TABLESPACE pg_default
where
  (contact_type = 'agent'::text);

create index IF not exists idx_contacts_employees on unified.contacts using btree (organization_id, id) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'employee'::text)
  );

create index IF not exists idx_contacts_contractors on unified.contacts using btree (organization_id, id) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'contractor'::text)
  );

create index IF not exists idx_contacts_leads on unified.contacts using btree (organization_id, id) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (lifecycle_stage = 'lead'::text)
  );

create index IF not exists idx_contacts_customers on unified.contacts using btree (organization_id, id) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (lifecycle_stage = 'customer'::text)
  );

create index IF not exists idx_contractors_search_vec on unified.contacts using gin (search_vector) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'contractor'::text)
  );

create index IF not exists idx_contractors_universal_timeline on unified.contacts using btree (organization_id, created_at desc, id) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'contractor'::text)
  );

create index IF not exists idx_contractors_my_created_by_items on unified.contacts using btree (organization_id, created_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'contractor'::text)
  );

create index IF not exists idx_contractors_my_updated_by_items on unified.contacts using btree (organization_id, updated_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'contractor'::text)
  );

create index IF not exists idx_contractors_status_board on unified.contacts using btree (organization_id, status, created_at desc) INCLUDE (name, display_id) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'contractor'::text)
  );

create index IF not exists idx_customers_b2b_search_vec on unified.contacts using gin (search_vector) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (persona_type = 'customer_b2b'::text)
  );

create index IF not exists idx_customers_b2b_universal_timeline on unified.contacts using btree (organization_id, created_at desc, id) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (persona_type = 'customer_b2b'::text)
  );

create index IF not exists idx_customers_b2b_my_created_by_items on unified.contacts using btree (organization_id, created_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (persona_type = 'customer_b2b'::text)
  );

create index IF not exists idx_customers_b2b_my_updated_by_items on unified.contacts using btree (organization_id, updated_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (persona_type = 'customer_b2b'::text)
  );

create index IF not exists idx_customers_b2b_status_board on unified.contacts using btree (organization_id, status, created_at desc) INCLUDE (name, display_id) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (persona_type = 'customer_b2b'::text)
  );

create index IF not exists idx_prospects_search_vec on unified.contacts using gin (search_vector) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (lifecycle_stage = 'opportunity'::text)
  );

create index IF not exists idx_prospects_universal_timeline on unified.contacts using btree (organization_id, created_at desc, id) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (lifecycle_stage = 'opportunity'::text)
  );

create index IF not exists idx_prospects_my_created_by_items on unified.contacts using btree (organization_id, created_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (lifecycle_stage = 'opportunity'::text)
  );

create index IF not exists idx_prospects_my_updated_by_items on unified.contacts using btree (organization_id, updated_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (lifecycle_stage = 'opportunity'::text)
  );

create index IF not exists idx_prospects_status_board on unified.contacts using btree (organization_id, status, created_at desc) INCLUDE (name, display_id) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (lifecycle_stage = 'opportunity'::text)
  );

create index IF not exists idx_agents_search_vec on unified.contacts using gin (search_vector) TABLESPACE pg_default
where
  (contact_type = 'agent'::text);

create index IF not exists idx_agents_universal_timeline on unified.contacts using btree (organization_id, created_at desc, id) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (contact_type = 'agent'::text);

create index IF not exists idx_agents_my_created_by_items on unified.contacts using btree (organization_id, created_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (contact_type = 'agent'::text);

create index IF not exists idx_agents_my_updated_by_items on unified.contacts using btree (organization_id, updated_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (contact_type = 'agent'::text);

create index IF not exists idx_agents_status_board on unified.contacts using btree (organization_id, status, created_at desc) INCLUDE (name, display_id) TABLESPACE pg_default
where
  (contact_type = 'agent'::text);

create index IF not exists idx_workers_search_vec on unified.contacts using gin (search_vector) TABLESPACE pg_default
where
  (contact_type = 'worker'::text);

create index IF not exists idx_workers_universal_timeline on unified.contacts using btree (organization_id, created_at desc, id) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (contact_type = 'worker'::text);

create index IF not exists idx_workers_my_created_by_items on unified.contacts using btree (organization_id, created_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (contact_type = 'worker'::text);

create index IF not exists idx_workers_my_updated_by_items on unified.contacts using btree (organization_id, updated_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (contact_type = 'worker'::text);

create index IF not exists idx_workers_status_board on unified.contacts using btree (organization_id, status, created_at desc) INCLUDE (name, display_id) TABLESPACE pg_default
where
  (contact_type = 'worker'::text);

create index IF not exists idx_customers_b2c_search_vec on unified.contacts using gin (search_vector) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (persona_type = 'customer_b2c'::text)
  );

create index IF not exists idx_customers_b2c_universal_timeline on unified.contacts using btree (organization_id, created_at desc, id) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (persona_type = 'customer_b2c'::text)
  );

create index IF not exists idx_customers_b2c_my_created_by_items on unified.contacts using btree (organization_id, created_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (persona_type = 'customer_b2c'::text)
  );

create index IF not exists idx_customers_b2c_my_updated_by_items on unified.contacts using btree (organization_id, updated_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (persona_type = 'customer_b2c'::text)
  );

create index IF not exists idx_customers_b2c_status_board on unified.contacts using btree (organization_id, status, created_at desc) INCLUDE (name, display_id) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (persona_type = 'customer_b2c'::text)
  );

create index IF not exists idx_partners_search_vec on unified.contacts using gin (search_vector) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (lifecycle_stage = 'partner'::text)
  );

create index IF not exists idx_partners_universal_timeline on unified.contacts using btree (organization_id, created_at desc, id) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (lifecycle_stage = 'partner'::text)
  );

create index IF not exists idx_partners_my_created_by_items on unified.contacts using btree (organization_id, created_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (lifecycle_stage = 'partner'::text)
  );

create index IF not exists idx_partners_my_updated_by_items on unified.contacts using btree (organization_id, updated_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (lifecycle_stage = 'partner'::text)
  );

create index IF not exists idx_partners_status_board on unified.contacts using btree (organization_id, status, created_at desc) INCLUDE (name, display_id) TABLESPACE pg_default
where
  (
    (contact_type = 'external'::text)
    and (lifecycle_stage = 'partner'::text)
  );

create index IF not exists idx_employees_search_vec on unified.contacts using gin (search_vector) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'employee'::text)
  );

create index IF not exists idx_employees_universal_timeline on unified.contacts using btree (organization_id, created_at desc, id) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'employee'::text)
  );

create index IF not exists idx_employees_my_created_by_items on unified.contacts using btree (organization_id, created_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'employee'::text)
  );

create index IF not exists idx_employees_my_updated_by_items on unified.contacts using btree (organization_id, updated_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'employee'::text)
  );

create index IF not exists idx_employees_status_board on unified.contacts using btree (organization_id, status, created_at desc) INCLUDE (name, display_id) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'employee'::text)
  );

create index IF not exists idx_consultants_search_vec on unified.contacts using gin (search_vector) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'consultant'::text)
  );

create index IF not exists idx_consultants_universal_timeline on unified.contacts using btree (organization_id, created_at desc, id) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'consultant'::text)
  );

create index IF not exists idx_consultants_my_created_by_items on unified.contacts using btree (organization_id, created_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'consultant'::text)
  );

create index IF not exists idx_consultants_my_updated_by_items on unified.contacts using btree (organization_id, updated_by, created_at desc) INCLUDE (name, display_id, status) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'consultant'::text)
  );

create index IF not exists idx_consultants_status_board on unified.contacts using btree (organization_id, status, created_at desc) INCLUDE (name, display_id) TABLESPACE pg_default
where
  (
    (contact_type = 'worker'::text)
    and (persona_type = 'consultant'::text)
  );









create table unified.organizations (
  id uuid not null,
  organization_id uuid not null,
  display_id text null,
  name text not null,
  short_code text null,
  domain text null,
  status text not null default 'active'::text,
  details jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  updated_by uuid null,
  constraint organizations_pkey primary key (id),
  constraint organizations_display_id_key unique (display_id),
  constraint organizations_short_code_key unique (short_code),
  constraint organizations_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint organizations_organization_id_fkey foreign KEY (organization_id) references identity.organizations (id),
  constraint organizations_updated_by_fkey foreign KEY (updated_by) references identity.users (id)
) TABLESPACE pg_default;








create table unified.projects (
  id uuid not null,
  organization_id uuid not null,
  display_id text null,
  name text not null,
  status text not null default 'planned'::text,
  module text not null default 'blueprint'::text,
  project_type text null,
  details jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  updated_by uuid null,
  project_source text null default 'manual'::text,
  raci jsonb null default '{}'::jsonb,
  vertical text null,
  vertical_payload jsonb null default '{}'::jsonb,
  constraint projects_pkey primary key (id),
  constraint projects_display_id_key unique (display_id),
  constraint projects_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint projects_id_fkey foreign KEY (id) references core.unified_objects (id) on delete CASCADE,
  constraint projects_organization_id_fkey foreign KEY (organization_id) references identity.organizations (id),
  constraint projects_updated_by_fkey foreign KEY (updated_by) references identity.users (id)
) TABLESPACE pg_default;







create table unified.tasks (
  id uuid not null,
  organization_id uuid not null,
  display_id text null,
  name text not null,
  status text not null default 'open'::text,
  priority text null default 'medium'::text,
  module text not null default 'blueprint'::text,
  details jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  updated_by uuid null,
  task_source text null default 'manual'::text,
  raci jsonb null default '{}'::jsonb,
  pert_estimates jsonb null default '{}'::jsonb,
  vertical text null,
  vertical_payload jsonb null default '{}'::jsonb,
  constraint tasks_pkey primary key (id),
  constraint tasks_display_id_key unique (display_id),
  constraint tasks_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint tasks_id_fkey foreign KEY (id) references core.unified_objects (id) on delete CASCADE,
  constraint tasks_organization_id_fkey foreign KEY (organization_id) references identity.organizations (id),
  constraint tasks_updated_by_fkey foreign KEY (updated_by) references identity.users (id)
) TABLESPACE pg_default;










create table unified.tickets (
  id uuid not null,
  organization_id uuid not null,
  name text not null,
  email text null,
  phone text null,
  status text not null default 'open'::text,
  contact_type text not null default 'external'::text,
  module text not null default 'esm'::text,
  lifecycle_stage text null,
  vertical text null,
  vertical_payload jsonb null default '{}'::jsonb,
  details jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  updated_by uuid null,
  constraint tickets_pkey primary key (id),
  constraint tickets_created_by_fkey foreign KEY (created_by) references identity.users (id),
  constraint tickets_organization_id_fkey foreign KEY (organization_id) references identity.organizations (id),
  constraint tickets_updated_by_fkey foreign KEY (updated_by) references identity.users (id)
) TABLESPACE pg_default;