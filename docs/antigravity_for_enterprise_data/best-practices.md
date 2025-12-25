# Best Practices for Enterprise Teams

> Recommendations for using AI coding assistants effectively across teams.

---

## 1. Standardize Across Projects

### Shared Workflows
Copy these generic workflows to all projects:

```bash
# In each new project
mkdir -p .agent/workflows
cp /path/to/templates/general-rules.md .agent/workflows/
cp /path/to/templates/pre-deploy.md .agent/workflows/
```

### Template Repository
Maintain a template repo with:
- `.agent/workflows/` with generic workflows
- `docs/` with architecture patterns
- Standard folder structure

---

## 2. Documentation Strategy

### What to Document

| Document Type | Location | Purpose |
|--------------|----------|---------|
| Architecture docs | `docs/architecture/` | Agent reads for context |
| Coding standards | `docs/` or workflows | Enforce patterns |
| API references | `docs/reference/` | Function/RPC documentation |

### Agent-Friendly Documentation

```markdown
# Component Name

## Purpose
One-line description.

## Usage
Code example or configuration.

## Dependencies
What this requires.

## Related
Links to related docs.
```

---

## 3. Workflow Design Principles

### Single Responsibility
One workflow = one task type.

```
✅ Good: add-component.md, pre-deploy.md
❌ Bad: everything.md
```

### Progressive Disclosure
Start simple, add detail in later phases.

```markdown
## Phase 1: Basic Setup
Simple steps first...

## Phase 2: Advanced Configuration
Complex steps after basics...
```

### Include Verification
Every workflow should end with verification steps.

```markdown
## Verification
- [ ] Build passes
- [ ] Feature works as expected
```

---

## 4. Team Coordination

### Avoid Conflicts
- Don't run multiple agents on same files simultaneously
- Commit frequently to avoid merge conflicts
- Review agent changes before large merges

### Knowledge Sharing
- Document patterns in `docs/`
- Update workflows when patterns change
- Share successful workflows across team

---

## 5. Security Considerations

### What NOT to Put in Workflows
- API keys or secrets
- Production credentials
- User-specific paths

### Safe Command Patterns
```markdown
// turbo
yarn build  # Safe - no side effects

// Never auto-run:
yarn deploy  # Unsafe - production impact
rm -rf       # Unsafe - destructive
```

---

## 6. Performance Tips

### For the Agent
- Keep workflows focused (faster to read)
- Use frontmatter descriptions (faster discovery)
- Archive old workflows (less noise)

### For Your Machine
- Avoid browser testing (resource intensive)
- Use terminal-based verification when possible
- Set clear constraints in `general-rules.md`

---

*Last Updated: 2025-12-25*
