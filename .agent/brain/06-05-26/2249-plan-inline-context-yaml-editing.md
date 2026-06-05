**Session**: 2026-06-05 ~22:49 IST

# Implementation Plan - Unified Inline Context & YAML Syntax Editing

Implement unified, inline editing of **Context Rules** alongside parent entities (MCP Tools, Agents, and Playbooks/Steps) as a single conceptual transaction, using a dedicated YAML/JSON syntax validator component.

## Proposed Changes

---

### AI Module Components

#### [NEW] [YamlEditor.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/ai/components/YamlEditor.tsx)
- Monospaced, dark-themed code editor component.
- Instant YAML validation and error alerting using `js-yaml`.

#### [MODIFY] [ContextRegistryPage.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/ai/pages/ContextRegistryPage.tsx)
- Integrate `YamlEditor` and `JsonEditor` dynamically depending on the format chosen (`yaml` or `json`).

#### [MODIFY] [McpToolsPage.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/ai/pages/McpToolsPage.tsx)
- Add local state for loaded registry details of selected tool keys.
- Fetch context registry records when a tool is loaded for editing or keys are changed.
- Render accordion panels with `YamlEditor` components for each selected key.
- Save/Upsert modifications in `context_registry` and update the tool entry concurrently during form submission.

#### [MODIFY] [AgentFormModal.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/ai/components/AgentFormModal.tsx)
- Integrate inline context registry loading and editing.
- Render accordion editors for each bound context rule in the **Context Boundaries** tab.
- Perform a combined upsert of context registry changes and agent updates.

#### [MODIFY] [PlaybookForm.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/ai/components/PlaybookForm.tsx)
- Integrate inline context registry editing at:
  - Playbook level (under Playbook Context Rules).
  - Step level (under Step Context Rules).
- Save all modified/created context rules concurrently before updating the playbook and step definitions.

---

## Modified Files
- [YamlEditor.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/ai/components/YamlEditor.tsx)
- [ContextRegistryPage.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/ai/pages/ContextRegistryPage.tsx)
- [McpToolsPage.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/ai/pages/McpToolsPage.tsx)
- [AgentFormModal.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/ai/components/AgentFormModal.tsx)
- [PlaybookForm.tsx](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/modules/ai/components/PlaybookForm.tsx)
