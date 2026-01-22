---
description: Automatically save walkthrough with timestamp when implementation is complete
---

# Walkthrough Archival Workflow

When you complete an implementation and have created/updated a `walkthrough.md` in the brain artifacts directory, follow these steps to archive it for the user:

## Steps

1. **Check if walkthrough exists**
   - Look for `walkthrough.md` in the brain artifacts directory
   - If it doesn't exist or is empty, skip this workflow

2. **Get current timestamp**
   ```bash
   node -e "console.log(new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5))"
   ```
   This generates a timestamp like: `2026-01-21T09-54-41`

3. **Copy walkthrough to project-comparison-docs**
   ```bash
   cp <brain-artifacts-path>/walkthrough.md project-comparison-docs/walkthrough_<timestamp>.md
   ```
   Replace `<timestamp>` with the value from step 2
   Replace `<brain-artifacts-path>` with the actual brain artifacts directory path

4. **Verify the file was created**
   - Check that the file exists in `project-comparison-docs/`
   - Ensure the content was copied correctly

5. **Notify the user**
   - Tell the user the walkthrough has been archived
   - Provide the path to both files:
     - Artifact walkthrough (for AI use)
     - Archived walkthrough in project-comparison-docs (for user reference)

## When to Use This Workflow

- After completing any significant implementation
- When you've created a comprehensive walkthrough.md
- Before calling `notify_user` with `BlockedOnUser=false` at the end of a task
- When the user explicitly requests a walkthrough to be saved

## Example

```bash
# Get timestamp
TIMESTAMP=$(node -e "console.log(new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5))")

# Copy file
cp C:/Users/ganesh/.gemini/antigravity/brain/fe4e7ab0-6233-4c1e-9e00-9aa8f7f58a3a/walkthrough.md project-comparison-docs/walkthrough_${TIMESTAMP}.md
```

## Notes

- The brain artifacts walkthrough.md is temporary and may be overwritten
- The project-comparison-docs copy is permanent and version-controlled
- Use the timestamp format to keep files chronologically sorted
- Always verify the copy was successful before notifying the user
