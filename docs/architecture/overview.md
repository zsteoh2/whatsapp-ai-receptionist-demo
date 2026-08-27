---
document: architecture-overview
status: draft
last-reviewed: 2026-08-27
source-of-truth: true
owners:
  - engineering
related: []
---

# Architecture Overview

Use stable component IDs such as `COMP-AUTH-SERVICE`.

## System Context

系统边界：A single TypeScript/Express webhook service receives Meta and Stripe events, calls OpenAI only for constrained intent extraction, reads/writes booking state in Supabase, and checks/creates events in Google Calendar.

## Components

| ID | Component | Responsibility | Input | Output |
|---|---|---|---|---|
| COMP-HTTP | Express API | Health, OAuth, Meta and Stripe endpoints | HTTPS requests | HTTP responses/background processing |
| COMP-CONVERSATION | Conversation engine | Safety-first intent and booking state machine | Text and stored state | Approved reply/action |
| COMP-INTEGRATIONS | External adapters | WhatsApp, OpenAI, Google Calendar, Stripe | Typed application calls | Provider responses |
| COMP-STORE | Persistence | Conversations, bookings, idempotency, handoffs, OAuth token | Application records | Supabase rows |

## Dependencies

| Caller | Callee | Protocol |
|---|---|---|
| HTTP service | Meta WhatsApp Cloud API | HTTPS/JSON |
| Conversation engine | OpenAI Responses API | HTTPS/JSON |
| HTTP service | Stripe | SDK/HTTPS |
| HTTP service | Google Calendar | OAuth 2.0/HTTPS |
| Store | Supabase | HTTPS/PostgREST |

## Data Stores

| Store | Purpose | Owner |
|---|---|---|
| Supabase Postgres | Conversation state, bookings, processed events, handoffs, Google OAuth token | Application |

## External Services

- Meta WhatsApp Cloud API, OpenAI Responses API, Google Calendar API, Stripe Test Mode, Supabase.

## Constraints

- One process, one clinic, one calendar, no queue or dashboard; free-tier services may sleep.
