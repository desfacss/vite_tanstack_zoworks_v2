---
description: Archive feature documentation including routes, explanation, supabase info, and component hierarchy.
---

# Archive Feature Workflow

// turbo-all

## Target Directory

All feature documentation MUST be archived to:
```
/.agent/brain/feature/{topic}.md
```

### Naming Convention
The `{topic}` should be a concise, kebab-case name for the feature (e.g., `agent-tracking-maps`).

## Required Document Structure

Every archived feature document MUST contain the following sections at the top:

1.  **Page Route**: The internal application route or entry-point file path.
2.  **Feature Explanation**: A brief (1-2 paragraph) summary of the feature's purpose and functionality.
3.  **Supabase Reference**:
    - **Tables**: List of primary tables and views used.
    - **RPC Functions**: Any custom database functions or standard fetchers utilized.
    - **Payload Structure**: An example of the JSON configuration or request data used for fetching.
4.  **Component Registry**:
    - A list of all React components connected to the feature.
    - Each entry must specify if it is a **Custom** component (handwritten for the feature) or a **Dynamic** component (reused from core/centralized patterns).

## Steps

1.  Identify the feature to be documented.
2.  Gather the required information (Route, Supabase objects, Components list).
3.  Define the `topic` name in kebab-case.
4.  Ensure the target directory exists:
    ```bash
    mkdir -p .agent/brain/feature
    ```
5.  Create/Update the documentation file at `.agent/brain/feature/{topic}.md`.
6.  Include a session timestamp in the header: `**Session**: YYYY-MM-DD ~HH:MM IST`.
7.  List all modified files at the bottom of the document.

## When to Use

Use this workflow when:
- A new feature is fully implemented.
- Significant architectural changes are made to an existing feature.
- Explicitly requested by the user to "document the feature".
