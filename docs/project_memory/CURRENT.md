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

- Phase 1 backend is deployed on Railway with Supabase, VectorEngine, live Twilio Sandbox replies, structured memory, Google OAuth, and Google Calendar occupied-slot checks working. Stripe and the full paid booking journey remain.

## Recently Completed

- Verified live Google Calendar availability checking and set Luna reasoning effort explicitly to `medium`; build, 10 focused tests, and a live VectorEngine classification pass.

## Current Blockers

- Stripe Test Mode is not yet configured; greeting priority still allows a greeting to be consumed as a pending customer name.

## Active Work

- See `.ai/runtime/active-task.json`.

## Immediate Next Steps

- Deploy the Luna medium-effort update, configure Stripe Test Checkout/webhooks, and then run the complete booking confirmation journey.

## Recent Important Decisions

- ADR-001 selects one Railway Express service plus Supabase and deterministic safety checks before constrained LLM classification.
- ADR-002 routes constrained classification through VectorEngine Chat Completions with a configurable Base URL.
- ADR-003 uses Twilio Sandbox for the no-Meta Phase 1 demonstration while retaining the Meta adapter.
