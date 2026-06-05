**Session**: 2026-06-05 ~22:06 IST

# Context-as-Code: Agents UI

## Agent Configuration Screen
Similar to Playbook Steps, the Agent configuration UI requires boundaries so agents can be safely deployed.

### 1. System Persona (Prompt)
- **UI Change:** Focused solely on the agent's persona and core behavior, devoid of transient business policies.
- **Data Source:** `ai_mcp.agents.system_prompt`.

### 2. Context Rules
- **UI Change:** A multi-select UI (pill tags) to bind base context rules to the agent (e.g., `rules.global.whatsapp_tone`).
- **Data Source:** Saves to `ai_mcp.agents.static_context_keys`. Pulls options from `ai_mcp.context_registry`.

### 3. Tool Permissions
- **UI Change:** Pill toggles defining the absolute maximum tool access for this agent, regardless of playbook step.
- **Data Source:** Saves to `ai_mcp.agents.allowed_tools`.

### 4. Data Permissions (Entities)
- **UI Change:** Pill toggles defining the database schemas the agent is allowed to access globally.
- **Data Source:** Saves to `ai_mcp.agents.allowed_entities`.

---
**Modified Files / DB Objects:**
- Created this reference document.
