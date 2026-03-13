# Onboarding UI — Phased Implementation Plan (V5)

> Prerequisite: backend RPCs from `onboarding_backend_spec.md` must be deployed before phases that call them.

---

## Phase 1 — Fix `WebRegister.tsx` Auth Guard & Route Structure
**Goal**: Ensure `/web_register` is accessible without login, and create the `/sign_up` alias.

### 1a — Move `WebRegister` outside `AuthGuard`

**File**: `src/routes/index.tsx`

**Problem**: `/web_register` is inside the `<AuthGuard>` block. If `AuthGuard` redirects unauthenticated users to login, cold-inbound prospects are locked out.

**Change**:
```tsx
// BEFORE: inside <Route element={<AuthGuard/>}>
<Route path="/web_register" element={<WebRegister />} />

// AFTER: at the top level, alongside public routes
<Route element={<PublicLayout />}>
  <Route path="/" element={<Home />} />
  <Route path="/web_register" element={<WebRegister />} />
  <Route path="/sign_up" element={<WebRegister />} />  {/* Vector A alias */}
</Route>
```

**Data / Tables**: None — routing only.

**Acceptance**: Navigate to `/web_register` without a session cookie → page loads (no redirect to `/login`).

---

### 1b — Add `/sign_up` Route as a Vector A alias

The same `WebRegister` component handles both `/web_register` and `/sign_up`. The difference is detected via URL params (`org_id` present → skip to Step 2).

No new component needed — just a second `<Route>` pointing to `WebRegister`.

---

## Phase 2 — Vector A: Org Pre-fill from URL `?org_id`
**Goal**: When a prospect arrives at `/sign_up?org_id=<uuid>`, the UI fetches the org name from the DB and pre-fills Step 2 without showing Step 1.

**Depends on**: `public.onboard_get_org_summary` RPC being deployed (Backend spec §1).

### Changes in `WebRegister.tsx`

**Current behavior** (`useEffect` lines 27–34):
```tsx
// reads org_name directly from URL — no DB fetch
if (orgId) {
  setSelectedAccount({ id: orgId, name: orgName, similarity_score: 1 });
  setStep(2);
}
```

**New behavior**:
```tsx
useEffect(() => {
  const orgId = searchParams.get('org_id');
  if (!orgId) return;

  // Fetch org name safely from DB (anon-callable RPC)
  supabase.rpc('onboard_get_org_summary', { p_account_id: orgId })
    .then(({ data, error }) => {
      if (error || !data) {
        message.error('Invalid or expired registration link.');
        return;
      }
      setSelectedAccount({ id: data.id, name: data.name, similarity_score: 1 });
      setStep(2);
    });
}, [searchParams]);
```

**Data flow**:
```
URL param: org_id (uuid)
    ↓
public.onboard_get_org_summary(p_account_id)
    ↓ reads: crm.accounts (id, account_name)
    ↓ returns: { id, name }
UI: pre-fills account display in Step 2 card
```

**Tables read**: `crm.accounts`  
**Tables written**: None

**Acceptance**: 
- `/sign_up?org_id=<valid-uuid>` → shows Step 2 with org name pre-filled, Step 1 (search) never shown.
- `/sign_up?org_id=<invalid-uuid>` → shows error toast, does not crash.

---

## Phase 3 — Module Selector UI (Vectors B & C)
**Goal**: User can see and tick which modules they want. Drives `p_requested_modules` in the payload.

**Depends on**: Nothing new backend-side (the field already needs to be added to the RPC — Backend spec §4).

### New component: `ModuleSelector.tsx`
**Location**: `src/pages/auth/components/ModuleSelector.tsx`

```tsx
// Renders a card-grid of available modules with checkboxes
// Props:
//   preSelected: string[]   ← from URL ?modules=crm,engage
//   onChange: (modules: string[]) => void

type Module = { key: string; label: string; icon: ReactNode; description: string }

const AVAILABLE_MODULES: Module[] = [
  { key: 'crm',       label: 'CRM',             icon: <Users/>,          description: 'Contact & Account management' },
  { key: 'engage',    label: 'Zoworks Engage',   icon: <MessageCircle/>,  description: 'WhatsApp inbox & campaigns' },
  { key: 'documents', label: 'E-Sign',           icon: <FileSignature/>,  description: 'Document signing' },
  { key: 'workforce', label: 'Workforce',        icon: <Briefcase/>,      description: 'Leave, timesheets, expenses' },
];
```

UI: a 2×2 or 2×3 grid of cards. Each card is toggled on/off. Selected cards get a highlight border + checkmark badge.

### Integration into `WebRegister.tsx`
Add `ModuleSelector` to **Step 2** of the form (between the org card and the admin details):

```tsx
// State
const [selectedModules, setSelectedModules] = useState<string[]>([]);

// Pre-fill from URL (Vector A)
useEffect(() => {
  const modulesParam = searchParams.get('modules');
  if (modulesParam) setSelectedModules(modulesParam.split(','));
}, [searchParams]);

// In the form, between org card and admin details:
<ModuleSelector
  preSelected={selectedModules}
  onChange={setSelectedModules}
/>

// In onFinish payload:
p_requested_modules: selectedModules   // replaces the URL-only approach
```

**Data flow**:
```
URL ?modules=crm,engage  →  pre-check those modules in UI
User ticks/unticks       →  selectedModules state
onFinish                 →  p_requested_modules: ["crm","engage"]
                             ↓
                  public.onboard_request_zoworks_account
                             ↓
              identity.organizations.settings['requested_modules']
```

**Tables written** (via RPC): `identity.organizations` (settings jsonb field)

