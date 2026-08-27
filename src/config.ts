import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const env = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value || undefined;
};

export const config = {
  nodeEnv: env("NODE_ENV") ?? "development",
  port: Number(env("PORT") ?? 3000),
  appBaseUrl: env("APP_BASE_URL") ?? "http://localhost:3000",
  openai: {
    apiKey: env("OPENAI_API_KEY"),
    baseUrl: env("OPENAI_BASE_URL"),
    model: env("OPENAI_MODEL") ?? "gpt-5.6-luna",
  },
  meta: {
    appSecret: env("META_APP_SECRET"),
    verifyToken: env("META_VERIFY_TOKEN"),
    accessToken: env("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: env("WHATSAPP_PHONE_NUMBER_ID"),
    apiVersion: env("WHATSAPP_API_VERSION") ?? "v23.0",
  },
  twilio: {
    accountSid: env("TWILIO_ACCOUNT_SID"),
    authToken: env("TWILIO_AUTH_TOKEN"),
    whatsappFrom: env("TWILIO_WHATSAPP_FROM"),
  },
  supabase: {
    url: env("SUPABASE_URL"),
    serviceRoleKey: env("SUPABASE_SERVICE_ROLE_KEY"),
  },
  google: {
    clientId: env("GOOGLE_CLIENT_ID"),
    clientSecret: env("GOOGLE_CLIENT_SECRET"),
    redirectUri: env("GOOGLE_REDIRECT_URI") ?? `${env("APP_BASE_URL") ?? "http://localhost:3000"}/auth/google/callback`,
    refreshToken: env("GOOGLE_REFRESH_TOKEN"),
    calendarId: env("GOOGLE_CALENDAR_ID"),
  },
  stripe: {
    secretKey: env("STRIPE_SECRET_KEY"),
    webhookSecret: env("STRIPE_WEBHOOK_SECRET"),
  },
} as const;

export function readiness() {
  const twilio = Boolean(config.twilio.accountSid && config.twilio.authToken && config.twilio.whatsappFrom);
  const meta = Boolean(config.meta.appSecret && config.meta.verifyToken && config.meta.accessToken && config.meta.phoneNumberId);
  return {
    openai: Boolean(config.openai.apiKey && config.openai.baseUrl),
    whatsapp: twilio || meta,
    supabase: Boolean(config.supabase.url && config.supabase.serviceRoleKey),
    google: Boolean(config.google.clientId && config.google.clientSecret && config.google.calendarId),
    stripe: Boolean(config.stripe.secretKey?.startsWith("sk_test_") && config.stripe.webhookSecret),
  };
}
