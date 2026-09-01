---
document: product-requirements
status: draft
last-reviewed: 2026-09-01
source-of-truth: true
owners:
  - product
related: []
---

# Requirements

Use stable IDs such as `REQ-AUTH-001`. Do not reuse retired IDs.

## Functional Requirements

Current mode note: ORA-only mode is the production default. Clinic-specific FAQ, booking, memory, Calendar, and payment requirements remain regression-tested behind `ENABLE_CLINIC_DEMO=true` but are not customer-accessible while the Clinic template is offline.

| ID | Priority | Requirement | Acceptance Criteria | Status |
|---|---|---|---|---|
| REQ-WA-001 | Must | Verify the configured WhatsApp provider webhook and receive/send text messages. | Twilio or Meta signature verification succeeds; duplicate message IDs are ignored. | approved |
| REQ-FAQ-001 | Must | Answer only the 20 approved English FAQs. | Approved variants return fixed facts; unknown non-sensitive messages receive two clarification attempts without invented facts, then hand over on the third failure. | approved |
| REQ-BOOK-001 | Must | Collect name, package, preferred date/time, and policy consent. | One natural-language message may fill multiple booking fields; the bot preserves valid fields, asks only for missing data, never selects between ambiguous packages, never invents a clock time from a vague period, and never requests prohibited medical data. | approved |
| REQ-MEM-001 | Must | Maintain bounded structured context per WhatsApp conversation. | Discussed and extracted package, concern, name, and date/time fields carry into the next turn; greetings do not overwrite pending fields; inactive context resets after 24 hours; raw transcripts are not stored. | approved |
| REQ-CAL-001 | Must | Check Google Calendar before offering or confirming a slot. | Busy slots cannot be confirmed; events use Europe/London. | approved |
| REQ-PAY-001 | Must | Use Stripe Test Checkout deposits before confirmation. | Only completed test checkout can create an event; a confirmed booking remains confirmed if outbound notification fails and can be retrieved with `STATUS`. | approved |
| REQ-HO-001 | Must | Stop automation and log medical, emergency, complaint, under-18, or human requests. | Deterministic checks run first and a constrained LLM handover signal catches paraphrases; emergency response gives 999/111 guidance and other triggers create a handoff. | approved |
| REQ-DEPLOY-001 | Must | Run as one Railway-hosted Node service with Supabase persistence. | `/health` reports configuration readiness without revealing secrets. | approved |
| REQ-PRES-001 | Must | Present the assistant as ORA with a clean, reusable prospect journey. | The welcome invites prospects to explore ORA's capabilities, business knowledge, booking/payment/follow-up automation, and Founder contact; Clinic terms never appear in ORA-only mode; unsupported business-specific requests receive an honest pending-template response. | approved |
| REQ-PRES-003 | Must | Demonstrate ORA's own knowledge without inventing a customer business. | Questions about knowledge, bookings, payments, integrations, and human handover receive fixed truthful capability answers; short explicit conversation endings provide the Founder CTA and retest instruction. | approved |
| REQ-PRES-002 | Must | Provide a hidden Cleaner Demo without accidental activation. | Only an entire case-insensitive `cleaner` message selects the mode; messages containing additional words do not; the selection persists for the bounded 24-hour conversation window; `START OVER` returns to main ORA; no cleaner service, price, coverage, availability, or booking rule is invented. | approved |

## Non-Functional Requirements

| ID | Category | Requirement | Verification | Status |
|---|---|---|---|---|
| REQ-NFR-001 | Security | Verify WhatsApp-provider and Stripe signatures; keep credentials and sensitive content out of logs. | Automated signature tests and source review. | approved |
| REQ-NFR-002 | Reliability | WhatsApp and Stripe processing is idempotent. | Replayed event tests create one result. | approved |
| REQ-NFR-003 | Privacy | Store only minimum booking fields, bounded structured conversation context, and safe handoff summaries. | Schema and conversation tests confirm raw chat content is not stored. | approved |
