import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
const dir=resolve('.ai/tasks/active/2026-08-27-phase1-demo/ora-regional-results');
const filename=process.argv[2]??readdirSync(dir).filter(f=>f.endsWith('-baseline.json')).sort().at(-1)!;
const report=JSON.parse(readFileSync(resolve(dir,filename),'utf8'));
const corpus=JSON.parse(readFileSync(resolve(dir,'corpus.json'),'utf8'));
if(report.completed!==3000)throw new Error('Wait for all 3000 cases before reporting');
const rows:any[]=report.results;
function table(key:string){
 const labels=[...new Set(corpus.scenarios.map((s:any)=>s[key]))] as string[];
 return [`| ${key} | Cases | Passed | Assertion failures | Model unavailable |`,`|---|---:|---:|---:|---:|`,...labels.map(label=>{const group=rows.filter(r=>r[key]===label);return `| ${label} | ${group.length} | ${group.filter(r=>r.passed).length} | ${group.filter(r=>r.failure==='behavior').length} | ${group.filter(r=>r.failure==='model_unavailable').length} |`;})].join('\n');
}
const generationFiles=readdirSync(resolve(dir,'generation')).filter(f=>f.startsWith('batch-')||f.startsWith('repair-usage-'));
const tokens=generationFiles.reduce((sum,f)=>sum+(JSON.parse(readFileSync(resolve(dir,'generation',f),'utf8')).usage?.total_tokens??0),0);
const failures=rows.filter(r=>r.failure==='behavior');
const lines=[
 '# ORA: 3,000 synthetic regional English tests',
 '',`Run started: ${report.started}. Model: ${report.model}; endpoint host: ${report.host}.`,
 '',`**First pass: ${report.passed}/3000 (${(report.passed/30).toFixed(2)}%).** ${report.behaviorFailures} assertion failures and ${report.modelUnavailable} unavailable model requests. No post-fix replay or adjusted score is claimed.`,
 '',`Actual runtime model requests: **${report.modelCalls}**; other cases followed the real bot's deterministic shortcuts. Corpus generation used ${generationFiles.length} successful model calls (${tokens.toLocaleString()} reported tokens); total recorded model calls: **${report.modelCalls+generationFiles.length}**. Runtime token usage/currency cost was not recorded.`,
 '',`Eight workers; unchanged 10-second production classifier timeout. Request-path latency p50 ${report.latencyMs.p50}ms, p95 ${report.latencyMs.p95}ms, max ${report.latencyMs.max}ms (includes local handling).`,
 '',`Model failure reasons: ${JSON.stringify(Object.fromEntries([...new Set(rows.filter(r=>r.failure==='model_unavailable').map(r=>r.modelFailureReason))].map(reason=>[reason,rows.filter(r=>r.modelFailureReason===reason).length]))) }.`,
 '', '## What this covers',
 '', '12 regional-inspired English profiles × 25 intentions × 10 persona/register styles; 3,000 unique messages and synthetic user IDs. Profiles include formal, indirect, hesitant, chatty, self-correcting, simple English and texting/slang. Corpus was frozen before running. No old 1,000-case messages reused.',
 '', 'Each case starts with a seeded conversation state. Users share an in-memory store; final snapshots check later requests did not mutate another user’s conversation or booking. This is single-message state-transition testing, not 3,000 full multi-turn customer journeys or a deployed database/channel load test.',
 '', `Cross-user snapshot failures: ${rows.filter(r=>r.error?.includes('Cross-user mutation')).length}. External Calendar, Stripe, WhatsApp and Supabase traffic was blocked; only configured model origin permitted. Calendar availability was a test double. Booking records must not mutate without consent/provider events.`,
 '', '## Findings and interpretation',
 '', '- Human-handover capability questions are often intercepted by deterministic safety keywords before the model. First-person words such as “me” disable the current informational-question exception, even in “give me the rundown on ORA’s human handover feature”.',
 '- Benign date messages containing “suitable for me” can trigger the medical safety rule. This is a rule false positive, not evidence that the model failed.',
 '- Some polite rescheduling requests are classified as general booking questions, preserving the old time instead of asking for a precise replacement.',
 '- Repeated-clock wording and a “How about [exact date/time]?” suggestion reached details classification but were not accepted by deterministic date parsing.',
 '- A medical question explicitly saying “no emergency” was escalated as an emergency by the keyword rule. The customer was still handed over, but the severity was wrong.',
 '- A name-only correction phrased “may I request...” correctly extracted the name but cleared the existing time. The date-hint rule matches May without distinguishing the polite modal verb; the remaining message explicitly says to preserve other details.',
 '- Booking/calendar integration and payment/policy labels can overlap. Exact approved-topic matching is deliberately strict; review the raw response before treating every topic mismatch as a customer-visible defect. Scores have not been relabelled to hide these ambiguities.',
 '', 'The same configured model generated messages and performed classification. These are synthetic regional-inspired samples, not independent human/native-speaker validation. Region/persona labels were not supplied to the bot or stored as customer traits. Regional scores cannot establish demographic differences or real-world accuracy.',
 '', 'No production bot logic was changed during this test; discovered issues remain for targeted fixes and a fresh regression. No deployment or phone test was performed.',
 '', '## By region','',table('region'),'', '## By persona','',table('persona'),'', '## By intent','',table('kind'),
 '', '## Reproduction', '', '```powershell', 'npx tsx scripts/generate-ora-regional-corpus.ts', 'npx tsx scripts/test-ora-random-live.ts --corpus=.ai/tasks/active/2026-08-27-phase1-demo/ora-regional-results/corpus.json --concurrency=8', '```',
 '', `Raw run: [${basename(filename)}](./${basename(filename)}). Frozen [corpus](./corpus.json). [Assertion-failure review](./failures.md).`,
 ];
writeFileSync(resolve(dir,'REPORT.md'),lines.join('\n')+'\n');
writeFileSync(resolve(dir,'failures.md'),['# First-pass assertion failures','',...failures.flatMap(r=>[`## ${r.id} — ${r.region} / ${r.persona} / ${r.kind}`,'',`Customer: ${r.text}`,'',`Model decision: ${r.calls?JSON.stringify(r.decision):'Not called; deterministic routing'}`,'',`Reply: ${r.reply}`,'','```text',r.error,'```',''])].join('\n'));
console.log(JSON.stringify({passed:report.passed,behaviorFailures:report.behaviorFailures,modelUnavailable:report.modelUnavailable,modelCalls:report.modelCalls,generationCalls:generationFiles.length,generationTokens:tokens,latencyMs:report.latencyMs,byKind:Object.fromEntries([...new Set(failures.map(r=>r.kind))].map(k=>[k,failures.filter(r=>r.kind===k).length]))},null,2));
