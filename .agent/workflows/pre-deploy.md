---
description: Pre-production deployment checklist
---

# /pre-deploy Workflow

// turbo-all

**Trigger phrases**: "pre-deploy", "before push", "production check"

Pre-production checklist to run before pushing to Vercel.

---

## Phase 1: Build Verification

- [ ] `yarn build` passes without errors
- [ ] `yarn tsc --noEmit` passes (no TypeScript errors)
- [ ] No chunk size warnings above acceptable limits

---

## Phase 2: Code Quality

- [ ] No `console.log` left (except intentional debugging)
- [ ] No `console.error` or `console.warn` in production code
- [ ] All `// TODO` comments are documented or resolved

```bash
# Check for console statements
grep -r "console\." src/ --include="*.tsx" --include="*.ts" | grep -v "// ok"
```

---

## Phase 3: Architecture Compliance

- [ ] Check `docs/architecture/verification-checklist.md` for blocking items
- [ ] Check `docs/architecture/technical_debt.md` for critical open items
- [ ] Core has zero imports from modules:
  ```bash
  grep -r "from '@/modules/" src/core/ --include="*.tsx" --include="*.ts"
  ```

---

## Phase 4: PWA & Assets

- [ ] PWA manifest is valid (`public/manifest.json`)
- [ ] Service worker builds correctly
- [ ] Large async chunks excluded from precache

---

## Phase 5: Environment

- [ ] `.env.production` has correct values
- [ ] All environment variables documented in `docs/guides/deployment.md`
- [ ] No secrets committed to git

---

## Phase 6: Final Check

- [ ] `git status` shows only intended changes
- [ ] Commit message follows convention: `feat:`, `fix:`, `chore:`, etc.
- [ ] Branch is up to date with main

---

## Post-Deploy Verification

After Vercel deployment:
- [ ] App loads without console errors
- [ ] Login flow works
- [ ] At least one entity page renders correctly

---

*Last Updated: 2025-12-25*
