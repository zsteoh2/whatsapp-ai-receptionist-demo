import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { DateTime } from "luxon";
import { validateBusinessSlot, type CalendarGateway } from "../src/calendar.js";
import { ConversationEngine } from "../src/conversation.js";
import { FAQS, matchFaq } from "../src/faq.js";
import type { IntentClassifier } from "../src/llm.js";
import { EMERGENCY_MESSAGE, MEDICAL_HANDOVER_MESSAGE } from "../src/messages.js";
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
