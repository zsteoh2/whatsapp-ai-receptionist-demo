import express, { type Request, type Response } from "express";
import type Stripe from "stripe";
import { GoogleCalendarGateway, type CalendarGateway } from "./calendar.js";
import { config, readiness } from "./config.js";
import { ConversationEngine } from "./conversation.js";
import { createOAuthState, googleOAuthClient, verifyOAuthState } from "./google-oauth.js";
import { OpenAiIntentClassifier, type IntentClassifier, type LlmDecision } from "./llm.js";
import { MemoryStore, SupabaseStore, type Store } from "./store.js";
import { StripeCheckoutGateway, type CheckoutGateway } from "./stripe.js";
import { extractIncomingMessages, verifyMetaSignature, WhatsAppSender, type MessageSender } from "./whatsapp.js";

interface AppRequest extends Request { rawBody?: Buffer }

class UnavailableClassifier implements IntentClassifier {
  async classify(): Promise<LlmDecision> { return { intent: "unknown", faqId: null, packageId: null, localDateTime: null }; }
}
class UnavailableCalendar implements CalendarGateway {
  async validateSlot(): Promise<{ valid: boolean; reason?: string }> { throw new Error("Calendar unavailable"); }
  async findAlternatives(): Promise<string[]> { throw new Error("Calendar unavailable"); }
  async createBookingEvent(): Promise<string> { throw new Error("Calendar unavailable"); }
}
class UnavailableCheckout implements CheckoutGateway {
  async createCheckout(): Promise<{ id: string; url: string }> { throw new Error("Stripe unavailable"); }
}
class UnavailableSender implements MessageSender {
  async sendText(): Promise<void> { throw new Error("WhatsApp unavailable"); }
}

export interface AppDependencies {
  store: Store;
  engine: ConversationEngine;
  sender: MessageSender;
  stripeClient?: Stripe;
  storeMode: "supabase" | "memory";
}

export function createDependencies(): AppDependencies {
  const store: Store = config.supabase.url && config.supabase.serviceRoleKey
    ? new SupabaseStore(config.supabase.url, config.supabase.serviceRoleKey)
    : new MemoryStore();
  const classifier: IntentClassifier = config.openai.apiKey ? new OpenAiIntentClassifier() : new UnavailableClassifier();
  const calendar: CalendarGateway = config.google.clientId && config.google.clientSecret && config.google.calendarId
    ? new GoogleCalendarGateway(store) : new UnavailableCalendar();
  let checkout: CheckoutGateway = new UnavailableCheckout();
  let stripeClient: Stripe | undefined;
  if (config.stripe.secretKey?.startsWith("sk_test_")) {
    const stripe = new StripeCheckoutGateway();
    checkout = stripe;
    stripeClient = stripe.client;
  }
  const sender: MessageSender = config.meta.accessToken && config.meta.phoneNumberId ? new WhatsAppSender() : new UnavailableSender();
  return {
    store,
    engine: new ConversationEngine(store, classifier, calendar, checkout, sender),
    sender,
    stripeClient,
    storeMode: store instanceof SupabaseStore ? "supabase" : "memory",
  };
}

export function createApp(deps = createDependencies()) {
  const app = express();
  app.disable("x-powered-by");

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "whatsapp-ai-receptionist-demo", storage: deps.storeMode, integrations: readiness() });
  });

  app.get("/webhooks/whatsapp", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (config.meta.verifyToken && mode === "subscribe" && token === config.meta.verifyToken && typeof challenge === "string") return res.status(200).send(challenge);
    return res.sendStatus(403);
  });

  app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
    if (!deps.stripeClient || !config.stripe.webhookSecret) return res.status(503).json({ error: "Stripe webhook is not configured" });
    const signature = req.header("stripe-signature");
    if (!signature) return res.sendStatus(400);
    let claimedEventId: string | undefined;
    try {
      const event = deps.stripeClient.webhooks.constructEvent(req.body as Buffer, signature, config.stripe.webhookSecret);
      if (event.livemode) return res.status(400).json({ error: "Live Stripe events are not accepted by this demo" });
      if (!await deps.store.markEventProcessed("stripe", event.id)) return res.sendStatus(200);
      claimedEventId = event.id;
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id;
        if (session.payment_status === "paid" && bookingId) await deps.engine.confirmPaidBooking(bookingId);
      }
      return res.sendStatus(200);
    } catch (error) {
      if (claimedEventId) await deps.store.forgetEvent("stripe", claimedEventId).catch(() => undefined);
      console.error("stripe_webhook_failed", error instanceof Error ? error.name : "unknown_error");
      return res.sendStatus(400);
    }
  });

  app.use(express.json({ limit: "256kb", verify: (req, _res, buffer) => { (req as AppRequest).rawBody = Buffer.from(buffer); } }));

  app.post("/webhooks/whatsapp", (req: AppRequest, res) => {
    if (!req.rawBody || !verifyMetaSignature(req.rawBody, req.header("x-hub-signature-256"))) return res.sendStatus(401);
    const messages = extractIncomingMessages(req.body);
    res.sendStatus(200);
    // ponytail: same-process background work is sufficient for the scheduled demo; add a queue for production delivery guarantees.
    queueMicrotask(async () => {
      for (const message of messages) {
        try {
          const reply = await deps.engine.handleMessage(message);
          if (reply) await deps.sender.sendText(message.from, reply);
        } catch (error) {
          await deps.store.forgetEvent("meta", message.id).catch(() => undefined);
          console.error("whatsapp_message_failed", error instanceof Error ? error.name : "unknown_error");
        }
      }
    });
  });

  app.get("/auth/google", (_req, res) => {
    try {
      const url = googleOAuthClient().generateAuthUrl({
        access_type: "offline", prompt: "consent", state: createOAuthState(),
        scope: ["https://www.googleapis.com/auth/calendar"],
      });
      return res.redirect(url);
    } catch {
      return res.status(503).json({ error: "Google OAuth is not configured" });
    }
  });

  app.get("/auth/google/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    if (!code || !state || !verifyOAuthState(state)) return res.status(400).send("Invalid or expired OAuth request.");
    try {
      const { tokens } = await googleOAuthClient().getToken(code);
      if (tokens.refresh_token) await deps.store.saveGoogleRefreshToken(tokens.refresh_token);
      else if (!config.google.refreshToken && !await deps.store.getGoogleRefreshToken()) return res.status(400).send("Google did not return a refresh token. Revoke the app grant and try again.");
      return res.status(200).send("Google Calendar authorization completed. You may close this window.");
    } catch (error) {
      console.error("google_oauth_failed", error instanceof Error ? error.name : "unknown_error");
      return res.status(500).send("Google Calendar authorization failed.");
    }
  });

  app.get("/payment/success", (_req, res) => res.status(200).send("Stripe Test Checkout returned successfully. Return to WhatsApp and wait for booking confirmation."));
  app.get("/payment/cancelled", (_req, res) => res.status(200).send("Test payment cancelled. No booking has been confirmed."));

  app.use((_req: Request, res: Response) => res.sendStatus(404));
  return app;
}
