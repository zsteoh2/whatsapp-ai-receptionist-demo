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
- 2026-08-29: Upgraded the conversation layer with global greeting priority, strict multi-field extraction, natural schedule/reserve recognition, persistent partial booking slots, and missing-field-only prompts without storing raw chat text.
- 2026-08-29: Added a direct live dialogue harness with 20 synthetic adversarial scenarios and no WhatsApp/provider traffic; 12 passed and 8 exposed greeting, shorthand, ambiguity, vague-time, decline-slang, and medical-slang gaps.
- 2026-08-29: Fixed all eight adversarial gaps through shared shorthand normalization, broader deterministic safety/greeting/decline rules, package/time validation, and a constrained LLM handover backstop; the suite passed 20/20, then expanded to 26/26 after fresh adjacent cases exposed and closed two model-variance gaps.
- 2026-08-30: Expanded the direct real-Luna harness to 100 style-diverse scenarios without external provider traffic. Iterative full-suite runs exposed and fixed appointment-FAQ false bookings, explicit weekday/time omissions, adult-age false handovers, standard pregnancy/breastfeeding/allergy variants, personal reaction and related-minor safety gaps, common shorthand/typos, approved FAQ paraphrases, and corrected-package selection; the final full run passed 100/100 and offline checks passed 20/20.
- 2026-08-30: Expanded the harness to exactly 200 scenarios by adding 100 UK-focused register, regional lexical, FAQ, service, booking/date/time, safety, ambiguity, and memory cases. Added deterministic UK greetings and approved FAQ paraphrases; British spoken-clock, abbreviated weekday, day-month, `fortnight`, and `a week on` parsing; complete one-shot booking extraction; and UK medical/emergency/handover wording. The final real-Luna run passed 200/200 with external provider traffic disabled, and offline checks passed 20/20.
- 2026-08-30: Added a separate 200-case real-Luna UK date/time benchmark with exact London-local minute assertions: 40 numeric clocks, 50 spoken clocks, 60 date forms, and 50 vague/invalid inputs. After removing an ISO-date confound from the clock groups, the baseline passed 152/200 and exposed unsupported UK clock/date forms plus unsafe conversion of approximate, range, and date-incomplete requests into exact slots.
- 2026-08-30: Hardened the shared time layer by making deterministic validated dates/times authoritative over Luna, refusing approximate/range/incomplete requests, and adding dotted/compact clocks, spoken minutes, hyphenated British times, spoken 24-hour clocks, month abbreviations, day/month formats, and UK relative-week forms. The unchanged exact-time suite improved from 152/200 to 195/200, then 200/200 after fixing `twenty-five` and `ten fifteen` token precedence; offline checks passed 21/21 and the general live suite remained 200/200.
- 2026-08-30: Replaced customer-facing ISO/timezone/provider/implementation wording with natural UK date examples and plain booking language while keeping demo, medical, payment, and confirmation boundaries. Added a focused copy regression; offline checks passed 22/22 and the full real-Luna dialogue suite remained 200/200.
- 2026-08-30: Added a separate 100-case blind real-Luna suite covering navigation, FAQ paraphrases, ordinary concern wording, corrections, negation/hypotheticals, and safety escalation. The untouched baseline passed 78/100; fixes made explicit customer wording authoritative, preserved corrections before consent, expanded approved FAQ/service language, and added deterministic medical, emergency, minor, coercion, and legal-action guards. The final blind run passed 100/100 without WhatsApp or provider traffic.
- 2026-08-30: Made the blind benchmark reusable by computing relative London dates at runtime and using stable future dates for fixed-date cases. Final offline checks passed 25/25, the original general real-Luna regression passed 200/200, and the exact UK date/time regression passed 200/200.
- 2026-08-31: Fixed the live-smoke gap for date shortcuts by normalising `tdy`, `2day`, `tmr`, `tmrw`, `tmw`, `tmoro`, `2moro`, `2morrow`, `tmoz`, and `tomoz` in the existing shared input layer. Reserved-name checks now use normalised input so a standalone shortcut cannot become the customer name; offline checks pass 26/26.
- 2026-09-01: Added the ORA presentation layer around the proven clinic example: a scannable four-option welcome, exact menu-choice support, deterministic callback handoff, and a Founder phone/email CTA on confirmed bookings and human follow-up. Safety remains ahead of callback routing. Offline checks pass 27/27 and the full real-Luna dialogue regression passes 200/200 with non-model providers disabled.
- 2026-09-01: Took the Clinic template offline behind disabled-by-default `ENABLE_CLINIC_DEMO`. Production dependency construction now explicitly selects ORA-only mode, which removes Clinic copy, bypasses the Clinic classifier and new-booking flow, and refuses to invent replacement business facts. The retained Clinic engine remains available for regression; build and offline checks pass 28/28.
- 2026-09-01: Added a hidden, deterministic Cleaner Demo selected only by an exact standalone `cleaner` message. The mode persists as bounded structured conversation state, survives normal turns, exits on `START OVER`, expires after 24 hours, never invokes the dormant Clinic classifier, and refuses to invent missing cleaner facts. Added an idempotent Supabase column migration; build and offline checks pass 30/30.
- 2026-09-02: Reframed the main ORA-only welcome around demonstrating ORA itself. Added fixed capability answers for approved business knowledge, booking/calendar automation, test payments, integrations, and human handover, plus a Founder CTA for explicit conversation endings. No Clinic content is exposed; `npm run check` passes 30/30.
- 2026-09-04: Added Supabase bearer authentication for administrative HTTP routes using the existing Supabase client and remote `auth.getUser` validation. `/api/me` and Google OAuth initiation are protected; signed webhooks, health, OAuth callback state, and payment return pages retain their existing controls. Offline checks pass 32/32.
- 2026-09-04: Added a provider-isolated 200-case ORA product-enquiry suite across general capability, business knowledge, booking/calendar, payment, and integration questions. Its first run exposed plural `FAQs` and `integrations` routing gaps; the shared ORA router now handles both and the final suite passes 200/200 without model or provider calls.
- 2026-09-04: Expanded the ORA product-enquiry suite to 1,000 cases using 25 UK registers and slang wrappers. The first expanded run passed 856/1,000 and exposed prefixed booking/calendar capability questions; a narrow ORA-only capability-question matcher fixed the shared gap without changing the direct booking path, and the final suite passes 1,000/1,000.
# Registered sender integration

