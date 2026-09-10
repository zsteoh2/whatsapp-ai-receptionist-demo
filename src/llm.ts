import OpenAI from "openai";
import { config } from "./config.js";
import { FAQS } from "./faq.js";
import type { ClinicPackageId, Conversation } from "./types.js";
import { oraPrompt, oraSchema, parseOraDecision, type OraDecision } from "./ora.js";

export type IntentContext = Pick<Conversation, "state" | "packageId" | "concernCategory" | "customerName" | "requestedStart">;

export interface LlmDecision {
  intent: "faq" | "explore_service" | "book" | "provide_datetime" | "unknown";
  handover: "none" | "medical" | "general" | "emergency";
  wantsBooking: boolean;
  faqId: number | null;
  packageId: ClinicPackageId | null;
  customerName: string | null;
  localDateTime: string | null;
}

export interface IntentClassifier {
  classify(text: string, context: IntentContext): Promise<LlmDecision>;
  classifyOra?(text: string, context: IntentContext): Promise<OraDecision>;
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: { type: "string", enum: ["faq", "explore_service", "book", "provide_datetime", "unknown"] },
    handover: { type: "string", enum: ["none", "medical", "general", "emergency"] },
    wantsBooking: { type: "boolean" },
    faqId: { type: ["integer", "null"], minimum: 1, maximum: 20 },
    packageId: { type: ["string", "null"], enum: ["package_1", "package_2", "package_3", null] },
    customerName: { type: ["string", "null"], maxLength: 60 },
    localDateTime: { type: ["string", "null"], description: "Europe/London local ISO date and time without timezone, YYYY-MM-DDTHH:mm" },
  },
  required: ["intent", "handover", "wantsBooking", "faqId", "packageId", "customerName", "localDateTime"],
} as const;

export class OpenAiIntentClassifier implements IntentClassifier {
  private readonly client: OpenAI;

  constructor(apiKey = config.openai.apiKey, baseURL = config.openai.baseUrl) {
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    this.client = new OpenAI({ apiKey, baseURL, timeout: 30_000, maxRetries: 0 });
  }

  async classifyOra(text: string, context: IntentContext): Promise<OraDecision> {
    const response = await this.client.chat.completions.create({
      model: config.openai.model,
      reasoning_effort: "medium",
      messages: [
        { role: "system", content: oraPrompt(context) },
        { role: "user", content: text.slice(0, 2000) },
      ],
      response_format: { type: "json_schema", json_schema: { name: "ora_message_decision", strict: true, schema: oraSchema } },
    }, { timeout: 30_000 });
    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("No ORA classification");
    return parseOraDecision(content);
  }

  async classify(text: string, context: IntentContext): Promise<LlmDecision> {
    const response = await this.client.chat.completions.create({
      model: config.openai.model,
      reasoning_effort: "medium",
      messages: [
        {
          role: "system",
          content: [
            "Classify a message for a fictional aesthetic clinic booking demo.",
            "Never answer the user and never add medical advice.",
            "Set handover=medical for personal symptoms, suitability, allergies, medication or meds, blood thinners, medical conditions, pregnancy or breastfeeding, previous complications, dosage, personalised aftercare, or anyone under 18.",
            "Set handover=emergency for severe pain, breathing difficulty, heavy bleeding, unconsciousness, or another urgent danger. Set handover=general for a human request, complaint, refund dispute, legal concern, or safeguarding issue. Otherwise use none.",
            "Generic approved FAQ questions about risks or treatment information use handover=none unless they include the customer's personal circumstances.",
            "Extract every independently stated field even when the message contains more than one request.",
            "faqId must refer to one of the 20 approved FAQs; otherwise use unknown.",
            "faqId may be present together with wantsBooking when the customer asks a FAQ and also requests a booking.",
            `Approved FAQs: ${FAQS.map((faq) => `${faq.id}=${faq.question}`).join(" | ")}.`,
            "Package mapping: package_1/P1 is hair and scalp, package_2/P2 is skin, package_3/P3 is anti-wrinkle.",
            "Set wantsBooking true and use book when the user explicitly asks to book, schedule, or make an appointment; questions about policy or availability alone are not booking requests.",
            "Use explore_service when the user mentions a service or concern without explicitly asking to book.",
            "Extract customerName only when the user explicitly gives a preferred booking name, including phrases such as 'put Sam on it'. Never infer a name from greetings, services, or other text.",
            "Extract a date/time only when the user supplies a specific clock time. Never choose a clock time for vague periods such as morning or afternoon. Interpret explicit times in Europe/London.",
            `Structured conversation memory: ${JSON.stringify(context)}. Current date/time: ${new Date().toISOString()}.`,
          ].join(" "),
        },
        { role: "user", content: text.slice(0, 500) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "clinic_message_decision",
          strict: true,
          schema,
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("The LLM returned no classification");
    const parsed = JSON.parse(content) as LlmDecision;
    if (parsed.faqId !== null && (parsed.faqId < 1 || parsed.faqId > 20)) {
      return { ...parsed, intent: "unknown", faqId: null };
    }
    return parsed;
  }
}
