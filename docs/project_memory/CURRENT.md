---
document: project-memory-current
status: active
last-reviewed: 2026-08-27
source-of-truth: true
owners:
  - project
related:
  - .ai/runtime/active-task.json
---

# Current Project Memory

Keep this file short. Move older detail to `archive/YYYY-MM.md` and add quarterly summaries under `summaries/` when useful.

## Current Project Status

- Phase 1 backend is implemented and locally verified. External test-service configuration and public end-to-end verification remain.

## Recently Completed

- Single Express service, fixed clinic content, safety handover, Supabase schema, Meta/OpenAI/Google/Stripe adapters, Railway config, README, and 6 passing tests.

## Current Blockers

- User-owned Supabase, Meta, Google, Stripe, and Railway configuration is not present.
- This machine cannot currently connect to `api.openai.com`; no API response was received during two live checks.

## Active Work

- See `.ai/runtime/active-task.json`.

## Immediate Next Steps

- Configure the external test services using `README.md`, deploy to Railway, and run the full acceptance journey.

## Recent Important Decisions

- ADR-001 selects one Railway Express service plus Supabase and deterministic safety checks before constrained LLM classification.
