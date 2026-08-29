---
document: project-memory-current
status: active
last-reviewed: 2026-08-29
source-of-truth: true
owners:
  - project
related:
  - .ai/runtime/active-task.json
---

# Current Project Memory

Keep this file short. Move older detail to `archive/YYYY-MM.md` and add quarterly summaries under `summaries/` when useful.

## Current Project Status

- Phase 1 backend is deployed with Supabase, VectorEngine, Twilio Sandbox, Google Calendar, and Stripe Test Checkout working through Calendar event creation. All known direct dialogue gaps pass locally and await deployment plus one final WhatsApp smoke test.

## Recently Completed

- Added a no-WhatsApp live dialogue harness, fixed all discovered gaps plus later model-variance cases, and reached 19/19 offline plus 26/26 real-Luna unusual-language scenarios.

## Current Blockers

- No direct dialogue blocker remains. Automatic outbound confirmation separately requires a Twilio upgrade.

## Active Work

- See `.ai/runtime/active-task.json`.

## Immediate Next Steps

- Deploy the verified fixes, then spend one compact WhatsApp message chain on final smoke testing.

## Recent Important Decisions

- ADR-001 selects one Railway Express service plus Supabase and deterministic safety checks before constrained LLM classification.
- ADR-002 routes constrained classification through VectorEngine Chat Completions with a configurable Base URL.
- ADR-003 uses Twilio Sandbox for the no-Meta Phase 1 demonstration while retaining the Meta adapter.