**Acceptance**:
- At least one module must be selected (form validation).
- Vector A URL with `?modules=engage,crm` → those two pre-checked.
- Vector C (new org) → all modules unchecked by default.

---

## Phase 4 — Admin Approval: Show Requested Modules & Module Editor
**Goal**: Admin sees what was requested, and can modify modules before clicking Approve.

**File**: `src/modules/admin/pages/OnboardingRequests.tsx`

**Depends on**: Backend spec §5 — `identity.onboard_promote_to_tenant` accepting `p_approved_modules`.

### 4a — Show `requested_modules` in the table

Add a column to the existing `columns` array:

```tsx
{
  title: 'Requested Modules',
  key: 'requested_modules',
  render: (_, record) => (
    <Space wrap>
      {(record.requested_modules || []).map((mod: string) => (
        <Tag color="blue" key={mod}>{mod.toUpperCase()}</Tag>
      ))}
    </Space>
  )
}
```

**Data flow**:
```
identity.organizations.settings['requested_modules']   (already fetched via L4)
    ↓ parsed in formattedRequests map
    ↓ added to OnboardingRequest interface: requested_modules: string[]
    ↓ rendered as Tags in table row
```

**Interface update**:
```ts
interface OnboardingRequest {
  // ... existing fields ...
  requested_modules: string[];   // ← add this
}

// In the map():
requested_modules: org.settings?.requested_modules || []
```

**Tables read**: `identity.organizations` (settings column) — already fetched, just not displayed.

### 4b — Module editor in approval flow

Replace the direct "Approve" button with a two-step confirm that allows module editing.

**Approach**: Open an `<Modal>` on "Approve" click:

```
[ Approve ] click
    ↓
Modal: "Confirm Approval for Acme Corp"
  ┌─────────────────────────────────────┐
  │ Modules to Activate:                │
  │  [x] CRM  [x] Engage  [ ] E-Sign   │  ← editable checkboxes
  │                                     │
  │  [ Cancel ]          [ Confirm ✓ ]  │
  └─────────────────────────────────────┘
    ↓ on Confirm
identity.onboard_promote_to_tenant(p_org_id, p_approved_modules: [...])
```

**State in component**:
```ts
const [approveModal, setApproveModal] = useState<{
  open: boolean;
  record: OnboardingRequest | null;
  modules: string[];
}>({ open: false, record: null, modules: [] });
```

**Data flow**:
```
Admin clicks Approve on row with requested_modules: ["crm","engage"]
    ↓
Modal opens, pre-populates checkboxes with requested_modules
Admin ticks/unticks → modules state updated
Admin clicks Confirm
    ↓
identity.onboard_promote_to_tenant(
  p_org_id: record.id,
  p_approved_modules: ["crm","engage","esign"]   ← admin's final choice
)
```

**Tables written** (via RPC): 
- `identity.organizations` (is_active = true)
- `identity.modules` (new row with sub_modules__* flags)
- `identity.users` / `identity.organization_users`

### 4c — Proper Rejection State

Fix `handleReject` to set a meaningful rejection status:

```ts
// Instead of re-setting is_active: false (already false), set a rejection flag
const { error } = await supabase.schema('core').rpc('api_new_core_upsert_data', {
  table_name: 'identity.organizations',
  data: {
    id: request.id,
    settings: { ...existingSettings, status: 'REJECTED', rejected_at: new Date().toISOString() }
  }
});

// fetchRequests() should filter: IS_ACTIVE = false AND settings->>'status' != 'REJECTED'
```

**Tables written**: `identity.organizations` (settings jsonb)

**Acceptance**:
- Rejected requests disappear from the pending list.
- Approved org shows `identity.modules` row in DB with correct sub_modules flags.

---

## Phase 5 — Vector A Dedicated "Fast Track" Page (Optional Polish)
**Goal**: A cleaner, minimal page for marketing link recipients — shows only first/last name, email, mobile. No search, no module picker (modules pre-set from URL).

**When**: After Phases 1–4 are stable. This is UI polish, not critical path.

**Approach**: 
- Create `src/pages/auth/FastTrackRegister.tsx` — a stripped-down version of `WebRegister` that renders only the admin details form (Step 2 only), with modules shown as read-only badges from the URL.
- Register at `/sign_up` route instead of reusing `WebRegister`.
- Reuse the same `onFinish` logic (calls same RPCs).

**Data flow**:
```
?org_id=uuid       → onboard_get_org_summary → org name displayed
?modules=crm,engage → shown as read-only Tags (not editable)
User fills: firstName, lastName, email, mobile
Submit → onboard_request_zoworks_account
```

---

## Summary: Phase → Files → Tables

| Phase | Files Changed | Tables Read | Tables Written |
|---|---|---|---|
| 1 | `routes/index.tsx` | — | — |
| 2 | `WebRegister.tsx` | `crm.accounts` | — |
| 3 | `WebRegister.tsx`, new `ModuleSelector.tsx` | — | `identity.organizations` (via RPC) |
| 4a | `OnboardingRequests.tsx` | `identity.organizations` | — |
| 4b | `OnboardingRequests.tsx` | — | `identity.organizations`, `identity.modules`, `identity.users`, `identity.organization_users` |
| 4c | `OnboardingRequests.tsx` | — | `identity.organizations` |
| 5 | new `FastTrackRegister.tsx`, `routes/index.tsx` | `crm.accounts` | `identity.organizations` (via RPC) |

## Dependency Chain

```
Backend fixes must land first:
  §1 onboard_get_org_summary       → unblocks Phase 2
  §4 requested_modules in settings → unblocks Phase 4a
  §5 p_approved_modules in promote → unblocks Phase 4b

Frontend can be done in parallel for Phases 1 & 3.
```
