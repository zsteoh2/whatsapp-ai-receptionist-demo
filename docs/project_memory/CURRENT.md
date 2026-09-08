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

- 2026-09-08: Last three timeout cases passed unchanged code at one worker and were added to permanent live regressions (20/20). All corpus IDs have eventual passing records, not a one-pass 3000/3000 result. Provider reliability still unverified; see active task FINAL_THREE report.

- 2026-09-08: Post-fix 3000-case rerun completed across eight-worker and user-requested two-worker stages: latest results 2997 passed, three model timeouts, zero behavior failures. This combines retries. Lower concurrency improved tail latency; provider cap unverified. See active task ora-regional-results/POST_FIX_RERUN.md. No deployment.

- 2026-09-08: Regional benchmark behavior roots repaired locally. All 163 original failed IDs have passing replay records across interrupted/resumed runs; 37 offline checks and real multi-turn 17/17 pass. No full post-fix 3000 rerun; provider reliability and deployment remain pending. See active task ora-regional-results/FIXES.md.

- 2026-09-08: Completed 3,000 synthetic regional English live tests: 2,837 passed, 96 assertion failures, 67 model unavailable. Deterministic safety false positives and date-context gaps remain; see active task ora-regional-results/REPORT.md. No fixes or deployment in this batch.

- 2026-09-08: 1,000 randomized English cases tested with the real configured model. Full regression: 936/1,000; one behavior failure fixed, 63 model-unavailable cases. All 64 then passed a two-worker replay; eight-worker latency remains a limitation. See active task ora-random-results/REPORT.md. No deployment.

- 2026-09-08: ORA semantic intent routing is implemented locally using the existing model service and bounded topic/workflow context. Build and 36/36 offline checks pass. After the user changed the local endpoint to RelayRouter, the real-model ORA suite passed 17/17 steps (13 model calls). Initial timeouts occurred; Railway configuration/deployment and phone testing remain unverified. See latest task handoff.

- Registered Twilio sender and abc menu: local implementation passes 33 tests; Twilio callback and Railway sender/menu variables are configured. Railway variable rollout is Online. Menu code deployment awaits CLI login; see active handoff.

- Phase 1 backend integrations remain implemented, but the Clinic template is offline behind `ENABLE_CLINIC_DEMO=true` and the production default is ORA-only. Exact standalone `cleaner` selects a bounded Cleaner presentation shell without enabling unapproved facts. Supabase bearer authentication now protects administrative routes. The retained Clinic regressions last passed blind 100/100, general 200/200, exact UK date/time 200/200, and current offline checks pass 32/32.

## Recently Completed

- Added Supabase bearer authentication with the existing client: `/api/me` and Google OAuth initiation validate current users, while signed/state-protected provider callbacks and public status routes keep their existing controls.
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
- Live Auth verification awaits an enabled Supabase sign-in provider plus project URL and publishable/service-role keys in local or Railway configuration.

## Active Work

- See `.ai/runtime/active-task.json`.

## Immediate Next Steps

- Configure Supabase Auth, add `SUPABASE_PUBLISHABLE_KEY`, sign in as the permitted user, and smoke-test `/api/me` plus protected Google OAuth initiation.
- Rerun `supabase/schema.sql`, then push and deploy ORA-only mode, confirm Railway does not set `ENABLE_CLINIC_DEMO=true`, and smoke-test exact `cleaner`, a non-trigger phrase, `START OVER`, and callback handling in WhatsApp.
- Obtain the cleaner's services, prices, durations, hours, service area, quote/booking questions, payment policy, callback process, and Calendly URL before replacing the clinic example.

## Recent Important Decisions

- ADR-001 selects one Railway Express service plus Supabase and deterministic safety checks before constrained LLM classification.
- ADR-002 routes constrained classification through VectorEngine Chat Completions with a configurable Base URL.
- ADR-003 uses Twilio Sandbox for the no-Meta Phase 1 demonstration while retaining the Meta adapter.
