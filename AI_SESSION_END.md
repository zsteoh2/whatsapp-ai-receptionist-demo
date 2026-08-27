---
document: ai-session-end
status: active
last-reviewed: unknown
source-of-truth: true
owners:
  - project
related:
  - AI_CONTEXT.md
  - docs/project_memory/CURRENT.md
---

# Conversation End Checklist

Use this workflow before ending project work.

```text
1. Inspect changes
- Review repository status, diff, changed/generated/temporary files, and unexpected modifications.
- Remove only accidental changes. Preserve intentional user changes.

2. Verify independently
- Move the task to verification before review.
- Check requirements, business rules, architecture consistency, regressions, build, tests, lint/static analysis, manual behavior, and documentation accuracy as applicable.
- Record each result in verification.md as: passed, failed, not run, not available, or blocked.
- Never claim a check passed when it was not executed.
- Prefer a separate reviewer agent when available; otherwise use a separate review pass that does not assume the implementation is correct.

3. Synchronize authoritative documentation
- Update requirements, business rules, glossary, architecture, or a new ADR only when the underlying fact changed.
- Never overwrite an accepted ADR; add a superseding ADR.
- Regenerate graph artifacts only after structural changes or when graph accuracy is required. Update graph/metadata.json when regenerated.

4. Promote durable knowledge
- Promote only verified, stable, reusable, project-wide discoveries.
- Do not promote temporary debugging data, task-only paths, one-time details, or assumptions.

5. Maintain memory
- Keep docs/project_memory/CURRENT.md short: current status, recent completions, blockers, active work, immediate next steps, and recent important decisions.
- Move older detail to docs/project_memory/archive/YYYY-MM.md and create summaries/YYYY-QN.md when useful.
- Do not delete legacy docs/project_memory.md automatically.

6. Update task state
- Update implementation-log.md with meaningful progress only.
- Update handoff.md with completed work, verification, documentation, limitations, remaining work, blocker, and exact next action.
- Update task.json and .ai/runtime/active-task.json.
- On completion, move the task directory from active/ to completed/ and clear active-task.json. Archive completed tasks later according to project policy.

7. Validate
- Run: python .ai/scripts/validate-context.py .
- Treat stale metadata and graph mismatch as review recommended, not proof of incorrect content.
- Confirm AI_CONTEXT.md remains a concise entry point, not a development log.

Return only:
- Completed
- Verification
- Documentation updated
- Remaining blocker or next step
```
