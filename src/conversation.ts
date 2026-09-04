import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import type { CalendarGateway } from "./calendar.js";
import { parseLocalDateTime } from "./calendar.js";
import { CLINIC, PACKAGES, packageMentions, parsePackage } from "./clinic.js";
import type { CheckoutGateway } from "./stripe.js";
import { FAQS, matchFaq } from "./faq.js";
import type { IntentClassifier, LlmDecision } from "./llm.js";
import {
  CALLBACK_REQUEST_MESSAGE, CLEANER_TEMPLATE_PENDING_MESSAGE, CLEANER_WELCOME_MESSAGE, EMERGENCY_MESSAGE, FOUNDER_CTA_MESSAGE, GENERAL_HANDOVER_MESSAGE, INTEGRATION_FAILURE_MESSAGE,
  MEDICAL_HANDOVER_MESSAGE, ORA_BOOKING_MESSAGE, ORA_DEMO_CLOSING_MESSAGE, ORA_DEMO_POLICY_MESSAGE, ORA_DEMO_START_MESSAGE, ORA_HANDOVER_MESSAGE, ORA_INFO_MESSAGE, ORA_INTEGRATION_MESSAGE,
  ORA_KNOWLEDGE_MESSAGE, ORA_PAYMENT_MESSAGE, ORA_TEMPLATE_PENDING_MESSAGE, POLICY_MESSAGE, UNKNOWN_HELP_MESSAGE, UNKNOWN_RETRY_MESSAGE,
  WELCOME_MESSAGE,
} from "./messages.js";
import { detectSafety, type SafetyDecision } from "./safety.js";
import type { Store } from "./store.js";
import type { Booking, ClinicPackageId, Conversation, IncomingMessage, PackageId } from "./types.js";
import type { MessageSender } from "./whatsapp.js";

