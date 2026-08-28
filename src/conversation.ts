import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import type { CalendarGateway } from "./calendar.js";
import { parseLocalDateTime } from "./calendar.js";
import { CLINIC, PACKAGES, parsePackage } from "./clinic.js";
import type { CheckoutGateway } from "./stripe.js";
import { FAQS, matchFaq } from "./faq.js";
import type { IntentClassifier, LlmDecision } from "./llm.js";
import {
  EMERGENCY_MESSAGE, GENERAL_HANDOVER_MESSAGE, INTEGRATION_FAILURE_MESSAGE,
  MEDICAL_HANDOVER_MESSAGE, POLICY_MESSAGE, UNKNOWN_HELP_MESSAGE, UNKNOWN_RETRY_MESSAGE,
  WELCOME_MESSAGE,
} from "./messages.js";
import { detectSafety, type SafetyDecision } from "./safety.js";
import type { Store } from "./store.js";
import type { Booking, Conversation, IncomingMessage, PackageId } from "./types.js";
import type { MessageSender } from "./whatsapp.js";

const nowIso = () => new Date().toISOString();
const sessionTtlMs = 24 * 60 * 60 * 1000;
const greetingPattern = /^\s*(hi|hello|hey|start|menu)\s*[!.?]*\s*$/i;
const bookingPattern = /\b(book|booking|appointment|make an appointment)\b/i;
const questionPattern = /^\s*(what|how|when|where|why|which|is|are|can|could|do|does|will|would)\b/i;
const acceptPattern = /^\s*(yes|y|accept|agree|i agree)\s*[!.]*\s*$/i;
const declinePattern = /^\s*(no|n|decline|cancel)\s*[!.]*\s*$/i;
const conversationalYesPattern = /^\s*(yes(?: please)?|y|sure|ok(?:ay)?|please do)\s*[!.]*\s*$/i;
const conversationalNoPattern = /^\s*(no(?: thanks)?|not now)\s*[!.]*\s*$/i;
const namePattern = /^[\p{L}][\p{L} '\-]{1,59}$/u;

const packageContext = {
  package_1: { faqId: 2, concern: "hair" },
  package_2: { faqId: 3, concern: "skin" },
  package_3: { faqId: 4, concern: "wrinkle" },
} as const;

const formatSlot = (iso: string) => DateTime.fromISO(iso, { setZone: true }).setZone(CLINIC.timezone).toFormat("cccc, d LLLL 'at' h:mm a");

export class ConversationEngine {
  constructor(
    private readonly store: Store,
    private readonly classifier: IntentClassifier,
    private readonly calendar: CalendarGateway,
    private readonly checkout: CheckoutGateway,
    private readonly sender: MessageSender,
  ) {}

  private async conversation(waId: string): Promise<Conversation> {
    return await this.store.getConversation(waId) ?? { waId, state: "new", updatedAt: nowIso() };
  }

  private async save(conversation: Conversation) {
    conversation.updatedAt = nowIso();
    await this.store.saveConversation(conversation);
  }

  private async handover(conversation: Conversation, decision: Exclude<SafetyDecision, undefined>, summary?: string) {
    const category = decision === "emergency" ? "emergency" : decision === "medical" ? "medical" : "general";
    await this.store.createHandoff({ waId: conversation.waId, category, summary: summary ?? `${category} handover triggered by automated safety rules.` });
    conversation.state = "handover";
    await this.save(conversation);
    if (decision === "emergency") return EMERGENCY_MESSAGE;
    if (decision === "medical") return MEDICAL_HANDOVER_MESSAGE;
    return GENERAL_HANDOVER_MESSAGE;
  }

  private async integrationFailure(conversation: Conversation, bookingId?: string) {
    if (bookingId) await this.store.updateBooking(bookingId, { status: "failed" });
    await this.store.createHandoff({ waId: conversation.waId, category: "integration", summary: "A booking integration failed before confirmation." });
    conversation.state = "handover";
    await this.save(conversation);
    return INTEGRATION_FAILURE_MESSAGE;
  }

  private async classify(text: string, conversation: Conversation): Promise<LlmDecision> {
    try {
      return await this.classifier.classify(text, {
        state: conversation.state,
        packageId: conversation.packageId,
        concernCategory: conversation.concernCategory,
      });
    } catch {
      return { intent: "unknown", faqId: null, packageId: null, localDateTime: null };
    }
  }

  private async choosePackage(conversation: Conversation, packageId?: PackageId) {
    if (!packageId) {
      conversation.state = "awaiting_package";
      await this.save(conversation);
      return "Which package would you like to book? Reply 1 for Hair & Scalp, 2 for Personalised Skin, or 3 for Anti-Wrinkle Consultation.";
    }
    conversation.packageId = packageId;
    conversation.concernCategory = packageContext[packageId].concern;
    conversation.state = "awaiting_name";
    await this.save(conversation);
    return `You selected ${PACKAGES[packageId].name}. What name would you like on the test booking?`;
  }

  private async explorePackage(conversation: Conversation, packageId: PackageId) {
    conversation.packageId = packageId;
    conversation.concernCategory = packageContext[packageId].concern;
    conversation.state = "offering_booking";
    await this.save(conversation);
    const answer = FAQS.find((item) => item.id === packageContext[packageId].faqId)!.answer;
    return `${answer}\n\nWould you like to make a test booking for this package?`;
  }

  private async rememberFaq(conversation: Conversation, faqId: number) {
    const packageEntry = Object.entries(packageContext).find(([, context]) => context.faqId === faqId);
    if (packageEntry) {
      conversation.packageId = packageEntry[0] as PackageId;
      conversation.concernCategory = packageEntry[1].concern;
    }
    if (conversation.state === "clarifying_once" || conversation.state === "clarifying_twice") conversation.state = "new";
    await this.save(conversation);
  }

  private async requestedDateTime(text: string, conversation: Conversation) {
    const strict = text.match(/\b(20\d{2}-\d{2}-\d{2})[ T](\d{2}:\d{2})\b/);
    if (strict) return `${strict[1]}T${strict[2]}`;
    const decision = await this.classify(text, conversation);
    return decision.localDateTime ?? undefined;
  }

  private async unknown(conversation: Conversation, firstMessage: boolean) {
    if (conversation.state === "clarifying_twice") {
      return this.handover(conversation, "general", "General handover after three unrecognized non-sensitive messages.");
    }
    const secondAttempt = conversation.state === "clarifying_once";
    conversation.state = secondAttempt ? "clarifying_twice" : "clarifying_once";
    await this.save(conversation);
    const reply = secondAttempt ? UNKNOWN_RETRY_MESSAGE : UNKNOWN_HELP_MESSAGE;
    return firstMessage ? `${WELCOME_MESSAGE}\n\n${reply}` : reply;
  }

  private async offerAlternatives(packageId: PackageId, reason: string) {
    const alternatives = await this.calendar.findAlternatives(packageId);
    if (!alternatives.length) return `${reason} I couldn’t find another slot in the next 14 days, so the Clinic Reception Team will need to help.`;
    return `${reason} The next available test slots are:\n${alternatives.map((slot, index) => `${index + 1}. ${formatSlot(slot)}`).join("\n")}\nReply with your preferred date and time in YYYY-MM-DD HH:mm format.`;
  }

  async handleMessage(message: IncomingMessage): Promise<string | undefined> {
    if (!await this.store.markEventProcessed("meta", message.id)) return undefined;
    const storedConversation = await this.store.getConversation(message.from);
    const expired = storedConversation && Date.now() - Date.parse(storedConversation.updatedAt) >= sessionTtlMs;
    let conversation = !storedConversation || expired
      ? { waId: message.from, state: "new", updatedAt: nowIso() } as Conversation
      : storedConversation;
    const firstMessage = !storedConversation || Boolean(expired);
    const text = message.text.trim();

    if (/^\s*(restart|start over)\s*$/i.test(text)) {
      conversation = { waId: message.from, state: "new", updatedAt: nowIso() };
      await this.save(conversation);
      return WELCOME_MESSAGE;
    }

    const safety = detectSafety(text);
    if (safety) return this.handover(conversation, safety);

    if (conversation.state === "handover") return GENERAL_HANDOVER_MESSAGE;

    const faq = matchFaq(text);
    if (faq) {
      await this.rememberFaq(conversation, faq.id);
      return firstMessage ? `${WELCOME_MESSAGE}\n\n${faq.answer}` : faq.answer;
    }

    if (["new", "clarifying_once", "clarifying_twice"].includes(conversation.state) && greetingPattern.test(text)) {
      conversation.state = "new";
      await this.save(conversation);
      return WELCOME_MESSAGE;
    }

    if (conversation.state === "offering_booking") {
      if (conversationalYesPattern.test(text)) return this.choosePackage(conversation, conversation.packageId);
      if (conversationalNoPattern.test(text)) {
        conversation.state = "new";
        await this.save(conversation);
        return "No problem. I can still explain another package or answer one of the approved clinic FAQs.";
      }
    }

    if (conversation.state === "awaiting_name") {
      if (!namePattern.test(text)) {
        await this.save(conversation);
        return "Please provide a preferred name using letters, spaces, apostrophes, or hyphens only (2–60 characters).";
      }
      conversation.customerName = text;
      conversation.state = "awaiting_datetime";
      await this.save(conversation);
      return "What date and time would you prefer? You can reply naturally or use YYYY-MM-DD HH:mm. Times are interpreted in Europe/London.";
    }

    if (conversation.state === "awaiting_datetime") {
      const localValue = await this.requestedDateTime(text, conversation);
      const local = localValue ? parseLocalDateTime(localValue) : undefined;
      if (!local || !conversation.packageId) {
        await this.save(conversation);
        return "I couldn’t identify a valid date and time. Please use YYYY-MM-DD HH:mm, for example 2026-09-02 14:30.";
      }
      const requestedStart = local.toUTC().toISO()!;
      try {
        const availability = await this.calendar.validateSlot(requestedStart, conversation.packageId);
        if (!availability.valid) return await this.offerAlternatives(conversation.packageId, availability.reason ?? "That slot is unavailable.");
      } catch {
        return this.integrationFailure(conversation);
      }
      conversation.requestedStart = requestedStart;
      conversation.state = "awaiting_policy";
      await this.save(conversation);
      return `The test slot ${formatSlot(requestedStart)} is available. ${POLICY_MESSAGE}`;
    }

    if (conversation.state === "awaiting_policy") {
      if (declinePattern.test(text)) {
        conversation = { waId: message.from, state: "new", updatedAt: nowIso() };
        await this.save(conversation);
        return "No problem. No booking or payment has been created. Send BOOK whenever you want to start again.";
      }
      if (!acceptPattern.test(text) || !conversation.customerName || !conversation.packageId || !conversation.requestedStart) {
        await this.save(conversation);
        return "Please reply YES to accept the demonstration cancellation policy, or NO to stop without creating a booking.";
      }
      const pack = PACKAGES[conversation.packageId];
      const booking: Booking = {
        id: randomUUID(), waId: conversation.waId, customerName: conversation.customerName,
        packageId: conversation.packageId, requestedStart: conversation.requestedStart,
        depositPence: pack.depositPence, status: "awaiting_payment", createdAt: nowIso(), updatedAt: nowIso(),
      };
      await this.store.createBooking(booking);
      try {
        const session = await this.checkout.createCheckout(booking);
        await this.store.updateBooking(booking.id, { stripeSessionId: session.id });
        conversation.bookingId = booking.id;
        conversation.state = "awaiting_payment";
        await this.save(conversation);
        return `Your ${pack.name} test slot is ready. Pay the £${(pack.depositPence / 100).toFixed(2)} test deposit here: ${session.url}\nThe booking is not confirmed until test payment succeeds and the Calendar event is created.`;
      } catch {
        return this.integrationFailure(conversation, booking.id);
      }
    }

    if (conversation.state === "awaiting_payment") {
      return "Your test booking is waiting for Stripe Test Checkout. It is not confirmed yet. Complete the test payment using the link already sent, or reply START OVER to cancel this conversation.";
    }

    const packageId = parsePackage(text);
    if (conversation.state === "awaiting_package") return this.choosePackage(conversation, packageId);
    if (bookingPattern.test(text)) {
      const reply = await this.choosePackage(conversation, packageId ?? conversation.packageId);
      return firstMessage ? `${WELCOME_MESSAGE}\n\n${reply}` : reply;
    }
    if (packageId && !questionPattern.test(text)) {
      const reply = await this.explorePackage(conversation, packageId);
      return firstMessage ? `${WELCOME_MESSAGE}\n\n${reply}` : reply;
    }

    const decision = await this.classify(text, conversation);
    if (decision.intent === "faq" && decision.faqId) {
      const approved = FAQS.find((item) => item.id === decision.faqId);
      if (approved) {
        await this.rememberFaq(conversation, approved.id);
        return firstMessage ? `${WELCOME_MESSAGE}\n\n${approved.answer}` : approved.answer;
      }
    }
    if (decision.intent === "book") {
      const reply = await this.choosePackage(conversation, decision.packageId ?? conversation.packageId);
      return firstMessage ? `${WELCOME_MESSAGE}\n\n${reply}` : reply;
    }
    if (decision.intent === "explore_service" && decision.packageId) {
      const reply = await this.explorePackage(conversation, decision.packageId);
      return firstMessage ? `${WELCOME_MESSAGE}\n\n${reply}` : reply;
    }
    return this.unknown(conversation, firstMessage);
  }

  async confirmPaidBooking(bookingId: string) {
    const booking = await this.store.getBooking(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.status === "confirmed") return;
    await this.store.updateBooking(booking.id, { status: "paid" });
    const conversation = await this.conversation(booking.waId);
    try {
      const available = await this.calendar.validateSlot(booking.requestedStart, booking.packageId);
      if (!available.valid) {
        await this.store.updateBooking(booking.id, { status: "calendar_conflict" });
        await this.store.createHandoff({ waId: booking.waId, category: "integration", summary: "The selected slot became unavailable after test payment." });
        conversation.state = "handover";
        await this.save(conversation);
        await this.sender.sendText(booking.waId, INTEGRATION_FAILURE_MESSAGE);
        return;
      }
      const eventId = await this.calendar.createBookingEvent(booking);
      await this.store.updateBooking(booking.id, { status: "confirmed", calendarEventId: eventId, confirmedStart: booking.requestedStart });
      conversation.state = "confirmed";
      await this.save(conversation);
      await this.sender.sendText(booking.waId, `Your test booking is confirmed ✅\n${PACKAGES[booking.packageId].name}\n${formatSlot(booking.requestedStart)}\nA Google Calendar event has been created. This is a demonstration and no real treatment is booked.`);
    } catch {
      await this.integrationFailure(conversation, booking.id);
      await this.sender.sendText(booking.waId, INTEGRATION_FAILURE_MESSAGE);
    }
  }
}
