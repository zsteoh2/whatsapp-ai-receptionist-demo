# Post-fix rerun and concurrency comparison

User requested all 3,000 frozen cases be rerun, then explicitly asked to reduce concurrency after sustained timeouts. No application code, model, corpus or timeout changed during this run.

| Measure | 8 workers, interrupted on request | 2 workers, continuation |
|---|---:|---:|
| Persisted completed cases | 2400 / 3000 planned | 709 / 709 |
| Passed | 2291 | 706 |
| Behavior assertion failures | 0 | 0 |
| Model timeouts | 109 | 3 |
| Actual recorded model requests | 2148 | 640 |
| Timeout rate per model request | 5.07% | 0.47% |
| p50 request-path latency | 2340 ms | 2810 ms |
| p95 request-path latency | 10001 ms | 5093 ms |

The 709-case continuation contains 600 uncompleted cases plus the 109 earlier timeout cases. Of the exact same 109 previously timed-out cases, 106 passed at two workers and three still timed out. No HTTP 429 or quota errors were recorded in either segment.

All 3,000 unique IDs have now been attempted after the fixes. Using the latest recorded result per ID: **2,997 passed, three unavailable, zero behavior failures**. This combines two concurrency settings and retries; it is NOT a single-pass 99.9% or a completed eight-worker 3,000-case score.

Original pre-fix baseline: 2,837/3,000, 96 behavior failures, 67 unavailable. No new behavior assertion failures were recorded in this post-fix attempt, but unavailable cases cannot establish correct behavior. All 96 original behavior-failure IDs had passing records from the earlier targeted repair replay; see FIXES.md.

The lower concurrency result is consistent with less concurrent pressure or queueing. The provider's exact concurrency cap was not verified; load/time-of-run variation is a confounder. There were no observed 429 responses here. Two workers is a reasonable temporary test setting based on these measurements, not a claimed vendor limit or a production configuration change.

## Evidence and limits
- [Eight-worker partial run](./2026-09-08T13-22-22-101Z-post-fix.json)
- [Two-worker completed continuation](./2026-09-08T13-36-25-765Z-replay.json)
- [Original baseline](./REPORT.md)
- [Earlier fixes](./FIXES.md)
- Corpus SHA256 unchanged: 16E5A0601971405AC47FDF8298FFD6D0FEBB5EC96B12D2A6E823C67DFABB6F38
- 3,109 persisted test executions, 2,788 recorded model calls. Interrupted in-flight/uncheckpointed requests may add usage, so this is not an exact billing total.
- Model: gpt-5.6-luna via api.relayrouter.ai. Classifier timeout remains 10 seconds; deterministic shortcuts remain active.
- No external messaging, Calendar, Stripe or Supabase calls. Synthetic regional/persona labels do not establish demographic accuracy; this is seeded single-message state-transition testing, not 3,000 full customer journeys.
- Two-worker final shared-store snapshots passed. The interrupted eight-worker run did not reach its final cross-user snapshot loop.
- No code fixes, new build/offline test rerun, deployment or phone test in this measurement turn. Prior repair checks remain documented separately.

## Remaining unavailable cases
- 2865 / resume: May we please continue with the booking, and could you let me know what is needed next? — timeout
- 1769 / knowledge: Can it answer from our company material—our FAQs and catalogue, I mean? — timeout
- 1012 / knowledge: Can it use our docs and FAQs to answer customers? — timeout

## Later diagnostic replay
The remaining three cases subsequently passed with unchanged application code; see [final-three investigation](./FINAL_THREE.md). Earlier scores above remain unchanged.
