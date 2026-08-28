# Implementation Log

- 2026-08-27: Project context initialized and Phase 1 task created.
- 2026-08-27: Added fixed clinic content, safety rules, persistence schema, provider adapters, HTTP endpoints, booking state machine, deployment configuration, and focused tests.
- 2026-08-28: Added configurable OpenAI-compatible Base URL support and moved constrained classification to Chat Completions for VectorEngine.
- 2026-08-28: Verified `gpt-5.6-luna` live through the `.cn` endpoint and added the explicit package-ID mapping after the first probe exposed the missing prompt context.
- 2026-08-28: Raised the runtime requirement to Node.js 22 after Railway Node 20 failed during Supabase client startup because native WebSocket was unavailable.
- 2026-08-28: Added signed Twilio Sandbox ingestion and text replies as the no-Meta Phase 1 demo channel while retaining the Meta adapter.
- 2026-08-28: Changed the Twilio webhook acknowledgement from a plain-text `200 OK` body to an empty `204` so Twilio does not surface the transport acknowledgement as a chat reply.
- 2026-08-28: Added safe outbound Twilio diagnostics that record only HTTP status and Twilio error code after a live reply failed without actionable log detail.
- 2026-08-28: Changed interactive Twilio Sandbox replies to synchronous, XML-escaped TwiML after live error 21654 confirmed that the Trial rejects dynamic REST `Body` sends without `ContentSid`.
- 2026-08-28: Kept unknown non-sensitive messages conversational instead of locking the session in handover, and added deterministic `wrinkle`/`wrinkles` recognition for Package 3.
- 2026-08-28: Reused the existing conversation row for 24-hour structured memory, separated service exploration from explicit booking, added contextual yes/no handling, and delayed ordinary fallback handover until the third unrecognized message.
- 2026-08-29: Explicitly set Luna reasoning effort to `medium`; the live VectorEngine Chat Completions probe accepted it and returned the expected structured booking decision.
- 2026-08-29: Ignored downloaded Google OAuth client JSON files to prevent accidental commits without modifying the local credential file.
- 2026-08-29: Kept Calendar-confirmed bookings confirmed when asynchronous WhatsApp notification fails and added a synchronous `STATUS` recovery path for Twilio Trial.
