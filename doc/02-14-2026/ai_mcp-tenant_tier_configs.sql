create table ai_mcp.tenant_tier_configs (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  tier text not null,
  provider text not null,
  model_name text not null,
  api_key text null,
  temperature double precision null,
  max_tokens integer null,
  search_vector tsvector GENERATED ALWAYS as (
    setweight(
      to_tsvector(
        'simple'::regconfig,
        COALESCE(model_name, ''::text)
      ),
      'A'::"char"
    )
  ) STORED null,
  constraint tenant_tier_configs_pkey primary key (id),
  constraint tenant_tier_configs_organization_id_tier_key unique (organization_id, tier),
  constraint tenant_tier_configs_tier_check check (
    (
      tier = any (array['mini'::text, 'med'::text, 'max'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_ai_mcp_tenant_tier_configs_search_gin on ai_mcp.tenant_tier_configs using gin (search_vector) TABLESPACE pg_default;