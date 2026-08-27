# Verification

- Passed: `npm run build` compiles the TypeScript service.
- Passed: `npm test` runs 6 focused tests covering 20 FAQs, safety routing, opening rules, full test booking confirmation, idempotency, Meta signature, and payload parsing.
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
