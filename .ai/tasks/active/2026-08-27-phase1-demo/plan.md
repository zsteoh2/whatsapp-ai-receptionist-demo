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

## Risks

- External providers cannot be verified without user-owned account credentials and public webhook configuration.
- Free-tier services may sleep before a demonstration.

## Verification Method

- Type check, Node test runner, local health/webhook smoke test, and project-context validation.
