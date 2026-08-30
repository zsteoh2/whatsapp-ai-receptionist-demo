import { DateTime } from "luxon";
import { ConversationEngine } from "../src/conversation.js";
import { config } from "../src/config.js";
import type { CalendarGateway } from "../src/calendar.js";
import { OpenAiIntentClassifier } from "../src/llm.js";
import { MemoryStore } from "../src/store.js";
import type { CheckoutGateway } from "../src/stripe.js";
import type { Booking, PackageId } from "../src/types.js";
import type { MessageSender } from "../src/whatsapp.js";

const zone = "Europe/London";
const fixedDay = "2030-11-18";
const runDay = DateTime.now().setZone(zone).startOf("day");

class AcceptingCalendar implements CalendarGateway {
  async validateSlot() { return { valid: true }; }
  async findAlternatives() { return []; }
  async createBookingEvent() { return "unused-test-event"; }
}

class UnusedCheckout implements CheckoutGateway {
  async createCheckout(booking: Booking) {
    return { id: `unused_${booking.id}`, url: "https://checkout.stripe.test/unused" };
  }
}

class SilentSender implements MessageSender {
  async sendText() {}
}

interface Scenario {
  category: "numeric clock" | "spoken clock" | "date wording" | "vague or invalid";
  label: string;
  message: string;
  expectedLocal: string | null;
}

const local = (date: string, hour: number, minute: number) =>
  DateTime.fromISO(date, { zone }).set({ hour, minute }).toFormat("yyyy-MM-dd'T'HH:mm");

const nextWeekday = (weekday: number, extraWeeks = 0) => {
  const daysAhead = (weekday - runDay.weekday + 7) % 7 || 7;
  return runDay.plus({ days: daysAhead + extraWeeks * 7 });
};

const exactMessage = (dateAndTime: string) =>
  `Please book Package 2 ${dateAndTime}, name Morgan.`;

const numericClockInputs: Array<[string, number, number]> = [
  ["at 9am", 9, 0],
  ["at 09:00am", 9, 0],
  ["at 10am", 10, 0],
  ["at 10:15am", 10, 15],
  ["at 10:30am", 10, 30],
  ["at 10:45am", 10, 45],
  ["at 11am", 11, 0],
  ["at 11:15 am", 11, 15],
  ["at 11:30 am", 11, 30],
  ["at 11:45 am", 11, 45],
  ["at 12pm", 12, 0],
  ["at 12:15pm", 12, 15],
  ["at 1pm", 13, 0],
  ["at 1:15pm", 13, 15],
  ["at 2 pm", 14, 0],
  ["at 2:30 pm", 14, 30],
  ["at 3pm", 15, 0],
  ["at 3:45pm", 15, 45],
  ["at 4pm", 16, 0],
  ["at 5:15pm", 17, 15],
  ["at 6pm", 18, 0],
  ["at 7pm", 19, 0],
  ["at 8pm", 20, 0],
  ["at 12am", 0, 0],
  ["at 00:00", 0, 0],
  ["at 09:30", 9, 30],
  ["at 10:05", 10, 5],
  ["at 12:00", 12, 0],
  ["at 13:15", 13, 15],
  ["at 14:30", 14, 30],
  ["at 16:45", 16, 45],
  ["at 19:00", 19, 0],
  ["at 23:15", 23, 15],
  ["at 10.30am", 10, 30],
  ["at 2.15pm", 14, 15],
  ["at 14.30", 14, 30],
  ["at 1430", 14, 30],
  ["at 0930", 9, 30],
  ["at 2 in the afternoon", 14, 0],
  ["at 10 in the morning", 10, 0],
];

const numericClockScenarios: Scenario[] = numericClockInputs.map(([phrase, hour, minute]) => ({
  category: "numeric clock",
  label: phrase,
  message: exactMessage(`on 18 November 2030 ${phrase}`),
  expectedLocal: local(fixedDay, hour, minute),
}));

