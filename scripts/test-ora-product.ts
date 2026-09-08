import { ConversationEngine } from "../src/conversation.js";
import {
  ORA_BOOKING_MESSAGE,
  ORA_INFO_MESSAGE,
  ORA_INTEGRATION_MESSAGE,
  ORA_KNOWLEDGE_MESSAGE,
  ORA_PAYMENT_MESSAGE,
} from "../src/messages.js";
import { MemoryStore } from "../src/store.js";
import type { CalendarGateway } from "../src/calendar.js";
import type { Booking } from "../src/types.js";
import type { CheckoutGateway } from "../src/stripe.js";
import type { MessageSender } from "../src/whatsapp.js";

class NoNetworkCalendar implements CalendarGateway {
  async validateSlot() { throw new Error("Calendar must not be called by product enquiries"); }
  async findAlternatives() { throw new Error("Calendar must not be called by product enquiries"); }
  async createBookingEvent() { throw new Error("Calendar must not be called by product enquiries"); }
}

class NoNetworkCheckout implements CheckoutGateway {
  async createCheckout(_booking: Booking) { throw new Error("Checkout must not be called by product enquiries"); }
}

class NoNetworkSender implements MessageSender {
  async sendText() { throw new Error("WhatsApp must not be called by product enquiries"); }
}

const ukStyles = [
  ["neutral", (text: string) => `${text}?`],
  ["polite", (text: string) => `${text}, please?`],
  ["very polite", (text: string) => `Would you mind explaining: ${text.toLowerCase()}?`],
  ["hiya", (text: string) => `Hiya, ${text.toLowerCase()}?`],
  ["mate", (text: string) => `Alright mate, ${text.toLowerCase()}?`],
  ["cheers", (text: string) => `Cheers, ${text.toLowerCase()}?`],
  ["quick one", (text: string) => `Quick one — ${text.toLowerCase()}?`],
  ["just wondering", (text: string) => `Just wondering, ${text.toLowerCase()}?`],
  ["having a look", (text: string) => `I'm having a look round; ${text.toLowerCase()}?`],
  ["crack on", (text: string) => `Before I crack on, ${text.toLowerCase()}?`],
  ["lowdown", (text: string) => `Can you give me the lowdown: ${text.toLowerCase()}?`],
  ["what's the score", (text: string) => `What's the score — ${text.toLowerCase()}?`],
  ["this lot", (text: string) => `How does this lot work — ${text.toLowerCase()}?`],
  ["keen", (text: string) => `I'm keen to know: ${text.toLowerCase()}?`],
  ["not being funny", (text: string) => `Not being funny, but ${text.toLowerCase()}?`],
  ["no faff", (text: string) => `No faff please — ${text.toLowerCase()}?`],
  ["plain English", (text: string) => `In plain English, ${text.toLowerCase()}?`],
  ["UK business", (text: string) => `For a UK business, ${text.toLowerCase()}?`],
  ["our lot", (text: string) => `For our lot, ${text.toLowerCase()}?`],
  ["weighing it up", (text: string) => `We're weighing it up — ${text.toLowerCase()}?`],
  ["proper curious", (text: string) => `I'm proper curious — ${text.toLowerCase()}?`],
  ["give us the gist", (text: string) => `Give us the gist: ${text.toLowerCase()}?`],
  ["run me through it", (text: string) => `Can you run me through this: ${text.toLowerCase()}?`],
  ["right then", (text: string) => `Right then, ${text.toLowerCase()}?`],
  ["aye", (text: string) => `Aye, ${text.toLowerCase()}?`],
] as const;

