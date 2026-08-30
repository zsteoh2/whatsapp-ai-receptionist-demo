---
document: project-memory-current
status: active
last-reviewed: 2026-08-30
source-of-truth: true
owners:
  - project
related:
  - .ai/runtime/active-task.json
---

# Current Project Memory

Keep this file short. Move older detail to `archive/YYYY-MM.md` and add quarterly summaries under `summaries/` when useful.

## Current Project Status

- Phase 1 backend is deployed with Supabase, VectorEngine, Twilio Sandbox, Google Calendar, and Stripe Test Checkout working through Calendar event creation. The blind language suite passes 100/100, both the general dialogue suite and stricter exact UK date/time suite pass 200/200 against real Luna, and offline checks pass 26/26 after adding today/tomorrow shortcut support.

## Recently Completed

- Hardened UK time parsing from a 152/200 baseline to 200/200 without weakening the benchmark. Validated deterministic dates/times now outrank model output, while approximate, ranged, incomplete, or invalid requests stay unconfirmed and request clarification.
- Naturalised customer copy so chat uses UK date examples and plain booking language without exposing ISO, timezone, provider, or internal workflow details.
- Added an independent 100-case blind language suite. Its untouched 78/100 baseline exposed missing everyday concern phrases, FAQ paraphrases, corrections, negation/hypotheticals, family-age wording, coercion/legal language, and emergency phrasing; all discovered gaps were fixed and the final run passed 100/100.
- Made explicit customer package/date/name corrections authoritative over conflicting model guesses while preserving model-detected medical handover outside clearly benign booking language.
- Added shared normalisation for common `tdy`/`tmr` variants and ensured date shortcuts cannot be mistaken for customer names.

## Current Blockers

- No direct dialogue blocker remains. Automatic outbound confirmation separately requires a Twilio upgrade.

## Active Work

- See `.ai/runtime/active-task.json`.

## Immediate Next Steps

- Wait for Railway to deploy the date-shortcut fix, then retry one WhatsApp booking using `tmr at 2pm`.

## Recent Important Decisions

- ADR-001 selects one Railway Express service plus Supabase and deterministic safety checks before constrained LLM classification.
- ADR-002 routes constrained classification through VectorEngine Chat Completions with a configurable Base URL.
- ADR-003 uses Twilio Sandbox for the no-Meta Phase 1 demonstration while retaining the Meta adapter.
