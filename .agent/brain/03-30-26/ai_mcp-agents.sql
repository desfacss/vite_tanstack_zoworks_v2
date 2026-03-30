create table ai_mcp.agents (
  agent_key text not null,
  name text not null,
  description text null,
  system_prompt text not null,
  role_level text null default 'specialist'::text,
  model_config jsonb null default '{"temp": 0.7, "model": "gemini-2.0-flash", "provider": "gemini"}'::jsonb,
  planning_config jsonb null default '{}'::jsonb,
  organization_id uuid null,
  is_active boolean null default true,
  parent_agent_key text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  required_module_key text null,
  id uuid null default gen_random_uuid (),
  planning_config__selection_logic__router ARRAY GENERATED ALWAYS as (
    NULLIF(
      core.met_util_cast_jsonb_array (
        (
          planning_config #> '{selection_logic,router}'::text[]
        )
      ),
      array[]::text[]
    )
  ) STORED null,
  planning_config__selection_logic__workflow ARRAY GENERATED ALWAYS as (
    NULLIF(
      core.met_util_cast_jsonb_array (
        (
          planning_config #> '{selection_logic,workflow}'::text[]
        )
      ),
      array[]::text[]
    )
  ) STORED null,
  planning_config__presentation_strategy__preferred_formats ARRAY GENERATED ALWAYS as (
    NULLIF(
      core.met_util_cast_jsonb_array (
        (
          planning_config #> '{presentation_strategy,preferred_formats}'::text[]
        )
      ),
      array[]::text[]
    )
  ) STORED null,
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
                    (
                      (COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text)
                    ) || ' '::text
                  ) || COALESCE(
                    (
                      (
                        planning_config #> '{selection_logic,router}'::text[]
                      )
                    )::text,
                    ''::text
                  )
                ) || ' '::text
              ) || COALESCE(
                (
                  (
                    planning_config #> '{selection_logic,workflow}'::text[]
                  )
                )::text,
                ''::text
              )
            ) || ' '::text
          ) || COALESCE(
            (
              (
                planning_config #> '{presentation_strategy,preferred_formats}'::text[]
              )
            )::text,
            ''::text
          )
        )
      ),
      'A'::"char"
    )
  ) STORED null,
  config jsonb null default '{}'::jsonb,
  agent_layer integer null default 3,
  domain text null default 'global'::text,
  capability_vector extensions.vector null,
  planning_config__agent_pattern ARRAY GENERATED ALWAYS as (
    NULLIF(
      core.met_util_cast_jsonb_array ((planning_config #> '{agent_pattern}'::text[])),
      array[]::text[]
    )
  ) STORED null,
  planning_config__allowed_patterns ARRAY GENERATED ALWAYS as (
    NULLIF(
      core.met_util_cast_jsonb_array ((planning_config #> '{allowed_patterns}'::text[])),
      array[]::text[]
    )
  ) STORED null,
  planning_config__routing_keywords ARRAY GENERATED ALWAYS as (
    NULLIF(
      core.met_util_cast_jsonb_array ((planning_config #> '{routing_keywords}'::text[])),
      array[]::text[]
    )
  ) STORED null,
  config__patterns ARRAY GENERATED ALWAYS as (
    NULLIF(
      core.met_util_cast_jsonb_array ((config #> '{patterns}'::text[])),
      array[]::text[]
    )
  ) STORED null,
  config__selection_logic__router ARRAY GENERATED ALWAYS as (
    NULLIF(
      core.met_util_cast_jsonb_array ((config #> '{selection_logic,router}'::text[])),
      array[]::text[]
    )
  ) STORED null,
  config__selection_logic__workflow ARRAY GENERATED ALWAYS as (
    NULLIF(
      core.met_util_cast_jsonb_array ((config #> '{selection_logic,workflow}'::text[])),
      array[]::text[]
    )
  ) STORED null,
  semantics jsonb null default '{}'::jsonb,
  created_by uuid null,
  updated_by uuid null,
  location_id uuid null,
  constraint agents_pkey1 primary key (agent_key),
  constraint agents_location_id_fkey foreign KEY (location_id) references identity.locations (id)
) TABLESPACE pg_default;

create index IF not exists idx_ai_agents_org_id on ai_mcp.agents using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_ai_agents_search on ai_mcp.agents using gin (search_vector) TABLESPACE pg_default;

create trigger trg_updated_at BEFORE
update on ai_mcp.agents for EACH row
execute FUNCTION update_updated_at_column ();