---
document: ai-context
status: draft
last-reviewed: 2026-08-27
source-of-truth: true
owners:
  - project
related:
  - AI_SESSION_START.md
  - AI_SESSION_END.md
---

# Project

## Identity

Project name: WhatsApp AI Receptionist Demo

## Current Objective

Project objective: Deliver a deployed Phase 1 WhatsApp booking demonstration for a fictional Leeds aesthetic clinic.

## Non-Goals

- Production payments, production WhatsApp onboarding, multiple clinics, CRM, dashboard, reminders, and real medical advice.

## Critical Constraints

- English-only demo; synthetic data; Stripe Test Mode; approved FAQs only; personalised medical matters must hand over.

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
