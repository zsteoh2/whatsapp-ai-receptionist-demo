# Final three unavailable cases — diagnostic result

All three verbatim inputs passed with the existing application code, one worker and unchanged 10-second timeout:

| ID | Expected behavior | Result | Request-path time |
|---|---|---|---:|
| 2865 | Resume existing booking, ask for date/time, preserve name | Passed | 3421 ms |
| 1769 | Answer approved business-knowledge question, preserve booking state | Passed | 6426 ms |
| 1012 | Answer approved business-knowledge question, preserve booking state | Passed | 4765 ms |

[Raw replay](./2026-09-08T14-18-02-139Z-replay.json): 3/3 passed; three actual model requests; zero behavior/model failures; shared-store final snapshots passed.

Added the verbatim messages to scripts/test-ora-semantic-live.ts as ongoing multi-turn regressions. They now run during active booking and policy stages and assert preservation of name/time, not merely text matching. Expanded suite passed 20/20 with 16 real model calls.

No language-routing defect was reproduced and no production code, model configuration, timeout or vendor settings were changed. The earlier failures were recorded timeouts; current success is consistent with transient service latency, not proof of a particular provider concurrency cap or permanent timeout resolution. No literal-message shortcuts were added.

All 3000 corpus IDs now have at least one passing post-fix record across multiple runs. This is eventual coverage, NOT a single-pass 3000/3000 result. Earlier failures remain intact in the reports.

No deployment or real WhatsApp, Calendar, Stripe or Supabase traffic. This turn used 19 real model calls. Production build/offline suite not rerun because only the live regression script and documentation changed; the changed script was exercised against the real configured provider.
