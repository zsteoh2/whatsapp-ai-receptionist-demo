import OpenAI from "openai";
import { config } from "./config.js";
import type { PackageId } from "./types.js";

export interface LlmDecision {
  intent: "faq" | "book" | "provide_datetime" | "unknown";
  faqId: number | null;
  packageId: PackageId | null;
  localDateTime: string | null;
}

export interface IntentClassifier {
  classify(text: string, state: string): Promise<LlmDecision>;
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: { type: "string", enum: ["faq", "book", "provide_datetime", "unknown"] },
    faqId: { type: ["integer", "null"], minimum: 1, maximum: 20 },
    packageId: { type: ["string", "null"], enum: ["package_1", "package_2", "package_3", null] },
    localDateTime: { type: ["string", "null"], description: "Europe/London local ISO date and time without timezone, YYYY-MM-DDTHH:mm" },
  },
  required: ["intent", "faqId", "packageId", "localDateTime"],
} as const;

export class OpenAiIntentClassifier implements IntentClassifier {
  private readonly client: OpenAI;

  constructor(apiKey = config.openai.apiKey, baseURL = config.openai.baseUrl) {
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    this.client = new OpenAI({ apiKey, baseURL, timeout: 30_000, maxRetries: 0 });
  }

  async classify(text: string, state: string): Promise<LlmDecision> {
    const response = await this.client.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: "system",
          content: [
            "Classify a message for a fictional aesthetic clinic booking demo.",
            "Never answer the user and never add medical advice.",
            "faqId must refer to one of the 20 approved FAQs; otherwise use unknown.",
            "Package mapping: package_1 is hair and scalp, package_2 is skin, package_3 is anti-wrinkle.",
            "Extract a date/time only when the user clearly provides one. Interpret it in Europe/London.",
            `Current conversation state: ${state}. Current date/time: ${new Date().toISOString()}.`,
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
      return { intent: "unknown", faqId: null, packageId: null, localDateTime: null };
    }
    return parsed;
  }
}
