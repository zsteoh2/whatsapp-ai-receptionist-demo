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

- Phase 1 backend is deployed on Railway with Supabase and VectorEngine configured. Twilio, Google, Stripe, and public end-to-end verification remain.

## Recently Completed

- Added a signed Twilio Sandbox webhook and sender while retaining the optional Meta adapter; 7 focused tests pass.

## Current Blockers

- A newly generated Twilio Auth Token and Sandbox webhook must be configured in Railway.
- Google Calendar and Stripe Test Mode are not yet configured.

## Active Work

- See `.ai/runtime/active-task.json`.

## Immediate Next Steps

- Deploy the Twilio adapter, configure its Railway variables and inbound webhook, then send one signed WhatsApp test message.

## Recent Important Decisions

- ADR-001 selects one Railway Express service plus Supabase and deterministic safety checks before constrained LLM classification.
- ADR-002 routes constrained classification through VectorEngine Chat Completions with a configurable Base URL.
- ADR-003 uses Twilio Sandbox for the no-Meta Phase 1 demonstration while retaining the Meta adapter.
