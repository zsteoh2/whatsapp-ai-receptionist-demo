---
document: project-memory-current
status: active
last-reviewed: 2026-09-01
source-of-truth: true
owners:
  - project
related:
  - .ai/runtime/active-task.json
---

# Current Project Memory

Keep this file short. Move older detail to `archive/YYYY-MM.md` and add quarterly summaries under `summaries/` when useful.

## Current Project Status

- Phase 1 backend integrations remain implemented, but the Clinic template is offline behind `ENABLE_CLINIC_DEMO=true` and the production default is ORA-only. Exact standalone `cleaner` now selects a bounded Cleaner presentation shell without enabling unapproved service or booking facts. The retained Clinic regressions last passed blind 100/100, general 200/200, exact UK date/time 200/200, and current offline checks pass 30/30.

## Recently Completed

- Added the hidden Cleaner Demo switch: only a whole `cleaner` message activates it, normal mentions do not, the mode persists in Supabase-backed conversation memory, and `START OVER` or 24-hour expiry returns to main ORA.
- Took the Clinic template out of the default customer path without deleting its verified engine. ORA-only mode bypasses Clinic classification and new bookings, removes Clinic terminology from active copy, and returns an honest pending-template response until cleaner data is approved.
- Reworked the presentation into ORA with a concise four-option welcome, natural free-text instruction, deterministic callback handling, and a Founder phone/email CTA after confirmed bookings and human follow-up. The cleaner business template remains pending real service data and a Calendly link.
- Hardened UK time parsing from a 152/200 baseline to 200/200 without weakening the benchmark. Validated deterministic dates/times now outrank model output, while approximate, ranged, incomplete, or invalid requests stay unconfirmed and request clarification.
- Naturalised customer copy so chat uses UK date examples and plain booking language without exposing ISO, timezone, provider, or internal workflow details.
- Added an independent 100-case blind language suite. Its untouched 78/100 baseline exposed missing everyday concern phrases, FAQ paraphrases, corrections, negation/hypotheticals, family-age wording, coercion/legal language, and emergency phrasing; all discovered gaps were fixed and the final run passed 100/100.
- Made explicit customer package/date/name corrections authoritative over conflicting model guesses while preserving model-detected medical handover outside clearly benign booking language.
- Added shared normalisation for common `tdy`/`tmr` variants and ensured date shortcuts cannot be mistaken for customer names.

## Current Blockers

- The ORA shell is ready. Activating service enquiry, booking, payment, and calendar behavior is blocked on an approved cleaner process. The meeting CTA also awaits a Calendly URL; automatic outbound confirmation separately requires a Twilio upgrade.

## Active Work

- See `.ai/runtime/active-task.json`.

## Immediate Next Steps

- Rerun `supabase/schema.sql`, then push and deploy ORA-only mode, confirm Railway does not set `ENABLE_CLINIC_DEMO=true`, and smoke-test exact `cleaner`, a non-trigger phrase, `START OVER`, and callback handling in WhatsApp.
- Obtain the cleaner's services, prices, durations, hours, service area, quote/booking questions, payment policy, callback process, and Calendly URL before replacing the clinic example.

## Recent Important Decisions

- ADR-001 selects one Railway Express service plus Supabase and deterministic safety checks before constrained LLM classification.
- ADR-002 routes constrained classification through VectorEngine Chat Completions with a configurable Base URL.
- ADR-003 uses Twilio Sandbox for the no-Meta Phase 1 demonstration while retaining the Meta adapter.
