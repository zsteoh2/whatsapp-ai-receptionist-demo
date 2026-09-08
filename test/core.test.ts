import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import { createServer } from "node:http";
import test from "node:test";
import { DateTime } from "luxon";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";
import type { AuthVerifier } from "../src/auth.js";
import { validateBusinessSlot, type CalendarGateway } from "../src/calendar.js";
import { packageMentions, parsePackage } from "../src/clinic.js";
import { ConversationEngine } from "../src/conversation.js";
import { FAQS, matchFaq } from "../src/faq.js";
import type { IntentClassifier, LlmDecision } from "../src/llm.js";
import { OpenAiIntentClassifier } from "../src/llm.js";
import {
  CALLBACK_REQUEST_MESSAGE, CLEANER_TEMPLATE_PENDING_MESSAGE, CLEANER_WELCOME_MESSAGE, EMERGENCY_MESSAGE, FOUNDER_CTA_MESSAGE, GENERAL_HANDOVER_MESSAGE, INTEGRATION_FAILURE_MESSAGE,
  MEDICAL_HANDOVER_MESSAGE, ORA_BOOKING_MESSAGE, ORA_DEMO_CLOSING_MESSAGE, ORA_DEMO_POLICY_MESSAGE, ORA_DEMO_START_MESSAGE, ORA_INFO_MESSAGE, ORA_INTEGRATION_MESSAGE, ORA_KNOWLEDGE_MESSAGE,
  ORA_PAYMENT_MESSAGE, ORA_TEMPLATE_PENDING_MESSAGE, UNKNOWN_HELP_MESSAGE,
  WELCOME_MESSAGE,
} from "../src/messages.js";
import { detectSafety } from "../src/safety.js";
import { parseOraDecision, type OraDecision } from "../src/ora.js";
import { MemoryStore } from "../src/store.js";
import type { CheckoutGateway } from "../src/stripe.js";
import type { Booking, PackageId } from "../src/types.js";
import {
  extractIncomingMessages, extractTwilioIncomingMessage, verifyMetaSignature,
  twilioErrorCode, twimlResponse, verifyTwilioSignature, type MessageSender,
} from "../src/whatsapp.js";

test("ORA SDK uses the dedicated schema and validates provider output", async () => {
  let output: unknown = { action: "question", topic: "journey", customerName: null, handover: "none" };
  const requests: { messages: { content: string }[]; response_format: { json_schema: { name: string } } }[] = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    requests.push(JSON.parse(body));
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(output) } }] }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const classifier = new OpenAiIntentClassifier("offline-test-key", `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`);
    assert.equal((await classifier.classifyOra("So demo?", { state: "awaiting_name", concernCategory: "ora:journey" })).topic, "journey");
    assert.equal(requests[0]?.response_format.json_schema.name, "ora_message_decision");
    assert.match(requests[0]?.messages[0]?.content ?? "", /awaiting_name/);
    assert.match(requests[0]?.messages[0]?.content ?? "", /ora:journey/);
    assert.equal(requests[0]?.messages[1]?.content, "So demo?");
    output = { action: "confirm_payment", topic: null, customerName: null, handover: "none" };
    await assert.rejects(classifier.classifyOra("Confirm it", { state: "awaiting_payment" }), /Invalid ORA decision/);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test("ORA semantic decisions preserve context and cannot bypass booking validation", async () => {
  const store = new MemoryStore();
  const calendar = new FakeCalendar();
  let decision: OraDecision = { action: "question", topic: "journey", customerName: null, handover: "none" };
  let calls = 0;
  let fail = false;
  const contexts: unknown[] = [];
  const engine = new ConversationEngine(store, {
    async classify() { throw new Error("Clinic must not run"); },
    async classifyOra(_text, context) {
      calls++; contexts.push(structuredClone(context));
      if (fail) throw new Error("model unavailable");
      return decision;
    },
  }, calendar, new FakeCheckout(), new FakeSender(), false);
  let id = 0;
  const send = (text: string) => engine.handleMessage({ id: `semantic-${++id}`, from: "semantic", text });
  decision = { ...decision, action: "status", topic: null };
  assert.match(await send("Confirm my appointment") ?? "", /find an active test booking/);
  assert.equal((await store.getConversation("semantic"))?.state, "new");
  assert.equal(store.bookings.size, 0);
  calls = 0;
  decision = { ...decision, action: "question", topic: "journey" };
  await send("START DEMO");
  await send("General question");
  assert.match(await send("Yea, so how the whole process run?") ?? "", /Collect the booking details/);
  assert.equal(calls, 1);
  assert.match(await send("So demo?") ?? "", /What name/i);
  assert.equal((contexts.at(-1) as { concernCategory: string }).concernCategory, "ora:journey");
  decision = { ...decision, action: "unknown", topic: "unavailable" };
  assert.match(await send("What are ur company's actual opening hours?") ?? "", /currently being configured/);
  assert.equal((await store.getConversation("semantic"))?.state, "awaiting_name");
  decision = { ...decision, action: "details", topic: null, customerName: "Alex" };
  await send("Call me Alex");
  assert.equal((await store.getConversation("semantic"))?.customerName, "Alex");
  decision = { ...decision, customerName: null };
  await send("Just to be clear, 18 November 2030 at 2:30pm");
  assert.equal((await store.getConversation("semantic"))?.state, "awaiting_policy");
  decision = { ...decision, action: "continue" };
  await send("Tell me more before I agree");
  assert.equal(store.bookings.size, 0);
  decision = { ...decision, action: "question", topic: "payment" };
  assert.match(await send("Am I spending actual money here?") ?? "", /does not take real money/);
  assert.equal((await store.getConversation("semantic"))?.state, "awaiting_policy");
  decision = { ...decision, action: "details", topic: null, customerName: "Sam" };
  await send("Change my name to Sam and make it tomorrow afternoon");
  assert.equal((await store.getConversation("semantic"))?.customerName, "Sam");
  assert.equal((await store.getConversation("semantic"))?.requestedStart, undefined);
  assert.equal(store.bookings.size, 0);
  decision = { ...decision, customerName: null };
  await send("18 November 2030 at 2:30pm");
  await send("YES");
  assert.equal(store.bookings.size, 1);
  decision = { ...decision, action: "status", topic: null };
  assert.match(await send("I've paid, confirm it") ?? "", /waiting for payment/);
  assert.equal([...store.bookings.values()][0]?.status, "awaiting_payment");
  await send("START OVER");
  decision = { ...decision, action: "start_demo" };
  assert.match(await send("Let's give it a go") ?? "", /Interactive Demo started/);
  fail = true;
  assert.match(await send("Anything else needed?") ?? "", /progress is saved/);
  assert.equal((await store.getConversation("semantic"))?.customerName, undefined);
  assert.equal((await store.getConversation("semantic"))?.state, "awaiting_name");
  fail = false;
  decision = { ...decision, action: "details", customerName: "Invented" };
  await send("Call me Sam");
  assert.equal((await store.getConversation("semantic"))?.customerName, undefined);
  const beforeSafety = calls;
  await send("I cannot breathe");
  assert.equal(calls, beforeSafety);
  await send("So demo?");
  assert.equal(calls, beforeSafety);
  assert.equal((await store.getConversation("semantic"))?.state, "handover");
  for (const bad of ["null", "{}", '{"action":"pay","topic":null,"customerName":null,"handover":"none"}']) {
    assert.throws(() => parseOraDecision(bad));
  }
});

