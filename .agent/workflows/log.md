---
description: Log session progress and create handoff summary for next session
---

# /log Workflow

// turbo-all

**Trigger phrases**: "log", "save progress", "end session", "handoff"

Create a timestamped log summarizing what was accomplished since the last log.

---

## When to Run

- End of work session
- Before switching to different task area
- At major milestones
- Before taking a break

---

## Phase 1: Find Last Log

```bash
# Find the most recent log
ls -t docs/logs/2025-*/*.md | head -1
```

---

## Phase 2: Create New Log

Create file: `docs/logs/YYYY-MM/YYYY-MM-DD-HHMM.md`

### Log Template

```markdown
# Session Log: YYYY-MM-DD HH:MM

## Summary
One-paragraph overview of what was accomplished.

## Changes Made

### Files Created
- `path/to/file.ts` — description

### Files Modified  
- `path/to/file.ts` — what changed

### Files Archived
- `path/to/file.ts` — moved to `.archive/`

## Decisions Made
- Decision 1: rationale
- Decision 2: rationale

## Next Steps
- [ ] Pending task 1
- [ ] Pending task 2

## Context for Next Session
Key information the next agent session needs to know.

---
*Session Duration: ~Xh*
*Previous Log: [link to previous]*
```

---

## Phase 3: Update Progress Tracker

Update `docs/logs/PROGRESS.md` with:
- Current status summary
- Link to latest log

---

## Example Log

```markdown
# Session Log: 2025-12-25 06:30

## Summary
Consolidated documentation, implemented workflow enhancements, and created Antigravity enterprise docs.

## Changes Made

### Files Created
- `docs/antigravity_for_enterprise_data/*.md` — agent architecture docs
- `.agent/workflows/pre-deploy.md` — new deployment workflow

### Files Modified
- `.agent/workflows/add-component.md` — added i18n, ActionBar checks

### Files Archived
- `modular_development_guide.md` → `.archive/`
- Restructure docs → `.archive/restructure-history/`

## Decisions Made
- Use `.archive/` instead of deleting files
- Consolidate workflows from 6 → 5

## Next Steps
- [ ] Deploy to Vercel and verify
- [ ] Complete Leaflet/Cytoscape lazy loading

## Context for Next Session
Documentation is now consolidated. Workflows are enhanced. 
Ready for production deployment.

---
*Session Duration: ~2h*
*Previous Log: docs/logs/2025-12/2025-12-24.md*
```

---

*Last Updated: 2025-12-25*
