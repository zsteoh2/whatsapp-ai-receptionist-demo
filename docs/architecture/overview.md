---
document: architecture-overview
status: draft
last-reviewed: 2026-09-01
source-of-truth: true
owners:
  - engineering
related:
  - docs/adr/ADR-001-phase1-single-service.md
  - docs/adr/ADR-002-vectorengine-chat-completions.md
  - docs/adr/ADR-003-twilio-sandbox-demo.md
---

# Architecture Overview

Use stable component IDs such as `COMP-AUTH-SERVICE`.

## System Context

系统边界：A single TypeScript/Express webhook service presents ORA through Twilio Sandbox (or Meta). ORA-only mode is the default and bypasses the legacy Clinic classifier, catalogue, and new-booking state machine. An exact standalone `cleaner` command selects a persistent Cleaner presentation shell without enabling unapproved booking logic. The retained Clinic path can be explicitly enabled for regression; only that path calls the OpenAI-compatible classifier and uses Supabase, Google Calendar, and Stripe for new bookings.

## Components

| ID | Component | Responsibility | Input | Output |
|---|---|---|---|---|
| COMP-HTTP | Express API | Health, OAuth, WhatsApp-provider and Stripe endpoints | HTTPS requests | HTTP responses/background processing |
| COMP-CONVERSATION | Conversation engine | Safety-first intent routing, shorthand normalization, ambiguity/time validation, multi-field extraction, bounded structured memory, clarification, and booking state machine | Text and stored booking context | Approved reply/action |
| COMP-INTEGRATIONS | External adapters | WhatsApp, OpenAI, Google Calendar, Stripe | Typed application calls | Provider responses |
| COMP-STORE | Persistence | Conversations, bookings, idempotency, handoffs, OAuth token | Application records | Supabase rows |

## Dependencies

| Caller | Callee | Protocol |
|---|---|---|
| HTTP service | Twilio Sandbox or Meta WhatsApp Cloud API | HTTPS/form or HTTPS/JSON |
| Conversation engine | OpenAI-compatible Chat Completions API | HTTPS/JSON |
| HTTP service | Stripe | SDK/HTTPS |
| HTTP service | Google Calendar | OAuth 2.0/HTTPS |
| Store | Supabase | HTTPS/PostgREST |

## Data Stores

| Store | Purpose | Owner |
|---|---|---|
| Supabase Postgres | Bounded structured conversation context, bookings, processed events, handoffs, Google OAuth token | Application |

## External Services

- Twilio WhatsApp Sandbox for the Phase 1 demo (with an optional Meta adapter), VectorEngine's OpenAI-compatible Chat Completions API, Google Calendar API, Stripe Test Mode, Supabase.

## Constraints

- One process, one clinic, one calendar, no queue or dashboard; free-tier services may sleep.
- Conversation context reuses the existing conversation row, stores only business mode/workflow/package/concern/name/date-time fields, stores no raw transcript, and expires after 24 hours of inactivity.
- Deterministic safety rules run before the LLM; the classifier also returns a constrained handover category as a second safety layer for paraphrases.
- The classifier may extract FAQ, booking intent, package, preferred name, and local date/time from one message; application code rejects ambiguous packages and inferred clock times, validates and persists fields, executes actions, and asks only for missing booking data.
- `ENABLE_CLINIC_DEMO=false` is the default runtime boundary. ORA-only mode permits welcome, capability information, callback/human handover, and status recovery for an existing test booking, but blocks new Clinic enquiries and bookings.
- Cleaner selection is deterministic and handled before model classification. Only the entire trimmed message `cleaner` activates it; `START OVER` clears it, and normal conversation expiry removes it.
