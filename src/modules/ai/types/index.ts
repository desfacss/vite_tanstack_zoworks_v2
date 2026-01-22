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
