# Verification

- Passed: `npm run build` compiles the TypeScript service.
- Passed: `npm test` runs 7 focused tests covering 20 FAQs, safety routing, opening rules, full test booking confirmation, idempotency, Meta parsing, and Meta/Twilio signatures.
- Passed: local `/health` returns `ok` from the compiled service.
- Passed: local Meta verification returns the challenge for a matching fake token and 403 for a wrong token.
- Passed: dependency installation reported 0 known npm vulnerabilities.
- Passed: repository content search found no reference-clinic name or OpenAI key-shaped secret in trackable files.
- Passed: a live VectorEngine Chat Completions request through `https://api.vectorengine.cn/v1` authenticated, returned strict structured output, identified a skin booking as `package_2`, and extracted a supplied relative date/time.
- Blocked: Supabase, Meta WhatsApp, Google Calendar, Stripe Test Mode, Railway, and public HTTPS webhooks require user-owned account configuration.
- Not run: public end-to-end WhatsApp → Stripe Test Checkout → Google Calendar → WhatsApp confirmation.
- Passed: `npm run check` after the Chat Completions migration compiles the service and passes all 6 focused tests.
- Passed: `OPENAI_BASE_URL` is passed to the OpenAI-compatible client and `OPENAI_MODEL` defaults to `gpt-5.6-luna`.
- Passed: DNS, ICMP, and TCP 443 checks reached `api.vectorengine.cn`; the previously supplied `.ai` endpoint was not used after `.cn` was verified.
- Failed then fixed: Railway Node.js 20 exited while constructing the Supabase client because native WebSocket was unavailable; the project now requires Node.js 22 or newer.
- Passed: Twilio signature verification and inbound text parsing have a focused automated test.
- Not run: public Twilio Sandbox webhook and reply after deployment.
- Blocked: the supplied Twilio Trial example uses a pre-approved `ContentSid`; live dynamic `Body` replies must be tested and may require an account upgrade.
- Passed: project-context validation completed with 0 errors; three pre-existing review recommendations remain for undated session files and an ungenerated graph.
- Passed: changed-file scan found no populated Twilio, OpenAI, or Supabase secret assignment.
