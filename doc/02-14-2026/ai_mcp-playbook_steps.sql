create table ai_mcp.playbook_steps (
  id uuid not null default gen_random_uuid (),
  playbook_id uuid null,
  position integer not null,
  name text not null,
  instruction text not null,
  required_tool_key text null,
  is_auto_execute boolean null default false,
  step_key text null,
  execution_logic jsonb null default '{}'::jsonb,
  dependencies text[] null default array[]::text[],
  search_vector tsvector GENERATED ALWAYS as (
    setweight(
      to_tsvector('simple'::regconfig, COALESCE(name, ''::text)),
      'A'::"char"
    )
  ) STORED null,
  constraint playbook_steps_pkey primary key (id),
  constraint playbook_steps_playbook_id_fkey foreign KEY (playbook_id) references ai_mcp.playbooks (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_playbook_steps_key on ai_mcp.playbook_steps using btree (playbook_id, step_key) TABLESPACE pg_default;