- Connected abc menu in code and registered sender in local configuration. Updated Twilio incoming webhook and verified by API. Deployment awaits Railway authentication; retained all existing worktree changes.
# 2026-09-07 Railway configuration

- Saved and deployed the confirmed registered sender and abc menu SID through Zen. Railway returned Online.
- Started official Railway device login for code deployment; user authorization is required. Unrelated local changes remain untouched.

## 2026-09-07 - Demo question interruption fix
- Preserved booking/handover state on General question, recovered previously corrupted ORA clarification states, shared journey copy with informational process replies, and used ORA policy on resume. Existing unrelated changes preserved.
- Confirmed normal ORA routing is deterministic; the retained AI classifier is Clinic-specific. Semantic ORA dialogue remains unimplemented.

## 2026-09-08 - ORA semantic understanding
- Added dedicated validated ORA action/topic/name/handover classification using the existing SDK, endpoint, model and key; normal ORA free text reaches it before keyword fallback.
- Reused concern_category for bounded ora:topic context; preserved workflow fields, no raw transcript or schema migration.
- Kept approved answer copy, local date validation, explicit YES consent and provider-confirmed payment. Model failure preserves progress; ORA request timeout is 10 seconds.
- Added SDK-contract/state regression tests and isolated real-model journey harness. No secrets changed and no deployment performed.

## 2026-09-08 - New model connection verified
- User changed local model credentials/endpoint to RelayRouter; model remains gpt-5.6-luna. Read existing settings without modifying secrets.
- Live replay exposed unsaved new conversations on status-without-booking; fixed the shared bookingStatus path and added regression coverage.
- Updated README to describe configurable endpoints and separate Railway variables.

## 2026-09-08 - 1,000 English randomized live test
- Added reproducible 25-category live harness, per-case reports, failed-case replay and explicit concurrency. Used existing authorised real model; no non-model provider traffic.
- Fixed human-capability false handover, discourse/date parsing, semantic follow-up/request distinctions, and recognized-topic/unknown-action reply handling.
- Preserved original and full-regression results; final lower-concurrency replay passes all failed cases. Full evidence is in ora-random-results/REPORT.md.

## 2026-09-08 - Regional corpus and actual model benchmark
- Added resumable model-generated 3,000-case corpus with de-duplication, unique synthetic personas/names and immutable corpus validation.
- Extended existing live runner to accept external corpus, share isolated user-keyed MemoryStore, and check final snapshots. Added reproducible report builder.
- Completed first pass unchanged: 2,837 passed, 96 assertions failed, 67 model unavailable. Root causes and raw samples retained; no source fixes or deployment in this batch.

## Regional findings repaired
- Fixed shared safety and date-context causes and prompt distinctions. Added focused adverse/adjacent regression assertions.
- Resumed interrupted live evaluation without replaying persisted passes; all 163 original failed IDs now have passing records. Detailed evidence: ora-regional-results/FIXES.md.

## Post-fix full-corpus rerun and concurrency reduction
- Began unchanged 3000-case corpus at eight workers; stopped on user request after 2400 persisted cases (2291 pass, 109 timeouts, zero behavior failures).
- Completed remaining/failed 709 at two workers: 706 pass, three timeouts, zero behavior failures. All 3000 IDs attempted; latest results combine stages and retries, not one-pass 99.9%.
- Model/code/timeout/corpus unchanged. Evidence: ora-regional-results/POST_FIX_RERUN.md.

## Final three timeout investigation
- Replayed exact three inputs at one worker with unchanged application/runtime settings: 3/3 passed; no semantic defect reproduced.
- Added their exact wording and state-preservation assertions to multi-turn live regression; expanded suite passed 20/20. No production-code change.

## Requested latest-code publication
- Prepared current main with ORA semantic routing, booking/safety fixes, existing pending Auth work, regression harnesses and synthetic evidence. No credential files included.
- Revalidated build and tests; publishing via authenticated existing Git setup. Deployment and phone test remain separate verification steps.
