# Agent Memory Model

> Understanding short-term and long-term memory in AI coding assistants.

---

## Memory Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    LONG-TERM MEMORY                              │
│  (Persists across sessions)                                      │
├─────────────────────────────────────────────────────────────────┤
│  • System Prompt (immutable)                                     │
│  • User Custom Instructions (account settings)                   │
│  • Project Files (docs, workflows, code)                         │
│  • Conversation Summaries (stored by platform)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SHORT-TERM MEMORY                             │
│  (Current session only)                                          │
├─────────────────────────────────────────────────────────────────┤
│  • Conversation Context (current chat)                           │
│  • Artifacts (task.md, implementation_plan.md)                   │
│  • Tool Call Results (file contents, command outputs)            │
│  • Workspace State (open files, cursor position)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Long-Term Memory

### What Persists

| Type | Location | Scope | How I Access It |
|------|----------|-------|-----------------|
| **System Prompt** | Platform | Global | Always in context |
| **User Instructions** | IDE Settings | Account | Always in context |
| **Workflow Files** | `.agent/workflows/` | Project | Read on demand |
| **Documentation** | `docs/` | Project | Search/read on demand |
| **Codebase** | `src/` | Project | Search/read on demand |
| **Conversation Summaries** | Platform | Per-conversation | Injected when truncated |

### How Long-Term Memory Works

1. **System Prompt**: Hardcoded rules about my identity, capabilities, and guidelines
2. **User Instructions**: Custom rules you set in IDE settings (applied to all conversations)
3. **Project Files**: I don't "remember" these — I **read** them each time using tools
4. **Summaries**: When conversations get long, old context is summarized and injected

---

## Short-Term Memory

### What Exists Only This Session

| Type | Lifespan | How It's Used |
|------|----------|---------------|
| **Conversation History** | This chat session | Full context until truncation |
| **Artifacts** | This chat session | `task.md`, `walkthrough.md`, etc. |
| **Tool Results** | This turn | File contents, command outputs |
| **Workspace State** | Per-turn | Active file, cursor, open docs |

### How Short-Term Memory Works

1. **Conversation**: I receive full chat history up to context limit
2. **Truncation**: When too long, old messages are summarized
3. **Artifacts**: Created in `.gemini/antigravity/brain/{session-id}/`
4. **Tool Results**: File reads, searches refresh my knowledge each turn

---

## Memory Limitations

### Context Window
```
Total context limit: ~100K tokens

Allocated roughly as:
├── System Prompt:       ~10K tokens
├── User Instructions:   ~1K tokens  
├── Conversation:        ~80K tokens (truncated if exceeded)
└── Current Turn:        ~10K tokens (your message + workspace)
```

### What I Forget

| Scenario | What's Lost | How to Recover |
|----------|-------------|----------------|
| **New conversation** | All conversation context | Reference `docs/` or ask again |
| **Truncation** | Old message details | Summary injected, can re-read files |
| **Session end** | Artifacts (task.md) | Not recoverable unless saved to project |

---

## How I Handle Memory

### Reading vs Remembering

I don't "remember" your codebase — I **read** it each time:

```
You: "Add a new page like the tickets page"

My process:
1. Search codebase for "tickets" patterns
2. Read relevant files (TicketsPage.tsx, etc.)
3. Use that as context for current task
4. Generate code based on fresh read
```

### Conversation Continuity

Within a conversation:
- I have full context of what we discussed
- I remember tool calls and their results
- I track task progress via `task.md` artifact

Across conversations:
- I start fresh (no memory of previous chats)
- I can read docs/logs you created previously
- User instructions persist account-wide

### Truncation Handling

When conversation gets too long:
1. Platform creates summary of old context
2. Summary is injected as "conversation history"
3. I lose specific details but retain key points
4. I can re-read files to recover specifics

---

## Best Practices for Memory

### For Persistence
- **Document decisions** in `docs/` (I can read later)
- **Log sessions** in `docs/logs/` (reference for next session)
- **Use workflows** for repeatable processes (I read these)

### For Context Efficiency
- **Be specific** about what files matter
- **Reference previous work** with file paths
- **Keep conversations focused** (new task = new conversation)

### For Long Sessions
- **Checkpoint progress** in artifacts or docs
- **Summarize periodically** ("Here's where we are...")
- **Save important outputs** to project files

---

## Practical Example

### Session 1 (Today)
```
User: "Optimize the bundle"
Agent: *Creates docs/architecture/bundle-optimization.md*
       *Updates vite.config.ts*
```

### Session 2 (Tomorrow)
```
User: "Continue bundle optimization"
Agent: *No memory of Session 1*
       *Reads docs/architecture/bundle-optimization.md*
       *Continues from documented state*
```

**Key insight**: Long-term memory = written documentation, not neural memory.

---

*Last Updated: 2025-12-25*
