# Handoff

## Completed

- Implemented the single-service TypeScript backend, approved content, safety-first state machine, Supabase schema, Meta/OpenAI/Google/Stripe adapters, Railway config, documentation, and tests.
- Added Twilio WhatsApp Sandbox as the preferred Phase 1 channel: signed inbound form webhooks, dynamic text replies, configuration readiness, and a focused test. The Meta adapter remains available.
- Fixed the Twilio webhook acknowledgement so it returns an empty `204` instead of surfacing `OK` in the WhatsApp chat.
- Added safe outbound failure diagnostics that log only Twilio HTTP status and error code.
- Switched interactive Sandbox replies to synchronous, XML-escaped TwiML after live error 21654 confirmed the Trial blocks dynamic REST `Body` sends.
- Fixed the conversation dead end: unknown non-sensitive messages now show navigation help without locking the session, and `wrinkle`/`wrinkles` deterministically selects Package 3.
- Added bounded structured memory using the existing conversation row: package/concern context, service exploration versus explicit booking, contextual confirmation, two clarification attempts before handoff, and 24-hour inactivity expiry. Raw transcripts are not stored.
- Verified live Stripe Test Checkout through Google Calendar event creation, then added a `STATUS` fallback so Twilio Trial can retrieve confirmation synchronously without downgrading a successful booking when asynchronous notification fails.
- Upgraded natural dialogue so greetings are safe in every state and one message can independently supply an approved FAQ, booking intent, package, preferred name, and date/time; valid fields persist and only missing data is requested.
- Added and passed a 26-scenario real-Luna adversarial dialogue suite without WhatsApp traffic; fixed greeting/shorthand/decline slang, medical paraphrases, explicit name/booking variance, concern synonyms, human-request paraphrases, ambiguous package guesses, and invented times.
- Expanded the same provider-isolated real-Luna harness to exactly 100 style-diverse scenarios and reached 100/100 after fixing shared FAQ, safety, typo, explicit-time, adult-age, and package-correction gaps. The bot does not infer or persist demographic traits.
- Expanded the harness again to exactly 200 scenarios by adding 100 UK-focused cases across greetings/registers, approved FAQ wordings, regional lexical forms, British dates and spoken times, safety/handover language, ambiguity, negation, and structured memory. Narrow deterministic guards now handle approved and high-risk meanings before Luna; regional labels exist only in tests and no dialect or demographic trait is inferred or stored.
- Added a separate exact-outcome UK date/time harness with 200 cases and no WhatsApp, Supabase, Calendar, or Stripe traffic. It checks the stored London-local minute rather than merely checking for a date, and keeps difficult failures unchanged for repair.
- Hardened the shared date/time layer without changing the benchmark: deterministic validated values now outrank model output; approximate, range, missing-date, and invalid-date requests never create an exact slot; and additional UK clock/date forms are parsed locally. The exact-time suite now passes 200/200.
- Naturalised customer-facing copy: date prompts now use UK examples instead of ISO syntax, and chat messages no longer expose timezone, Stripe Checkout, Google Calendar, or internal approval/handover/service terminology. Required demo, medical, payment, and confirmation disclosures remain.

## Current Status

- Railway, Supabase, VectorEngine, signed Twilio inbound replies, Google Calendar, and Stripe Test Checkout are working through Calendar event creation. The new blind language suite passes 100/100, both the general dialogue and exact UK date/time suites pass 200/200 against real Luna, and offline checks pass 25/25.

## Verification

