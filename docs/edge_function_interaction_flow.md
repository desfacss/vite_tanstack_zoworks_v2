# Edge Function Interaction Flow

This document outlines the Supabase Edge Functions invoked from the client application.

| S.No | Function Name | Component / File | Purpose |
| :--- | :--- | :--- | :--- |
| 1 | `generate-semantics` | `src/components/nlp/admin/api.ts` | Generates semantic embeddings or analysis for NLP administration tasks. |
| 2 | `nlp-query` | `src/components/nlp/query/api.ts` | Processes natural language queries against the semantic data. |
