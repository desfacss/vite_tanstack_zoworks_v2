# Antigravity Enterprise Documentation

> Understanding and configuring the AI coding assistant for enterprise use.

---

## Documents

| Document | Description |
|----------|-------------|
| [Optimal Workflow](./optimal-workflow.md) | ⭐ Start here — best practices for AI-assisted development |
| [Agent Architecture](./agent-architecture.md) | Memory, knowledge, and context flow |
| [Memory Model](./memory.md) | Short-term vs long-term memory |
| [Workflow Setup Guide](./workflow-setup.md) | Creating and managing workflows |
| [Best Practices](./best-practices.md) | Enterprise team recommendations |

---

## Quick Reference

### Memory Persistence

| Type | Persists Across Sessions? |
|------|--------------------------|
| System Prompt | ✅ Yes (permanent) |
| User Custom Instructions | ✅ Yes (account-level) |
| Workflow Files | ✅ Yes (in project) |
| Conversation History | ❌ No (session only) |
| Artifacts (task.md, etc.) | ❌ No (session only) |

### Configuration Priority

```
1. System Prompt (highest priority, immutable)
       ↓
2. User Custom Instructions (account-wide)
       ↓
3. Workflow Files (project-level)
       ↓
4. Conversation Context (per-turn)
```

---

*Last Updated: 2025-12-25*
