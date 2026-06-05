**Session**: 2026-06-05 ~22:06 IST

# Context-as-Code: MCP Tools UI

## Tools Configuration Screen
When registering or configuring a new MCP Tool, the system must enforce policy awareness.

### Context Dependencies
- **UI Change:** A multi-select field labeled "Required Context Rules". This ensures that whenever a playbook or agent is granted access to this tool, the orchestration engine forces the LLM to read the required rules.
- **UX Example:** Toggling the `process_refund` tool automatically warns the user that `rules.finance.refund_policy` must be injected into the playbook step.
- **Data Source:** Saves to `ai_mcp.mcp_tools.required_context_keys`. Pulls available contexts from `ai_mcp.context_registry`.

---
**Modified Files / DB Objects:**
- Created this reference document.
