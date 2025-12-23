---
description: Run a comprehensive code health audit to find cleanup opportunities and architectural issues
---

# Code Health Audit Workflow

// turbo-all

Agentic workflow for performing recurring code health audits.

## When to Run
- Before major releases
- Monthly maintenance
- After large feature additions
- When onboarding new developers

---

## Phase 1: Detect Copy/Backup Files

```bash
# Find all copy files
fd --type f "*copy*" src/

# Find backup files
fd --type f "*.bak*" src/

# Find old/deprecated markers
fd --type f "*old*" src/
```

**Action**: Delete any files that are backup copies (confirm with user first)

---

## Phase 2: Check Icon Library Compliance

```bash
# Search for Ant Design icon usage
grep -r "@ant-design/icons" src/ --include="*.tsx" --include="*.ts"
```

**Action**: Replace with Lucide icons. Reference conversion table:
| Ant Design | Lucide |
|------------|--------|
| `PlusOutlined` | `Plus` |
| `EditOutlined` | `Pencil` |
| `DeleteOutlined` | `Trash2` |
| `CameraOutlined` | `Camera` |
| `UploadOutlined` | `Upload` |
| `FileOutlined` | `FileText` |
| `LinkOutlined` | `Link` |

---

## Phase 3: Find TODO/FIXME Comments

```bash
# Find all TODO comments
grep -r "TODO" src/ --include="*.tsx" --include="*.ts"

# Find all FIXME comments
grep -r "FIXME" src/ --include="*.tsx" --include="*.ts"
```

**Action**: Document findings in audit log. Optionally create tasks.

---

## Phase 4: Verify Module Structure

Each module in `src/modules/` should have:
```
module/
├── index.ts          # Required: Entry point
├── manifest.ts       # Required: Dependencies
├── registry.ts       # Required: Registration
├── README.md         # Required: Documentation
├── pages/            # Optional: Page components
├── components/       # Optional: Sub-components
├── i18n/             # Required: Translations
└── help/             # Required: Tour guides
```

```bash
# List all modules
ls src/modules/

# Check each module for required files
for module in admin catalog contracts core crm erp esm external fsm landing pos tickets wa wms workforce; do
  echo "=== $module ==="
  ls src/modules/$module/
done
```

**Action**: Create missing required files from templates

---

## Phase 5: Check Core Independence

```bash
# Verify no module imports in core
grep -r "from '@/modules/" src/core/ --include="*.tsx" --include="*.ts"
```

**Expected**: 0 results (core should not import from modules)

---

## Phase 6: Bundle Size Check

```bash
# Build and analyze
yarn build

# Check dist folder sizes
du -sh dist/*
```

**Targets**:
- Core bundle: < 200KB (challenging with Ant Design)
- No single chunk > 500KB

---

## Phase 7: Unused Exports Detection

```bash
# Run TypeScript with noUnusedLocals
yarn tsc --noEmit --noUnusedLocals 2>&1 | head -50
```

**Action**: Remove truly unused exports (be careful with dynamic imports)

---

## Phase 8: Document Findings

Create audit log at: `docs/log/YYYY-MM-DD-audit.md`

Template:
```markdown
# Code Health Audit Log - YYYY-MM-DD

## Summary
| Category | Items Found | Items Fixed |
|----------|-------------|-------------|
| Copy Files | X | X |
| Icon Violations | X | X |
| Module Gaps | X | X |
| TODOs | X | - |

## Actions Taken
(list what was fixed)

## Recommendations
(list what should be addressed later)
```

---

## Verification Checklist

- [ ] All copy files deleted
- [ ] No `@ant-design/icons` imports
- [ ] All modules have required structure
- [ ] Core has zero module imports
- [ ] `yarn build` passes
- [ ] Audit log created at `docs/log/`

---

## Post-Audit
1. Commit changes with message: `chore: code health audit YYYY-MM-DD`
2. Update `docs/architecture_status_report_dec_2025.md` if needed
3. Schedule next audit (recommended: monthly)
