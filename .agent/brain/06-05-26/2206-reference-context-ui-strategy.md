**Session**: 2026-06-05 ~22:06 IST

# Context-as-Code: Overall UX Strategy

## Paradigm Shift
The UI needs to evolve from a "static prompt builder" to a **Dynamic Orchestration Node Builder**. Currently, users hardcode business rules into text areas. The new UX allows users to *select* predefined, governable building blocks (Rules, Tools, Entities) dynamically.

## The Context IDE (New Global Screen)
Before configuring playbooks or agents, users need a place to define the context.
- **UI:** A code-editor view (like VS Code or a clean YAML editor).
- **Functionality:** Product Managers and Architects define corporate policies (e.g., `rules.sales.negotiation_limits`).
- **Data Source:** Pulls from and saves to `ai_mcp.context_registry`.
  - Keys: `key`, `format`, `content`.

---
**Modified Files / DB Objects:**
- Created this reference document.
