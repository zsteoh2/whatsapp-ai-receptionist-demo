# ORA: 3,000 synthetic regional English tests

Run started: 2026-09-07T18:25:20.111Z. Model: gpt-5.6-luna; endpoint host: api.relayrouter.ai.

**First pass: 2837/3000 (94.57%).** 96 assertion failures and 67 unavailable model requests. No post-fix replay or adjusted score is claimed.

Actual runtime model requests: **2600**; other cases followed the real bot's deterministic shortcuts. Corpus generation used 71 successful model calls (239,003 reported tokens); total recorded model calls: **2671**. Runtime token usage/currency cost was not recorded.

Eight workers; unchanged 10-second production classifier timeout. Request-path latency p50 2279ms, p95 5566ms, max 10018ms (includes local handling).

Model failure reasons: {"timeout":65,"http_429":2}.

## What this covers

12 regional-inspired English profiles × 25 intentions × 10 persona/register styles; 3,000 unique messages and synthetic user IDs. Profiles include formal, indirect, hesitant, chatty, self-correcting, simple English and texting/slang. Corpus was frozen before running. No old 1,000-case messages reused.

Each case starts with a seeded conversation state. Users share an in-memory store; final snapshots check later requests did not mutate another user’s conversation or booking. This is single-message state-transition testing, not 3,000 full multi-turn customer journeys or a deployed database/channel load test.

Cross-user snapshot failures: 0. External Calendar, Stripe, WhatsApp and Supabase traffic was blocked; only configured model origin permitted. Calendar availability was a test double. Booking records must not mutate without consent/provider events.

## Findings and interpretation

- Human-handover capability questions are often intercepted by deterministic safety keywords before the model. First-person words such as “me” disable the current informational-question exception, even in “give me the rundown on ORA’s human handover feature”.
- Benign date messages containing “suitable for me” can trigger the medical safety rule. This is a rule false positive, not evidence that the model failed.
- Some polite rescheduling requests are classified as general booking questions, preserving the old time instead of asking for a precise replacement.
- Repeated-clock wording and a “How about [exact date/time]?” suggestion reached details classification but were not accepted by deterministic date parsing.
- A medical question explicitly saying “no emergency” was escalated as an emergency by the keyword rule. The customer was still handed over, but the severity was wrong.
- A name-only correction phrased “may I request...” correctly extracted the name but cleared the existing time. The date-hint rule matches May without distinguishing the polite modal verb; the remaining message explicitly says to preserve other details.
- Booking/calendar integration and payment/policy labels can overlap. Exact approved-topic matching is deliberately strict; review the raw response before treating every topic mismatch as a customer-visible defect. Scores have not been relabelled to hide these ambiguities.

The same configured model generated messages and performed classification. These are synthetic regional-inspired samples, not independent human/native-speaker validation. Region/persona labels were not supplied to the bot or stored as customer traits. Regional scores cannot establish demographic differences or real-world accuracy.

No production bot logic was changed during this test; discovered issues remain for targeted fixes and a fresh regression. No deployment or phone test was performed.

## By region

| region | Cases | Passed | Assertion failures | Model unavailable |
|---|---:|---:|---:|---:|
| United States | 250 | 237 | 7 | 6 |
| Australia | 250 | 241 | 6 | 3 |
| India | 250 | 240 | 4 | 6 |
| Ireland | 250 | 237 | 8 | 5 |
| Singapore | 250 | 238 | 9 | 3 |
| New Zealand | 250 | 237 | 9 | 4 |
| England | 250 | 241 | 5 | 4 |
| South Africa | 250 | 234 | 8 | 8 |
| Malaysia | 250 | 228 | 11 | 11 |
| Scotland | 250 | 238 | 8 | 4 |
| Canada | 250 | 234 | 10 | 6 |
| Nigeria | 250 | 232 | 11 | 7 |

## By persona

| persona | Cases | Passed | Assertion failures | Model unavailable |
|---|---:|---:|---:|---:|
| plain simple English | 300 | 287 | 7 | 6 |
| polite indirect customer | 300 | 281 | 13 | 6 |
| hesitant customer | 300 | 277 | 14 | 9 |
| skeptical customer | 300 | 284 | 12 | 4 |
| heavy texting and slang | 300 | 291 | 5 | 4 |
| curious beginner | 300 | 281 | 16 | 3 |
| chatty customer | 300 | 282 | 8 | 10 |
| self-correcting speaker | 300 | 279 | 12 | 9 |
| formal professional | 300 | 285 | 9 | 6 |
| terse busy customer | 300 | 290 | 0 | 10 |

## By intent

| kind | Cases | Passed | Assertion failures | Model unavailable |
|---|---:|---:|---:|---:|
| handover | 120 | 42 | 77 | 1 |
| vague | 120 | 110 | 9 | 1 |
| no-consent | 120 | 119 | 0 | 1 |
| injection | 120 | 116 | 0 | 4 |
| resume | 120 | 119 | 0 | 1 |
| knowledge | 120 | 118 | 0 | 2 |
| overview | 120 | 115 | 0 | 5 |
| unavailable | 120 | 117 | 0 | 3 |
| booking | 120 | 113 | 3 | 4 |
| policy | 120 | 119 | 0 | 1 |
| followup | 120 | 117 | 0 | 3 |
| status | 120 | 118 | 0 | 2 |
| correction | 120 | 117 | 1 | 2 |
| start | 120 | 112 | 0 | 8 |
| medical | 120 | 119 | 1 | 0 |
| close | 120 | 117 | 0 | 3 |
| journey | 120 | 115 | 0 | 5 |
| combined | 120 | 115 | 0 | 5 |
| callback | 120 | 118 | 0 | 2 |
| negated | 120 | 117 | 0 | 3 |
| payment | 120 | 116 | 1 | 3 |
| emergency | 120 | 120 | 0 | 0 |
| datetime | 120 | 115 | 4 | 1 |
| integration | 120 | 117 | 0 | 3 |
| name | 120 | 116 | 0 | 4 |

## Reproduction

```powershell
npx tsx scripts/generate-ora-regional-corpus.ts
npx tsx scripts/test-ora-random-live.ts --corpus=.ai/tasks/active/2026-08-27-phase1-demo/ora-regional-results/corpus.json --concurrency=8
```

Raw run: [2026-09-07T18-25-20-111Z-baseline.json](./2026-09-07T18-25-20-111Z-baseline.json). Frozen [corpus](./corpus.json). [Assertion-failure review](./failures.md).

## Subsequent repair
See [verified fixes and replay limits](./FIXES.md). The baseline above is preserved.

## Full-corpus rerun with user-requested concurrency reduction
See [post-fix results and concurrency comparison](./POST_FIX_RERUN.md).
