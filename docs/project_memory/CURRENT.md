---
document: project-memory-current
status: active
last-reviewed: 2026-08-28
source-of-truth: true
owners:
  - project
related:
  - .ai/runtime/active-task.json
---

# Current Project Memory

Keep this file short. Move older detail to `archive/YYYY-MM.md` and add quarterly summaries under `summaries/` when useful.

## Current Project Status

- Phase 1 backend is deployed on Railway with Supabase, VectorEngine, and live Twilio Sandbox replies working. A structured-memory upgrade is awaiting live verification; Google, Stripe, and the full public booking journey remain.

## Recently Completed

- Added bounded 24-hour structured conversation memory, natural service exploration, contextual confirmation, FAQ-aware question routing, and third-failure handoff without storing transcripts; 10 focused tests pass.

## Current Blockers

- Google Calendar and Stripe Test Mode are not yet configured.

## Active Work

- See `.ai/runtime/active-task.json`.

## Immediate Next Steps

- Deploy the structured-memory upgrade, send `RESTART`, then verify `I want something for wrinkle` followed by `Yes please` in WhatsApp.

## Recent Important Decisions

- ADR-001 selects one Railway Express service plus Supabase and deterministic safety checks before constrained LLM classification.
- ADR-002 routes constrained classification through VectorEngine Chat Completions with a configurable Base URL.
- ADR-003 uses Twilio Sandbox for the no-Meta Phase 1 demonstration while retaining the Meta adapter.
