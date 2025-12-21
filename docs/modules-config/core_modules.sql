create table core.modules (
  id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  prefix text not null,
  description text null,
  is_active boolean not null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  sub_modules jsonb null,
  settings jsonb null,
  notes jsonb null,
  constraint modules_pkey primary key (id),
  constraint modules_name_unique unique (name)
) TABLESPACE pg_default;

create index IF not exists idx_modules_name on core.modules using btree (name) TABLESPACE pg_default
where
  (is_active = true);

create trigger update_modules_updated_at BEFORE
update on core.modules for EACH row
execute FUNCTION update_updated_at_column ();