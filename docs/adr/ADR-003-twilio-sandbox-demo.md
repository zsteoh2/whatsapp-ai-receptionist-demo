---
document: ADR-003
status: accepted
last-reviewed: 2026-08-28
source-of-truth: true
owners:
  - engineering
related:
  - docs/architecture/overview.md
---

# ADR-003: Twilio Sandbox for the Phase 1 Demo

## Status

Accepted

## Decision

Use Twilio WhatsApp Sandbox for the scheduled or recorded Phase 1 demo so testing can proceed without Meta Business Portfolio onboarding. Keep the existing Meta adapter as an optional alternative.

## Consequences

- The demo uses Twilio's shared test sender and only joined test recipients.
- Production onboarding and a branded sender remain out of scope.
- Incoming Twilio signatures are verified and replies use the existing conversation engine.

## Date

2026-08-28
