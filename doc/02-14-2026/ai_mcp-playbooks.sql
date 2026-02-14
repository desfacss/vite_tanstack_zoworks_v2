create table ai_mcp.playbooks (
  id uuid not null default gen_random_uuid (),
  name text not null,
  description text null,
  trigger_command text null,
  created_at timestamp with time zone null default now(),
  search_vector tsvector GENERATED ALWAYS as (
    setweight(
      to_tsvector(
        'simple'::regconfig,
        (
          (COALESCE(description, ''::text) || ' '::text) || COALESCE(name, ''::text)
        )
      ),
      'A'::"char"
    )
  ) STORED null,
  constraint playbooks_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_ai_mcp_playbooks_search_gin on ai_mcp.playbooks using gin (search_vector) TABLESPACE pg_default;