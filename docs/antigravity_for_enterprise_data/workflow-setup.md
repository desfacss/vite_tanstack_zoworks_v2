# Workflow Setup Guide

> How to create and configure workflows for the AI agent.

---

## Workflow File Structure

Workflows live in `.agent/workflows/` at the project root.

```
project/
└── .agent/
    └── workflows/
        ├── general-rules.md      # Universal constraints
        ├── add-component.md      # Task-specific workflow
        └── pre-deploy.md         # Pre-production checks
```

---

## File Format

### Basic Template

```markdown
---
description: Short description for workflow discovery
---

# Workflow Title

// turbo-all

**Trigger phrases**: "keyword1", "keyword2"

Complete description of what this workflow does.

---

## Phase 1: First Phase

- [ ] Step 1
- [ ] Step 2

---

## Phase 2: Second Phase

- [ ] Step 3
- [ ] Step 4

---

*Last Updated: YYYY-MM-DD*
```

### Frontmatter

```yaml
---
description: This is shown in workflow list (keep short)
---
```

The `description` field is how the agent discovers relevant workflows.

### Turbo Annotations

| Annotation | Effect |
|------------|--------|
| `// turbo` | Auto-run the next safe command |
| `// turbo-all` | Auto-run ALL safe commands in this workflow |

---

## Trigger Mechanisms

### Explicit Trigger
User types: `/workflow-name`

### Phrase Detection
Agent sees keywords matching workflow description and reads the file.

---

## Workflow Types

### 1. Rules Workflow
Constraints that apply always. Example: `general-rules.md`

```markdown
---
description: General rules and constraints for all agent workflows
---

# Agent Rules

## Critical Constraints

### 🚫 NO Browser Testing
Do NOT open the browser...
```

### 2. Task Workflow
Step-by-step checklist for specific tasks. Example: `add-component.md`

```markdown
---
description: Complete checklist for adding a new component
---

# /add-component Workflow

## Phase 1: Component Creation
- [ ] Create file...

## Phase 2: Routing
- [ ] Add lazy import...
```

### 3. Audit Workflow
Periodic checks. Example: `code-health-audit.md`

```markdown
---
description: Run a comprehensive code health audit
---

# Code Health Audit

## When to Run
- Before major releases
- Monthly maintenance
```

---

## Best Practices

1. **Keep descriptions short**: Under 80 characters
2. **Use clear trigger phrases**: Listed at top of file
3. **Include verification steps**: How to confirm completion
4. **Add troubleshooting**: Common issues and fixes
5. **Update timestamps**: Track when workflow was last modified

---

*Last Updated: 2025-12-25*
