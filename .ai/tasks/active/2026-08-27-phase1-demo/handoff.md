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
- Added ORA as the reusable prospect-facing identity while retaining the fictional clinic as the current working content example. The welcome presents booking, product/service enquiry, a general question, and callback in a compact list and explicitly allows natural free text.
- Reframed the main ORA-only welcome and knowledge around ORA itself: prospects can ask about approved business knowledge, booking/calendar automation, test payments, integrations, and human handover without seeing Clinic content or fabricated customer-business facts. Short explicit endings return the Founder CTA.
- Added deterministic callback handoff and a Founder CTA using `07955 506757` and `hau@convertbydigital.com` after confirmed bookings and human-follow-up flows. Emergency and medical safety checks still run before callback routing.
- Took Clinic customer behavior offline behind `ENABLE_CLINIC_DEMO`, which defaults to false. ORA-only mode does not call the Clinic classifier, show Clinic/package copy, or create new Clinic bookings; it explains ORA, accepts callback/human requests, and refuses to invent business-template facts.

## Current Status

- Railway, Supabase, VectorEngine, signed Twilio inbound replies, Google Calendar, and Stripe Test Checkout remain implemented. The locally verified, not-yet-deployed default is now ORA-only with ORA capability Q&A and an exact-command Cleaner shell; the Clinic template is dormant. Offline checks pass 30/30. Before the shutdown boundary, the retained Clinic template passed blind 100/100, general dialogue 200/200, and exact UK date/time 200/200 against real Luna.

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
- The live WhatsApp smoke test exposed unsupported `tmr`; the shared normaliser now accepts common `today`/`tomorrow` shortcuts and prevents them from being captured as customer names. `npm run check` passes 26/26.
- The ORA-focused offline regression passes 27/27, including emergency precedence over callback requests, and the full real-Luna dialogue suite passes 200/200 with all non-model provider traffic disabled.
- The ORA-only shutdown regression passes as part of 28/28 offline checks: Clinic language and new bookings are blocked, the model classifier is not called, and the production factory defaults the Clinic flag off.
- The hidden Cleaner Demo is implemented without reactivating Clinic: only exact standalone `cleaner` selects it, the selection persists in bounded conversation memory, `START OVER` and 24-hour expiry clear it, and non-exact mentions do not switch modes. Build and offline checks pass 30/30.
- The ORA capability regression covers knowledge, booking/calendar, test-payment, integration, and explicit closing questions; `npm run check` passes 30/30 and the tested ORA copy contains no Clinic, treatment, or package terminology.

## Documentation Updated

- AI context, README, vision, requirements, business rules, glossary, architecture, task records, and project memory.

## Known Limitations

- Free tiers may sleep; a pre-demo wake-up is required.
- Background WhatsApp processing uses the Railway process rather than a durable queue.
- Twilio's free Try out flow may reject dynamic `Body` replies because the supplied example is restricted to a pre-approved `ContentSid`; this requires a live test and may require upgrading Twilio.
- Automatic asynchronous Stripe confirmation still requires a Twilio upgrade, but Trial can retrieve it by sending `STATUS` through synchronous TwiML.
- Structured memory deliberately stores no raw transcript and supports one active package/concern context per WhatsApp sender.
- One approved FAQ can be selected per message; a FAQ can coexist with one booking request and all supplied booking fields.
- Date/time extraction deliberately accepts only locally validated forms; unsupported, approximate, range, missing-date, and invalid-date requests ask for clarification instead of trusting an LLM-generated slot.
- The original ignored `Key.txt` still exists; remove it manually after confirming `.env.local` works.
- The ORA shell is reusable, but the approved FAQs, packages, hours, prices, policies, and medical safety rules are still the clinic example. Cleaner-specific content requires the cleaner's real process.
- No Calendly URL has been supplied, so the CTA includes the approved phone and email only.
- ORA-only mode cannot demonstrate a full service enquiry, new booking, payment, or Calendar journey until an approved replacement business template is supplied. This is intentional and prevents fabricated business data.
- Existing Supabase deployments must rerun `supabase/schema.sql` once before this version is deployed so the conversation table has the nullable `business_mode` column.

## Remaining Work

- Rerun the Supabase schema, push and deploy ORA-only mode, ensure Railway has no true `ENABLE_CLINIC_DEMO` variable, then smoke-test `cleaner`, `cleaner please`, Cleaner greeting, `START OVER`, and callback handling in WhatsApp.
- Obtain the cleaner service/process data and Calendly URL before activating a replacement booking journey.

## Blocker

- ORA identity and callback handling are unblocked. Full enquiry/booking/payment/calendar demonstration is blocked on approved cleaner data; the meeting CTA is blocked on the missing Calendly URL. Automatic outbound confirmation separately still requires a Twilio upgrade.

## Next Recommended Action

- Rerun `supabase/schema.sql`, push the verified change, confirm `ENABLE_CLINIC_DEMO` is absent or false in Railway, wait for deployment, then send `cleaner`, `hello`, `cleaner please`, `START OVER`, and `Request a callback` from fresh test conversations.
