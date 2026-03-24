# Project Audit & Migration Gap Analysis (Archived)

**Session**: 2026-03-24 ~21:11–21:28 IST

## 1. Summary of Gaps

| Category | Status |
|---|---|
| Archive Module (Process Editor, Networking, Scheduler) | ✅ Done |
| ESM Ticketing (TicketForm, TicketSummary, AutomationLog) | ✅ Done |
| Admin Notifications, Commerce, E-com Shop | ✅ Done |
| CRM nav links (accounts, deals, leads) | 🟡 Routes work, **not in sidemenu** |
| Admin service routes (4 thin stubs) | ❌ Missing |
| WorkflowEditor (from auth/bolt) | ⚪ Deferred |
| Full Channels parity (Comments, CategorySelector) | 🟡 Partial |

## 2. Standardization Violations (vs. `/general-rules.md`)

1. **🔴 Ant Design icons** used in 7 archive files + 1 ESM file — rule says Lucide only
2. **🔴 Inline styles** throughout archive components (`style={{ padding: '24px' }}` etc.)
3. **🔴 Hardcoded colors** (`#1890ff`, `#fff`) — should use CSS variables
4. **🟡 Layout wrappers** missing (`page-content layout-canvas` / `page-card` classes)
5. **🟡 No i18n** for archive module — all labels are hardcoded English strings
6. **🟡 Two navigation systems** in parallel (static `menuConfig.json` + dynamic `AppRegistry`) — needs unification decision

## 3. Architecture Gap
The `registerNavItem` function in `core/registry/index.ts` has **no duplicate guard** — unlike `registerTab`/`registerAction`. Hot module reload duplicates nav items.

## 4. Cleanup Quick Wins
1. Replace Ant Design icons in archive module (7 files)
2. Add 4 CRM entries to `menuConfig.json` 
3. Add 4 Admin service routes
4. Fix archive page layout wrappers
5. Deduplicate `GanttChart.tsx` / `TimelineChart.tsx` (exist in both ProjectPlan and Scheduler)

## 5. Modified Files Recap
- `src/core/registry/index.ts`
- `src/core/components/Layout/Sider/navigation.tsx`
- `src/routes/index.tsx`
- `src/core/bootstrap/TenantResolver.ts`
- `src/modules/archive/registry.ts`
- `src/modules/archive/pages/ProcessEditor.tsx`
- `src/modules/archive/pages/Networking.tsx`
- `src/modules/archive/pages/ProjectPlanPage.tsx`
- `src/modules/archive/pages/SchedulerPage.tsx`
- `src/modules/archive/components/Networking/ChannelThread.tsx`
- `src/modules/archive/components/Networking/ChannelReplies.tsx`
