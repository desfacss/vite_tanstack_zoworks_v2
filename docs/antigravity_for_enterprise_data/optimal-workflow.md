# Optimal AI-Assisted Development Workflow

> Best practices for developing a meta-driven, AI-native SaaS platform with AI coding assistants.

---

## The Ideal Development Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION START                                 │
│  1. /log — Read last session's context                          │
│  2. Identify task from PROGRESS.md or docs/architecture/todo/   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PLANNING PHASE                                │
│  3. Ask agent to read relevant docs                             │
│  4. Create implementation_plan.md                               │
│  5. Review and approve plan                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTION PHASE                               │
│  6. Agent implements changes                                     │
│  7. Build verification (yarn build)                             │
│  8. Iterate until complete                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION END                                   │
│  9. /log — Document what was done                               │
│  10. Update PROGRESS.md                                         │
│  11. Commit changes                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Recommended Folder Structure

```
project/
├── .agent/
│   └── workflows/           # Agent-readable workflows
│       ├── general-rules.md
│       ├── add-component.md
│       ├── pre-deploy.md
│       ├── code-health.md
│       └── log.md
├── docs/
│   ├── architecture/        # System design (agent reads for context)
│   │   ├── overview.md
│   │   ├── plug-and-play-modules.md
│   │   └── todo/            # Pending work items
│   ├── logs/                # Session logs (handoff between sessions)
│   │   ├── PROGRESS.md      # Current state summary
│   │   └── 2025-12/         # Logs by month
│   │       └── 2025-12-25-0630.md
│   └── reference/           # Technical references
└── src/                     # Source code
```

---

## Key Workflows for AI-Native Development

### 1. `/log` — Session Handoff
Run at session end. Creates timestamped log of accomplishments.

### 2. `/pre-deploy` — Before Production
Run before pushing to Vercel. Validates build, code quality.

### 3. `/add-component` — Feature Development
Run when adding new pages/components. Ensures patterns are followed.

### 4. `/code-health` — Periodic Audit
Run monthly. Finds cleanup opportunities.

---

## Meta-Driven Development Tips

### For Config-Driven UIs
```
docs/schemas/              # Document your view configs
├── entity-configs.md      # How DynamicViews work
├── form-schemas.md        # How DynamicForms work
└── widget-types.md        # Dashboard widget types
```

Agent can read these to understand your config patterns.

### For AI-Native Architecture
```
docs/architecture/
├── registry-pattern.md    # How plugins register
├── tenant-resolution.md   # How config loads per tenant
└── lazy-loading.md        # What loads when
```

Document patterns so agent can extend them correctly.

---

## Communication Patterns

### High-Value Prompts

```
✅ "Read docs/architecture/plug-and-play-modules.md, then add a new 
    CRM module following that pattern"

✅ "Check the last log at docs/logs/, then continue the bundle 
    optimization work"

✅ "Review the todo items in docs/architecture/todo/ and suggest 
    priority order"
```

### Low-Value Prompts

```
❌ "Fix the bug" (too vague, no context)

❌ "Make it work" (no specific outcome defined)

❌ "Do what we discussed yesterday" (no memory of yesterday)
```

---

## Session Management

### Starting a Session
```
"Read docs/logs/PROGRESS.md and the last session log. 
 What's the current state and what should we work on?"
```

### During a Session
```
"Before we continue, summarize what we've done so far in this session"
```

### Ending a Session
```
"/log" — Creates handoff for next session
```

---

## For Meta-Driven SaaS Specifically

### Document Your Meta Layer
```
docs/
├── schemas/               # View/form config schemas
├── entities/              # Entity definitions per module
└── tenant-configs/        # How tenant config works
```

### Let Agent Extend Patterns
Instead of:
```
"Create a users list page"
```

Say:
```
"Create a users list page using DynamicViews, following the pattern 
 in src/modules/crm/pages/ContactsPage.tsx"
```

### Use Verification Checklists
```
docs/architecture/verification-checklist.md
```
Agent can check module compliance programmatically.

---

## Anti-Patterns to Avoid

| Anti-Pattern | Better Approach |
|--------------|-----------------|
| Long sessions with no logs | Log every 2-3 hours |
| Multiple topics in one session | One focused task per session |
| Assuming agent remembers | Reference specific files |
| Vague requests | Specific outcomes + pattern references |
| Manual testing only | Build verification in workflows |

---

*Last Updated: 2025-12-25*
