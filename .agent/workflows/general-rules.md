---
description: General rules and constraints for all agent workflows
---

# Agent Rules

// turbo-all

**These rules apply to ALL workflows and agent actions.**

---

## Critical Constraints

### 🚫 NO Browser Testing
**Do NOT open the browser for any testing.** The user's machine hangs when the browser is opened by the agent.

- **Verification**: Use `yarn build`, `yarn tsc --noEmit`, terminal-based checks only
- **Manual testing**: User will test manually or give specific permission
- **Screenshots**: Never capture screenshots without explicit permission

### 🔒 Frozen Styling System
**Do NOT modify the styling system when auditing pages/components.**

- ❌ Do NOT modify `index.css` or theme files
- ❌ Do NOT add inline styles (e.g., `style={{ color: 'red' }}`)
- ❌ Do NOT alter colors, typography, or CSS variables
- ✅ Only wrap existing content in correct structure (`.page-content`, `.page-card`)
- ✅ Use existing CSS classes only

### Build Verification Only
```bash
# Good - terminal verification
yarn build
yarn tsc --noEmit

# Bad - browser testing
# browser_subagent(...)
# Never auto-run browser tests
```

---

## Other Rules

- **Lucide icons only**: Never use `@ant-design/icons`
- **CSS variables**: Use `var(--color-*)` instead of hardcoded colors
- **Safe commands**: Only auto-run safe commands (reads, builds)

---

*Last Updated: 2025-12-25*