# Request

## User Request

Implement the approved Phase 1 demo plan for a fictional Leeds aesthetic clinic.

On 2026-09-01, update the presentation into ORA, a clean reusable business-assistant demo. Preserve the working clinic flow as the current example, add a scannable opening for booking/enquiry/general questions/callbacks, and end successful or human-follow-up flows with the approved Founder contact details.

Later on 2026-09-01, take the Clinic presentation offline and focus only on ORA. Retain the verified Clinic implementation without exposing it to customers, and do not invent replacement business content before approved cleaner data is supplied.

Also add a hidden Cleaner Demo. It must activate only when the user sends the single standalone word `cleaner`; ordinary phrases that mention cleaner must remain in main ORA. `START OVER` must exit Cleaner mode, and the shell must not invent missing cleaner facts.

On 2026-09-02, make the main ORA experience demonstrate the assistant itself rather than any Clinic identity. Prospects should be able to ask what ORA can do and receive truthful answers about business knowledge, bookings, payments, integrations, and human handover. A short explicit conversation ending should provide the Founder CTA.

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

## Out of Scope

- Production payments or WhatsApp number, real patient data, dashboard, CRM, multi-tenancy, reminders, and medical diagnosis.
