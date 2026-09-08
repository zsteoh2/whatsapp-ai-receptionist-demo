# Regional benchmark fixes — 2026-09-08

The 3,000-case baseline remains unchanged at 2,837/3,000. This repair pass fixes the verified behavior roots; it is not a new full 3,000-case score.

## Changes
- Human handover feature questions reach semantic classification despite first-person wording; both handover and hand over supported. Direct speak-to-human requests, complaints and dangerous symptoms retain priority.
- Nonmedical time suitability does not trigger medical handover. A negated emergency label alone does not elevate severity, while independent breathing difficulty remains emergency.
- Shared date hints exclude polite modal May. Name-only changes retain the current date; actual month/date changes still invalidate vague times.
- How about introduces a precise suggestion, not approximation. An exactly restatement of the same numeric clock resolves by; deadlines, conflicting clocks and approximate periods still require clarification.
- Semantic prompt distinguishes polite rescheduling requests from capability questions and clarifies booking/calendar and payment/policy topic overlap.

## Verification
- Build and offline checks: 37/37 passed, including adjacent negative safety/date cases.
- Existing deterministic ORA product suite: 1,000/1,000 passed (zero model calls).
- Real-model failed-case replay was interrupted after 125/163 persisted results: 121 passed, one spaced-hand-over false positive, three unavailable. The spaced wording was then fixed.
- Resumed only the missing/failed 42 cases: 42/42 passed, four workers, 41 model calls, zero behavior errors or model failures, p50 3,121ms and p95 5,618ms.
- Coverage verification: all 163 distinct original failed IDs have a passing replay record across the two reports. There are 167 persisted executions and 165 model calls in these reports. Interruptions may have caused additional unrecorded in-flight calls; these are not exact billing totals.
- Real-model multi-turn regression: 17/17 passed, 13 model calls.
- No real WhatsApp, Stripe, Calendar or Supabase traffic; no deployment or phone test.

## Raw evidence and limitations
- [Interrupted replay](./2026-09-07T19-05-13-122Z-replay.json)
- [Completed 42-case continuation](./2026-09-08T13-12-46-402Z-replay.json)
- [Original baseline report](./REPORT.md)

No full post-fix 3,000-case rerun was performed. Four-worker replay and a multi-turn regression do not prove eight-worker endpoint reliability. The 10-second timeout remains unchanged; provider timeouts and HTTP 429s are not claimed fixed. Original corpus and baseline labels were not changed.

## Subsequent full-corpus rerun
All 3000 IDs were subsequently attempted across eight-worker and two-worker segments; see [the separate rerun report](./POST_FIX_RERUN.md).
