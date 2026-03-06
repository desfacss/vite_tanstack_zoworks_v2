create table public.doc_common_templates (
  created_at timestamp with time zone not null default now(),
  settings jsonb null,
  name text null,
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  constraint doc_common_template_pkey primary key (id)
) TABLESPACE pg_default;






CREATE  TABLE public.doc_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NULL DEFAULT now(),
  name character varying(255) NOT NULL,
  type_id text NOT NULL,
  data_schema jsonb NOT NULL,
  ui_schema jsonb NOT NULL,
  form_type character varying(50) NULL,
  x_next_step character varying(255) NULL,
  x_db_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NULL,
  org_notes text NULL,
  organization_id uuid NULL,
  data_config jsonb NULL DEFAULT '{}'::jsonb,
  notes-23aug jsonb NULL,
  CONSTRAINT doc_forms_pkey PRIMARY KEY (id),
  CONSTRAINT doc_forms_unique_type_id_per_org UNIQUE (organization_id, type_id)
) TABLESPACE pg_default;





create table public.doc_templates (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  document_type_id uuid null,
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamp with time zone null default now(),
  created_by uuid null,
  updated_at timestamp with time zone null default now(),
  updated_by uuid null,
  styles jsonb null,
  notes jsonb null,
  template_config jsonb null,
  doc_common_template_id uuid null,
  constraint doc_templates_pkey primary key (id),
  constraint doc_templates_doc_common_template_id_fkey foreign KEY (doc_common_template_id) references doc_common_templates (id),
  constraint doc_templates_document_type_id_fkey foreign KEY (document_type_id) references doc_forms (id) on delete CASCADE
) TABLESPACE pg_default;

create unique INDEX IF not exists doc_templates_unique_default_idx on public.doc_templates using btree (organization_id, document_type_id) TABLESPACE pg_default
where
  (is_default = true);