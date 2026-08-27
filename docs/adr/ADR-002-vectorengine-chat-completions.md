---
document: ADR-002
status: accepted
last-reviewed: 2026-08-28
source-of-truth: true
owners:
  - engineering
related:
  - docs/architecture/overview.md
  - docs/adr/ADR-001-phase1-single-service.md
---

# ADR-002: VectorEngine Chat Completions

## Status

Accepted

## Decision

Keep the single-service design from ADR-001, but route constrained LLM classification through VectorEngine's OpenAI-compatible Chat Completions endpoint at `https://api.vectorengine.cn/v1`. Configure the provider with `OPENAI_BASE_URL` and the model with `OPENAI_MODEL`; the Phase 1 default is `gpt-5.6-luna`.

## Consequences

- Railway can use the user's existing OpenAI-compatible intermediary key without source changes.
- Deterministic safety checks and fixed customer-facing answers remain outside the LLM.
- Provider availability, model access, and structured-output compatibility must be verified from Railway.

## Supersedes

The OpenAI Responses API classifier portion of ADR-001 only.

## Date

2026-08-28
