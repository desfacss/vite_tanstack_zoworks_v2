---
description: Archive implementation plans, walkthroughs, or conversation logs to the project documentation directory.
---

# Archive Documentation Workflow

// turbo-all

## Target Directory

All session artifacts MUST be archived to:
```
/.agent/brain/{MM-DD-YY}/{HHMM}-{type}-{topic}.md
```

### Naming Convention

| Token | Format | Example |
|-------|--------|---------|
| `{MM-DD-YY}` | Current date | `02-26-26` |
| `{HHMM}` | Current time (24h) | `2047` |
| `{type}` | Document type | `walkthrough`, `plan`, `response`, `audit`, `reference` |
| `{topic}` | Concise topic slug | `composer-identity-resolution` |

**Full example**: `.agent/brain/02-26-26/2047-walkthrough-composer-identity-resolution.md`

## Steps

1. Determine the source content to archive (e.g., implementation plan, walkthrough, audit, or response).
2. Get the current date in `MM-DD-YY` format.
3. Get the current time in `HHMM` format (24h).
4. Define a concise topic name using kebab-case.
5. Choose the document type: `walkthrough`, `plan`, `response`, `audit`, or `reference`.
6. Ensure the target date directory exists:
```bash
mkdir -p /Users/macbookpro/zo_v2/zo_core_v5_supa/.agent/brain/{date}
```
7. Write the content to the target path.
8. Verify the file was correctly written.

## When to Archive

Archive at the **end of every session** that produces:
- Implementation plans
- Walkthroughs (post-execution summaries)
- Architecture analysis or audit results
- Significant Q&A responses that document system behavior
- Any document the user explicitly asks to preserve

## Rules

1. **Always archive to `.agent/brain/`** — never to `main-doc/` or other locations
2. **One file per topic** — don't combine unrelated work
3. **Include a session timestamp** in the file header (e.g., `**Session**: 2026-02-26 ~15:30–20:47 IST`)
4. **List all modified files and database objects** at the bottom for traceability