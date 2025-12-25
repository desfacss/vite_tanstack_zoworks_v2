# AI-Agentic Development Guide

> How to drive development with AI agents for the Zoworks SaaS Platform

---

## Vision: AI-Native Development

The platform is designed for **AI-first** development where:

1. **AI agents can understand the codebase** through clear conventions
2. **AI agents can add features** by following documented patterns
3. **AI agents can validate changes** against architecture rules
4. **Humans review and approve** strategic decisions

---

## Development Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│              AI-AGENTIC TASK COMPLETION CYCLE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. INTENT                                                      │
│     Human: "Add expense approval workflow to workforce"         │
│                                                                 │
│  2. PLANNING (AI)                                               │
│     a. Read docs/architecture/plug-and-play-modules.md          │
│     b. Check identity schema for data model                     │
│     c. Create implementation_plan.md                            │
│     d. Request human review                                     │
│                                                                 │
│  3. APPROVAL (Human)                                            │
│     - Reviews plan, provides feedback                           │
│     - Approves to proceed                                       │
│                                                                 │
│  4. EXECUTION (AI)                                              │
│     a. Create module structure following patterns               │
│     b. Add i18n labels to module folder                         │
│     c. Register routes, tabs, actions                           │
│     d. Use DynamicViews where possible                          │
│     e. Update verification-checklist.md with progress           │
│                                                                 │
│  5. VERIFICATION (AI)                                           │
│     a. Run build, check for errors                              │
│     b. Run tests from verification-checklist.md                 │
│     c. Create walkthrough of changes                            │
│                                                                 │
│  6. DOCUMENTATION UPDATE (AI)                                   │
│     a. Mark items complete in verification-checklist.md         │
│     b. Update plug-and-play-modules.md if patterns changed      │
│     c. Update this guide if workflow improved                   │
│                                                                 │
│  7. REVIEW (Human)                                              │
│     - Review implementation walkthrough                         │
│     - Approve or request changes                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Task Tracking Pattern

For EVERY task, the AI agent should:

```markdown
## Before Starting
1. Read plug-and-play-modules.md for architecture rules
2. Check verification-checklist.md for current state
3. Create implementation plan with specific items

## During Execution
4. Complete each item from the plan
5. Update verification-checklist.md as items complete
6. Run build after significant changes

## After Completion
7. Mark all items done in verification-checklist.md
8. Update architecture docs if patterns evolved
9. Create walkthrough showing what was done
```

---

## Conventions for AI Agents

### 1. File Discovery

| To Find | Look In |
|---------|---------|
| Architecture rules | `docs/architecture/*.md` |
| Database schemas | `docs/backend/*/schema/*.sql` |
| Module patterns | `src/modules/*/registry.ts` |
| Core services | `src/core/services/*.ts` |
| Type definitions | `src/core/lib/types.ts` |

### 2. Adding a New Entity View

```markdown
PROMPT: "Add a view for external.accounts similar to external.contacts"

AI STEPS:
1. Check if DynamicView can handle it (90% cases)
2. If yes: Add route registration only
3. If custom UI needed: Create in src/modules/{module}/pages/
4. Add i18n labels to module's i18n/{lang}.json
5. Register in module's registry.ts
```

### 3. Adding a New Module

```markdown
PROMPT: "Add a new 'inventory' module"

AI STEPS:
1. Create folder structure:
   src/modules/inventory/
   ├── index.ts
   ├── registry.ts
   ├── manifest.ts
   └── i18n/en.json

2. Add to MODULE_MANIFEST in ModuleLoader.ts
3. Add to identity.modules table (backend)
4. Verify build passes
5. Update verification-checklist.md
```

### 4. Modifying Core

```markdown
RULES:
- Core MUST NOT import from modules
- Changes require architecture review
- Must maintain backward compatibility
- Update plug-and-play-modules.md if patterns change
```

---

## AI Agent Prompts

### For Feature Development

```
You are developing features for the Zoworks SaaS platform.

ALWAYS:
1. Read docs/architecture/plug-and-play-modules.md first
2. Follow the 90/10 rule: Use DynamicViews when possible
3. Put module-specific code in src/modules/{module}/
4. Put module labels in src/modules/{module}/i18n/
5. Register via the registry pattern

NEVER:
- Import module code into core
- Put module labels in core i18n
- Hardcode tenant-specific logic
```

### For Architecture Changes

```
You are making architecture changes to the Zoworks platform.

BEFORE CHANGES:
1. Document the proposed change
2. Explain impact on existing modules
3. Update verification-checklist.md
4. Request human review

AFTER APPROVAL:
1. Implement changes
2. Update all affected documentation
3. Run full build verification
4. Create walkthrough of changes
```

---

## Documentation Standards

### When to Update Docs

| Trigger | Update |
|---------|--------|
| New module added | `verification-checklist.md` |
| Architecture change | `plug-and-play-modules.md` |
| New pattern introduced | `ai-agentic-development.md` |
| Schema change | `docs/backend/*/` |

### Documentation Format

```markdown
# Feature/Component Name

## Purpose
One-line description

## Usage
Code example or configuration

## Dependencies
What this requires

## Related
Links to related docs
```

---

## Scalability Recommendations

### For 10+ Modules

1. **Module dependency graph** - Prevent circular dependencies
2. **Lazy loading budget** - Each module < 100KB gzipped
3. **Shared component library** - Extract truly shared UI to core
4. **E2E test per module** - Validate module isolation

### For 100+ Tenants

1. **CDN for static assets** - Module chunks on CDN
2. **Edge caching** - Tenant config at edge
3. **Database sharding** - Per-tenant or per-region
4. **Telemetry** - Per-tenant performance metrics

### For AI Agent Scale

1. **Semantic code comments** - Help AI understand intent
2. **Example-driven docs** - Show patterns, not just rules
3. **Automated validation** - CI checks architecture rules
4. **Change impact analysis** - AI can predict blast radius

---

## Next Steps

1. [ ] Implement module i18n extraction
2. [ ] Add module manifests with dependencies
3. [ ] Create CI check for core/module isolation
4. [ ] Add E2E test for module removal
5. [ ] Document all modules in verification-checklist.md
