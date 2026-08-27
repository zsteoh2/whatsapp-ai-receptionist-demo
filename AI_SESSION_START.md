---
document: ai-session-start
status: active
last-reviewed: unknown
source-of-truth: true
owners:
  - project
related:
  - AI_CONTEXT.md
  - .ai/runtime/active-task.json
---

# New Conversation Startup

Use this workflow at the start of every new project conversation.

```text
Work in the current project workspace.

Before changing files, load context progressively.

Level 0 — always load:
1. Read AI_CONTEXT.md.
2. Read .ai/runtime/active-task.json.
3. If taskId is set, read the active task's task.json, request.md, and handoff.md.
4. Inspect repository status and the files directly relevant to the immediate next action.

Level 1 — load task-linked knowledge:
5. Read context.md and follow only its references to relevant requirements, business rules, architecture sections, accepted ADRs, glossary terms, knowledge guides, and source files.
6. Read plan.md before implementation. Read verification.md before a review or verification pass.

Level 2 — load on demand only:
7. Load project-memory archives, completed/archived tasks, research, rejected ADRs, unrelated architecture, and large graph files only when the current task requires them.
8. If graph/metadata.json exists, compare sourceCommit with the current Git commit. Report a mismatch as "Graph may be outdated"; do not regenerate automatically.

If no task is active, classify the request:
- Discussion: no task workspace.
- Small isolated change: an inline plan is sufficient.
- Significant, architectural, risky, or multi-session work: create a task workspace from .ai/templates/task/ and set active-task.json.

Do not invent missing facts. Use "unknown", "not verified", or "not documented".
Preserve accepted decisions and user changes.

Return only:
- Project objective
- Current project status
- Active task
- Current task stage
- Relevant constraints
- Likely affected modules
- Current blocker
- Recommended next action

Task:
[WRITE THE TASK HERE]
```