const spokenClockInputs: Array<[string, number, number]> = [
  ["at half ten", 10, 30],
  ["at half past ten", 10, 30],
  ["at quarter past ten", 10, 15],
  ["at quarter to eleven", 10, 45],
  ["at five past ten", 10, 5],
  ["at ten past ten", 10, 10],
  ["at twenty past ten", 10, 20],
  ["at twenty-five past ten", 10, 25],
  ["at five to eleven", 10, 55],
  ["at ten to eleven", 10, 50],
  ["at twenty to eleven", 10, 40],
  ["at twenty-five to eleven", 10, 35],
  ["at half two", 14, 30],
  ["at half past two", 14, 30],
  ["at quarter past two", 14, 15],
  ["at quarter to three", 14, 45],
  ["at five past two", 14, 5],
  ["at ten past two", 14, 10],
  ["at twenty past two", 14, 20],
  ["at twenty-five past two", 14, 25],
  ["at five to three", 14, 55],
  ["at ten to three", 14, 50],
  ["at twenty to three", 14, 40],
  ["at twenty-five to three", 14, 35],
  ["at one o'clock", 13, 0],
  ["at two o'clock", 14, 0],
  ["at six o'clock", 18, 0],
  ["at eight o'clock", 8, 0],
  ["at ten o'clock", 10, 0],
  ["at twelve o'clock", 12, 0],
  ["at ten thirty", 10, 30],
  ["at two thirty", 14, 30],
  ["at six thirty", 18, 30],
  ["at eight thirty", 8, 30],
  ["at two fifteen", 14, 15],
  ["at ten fifteen", 10, 15],
  ["at two forty-five", 14, 45],
  ["at ten forty-five", 10, 45],
  ["at half-past two", 14, 30],
  ["at quarter-to-three", 14, 45],
  ["at a quarter past two", 14, 15],
  ["at a quarter to three", 14, 45],
  ["at half 2", 14, 30],
  ["at quarter past 2", 14, 15],
  ["at quarter to 3", 14, 45],
  ["at oh nine thirty", 9, 30],
  ["at ten oh five", 10, 5],
  ["at fourteen thirty", 14, 30],
  ["at nineteen hundred", 19, 0],
  ["at twenty hundred", 20, 0],
];

const spokenClockScenarios: Scenario[] = spokenClockInputs.map(([phrase, hour, minute]) => ({
  category: "spoken clock",
  label: phrase,
  message: exactMessage(`on 18 November 2030 ${phrase}`),
  expectedLocal: local(fixedDay, hour, minute),
}));

const explicitDateInputs: Array<[string, string]> = [
  ["on 18 November 2030", "2030-11-18"],
  ["on 18th November 2030", "2030-11-18"],
  ["on the 18th of November 2030", "2030-11-18"],
  ["on 18 Nov 2030", "2030-11-18"],
  ["on 18/11/2030", "2030-11-18"],
  ["on 18/11/30", "2030-11-18"],
  ["on 18-11-2030", "2030-11-18"],
  ["on 18.11.2030", "2030-11-18"],
  ["on 2030-11-18", "2030-11-18"],
  ["on Monday 18 November 2030", "2030-11-18"],
  ["on 1 September 2030", "2030-09-01"],
  ["on 1st September 2030", "2030-09-01"],
  ["on the 1st of September 2030", "2030-09-01"],
  ["on 01/09/2030", "2030-09-01"],
  ["on 2030-09-01", "2030-09-01"],
  ["on 5 October 2030", "2030-10-05"],
  ["on 5th October 2030", "2030-10-05"],
  ["on 05/10/2030", "2030-10-05"],
  ["on 2030-10-05", "2030-10-05"],
  ["on 24 December 2030", "2030-12-24"],
  ["on 24th December 2030", "2030-12-24"],
  ["on 24/12/2030", "2030-12-24"],
  ["on 2030-12-24", "2030-12-24"],
  ["on 2 January 2031", "2031-01-02"],
  ["on 2nd January 2031", "2031-01-02"],
  ["on 02/01/2031", "2031-01-02"],
  ["on 2031-01-02", "2031-01-02"],
  ["on 28 February 2031", "2031-02-28"],
  ["on 28/02/2031", "2031-02-28"],
  ["on 2031-02-28", "2031-02-28"],
];

