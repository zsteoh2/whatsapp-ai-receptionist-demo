import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import type { IncomingMessage } from "./types.js";

export interface MessageSender {
  sendText(to: string, text: string): Promise<void>;
}

export class WhatsAppSender implements MessageSender {
  async sendText(to: string, text: string) {
    const { accessToken, phoneNumberId, apiVersion } = config.meta;
    if (!accessToken || !phoneNumberId) throw new Error("WhatsApp is not configured");
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body: text } }),
    });
    if (!response.ok) throw new Error(`WhatsApp send failed with status ${response.status}`);
  }
}

export function verifyMetaSignature(rawBody: Buffer, signature: string | undefined, appSecret = config.meta.appSecret) {
  if (!appSecret || !signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const actual = signature.slice(7);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export function extractIncomingMessages(payload: unknown): IncomingMessage[] {
  const messages: IncomingMessage[] = [];
  const body = payload as { entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ id?: string; from?: string; type?: string; text?: { body?: string } }> } }> }> };
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (message.type === "text" && message.id && message.from && message.text?.body) {
          messages.push({ id: message.id, from: message.from, text: message.text.body.trim() });
        }
      }
    }
  }
  return messages;
}
