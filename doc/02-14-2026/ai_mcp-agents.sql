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
  semantics jsonb null default '{}'::jsonb,
  constraint agents_pkey primary key (agent_key),
  constraint agents_parent_agent_key_fkey foreign KEY (parent_agent_key) references ai_mcp.agents (agent_key)
) TABLESPACE pg_default;

create index IF not exists idx_ai_mcp_agents_universal_timeline on ai_mcp.agents using btree (organization_id, created_at desc, id) INCLUDE (name, description) TABLESPACE pg_default;