const explicitDateScenarios: Scenario[] = explicitDateInputs.map(([phrase, date]) => ({
  category: "date wording",
  label: phrase,
  message: exactMessage(`${phrase} at 2:30pm`),
  expectedLocal: local(date, 14, 30),
}));

const relativeDateInputs: Array<[string, DateTime]> = [
  ["today", runDay],
  ["tomorrow", runDay.plus({ days: 1 })],
  ["the day after tomorrow", runDay.plus({ days: 2 })],
  ["a week tomorrow", runDay.plus({ days: 8 })],
  ["in a week", runDay.plus({ days: 7 })],
  ["in a fortnight", runDay.plus({ days: 14 })],
  ["this coming Monday", nextWeekday(1)],
  ["Monday coming", nextWeekday(1)],
  ["this Monday", nextWeekday(1)],
  ["next Monday", nextWeekday(1)],
  ["next Tue", nextWeekday(2)],
  ["next Tues", nextWeekday(2)],
  ["next Wednesday", nextWeekday(3)],
  ["next Wed", nextWeekday(3)],
  ["next Thursday", nextWeekday(4)],
  ["next Thurs", nextWeekday(4)],
  ["next Friday", nextWeekday(5)],
  ["next Fri", nextWeekday(5)],
  ["next Saturday", nextWeekday(6)],
  ["next Sat", nextWeekday(6)],
  ["next Sunday", nextWeekday(7)],
  ["next Sun", nextWeekday(7)],
  ["a week on Monday", nextWeekday(1, 1)],
  ["Monday week", nextWeekday(1, 1)],
  ["Monday fortnight", nextWeekday(1, 2)],
  ["a fortnight on Monday", nextWeekday(1, 2)],
  ["a week on Wednesday", nextWeekday(3, 1)],
  ["Wednesday week", nextWeekday(3, 1)],
  ["Wednesday fortnight", nextWeekday(3, 2)],
  ["a fortnight on Wednesday", nextWeekday(3, 2)],
];

const relativeDateScenarios: Scenario[] = relativeDateInputs.map(([phrase, date]) => ({
  category: "date wording",
  label: phrase,
  message: exactMessage(`${phrase} at 2:30pm`),
  expectedLocal: local(date.toISODate()!, 14, 30),
}));

const vagueInputs = [
  "tomorrow morning",
  "tomorrow afternoon",
  "tomorrow evening",
  "next Monday morning",
  "next Tuesday afternoon",
  "next Wednesday evening",
  "next Thursday at lunchtime",
  "next Friday at tea time",
  "next Saturday first thing",
  "next Monday after work",
  "next Tuesday late morning",
  "next Wednesday mid-morning",
  "next Thursday early afternoon",
  "next Friday late afternoon",
  "next Saturday early evening",
  "sometime tomorrow",
  "whenever tomorrow",
  "any time next Monday",
  "in the next available slot",
  "as soon as possible",
  "around 2pm next Monday",
  "about 2pm next Monday",
  "roughly 2pm next Monday",
  "approximately 2pm next Monday",
  "2pm-ish next Monday",
  "2-ish next Monday",
  "around half two next Monday",
  "half two-ish next Monday",
  "just after 2pm next Monday",
  "a little after 2pm next Monday",
  "just before 3pm next Monday",
  "a little before 3pm next Monday",
  "before noon next Monday",
  "after noon next Monday",
  "before 2pm next Monday",
  "after 2pm next Monday",
  "between 2pm and 3pm next Monday",
  "any time from 2pm next Monday",
  "any time until 3pm next Monday",
  "by 2pm next Monday",
  "no later than 2pm next Monday",
  "not 2pm, maybe 3pm next Monday",
  "either 2pm or 3pm next Monday",
  "on 2030-11-18 at 25:00",
  "on 2030-11-18 at 13:75",
  "at 2pm",
  "next Monday",
  "on 31 February 2030 at 2pm",
  "on 31/02/2030 at 2pm",
  "when you open next Monday",
] as const;

