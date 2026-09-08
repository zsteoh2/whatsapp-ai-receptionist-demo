# Verification

- Passed (2026-09-07): Zen Railway UI saved the user-confirmed registered sender and abc Content SID, applied exactly two staged variable changes, and returned Online after Building.
- Blocked (2026-09-07): menu code upload requires Railway CLI login; device authorization is pending user action. No phone/menu end-to-end check has run.

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
- Passed: `npm run check` still builds and passes 7/7 tests after changing the Twilio acknowledgement to an empty `204`.
- Not run: live WhatsApp retry after deploying the empty-response fix.
- Passed: safe Twilio error-code extraction is covered by the focused test and `npm run check` passes 7/7 tests.
- Not run: live retry needed to capture the outbound Twilio status/error code.
- Passed: live diagnostics identified Twilio `status=400 code=21654`, confirming the Trial's outbound `ContentSid` restriction.
- Passed: TwiML generation escapes XML content and is covered by the focused test; `npm run check` passes 7/7 tests.
- Not run: live WhatsApp reply through the synchronous TwiML path.
- Passed: the user received a live synchronous TwiML reply through Twilio Sandbox.
- Passed: unknown non-sensitive text now returns navigation help without creating a handoff; `I want something for wrinkle` selects Package 3 and asks for the booking name.
- Passed: `npm run check` builds and passes 8/8 tests after the conversation recovery fix.
- Not run: live WhatsApp verification of the Package 3 phrase after deploying this fix.
- Passed: structured memory carries Package 3 and the safe `wrinkle` category into a following `Yes please`, which continues the booking flow.
- Passed: the first two unrecognized messages clarify, the third creates one safe handoff without storing raw input, and memory older than 24 hours resets.
- Passed: service-related questions are routed through approved FAQ intent classification instead of being mistaken for a service-exploration keyword.
- Passed: `npm run check` builds and passes 10/10 tests after the structured-memory upgrade.
- Passed: a live VectorEngine `.cn` Chat Completions probe accepted the expanded strict schema and classified `Are there side effects for skin treatment?` as FAQ 17 with Package 2 context.
- Not available: the first local probe used the default OpenAI host because the local environment did not supply the Railway Base URL and timed out; the configured Railway environment is not affected.
- Not run: live WhatsApp multi-turn verification after deploying the structured-memory upgrade.
- Passed: live Google OAuth completed and a WhatsApp Package 2 request correctly rejected a deliberately occupied Google Calendar slot and returned alternatives.
- Passed: `reasoning_effort: "medium"` compiles, all 10 focused tests pass, and a live VectorEngine `.cn` Chat Completions probe accepted the parameter and returned the expected Package 2 booking decision with a London-local date/time.
- Passed: live Stripe Test Checkout and `checkout.session.completed` processing created the expected Package 2 Google Calendar event; final asynchronous WhatsApp delivery was unavailable on Twilio Trial as anticipated.
- Passed: `npm run check` builds and passes 11/11 tests after separating booking confirmation from best-effort notification and adding `STATUS` recovery, including self-healing the previously downgraded record when a Calendar event ID exists.
- Not run: live WhatsApp `STATUS` recovery after deploying the fallback.
- Passed: `npm run check` builds and passes 15/15 focused tests after the dialogue upgrade, including greeting priority, one-message FAQ plus full booking extraction, preserved partial slots, and natural service-plus-date routing.
- Passed: a live VectorEngine `gpt-5.6-luna` call accepted the expanded strict schema and independently returned FAQ 5, Package 2, customer name Alex, the London-local date/time, and `wantsBooking: true` from one natural message.
- Not run: live WhatsApp verification of the upgraded multi-field dialogue after Railway deployment.
- Passed: `npm run check` builds and passes 16/16 offline tests after adding casual-language regression coverage.
- Passed: `npm run test:dialogue:live` exercised 20 synthetic scenarios through the real `gpt-5.6-luna` classifier and complete in-memory conversation engine without calling Twilio/WhatsApp, Supabase, Google Calendar, or Stripe; 12/20 passed.
- Passed in the adversarial suite: heavy booking typos, Malay-English and Chinese-English bookings, slang service exploration, package changes mid-flow, deposit slang, prompt injection containment, under-18, emergency, refund/legal, ordinary greeting, and gibberish clarification.
- Failed in the adversarial suite: stretched/slang greetings changed the state to clarification; `p2` shorthand lost all booking fields; `nah not now` was not treated as a decline; an ambiguous hair-or-skin request guessed Hair; vague `tomorrow afternoon` invented a precise time; `blood thinners` and `preggers` did not create required medical handovers.
- Not run: WhatsApp delivery for adversarial scenarios; this suite deliberately generated no Twilio/WhatsApp traffic.
- Passed after fixes: `npm run check` builds and passes 19/19 offline tests, including shorthand parsing, medical slang, stretched/slang greetings, decline slang, ambiguity rejection, vague-time rejection, and LLM handover enforcement.
- Passed after fixes: the original real-Luna direct dialogue suite passed 20/20. Six fresh adjacent scenarios were then added; repeated full-suite runs exposed model variance in explicit booking intent, explicit names, concern mapping, and an `actual person` request, which were moved behind deterministic application guards.
- Passed final: the expanded real-Luna direct dialogue suite passes 26/26. Twilio/WhatsApp, Supabase, Google Calendar, and Stripe network calls remained disabled.
- Not run after fixes: live WhatsApp smoke test or Railway deployment verification.
- Passed: the style-diverse direct real-Luna suite now contains exactly 100 scenarios covering greetings, approved FAQ paraphrases, service exploration, formal/casual/code-switched/typo/emoji bookings, adult and minor age language, medical and emergency handovers, ambiguity, negation, and structured-memory behavior. The test does not infer or store race, sex, or age demographics.
- Failed then fixed: the first expanded run passed 92/100 and exposed shared-layer defects in appointment-FAQ routing, explicit weekday/time fallback, adult-age matching, and standard pregnancy/breastfeeding forms. Later full runs exposed stochastic gaps in heavy typos, common FAQ paraphrases, personal reactions, related minors, allergy forms, and corrected-package selection; each was moved behind a narrow deterministic guard where appropriate.
- Passed final: `npm run test:dialogue:live` completed 100/100 against real `gpt-5.6-luna` with `reasoning_effort: medium`. Twilio/WhatsApp, Supabase, Google Calendar, and Stripe network calls remained disabled.
- Passed final: `npm run check` builds the service and passes 20/20 offline tests, including the newly fixed safety, FAQ, explicit weekday/time, adult-age, and package-correction regressions.
- Not run: Railway deployment or WhatsApp smoke verification for the 100-scenario fixes.
- Passed: the provider-isolated live harness now contains exactly 200 scenarios. The additional 100 UK-focused cases cover 15 greetings/registers, 20 approved FAQ paraphrases, 15 service-exploration expressions, 30 booking/date/time forms, 15 safety/handover expressions, and 5 ambiguity/negation/memory cases. Regional labels describe sampled lexical forms only and are neither inferred nor persisted at runtime.
- Failed then fixed: iterative 200-case runs exposed UK greeting, FAQ word-order, spoken-clock, weekday abbreviation, day-month, `fortnight`/`a week on`, complete one-shot booking, medication, post-treatment reaction, emergency, minor, and explicit package-correction gaps. Narrow deterministic guards were added before constrained LLM classification; difficult cases were retained rather than removed or weakened.
- Passed final: `npm run test:dialogue:live` completed 200/200 against real `gpt-5.6-luna` with `reasoning_effort: medium`. Twilio/WhatsApp, Supabase, Google Calendar, and Stripe network calls remained disabled; only the configured model API was used.
- Passed final: `npm run check` builds the service and passes 20/20 offline tests, including new UK greetings, FAQ word order, spoken British times, day-month and abbreviated weekday dates, medical/emergency language, and corrected-package precedence.
- Not run: Railway deployment or WhatsApp smoke verification for the 200-scenario UK expansion.
- Passed: `npm run build` compiles the new dedicated UK date/time benchmark.
- Failed as a product benchmark: `npm run test:uk-time:live` completed 152/200 real-Luna scenarios with all non-model providers disabled. Category results were numeric clocks 34/40, spoken clocks 40/50, date wording 51/60, and vague/invalid handling 27/50. The failures remain intentionally visible for the next hardening pass.
- Passed in the UK date/time benchmark: all ordinary colon-based 12/24-hour times, core British `half`/`quarter`/`past`/`to` forms, most full British dates, common relative weekdays, vague dayparts, and invalid calendar dates.
- Failed in the UK date/time benchmark: dotted and compact clock forms, several fully spoken minute/24-hour forms, some hyphenated spoken times, selected abbreviated/relative date forms, and—most importantly—approximate, range, before/after, and time-without-date requests that were incorrectly stored as exact slots.
- Passed: `npm run check` still compiles the full service and passes 20/20 offline tests after adding the separate benchmark.
- Passed with review recommendations: the bundled-Python context validator reports 0 errors; the two undated session files and graph metadata without a source commit remain its three recommendations.
- Failed then fixed: the first hardening run improved the exact UK date/time benchmark from 152/200 to 195/200. The five remaining spoken-clock failures came from token precedence (`twenty-five` split at the hyphen and `ten fifteen` treated as relative minutes); the parser now permits omitted `past` only for British `half` forms and prefers the longest minute token.
- Passed final: the unchanged `npm run test:uk-time:live` suite completed 200/200 against real `gpt-5.6-luna` at `reasoning_effort: medium`: numeric clocks 40/40, spoken clocks 50/50, date wording 60/60, and vague/invalid handling 50/50. Only the configured model API was used.
- Passed final: `npm run check` compiles the service and passes 21/21 offline tests, including deterministic precedence over an intentionally wrong LLM date/time plus vague, range, missing-date, invalid-date, dotted, compact, spoken-minute, hyphenated, and spoken-24-hour cases.
- Passed regression: `npm run test:dialogue:live` remains 200/200 against real `gpt-5.6-luna`; Twilio/WhatsApp, Supabase, Google Calendar, and Stripe network calls remained disabled.
- Failed then fixed: the new customer-copy regression first failed on `Stripe Test Checkout`, then passed after naturalising payment, date, availability, handover, failure, and confirmation messages. Customer chat no longer asks for `YYYY-MM-DD HH:mm` or exposes timezone/provider implementation details.
- Passed final: `npm run check` compiles the service and passes 22/22 offline tests after the copy cleanup.
- Passed regression: the full `npm run test:dialogue:live` suite remains 200/200 against real `gpt-5.6-luna`; all non-model provider traffic remained disabled.
- Passed: new untouched blind language baseline completed 78/100 and exposed 22 concrete gaps rather than reusing the existing regression vocabulary.
- Passed: after fixing the discovered routing, correction, FAQ, package-precedence, and safety gaps, `npm run test:dialogue:blind:live` completed 100/100 against real `gpt-5.6-luna` at `reasoning_effort: medium`.
- Passed: final `npm run check` completed 25/25 offline tests.
- Passed: final `npm run test:dialogue:live` regression completed 200/200 against real Luna.
- Passed: final `npm run test:uk-time:live` exact London-local regression completed 200/200 against real Luna.
- Passed: the three direct model suites disabled Twilio/WhatsApp, Supabase, Google Calendar, and Stripe network calls; only the configured model API was used.
- Failed then fixed: the deployed smoke test did not recognise `tmr` because the shared normaliser handled weekday/package abbreviations but no today/tomorrow shortcuts.
- Passed: `npm run check` completed 26/26 after adding exact London-date assertions for `tdy`, `2day`, `tmr`, `tmrw`, `tmw`, `tmoro`, `2moro`, `2morrow`, `tmoz`, and `tomoz`, plus a regression proving `tmr` cannot be stored as a customer name.
- Passed: `npm run build` and the focused Node test suite after the ORA presentation update; 27/27 checks cover the four-option welcome, exact product/service and general-question choices, callback handoff, Founder contact details, booking confirmation CTA, and emergency precedence over callback routing.
- Failed then fixed: the first post-ORA real-Luna regression passed 197/200 because three assertions still expected the retired service-list sentence; no intent, state, or safety case failed. The assertions were updated to the approved ORA copy.
- Passed final: `npm run test:dialogue:live` completed 200/200 against real `gpt-5.6-luna`; Twilio/WhatsApp, Supabase, Google Calendar, and Stripe network calls were disabled.
- Passed: `git diff --check` reported no whitespace errors and the changed-file secret-shape scan found no provider credential patterns.
- Passed with review recommendations: the bundled-Python context validator reports 0 errors; the two undated session files and graph metadata without a source commit remain its three recommendations.
- Not run: Railway deployment and live WhatsApp smoke test for the ORA welcome, callback request, and post-booking Founder CTA.
- Not available: a cleaner-business content conversion and Calendly link because the cleaner's approved process data and meeting URL have not been supplied.
- Passed: `npm run build` and the focused Node test suite after taking Clinic offline; 28/28 checks pass.
- Passed: the ORA-only regression proves the welcome and safety copy contain no Clinic/package/service names, Clinic-style messages do not call the model classifier, new booking requests return the approved pending-template response, and stale Clinic booking state is reset before ORA handling.
- Passed: production dependency construction passes the disabled-by-default `ENABLE_CLINIC_DEMO` setting into the conversation engine; the retained direct-engine Clinic tests remain enabled and continue to pass.
- Passed: medical/emergency and callback routing still run before the ORA-only boundary, while new Clinic FAQ, package, Calendar, and payment flows are unreachable in default mode.
- Passed with review recommendations: project-context validation reports 0 errors and the same three recommendations for undated session files and graph metadata without a source commit.
- Not run: the 200-case live Luna suite after Clinic was disabled because ORA-only mode deliberately bypasses the model; the retained Clinic suite last passed 200/200 immediately before this change.
- Not run: Railway deployment and live WhatsApp verification of ORA-only mode.
- Passed: `npm run build` and the focused Node test suite after adding Cleaner Demo; 30/30 checks pass.
- Passed: exact case-insensitive standalone `cleaner` activates and persists Cleaner Demo, while `cleaner please` and `I need a cleaner` remain in main ORA without calling the model classifier.
- Passed: Cleaner greetings remain in Cleaner Demo, booking-like enquiries return the honest pending-template reply, `START OVER` clears the mode, and a conversation older than 24 hours returns to main ORA.
- Passed: emergency detection still pre-empts Cleaner replies, and the resulting handover remains paused on a later greeting.
- Passed: `git diff --check` reported no whitespace errors after the Cleaner change.
- Not run: the idempotent `business_mode` Supabase migration, Railway deployment, and live WhatsApp Cleaner smoke test require the user-owned services.
- Passed with review recommendations: final project-context validation reports 0 errors; the undated session files and graph metadata without a source commit remain its three recommendations.
- Passed: `npm run check` after the ORA capability-Q&A update builds successfully and passes 30/30 offline checks, including knowledge, booking/calendar, test-payment, integration, explicit closing, and no-Clinic-copy assertions.
- Passed: `npm run check` after Supabase Auth integration builds successfully and passes 32/32 offline checks. The focused HTTP check covers missing, invalid, and valid bearer tokens and proves Google OAuth initiation rejects unauthenticated requests.
- Passed: `git diff --check` reports no whitespace errors after the Auth change.
- Not available: live Supabase Auth verification because `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are not populated in the local environment.
- Passed with review recommendations: project-context validation reports 0 errors and the existing three recommendations for undated session files and graph metadata without a source commit.
- Failed then fixed: the new ORA product-enquiry suite initially passed 190/200, exposing missing plural handling for `FAQs` and `integrations`.
- Passed final: `npm run test:ora-product` completed 200/200 across five 40-case customer-intent groups. It made 0 AI model, WhatsApp, Supabase, Calendar, and Stripe network calls, created no booking or handoff, and rejected Clinic copy.
- Passed final: `npm run check` builds successfully and passes 32/32 focused offline checks after the routing fix.
- Failed then fixed: the expanded UK-language ORA product suite initially passed 856/1,000. All 144 failures were booking/calendar capability questions prefixed with conversational wording such as `Hiya`, `mate`, `quick one`, `aye`, and `no faff`.
- Passed final: `npm run test:ora-product` completed 1,000/1,000 across 25 UK registers/slang styles and five 200-case capability groups. It made 0 AI model, WhatsApp, Supabase, Calendar, and Stripe calls and created no booking or handoff.
- Passed final: `npm run check` remains green with 32/32 focused offline checks after the UK-language routing fix.
# Registered sender and abc verification

- Passed: Twilio API returned abc content and the registered sender ONLINE.
- Passed: sender webhook update followed by GET verified the exact Railway callback and POST method.
- Passed: npm run check, build plus 33/33 tests including signed HTTP menu routing, duplicate handling, active-booking greeting preservation and text fallback.
- Not run: live phone delivery, Railway variable update and deployment; Railway CLI is unauthenticated and browser automation timed out.

## 2026-09-07 - Screenshot regression
- Passed: npm run check (build and 34/34 tests), including both screenshot utterances, name/date/policy/payment state preservation, old-session recovery, and handover pause.
- Failed then fixed: initial process matcher missed work and later intercepted two integration questions; narrowed matching and reran.
- Passed: npm run test:ora-product 1000/1000, zero model/provider calls.
- Not run: deployment and live WhatsApp replay; current deployed revision not verified.

## 2026-09-08 - Semantic migration
- Passed: npm run check, TypeScript build plus 36/36 offline tests, including real SDK against a local mock endpoint and output validation.
- Passed: state tests cover screenshot routing through classifyOra, topic context, name grounding, ambiguous date correction, consent, payment status, safety and model failure.
- Passed: npm run test:ora-product 1000/1000 deterministic fallback cases; these do not prove real-model understanding.
- Blocked: npm run test:ora-semantic:live reached the existing VectorEngine endpoint; first semantic request failed with HTTP 403, user quota is not enough. The two initial deterministic commands passed; no semantic live case passed.
- Passed: separate source review confirmed production factory already constructs the extended classifier; Cleaner/Clinic boundaries and no-transcript memory remain intact.
- Not run: WhatsApp live replay and Railway deployment. No Calendar, Stripe, WhatsApp or Supabase network calls in semantic harness.

## 2026-09-08 - RelayRouter verification
- Failed initially: two requests exceeded the 10-second runtime timeout. A diagnostic request with a longer allowance then completed in 2,982 ms with the expected journey decision.
- Failed then fixed: first full live run passed 16 steps but found missing persisted new state for a status request without a booking. No false payment/booking confirmation occurred.
- Passed final: npm run check, build and 36/36 offline tests including the shared status regression.
- Passed final: npm run test:ora-semantic:live, 17/17 steps and 13 real model calls through the new endpoint. Screenshots, topic follow-up, booking details, policy, payment status and instruction injection covered.
- Passed: git diff --check. No external WhatsApp, Calendar, Stripe or Supabase calls were made by the live harness.
- Not run: Railway configuration verification/deployment and phone smoke test. A single successful suite does not establish production latency reliability.

## 2026-09-08 - Random English results
- Passed execution: all 1,000 unique seeded cases completed against actual bot routing and the real configured model.
- Failed baseline: 914/1,000 passed, 53 behavior failures, 33 model unavailable; 867 model requests, eight workers.
- Passed behavior replay: 83/86 passed after initial fixes, zero behavior failures, three unavailable.
- Full regression: 936/1,000 passed, one behavior failure, 63 unavailable; 898 model requests, eight workers.
- Passed final targeted replay: 64/64 after recognized-topic handling guard, two workers, zero behavior/model failures. No subsequent full 1,000-case run claimed.
- Passed: final npm run check (build and 36/36 offline tests); deterministic test:ora-product 1,000/1,000 after initial fixes.
- Total: 2,150 executions, 1,915 real-model requests; no WhatsApp, Calendar, Stripe or Supabase network calls.
- Not run: deployment, phone test, or proof of sustained production latency reliability. Full reports and corpus retained in ora-random-results/.

## 2026-09-08 - 3,000 regional English first pass
- Passed execution: 3,000 unique frozen model-generated messages, 12 regions x 25 intents x 10 persona styles; 3,000 distinct user IDs and names; zero prior-corpus text reuse.
- First-pass result: 2,837/3,000 (94.57%); 96 assertion failures, 65 model timeouts, two HTTP 429 errors. Eight workers, production 10-second timeout, 2,600 runtime model calls.
- Generation: 71 successful API calls, 239,003 reported tokens. Total recorded calls this batch: 2,671; runtime token/currency cost not recorded.
- Passed: final shared-store conversation/booking snapshot isolation checks, zero cross-user mutations detected. No real messaging, Calendar, Stripe or Supabase traffic.
- Passed: npm run check (build and 36/36); separate tsc --ignoreConfig --noEmit check for all three generation/runner/report scripts. Initial tsc invocation needed --ignoreConfig for TypeScript 7.
- Findings: 77 informational handover false positives; nine polite rescheduling failures; four date failures; one name correction lost time; one negated-emergency severity error; four topic mismatches include overlapping scoring labels.
- Not run: fixes, post-fix replay, deployment or phone test. Production source unchanged during this batch. Synthetic same-model corpus does not establish native-speaker or demographic accuracy.
- Reports: ora-regional-results/REPORT.md, failures.md, frozen corpus.json and complete baseline JSON.

## 2026-09-08 - Regional fixes verified
- Passed: npm run check, build and 37/37 tests; deterministic ORA product 1000/1000.
- Partial interrupted replay: 121/125 persisted passes, one behavior failure fixed, three unavailable; 38 not persisted. Completed continuation: 42/42, zero behavior/unavailable, four workers.
- Passed independent ID coverage check: all 163 original failed cases have passing replay records across reports; not a one-pass 163/163 or full 3000/3000 claim.
- Passed: real semantic multi-turn 17/17 with 13 actual model calls.
- Not run: full post-fix 3000 regression, deployment, phone test. Provider reliability not claimed fixed. See ora-regional-results/FIXES.md.

## 2026-09-08 - Requested full rerun / two-worker follow-up
- Passed coverage: 3000 unique IDs attempted; unchanged SHA256 corpus.
- Eight-worker interrupted segment: 2400 completed, 2291 passed, 109 model timeouts, zero behavior assertions; final isolation loop not reached.
- Two-worker completed continuation: 706/709 passed, three timeouts, zero behavior assertions; final isolation snapshots passed.
- Same-case comparison: 106/109 former timeouts passed at two workers; three still timed out. p95 10001ms versus 5093ms; provider cap not verified.
- Latest-result union: 2997 pass, three unavailable; not a single-pass 3000-case rate.
- Not run: new build/offline checks (no code changes), deployment or phone test. Raw reports and interpretation: ora-regional-results/POST_FIX_RERUN.md.

## Final three case verification
- Passed: exact real-model replay 3/3, three calls, 3421/6426/4765ms, unchanged 10-second timeout.
- Passed: expanded real semantic multi-turn suite 20/20, 16 calls, includes original three texts and retained booking-name/date assertions.
- No production bug reproduced; provider latency/concurrency cause remains unverified. No hardcoded utterance routing added.
- Not run: deployment or repeat production build/offline suite; only live test/documentation changed. See ora-regional-results/FINAL_THREE.md.

## GitHub publication preparation
- Passed: fresh npm run check (build and 37/37 offline tests). Existing live semantic 20/20 and regional evidence retained.
- Passed: scan of all 121 changed/untracked files against configured secret values and token/private-key patterns; only .env.example is tracked, local credentials remain ignored.
- Passed: authenticated remote check; origin/main matched local base c7fbfdbe3f73cde57faea8622ebcc16a6f355437.
- Passed: context validator with zero errors and three existing metadata recommendations. Graph may be outdated.
- Not run: Railway deployment verification or phone testing. GitHub push outcome is verified against the remote ref in this publication turn.
