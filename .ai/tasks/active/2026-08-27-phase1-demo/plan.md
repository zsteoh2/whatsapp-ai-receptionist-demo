# Plan

## Goal

Ship the smallest reliable single-service Phase 1 implementation.

## Implementation Steps

1. Define fixed clinic content, FAQ matching, safety rules, and booking state.
2. Add minimal Supabase persistence with an in-memory test adapter.
3. Implement WhatsApp, OpenAI, Calendar, and Stripe adapters.
4. Expose health, Meta webhook, Google OAuth, and Stripe webhook endpoints.
5. Add focused automated tests, SQL schema, Railway configuration, and setup documentation.
6. Add bounded structured conversation memory, natural service exploration, and clarification before handoff without storing transcripts.
7. Extract multiple booking fields from natural language, preserve valid supplied fields, and ask only for missing data while keeping deterministic safety and approved replies.
8. Direct-test unusual language without WhatsApp traffic; add safety backstops and reject ambiguous packages or invented times before live-channel smoke testing.
9. Expand the direct real-Luna suite to 100 style-diverse scenarios, move stable FAQ and high-risk safety meanings behind deterministic guards, and rerun the entire suite after each shared-layer fix.
10. Expand the suite to exactly 200 scenarios with 100 UK-focused cases spanning regional lexical forms, registers, approved FAQ paraphrases, British date/time language, safety expressions, ambiguity, and memory; keep dialect labels out of runtime memory and avoid demographic inference.
11. Add a separate 200-case UK date/time benchmark that compares the exact stored `Europe/London` minute, rejects vague or incomplete times, and isolates language understanding from Calendar availability.
12. Add the ORA presentation layer around the working clinic example: a clean four-option welcome, deterministic callback handoff, and Founder CTA after booking confirmation, while keeping the existing business engine intact.
13. Take the Clinic template offline behind a disabled-by-default runtime flag; make ORA-only mode honest about the pending business template and preserve the Clinic engine only for regression or explicitly authorised reuse.
14. Add a deterministic hidden Cleaner Demo selected only by a standalone `cleaner` message, persist that mode in bounded conversation memory, and ensure `START OVER`, expiry, or non-exact mentions behave safely.
15. Add a generic `START DEMO` journey that reuses the existing Calendar, Stripe, persistence, and confirmation path with an `ORA Demo Appointment` and £1 test payment.
16. Reuse the installed Supabase client to validate bearer access tokens and protect administrative HTTP routes while preserving webhook signatures and OAuth callback state.

## Risks

- External providers cannot be verified without user-owned account credentials and public webhook configuration.
- Free-tier services may sleep before a demonstration.

## Verification Method

- Type check, Node test runner, local health/webhook smoke test, and project-context validation.

## 2026-09-08 - ORA semantic migration
1. Reuse the authorised existing model connection with an ORA-specific structured intent schema and bounded topic/booking context.
2. Route natural ORA messages through that classifier before keyword fallbacks; preserve deterministic safety, consent, Calendar and payment actions.
3. Verify injected-model safety/state regressions and real-model screenshot/paraphrase scenarios with other providers isolated.
4. Update task and architecture records; keep deployment status explicit.

## 2026-09-08 - 1,000 random English tests
- Generate exactly 1,000 distinct seeded English cases across capability questions, contextual interruptions, details/corrections, safety and consent/status safeguards.
- Run the real configured model through ConversationEngine with eight bounded workers and isolated provider doubles; retain case-level results, latency, failure type and replay support.
- Keep the original corpus and first-pass results unchanged. Fix verified defects and replay failures separately before final regression/report.

## 2026-09-08 - 3,000 regional/persona English samples
- Generate and freeze 3,000 new English messages: 12 regional style profiles x 25 intent scenarios x 10 fictional persona/register styles. Use the authorised model for varied paraphrases, validate corpus shape, explicit details and uniqueness; report synthetic/model-generated limitations.
- Reuse the live runner with external corpus support, distinct synthetic names/user IDs, shared-store isolation checks, per-region/persona results and unchanged production timeout. Preserve baseline before fixes.
- Investigate failures, distinguish oracle ambiguity from implementation defects and provider failures, verify justified fixes, and retain all raw runs and limitations.

## 2026-09-08 - Repair regional benchmark findings
- Fix shared safety false positives, modal/date ambiguity and exact-time discourse handling; clarify polite rescheduling and overlapping topic precedence.
- Preserve frozen baseline, run offline safety/booking regressions and actual-model failed-case replay, then broader unchanged corpus regression.
- Keep external provider latency separate from behavioral correctness; do not extend timeouts to hide failures.
