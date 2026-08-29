import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import type { CalendarGateway } from "./calendar.js";
import { parseLocalDateTime } from "./calendar.js";
import { CLINIC, PACKAGES, packageMentions, parsePackage } from "./clinic.js";
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
const greetingPattern = /^\s*((h+i+|h+e+l+o+|h+e+y+)( there)?|hiya|howdy|yo+|sup|good (morning|afternoon|evening)|how are you|what'?s up|start|menu)\s*[!.?]*\s*$/i;
const statusPattern = /^\s*(status|booking status|check booking|check my booking)\s*[!.?]*\s*$/i;
const bookingPattern = /\b(book|booking|appointment|schedule|reserve)\b/i;
const negativeBookingPattern = /\b(?:don'?t|do not|not|can'?t|cannot)\s+(?:(?:want|trying|going)\s+to\s+)?(?:book(?:ing)?|schedule|reserve)\b/i;
const questionPattern = /^\s*(what|how|when|where|why|which|is|are|can|could|do|does|will|would)\b/i;
const acceptPattern = /^\s*(yes|y|accept|agree|i agree)\s*[!.]*\s*$/i;
const declinePattern = /^\s*(no|n|decline|cancel)\s*[!.]*\s*$/i;
const conversationalYesPattern = /^\s*(yes(?: please)?|y|sure|ok(?:ay)?|please do)\s*[!.]*\s*$/i;
const conversationalNoPattern = /^\s*(no(?: thanks)?|not now|nah(?: not now)?|nope(?: not now)?)\s*[!.]*\s*$/i;
const namePattern = /^[\p{L}][\p{L} '\-]{1,59}$/u;
const directNamePattern = /^[\p{L}][\p{L}'\-]*(?: [\p{L}][\p{L}'\-]*){0,3}$/u;
const reservedNamePattern = /\b(yes|no|sure|okay|please|book|booking|appointment|package|hair|scalp|skin|wrinkle|botox|today|tomorrow|next|morning|afternoon|evening)\b/i;
const dateHintPattern = /\b(today|tomorrow|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening|\d{1,2}(?::\d{2})?\s*(?:am|pm))\b|\b20\d{2}-\d{2}-\d{2}\b/i;
const preciseTimePattern = /\b(?:[01]?\d|2[0-3])(?::[0-5]\d)?\s*(?:am|pm)\b|\b(?:[01]\d|2[0-3]):[0-5]\d\b|\b(noon|midday|midnight)\b/i;
const uncertainPackagePattern = /\b(or|either|idk|not sure|unsure|undecided|maybe|no preference|don'?t care)\b/i;
const packageCorrectionPattern = /\b(not|forget|scrap|switch|change|instead|make it|rather|actually)\b/i;
const normalizeShorthand = (text: string) => text.replace(/\bp\s*([123])\b/gi, "Package $1");
const extractExplicitName = (text: string) => {
  const value = text.match(/\b(?:name(?:\s+is|'s)?|nama)\s+([\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){0,2})\s*(?=[,.;!?]|$)/iu)?.[1]
    ?? text.match(/\bput\s+([\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){0,2})\s+on it\b/iu)?.[1];
  return value?.replace(/\s+(please|pls)$/i, "").trim();
};
const bookingCollectionStates = ["awaiting_package", "awaiting_name", "awaiting_datetime"] as const;
const emptyDecision = (): LlmDecision => ({
  intent: "unknown", handover: "none", wantsBooking: false, faqId: null, packageId: null, customerName: null, localDateTime: null,
});

const packageContext = {
  package_1: { faqId: 2, concern: "hair" },
  package_2: { faqId: 3, concern: "skin" },
  package_3: { faqId: 4, concern: "wrinkle" },
} as const;

const formatSlot = (iso: string) => DateTime.fromISO(iso, { setZone: true }).setZone(CLINIC.timezone).toFormat("cccc, d LLLL 'at' h:mm a");
const confirmationMessage = (booking: Booking) => `Your test booking is confirmed ✅\n${PACKAGES[booking.packageId].name}\n${formatSlot(booking.confirmedStart ?? booking.requestedStart)}\nA Google Calendar event has been created. This is a demonstration and no real treatment is booked.`;

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

  private async notify(waId: string, text: string) {
    try {
      await this.sender.sendText(waId, text);
    } catch {
      console.error("async_whatsapp_notification_failed");
    }
  }

  private async bookingStatus(conversation: Conversation) {
    if (!conversation.bookingId) return "I can’t find an active test booking in this conversation. Reply BOOK to start one.";
    const booking = await this.store.getBooking(conversation.bookingId);
    if (!booking) return "I can’t find that test booking. Please ask the Clinic Reception Team for help.";
    if (booking.status === "confirmed" || booking.calendarEventId) {
      if (booking.status !== "confirmed") await this.store.updateBooking(booking.id, { status: "confirmed" });
      conversation.state = "confirmed";
      await this.save(conversation);
      return confirmationMessage(booking);
    }
    if (booking.status === "awaiting_payment") return "Your test booking is still waiting for Stripe Test Checkout and is not confirmed yet.";
    if (booking.status === "paid") return "Your test payment was received and Calendar confirmation is still processing. Please try STATUS again shortly.";
    return INTEGRATION_FAILURE_MESSAGE;
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
        customerName: conversation.customerName,
        requestedStart: conversation.requestedStart,
      });
    } catch {
      return emptyDecision();
    }
  }

  private async greetingReply(conversation: Conversation) {
    if (["new", "clarifying_once", "clarifying_twice"].includes(conversation.state)) {
      conversation.state = "new";
      await this.save(conversation);
      return WELCOME_MESSAGE;
    }
    await this.save(conversation);
    if (conversation.state === "awaiting_package") return "Hello! 👋 Which package would you like to book? Reply 1 for Hair & Scalp, 2 for Personalised Skin, or 3 for Anti-Wrinkle Consultation.";
    if (conversation.state === "awaiting_name") return "Hello! 👋 We’re part-way through your test booking. What name would you like on it?";
    if (conversation.state === "awaiting_datetime") return "Hello! 👋 We’re part-way through your test booking. What date and time would you prefer?";
    if (conversation.state === "offering_booking") return "Hello! 👋 Would you like to make a test booking for the package we just discussed?";
    if (conversation.state === "awaiting_policy") return `Hello! 👋 ${POLICY_MESSAGE}`;
    if (conversation.state === "awaiting_payment") return "Hello! 👋 Your test booking is waiting for Stripe Test Checkout. Complete the test payment using the link already sent, or reply STATUS to check it.";
    if (conversation.state === "confirmed") return "Hello! 👋 Your test booking is confirmed. Reply STATUS to see the booking details.";
    return GENERAL_HANDOVER_MESSAGE;
  }

  private async advanceBooking(conversation: Conversation, decision: LlmDecision) {
    if (conversation.state === "confirmed") {
      conversation = { waId: conversation.waId, state: "new", updatedAt: nowIso() };
    }
    if (decision.packageId) {
      conversation.packageId = decision.packageId;
      conversation.concernCategory = packageContext[decision.packageId].concern;
    }
    const customerName = decision.customerName?.trim();
    if (customerName && namePattern.test(customerName)) conversation.customerName = customerName;
    if (decision.localDateTime) {
      const local = parseLocalDateTime(decision.localDateTime);
      if (!local) {
        conversation.state = "awaiting_datetime";
        delete conversation.requestedStart;
        await this.save(conversation);
        return "I couldn’t identify a valid date and time. Please use YYYY-MM-DD HH:mm, for example 2026-09-02 14:30.";
      }
      conversation.requestedStart = local.toUTC().toISO()!;
    }
    if (!conversation.packageId) {
      conversation.state = "awaiting_package";
      await this.save(conversation);
      return "Which package would you like to book? Reply 1 for Hair & Scalp, 2 for Personalised Skin, or 3 for Anti-Wrinkle Consultation.";
    }
    if (conversation.requestedStart) {
      try {
        const availability = await this.calendar.validateSlot(conversation.requestedStart, conversation.packageId);
        if (!availability.valid) {
          delete conversation.requestedStart;
          conversation.state = "awaiting_datetime";
          await this.save(conversation);
          return await this.offerAlternatives(conversation.packageId, availability.reason ?? "That slot is unavailable.");
        }
      } catch {
        return this.integrationFailure(conversation);
      }
    }
    if (!conversation.customerName) {
      conversation.state = "awaiting_name";
      await this.save(conversation);
      return `You selected ${PACKAGES[conversation.packageId].name}. What name would you like on the test booking?`;
    }
    if (!conversation.requestedStart) {
      conversation.state = "awaiting_datetime";
      await this.save(conversation);
      return "What date and time would you prefer? You can reply naturally or use YYYY-MM-DD HH:mm. Times are interpreted in Europe/London.";
    }
    conversation.state = "awaiting_policy";
    await this.save(conversation);
    return `The test slot ${formatSlot(conversation.requestedStart)} is available. ${POLICY_MESSAGE}`;
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

  private async respondToDecision(conversation: Conversation, decision: LlmDecision, firstMessage: boolean) {
    if (decision.packageId) {
      conversation.packageId = decision.packageId;
      conversation.concernCategory = packageContext[decision.packageId].concern;
    }
    const approved = decision.faqId ? FAQS.find((item) => item.id === decision.faqId) : undefined;
    const wantsBooking = decision.wantsBooking || decision.intent === "book";
    if (approved && !wantsBooking) {
      await this.rememberFaq(conversation, approved.id);
      return firstMessage ? `${WELCOME_MESSAGE}\n\n${approved.answer}` : approved.answer;
    }
    if (wantsBooking || bookingCollectionStates.includes(conversation.state as typeof bookingCollectionStates[number])) {
      const bookingReply = await this.advanceBooking(conversation, decision);
      const reply = approved ? `${approved.answer}\n\n${bookingReply}` : bookingReply;
      return firstMessage ? `${WELCOME_MESSAGE}\n\n${reply}` : reply;
    }
    if (decision.intent === "explore_service" && decision.packageId) {
      const reply = await this.explorePackage(conversation, decision.packageId);
      return firstMessage ? `${WELCOME_MESSAGE}\n\n${reply}` : reply;
    }
    if (conversation.state === "offering_booking") {
      await this.save(conversation);
      return "Please reply YES if you would like to make a test booking for this package, or NO if you only wanted information.";
    }
    return this.unknown(conversation, firstMessage);
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
    const normalizedText = normalizeShorthand(text);

    if (/^\s*(restart|start over)\s*$/i.test(text)) {
      conversation = { waId: message.from, state: "new", updatedAt: nowIso() };
      await this.save(conversation);
      return WELCOME_MESSAGE;
    }

    const safety = detectSafety(text);
    if (safety) return this.handover(conversation, safety);

    if (statusPattern.test(text)) return this.bookingStatus(conversation);

    if (greetingPattern.test(text)) return this.greetingReply(conversation);

    if (conversation.state === "handover") return GENERAL_HANDOVER_MESSAGE;

    const faq = matchFaq(normalizedText);
    if (faq && !bookingPattern.test(normalizedText)) {
      await this.rememberFaq(conversation, faq.id);
      return firstMessage ? `${WELCOME_MESSAGE}\n\n${faq.answer}` : faq.answer;
    }

    if (conversation.state === "offering_booking") {
      if (conversationalYesPattern.test(text)) {
        return this.advanceBooking(conversation, { ...emptyDecision(), intent: "book", wantsBooking: true, packageId: conversation.packageId ?? null });
      }
      if (conversationalNoPattern.test(text)) {
        conversation.state = "new";
        await this.save(conversation);
        return "No problem. I can still explain another package or answer one of the approved clinic FAQs.";
      }
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

    const mentionedPackages = packageMentions(normalizedText);
    const packageIsAmbiguous = mentionedPackages.length > 1
      && (uncertainPackagePattern.test(text) || !packageCorrectionPattern.test(text));
    const packageId = packageIsAmbiguous ? undefined : parsePackage(normalizedText);
    const strictDateTime = text.match(/\b(20\d{2}-\d{2}-\d{2})[ T](\d{2}:\d{2})\b/);
    const localDateTime = strictDateTime ? `${strictDateTime[1]}T${strictDateTime[2]}` : null;
    const explicitCustomerName = extractExplicitName(text);
    if (conversation.state === "awaiting_package" && packageId && !questionPattern.test(text)
      && !dateHintPattern.test(text) && text.split(/\s+/).length <= 5) {
      return this.advanceBooking(conversation, { ...emptyDecision(), wantsBooking: true, packageId });
    }
    if (conversation.state === "awaiting_name" && directNamePattern.test(text) && !reservedNamePattern.test(text)) {
      return this.advanceBooking(conversation, { ...emptyDecision(), wantsBooking: true, customerName: text });
    }
    if (conversation.state === "awaiting_datetime" && localDateTime) {
      return this.advanceBooking(conversation, { ...emptyDecision(), wantsBooking: true, localDateTime });
    }
    if (!bookingCollectionStates.includes(conversation.state as typeof bookingCollectionStates[number])
      && packageId && !bookingPattern.test(text) && !questionPattern.test(text)
      && !dateHintPattern.test(text) && text.split(/\s+/).length <= 5) {
      const reply = await this.explorePackage(conversation, packageId);
      return firstMessage ? `${WELCOME_MESSAGE}\n\n${reply}` : reply;
    }

    let decision = await this.classify(normalizedText, conversation);
    const llmHandover = decision.handover !== "none" ? decision.handover
      : [15, 19].includes(decision.faqId ?? 0) ? "medical"
        : decision.faqId === 20 ? "general" : "none";
    if (llmHandover !== "none") return this.handover(conversation, llmHandover);
    if (packageIsAmbiguous) {
      delete conversation.packageId;
      delete conversation.concernCategory;
    }
    if (dateHintPattern.test(text) && !preciseTimePattern.test(text)) delete conversation.requestedStart;
    decision = {
      ...decision,
      faqId: decision.faqId ?? faq?.id ?? null,
      packageId: packageIsAmbiguous ? null : decision.packageId ?? packageId ?? null,
      customerName: decision.customerName ?? explicitCustomerName ?? null,
      localDateTime: preciseTimePattern.test(text) ? decision.localDateTime ?? localDateTime : null,
    };
    if (conversation.state === "awaiting_name" && !decision.customerName
      && directNamePattern.test(text) && !reservedNamePattern.test(text)) {
      decision = { ...decision, customerName: text };
    }
    if (negativeBookingPattern.test(normalizedText)) {
      decision = { ...decision, intent: decision.faqId ? "faq" : decision.packageId ? "explore_service" : "unknown", wantsBooking: false };
    } else if (bookingPattern.test(normalizedText) && !decision.wantsBooking) {
      decision = { ...decision, intent: "book", wantsBooking: true };
    }
    return this.respondToDecision(conversation, decision, firstMessage);
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
        await this.notify(booking.waId, INTEGRATION_FAILURE_MESSAGE);
        return;
      }
      const eventId = await this.calendar.createBookingEvent(booking);
      await this.store.updateBooking(booking.id, { status: "confirmed", calendarEventId: eventId, confirmedStart: booking.requestedStart });
      conversation.state = "confirmed";
      await this.save(conversation);
    } catch {
      await this.integrationFailure(conversation, booking.id);
      await this.notify(booking.waId, INTEGRATION_FAILURE_MESSAGE);
      return;
    }
    await this.notify(booking.waId, confirmationMessage(booking));
  }
}
