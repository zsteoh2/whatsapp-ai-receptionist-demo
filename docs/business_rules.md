---
document: business-rules
status: draft
last-reviewed: 2026-09-01
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
| BR-DEMO-001 | Presentation brand is `ORA`. The legacy Clinic template is offline and disabled by default; it may run only when `ENABLE_CLINIC_DEMO=true` is explicitly set for regression or authorised reuse. | All customer output | None. | approved |
| BR-DEMO-002 | Cleaner Demo activates only when the entire trimmed message is `cleaner`, case-insensitively. Other mentions do not switch mode; `START OVER` exits it. | ORA-only conversation routing | The mode expires with normal 24-hour conversation memory. | approved |
| BR-CTA-001 | Successful booking confirmation and callback/human handover provide a clean Founder contact path using `07955 506757` and `hau@convertbydigital.com`, plus a retest instruction where appropriate. | End-of-flow customer output | Do not invent a Calendly URL until one is supplied. | approved |
| BR-ORA-001 | ORA may explain only implemented or configurable capabilities and must distinguish the generic demonstration from a configured customer business. | ORA capability answers | Do not claim an unverified integration, service catalogue, price, policy, availability rule, or autonomous learning behavior. | approved |
| BR-ORA-002 | `START DEMO` runs an explicitly synthetic ORA appointment journey using a £1 Stripe Test Mode payment, sample Calendar availability, and no real appointment. | ORA interactive demo | The generic demo must not expose Clinic content or present its sample rules as a customer's real business rules. | approved |
| BR-MED-001 | General approved information is allowed; personalised diagnosis, suitability, risk, symptoms, history, medication, pregnancy, under-18, complaints, or emergencies hand over. | Conversation engine | Emergency uses the emergency response instead of ordinary handover. | approved |
| BR-BOOK-001 | Same-day bookings require two hours' notice and live Calendar availability. | Slot engine | None | approved |
| BR-PAY-001 | Deposits are £10/£20/£30 for Packages 1/2/3 and use Stripe Test Mode only. | Checkout and confirmation | None | approved |
| BR-CANCEL-001 | Free cancellation/rescheduling needs 24 hours' notice; late cancellation or no-show may retain the test deposit. | FAQ and policy consent | Disputes hand over. | approved |
| BR-MEM-001 | Conversation memory contains only workflow state, selected business demo mode, selected package, safe concern category, booking fields, and update time; it expires after 24 hours of inactivity. | Conversation engine and persistence | Booking records and integration references follow their own lifecycle. | approved |
| BR-AUTH-001 | Administrative HTTP routes require a currently valid Supabase user access token. | `/api/me` and Google OAuth initiation | Provider webhooks use signatures, the OAuth callback uses signed state, and public status/payment-return routes remain unauthenticated. | approved |

## Invariants

- Never confirm a booking until Stripe test payment and Google Calendar event creation both succeed.
- Never invent staff names, unapproved contact details, prices, policies, availability, response times, or meeting links.
- Never store full chat transcripts or raw medical content as conversation memory.

## Permissions

- Only the server-side integration credentials may access Supabase service operations.

## Limits

- ORA-only mode has no active service catalogue or booking policy until approved business data is supplied.
- The retained Clinic regression template contains three packages, twenty FAQs, one fictional practitioner, one calendar, and English text only.
