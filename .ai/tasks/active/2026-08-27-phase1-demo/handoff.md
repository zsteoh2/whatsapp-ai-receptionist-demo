# Handoff

## Latest - User-requested GitHub release
- Latest main release contents: ORA semantic understanding, booking/safety fixes, existing pending Supabase Auth guard, live regressions and synthetic test reports.
- Fresh build and 37 offline tests pass; configured-secret/token scan passed. Local .env files and Key.txt remain ignored.
- GitHub publication is explicitly authorised; verify pushed commit against origin/main. No Railway rollout or phone test was verified in preparing this release.
- Next: confirm host deploys latest GitHub commit and intended API environment, then test START OVER, natural demo questions, booking details, Stripe test payment and STATUS.


## Latest - Final three unavailable cases verified
- Exact IDs 2865/1769/1012 pass unchanged production code at one worker (3.42/6.43/4.77 seconds), no semantic defect reproduced.
- Added verbatim cases plus name/time preservation assertions to live multi-turn suite: 20/20 passed, 16 calls; exact replay used three calls.
- All 3000 IDs now have passing post-fix records across runs; never claim single-pass 3000/3000. Provider timeout reliability remains unresolved.
- Evidence: ora-regional-results/FINAL_THREE.md. No production-code/config change or deployment this turn.
- Next: review/deploy pending fixes, phone-test; use bounded load and investigate provider queueing before stronger reliability claims.


## Latest - Rerun complete across user-selected concurrency levels
- Full 3000 corpus attempted after fixes. Eight-worker run stopped at user's request after 2400 saved cases: 2291 passed, 109 timeouts, zero behavior failures.
- Two-worker continuation completed 709 cases: 706 passed, three timeouts, zero behavior failures. Same 109 timeout cases: 106 passed, three still unavailable.
- Latest-result union has 2997 passing IDs and three unavailable; not a one-pass 99.9% score. No exact provider concurrency limit confirmed.
- Raw evidence: ora-regional-results/POST_FIX_RERUN.md. No code/model/timeout changes or deployment this turn.
- Next: use two-worker testing provisionally, investigate provider concurrency/queueing before higher-load claims, review/deploy pending fixes and phone-test.


## Latest - Regional behavior fixes verified locally
- Shared safety/date rules and semantic rescheduling/topic distinctions fixed. Details and raw links: ora-regional-results/FIXES.md.
- Build/37 offline checks, deterministic 1000/1000 and real multi-turn 17/17 pass.
- Interrupted replay saved 121 passing IDs; after one additional spaced-hand-over fix, remaining/failed 42 all passed. All 163 original failed IDs have passing records; no full 3000 post-fix score claimed.
- Provider 10-second timeout unchanged; endpoint timeout/rate-limit reliability unresolved. No deployment or phone test.
- Next: review/deploy pending local changes with intended endpoint configuration, then phone-test; monitor real endpoint reliability. Preserve all existing unrelated changes.


## Latest - 3,000 regional English test completed
- Report: ora-regional-results/REPORT.md; 2,837/3,000 first pass, 96 assertion failures and 67 unavailable (65 timeout, 2 HTTP 429), eight workers.
- 2,600 real runtime model calls plus 71 corpus-generation calls. 12 regional-inspired English profiles x25 intents x10 fictional persona styles. Frozen unique messages; same model generated and classified them.
- Most failures are deterministic handover false positives (77). Also inspect polite rescheduling (9), date parsing/suitability (4), may-I name-correction context loss (1), negated emergency (1), and overlapping topic labels (4).
- Build and 36/36 checks passed; three benchmark scripts type-check. Shared-store snapshots detected no user leakage. No non-model provider calls.
- No bot source fixes, post-fix replay or deployment during this batch. Exact next action: fix verified shared safety/date-context roots and polite-reschedule classification, preserve corpus, then run regressions. Do not report a 3,000/3,000 result.
- Graph may be outdated: sourceCommit remains null; not regenerated.


## Latest - 1,000 English tests completed, local fixes verified

- User requested 1,000 randomized English tests and explicitly accepted real model quota use. Reports: ora-random-results/REPORT.md.
- Original full run 914/1,000; fixed full regression 936/1,000 with one behavior failure and 63 model-unavailable cases. Final narrow guard plus two-worker replay passed all 64 failed cases. Do not describe this as a one-pass 1,000/1,000 result.
- Build and 36/36 offline checks pass. Total 1,915 real model requests across 2,150 test executions; no non-model provider traffic.
- Runtime model timeout remains 10 seconds. Eight-worker tail latency remains a limitation; two-worker replay does not prove production reliability.
- Next: assess intended-load endpoint reliability, verify Railway configuration, deploy reviewed pending changes and phone-test. No deployment performed.


## Latest - New endpoint verified, deployment pending

- User configured RelayRouter locally, retaining gpt-5.6-luna. Final live ORA suite passes 17/17 steps with 13 real model calls; build and 36/36 offline tests pass.
- Fixed new-session persistence when checking status without a booking. No secrets changed by the agent.
- Two initial 10-second timeouts occurred; subsequent complete suite passed. Old VectorEngine quota is no longer blocking local tests.
- Next: verify Railway uses the intended new credentials/endpoint, deploy reviewed pending changes and phone-test. Railway authentication and live configuration were not rechecked this turn.


