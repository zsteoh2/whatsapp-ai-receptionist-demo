---
document: ai-context-migration
status: active
last-reviewed: unknown
source-of-truth: false
owners:
  - project
related:
  - AI_CONTEXT.md
---

# AI Context v1 to v2 Migration

Running the initializer again is an incremental upgrade: it creates missing v2 files and skips every existing file.

## Recommended Order

1. Commit or back up the current project.
2. Run the initializer without `--force`.
3. Review newly created `.ai/`, `docs/project_memory/`, and `graph/metadata.json` files.
4. Review `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and `.cursor/rules/ai-context.mdc`. Existing files are preserved, so add the bootstrap lines manually when needed.
5. Copy the current status and immediate next steps from `docs/project_memory.md` into `docs/project_memory/CURRENT.md`.
6. Move older entries manually into `docs/project_memory/archive/YYYY-MM.md` only after reviewing them.
7. Add stable IDs to requirements, business rules, components, and ADRs incrementally.
8. Add metadata to existing authoritative documents when each document is next reviewed.
9. Run `.ai/scripts/validate-context.py` and address errors first; treat freshness warnings as review recommendations.
10. Delete `docs/project_memory.md` only after its content is safely represented in the new memory structure and the deletion is reviewed.

## Compatibility

- Existing files and accepted ADRs are never overwritten by the default initializer.
- Hooks and vendor adapters are optional.
- A project can continue using only Markdown when Python is unavailable.
- An empty `active-task.json` means no primary task is active.
