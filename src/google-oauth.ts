import { createHmac, timingSafeEqual } from "node:crypto";
import { google } from "googleapis";
import { config } from "./config.js";

const sign = (value: string) => createHmac("sha256", config.google.clientSecret ?? "").update(value).digest("base64url");

export function googleOAuthClient() {
  const { clientId, clientSecret, redirectUri } = config.google;
  if (!clientId || !clientSecret) throw new Error("Google OAuth is not configured");
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function createOAuthState() {
  const timestamp = Date.now().toString();
  return Buffer.from(`${timestamp}.${sign(timestamp)}`).toString("base64url");
}

export function verifyOAuthState(state: string) {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const [timestamp, signature] = decoded.split(".");
    if (!timestamp || !signature || Date.now() - Number(timestamp) > 10 * 60 * 1000) return false;
    const expected = sign(timestamp);
    return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