## Latest - 2026-09-08 ORA semantic migration (local only)

- Implemented ORA-specific semantic classification with existing authorised endpoint/model/key, approved replies, bounded last-topic and booking context. No new dependencies or schema migration.
- Build and 36/36 offline tests pass; deterministic fallback remains 1000/1000.
- Real-model verification is BLOCKED: existing VectorEngine endpoint returns HTTP 403, user quota is not enough. No semantic live success claimed.
- Next: restore quota for the existing model service, run npm run test:ora-semantic:live, fix any real-model findings, then deploy pending changes and phone-test. Railway CLI login was previously blocked and was not rechecked.
- Reply wording is still approved fixed copy; AI chooses semantic intent/topic/actions. Full transcript recall and free-form generated replies are not implemented.


## Latest: abc menu and registered sender

- Verified `abc` via Twilio Content API and sender `+15553632930` ONLINE via Senders API.
- Set and read back the registered sender webhook to the existing Railway `/webhooks/twilio/whatsapp` endpoint (POST).
- Local `.env.local` now selects that sender and `TWILIO_MENU_CONTENT_SID=HXc9e5fc1f1fe65f9d4e0801d6d7bb99c3`.
- Implemented welcome-only menu sending, text fallback, and menu/quick-reply selection mapping. Build and 33 tests pass.
- 2026-09-07: User explicitly confirmed the registered number. Via Zen computer use, saved and deployed `TWILIO_WHATSAPP_FROM=whatsapp:+15553632930` and `TWILIO_MENU_CONTENT_SID=HXc9e5fc1f1fe65f9d4e0801d6d7bb99c3`; Railway returned Online after Building.
- Menu code is NOT deployed. Railway CLI requires user login; official device login is pending. CLI networking requires clearing HTTP_PROXY/HTTPS_PROXY/ALL_PROXY for the child process because its HTTP client rejects the configured socks5 scheme. Git HTTPS also lacks usable credentials.
- Next: user completes Railway device login, deploy only reviewed menu changes (preserve unrelated dirty Auth/conversation changes), then phone-test Hi, all menu choices, and START OVER. No live messages were sent during this work.
- Graph may be outdated: metadata has no source commit.

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

- Railway, Supabase, VectorEngine, signed Twilio inbound replies, Google Calendar, and Stripe Test Checkout remain implemented. The locally verified, not-yet-deployed default is now ORA-only with ORA capability Q&A, an exact-command Cleaner shell, and Supabase-protected administrative routes; the Clinic template is dormant. Offline checks pass 32/32. Before the shutdown boundary, the retained Clinic template passed blind 100/100, general dialogue 200/200, and exact UK date/time 200/200 against real Luna.

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
- Supabase bearer-token checks protect `/api/me` and `/auth/google`; `npm run check` passes 32/32 with missing, invalid, and valid token cases. Live Auth verification was not available because local Supabase configuration is empty.

## Documentation Updated

- AI context, README, vision, requirements, business rules, glossary, architecture, task records, and project memory. Auth setup and route boundaries are documented in README, requirements, business rules, architecture, and the active task records.

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
- Supabase Auth requires an enabled sign-in provider, a permitted user, and `SUPABASE_PUBLISHABLE_KEY` in local and Railway configuration before protected routes can be exercised live.

## Remaining Work

- Rerun the Supabase schema, push and deploy ORA-only mode, ensure Railway has no true `ENABLE_CLINIC_DEMO` variable, then smoke-test `cleaner`, `cleaner please`, Cleaner greeting, `START OVER`, and callback handling in WhatsApp.
- Configure Supabase Auth and `SUPABASE_PUBLISHABLE_KEY`, sign in as the permitted user, verify `/api/me`, then complete Google OAuth through the protected `/auth/google` route.
- Obtain the cleaner service/process data and Calendly URL before activating a replacement booking journey.

## Blocker

- ORA identity and callback handling are unblocked. Full enquiry/booking/payment/calendar demonstration is blocked on approved cleaner data; the meeting CTA is blocked on the missing Calendly URL. Automatic outbound confirmation separately still requires a Twilio upgrade.

## Next Recommended Action

- Configure Supabase Auth and deploy the verified change, verify `/api/me` with a real access token, complete protected Google OAuth, then run the pending WhatsApp smoke checks.

## Latest - Screenshot bug fix (local only)
- General question no longer resets demo progress or resumes a handover. Previously corrupted ORA clarification sessions recover their pending step.
- Process questions and So demo? explain the synthetic journey and retain progress; 34/34 checks and 1000/1000 ORA product cases pass.
- User highlighted missing AI understanding: normal ORA paths bypass the Clinic-specific classifier. This patch does not implement semantic ORA dialogue.
- Next: review/deploy this local fix with existing pending deployment work and phone-test both screenshots. Railway login blocker remains as previously recorded; not rechecked here.
