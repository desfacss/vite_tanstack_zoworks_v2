# Archive/Stabilization — Implementation Plan (Archived)

**Session**: 2026-03-24 21:00–22:20 IST

This plan addresses standardization violations, architectural gaps, and remaining migration tasks identified in the project audit.

## Proposed Changes

### 1. Architecture Fixes
- Added a duplicate check to `registerNavItem` in `src/core/registry/index.ts` to prevent multiple entries during hot-reload.

### 2. Standardization & Styling (Archive & ESM)
- Replaced `@ant-design/icons` with `lucide-react` (size 14/16/18 as appropriate).
- Updated page wrappers to use `<div className="page-content layout-canvas"><div className="page-card">`.
- Replaced hardcoded colors (e.g., `#1890ff`) with `var(--color-primary)`.

### 3. Navigation & Routing
- Added entries for CRM (Accounts, Deals, Leads, Prospects) and Admin (Service Categories, Offerings, Types, Location Categories) in `menuConfig.json`.
- Added routes for the new Admin service categories in `routes/index.tsx`.

### 4. Component Porting (Channels Parity)
- Ported `Comments.tsx` and `CategorySelector.tsx` to `src/modules/archive/components/Networking/`.

### 5. i18n & Cleanup
- Implemented internationalization for the Archive module in `src/modules/archive/i18n/en.json`.
- Extracted GanttChart, TimelineChart, and CalendarChart to `src/modules/archive/components/SharedCharts/` to deduplicate code.

---

## Modified Files
- `src/core/registry/index.ts`
- `src/modules/archive/components/ProcessEditVisual.tsx`
- `src/modules/archive/components/Networking/Channels.tsx`
- `src/modules/archive/components/Networking/ChannelThread.tsx`
- `src/modules/archive/components/Networking/ChannelReplies.tsx`
- `src/modules/archive/components/Networking/PostForm.tsx`
- `src/modules/archive/components/Networking/Comments.tsx`
- `src/modules/archive/components/Networking/CategorySelector.tsx`
- `src/modules/archive/components/SharedCharts/GanttChart.tsx`
- `src/modules/archive/components/SharedCharts/TimelineChart.tsx`
- `src/modules/archive/components/SharedCharts/CalendarChart.tsx`
- `src/modules/archive/components/ProjectPlan/ProjectPlan.tsx`
- `src/modules/archive/components/Scheduler/index.tsx`
- `src/modules/archive/i18n/en.json`
- `src/config/menuConfig.json`
- `src/routes/index.tsx`