const groups = [
  {
    name: "general capability",
    expected: ORA_INFO_MESSAGE,
    starts: [
      "What can ORA do",
      "How can ORA help",
      "What does this assistant handle",
      "Could you explain ORA",
      "What is this AI assistant able to do",
      "How would ORA support us",
      "What does your assistant offer",
      "Can you introduce this assistant",
    ],
  },
  {
    name: "business knowledge",
    expected: ORA_KNOWLEDGE_MESSAGE,
    starts: [
      "What product information can ORA answer",
      "How does ORA learn our services",
      "Can ORA explain our prices",
      "What business knowledge can it use",
      "Could it answer catalogue questions",
      "How does it handle customer FAQs",
      "Can it compare products",
      "Will it know our policies",
    ],
  },
  {
    name: "booking and calendar",
    expected: ORA_BOOKING_MESSAGE,
    starts: [
      "Can ORA manage bookings",
      "How does the booking flow work",
      "Will it check calendar availability",
      "Can customers arrange appointments",
      "How are bookings confirmed",
      "Does it offer available appointment times",
      "Can it record a confirmed booking",
      "What can it do with our calendar",
    ],
  },
  {
    name: "payment",
    expected: ORA_PAYMENT_MESSAGE,
    starts: [
      "How does ORA take payments",
      "Can it send a payment link",
      "What happens during checkout",
      "Does it support a deposit",
      "Can a customer pay through ORA",
      "How does the test payment work",
      "Will it continue after payment",
      "Is Stripe used for payments",
    ],
  },
  {
    name: "integration",
    expected: ORA_INTEGRATION_MESSAGE,
    starts: [
      "Can ORA integrate with our tools",
      "How does it connect to other software",
      "Does ORA have API integrations",
      "Can it connect with our CRM",
      "What systems can ORA integrate with",
      "Will it work with existing business software",
      "How are third-party integrations configured",
      "Can ORA connect to our current system",
    ],
  },
];

const scenarios = groups.flatMap((group) => group.starts.flatMap((start) =>
  ukStyles.map(([style, format]) => ({ label: group.name, style, text: format(start), expected: group.expected })),
));

if (scenarios.length !== 1000) throw new Error(`Expected 1000 ORA product scenarios, got ${scenarios.length}`);

let modelCalls = 0;
const failures: string[] = [];
let failedScenarios = 0;

for (const [index, scenario] of scenarios.entries()) {
  const store = new MemoryStore();
  const engine = new ConversationEngine(store, {
    async classify() {
      modelCalls += 1;
      throw new Error("The ORA product showcase must not call the Clinic classifier");
    },
  }, new NoNetworkCalendar(), new NoNetworkCheckout(), new NoNetworkSender(), false);
  const waId = `ora-product-${index + 1}`;
  const failureCountBefore = failures.length;

  try {
    const reply = await engine.handleMessage({ id: `${waId}-1`, from: waId, text: scenario.text });
    const conversation = await store.getConversation(waId);
    if (reply !== scenario.expected) failures.push(`${index + 1}: ${scenario.label}/${scenario.style}: wrong reply for “${scenario.text}”`);
    if (/clinic|treatment|package/i.test(reply ?? "")) failures.push(`${index + 1}: ${scenario.label}: exposed Clinic copy`);
    if (conversation?.state !== "new") failures.push(`${index + 1}: ${scenario.label}: state=${conversation?.state ?? "missing"}`);
    if (store.bookings.size) failures.push(`${index + 1}: ${scenario.label}: created a booking`);
    if (store.handoffs.length) failures.push(`${index + 1}: ${scenario.label}: created a handoff`);
  } catch (error) {
    failures.push(`${index + 1}: ${scenario.label}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (failures.length > failureCountBefore) failedScenarios += 1;
}

console.log(`ORA product-enquiry test: ${scenarios.length - failedScenarios}/${scenarios.length} passed`);
for (const group of groups) console.log(`- ${group.name}: 200 scenarios`);
console.log(`- UK registers and slang styles: ${ukStyles.length}`);
console.log(`- AI model calls: ${modelCalls}`);
console.log("- WhatsApp, Supabase, Calendar and Stripe network calls: 0");

if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
}