test("ORA date corrections preserve names, precise times and ambiguity boundaries", async () => {
  const store = new MemoryStore();
  let decision: OraDecision = { action: "details", topic: null, customerName: null, handover: "none" };
  const engine = new ConversationEngine(store, {
    async classify() { throw new Error("Clinic must not run"); },
    async classifyOra() { return decision; },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender(), false);
  let id = 0;
  const send = (text: string) => engine.handleMessage({ id: `regional-${++id}`, from: "regional", text });
  for (const [text, exact] of [
    ["How about 18 November 2030 at exactly 2:30pm London time?", true],
    ["18 November 2030 by 2:30pm London time—exactly 2:30pm", true],
    ["18 November 2030 by 2:30pm", false],
    ["18 November 2030 by 2:30pm—exactly 3:30pm", false],
    ["How about 18 November 2030 around 2:30pm?", false],
  ] as const) {
    await store.saveConversation({ waId: "regional", state: "awaiting_datetime", packageId: "ora_demo", customerName: "Alex", updatedAt: new Date().toISOString() });
    await send(text);
    const after = await store.getConversation("regional");
    assert.equal(after?.state, exact ? "awaiting_policy" : "awaiting_datetime", text);
    assert.equal(after?.requestedStart, exact ? "2030-11-18T14:30:00.000Z" : undefined, text);
  }
  await send("18 November 2030 at 2:30pm");
  decision = { ...decision, customerName: "Casey Jean Taylor" };
  await send("May I request the booking name be changed to Casey Jean Taylor, with all other details left as they are?");
  assert.equal((await store.getConversation("regional"))?.state, "awaiting_policy");
  assert.equal((await store.getConversation("regional"))?.requestedStart, "2030-11-18T14:30:00.000Z");
  await send("May I use Casey Jean Taylor and move the booking to May next year?");
  assert.equal((await store.getConversation("regional"))?.requestedStart, undefined);
  assert.equal(store.bookings.size, 0);
});

test("general questions preserve demo progress and process questions explain the journey", async () => {
  const store = new MemoryStore();
  let classifierCalls = 0;
  const engine = new ConversationEngine(store, {
    async classify() { classifierCalls++; return llmDecision({}); },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender(), false);
  let id = 0;
  const send = (text: string) => engine.handleMessage({ id: `process-${++id}`, from: "process-user", text });
  await send("START DEMO");
  await send("General question");
  assert.equal((await store.getConversation("process-user"))?.state, "awaiting_name");
  for (const question of ["Yea, so how the whole process run?", "How does it work?", "Can you walk me through the steps?", "So demo?"]) {
    const reply = await send(question);
    assert.match(reply ?? "", /Collect the booking details/);
    assert.match(reply ?? "", /What name/i);
    assert.equal((await store.getConversation("process-user"))?.customerName, undefined);
  }
  await send("Alex Demo");
  assert.equal((await store.getConversation("process-user"))?.state, "awaiting_datetime");
  await send("General question");
  assert.match(await send("Explain the process") ?? "", /What date and time/i);
  assert.equal((await store.getConversation("process-user"))?.customerName, "Alex Demo");
  await send("18 November 2030 at 2:30pm");
  assert.equal((await store.getConversation("process-user"))?.state, "awaiting_policy");
  await send("General question");
  const policyReply = await send("How does this demo work?");
  assert.match(policyReply ?? "", /Reply YES/);
  assert.doesNotMatch(policyReply ?? "", /clinic|48 hours/i);
  await send("YES");
  assert.equal((await store.getConversation("process-user"))?.state, "awaiting_payment");
  const bookingId = (await store.getConversation("process-user"))?.bookingId;
  await send("General question");
  assert.match(await send("How does the process work?") ?? "", /waiting for payment/);
  assert.equal((await store.getConversation("process-user"))?.bookingId, bookingId);
  await send("callback");
  assert.equal(await send("General question"), GENERAL_HANDOVER_MESSAGE);
  assert.equal((await store.getConversation("process-user"))?.state, "handover");
  await send("START OVER");
  assert.match(await send("Yea, so how the whole process run?") ?? "", /Reply START DEMO/);
  assert.equal((await store.getConversation("process-user"))?.packageId, undefined);
  await store.saveConversation({ waId: "process-user", state: "clarifying_twice", packageId: "ora_demo", updatedAt: new Date().toISOString() });
  assert.match(await send("So demo?") ?? "", /What name/i);
  assert.equal((await store.getConversation("process-user"))?.state, "awaiting_name");
  assert.equal(classifierCalls, 0);
});

test("all 20 approved FAQ questions match their fixed answers", () => {
  assert.equal(FAQS.length, 20);
  for (const faq of FAQS) {
    const matched = matchFaq(faq.question);
    assert.equal(matched?.id, faq.id, faq.question);
    assert.equal(matched?.answer, faq.answer);
  }
  assert.equal(matchFaq("gotta pay upfront or wat")?.id, 7);
  assert.equal(matchFaq("what times are you open?")?.id, 10);
  assert.equal(matchFaq("can I move my appointment")?.id, 13);
  assert.equal(matchFaq("How much does each one cost?")?.id, 5);
  assert.equal(matchFaq("How long am I in for?")?.id, 6);
  assert.equal(matchFaq("Can I shift my appointment?")?.id, 13);
  assert.equal(matchFaq("What's package one then?")?.id, 2);
  assert.equal(matchFaq("What comes with package two?")?.id, 3);
  assert.equal(matchFaq("Do I need to put any money down?")?.id, 7);
  assert.equal(matchFaq("Do I have to leave a booking fee?")?.id, 7);
  assert.equal(matchFaq("Skin package details please")?.id, 3);
  assert.equal(matchFaq("Tell me about your Botox consultation")?.id, 4);
  assert.equal(matchFaq("How dear is the skin one?")?.id, 5);
  assert.equal(matchFaq("Can I move it to another day?")?.id, 13);
  assert.equal(matchFaq("How long does the hair one take?")?.id, 6);
  assert.equal(matchFaq("What cards do you take?")?.id, 8);
  assert.equal(matchFaq("How long do the effects stick around?")?.id, 18);
  assert.equal(matchFaq("Ask about a product or service")?.id, 1);
});

test("safety rules distinguish general information from personal medical and emergency messages", () => {
  assert.equal(detectSafety("Give me an explanation: how does ORA hand over to a human?"), undefined);
  assert.equal(detectSafety("How does the human handover thing work, then?"), undefined);
  assert.equal(detectSafety("Would you mind explaining how the option to hand over to a human works?"), undefined);
  assert.equal(detectSafety("18 November 2030 at 2:30pm London time seems suitable for me"), undefined);
  assert.equal(detectSafety("Is this treatment time suitable for me? I take medication"), "medical");
  assert.equal(detectSafety("I am breastfeeding; no emergency, is this treatment suitable for me?"), "medical");
  assert.equal(detectSafety("No emergency, but I cannot breathe"), "emergency");
  assert.equal(detectSafety("How does human escalation work as a feature?"), undefined);
  assert.equal(detectSafety("Can a business set up human follow-up?"), undefined);
  assert.equal(detectSafety("Does ORA know when human judgement is needed?"), undefined);
  assert.equal(detectSafety("Can I speak to a human about this business?"), "general");
  assert.equal(detectSafety("How does human escalation work? I cannot breathe"), "emergency");
  assert.equal(detectSafety("Does ORA handle a refund complaint with human escalation?"), "general");
  assert.equal(detectSafety("Are there risks or side effects?"), undefined);
  assert.equal(detectSafety("I am experiencing side effects after my treatment"), "medical");
  assert.equal(detectSafety("my face is swelling after treatment"), "medical");
  assert.equal(detectSafety("my face blew up after botox what do i do"), "medical");
  assert.equal(detectSafety("I am pregnant and take medication"), "medical");
  assert.equal(detectSafety("pregnant and thinking about p3"), "medical");
  assert.equal(detectSafety("breastfeeding and want skin treatment"), "medical");
  assert.equal(detectSafety("allergic to something, can I still book?"), "medical");
  assert.equal(detectSafety("im preggers can i do p3"), "medical");
  assert.equal(detectSafety("im on blood thinners and want botox"), "medical");
  assert.equal(detectSafety("I'm 17 and want Package 3"), "medical");
  assert.equal(detectSafety("I'm fourteen and want Package 3"), "medical");
  assert.equal(detectSafety("my son is 15 can he book botox"), "medical");
  assert.equal(detectSafety("my daughter is fourteen and wants skin treatment"), "medical");
  assert.equal(detectSafety("my niece is sixteen and wants a skin consultation"), "medical");
  assert.equal(detectSafety("my wee lad is fourteen"), "medical");
  assert.equal(detectSafety("I am 72 and want Package 2"), undefined);
  assert.equal(detectSafety("I'm 81 and want Package 1"), undefined);
  assert.equal(detectSafety("botox safe if im on warfarin?"), "medical");
  assert.equal(detectSafety("I'm on tablets; is Botox alright for me?"), "medical");
  assert.equal(detectSafety("I have diabetes; can I have the skin treatment?"), "medical");
  assert.equal(detectSafety("I had surgery recently; can I have a treatment?"), "medical");
  assert.equal(detectSafety("I had a bad reaction last time; is it safe to try again?"), "medical");
  assert.equal(detectSafety("I've got a bad headache after my treatment"), "medical");
  assert.equal(detectSafety("my scalp is really flaky lately"), "medical");
  assert.equal(detectSafety("my lips and tongue are swelling quickly"), "emergency");
  assert.equal(detectSafety("I'm expecting and thinking about the wrinkle package"), "medical");
  assert.equal(detectSafety("I cannot breathe and this is an emergency"), "emergency");
  assert.equal(detectSafety("My chest feels tight and it is hard to breathe."), "emergency");
  assert.equal(detectSafety("someone's blacked out after an injection"), "emergency");
  assert.equal(detectSafety("there's loads of blood and it won't stop"), "emergency");
  assert.equal(detectSafety("my face has puffed right up after the treatment"), "medical");
  assert.equal(detectSafety("I think I need A&E"), "emergency");
  assert.equal(detectSafety("I want a real person"), "general");
  assert.equal(detectSafety("My partner is forcing me to have this treatment."), "general");
  assert.equal(detectSafety("This went wrong and I'm suing the clinic."), "general");
  assert.equal(detectSafety("lemme talk to an actual person pls"), "general");
  assert.equal(detectSafety("I want my money back"), "general");
});

test("package parsing accepts shorthand but never selects between multiple mentions", () => {
  assert.equal(parsePackage("p2"), "package_2");
  assert.equal(parsePackage("Package two, not two appointments."), "package_2");
  assert.equal(parsePackage("forehead lines are annoying"), "package_3");
  assert.equal(parsePackage("hair fall"), "package_1");
  assert.equal(parsePackage("my hairline is creeping backwards"), "package_1");
  assert.equal(parsePackage("the hair around my temples is thinning"), "package_1");
  assert.equal(parsePackage("acne consultation"), "package_2");
  assert.equal(parsePackage("my skin tone looks really uneven"), "package_2");
  assert.equal(parsePackage("deep forehead creases"), "package_3");
  assert.equal(parsePackage("eleven lines between my brows"), "package_3");
  assert.deepEqual(packageMentions("hair or skin idk"), ["package_1", "package_2"]);
  assert.equal(parsePackage("hair or skin idk"), undefined);
});

test("business-slot rules enforce notice, opening hours, and duration", () => {
  const now = DateTime.fromISO("2026-08-27T09:00", { zone: "Europe/London" });
  assert.equal(validateBusinessSlot(DateTime.fromISO("2026-08-27T12:00", { zone: "Europe/London" }), 60, now), undefined);
  assert.match(validateBusinessSlot(DateTime.fromISO("2026-08-27T10:00", { zone: "Europe/London" }), 30, now) ?? "", /two hours/i);
  assert.match(validateBusinessSlot(DateTime.fromISO("2026-08-30T12:00", { zone: "Europe/London" }), 30, now) ?? "", /closed/i);
  assert.match(validateBusinessSlot(DateTime.fromISO("2026-08-28T15:30", { zone: "Europe/London" }), 60, now) ?? "", /outside/i);
});

const llmDecision = (patch: Partial<LlmDecision> = {}): LlmDecision => ({
  intent: "unknown", handover: "none", wantsBooking: false, faqId: null, packageId: null, customerName: null, localDateTime: null, ...patch,
});

class FakeClassifier implements IntentClassifier {
  async classify() { return llmDecision(); }
}

class FakeCalendar implements CalendarGateway {
  events: Booking[] = [];
  available = true;
  async validateSlot() { return this.available ? { valid: true } : { valid: false, reason: "That slot is already occupied." }; }
  async findAlternatives(_packageId: PackageId) { return ["2026-09-03T13:00:00.000Z"]; }
  async createBookingEvent(booking: Booking) { this.events.push(booking); return "calendar-event-1"; }
}

class FakeCheckout implements CheckoutGateway {
  async createCheckout(booking: Booking) { return { id: `cs_test_${booking.id}`, url: "https://checkout.stripe.test/session" }; }
}

class FakeSender implements MessageSender {
  sent: Array<{ to: string; text: string }> = [];
  async sendText(to: string, text: string) { this.sent.push({ to, text }); }
}

class FailingSender implements MessageSender {
  async sendText() { throw new Error("Twilio Trial blocked asynchronous Body send"); }
}

test("Supabase bearer auth protects administrative routes", async () => {
  const store = new MemoryStore();
  const sender = new FakeSender();
  const auth: AuthVerifier = {
    async getUser(token) {
      return token === "valid-token" ? { id: "user-1", email: "owner@example.test" } : undefined;
    },
  };
  const app = createApp({
    store,
    engine: new ConversationEngine(store, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), sender),
    sender,
    auth,
    storeMode: "memory",
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;

  try {
    assert.equal((await fetch(`${url}/api/me`)).status, 401);
    assert.equal((await fetch(`${url}/auth/google`)).status, 401);
    assert.equal((await fetch(`${url}/api/me`, { headers: { authorization: "Bearer invalid" } })).status, 401);
    const response = await fetch(`${url}/api/me`, { headers: { authorization: "Bearer valid-token" } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { id: "user-1", email: "owner@example.test" });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("booking flow creates test checkout then confirms exactly one calendar event", async () => {
  const store = new MemoryStore();
  const calendar = new FakeCalendar();
  const sender = new FakeSender();
  const engine = new ConversationEngine(store, new FakeClassifier(), calendar, new FakeCheckout(), sender);
  const send = (id: string, text: string) => engine.handleMessage({ id, from: "447700900001", text });

  const firstReply = await send("m1", "book") ?? "";
  assert.match(firstReply, /my name is ORA/i);
  assert.match(firstReply, /Which package/i);
  assert.match(await send("m2", "1") ?? "", /What name/i);
  assert.match(await send("m3", "Alice Demo") ?? "", /date and time/i);
  assert.match(await send("m4", "2026-09-02 14:30") ?? "", /Reply YES/i);
  assert.match(await send("m5", "YES") ?? "", /checkout\.stripe\.test/i);

  const booking = [...store.bookings.values()][0];
  assert.ok(booking);
  assert.equal(booking.status, "awaiting_payment");
  await engine.confirmPaidBooking(booking.id);
  assert.equal((await store.getBooking(booking.id))?.status, "confirmed");
  assert.equal(calendar.events.length, 1);
  assert.match(sender.sent[0]?.text ?? "", /confirmed/i);
  assert.match(sender.sent[0]?.text ?? "", /Speak with our Founder/i);

  await engine.confirmPaidBooking(booking.id);
  assert.equal(calendar.events.length, 1);
  assert.equal(sender.sent.length, 1);
  assert.equal(await send("m5", "YES"), undefined, "duplicate Meta message is ignored");
});

test("ORA presentation opens cleanly and callback requests reach the founder handoff", async () => {
  assert.match(WELCOME_MESSAGE, /my name is ORA/i);
  assert.match(WELCOME_MESSAGE, /• Ask what ORA can do/i);
  assert.match(WELCOME_MESSAGE, /• Explore enquiries and business knowledge/i);
  assert.match(WELCOME_MESSAGE, /• Explore bookings, payments and follow-up/i);
  assert.match(WELCOME_MESSAGE, /• Speak with our Founder/i);
  assert.match(FOUNDER_CTA_MESSAGE, /07955 506757/);
  assert.match(FOUNDER_CTA_MESSAGE, /hau@convertbydigital\.com/);

  const store = new MemoryStore();
  const engine = new ConversationEngine(store, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender());
  const reply = await engine.handleMessage({ id: "callback-1", from: "callback-user", text: "Could the owner call me back please?" });
  assert.equal(reply, CALLBACK_REQUEST_MESSAGE);
  assert.equal(store.handoffs[0]?.category, "general");
  assert.equal(store.handoffs[0]?.summary, "Customer requested a callback.");

  const urgentReply = await engine.handleMessage({ id: "callback-urgent", from: "callback-urgent", text: "I cannot breathe, call me back" });
  assert.equal(urgentReply, EMERGENCY_MESSAGE);
  assert.equal(store.handoffs[1]?.category, "emergency");

  const questionReply = await engine.handleMessage({ id: "question-1", from: "question-user", text: "General question" });
  assert.match(questionReply ?? "", /what would you like to know/i);
});

test("ORA-only mode keeps the clinic template offline", async () => {
  let classifierCalls = 0;
  const store = new MemoryStore();
  const engine = new ConversationEngine(store, {
    async classify() { classifierCalls += 1; return llmDecision({ intent: "book", wantsBooking: true, packageId: "package_3" }); },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender(), false);

  assert.doesNotMatch(WELCOME_MESSAGE, /clinic|hair|skin|wrinkle|package/i);
  assert.doesNotMatch(MEDICAL_HANDOVER_MESSAGE, /clinic/i);
  assert.equal(await engine.handleMessage({ id: "ora-off-1", from: "ora-off", text: "I want something for wrinkles" }), ORA_INFO_MESSAGE);
  assert.equal(await engine.handleMessage({ id: "ora-off-2", from: "ora-off", text: "Book an appointment" }), ORA_TEMPLATE_PENDING_MESSAGE);
  assert.equal(classifierCalls, 0);
  assert.equal((await store.getConversation("ora-off"))?.state, "new");

  assert.equal(await engine.handleMessage({ id: "ora-knowledge", from: "ora-knowledge", text: "What knowledge can this AI use?" }), ORA_KNOWLEDGE_MESSAGE);
  assert.equal(await engine.handleMessage({ id: "ora-products", from: "ora-products", text: "What products and services can you tell customers about?" }), ORA_KNOWLEDGE_MESSAGE);
  assert.match(ORA_KNOWLEDGE_MESSAGE, /Products and services — names, descriptions, prices and available options/i);
  assert.match(ORA_KNOWLEDGE_MESSAGE, /quote, booking, payment or human follow-up workflow/i);
  assert.match(ORA_KNOWLEDGE_MESSAGE, /does not invent missing products, prices or policies/i);
  assert.equal(await engine.handleMessage({ id: "ora-booking", from: "ora-booking", text: "Can ORA manage bookings and calendar availability?" }), ORA_BOOKING_MESSAGE);
  assert.equal(await engine.handleMessage({ id: "ora-payment", from: "ora-payment", text: "How does the payment flow work?" }), ORA_PAYMENT_MESSAGE);
  assert.match(ORA_PAYMENT_MESSAGE, /START DEMO/i);
  assert.equal(await engine.handleMessage({ id: "ora-integration", from: "ora-integration", text: "Can it integrate with our existing system?" }), ORA_INTEGRATION_MESSAGE);
  assert.equal(await engine.handleMessage({ id: "ora-closing", from: "ora-closing", text: "Thanks" }), ORA_DEMO_CLOSING_MESSAGE);
  assert.doesNotMatch([
    WELCOME_MESSAGE, ORA_INFO_MESSAGE, ORA_KNOWLEDGE_MESSAGE, ORA_BOOKING_MESSAGE,
    ORA_PAYMENT_MESSAGE, ORA_INTEGRATION_MESSAGE, ORA_DEMO_CLOSING_MESSAGE,
  ].join("\n"), /clinic|treatment|package/i);

  await store.saveConversation({
    waId: "ora-stale", state: "awaiting_name", packageId: "package_3", concernCategory: "wrinkle", updatedAt: new Date().toISOString(),
  });
  assert.equal(await engine.handleMessage({ id: "ora-off-3", from: "ora-stale", text: "hello" }), WELCOME_MESSAGE);
  const resetConversation = await store.getConversation("ora-stale");
  assert.equal(resetConversation?.state, "new");
  assert.equal(resetConversation?.packageId, undefined);
  assert.equal(resetConversation?.concernCategory, undefined);
});

test("ORA-only interactive demo reaches £1 test checkout and confirmation", async () => {
  let classifierCalls = 0;
  const store = new MemoryStore();
  const calendar = new FakeCalendar();
  const sender = new FakeSender();
  const engine = new ConversationEngine(store, {
    async classify() { classifierCalls += 1; return llmDecision(); },
  }, calendar, new FakeCheckout(), sender, false);
  const send = (id: string, text: string) => engine.handleMessage({ id, from: "ora-demo-user", text });

  assert.equal(await send("ora-demo-1", "START DEMO"), ORA_DEMO_START_MESSAGE);
  assert.match(ORA_DEMO_START_MESSAGE, /1\. Collect the booking details/i);
  assert.match(ORA_DEMO_START_MESSAGE, /£1 Stripe test-payment link/i);
  assert.equal((await store.getConversation("ora-demo-user"))?.state, "awaiting_name");
  assert.equal((await store.getConversation("ora-demo-user"))?.packageId, "ora_demo");

  assert.match(await send("ora-demo-2", "Taylor Demo") ?? "", /date and time/i);
  const policyReply = await send("ora-demo-3", "18 November 2030 at 2pm") ?? "";
  assert.match(policyReply, /test slot .* is available/i);
  assert.match(policyReply, new RegExp(ORA_DEMO_POLICY_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(await send("ora-demo-4", "YES") ?? "", /£1\.00 test deposit/i);
  assert.match(await send("ora-demo-4b", "hello") ?? "", /waiting for payment/i);

  const booking = [...store.bookings.values()][0];
  assert.ok(booking);
  assert.equal(booking.packageId, "ora_demo");
  assert.equal(booking.depositPence, 100);
  assert.equal(booking.status, "awaiting_payment");

  await engine.confirmPaidBooking(booking.id);
  assert.equal((await store.getBooking(booking.id))?.status, "confirmed");
  assert.equal(calendar.events.length, 1);
  assert.match(sender.sent[0]?.text ?? "", /ORA Demo Appointment/i);
  assert.match(sender.sent[0]?.text ?? "", /Speak with our Founder/i);
  assert.doesNotMatch(sender.sent[0]?.text ?? "", /clinic|treatment|package/i);
  assert.equal(classifierCalls, 0);

  assert.equal(await send("ora-demo-5", "START OVER"), WELCOME_MESSAGE);
  assert.equal((await store.getConversation("ora-demo-user"))?.packageId, undefined);
});

test("Cleaner Demo activates only from the exact standalone cleaner command", async () => {
  let classifierCalls = 0;
  const store = new MemoryStore();
  const engine = new ConversationEngine(store, {
    async classify() { classifierCalls += 1; return llmDecision(); },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender(), false);

  assert.equal(await engine.handleMessage({ id: "cleaner-1", from: "cleaner-user", text: " cleaner " }), CLEANER_WELCOME_MESSAGE);
  assert.equal((await store.getConversation("cleaner-user"))?.businessMode, "cleaner");
  assert.equal(await engine.handleMessage({ id: "cleaner-2", from: "cleaner-user", text: "hello" }), CLEANER_WELCOME_MESSAGE);
  assert.equal(await engine.handleMessage({ id: "cleaner-3", from: "cleaner-user", text: "Can I book a deep clean?" }), CLEANER_TEMPLATE_PENDING_MESSAGE);
  assert.equal((await store.getConversation("cleaner-user"))?.businessMode, "cleaner");

  assert.equal(await engine.handleMessage({ id: "cleaner-safety-1", from: "cleaner-safety", text: "cleaner" }), CLEANER_WELCOME_MESSAGE);
  assert.equal(await engine.handleMessage({ id: "cleaner-safety-2", from: "cleaner-safety", text: "I cannot breathe" }), EMERGENCY_MESSAGE);
  assert.equal(await engine.handleMessage({ id: "cleaner-safety-3", from: "cleaner-safety", text: "hello" }), GENERAL_HANDOVER_MESSAGE);

  assert.equal(await engine.handleMessage({ id: "cleaner-4", from: "cleaner-phrase", text: "cleaner please" }), ORA_INFO_MESSAGE);
  assert.equal(await engine.handleMessage({ id: "cleaner-5", from: "cleaner-mention", text: "I need a cleaner" }), ORA_INFO_MESSAGE);
  assert.equal((await store.getConversation("cleaner-phrase"))?.businessMode, undefined);
  assert.equal((await store.getConversation("cleaner-mention"))?.businessMode, undefined);

  assert.equal(await engine.handleMessage({ id: "cleaner-6", from: "cleaner-user", text: "START OVER" }), WELCOME_MESSAGE);
  assert.equal((await store.getConversation("cleaner-user"))?.businessMode, undefined);
  assert.equal(classifierCalls, 0);
});

test("Cleaner Demo expires with the normal 24-hour conversation window", async () => {
  const store = new MemoryStore();
  const engine = new ConversationEngine(store, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender(), false);
  await store.saveConversation({
    waId: "expired-cleaner", state: "new", businessMode: "cleaner", updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
  });

  assert.equal(await engine.handleMessage({ id: "cleaner-expired", from: "expired-cleaner", text: "hello" }), WELCOME_MESSAGE);
  assert.equal((await store.getConversation("expired-cleaner"))?.businessMode, undefined);
});

test("customer copy uses natural dates and hides implementation details", async () => {
  assert.doesNotMatch(FAQS[7]!.answer, /Stripe Test Checkout/i);
  assert.doesNotMatch(UNKNOWN_HELP_MESSAGE, /approved clinic FAQs/i);
  assert.doesNotMatch(INTEGRATION_FAILURE_MESSAGE, /booking services/i);

  const store = new MemoryStore();
  const calendar = new FakeCalendar();
  const sender = new FakeSender();
  const engine = new ConversationEngine(store, new FakeClassifier(), calendar, new FakeCheckout(), sender);
  const send = (id: string, text: string) => engine.handleMessage({ id, from: "447700900099", text });

  await send("copy-1", "book");
  await send("copy-2", "2");
  const datePrompt = await send("copy-3", "Morgan") ?? "";
  assert.match(datePrompt, /next Saturday at 11am/i);
  assert.doesNotMatch(datePrompt, /YYYY|Europe\/London/i);

  const vagueReply = await send("copy-4", "tomorrow afternoon") ?? "";
  assert.match(vagueReply, /date and time/i);
  assert.doesNotMatch(vagueReply, /YYYY|Europe\/London/i);

  const policyReply = await send("copy-5", "18 November 2030 at 2pm") ?? "";
  assert.match(policyReply, /Reply YES/i);
  const paymentReply = await send("copy-6", "YES") ?? "";
  assert.doesNotMatch(paymentReply, /Stripe Test Checkout|Calendar event/i);

  const booking = [...store.bookings.values()][0]!;
  await engine.confirmPaidBooking(booking.id);
  assert.doesNotMatch(sender.sent[0]?.text ?? "", /Google Calendar|Calendar event/i);

  const busyStore = new MemoryStore();
  const busyCalendar = new FakeCalendar();
  busyCalendar.available = false;
  const busyEngine = new ConversationEngine(busyStore, new FakeClassifier(), busyCalendar, new FakeCheckout(), new FakeSender());
  const busySend = (id: string, text: string) => busyEngine.handleMessage({ id, from: "447700900098", text });
  await busySend("busy-1", "book");
  await busySend("busy-2", "2");
  await busySend("busy-3", "Morgan");
  const alternatives = await busySend("busy-4", "18 November 2030 at 2pm") ?? "";
  assert.doesNotMatch(alternatives, /YYYY|test slots/i);
});

test("booking details can be corrected before consent and the latest stated date wins", async () => {
  const store = new MemoryStore();
  const engine = new ConversationEngine(store, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender());
  const from = "447700900097";
  const send = (id: string, text: string) => engine.handleMessage({ id, from, text });

  await send("correction-1", "Book p2 on 18 November 2030 at 2pm, name Alice.");
  await send("correction-2", "Actually make it Package 3 instead.");
  await send("correction-3", "The name should be Alicia, not Alice.");
  await send("correction-4", "Actually Thursday 21 November 2030 at 3pm instead.");

  const conversation = await store.getConversation(from);
  assert.equal(conversation?.state, "awaiting_policy");
  assert.equal(conversation?.packageId, "package_3");
  assert.equal(conversation?.customerName, "Alicia");
  assert.equal(DateTime.fromISO(conversation?.requestedStart ?? "", { setZone: true })
    .setZone("Europe/London").toFormat("cccc yyyy-MM-dd HH:mm"), "Thursday 2030-11-21 15:00");

  const oneShotStore = new MemoryStore();
  const oneShot = new ConversationEngine(oneShotStore, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender());
  await oneShot.handleMessage({ id: "latest-date", from: "latest-date", text: "Book p2 Monday 18 November 2030 at 2pm, sorry, Thursday 21 November 2030 at 3pm, name Noor." });
  assert.equal(DateTime.fromISO((await oneShotStore.getConversation("latest-date"))?.requestedStart ?? "", { setZone: true })
    .setZone("Europe/London").toFormat("cccc yyyy-MM-dd HH:mm"), "Thursday 2030-11-21 15:00");

  const hypotheticalStore = new MemoryStore();
  const hypothetical = new ConversationEngine(hypotheticalStore, {
    async classify() { return llmDecision({ intent: "book", wantsBooking: true, faqId: 5, packageId: "package_1" }); },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender());
  const reply = await hypothetical.handleMessage({ id: "hypothetical", from: "hypothetical", text: "If I were to book p1, how much would it be?" }) ?? "";
  assert.equal((await hypotheticalStore.getConversation("hypothetical"))?.state, "new");
  assert.match(reply, /Package 1 is £50/i);
  assert.doesNotMatch(reply, /What name|date and time/i);
});

test("confirmed booking survives async WhatsApp failure and STATUS returns confirmation", async () => {
  const store = new MemoryStore();
  const calendar = new FakeCalendar();
  const engine = new ConversationEngine(store, new FakeClassifier(), calendar, new FakeCheckout(), new FailingSender());
  const booking: Booking = {
    id: "booking-status-1", waId: "447700900002", customerName: "Alex", packageId: "package_2",
    requestedStart: "2026-09-02T12:00:00.000Z", depositPence: 2000, status: "awaiting_payment",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  await store.createBooking(booking);
  await store.saveConversation({ waId: booking.waId, state: "awaiting_payment", bookingId: booking.id, updatedAt: new Date().toISOString() });

  await engine.confirmPaidBooking(booking.id);
  assert.equal((await store.getBooking(booking.id))?.status, "confirmed");
  assert.equal(calendar.events.length, 1);

  await store.updateBooking(booking.id, { status: "failed" });
  await store.saveConversation({ waId: booking.waId, state: "handover", bookingId: booking.id, updatedAt: new Date().toISOString() });
  const reply = await engine.handleMessage({ id: "status-1", from: booking.waId, text: "STATUS" });
  assert.match(reply ?? "", /confirmed/i);
  assert.match(reply ?? "", /Personalised Skin Consultation/i);
  assert.equal((await store.getBooking(booking.id))?.status, "confirmed");
});

test("personal medical and emergency messages hand over without storing raw content", async () => {
  const store = new MemoryStore();
  const engine = new ConversationEngine(store, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender());
  const medical = await engine.handleMessage({ id: "med-1", from: "1", text: "I am pregnant and take medication" });
  const emergency = await engine.handleMessage({ id: "em-1", from: "2", text: "I cannot breathe" });
  assert.equal(medical, MEDICAL_HANDOVER_MESSAGE);
  assert.equal(emergency, EMERGENCY_MESSAGE);
  assert.equal(store.handoffs.length, 2);
  assert.ok(store.handoffs.every((item) => !item.summary.includes("pregnant") && !item.summary.includes("breathe")));
});

test("structured memory explores a concern and continues booking from a natural yes", async () => {
  const store = new MemoryStore();
  const engine = new ConversationEngine(store, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender());
  const unknown = await engine.handleMessage({ id: "unknown-1", from: "3", text: "something else" });
  assert.match(unknown ?? "", /ask what ORA does/i);
  assert.equal(store.handoffs.length, 0);
  assert.equal((await store.getConversation("3"))?.state, "clarifying_once");

  const wrinkle = await engine.handleMessage({ id: "wrinkle-1", from: "3", text: "I want something for wrinkle" });
  assert.match(wrinkle ?? "", /Anti-Wrinkle Consultation/i);
  assert.match(wrinkle ?? "", /Would you like to make a test booking/i);
  assert.equal((await store.getConversation("3"))?.state, "offering_booking");
  assert.equal((await store.getConversation("3"))?.concernCategory, "wrinkle");

  assert.match(await engine.handleMessage({ id: "yes-1", from: "3", text: "Yes please" }) ?? "", /What name/i);
  assert.equal((await store.getConversation("3"))?.state, "awaiting_name");
});

test("clear benign concern phrases route deterministically before an unstable model handover", async () => {
  const store = new MemoryStore();
  const engine = new ConversationEngine(store, {
    async classify() { return llmDecision({ intent: "handover", handover: "medical" }); },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender());

  const reply = await engine.handleMessage({
    id: "benign-temples-1", from: "benign-temples",
    text: "the hair around my temples is thinning",
  });
  assert.match(reply ?? "", /Hair & Scalp Consultation/i);
  assert.equal((await store.getConversation("benign-temples"))?.state, "offering_booking");

  const skinReply = await engine.handleMessage({
    id: "benign-skin-1", from: "benign-skin",
    text: "Something for skin or acne please.",
  });
  assert.match(skinReply ?? "", /Personalised Skin Consultation/i);
  assert.equal((await store.getConversation("benign-skin"))?.state, "offering_booking");

  const acneBookingReply = await engine.handleMessage({
    id: "benign-acne-booking-1", from: "benign-acne-booking",
    text: "Could I have an appointment for acne next Wednesday at 10:30am? Name Ava.",
  });
  assert.match(acneBookingReply ?? "", /Reply YES/i);
  assert.equal((await store.getConversation("benign-acne-booking"))?.state, "awaiting_policy");

  const medicalStore = new MemoryStore();
  const medicalEngine = new ConversationEngine(medicalStore, {
    async classify() { return llmDecision({ intent: "handover", handover: "medical" }); },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender());
  await medicalEngine.handleMessage({
    id: "model-medical-1", from: "model-medical",
    text: "Book p2 next Wednesday at 10:30am, name Ava; I have MCAS.",
  });
  assert.equal((await medicalStore.getConversation("model-medical"))?.state, "handover");
});

test("greetings never become a customer name during an active booking", async () => {
  const store = new MemoryStore();
  const engine = new ConversationEngine(store, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender());
  await engine.handleMessage({ id: "greet-1", from: "7", text: "book" });
  await engine.handleMessage({ id: "greet-2", from: "7", text: "2" });

  const reply = await engine.handleMessage({ id: "greet-3", from: "7", text: "Good evening" });
  assert.match(reply ?? "", /part-way through your test booking/i);
  assert.match(reply ?? "", /what name/i);
  assert.equal((await store.getConversation("7"))?.state, "awaiting_name");
  assert.equal((await store.getConversation("7"))?.customerName, undefined);
});

test("supported casual language stays safe without calling external services", async () => {
  const store = new MemoryStore();
  const engine = new ConversationEngine(store, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender());

  assert.match(await engine.handleMessage({ id: "odd-1", from: "odd-greeting", text: "hiya!!!" }) ?? "", /Welcome/i);
  assert.equal((await store.getConversation("odd-greeting"))?.state, "new");
  assert.match(await engine.handleMessage({ id: "odd-1b", from: "odd-stretched", text: "hiiiiii" }) ?? "", /Welcome/i);
  assert.equal((await store.getConversation("odd-stretched"))?.state, "new");
  assert.match(await engine.handleMessage({ id: "odd-1c", from: "odd-slang", text: "yo" }) ?? "", /Welcome/i);
  assert.equal((await store.getConversation("odd-slang"))?.state, "new");
  assert.match(await engine.handleMessage({ id: "odd-1d", from: "odd-uk-greeting", text: "alright mate?" }) ?? "", /Welcome/i);
  assert.equal((await store.getConversation("odd-uk-greeting"))?.state, "new");

  assert.match(await engine.handleMessage({ id: "odd-1e", from: "odd-uk-concern", text: "My hair's getting a bit thin." }) ?? "", /Hair & Scalp Consultation/i);
  assert.equal((await store.getConversation("odd-uk-concern"))?.state, "offering_booking");
  assert.match(await engine.handleMessage({ id: "odd-1f", from: "odd-uk-could", text: "Could do with something for oily skin." }) ?? "", /Personalised Skin Consultation/i);
  assert.equal((await store.getConversation("odd-uk-could"))?.state, "offering_booking");
  assert.match(await engine.handleMessage({ id: "odd-1g", from: "odd-slang-concern", text: "forehead lines are annoying af lol what u got" }) ?? "", /Anti-Wrinkle Consultation/i);
  assert.equal((await store.getConversation("odd-slang-concern"))?.state, "offering_booking");

  await engine.handleMessage({ id: "odd-2", from: "odd-decline", text: "I want something for wrinkle" });
  assert.match(await engine.handleMessage({ id: "odd-3", from: "odd-decline", text: "nah not now" }) ?? "", /No problem/i);
  assert.equal((await store.getConversation("odd-decline"))?.state, "new");

  assert.equal(await engine.handleMessage({ id: "odd-4", from: "odd-minor", text: "im 17 can u book wrinkle thing" }), MEDICAL_HANDOVER_MESSAGE);
  assert.equal(await engine.handleMessage({ id: "odd-5", from: "odd-emergency", text: "cant breathe, emergency" }), EMERGENCY_MESSAGE);
  assert.equal(await engine.handleMessage({ id: "odd-6", from: "odd-legal", text: "refund now or lawyer" }), GENERAL_HANDOVER_MESSAGE);
});

test("adversarial guards reject package guesses and invented times, and obey LLM handover", async () => {
  const ambiguousStore = new MemoryStore();
  const ambiguous = new ConversationEngine(ambiguousStore, {
    async classify() { return llmDecision({ intent: "explore_service", packageId: "package_1" }); },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender());
  assert.match(await ambiguous.handleMessage({ id: "guard-1", from: "guard-ambiguous", text: "book me hair or skin idk" }) ?? "", /Which package/i);
  assert.equal((await ambiguousStore.getConversation("guard-ambiguous"))?.packageId, undefined);
  assert.match(await ambiguous.handleMessage({ id: "guard-1b", from: "guard-no-preference", text: "book me hair and skin, no preference" }) ?? "", /Which package/i);
  assert.equal((await ambiguousStore.getConversation("guard-no-preference"))?.packageId, undefined);

  const vagueStore = new MemoryStore();
  const vague = new ConversationEngine(vagueStore, {
    async classify() {
      return llmDecision({
        intent: "explore_service", packageId: "package_2", localDateTime: "2026-08-30T15:00",
      });
    },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender());
  assert.match(await vague.handleMessage({ id: "guard-2", from: "guard-vague", text: "book package 2 tomorrow afternoon, name Jia" }) ?? "", /date and time/i);
  assert.equal((await vagueStore.getConversation("guard-vague"))?.requestedStart, undefined);

  const handoverStore = new MemoryStore();
  const handover = new ConversationEngine(handoverStore, {
    async classify() { return llmDecision({ handover: "medical" }); },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender());
  assert.equal(await handover.handleMessage({ id: "guard-3", from: "guard-medical", text: "personal health slang not in the regex" }), MEDICAL_HANDOVER_MESSAGE);
  assert.equal(handoverStore.handoffs[0]?.category, "medical");

  const negativeStore = new MemoryStore();
  const negative = new ConversationEngine(negativeStore, {
    async classify() { return llmDecision({ intent: "book", wantsBooking: true, faqId: 5, packageId: "package_3" }); },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender());
  assert.match(await negative.handleMessage({ id: "guard-4", from: "guard-negative", text: "price for p3 only, dont book me" }) ?? "", /Package 3 is £150/i);
  assert.equal((await negativeStore.getConversation("guard-negative"))?.state, "new");
});

test("UK time parsing is exact and vague or incomplete requests never create a slot", async () => {
  const exactCases: Array<[string, string]> = [
    ["on 18 Nov 2030 at 10.30am", "2030-11-18T10:30"],
    ["on 18 November 2030 at 1430", "2030-11-18T14:30"],
    ["on 18 November 2030 at 2 in the afternoon", "2030-11-18T14:00"],
    ["on 18 November 2030 at two fifteen", "2030-11-18T14:15"],
    ["on 18 November 2030 at ten fifteen", "2030-11-18T10:15"],
    ["on 18 November 2030 at twenty-five past ten", "2030-11-18T10:25"],
    ["on 18 November 2030 at half-past two", "2030-11-18T14:30"],
    ["on 18 November 2030 at fourteen thirty", "2030-11-18T14:30"],
    ["on 18 November 2030 at nineteen hundred", "2030-11-18T19:00"],
    ["on the 18th of November 2030 at quarter-to-three", "2030-11-18T14:45"],
  ];
  for (const [index, [phrase, expected]] of exactCases.entries()) {
    const store = new MemoryStore();
    const engine = new ConversationEngine(store, {
      async classify() {
        return llmDecision({ intent: "book", wantsBooking: true, packageId: "package_2", customerName: "Morgan", localDateTime: "2099-01-01T01:00" });
      },
    }, new FakeCalendar(), new FakeCheckout(), new FakeSender());
    const from = `uk-exact-${index}`;
    await engine.handleMessage({ id: from, from, text: `Book Package 2 ${phrase}, name Morgan.` });
    const actual = DateTime.fromISO((await store.getConversation(from))?.requestedStart ?? "", { setZone: true })
      .setZone("Europe/London").toFormat("yyyy-MM-dd'T'HH:mm");
    assert.equal(actual, expected, phrase);
  }

  const vagueCases = [
    "around 2pm next Monday",
    "before noon next Monday",
    "between 2pm and 3pm next Monday",
    "either 2pm or 3pm next Monday",
    "at 2pm",
    "on 31 February 2030 at 2pm",
  ];
  for (const [index, phrase] of vagueCases.entries()) {
    const store = new MemoryStore();
    const engine = new ConversationEngine(store, {
      async classify() {
        return llmDecision({ intent: "book", wantsBooking: true, packageId: "package_2", customerName: "Morgan", localDateTime: "2030-11-18T14:00" });
      },
    }, new FakeCalendar(), new FakeCheckout(), new FakeSender());
    const from = `uk-vague-${index}`;
    await engine.handleMessage({ id: from, from, text: `Book Package 2 ${phrase}, name Morgan.` });
    const conversation = await store.getConversation(from);
    assert.equal(conversation?.requestedStart, undefined, phrase);
    assert.equal(conversation?.state, "awaiting_datetime", phrase);
  }
});

test("date shortcuts are normalized without becoming a customer name", async () => {
  for (const [index, shortcut] of ["tdy", "2day"].entries()) {
    const store = new MemoryStore();
    const engine = new ConversationEngine(store, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender());
    const from = `today-shortcut-${index}`;
    await engine.handleMessage({ id: from, from, text: `Book Package 2 ${shortcut} at 2pm, name Morgan.` });
    const conversation = await store.getConversation(from);
    const expected = DateTime.now().setZone("Europe/London").toFormat("yyyy-MM-dd'T'14:00");
    const actual = DateTime.fromISO(conversation?.requestedStart ?? "", { setZone: true })
      .setZone("Europe/London").toFormat("yyyy-MM-dd'T'HH:mm");
    assert.equal(actual, expected, shortcut);
  }

  for (const [index, shortcut] of ["tmr", "tmrw", "tmw", "tmoro", "2moro", "2morrow", "tmoz", "tomoz"].entries()) {
    const store = new MemoryStore();
    const engine = new ConversationEngine(store, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender());
    const from = `tomorrow-shortcut-${index}`;
    await engine.handleMessage({
      id: from, from,
      text: `Book Package 2 ${shortcut} at 2pm, name Morgan.`,
    });
    const conversation = await store.getConversation(from);
    const expected = DateTime.now().setZone("Europe/London").plus({ days: 1 }).toFormat("yyyy-MM-dd'T'14:00");
    const actual = DateTime.fromISO(conversation?.requestedStart ?? "", { setZone: true })
      .setZone("Europe/London").toFormat("yyyy-MM-dd'T'HH:mm");
    assert.equal(actual, expected, shortcut);
    assert.equal(conversation?.customerName, "Morgan", shortcut);
  }

  const nameStore = new MemoryStore();
  const nameEngine = new ConversationEngine(nameStore, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender());
  await nameEngine.handleMessage({ id: "tmr-name-1", from: "tmr-name", text: "Book Package 2" });
  await nameEngine.handleMessage({ id: "tmr-name-2", from: "tmr-name", text: "tmr" });
  const conversation = await nameStore.getConversation("tmr-name");
  assert.equal(conversation?.state, "awaiting_name");
  assert.equal(conversation?.customerName, undefined);
});

test("appointment FAQs stay informational and explicit weekday times survive LLM omissions", async () => {
  const faqStore = new MemoryStore();
  const faqEngine = new ConversationEngine(faqStore, {
    async classify() { return llmDecision({ intent: "faq", faqId: 6 }); },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender());
  assert.match(await faqEngine.handleMessage({ id: "faq-duration", from: "faq-duration", text: "appointment duration?" }) ?? "", /Package 1 is 15 minutes/i);
  assert.equal((await faqStore.getConversation("faq-duration"))?.state, "new");

  const bookingStore = new MemoryStore();
  const bookingEngine = new ConversationEngine(bookingStore, {
    async classify() {
      return llmDecision({ intent: "book", wantsBooking: true, packageId: "package_3", customerName: "OMAR" });
    },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender());
  assert.match(await bookingEngine.handleMessage({
    id: "caps-booking", from: "caps-booking", text: "BOOK P3 NEXT TUESDAY 10AM NAME OMAR",
  }) ?? "", /Reply YES/i);
  assert.equal((await bookingStore.getConversation("caps-booking"))?.state, "awaiting_policy");
  assert.ok((await bookingStore.getConversation("caps-booking"))?.requestedStart);

  let classifiedAdultText = "";
  const adultStore = new MemoryStore();
  const adultEngine = new ConversationEngine(adultStore, {
    async classify(text) {
      classifiedAdultText = text;
      return llmDecision({ intent: "book", wantsBooking: true, packageId: "package_2", customerName: "Margaret" });
    },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender());
  assert.match(await adultEngine.handleMessage({
    id: "adult-booking", from: "adult-booking", text: "I am 72; please book Package 2 next Tuesday 11am, name Margaret.",
  }) ?? "", /Reply YES/i);
  assert.doesNotMatch(classifiedAdultText, /72/);
  assert.equal((await adultStore.getConversation("adult-booking"))?.state, "awaiting_policy");

  const correctionStore = new MemoryStore();
  const correctionEngine = new ConversationEngine(correctionStore, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender());
  await correctionEngine.handleMessage({ id: "correction-1", from: "correction", text: "book" });
  assert.match(await correctionEngine.handleMessage({
    id: "correction-2", from: "correction", text: "actually not hair, make it skin next Thursday 2pm, name Kim",
  }) ?? "", /Reply YES/i);
  assert.equal((await correctionStore.getConversation("correction"))?.packageId, "package_2");

  const ukTimeStore = new MemoryStore();
  const ukTimeEngine = new ConversationEngine(ukTimeStore, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender());
  assert.match(await ukTimeEngine.handleMessage({
    id: "uk-time-1", from: "uk-time", text: "Book me in for p1 next Tuesday at quarter to three, name Alfie.",
  }) ?? "", /Reply YES/i);
  const ukTime = DateTime.fromISO((await ukTimeStore.getConversation("uk-time"))?.requestedStart ?? "", { setZone: true })
    .setZone("Europe/London");
  assert.equal(ukTime.toFormat("HH:mm"), "14:45");

  const abbreviatedDateStore = new MemoryStore();
  const abbreviatedDateEngine = new ConversationEngine(abbreviatedDateStore, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender());
  assert.match(await abbreviatedDateEngine.handleMessage({
    id: "uk-abbreviated-1", from: "uk-abbreviated", text: "pls book p3 nxt Tue 2pm name Grace",
  }) ?? "", /Reply YES/i);
  assert.ok((await abbreviatedDateStore.getConversation("uk-abbreviated"))?.requestedStart);

  const namedDateStore = new MemoryStore();
  const namedDateEngine = new ConversationEngine(namedDateStore, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender());
  assert.match(await namedDateEngine.handleMessage({
    id: "named-date-1", from: "named-date", text: "book p3 on 5 September at 3pm, name Jack",
  }) ?? "", /Reply YES/i);
  const namedDate = DateTime.fromISO((await namedDateStore.getConversation("named-date"))?.requestedStart ?? "", { setZone: true })
    .setZone("Europe/London");
  assert.equal(namedDate.toFormat("dd LLL HH:mm"), "05 Sep 15:00");

  const explicitCorrectionStore = new MemoryStore();
  const explicitCorrectionEngine = new ConversationEngine(explicitCorrectionStore, {
    async classify() { return llmDecision({ intent: "book", wantsBooking: true, packageId: "package_1" }); },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender());
  assert.match(await explicitCorrectionEngine.handleMessage({
    id: "explicit-correction-1", from: "explicit-correction",
    text: "actually p1, not p3, make it skin next Tuesday 2pm, name Molly",
  }) ?? "", /Reply YES/i);
  assert.equal((await explicitCorrectionStore.getConversation("explicit-correction"))?.packageId, "package_2");
});

test("P2 shorthand is normalized before multi-field LLM extraction", async () => {
  let classifiedText = "";
  const store = new MemoryStore();
  const engine = new ConversationEngine(store, {
    async classify(text) {
      classifiedText = text;
      return llmDecision({
        intent: "book", wantsBooking: true, faqId: 5, packageId: "package_2",
        localDateTime: "2026-09-01T16:00",
      });
    },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender());

  const reply = await engine.handleMessage({ id: "p2-1", from: "p2-user", text: "p2 price? also reserve tuesday 4pm, put Sam on it" });
  assert.match(classifiedText, /Package 2/i);
  assert.match(reply ?? "", /Package 2 is £100/i);
  assert.equal((await store.getConversation("p2-user"))?.state, "awaiting_policy");
});

test("an explicit unambiguous package mention outranks a conflicting model guess", async () => {
  const store = new MemoryStore();
  const engine = new ConversationEngine(store, {
    async classify() {
      return llmDecision({ intent: "explore_service", packageId: "package_3" });
    },
  }, new FakeCalendar(), new FakeCheckout(), new FakeSender());

  const reply = await engine.handleMessage({
    id: "explicit-package-1", from: "explicit-package",
    text: "Package two, not two appointments.",
  });
  assert.match(reply ?? "", /Personalised Skin Consultation/i);
  assert.equal((await store.getConversation("explicit-package"))?.packageId, "package_2");
});

test("one natural message can answer a FAQ and fill every booking slot", async () => {
  const store = new MemoryStore();
  const classifier: IntentClassifier = {
    async classify() {
      return llmDecision({
        intent: "book", wantsBooking: true, faqId: 5, packageId: "package_2",
        customerName: "Alex", localDateTime: "2030-11-18T14:30",
      });
    },
  };
  const engine = new ConversationEngine(store, classifier, new FakeCalendar(), new FakeCheckout(), new FakeSender());
  const reply = await engine.handleMessage({
    id: "slots-1", from: "8", text: "Hi, I'm Alex. How much is Package 2, and can I book it on 18 November 2030 at 2:30pm?",
  });

  assert.match(reply ?? "", /Package 1 is £50, Package 2 is £100/i);
  assert.match(reply ?? "", /Reply YES/i);
  assert.equal((await store.getConversation("8"))?.state, "awaiting_policy");
  assert.equal((await store.getConversation("8"))?.customerName, "Alex");
  assert.equal((await store.getConversation("8"))?.packageId, "package_2");
  assert.match((await store.getConversation("8"))?.requestedStart ?? "", /^2030-11-18T14:30/);
});

test("captured booking fields survive while the bot asks only for missing data", async () => {
  const store = new MemoryStore();
  const classifier: IntentClassifier = {
    async classify() {
      return llmDecision({
        intent: "book", wantsBooking: true, packageId: "package_1", localDateTime: "2030-11-18T13:00",
      });
    },
  };
  const engine = new ConversationEngine(store, classifier, new FakeCalendar(), new FakeCheckout(), new FakeSender());
  const first = await engine.handleMessage({ id: "missing-1", from: "9", text: "Book me a hair consultation on 18 November 2030 at 1pm" });
  assert.match(first ?? "", /What name/i);
  assert.equal((await store.getConversation("9"))?.state, "awaiting_name");
  assert.match((await store.getConversation("9"))?.requestedStart ?? "", /^2030-11-18T13:00/);

  const second = await engine.handleMessage({ id: "missing-2", from: "9", text: "Alice Demo" });
  assert.match(second ?? "", /Reply YES/i);
  assert.equal((await store.getConversation("9"))?.state, "awaiting_policy");
});

test("service messages with a date use natural-language extraction instead of the keyword shortcut", async () => {
  let classifierCalls = 0;
  const classifier: IntentClassifier = {
    async classify() {
      classifierCalls += 1;
      return llmDecision({
        intent: "book", wantsBooking: true, packageId: "package_2", localDateTime: "2026-09-03T13:00",
      });
    },
  };
  const engine = new ConversationEngine(new MemoryStore(), classifier, new FakeCalendar(), new FakeCheckout(), new FakeSender());
  const reply = await engine.handleMessage({ id: "natural-date-1", from: "10", text: "I'd like skin next Thursday at 1pm" });

  assert.equal(classifierCalls, 1);
  assert.match(reply ?? "", /What name/i);
  assert.doesNotMatch(reply ?? "", /Would you like to make a test booking/i);
});

test("service questions use approved FAQ intent instead of keyword routing", async () => {
  const classifier: IntentClassifier = {
    async classify() { return llmDecision({ intent: "faq", faqId: 17, packageId: "package_2" }); },
  };
  const engine = new ConversationEngine(new MemoryStore(), classifier, new FakeCalendar(), new FakeCheckout(), new FakeSender());
  const reply = await engine.handleMessage({ id: "faq-intent-1", from: "6", text: "Are there side effects for skin treatment?" });
  assert.equal(reply?.endsWith(FAQS[16]!.answer), true);
  assert.doesNotMatch(reply ?? "", /Would you like to make a test booking/i);
});

test("three unrecognized messages hand over, while stale memory expires", async () => {
  const store = new MemoryStore();
  const engine = new ConversationEngine(store, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), new FakeSender());
  assert.match(await engine.handleMessage({ id: "u1", from: "4", text: "one unclear thing" }) ?? "", /not sure/i);
  assert.match(await engine.handleMessage({ id: "u2", from: "4", text: "another unclear thing" }) ?? "", /still not sure/i);
  assert.equal(await engine.handleMessage({ id: "u3", from: "4", text: "third unclear thing" }), GENERAL_HANDOVER_MESSAGE);
  assert.equal(store.handoffs.length, 1);
  assert.ok(!store.handoffs[0]?.summary.includes("unclear thing"));

  await store.saveConversation({
    waId: "5", state: "handover", updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
  });
  assert.match(await engine.handleMessage({ id: "fresh-1", from: "5", text: "hello" }) ?? "", /Welcome/i);
  assert.equal((await store.getConversation("5"))?.state, "new");
});

test("Meta signature and payload parsing accept only signed text messages", () => {
  const raw = Buffer.from('{"object":"whatsapp_business_account"}');
  const secret = "test-secret";
  const signature = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  assert.equal(verifyMetaSignature(raw, signature, secret), true);
  assert.equal(verifyMetaSignature(raw, "sha256=bad", secret), false);
  const messages = extractIncomingMessages({ entry: [{ changes: [{ value: { messages: [
    { id: "wamid.1", from: "4477", type: "text", text: { body: " hello " } },
    { id: "wamid.2", from: "4477", type: "image" },
  ] } }] }] });
  assert.deepEqual(messages, [{ id: "wamid.1", from: "4477", text: "hello" }]);
});

test("Twilio signature and payload parsing accept signed text messages", () => {
  const url = "https://example.test/webhooks/twilio/whatsapp";
  const token = "test-token";
  const params = { Body: " hello ", From: "whatsapp:+60123456789", MessageSid: "SM123" };
  const data = Object.keys(params).sort().reduce((value, key) => value + key + params[key as keyof typeof params], url);
  const signature = createHmac("sha1", token).update(data).digest("base64");
  assert.equal(verifyTwilioSignature(url, params, signature, token), true);
  assert.equal(verifyTwilioSignature(url, params, "bad", token), false);
  assert.deepEqual(extractTwilioIncomingMessage(params), {
    id: "SM123", from: "whatsapp:+60123456789", text: "hello",
  });
  assert.equal(twilioErrorCode({ code: 63007 }), 63007);
  assert.equal(twilioErrorCode({ message: "unknown" }), "unknown");
  assert.equal(twimlResponse("Hair & Skin <Demo>"),
    '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Hair &amp; Skin &lt;Demo&gt;</Message></Response>');
  assert.equal(twimlResponse(), '<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
});

test("abc menu sends once, handles selections, and falls back to text on send failure", async () => {
  const previous = { ...config.twilio };
  const oldUrl = config.appBaseUrl;
  config.twilio.authToken = "test-token";
  config.twilio.menuContentSid = "HXc9e5fc1f1fe65f9d4e0801d6d7bb99c3";
  const store = new MemoryStore();
  let sends = 0;
  let fail = false;
  const sender: MessageSender = {
    async sendText() {},
    async sendTemplate(to, sid) {
      assert.equal(to, "whatsapp:+447700900001");
      assert.equal(sid, config.twilio.menuContentSid);
      sends++;
      if (fail) throw new Error("Rejected");
    },
  };
  const engine = new ConversationEngine(store, new FakeClassifier(), new FakeCalendar(), new FakeCheckout(), sender, false);
  const server = createApp({ store, engine, sender, storeMode: "memory" }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  config.appBaseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const url = `${config.appBaseUrl}/webhooks/twilio/whatsapp`;
  const post = async (id: string, body: string, selection?: string) => {
    const params: Record<string, string> = { MessageSid: id, From: "whatsapp:+447700900001", Body: body };
    if (selection) params.ListId = selection;
    const data = Object.keys(params).sort().reduce((value, key) => value + key + params[key], url);
    const signature = createHmac("sha1", "test-token").update(data).digest("base64");
    return (await fetch(url, { method: "POST", headers: { "x-twilio-signature": signature }, body: new URLSearchParams(params) })).text();
  };
  try {
    assert.equal(await post("menu1", "Hi"), twimlResponse());
    assert.equal(await post("menu1", "Hi"), twimlResponse());
    assert.equal(sends, 1);
    assert.match(await post("menu2", "Book appointment", "book_appointment"), /ORA Interactive Demo started/);
    assert.match(await post("menu3", "Hi"), /name/i);
    assert.equal(sends, 1, "greeting during booking must preserve the workflow");
    fail = true;
    assert.match(await post("menu4", "START OVER"), /my name is ORA/);
    for (const [id, expected] of Object.entries({ service_enquiry: "What business knowledge can ORA answer?", general_question: "General question", request_callback: "Request callback", ask_question: "General question" })) {
      assert.equal(extractTwilioIncomingMessage({ MessageSid: "selection", From: "test", ButtonPayload: id })?.text, expected);
    }
    assert.match(await post("menu5", "General question", "general_question"), /what would you like to know/);
    assert.match(await post("menu6", "Request callback", "request_callback"), /Founder/);
    assert.equal(store.handoffs.length, 1);
  } finally {
    Object.assign(config.twilio, previous);
    config.appBaseUrl = oldUrl;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
