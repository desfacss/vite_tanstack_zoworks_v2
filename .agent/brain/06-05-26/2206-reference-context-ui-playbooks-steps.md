**Session**: 2026-06-05 ~22:06 IST

# Context-as-Code: Playbooks & Steps UI

## Playbook Configuration Screen
- **Context Rules Dropdown:** A multi-select dropdown to apply global context to the entire playbook.
- **Data Source:** Reads available rules from `ai_mcp.context_registry(key)`. Saves selections to `ai_mcp.playbooks.static_context_keys`.

## Playbook Steps (Nodes) Configuration
### 1. Prompt Chain (Instruction)
- **UI Change:** The large text area shrinks. It is used *only* for the core instruction, not for listing guardrails.
- **Data Source:** `ai_mcp.playbook_steps.instruction`.

### 2. Context Rules (Replaces Guardrails)
- **UI Change:** Replace hardcoded Key-Value guardrails with a "Context Rules" multi-select UI (pill tags).
- **Data Source:** Saves to `ai_mcp.playbook_steps.static_context_keys`.

### 3. Tool Permissions
- **UI Change:** Pill toggles for tools. If a tool has dependencies, auto-inject them into the Context Rules.
- **Data Source:** Saves to `ai_mcp.playbook_steps.allowed_tools`. Pulls tool list from `ai_mcp.mcp_tools.tool_key`.

### 4. Data Permissions (Entities)
- **UI Change:** A new block below "Tool Permissions" for selecting allowed schemas (e.g., `crm.deals`).
- **Data Source:** Saves to `ai_mcp.playbook_steps.allowed_entities`.

---
**Modified Files / DB Objects:**
- Created this reference document.
