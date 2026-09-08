# Request

## User Request

Implement the approved Phase 1 demo plan for a fictional Leeds aesthetic clinic.

On 2026-09-01, update the presentation into ORA, a clean reusable business-assistant demo. Preserve the working clinic flow as the current example, add a scannable opening for booking/enquiry/general questions/callbacks, and end successful or human-follow-up flows with the approved Founder contact details.

Later on 2026-09-01, take the Clinic presentation offline and focus only on ORA. Retain the verified Clinic implementation without exposing it to customers, and do not invent replacement business content before approved cleaner data is supplied.

Also add a hidden Cleaner Demo. It must activate only when the user sends the single standalone word `cleaner`; ordinary phrases that mention cleaner must remain in main ORA. `START OVER` must exit Cleaner mode, and the shell must not invent missing cleaner facts.

On 2026-09-02, make the main ORA experience demonstrate the assistant itself rather than any Clinic identity. Prospects should be able to ask what ORA can do and receive truthful answers about business knowledge, bookings, payments, integrations, and human handover. A short explicit conversation ending should provide the Founder CTA.

On 2026-09-04, add a complete generic ORA interactive journey that does not depend on WhatsApp or Clinic content: collect a demo name and time, check sample Calendar availability, show the demo policy, create a £1 Stripe Test Mode Checkout, confirm after payment, and finish with the Founder CTA.

Also on 2026-09-04, add Supabase Auth and protect administrative HTTP routes without changing the signature/state security model of public provider callbacks.

## Expected Result

A runnable and deployable TypeScript backend integrating Meta WhatsApp, OpenAI Responses API, Supabase, Google Calendar, and Stripe Test Mode.

## Acceptance Criteria

- The approved FAQ, safety, booking, payment, Calendar, idempotency, and failure scenarios are covered by runnable checks.
- Secrets are ignored and never emitted in logs.
- External account setup is documented and can be completed without source changes.
- The ORA opening, callback request, and Founder CTA are covered by runnable checks without weakening the existing booking and safety flow.
- ORA-only mode is the default, bypasses the Clinic classifier and new-booking path, and emits no Clinic/package/service-specific copy.
- Exact `cleaner` activation, non-trigger phrases, persistence, expiry, and `START OVER` exit are covered by runnable checks.
- ORA capability questions and an explicit end-of-demo Founder CTA are covered without exposing Clinic content or inventing customer-business facts.
- `START DEMO` reaches a £1 Stripe Test Mode Checkout and payment confirmation through the active ORA-only path, with no Clinic copy or real appointment claim.
- Missing, invalid, and expired Supabase bearer tokens cannot access administrative routes; a valid current user can inspect their identity and initiate Google OAuth.

## Out of Scope

- Production payments or WhatsApp number, real patient data, dashboard, CRM, multi-tenancy, reminders, and medical diagnosis.

2026-09-08: User requested migrating AI understanding into current ORA and explicitly authorised reusing the existing model service/key.

2026-09-08: User requested 1,000 randomized English tests and confirmed that real model quota consumption is intended.

2026-09-08: User requested 3,000 additional distinct English messages with different fictional people, regions and slang; real model quota use remained authorised.

2026-09-08: User authorised fixing the regional benchmark findings.

2026-09-08: User requested the complete 3,000-case post-fix rerun. Same corpus, eight workers, real configured model and unchanged runtime timeout.

2026-09-08: During the rerun, user requested lower concurrency to investigate a suspected provider limit; continued at two workers.

2026-09-08: User requested investigating/fixing the remaining three unavailable messages (2865, 1769, 1012).

2026-09-08: User explicitly requested pushing the latest ORA work to GitHub so they can test later. Publish reviewed current main without rewriting remote history.