const vagueScenarios: Scenario[] = vagueInputs.map((phrase) => ({
  category: "vague or invalid",
  label: phrase,
  message: exactMessage(phrase),
  expectedLocal: null,
}));

const scenarios: Scenario[] = [
  ...numericClockScenarios,
  ...spokenClockScenarios,
  ...explicitDateScenarios,
  ...relativeDateScenarios,
  ...vagueScenarios,
];

if (scenarios.length !== 200) throw new Error(`Expected 200 UK time scenarios, got ${scenarios.length}`);
if (!config.openai.apiKey || !config.openai.baseUrl) {
  throw new Error("OPENAI_API_KEY and OPENAI_BASE_URL are required for the live UK time test");
}

const classifier = new OpenAiIntentClassifier();
const categories = [...new Set(scenarios.map((scenario) => scenario.category))];

console.log(`UK date/time test: ${scenarios.length} scenarios, model=${config.openai.model}, host=${new URL(config.openai.baseUrl).host}`);
console.log(`Reference day for relative expressions: ${runDay.toISODate()} (${zone})`);
console.log("The in-memory Calendar accepts every parsed time so this suite isolates language understanding.");
console.log("Twilio, WhatsApp, Supabase, Google Calendar, and Stripe network calls are disabled.\n");

async function runScenario(index: number): Promise<{ passed: boolean; category: Scenario["category"]; line: string }> {
  const scenario = scenarios[index]!;
  const store = new MemoryStore();
  const engine = new ConversationEngine(store, classifier, new AcceptingCalendar(), new UnusedCheckout(), new SilentSender());
  const waId = `uk-time-${index + 1}`;
  const errors: string[] = [];

  const reply = await engine.handleMessage({ id: `${waId}-1`, from: waId, text: scenario.message }) ?? "";
  const conversation = await store.getConversation(waId);
  const actualLocal = conversation?.requestedStart
    ? DateTime.fromISO(conversation.requestedStart, { setZone: true }).setZone(zone).toFormat("yyyy-MM-dd'T'HH:mm")
    : null;

  if (actualLocal !== scenario.expectedLocal) {
    errors.push(`time=${actualLocal ?? "none"}, expected=${scenario.expectedLocal ?? "none"}`);
  }
  const expectedState = scenario.expectedLocal ? "awaiting_policy" : "awaiting_datetime";
  if (conversation?.state !== expectedState) {
    errors.push(`state=${conversation?.state ?? "missing"}, expected=${expectedState}`);
  }
  if (conversation?.packageId !== "package_2") errors.push(`package=${conversation?.packageId ?? "none"}, expected=package_2`);
  if (conversation?.customerName?.toLowerCase() !== "morgan") errors.push(`name=${conversation?.customerName ?? "none"}, expected=Morgan`);
  if (scenario.expectedLocal === null && /slot .* is available/i.test(reply)) errors.push("reply confirmed an exact slot for a vague time");

  const prefix = errors.length ? "FAIL" : "PASS";
  return {
    passed: errors.length === 0,
    category: scenario.category,
    line: `${prefix} ${String(index + 1).padStart(3, "0")} [${scenario.category}] ${scenario.label}${errors.length ? `: ${errors.join("; ")}` : ""}`,
  };
}

const results = new Array<Awaited<ReturnType<typeof runScenario>>>(scenarios.length);
let nextIndex = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (nextIndex < scenarios.length) {
    const index = nextIndex++;
    results[index] = await runScenario(index);
  }
}));

for (const result of results) console.log(result.line);
console.log("\nCategory results:");
for (const category of categories) {
  const categoryResults = results.filter((result) => result.category === category);
  const passed = categoryResults.filter((result) => result.passed).length;
  console.log(`- ${category}: ${passed}/${categoryResults.length}`);
}

const passed = results.filter((result) => result.passed).length;
console.log(`\nResult: ${passed}/${scenarios.length} scenarios passed.`);
if (passed !== scenarios.length) process.exitCode = 1;