- `npm run check`: passed (build plus 16/16 tests) after adding direct casual-language coverage.
- Direct real-Luna dialogue suite: 12/20 passed with all WhatsApp/Twilio, Supabase, Calendar, and Stripe network calls disabled.
- After fixes and fresh adjacent cases, the expanded direct real-Luna suite passes 26/26 and `npm run check` passes 19/19.
- The final style-diverse direct suite passes 100/100 against real `gpt-5.6-luna` with no Twilio/WhatsApp, Supabase, Google Calendar, or Stripe network calls; `npm run check` passes 20/20.
- The final UK-expanded direct suite passes 200/200 against real `gpt-5.6-luna` at `reasoning_effort: medium`; no Twilio/WhatsApp, Supabase, Google Calendar, or Stripe network calls were made, and `npm run check` passes 21/21.
- The dedicated UK date/time suite completed 152/200 against real `gpt-5.6-luna` at `reasoning_effort: medium`: numeric clocks 34/40, spoken clocks 40/50, date wording 51/60, and vague/invalid handling 27/50. Only the configured model API was used.
- `npm run check` still passes 20/20 offline tests, and the project-context validator reports 0 errors with three existing review recommendations.
- After shared-layer fixes, the unchanged dedicated UK date/time suite passes 200/200: numeric clocks 40/40, spoken clocks 50/50, date wording 60/60, and vague/invalid handling 50/50.
- `npm run check` passes 21/21 and the full general `npm run test:dialogue:live` regression remains 200/200.
- After the customer-copy cleanup, `npm run check` passes 22/22 and the full general `npm run test:dialogue:live` regression remains 200/200.
- Live Google OAuth and an occupied-slot WhatsApp check passed against the configured demo calendar.
- Live VectorEngine classification accepted explicit Luna `reasoning_effort: medium`.
- Live Stripe Test Checkout created the expected Package 2 Calendar event; Twilio Trial blocked only the final asynchronous notification.
- `npm run check` passes 11/11 tests with notification failure isolated from confirmation and `STATUS` recovery covered.
- Compiled local HTTP smoke test: passed.
- VectorEngine `gpt-5.6-luna` Chat Completions: live classification passed through the `.cn` endpoint.
- Live Luna multi-field classification returned FAQ 5, Package 2, customer name Alex, a London-local date/time, and booking intent from one message using the expanded strict schema.
- Railway healthcheck failure was traced to Node.js 20 lacking the native WebSocket required by the current Supabase SDK; the runtime requirement is now Node.js 22+.
- Context validation passed with no errors; undated session files and an ungenerated graph remain review recommendations.
- Changed-file secret scan found no populated provider-secret assignments.
- The untouched 100-case blind language baseline passed 78/100; after fixing every discovered language, correction, precedence, and safety gap, the final blind suite passes 100/100.
- Final post-fix regressions: `npm run check` 25/25, general real-Luna dialogue 200/200, and exact UK date/time 200/200. Direct model tests used no Twilio/WhatsApp, Supabase, Google Calendar, or Stripe traffic.

## Documentation Updated

- README, requirements, architecture, ADR-003, task records, and project memory.

## Known Limitations

- Free tiers may sleep; a pre-demo wake-up is required.
- Background WhatsApp processing uses the Railway process rather than a durable queue.
- Twilio's free Try out flow may reject dynamic `Body` replies because the supplied example is restricted to a pre-approved `ContentSid`; this requires a live test and may require upgrading Twilio.
- Automatic asynchronous Stripe confirmation still requires a Twilio upgrade, but Trial can retrieve it by sending `STATUS` through synchronous TwiML.
- Structured memory deliberately stores no raw transcript and supports one active package/concern context per WhatsApp sender.
- One approved FAQ can be selected per message; a FAQ can coexist with one booking request and all supplied booking fields.
- Date/time extraction deliberately accepts only locally validated forms; unsupported, approximate, range, missing-date, and invalid-date requests ask for clarification instead of trusting an LLM-generated slot.
- The original ignored `Key.txt` still exists; remove it manually after confirming `.env.local` works.

## Remaining Work

- Wait for Railway to activate the final dialogue-hardening commit, then live-test one compact WhatsApp flow.

## Blocker

- No direct dialogue blocker remains. Automatic outbound confirmation separately still requires a Twilio upgrade.

## Next Recommended Action

- Wait for Railway to activate the final dialogue-hardening commit, then use WhatsApp only for one final compact smoke test.
