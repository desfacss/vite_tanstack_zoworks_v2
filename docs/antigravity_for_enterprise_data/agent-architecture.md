# Antigravity Agent Architecture

> Understanding how the AI coding assistant manages knowledge, memory, and rules.

---

## Memory Layers

| Layer | Scope | Persistence | What It Contains |
|-------|-------|-------------|------------------|
| **System Prompt** | Global (all projects) | Permanent | Core identity, tool definitions, coding guidelines |
| **User Rules** | Your account | Permanent | Custom instructions you set in IDE settings |
| **Workspace Context** | This project | Per-turn | Active files, cursor position, open documents |
| **Conversation History** | This conversation | Session | Full chat (truncated when long, summaries injected) |
| **Artifacts** | This conversation | Session | `task.md`, `implementation_plan.md`, `walkthrough.md` |

---

## What Reaches the LLM

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM PROMPT                             │
│  (Identity, tool definitions, coding guidelines)             │
├─────────────────────────────────────────────────────────────┤
│                    USER RULES                                │
│  (Custom instructions from IDE settings)                     │
├─────────────────────────────────────────────────────────────┤
│              WORKSPACE CONTEXT (per turn)                    │
│  - Active document + cursor position                         │
│  - Open files list                                           │
│  - Workflow descriptions (titles only)                       │
├─────────────────────────────────────────────────────────────┤
│                 CONVERSATION HISTORY                         │
│  (Truncated when long, summaries for old context)            │
├─────────────────────────────────────────────────────────────┤
│                  YOUR MESSAGE                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
                         [LLM]
                            ↓
                    Tool calls + Response
```

---

## Project-Level Configuration

### Workflow Files (`.agent/workflows/`)

```
.agent/workflows/
├── general-rules.md       # Agent constraints (no browser, etc.)
├── add-component.md       # Project-specific workflow
├── pre-deploy.md          # Generic workflow
└── ...
```

**How workflows work:**
1. Agentic layer reads workflow file **descriptions** from YAML frontmatter
2. Workflow list is injected into context each turn (titles only)
3. When you trigger `/workflow-name` or agent detects phrases, full file is read

**Key insight:** Workflows are **documentation files** that the agent reads when needed — NOT directly part of the system prompt.

---

## Configuration Locations

| Want | Where to Put It | Scope |
|------|-----------------|-------|
| **Account-wide rules** | IDE Settings → Custom Instructions | All projects |
| **Project rules** | `.agent/workflows/general-rules.md` | This project |
| **Project docs** | `docs/` folder | This project (searched when needed) |

---

## Generic vs Project-Specific

### Generic Workflows (Reusable Across Projects)

| Workflow | Description |
|----------|-------------|
| `general-rules.md` | Universal constraints (no browser, safe commands) |
| `pre-deploy.md` | Build checks, code quality, environment validation |

### Project-Specific Workflows

| Workflow | Description |
|----------|-------------|
| `add-component.md` | ZoWorks-specific folder structure and patterns |
| `styling-component-checklist.md` | ZoWorks CSS variable system |
| `code-health-audit.md` | ZoWorks module structure checks |

---

## Best Practices

### For Enterprise Teams

1. **Standardize workflows**: Copy generic workflows to all projects
2. **Document patterns**: Agent reads `docs/` — put architecture docs there
3. **Use descriptive frontmatter**: Helps agent discover relevant workflows
4. **Keep workflows focused**: One workflow = one task type

### Workflow File Format

```yaml
---
description: Short description for workflow discovery
---

# Workflow Title

// turbo-all   # Optional: auto-run all safe commands

**Trigger phrases**: "keyword1", "keyword2"

## Phase 1: First Step
- [ ] Checklist item
- [ ] Another item

## Phase 2: Second Step
...
```

---

## Agentic Layer vs LLM

| Handled by Agentic Layer | Reaches the LLM |
|-------------------------|-----------------|
| Tool execution (file reads, terminal) | Reasoning and planning |
| Workflow file discovery | Content interpretation |
| Context injection | Response generation |
| Artifact management | Code generation |
| Session state | Decision making |

---

*Last Updated: 2025-12-25*
