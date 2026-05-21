# Platform Constitution — Immutable Rules

> These rules apply to ALL agents, ALL modules, ALL sessions.  
> They cannot be overridden by feature specs, task instructions, or user requests.  
> If a task conflicts with a rule here, surface the conflict. Do not silently violate it.

---

## 1. Database Rules

### 1.1 Tenant Isolation (CRITICAL)
- **Every business table MUST have `organization_id uuid NOT NULL`** (exception: `identity.users`, `identity.organizations`, global config tables — these have custom RLS).
- **RLS must be enabled** (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) on every tenant-scoped table.
- **Standard V5 policy names**: `Global_Read_V5`, `Tenant_Write_V5`, `Tenant_Update_V5`, `Tenant_Delete_V5`.
- Apply policies using `identity.rls_bootstrap_entity_policy()` — never hand-write policies.

### 1.2 Audit Columns (ALL tables)
Every table must include: `id uuid`, `organization_id uuid`, `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`, `created_by uuid`, `updated_by uuid`.

### 1.3 Standard V5 Columns (auto-provisioned by Composer)
`is_active boolean DEFAULT true`, `intent_type text`, `state_category text`, `is_on_hold boolean DEFAULT false`.

### 1.4 Column Conventions
- **NEVER add**: `status text` (use `is_active + stage_id`), `intent_category` (use `intent_type`).
- **Extended metadata** goes in `details jsonb DEFAULT '{}'`, NOT in custom JSONB blobs.
- **JSONB paths** stored as arrays `["key", "subkey"]`, not dot strings.

### 1.5 No Direct Auth Admin Calls from Client
- The client NEVER calls `supabase.auth.admin.*` directly.
- Auth operations (invite, reset) go through **Supabase Edge Functions** only.

### 1.6 Function Naming
- Active functions: no prefix (e.g., `onboard_invite_user_to_org`).
- Historical snapshots: `zz_` prefix. Deprecated: `x_` prefix.
- Active functions MUST NOT have `_v{N}` suffix.

### 1.7 API Layer
- **All reads** go through `{schema}.v_{entity}` (L5 views) via `core.api_new_fetch_entity_records()`.
- **All writes** go through `core.api_new_core_upsert_data()` or domain-specific RPCs.
- **No direct table access** from the frontend — always use `.rpc()` or the L4/L5 abstraction.

---

## 2. Backend Rules

### 2.1 Edge Functions
- Used ONLY for: Supabase Auth operations, external API calls, webhook handlers.
- Internal data operations belong in RPCs, not Edge Functions.
- Every Edge Function MUST document its JWT verification status in the SDD.

### 2.2 RPCs
- ALL RPCs must `RETURN JSONB` with a consistent `{status: "success" | "error"}` envelope.
- Use `SECURITY DEFINER` + explicit `SET search_path`.
- Include `EXCEPTION WHEN OTHERS THEN` blocks for non-fatal sub-operations.
- Document idempotency: can the RPC be safely called twice? What `ON CONFLICT` behavior applies?

### 2.3 Triggers
- Bonded extension provisioning (HR profile, unified contacts, etc.) uses `core.util_trg_provision_bonded_extension('{schema}.{table}')`.
- Triggers must be listed in `MODULE_SPEC.md` Section 4.3.

### 2.4 Migrations
- Migration files are numbered sequentially: `{NNN}_{description}.sql`.
- Never modify `wf_rules`, `wf_actions`, `esm_definitions` — they are compiled artifacts.
- Protected objects: generated columns, `analytics.*` views, optimized indexes.

---

## 3. Frontend Rules

### 3.1 Config Over Code
- Form changes go to `core.forms` table, NOT component code.
- Use `DynamicForm` / `RJSFCoreForm` for ALL standard CRUD unless custom UI is required.
- Custom components MUST be registered in `src/core/registry.ts`.

### 3.2 Styling
- Use CSS variables (`var(--color-*)`) only — no hardcoded colors.
- Lucide icons only — never `@ant-design/icons`.
- Do NOT modify `index.css` or theme files without explicit approval.

### 3.3 State Management
- TanStack Query for all server state.
- Query key format: `['{entity}', organizationId]` for tenant-scoped queries.
- After a mutation, invalidate the relevant query key — never manually mutate cache.

### 3.4 Auth / Session
- Use `useAuthStore()` to access `organization`, `user`, `location` context.
- JWT refresh required after org switch: `supabase.auth.refreshSession()`.

### 3.5 No Browser Testing by Agent
- Verify with `yarn build` and `yarn tsc --noEmit` only.
- Never open the browser. User tests manually.

---

## 4. SDD Rules

### 4.1 Spec-Anchored Development
- Update the SDD FIRST, then write code.
- Every code change that alters behavior must have a corresponding `CHANGE_LOG.md` entry.

### 4.2 Test Phases (must run in order)
1. Phase 1: Schema exists, RLS enabled
2. Phase 2: RPCs execute and return expected shape
3. Phase 3: Triggers fire, bonded records provisioned
4. Phase 4: Edge Functions callable
5. Phase 5: Full E2E flow

### 4.3 File Format
- One `MODULE_SPEC.md` per module (the single source of truth).
- Separate `CHANGE_LOG.md` for spec evolution.
- Test files in `tests/` subfolder, organized by type.

### 4.4 Agent Session Start
Every agent session MUST:
1. Read this file (`01_CONSTITUTION.md`).
2. Read `modules/00_INDEX.md`.
3. Read the relevant `MODULE_SPEC.md` for the task at hand.

---

*Version: 1.0 — 2026-05-21*
