/**
 * AI Service Layer
 * Placeholder for AI SDK integration
 * 
 * TODO: Implement real AI backend integration when ready
 * - Connect Google Gemini or OpenAI API
 * - Implement streaming responses
 * - Add error handling and retry logic
 */

import type { AgentMessage, StreamOptions } from '../types';

/**
 * Mock AI service for demonstration
 * Replace with real AI SDK integration
 */
export async function streamAIResponse(
    messages: AgentMessage[],
    options?: StreamOptions
): Promise<void> {
    // TODO: Implement real AI streaming using Vercel AI SDK
    // Example:
    // import { streamText } from 'ai';
    // import { google } from '@ai-sdk/google';
    // 
    // const result = await streamText({
    //     model: google(import.meta.env.VITE_AI_MODEL || 'gemini-1.5-pro'),
    //     messages: messages.map(m => ({ role: m.role, content: m.content })),
    //     maxTokens: 2000,
    //     temperature: 0.7,
    // });
    // 
    // for await (const chunk of result.textStream) {
    //     options?.onChunk?.(chunk);
    // }
    // options?.onComplete?.();

    // Placeholder implementation
    console.warn('AI Service: Real API integration not yet implemented');
    options?.onError?.(new Error('AI Service not configured'));
}

/**
 * Get available AI agents
 * TODO: Fetch from backend API
 */
export async function getAgentsList() {
    // TODO: Fetch from API endpoint
    // const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/agents`);
    // return response.json();
    
    // Placeholder data
    return [
        {
            key: 'general',
            name: 'General Assistant',
            description: 'General purpose AI assistant',
            domain: 'general',
        },
    ];
}
