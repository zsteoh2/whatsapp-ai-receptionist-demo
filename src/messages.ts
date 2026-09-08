export const WELCOME_MESSAGE = [
  "Hello 👋 Welcome — my name is ORA, the business owner’s virtual assistant.",
  "This interactive demonstration shows how an AI assistant can support a business:",
  "• Ask what ORA can do",
  "• Explore enquiries and business knowledge",
  "• Explore bookings, payments and follow-up",
  "• Speak with our Founder",
  "",
  "To try the complete booking and £1 test-payment journey, reply START DEMO.",
  "",
  "Choose an option above or type naturally.",
].join("\n");

export const ORA_DEMO_JOURNEY_MESSAGE = [
  "Here is the journey I’ll demonstrate:",
  "1. Collect the booking details",
  "2. Check sample calendar availability",
  "3. Confirm the demonstration policy",
  "4. Create a secure £1 Stripe test-payment link",
  "5. Confirm the demo appointment after payment",
  "6. Offer a Founder follow-up",
  "",
  "No real appointment will be booked and Stripe remains in Test Mode.",
].join("\n");

export const ORA_DEMO_START_MESSAGE = `ORA Interactive Demo started ✅\n\n${ORA_DEMO_JOURNEY_MESSAGE}\n\nFirst, what name would you like on the demo booking?`;

export const ORA_DEMO_POLICY_MESSAGE =
  "This is a demonstration only. The £1 payment uses Stripe Test Mode, no real appointment is created, and the selected time is only used to demonstrate the workflow. Reply YES to continue to test payment, or NO to stop.";

export const FOUNDER_CTA_MESSAGE = [
  "Would you like to see what ORA could do for your business?",
  "• Test it again: reply START OVER",
  "• Speak with our Founder: text 07955 506757",
  "• Email: hau@convertbydigital.com",
].join("\n");

export const CALLBACK_REQUEST_MESSAGE =
  `Of course — I’ve logged a callback request for the business owner. This is a demonstration, so a real callback is not guaranteed.\n\n${FOUNDER_CTA_MESSAGE}`;

export const ORA_INFO_MESSAGE = [
  "ORA is a configurable WhatsApp AI assistant for businesses. It can answer approved questions, collect customer details, support bookings, check connected calendar availability, send secure payment links, record confirmed appointments, and arrange human follow-up.",
  "",
  "Its knowledge and actions are configured for each business. This demonstration will explain the capabilities without inventing a company’s services, prices, policies or availability.",
  "",
  "Ask me about knowledge, bookings, payments, integrations, safety, or human handover.",
].join("\n");

export const ORA_KNOWLEDGE_MESSAGE = [
  "ORA Business Knowledge Showcase 🧠",
  "",
  "A business can give ORA approved knowledge such as:",
  "• Products and services — names, descriptions, prices and available options",
  "• Operations — opening hours, service areas, availability and policies",
  "• Sales guidance — qualifying questions, approved comparisons and next steps",
  "• Customer support — FAQs, order or booking guidance and human escalation rules",
  "",
  "Using that knowledge, ORA can understand natural questions, find the relevant approved answer, explain or compare options, capture customer intent, and continue into a quote, booking, payment or human follow-up workflow.",
  "",
  "ORA does not invent missing products, prices or policies. If the approved knowledge does not contain an answer, it says so and directs the request to a person.",
  "",
  "This generic showcase contains no real company catalogue. Reply START DEMO to try the complete booking and £1 test-payment journey.",
].join("\n");

export const ORA_BOOKING_MESSAGE =
  "ORA can collect the details a business needs, check connected calendar availability, offer suitable times and record a confirmed appointment. The exact questions, availability rules and confirmation steps are configured for that business. Reply START DEMO to try the complete demonstration.";

export const ORA_PAYMENT_MESSAGE =
  "ORA can provide a secure payment link at the appropriate point in a configured journey and continue after a successful payment event. This demonstration uses test payments only and does not take real money. Reply START DEMO to go through the £1 Stripe test-payment journey.";

export const ORA_INTEGRATION_MESSAGE =
  "ORA can connect approved business tools through their supported APIs. This demonstration already includes WhatsApp, an AI model, structured storage, Google Calendar and Stripe Test Mode. Any additional integration must be checked and configured for the business rather than assumed.";

export const ORA_HANDOVER_MESSAGE =
  "ORA can recognise when a customer asks for a person, when information is missing, or when a request needs human judgement. It can collect the request and direct the customer to the business owner instead of pretending it can complete everything automatically.";

export const ORA_DEMO_CLOSING_MESSAGE =
  `Thank you for your time — that completes this ORA demonstration.\n\n${FOUNDER_CTA_MESSAGE}`;

export const ORA_TEMPLATE_PENDING_MESSAGE =
  `The active business template is currently being configured, so service enquiries and new bookings are temporarily unavailable. I won’t invent services, prices, or availability.\n\n${FOUNDER_CTA_MESSAGE}`;

export const CLEANER_WELCOME_MESSAGE = [
  "Cleaner Demo activated 🧹",
  "",
  "Hello 👋 My name is ORA, the cleaner’s virtual assistant.",
  "I can help with:",
  "• Requesting a cleaning quote",
  "• Booking a cleaning appointment",
  "• Asking about cleaning services",
  "• Requesting a callback",
  "",
  "The cleaner’s approved services, prices, coverage and availability are still being configured, so I won’t make them up.",
  "Reply START OVER to return to the main ORA demo.",
].join("\n");

export const CLEANER_TEMPLATE_PENDING_MESSAGE = [
  "You’re using the Cleaner Demo. The cleaner’s approved services, prices, coverage and availability are still being configured, so I won’t make them up.",
  "",
  "You can request a callback, or reply START OVER to return to the main ORA demo.",
].join("\n");

export const GENERAL_HANDOVER_MESSAGE =
  `Thanks for explaining. ORA won’t guess, so I’ve passed your request to the business owner for follow-up. This is a demonstration, so a real reply is not guaranteed.\n\n${FOUNDER_CTA_MESSAGE}`;

export const UNKNOWN_HELP_MESSAGE =
  "I’m not sure what you need yet. You can ask what ORA does, ask a general question, or request a callback. You can also type naturally in your own words.";

export const UNKNOWN_RETRY_MESSAGE =
  "I’m still not sure what you need. Try BOOK, SERVICES, or CALLBACK, or ask your question in one sentence.";

export const MEDICAL_HANDOVER_MESSAGE =
  "I can provide general information, but I can’t assess symptoms, medical history, personal risk, or treatment suitability through WhatsApp. This needs a suitably qualified human, so I’m stopping the automated conversation here.";

export const INTEGRATION_FAILURE_MESSAGE =
  "Sorry, I couldn’t complete your booking just now. Your appointment has not been confirmed. I’ve passed this to the business owner.";

export const EMERGENCY_MESSAGE =
  "I’m not able to assess urgent symptoms or provide emergency care. If someone is seriously ill or their life may be at risk, call 999. If you need urgent medical help but it is not life-threatening, use NHS 111 online or call 111. I’m stopping the automated booking conversation now.";

export const POLICY_MESSAGE =
  "You can cancel or reschedule free of charge with at least 24 hours’ notice. With less than 24 hours’ notice, or for a missed appointment, the test deposit may be retained. Reply YES to accept this demonstration policy and continue to test payment.";
