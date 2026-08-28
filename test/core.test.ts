import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { DateTime } from "luxon";
import { validateBusinessSlot, type CalendarGateway } from "../src/calendar.js";
import { ConversationEngine } from "../src/conversation.js";
import { FAQS, matchFaq } from "../src/faq.js";
import type { IntentClassifier } from "../src/llm.js";
import { EMERGENCY_MESSAGE, GENERAL_HANDOVER_MESSAGE, MEDICAL_HANDOVER_MESSAGE } from "../src/messages.js";
import { detectSafety } from "../src/safety.js";
import { MemoryStore } from "../src/store.js";
import type { CheckoutGateway } from "../src/stripe.js";
import type { Booking, PackageId } from "../src/types.js";
import {
  extractIncomingMessages, extractTwilioIncomingMessage, verifyMetaSignature,
  twilioErrorCode, twimlResponse, verifyTwilioSignature, type MessageSender,
} from "../src/whatsapp.js";

test("all 20 approved FAQ questions match their fixed answers", () => {
  assert.equal(FAQS.length, 20);
  for (const faq of FAQS) {
    const matched = matchFaq(faq.question);
    assert.equal(matched?.id, faq.id, faq.question);
    assert.equal(matched?.answer, faq.answer);
  }
});

test("safety rules distinguish general information from personal medical and emergency messages", () => {
  assert.equal(detectSafety("Are there risks or side effects?"), undefined);
  assert.equal(detectSafety("I am experiencing side effects after my treatment"), "medical");
  assert.equal(detectSafety("I am pregnant and take medication"), "medical");
  assert.equal(detectSafety("I'm 17 and want Package 3"), "medical");
  assert.equal(detectSafety("I cannot breathe and this is an emergency"), "emergency");
  assert.equal(detectSafety("I want a real person"), "general");
});

test("business-slot rules enforce notice, opening hours, and duration", () => {
  const now = DateTime.fromISO("2026-08-27T09:00", { zone: "Europe/London" });
  assert.equal(validateBusinessSlot(DateTime.fromISO("2026-08-27T12:00", { zone: "Europe/London" }), 60, now), undefined);
  assert.match(validateBusinessSlot(DateTime.fromISO("2026-08-27T10:00", { zone: "Europe/London" }), 30, now) ?? "", /two hours/i);
  assert.match(validateBusinessSlot(DateTime.fromISO("2026-08-30T12:00", { zone: "Europe/London" }), 30, now) ?? "", /closed/i);
  assert.match(validateBusinessSlot(DateTime.fromISO("2026-08-28T15:30", { zone: "Europe/London" }), 60, now) ?? "", /outside/i);
});

class FakeClassifier implements IntentClassifier {
  async classify() { return { intent: "unknown", faqId: null, packageId: null, localDateTime: null } as const; }
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

test("booking flow creates test checkout then confirms exactly one calendar event", async () => {
  const store = new MemoryStore();
  const calendar = new FakeCalendar();
  const sender = new FakeSender();
  const engine = new ConversationEngine(store, new FakeClassifier(), calendar, new FakeCheckout(), sender);
  const send = (id: string, text: string) => engine.handleMessage({ id, from: "447700900001", text });

  const firstReply = await send("m1", "book") ?? "";
  assert.match(firstReply, /This is a demonstration/i);
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

  await engine.confirmPaidBooking(booking.id);
  assert.equal(calendar.events.length, 1);
  assert.equal(sender.sent.length, 1);
  assert.equal(await send("m5", "YES"), undefined, "duplicate Meta message is ignored");
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
  assert.match(unknown ?? "", /Package 1, 2 or 3/i);
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

test("service questions use approved FAQ intent instead of keyword routing", async () => {
  const classifier: IntentClassifier = {
    async classify() { return { intent: "faq", faqId: 17, packageId: "package_2", localDateTime: null }; },
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
