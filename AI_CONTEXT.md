---
document: ai-context
status: draft
last-reviewed: 2026-09-01
source-of-truth: true
owners:
  - project
related:
  - AI_SESSION_START.md
  - AI_SESSION_END.md
---

# Project

## Identity

Project name: ORA WhatsApp AI Receptionist Demo

## Current Objective

Project objective: Deliver a polished, reusable ORA WhatsApp assistant demonstration. ORA is the only active customer-facing identity; industry-specific booking, payment, and calendar behavior will be activated only after approved business-template data is supplied.

## Non-Goals

- Production payments, production WhatsApp onboarding, multiple clinics, CRM, dashboard, reminders, and real medical advice.

## Critical Constraints

- English-only demo; synthetic data; no invented business services, prices, availability, policies, or meeting links; safety-sensitive matters must hand over.

## Current System Status

Current phase: Phase 1 external integration verification

## Active Major Work

Primary task: `.ai/runtime/active-task.json`

## Authoritative Documents

- Purpose and users: `docs/vision.md`
- Product behavior: `docs/requirements.md`
- Business constraints: `docs/business_rules.md`
- Domain terminology: `docs/glossary.md`
- Current architecture: `docs/architecture/overview.md`
- Durable decisions: `docs/adr/`
- Recent project state: `docs/project_memory/CURRENT.md`
- Task runtime state: `.ai/runtime/active-task.json`

## AI Instructions

1. Follow `AI_SESSION_START.md` before changing files.
2. Do not violate business rules or accepted ADRs.
3. Keep task-local facts in the active task workspace; promote only durable project-wide facts.
4. Update only the authoritative document whose underlying fact changed.
5. Follow `AI_SESSION_END.md` before ending project work.
