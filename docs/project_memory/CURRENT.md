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

- Phase 1 backend is deployed with Supabase, VectorEngine, Twilio Sandbox, Google Calendar, and Stripe Test Checkout working through Calendar event creation. A synchronous `STATUS` fallback for Trial confirmation is locally verified and awaiting deployment.

## Recently Completed

- Verified a live paid test booking through Calendar event creation and added `STATUS` recovery that preserves confirmation when Twilio Trial blocks asynchronous notification; 11 focused tests pass.

## Current Blockers

- Automatic outbound confirmation requires a Twilio upgrade; the free Trial fallback awaits live verification. Greeting priority still allows a greeting to be consumed as a pending customer name.

## Active Work

- See `.ai/runtime/active-task.json`.

## Immediate Next Steps

- Deploy the fallback, send `STATUS` in the existing WhatsApp conversation, then fix greeting priority.

## Recent Important Decisions

- ADR-001 selects one Railway Express service plus Supabase and deterministic safety checks before constrained LLM classification.
- ADR-002 routes constrained classification through VectorEngine Chat Completions with a configurable Base URL.
- ADR-003 uses Twilio Sandbox for the no-Meta Phase 1 demonstration while retaining the Meta adapter.
