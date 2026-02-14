/**
 * AI Module Types
 * Type definitions for AI chat components and services
 */

export interface AgentMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    name: string;
    content: string;
    timestamp: string;
    metadata?: {
        agent_key?: string;
        tool_names?: string[];
        view_mode?: 'markdown' | 'tabular' | 'chart';
        routing_decision?: {
            target_agent?: string;
            reason?: string;
            pattern?: string;
            confidence?: number;
        };
        run_stats?: any;
        traces?: any[];
    };
}

export interface Agent {
    key: string;
    name: string;
    description: string;
    domain: string;
    model?: string;
}

export interface ChatConfig {
    apiKey: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
}

export interface StreamOptions {
    onChunk?: (chunk: string) => void;
    onComplete?: () => void;
    onError?: (error: Error) => void;
}

// ============ Agent CRUD Types ============

export type AgentRoleLevel = 'specialist' | 'orchestrator' | 'supervisor' | 'router';

export interface ModelConfig {
    temp: number;
    model: string;
    provider: string;
    max_tokens: number;
}

export interface PlanningConfig {
    agent_pattern?: string[];
    entities_access?: Record<string, string>;
    allowed_patterns?: string[];
    routing_entities?: string[];
    routing_keywords?: string[];
    presentation_strategy?: {
        preferred_formats?: string[];
        strict_enforcement?: Record<string, string>;
    };
    selection_logic?: Record<string, string[]>;
    context_strategy?: Record<string, string>;
    default_pattern?: string;
    planner_threshold_words?: number;
    data_sources?: Record<string, string>;
}

export interface AgentRecord {
    agent_key: string;
    name: string;
    description?: string;
    system_prompt: string;
    role_level?: AgentRoleLevel;
    model_config?: ModelConfig;
    planning_config?: PlanningConfig;
    organization_id?: string;
    is_active?: boolean;
    parent_agent_key?: string;
    required_module_key?: string;
    agent_layer?: number;
    domain?: string;
    config?: Record<string, any>;
    semantics?: Record<string, any>;
    // Auto-generated fields (read-only)
    id?: string;
    created_at?: string;
    updated_at?: string;
    search_vector?: any;
    capability_vector?: any;
}

export interface AgentFormData {
    agent_key: string;
    name: string;
    description?: string;
    system_prompt: string;
    role_level: AgentRoleLevel;
    model_config: string; // JSON string
    planning_config: string; // JSON string
    organization_id?: string;
    is_active: boolean;
    parent_agent_key?: string;
    required_module_key?: string;
    agent_layer: number;
    domain: string;
    config: string; // JSON string
    semantics: string; // JSON string
}
export interface ActionApprovalRecord {
    id: string;
    organization_id: string;
    session_id: string;
    action_type: string;
    description?: string;
    parameters?: Record<string, any>;
    status: 'pending' | 'approved' | 'rejected' | string;
    decided_by?: string;
    decision_note?: string;
    decided_at?: string;
    created_at?: string;
    search_vector?: any;
}

export interface TenantTierConfigRecord {
    id: string;
    organization_id: string;
    tier: 'mini' | 'med' | 'max' | string;
    provider: string;
    model_name: string;
    api_key?: string;
    temperature?: number;
    max_tokens?: number;
    created_at?: string;
    updated_at?: string;
    search_vector?: any;
}

export interface PlaybookRecord {
    id: string;
    organization_id?: string;
    name: string;
    description?: string;
    trigger_command?: string;
    created_at?: string;
    search_vector?: any;
    // Relationship
    steps?: PlaybookStepRecord[];
}

export interface PlaybookStepRecord {
    id: string;
    playbook_id?: string;
    position: number;
    name: string;
    instruction: string;
    required_tool_key?: string;
    is_auto_execute?: boolean;
    step_key?: string;
    execution_logic?: Record<string, any>;
    dependencies?: string[];
    created_at?: string;
    search_vector?: any;
}
