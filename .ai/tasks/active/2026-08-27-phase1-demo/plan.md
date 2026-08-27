# Plan

## Goal

Ship the smallest reliable single-service Phase 1 implementation.

## Implementation Steps

1. Define fixed clinic content, FAQ matching, safety rules, and booking state.
2. Add minimal Supabase persistence with an in-memory test adapter.
3. Implement WhatsApp, OpenAI, Calendar, and Stripe adapters.
4. Expose health, Meta webhook, Google OAuth, and Stripe webhook endpoints.
5. Add focused automated tests, SQL schema, Railway configuration, and setup documentation.

## Risks

- External providers cannot be verified without user-owned account credentials and public webhook configuration.
- Free-tier services may sleep before a demonstration.

## Verification Method

- Type check, Node test runner, local health/webhook smoke test, and project-context validation.
