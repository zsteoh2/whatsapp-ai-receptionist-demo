# Handoff

## Completed

- Implemented the single-service TypeScript backend, approved content, safety-first state machine, Supabase schema, Meta/OpenAI/Google/Stripe adapters, Railway config, documentation, and tests.
- Added Twilio WhatsApp Sandbox as the preferred Phase 1 channel: signed inbound form webhooks, dynamic text replies, configuration readiness, and a focused test. The Meta adapter remains available.
- Fixed the Twilio webhook acknowledgement so it returns an empty `204` instead of surfacing `OK` in the WhatsApp chat.
- Added safe outbound failure diagnostics that log only Twilio HTTP status and error code.
- Switched interactive Sandbox replies to synchronous, XML-escaped TwiML after live error 21654 confirmed the Trial blocks dynamic REST `Body` sends.
- Fixed the conversation dead end: unknown non-sensitive messages now show navigation help without locking the session, and `wrinkle`/`wrinkles` deterministically selects Package 3.
- Added bounded structured memory using the existing conversation row: package/concern context, service exploration versus explicit booking, contextual confirmation, two clarification attempts before handoff, and 24-hour inactivity expiry. Raw transcripts are not stored.

## Current Status

- The Railway deployment, Supabase, VectorEngine, signed Twilio inbound webhook, synchronous TwiML replies, and Google Calendar availability checks are working. Structured multi-turn memory is live; greeting priority still needs correction so a greeting cannot be consumed as a pending customer name.

## Verification

- `npm run check`: passed (build plus 10/10 tests).
- Live Google OAuth and an occupied-slot WhatsApp check passed against the configured demo calendar.
- Live VectorEngine classification accepted explicit Luna `reasoning_effort: medium`.
- Compiled local HTTP smoke test: passed.
- VectorEngine `gpt-5.6-luna` Chat Completions: live classification passed through the `.cn` endpoint.
- Railway healthcheck failure was traced to Node.js 20 lacking the native WebSocket required by the current Supabase SDK; the runtime requirement is now Node.js 22+.
- Context validation passed with no errors; undated session files and an ungenerated graph remain review recommendations.
- Changed-file secret scan found no populated provider-secret assignments.

## Documentation Updated

- README, requirements, architecture, ADR-003, task records, and project memory.

## Known Limitations

- Free tiers may sleep; a pre-demo wake-up is required.
- Background WhatsApp processing uses the Railway process rather than a durable queue.
- Twilio's free Try out flow may reject dynamic `Body` replies because the supplied example is restricted to a pre-approved `ContentSid`; this requires a live test and may require upgrading Twilio.
- Interactive inbound replies now use TwiML, but later asynchronous Stripe confirmation still uses the restricted REST API and may require a Twilio upgrade.
- Structured memory deliberately stores no raw transcript and supports one active package/concern context per WhatsApp sender.
- The original ignored `Key.txt` still exists; remove it manually after confirming `.env.local` works.

## Remaining Work

- Deploy the structured-memory upgrade and test the Package 3 exploration/confirmation flow after one final `RESTART` to clear old state.
- Configure Google test calendar/OAuth and Stripe Test webhooks.
- Run and record the public end-to-end acceptance journey.

## Blocker

- Stripe Test configuration is still required for the complete booking journey.

## Next Recommended Action

- Deploy the explicit Luna medium-effort update, then configure Stripe Test Checkout/webhooks and run the complete WhatsApp-to-Calendar confirmation journey.
