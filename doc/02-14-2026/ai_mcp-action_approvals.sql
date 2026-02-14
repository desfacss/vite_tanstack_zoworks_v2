create table ai_mcp.action_approvals (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  session_id uuid not null,
  action_type text not null,
  description text null,
  parameters jsonb null default '{}'::jsonb,
  status text null default 'pending'::text,
  decided_by uuid null,
  decision_note text null,
  decided_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  search_vector tsvector GENERATED ALWAYS as (
    setweight(
      to_tsvector(
        'simple'::regconfig,
        COALESCE(description, ''::text)
      ),
      'A'::"char"
    )
  ) STORED null,
  constraint action_approvals_pkey primary key (id),
  constraint fk_approval_session foreign KEY (session_id) references ai_mcp.sessions (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_ai_mcp_action_approvals_universal_timeline on ai_mcp.action_approvals using btree (organization_id, created_at desc, id) INCLUDE (
  status,
  description,
  action_type,
  session_id,
  id,
  organization_id
) TABLESPACE pg_default;

create index IF not exists idx_ai_mcp_action_approvals_workflow_execution on ai_mcp.action_approvals using btree (organization_id, status, created_at desc) INCLUDE (
  description,
  action_type,
  session_id,
  decision_note
) TABLESPACE pg_default;