const nowIso = () => new Date().toISOString();
const sessionTtlMs = 24 * 60 * 60 * 1000;
const greetingPattern = /^\s*((h+i+|h+e+l+o+|h+e+y+)( there)?|hiya(?: (?:mate|love))?|howdy|yo+|sup|(?:good )?(?:morning|afternoon|evening)|how are you|what'?s up|start|menu|cheers(?: mate)?|(?:you )?alright(?: mate)?|ey up|aye,?\s*hello|hello (?:pet|there,? mate)|hi hen|good day)\s*[!.?]*\s*$/i;
const statusPattern = /^\s*(status|booking status|check booking|check my booking)\s*[!.?]*\s*$/i;
const callbackPattern = /\b(?:call[ -]?back|ring me|phone me|give me (?:a )?(?:call|ring)|(?:owner|founder|someone) (?:to )?(?:call|ring) me)\b/i;
const generalQuestionPattern = /^\s*(?:general question|ask a general question)\s*[!.?]*\s*$/i;
const demoClosingPattern = /^\s*(?:thanks|thank you|that'?s all|done|finish(?:ed)?|no more questions?)\s*[!.?]*\s*$/i;
const cleanerActivationPattern = /^\s*cleaner\s*$/i;
const startDemoPattern = /^\s*(?:start demo|interactive demo|try demo)\s*[!.?]*\s*$/i;
const navigationHelpPattern = /^\s*(?:can you help(?: me)?|what can you help with|show me the menu(?: please)?|i need some information|can i ask a question|not sure what i need(?: really)?|what are my options|hiya,? what can you do for me|where do i start|tell me what this chat does)\s*[!.?]*\s*$/i;
const bookingPattern = /\b(book(?:ed|ing)?|schedule|reserve)\b|\b(?:pencil|slot|fit)\s+(?:me|us)\s+in\b|\b(?:make|need|want|arrange)\s+(?:an?\s+)?appointment\b/i;
const negativeBookingPattern = /\b(?:don'?t|do not|not|can'?t|cannot)\s+(?:(?:want|trying|going|ready)\s+to\s+)?(?:book(?:ing)?|schedule|reserve|pencil(?:\s+(?:me|us))?\s+in)\b/i;
const hypotheticalBookingPattern = /\bif i (?:were to|wanted to|did)\s+(?:book|schedule|reserve)\b/i;
const questionPattern = /^\s*(what|how|when|where|why|which|is|are|can|could|do|does|will|would)\b/i;
const acceptPattern = /^\s*(yes|y|accept|agree|i agree)\s*[!.]*\s*$/i;
const declinePattern = /^\s*(no|n|decline|cancel)\s*[!.]*\s*$/i;
const conversationalYesPattern = /^\s*(yes(?: please)?|y|sure|ok(?:ay)?|please do|go on then)\s*[!.]*\s*$/i;
const conversationalNoPattern = /^\s*(no(?: thanks)?|not now|nah(?: not now)?|nope(?: not now)?)\s*[!.]*\s*$/i;
const namePattern = /^[\p{L}][\p{L} '\-]{1,59}$/u;
const directNamePattern = /^[\p{L}][\p{L}'\-]*(?: [\p{L}][\p{L}'\-]*){0,3}$/u;
const reservedNamePattern = /\b(yes|no|sure|okay|please|book|booking|appointment|package|hair|scalp|skin|wrinkle|botox|today|tomorrow|next|morning|afternoon|evening)\b/i;
const dateHintPattern = /\b(today|tomorrow|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening|january|february|march|april|may|june|july|august|september|october|november|december|fortnight|week|\d{1,2}(?::\d{2})?\s*(?:am|pm))\b|\b20\d{2}-\d{2}-\d{2}\b|\b\d{1,2}[/.\-]\d{1,2}(?:[/.\-]\d{2,4})?\b/i;
const clockWordPattern = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|twenty-one|twenty-two|twenty-three";
const impreciseTimePattern = /\b(?:around|about|roughly|approximately|ish|just|before|after|between|either|maybe|by|no later than|any time (?:from|until))\b/i;
const weekdays: Record<string, number> = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7,
};
const months: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};
const clockWords: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, "twenty-one": 21,
  "twenty-two": 22, "twenty-three": 23,
};
const parseClockHour = (value: string) => clockWords[value.toLowerCase()] ?? Number(value);
const applyClockPeriod = (hour: number, period?: string) => {
  if (period?.toLowerCase() === "am") return hour === 12 ? 0 : hour;
  if (period?.toLowerCase() === "pm") return hour === 12 ? 12 : hour + 12;
  return hour >= 1 && hour <= 7 ? hour + 12 : hour;
};
const extractSpokenTime = (text: string): { hour: number; minute: number } | null => {
  const relative = text.match(new RegExp(
    `\\b(half|quarter|twenty[- ]five|twenty|ten|five)[ -]+(?:(past|to)[ -]+)?(${clockWordPattern}|\\d{1,2})(?:\\s*(am|pm))?\\b`,
    "i",
  ));
  if (relative && (relative[2] || /^half$/i.test(relative[1]!))) {
    const minutes = { half: 30, quarter: 15, five: 5, ten: 10, twenty: 20, "twenty-five": 25, "twenty five": 25 }[relative[1]!.toLowerCase()]!;
    let hour = applyClockPeriod(parseClockHour(relative[3]!), relative[4]);
    if (relative[2]?.toLowerCase() === "to") hour = (hour + 23) % 24;
    return { hour, minute: relative[2]?.toLowerCase() === "to" ? 60 - minutes : minutes };
  }
  const oclock = text.match(new RegExp(`\\b(${clockWordPattern}|\\d{1,2})\\s+o'?clock(?:\\s*(am|pm))?\\b`, "i"));
  if (oclock) return { hour: applyClockPeriod(parseClockHour(oclock[1]!), oclock[2]), minute: 0 };
  const spokenMinutes = text.match(new RegExp(`\\b(?:oh\\s+)?(${clockWordPattern})\\s+(oh\\s+five|fifteen|thirty|forty[- ]five)(?:\\s*(am|pm))?\\b`, "i"));
  if (spokenMinutes) {
    const minuteToken = spokenMinutes[2]!.toLowerCase().replace(/[- ]/g, "");
    const minute = { ohfive: 5, fifteen: 15, thirty: 30, fortyfive: 45 }[minuteToken]!;
    return { hour: applyClockPeriod(parseClockHour(spokenMinutes[1]!), spokenMinutes[3]), minute };
  }
  const hundred = text.match(new RegExp(`\\b(${clockWordPattern})\\s+hundred\\b`, "i"));
  if (hundred) {
    const hour = parseClockHour(hundred[1]!);
    return hour <= 23 ? { hour, minute: 0 } : null;
  }
  return null;
};
const extractNumericTime = (text: string): { hour: number; minute: number } | null => {
  const meridiem = text.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/i);
  if (meridiem) {
    const hour = Number(meridiem[1]);
    const minute = Number(meridiem[2] ?? 0);
    if (hour < 1 || hour > 12 || minute > 59) return null;
    return { hour: applyClockPeriod(hour, meridiem[3]), minute };
  }
  const colon = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (colon) return { hour: Number(colon[1]), minute: Number(colon[2]) };
  const dotted = text.match(/\bat\s+([01]?\d|2[0-3])\.([0-5]\d)\b/i);
  if (dotted) return { hour: Number(dotted[1]), minute: Number(dotted[2]) };
  const compact = text.match(/\bat\s+([01]\d|2[0-3])([0-5]\d)\b/i);
  if (compact) return { hour: Number(compact[1]), minute: Number(compact[2]) };
  const dayPeriod = text.match(/\b(\d{1,2})\s+in the\s+(morning|afternoon|evening)\b/i);
  if (dayPeriod) {
    const rawHour = Number(dayPeriod[1]);
    if (rawHour < 1 || rawHour > 12) return null;
    const period = /afternoon|evening/i.test(dayPeriod[2]!) ? "pm" : "am";
    return { hour: applyClockPeriod(rawHour, period), minute: 0 };
  }
  const named = text.match(/\b(noon|midday|midnight)\b/i)?.[1];
  return named ? { hour: /^midnight$/i.test(named) ? 0 : 12, minute: 0 } : null;
};
const extractExplicitTime = (text: string) => extractNumericTime(text) ?? extractSpokenTime(text);
const extractExplicitDate = (text: string): DateTime | null => {
  const today = DateTime.now().setZone(CLINIC.timezone).startOf("day");
  if (/\bthe day after tomorrow\b/i.test(text)) return today.plus({ days: 2 });
  if (/\ba week tomorrow\b/i.test(text)) return today.plus({ days: 8 });
  if (/\bin a fortnight\b/i.test(text)) return today.plus({ days: 14 });
  if (/\bin a week\b/i.test(text)) return today.plus({ days: 7 });

  const delayedWeekday = text.match(/\b(?:(a week|a fortnight)\s+on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(week|fortnight))\b/i);
  if (delayedWeekday) {
    const targetToken = delayedWeekday[2] ?? delayedWeekday[3]!;
    const delayToken = delayedWeekday[1] ?? delayedWeekday[4]!;
    const daysAhead = (weekdays[targetToken.toLowerCase()]! - today.weekday + 7) % 7 || 7;
    return today.plus({ days: daysAhead + (/fortnight/i.test(delayToken) ? 14 : 7) });
  }

  const isoDate = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (isoDate) {
    const day = DateTime.fromObject({ year: Number(isoDate[1]), month: Number(isoDate[2]), day: Number(isoDate[3]) }, { zone: CLINIC.timezone });
    return day.isValid ? day : null;
  }
  const namedDate = text.match(/\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(20\d{2}))?\b/i);
  if (namedDate) {
    const day = DateTime.fromObject({
      year: Number(namedDate[3] ?? today.year), month: months[namedDate[2]!.toLowerCase()]!, day: Number(namedDate[1]),
    }, { zone: CLINIC.timezone });
    if (!day.isValid) return null;
    return !namedDate[3] && day < today ? day.plus({ years: 1 }) : day;
  }
  const numericDate = text.match(/\b(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2}|20\d{2}))?\b/);
  if (numericDate) {
    const rawYear = numericDate[3];
    const year = rawYear ? Number(rawYear.length === 2 ? `20${rawYear}` : rawYear) : today.year;
    const day = DateTime.fromObject({ year, month: Number(numericDate[2]), day: Number(numericDate[1]) }, { zone: CLINIC.timezone });
    if (!day.isValid) return null;
    return !rawYear && day < today ? day.plus({ years: 1 }) : day;
  }

  const relativeDate = text.match(/\b(today|tomorrow|(?:(?:next|this(?: coming)?)\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+coming)?)\b/i);
  if (!relativeDate) return null;
  const token = relativeDate[1]!.toLowerCase();
  if (token === "today") return today;
  if (token === "tomorrow") return today.plus({ days: 1 });
  const target = weekdays[relativeDate[2]!.toLowerCase()]!;
  return today.plus({ days: (target - today.weekday + 7) % 7 || 7 });
};
const extractExplicitLocalDateTime = (text: string) => {
  const correction = [...text.matchAll(/\b(?:sorry|actually|change(?: it| that)? to|make that)\b/gi)].at(-1);
  if (correction?.index !== undefined) {
    const correctedText = text.slice(correction.index + correction[0].length);
    if (!impreciseTimePattern.test(correctedText)) {
      const correctedDay = extractExplicitDate(correctedText);
      const correctedTime = extractExplicitTime(correctedText);
      if (correctedDay && correctedTime) return correctedDay.set(correctedTime).toFormat("yyyy-MM-dd'T'HH:mm");
    }
  }
  const ambiguityText = text.replace(/\bthe day after tomorrow\b/gi, "");
  if (impreciseTimePattern.test(ambiguityText)) return null;
  const day = extractExplicitDate(text);
  const time = extractExplicitTime(text);
  if (!day || !time) return null;
  return day.set(time).toFormat("yyyy-MM-dd'T'HH:mm");
};
const uncertainPackagePattern = /\b(or|either|idk|not sure|unsure|undecided|maybe|no preference|don'?t care)\b/i;
const packageCorrectionPattern = /\b(not|forget|scrap|switch|change|instead|make it|rather|actually)\b/i;
const benignConcernPattern = /\b(?:hair(?:'s| is)?\s+(?:getting|going)\s+(?:a bit\s+)?thin(?:ner)?|hair.{0,35}\bthinning\b|hairline.*(?:creeping|receding|going).*back|more hair in my brush|help with.*hair.*scalp|breakouts?.*(?:leave me alone|bothering)|appointment for acne|skin.{0,25}\bacne\b|acne.{0,25}\bskin\b|skin tone.*uneven|face.*dull|dark marks?.*after spots|forehead (?:lines?|creases?).*(?:annoying|bothering)|frown lines?|lines? (?:around|round|between) (?:my )?(?:eyes|brows?)|could do with something for|doing my head in|wee consultation for)\b/i;
const normalizeInput = (text: string) => text
  .replace(/\bp\s*([123])\b/gi, "Package $1")
  .replace(/\bpakage\b/gi, "package")
  .replace(/\bbok\b/gi, "book")
  .replace(/\bskn\b/gi, "skin")
  .replace(/\bnex\b/gi, "next")
  .replace(/\bnxt\b/gi, "next")
  .replace(/\b(?:tdy|2day)\b/gi, "today")
  .replace(/\b(?:tmr|tmrw|tmw|tmoro|2moro|2morrow|tmoz|tomoz)\b/gi, "tomorrow")
  .replace(/\bmon\b/gi, "Monday")
  .replace(/\btue(?:s)?\b/gi, "Tuesday")
  .replace(/\bwed\b/gi, "Wednesday")
  .replace(/\bthu(?:rs)?\b/gi, "Thursday")
  .replace(/\bfri\b/gi, "Friday")
  .replace(/\bsat\b/gi, "Saturday")
  .replace(/\bsun\b/gi, "Sunday")
  .replace(/\bjan\b/gi, "January")
  .replace(/\bfeb\b/gi, "February")
  .replace(/\bmar\b/gi, "March")
  .replace(/\bapr\b/gi, "April")
  .replace(/\bjun\b/gi, "June")
  .replace(/\bjul\b/gi, "July")
  .replace(/\baug\b/gi, "August")
  .replace(/\bsep(?:t)?\b/gi, "September")
  .replace(/\boct\b/gi, "October")
  .replace(/\bnov\b/gi, "November")
  .replace(/\bdec\b/gi, "December")
  .replace(/皮肤/g, "skin")
  .replace(/\bname\s+iz\b/gi, "name is")
  .replace(/\bu\b/gi, "you")
  .replace(/\br\b/gi, "are")
  .replace(/\b(?:i am|i'?m|age(?:d)?)\s+(\d{1,3})\b/gi, (match, age) => Number(age) >= 18 ? "" : match);
const extractExplicitName = (text: string) => {
  const value = text.match(/\b(?:name(?:\s+is|'s)?|nama)\s+([\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){0,2})\s*(?=[,.;!?]|$)/iu)?.[1]
    ?? text.match(/\bput\s+([\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){0,2})\s+on it\b/iu)?.[1];
  return value?.replace(/\s+(please|pls)$/i, "").trim();
};
const extractCorrectedName = (text: string) => text.match(/\bname should be\s+([\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){0,2})\s*(?=[,.;!?]|\bnot\b|$)/iu)?.[1]?.trim();
const extractCorrectedPackage = (text: string) => {
  const corrections = [...text.matchAll(/\b(?:actually|instead|make it|switch(?: to)?|change(?: to)?|rather|not)\b/gi)];
  for (const correction of corrections.reverse()) {
    const packageId = parsePackage(text.slice((correction.index ?? 0) + correction[0].length));
    if (packageId) return packageId;
  }
  return undefined;
};
const bookingCollectionStates = ["awaiting_package", "awaiting_name", "awaiting_datetime"] as const;
const emptyDecision = (): LlmDecision => ({
  intent: "unknown", handover: "none", wantsBooking: false, faqId: null, packageId: null, customerName: null, localDateTime: null,
});

const packageContext: Record<ClinicPackageId, { faqId: number; concern: string }> = {
  package_1: { faqId: 2, concern: "hair" },
  package_2: { faqId: 3, concern: "skin" },
  package_3: { faqId: 4, concern: "wrinkle" },
} as const;

const formatSlot = (iso: string) => DateTime.fromISO(iso, { setZone: true }).setZone(CLINIC.timezone).toFormat("cccc, d LLLL 'at' h:mm a");
const confirmationMessage = (booking: Booking, showClinicService = true) => `Your test booking is confirmed ✅\n${booking.packageId === "ora_demo" || showClinicService ? `${PACKAGES[booking.packageId].name}\n` : ""}${formatSlot(booking.confirmedStart ?? booking.requestedStart)}\nThis is a demonstration and no real appointment is booked.\n\n${FOUNDER_CTA_MESSAGE}`;

export class ConversationEngine {
  constructor(
    private readonly store: Store,
    private readonly classifier: IntentClassifier,
    private readonly calendar: CalendarGateway,
    private readonly checkout: CheckoutGateway,
    private readonly sender: MessageSender,
    private readonly clinicDemoEnabled = true,
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
    if (!booking) return "I can’t find that test booking. Please ask the business owner for help.";
    if (booking.status === "confirmed" || booking.calendarEventId) {
      if (booking.status !== "confirmed") await this.store.updateBooking(booking.id, { status: "confirmed" });
      conversation.state = "confirmed";
      await this.save(conversation);
      return confirmationMessage(booking, this.clinicDemoEnabled);
    }
    if (booking.status === "awaiting_payment") return "Your test booking is still waiting for payment and is not confirmed yet.";
    if (booking.status === "paid") return "Your test payment was received and your appointment confirmation is still processing. Please try STATUS again shortly.";
    return INTEGRATION_FAILURE_MESSAGE;
  }

  private async handover(conversation: Conversation, decision: Exclude<SafetyDecision, undefined>, summary?: string, reply?: string) {
    const category = decision === "emergency" ? "emergency" : decision === "medical" ? "medical" : "general";
    await this.store.createHandoff({ waId: conversation.waId, category, summary: summary ?? `${category} handover triggered by automated safety rules.` });
    conversation.state = "handover";
    await this.save(conversation);
    if (reply) return reply;
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
    if (conversation.businessMode === "cleaner" && conversation.state !== "handover") {
      conversation.state = "new";
      await this.save(conversation);
      return CLEANER_WELCOME_MESSAGE;
    }
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
    if (conversation.state === "awaiting_payment") return "Hello! 👋 Your test booking is waiting for payment. Complete the test payment using the link already sent, or reply STATUS to check it.";
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
        return "I couldn’t work out the exact date and time. Could you send both? For example, next Saturday at 11am.";
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
      return "What date and time would suit you? For example, next Saturday at 11am.";
    }
    conversation.state = "awaiting_policy";
    await this.save(conversation);
    const policy = conversation.packageId === "ora_demo" ? ORA_DEMO_POLICY_MESSAGE : POLICY_MESSAGE;
    return `The test slot ${formatSlot(conversation.requestedStart)} is available. ${policy}`;
  }

  private async explorePackage(conversation: Conversation, packageId: ClinicPackageId) {
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
    if (!alternatives.length) return `${reason} I couldn’t find another available appointment, so the business owner will need to help.`;
    return `${reason} The next available appointment times are:\n${alternatives.map((slot, index) => `${index + 1}. ${formatSlot(slot)}`).join("\n")}\nTell me which date and time works best for you.`;
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
    const normalizedText = normalizeInput(text);

    if (cleanerActivationPattern.test(text)) {
      conversation = { waId: message.from, state: "new", businessMode: "cleaner", updatedAt: nowIso() };
      await this.save(conversation);
      return CLEANER_WELCOME_MESSAGE;
    }

    if (!this.clinicDemoEnabled && conversation.businessMode !== "cleaner" && conversation.packageId !== "ora_demo"
      && !["awaiting_payment", "confirmed", "handover"].includes(conversation.state)) {
      conversation = { waId: message.from, state: "new", updatedAt: nowIso() };
    }

    if (/^\s*(restart|start over)\s*$/i.test(text)) {
      conversation = { waId: message.from, state: "new", updatedAt: nowIso() };
      await this.save(conversation);
      return WELCOME_MESSAGE;
    }

    if (!this.clinicDemoEnabled && startDemoPattern.test(text)) {
      conversation = { waId: message.from, state: "awaiting_name", packageId: "ora_demo", updatedAt: nowIso() };
      await this.save(conversation);
      return ORA_DEMO_START_MESSAGE;
    }

    if (generalQuestionPattern.test(text)) {
      conversation.state = "new";
      await this.save(conversation);
      return "Of course — what would you like to know? You can write it naturally.";
    }

    const safety = detectSafety(text);
    if (safety) return this.handover(conversation, safety);

    if (callbackPattern.test(text)) {
      return this.handover(conversation, "general", "Customer requested a callback.", CALLBACK_REQUEST_MESSAGE);
    }

    if (statusPattern.test(text)) return this.bookingStatus(conversation);

    if (greetingPattern.test(text)) return this.greetingReply(conversation);

    if (conversation.state === "handover") return GENERAL_HANDOVER_MESSAGE;

    if (!this.clinicDemoEnabled && conversation.packageId === "ora_demo") {
      if (conversation.state === "awaiting_name") {
        const customerName = extractExplicitName(text)
          ?? (directNamePattern.test(text) && !reservedNamePattern.test(text) ? text : undefined);
        if (!customerName) {
          await this.save(conversation);
          return "Please send the name you would like on the demo booking.";
        }
        return this.advanceBooking(conversation, { ...emptyDecision(), wantsBooking: true, customerName });
      }
      if (conversation.state === "awaiting_datetime") {
        const localDateTime = extractExplicitLocalDateTime(normalizedText);
        if (!localDateTime) {
          await this.save(conversation);
          return "Please send both a date and an exact time. For example, next Saturday at 11am.";
        }
        return this.advanceBooking(conversation, { ...emptyDecision(), wantsBooking: true, localDateTime });
      }
    }

    if (!this.clinicDemoEnabled && conversation.packageId !== "ora_demo") {
      await this.save(conversation);
      if (conversation.businessMode === "cleaner") return CLEANER_TEMPLATE_PENDING_MESSAGE;
      if (demoClosingPattern.test(text)) return ORA_DEMO_CLOSING_MESSAGE;
      if (/\b(?:knowledge|faq|questions?|information|polic(?:y|ies)|learn (?:my|the) business)\b/i.test(normalizedText)) return ORA_KNOWLEDGE_MESSAGE;
      if (/\b(?:products?|services?|catalog(?:ue)?|prices?|stock|inventory)\b/i.test(normalizedText)) return ORA_KNOWLEDGE_MESSAGE;
      if (/\b(?:calendar|availability|appointments?|bookings?)\b/i.test(normalizedText) && questionPattern.test(normalizedText)) return ORA_BOOKING_MESSAGE;
      if (/\b(?:payments?|pay|deposit|checkout|stripe)\b/i.test(normalizedText)) return ORA_PAYMENT_MESSAGE;
      if (/\b(?:integrat(?:e|es|ion)|connect|api|software|system|crm)\b/i.test(normalizedText)) return ORA_INTEGRATION_MESSAGE;
      if (/\b(?:human|handover|hand off|owner|person|staff|judgement)\b/i.test(normalizedText)) return ORA_HANDOVER_MESSAGE;
      return bookingPattern.test(normalizedText)
        ? ORA_TEMPLATE_PENDING_MESSAGE
        : ORA_INFO_MESSAGE;
    }

    if (navigationHelpPattern.test(text)) return this.unknown(conversation, firstMessage);

    const faq = matchFaq(normalizedText);
    if (faq && (!bookingPattern.test(normalizedText) || negativeBookingPattern.test(normalizedText)
      || hypotheticalBookingPattern.test(normalizedText) || /\bbooking fee\b/i.test(normalizedText))) {
      const faqPackageId = parsePackage(normalizedText);
      if (faqPackageId) {
        conversation.packageId = faqPackageId;
        conversation.concernCategory = packageContext[faqPackageId].concern;
      }
      await this.rememberFaq(conversation, faq.id);
      return firstMessage ? `${WELCOME_MESSAGE}\n\n${faq.answer}` : faq.answer;
    }

    if (conversation.state === "offering_booking") {
      if (conversationalYesPattern.test(text)) {
        return this.advanceBooking(conversation, { ...emptyDecision(), intent: "book", wantsBooking: true, packageId: conversation.packageId === "ora_demo" ? null : conversation.packageId ?? null });
      }
      if (conversationalNoPattern.test(text)) {
        conversation.state = "new";
        await this.save(conversation);
        return "No problem. I can still explain another package or answer questions about treatments, prices and opening hours.";
      }
    }

    if (conversation.state === "awaiting_policy") {
      const correctedPackageId = extractCorrectedPackage(normalizedText);
      const correctedCustomerName = extractCorrectedName(normalizedText);
      const correctedLocalDateTime = extractExplicitLocalDateTime(normalizedText);
      if (!acceptPattern.test(text) && !declinePattern.test(text)
        && (correctedPackageId || correctedCustomerName || correctedLocalDateTime)) {
        return this.advanceBooking(conversation, {
          ...emptyDecision(), intent: "book", wantsBooking: true,
          packageId: correctedPackageId ?? null,
          customerName: correctedCustomerName ?? null,
          localDateTime: correctedLocalDateTime,
        });
      }
      if (declinePattern.test(text)) {
        const wasOraDemo = conversation.packageId === "ora_demo";
        conversation = { waId: message.from, state: "new", updatedAt: nowIso() };
        await this.save(conversation);
        return wasOraDemo
          ? "No problem. No booking or payment has been created. Reply START DEMO whenever you want to try again."
          : "No problem. No booking or payment has been created. Send BOOK whenever you want to start again.";
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
        return `Your ${pack.name} appointment time is being held. Pay the £${(pack.depositPence / 100).toFixed(2)} test deposit using this secure link: ${session.url}\nYour test booking is not confirmed until the test payment succeeds and you receive a confirmation message.`;
      } catch {
        return this.integrationFailure(conversation, booking.id);
      }
    }

    if (conversation.state === "awaiting_payment") {
      return "Your test booking is waiting for payment. It is not confirmed yet. Complete the test payment using the link already sent, or reply START OVER to cancel this conversation.";
    }

    const mentionedPackages = packageMentions(normalizedText);
    const packageIsAmbiguous = mentionedPackages.length > 1
      && (uncertainPackagePattern.test(text) || !packageCorrectionPattern.test(text));
    const correctedPackageId = extractCorrectedPackage(normalizedText);
    const packageId = packageIsAmbiguous ? undefined : correctedPackageId ?? parsePackage(normalizedText);
    const localDateTime = extractExplicitLocalDateTime(normalizedText);
    const explicitCustomerName = extractExplicitName(normalizedText);
    const hasCompleteBookingSignals = Boolean(packageId && explicitCustomerName
      && localDateTime);
    if (conversation.state === "awaiting_package" && packageId && !questionPattern.test(text)
      && !dateHintPattern.test(text) && text.split(/\s+/).length <= 5) {
      return this.advanceBooking(conversation, { ...emptyDecision(), wantsBooking: true, packageId });
    }
    if (conversation.state === "awaiting_name" && directNamePattern.test(text) && !reservedNamePattern.test(normalizedText)) {
      return this.advanceBooking(conversation, { ...emptyDecision(), wantsBooking: true, customerName: text });
    }
    if (conversation.state === "awaiting_datetime" && localDateTime) {
      return this.advanceBooking(conversation, { ...emptyDecision(), wantsBooking: true, localDateTime });
    }
    if (!bookingCollectionStates.includes(conversation.state as typeof bookingCollectionStates[number])
      && packageId && !bookingPattern.test(text) && (!questionPattern.test(text) || benignConcernPattern.test(text))
      && !dateHintPattern.test(text) && (text.split(/\s+/).length <= 5 || benignConcernPattern.test(text))) {
      const reply = await this.explorePackage(conversation, packageId);
      return firstMessage ? `${WELCOME_MESSAGE}\n\n${reply}` : reply;
    }

    let decision = await this.classify(normalizedText, conversation);
    const llmHandover = decision.handover !== "none" ? decision.handover
      : [15, 19].includes(decision.faqId ?? 0) ? "medical"
        : decision.faqId === 20 ? "general" : "none";
    const clearlyBenignBooking = hasCompleteBookingSignals && benignConcernPattern.test(normalizedText);
    if (llmHandover !== "none" && !(llmHandover === "medical" && clearlyBenignBooking)) {
      return this.handover(conversation, llmHandover);
    }
    if (packageIsAmbiguous) {
      delete conversation.packageId;
      delete conversation.concernCategory;
    }
    if (dateHintPattern.test(normalizedText) && !localDateTime) delete conversation.requestedStart;
    decision = {
      ...decision,
      faqId: decision.faqId ?? faq?.id ?? null,
      packageId: packageIsAmbiguous ? null : correctedPackageId ?? packageId ?? decision.packageId ?? null,
      customerName: decision.customerName ?? explicitCustomerName ?? null,
      localDateTime,
    };
    if (conversation.state === "awaiting_name" && !decision.customerName
      && directNamePattern.test(text) && !reservedNamePattern.test(normalizedText)) {
      decision = { ...decision, customerName: text };
    }
    if (negativeBookingPattern.test(normalizedText) || hypotheticalBookingPattern.test(normalizedText)) {
      decision = { ...decision, intent: decision.faqId ? "faq" : decision.packageId ? "explore_service" : "unknown", wantsBooking: false };
    } else if ((bookingPattern.test(normalizedText) || hasCompleteBookingSignals) && !decision.wantsBooking) {
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
    await this.notify(booking.waId, confirmationMessage(booking, this.clinicDemoEnabled));
  }
}
