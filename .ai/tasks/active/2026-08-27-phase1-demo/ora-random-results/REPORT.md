# ORA: 1,000 randomized English cases

Date: 2026-09-08 (Asia/Kuala_Lumpur). Configured model: gpt-5.6-luna via api.relayrouter.ai.

## Result

The original full run passed 914/1,000 (91.4%). After fixes, the full regression passed 936/1,000 (93.6%), with one behavior failure and 63 model-unavailable results. A final handling guard was added for a recognized topic paired with an unknown action; all 64 failed cases then passed when replayed at two workers. This is NOT a one-pass 1,000/1,000 result. The final guard was checked with offline tests and the failed-case replay, not another full 1,000-case run.

| Run | Workers | Passed | Behavior failures | Model unavailable | Model requests | Model-path p50 | Model-path p95 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Original full run | 8 | 914/1000 | 53 | 33 | 867 | 2.54s | 7.64s |
| Failed-case replay after initial fixes | 8 | 83/86 | 0 | 3 | 86 | 3.56s | 6.64s |
| Full regression after initial fixes | 8 | 936/1000 | 1 | 63 | 898 | 2.89s | 10.01s |
| Failed-case replay after final guard | 2 | 64/64 | 0 | 0 | 64 | 2.17s | 4.19s |

Total: 2150 test executions over the same 1,000 unique inputs; 1915 real model requests, including failed attempts. Deterministic safety/command routing accounts for the remaining executions. No retry results replace an earlier score. No WhatsApp, Supabase, Google Calendar or Stripe network calls were made.

## Method and limits

- Fixed seed 20260908; 25 categories with 40 unique English inputs each. Randomized phrase/prefix combinations, selected chat abbreviations, names and workflow states.
- Corpus: [corpus.json](corpus.json). These are template-based randomized messages with synthetic preloaded state, not 1,000 complete multi-turn customer journeys or an independent general-language benchmark.
- Real ConversationEngine and configured classifier; local store and Calendar/Checkout/sender doubles. Only the configured model origin is permitted by the test fetch wrapper.
- Checks include approved response topic, retained state/name/time, explicit field extraction, no booking/payment mutation without consent/provider events, no Clinic copy, and expected safety handoff.
- Baseline and full regression use eight workers and the production 10-second model timeout. The last failed-case replay uses two workers. Different load, time and cache conditions prevent attributing latency differences solely to code changes or concurrency.
- Model-unavailable results include request failures/timeouts. Earlier runs did not retain detailed provider failure codes. Their timings clustered near the 10-second deadline; they are not counted as semantic misunderstanding.
- The passing lower-concurrency replay shows those cases can succeed; it does not establish reliable eight-concurrent-user service or production WhatsApp performance. No deployment occurred.

## Fixes

1. Human-support feature questions no longer automatically trigger general handover; direct personal requests, complaints, medical and emergency cases retain protection.
2. The discourse phrase 'just to be clear' no longer invalidates an otherwise exact date/time.
3. Topic follow-ups refer to the last ORA topic rather than guessing that all 'details' are booking details.
4. Actual staff identities, hours and addresses route to the unconfigured-business answer.
5. Polite requests to begin a demo or receive a callback are distinguished from feature questions.
6. A validated known topic with action unknown can still receive its approved answer while preserving progress.

Offline validation: build and 36/36 tests passed after the final guard. The separate deterministic ORA suite passed 1,000/1,000 after the initial fixes.

## Category results (full runs only)

| Category | Original pass | Regression pass | Regression behavior failures | Regression unavailable |
|---|---:|---:|---:|---:|
| booking | 40/40 | 35/40 | 0 | 5 |
| callback | 38/40 | 39/40 | 0 | 1 |
| close | 37/40 | 39/40 | 0 | 1 |
| combined | 38/40 | 36/40 | 0 | 4 |
| correction | 39/40 | 39/40 | 0 | 1 |
| datetime | 34/40 | 39/40 | 0 | 1 |
| emergency | 40/40 | 39/40 | 0 | 1 |
| followup | 33/40 | 37/40 | 0 | 3 |
| handover | 8/40 | 37/40 | 0 | 3 |
| injection | 39/40 | 36/40 | 0 | 4 |
| integration | 40/40 | 38/40 | 0 | 2 |
| journey | 36/40 | 39/40 | 0 | 1 |
| knowledge | 36/40 | 38/40 | 0 | 2 |
| medical | 40/40 | 40/40 | 0 | 0 |
| name | 38/40 | 37/40 | 0 | 3 |
| negated | 38/40 | 35/40 | 0 | 5 |
| no-consent | 39/40 | 34/40 | 0 | 6 |
| overview | 38/40 | 39/40 | 0 | 1 |
| payment | 40/40 | 37/40 | 0 | 3 |
| policy | 38/40 | 36/40 | 0 | 4 |
| resume | 40/40 | 38/40 | 0 | 2 |
| start | 36/40 | 36/40 | 0 | 4 |
| status | 40/40 | 39/40 | 0 | 1 |
| unavailable | 32/40 | 38/40 | 1 | 1 |
| vague | 37/40 | 36/40 | 0 | 4 |

## Raw results

- [Original full run](2026-09-07T17-49-22-921Z-baseline.json)
- [Failed-case replay after initial fixes](2026-09-07T17-56-28-920Z-replay.json)
- [Full regression after initial fixes](2026-09-07T17-57-53-682Z-post-fix.json)
- [Failed-case replay after final guard](2026-09-07T18-06-04-612Z-replay.json)

Remaining work: verify model-service tail latency under intended traffic, then deploy reviewed changes and phone-test.
