/**
 * LLM Service for Intelligent Form Field Selection
 * Uses Gemini API to select relevant fields based on user query
 */

import { EntityField } from './types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

/**
 * Build prompt for Gemini API
 */
function buildPrompt(metadata: EntityField[], userQuery: string): string {
  const fieldsInfo = metadata.map(f => ({
    key: f.key,
    display_name: f.display_name,
    type: f.type,
    is_mandatory: f.is_mandatory,
    is_virtual: f.is_virtual,
    foreign_key: f.foreign_key ? {
      source: f.foreign_key.source_table,
      display: f.foreign_key.display_column
    } : null
  }));

  return `You are an expert at selecting form fields from entity metadata.
Given a list of available fields and a user query, select the most relevant fields for the form.

IMPORTANT: Return ONLY a JSON array of field keys. No explanations, no markdown, just the array.

Available fields:
${JSON.stringify(fieldsInfo, null, 2)}

User query: "${userQuery}"

Guidelines:
1. Always include mandatory fields (is_mandatory: true)
2. Include fields that match the user's intent based on display_name and key
3. Avoid system fields (created_at, updated_at, etc.) unless specifically requested
4. For simple forms, keep it minimal (5-10 fields)
5. For comprehensive forms, include more relevant fields (15-25 fields)

Return format: ["field1", "field2", "field3"]`;
}

/**
 * Parse Gemini API response to extract field keys
 */
function parseGeminiResponse(data: any): string[] {
  try {
    // Extract text from Gemini response structure
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No text content in response');
    }

    // Try to extract JSON array from text
    // Handle cases where response might have markdown or extra text
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const fieldKeys = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(fieldKeys)) {
      throw new Error('Parsed result is not an array');
    }

    return fieldKeys.filter(key => typeof key === 'string');
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
    console.error('Raw response:', data);
    throw new Error('Failed to parse LLM response. Please try again.');
  }
}

/**
 * Select fields using Gemini API based on user query
 */
export async function selectFieldsWithLLM(
  metadata: EntityField[],
  userQuery: string
): Promise<string[]> {
  if (!API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY not found in environment variables');
  }

  if (!userQuery || userQuery.trim().length === 0) {
    throw new Error('Please provide a description of the form you want to create');
  }

  const prompt = buildPrompt(metadata, userQuery);

  console.log('🤖 Calling Gemini API for field selection...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,  // Lower temperature for more focused responses
          maxOutputTokens: 1000,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const selectedFields = parseGeminiResponse(data);

    console.log(`✅ LLM selected ${selectedFields.length} fields:`, selectedFields);

    return selectedFields;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}
