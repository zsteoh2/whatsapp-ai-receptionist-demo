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

- Phase 1 backend is deployed with Supabase, VectorEngine, Twilio Sandbox, Google Calendar, and Stripe Test Checkout working through Calendar event creation. The synchronous `STATUS` fallback and natural multi-field dialogue upgrade are locally verified and awaiting deployment.

## Recently Completed

- Upgraded greeting priority and natural-language booking extraction so one message may fill FAQ/package/name/date-time fields and only missing data is requested; live Luna schema verification passed and 15 focused tests pass.

## Current Blockers

- Automatic outbound confirmation requires a Twilio upgrade; the free Trial `STATUS` fallback and conversation upgrade await live WhatsApp verification after deployment.

## Active Work

- See `.ai/runtime/active-task.json`.

## Immediate Next Steps

- Deploy, send `RESTART`, live-test one multi-field booking message and a greeting during name collection, then send `STATUS` for the existing confirmed booking.

## Recent Important Decisions

- ADR-001 selects one Railway Express service plus Supabase and deterministic safety checks before constrained LLM classification.
- ADR-002 routes constrained classification through VectorEngine Chat Completions with a configurable Base URL.
- ADR-003 uses Twilio Sandbox for the no-Meta Phase 1 demonstration while retaining the Meta adapter.
