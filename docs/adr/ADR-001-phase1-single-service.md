---
document: ADR-001
status: accepted
last-reviewed: 2026-08-27
source-of-truth: true
owners:
  - engineering
related:
  - docs/architecture/overview.md
---

# ADR-001: Phase 1 Single-Service Architecture

## Status

Accepted

## Decision

Use one TypeScript/Express service on Railway Free, Supabase Free for persistent state, and direct SDK/HTTPS adapters for Meta, OpenAI, Google Calendar, and Stripe Test Mode. Use deterministic safety rules before a constrained OpenAI Responses API classifier. Do not add a queue, dashboard, CRM, or multi-tenant abstractions.

## Consequences

- The demonstration is inexpensive and easy to deploy and inspect.
- Free-tier sleeping requires a pre-demo wake-up check.
- Same-process background WhatsApp handling is acceptable for scheduled demos, but production delivery guarantees require a queue in a later phase.

## Supersedes

None

## Date

2026-08-27
