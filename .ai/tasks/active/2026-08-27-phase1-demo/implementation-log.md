# Implementation Log

- 2026-08-27: Project context initialized and Phase 1 task created.
- 2026-08-27: Added fixed clinic content, safety rules, persistence schema, provider adapters, HTTP endpoints, booking state machine, deployment configuration, and focused tests.
- 2026-08-28: Added configurable OpenAI-compatible Base URL support and moved constrained classification to Chat Completions for VectorEngine.
- 2026-08-28: Verified `gpt-5.6-luna` live through the `.cn` endpoint and added the explicit package-ID mapping after the first probe exposed the missing prompt context.
- 2026-08-28: Raised the runtime requirement to Node.js 22 after Railway Node 20 failed during Supabase client startup because native WebSocket was unavailable.
