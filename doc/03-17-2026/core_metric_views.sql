create table core.metric_views (
  id uuid not null default extensions.uuid_generate_v4 (),
  rule_name text not null,
  description text null,
  dependencies text[] not null,
  definition text not null,
  created_at timestamp with time zone null default now(),
  is_active boolean null default true,
  module text null default ''::text,
  updated_at timestamp with time zone null default now(),
  constraint metric_views_pkey primary key (id),
  constraint metric_views_rule_name_key unique (rule_name)
) TABLESPACE pg_default;