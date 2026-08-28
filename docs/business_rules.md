---
document: business-rules
status: draft
last-reviewed: 2026-08-27
source-of-truth: true
owners:
  - product
related: []
---

# Business Rules

Use stable IDs such as `BR-AUTH-001`. Do not reuse retired IDs.

## Rules

| ID | Rule | Applies To | Exceptions | Status |
|---|---|---|---|---|
| BR-DEMO-001 | Brand is `Aesthetic Clinic`; never use the reference clinic's name. | All customer output | None | approved |
| BR-MED-001 | General approved information is allowed; personalised diagnosis, suitability, risk, symptoms, history, medication, pregnancy, under-18, complaints, or emergencies hand over. | Conversation engine | Emergency uses the emergency response instead of ordinary handover. | approved |
| BR-BOOK-001 | Same-day bookings require two hours' notice and live Calendar availability. | Slot engine | None | approved |
| BR-PAY-001 | Deposits are £10/£20/£30 for Packages 1/2/3 and use Stripe Test Mode only. | Checkout and confirmation | None | approved |
| BR-CANCEL-001 | Free cancellation/rescheduling needs 24 hours' notice; late cancellation or no-show may retain the test deposit. | FAQ and policy consent | Disputes hand over. | approved |
| BR-MEM-001 | Conversation memory contains only workflow state, selected package, safe concern category, booking fields, and update time; it expires after 24 hours of inactivity. | Conversation engine and persistence | Booking records and integration references follow their own lifecycle. | approved |

## Invariants

- Never confirm a booking until Stripe test payment and Google Calendar event creation both succeed.
- Never invent staff names, contact details, prices, policies, availability, or response times.
- Never store full chat transcripts or raw medical content as conversation memory.

## Permissions

- Only the server-side integration credentials may access Supabase service operations.

## Limits

- Three packages, twenty approved FAQs, one fictional practitioner, one calendar, English text only.
