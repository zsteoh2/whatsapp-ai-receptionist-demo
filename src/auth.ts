import { createClient } from "@supabase/supabase-js";
import type { RequestHandler } from "express";

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthVerifier {
  getUser(accessToken: string): Promise<AuthUser | undefined>;
}

export class SupabaseAuthVerifier implements AuthVerifier {
  private readonly client;

  constructor(url: string, publishableKey: string) {
    this.client = createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }

  async getUser(accessToken: string) {
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error || !data.user) return undefined;
    return { id: data.user.id, email: data.user.email };
  }
}

export function requireUser(verifier?: AuthVerifier): RequestHandler {
  return async (req, res, next) => {
    if (!verifier) return res.status(503).json({ error: "Supabase Auth is not configured" });
    const match = req.header("authorization")?.match(/^Bearer\s+(\S+)$/i);
    if (!match) return res.status(401).json({ error: "Authentication required" });
    try {
      const user = await verifier.getUser(match[1]!);
      if (!user) return res.status(401).json({ error: "Invalid or expired access token" });
      res.locals.user = user;
      return next();
    } catch {
      return res.status(503).json({ error: "Authentication service unavailable" });
    }
  };
}
