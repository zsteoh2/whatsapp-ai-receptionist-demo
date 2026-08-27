import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Booking, Conversation, Handoff } from "./types.js";

export interface Store {
  getConversation(waId: string): Promise<Conversation | undefined>;
  saveConversation(conversation: Conversation): Promise<void>;
  createBooking(booking: Booking): Promise<void>;
  getBooking(id: string): Promise<Booking | undefined>;
  updateBooking(id: string, patch: Partial<Booking>): Promise<Booking>;
  markEventProcessed(provider: "meta" | "stripe", eventId: string): Promise<boolean>;
  forgetEvent(provider: "meta" | "stripe", eventId: string): Promise<void>;
  createHandoff(input: Omit<Handoff, "id" | "createdAt" | "status">): Promise<Handoff>;
  saveGoogleRefreshToken(refreshToken: string): Promise<void>;
  getGoogleRefreshToken(): Promise<string | undefined>;
}

export class MemoryStore implements Store {
  readonly conversations = new Map<string, Conversation>();
  readonly bookings = new Map<string, Booking>();
  readonly events = new Set<string>();
  readonly handoffs: Handoff[] = [];
  private googleRefreshToken?: string;

  async getConversation(waId: string) { return this.conversations.get(waId); }
  async saveConversation(conversation: Conversation) { this.conversations.set(conversation.waId, structuredClone(conversation)); }
  async createBooking(booking: Booking) { this.bookings.set(booking.id, structuredClone(booking)); }
  async getBooking(id: string) { return this.bookings.get(id); }
  async updateBooking(id: string, patch: Partial<Booking>) {
    const existing = this.bookings.get(id);
    if (!existing) throw new Error("Booking not found");
    const updated = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
    this.bookings.set(id, updated);
    return updated;
  }
  async markEventProcessed(provider: "meta" | "stripe", eventId: string) {
    const key = `${provider}:${eventId}`;
    if (this.events.has(key)) return false;
    this.events.add(key);
    return true;
  }
  async forgetEvent(provider: "meta" | "stripe", eventId: string) { this.events.delete(`${provider}:${eventId}`); }
  async createHandoff(input: Omit<Handoff, "id" | "createdAt" | "status">) {
    const handoff: Handoff = { ...input, id: randomUUID(), status: "open", createdAt: new Date().toISOString() };
    this.handoffs.push(handoff);
    return handoff;
  }
  async saveGoogleRefreshToken(refreshToken: string) { this.googleRefreshToken = refreshToken; }
  async getGoogleRefreshToken() { return this.googleRefreshToken; }
}

const conversationFromRow = (row: Record<string, unknown>): Conversation => ({
  waId: String(row.wa_id),
  state: row.state as Conversation["state"],
  customerName: row.customer_name ? String(row.customer_name) : undefined,
  packageId: row.package_id as Conversation["packageId"],
  requestedStart: row.requested_start ? String(row.requested_start) : undefined,
  concernCategory: row.concern_category ? String(row.concern_category) : undefined,
  bookingId: row.booking_id ? String(row.booking_id) : undefined,
  updatedAt: String(row.updated_at),
});

const bookingFromRow = (row: Record<string, unknown>): Booking => ({
  id: String(row.id),
  waId: String(row.wa_id),
  customerName: String(row.customer_name),
  packageId: row.package_id as Booking["packageId"],
  requestedStart: String(row.requested_start),
  confirmedStart: row.confirmed_start ? String(row.confirmed_start) : undefined,
  depositPence: Number(row.deposit_pence),
  status: row.status as Booking["status"],
  stripeSessionId: row.stripe_session_id ? String(row.stripe_session_id) : undefined,
  calendarEventId: row.calendar_event_id ? String(row.calendar_event_id) : undefined,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export class SupabaseStore implements Store {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async getConversation(waId: string) {
    const { data, error } = await this.client.from("conversations").select("*").eq("wa_id", waId).maybeSingle();
    if (error) throw error;
    return data ? conversationFromRow(data) : undefined;
  }

  async saveConversation(value: Conversation) {
    const { error } = await this.client.from("conversations").upsert({
      wa_id: value.waId,
      state: value.state,
      customer_name: value.customerName ?? null,
      package_id: value.packageId ?? null,
      requested_start: value.requestedStart ?? null,
      concern_category: value.concernCategory ?? null,
      booking_id: value.bookingId ?? null,
      updated_at: value.updatedAt,
    });
    if (error) throw error;
  }

  async createBooking(value: Booking) {
    const { error } = await this.client.from("bookings").insert({
      id: value.id,
      wa_id: value.waId,
      customer_name: value.customerName,
      package_id: value.packageId,
      requested_start: value.requestedStart,
      confirmed_start: value.confirmedStart ?? null,
      deposit_pence: value.depositPence,
      status: value.status,
      stripe_session_id: value.stripeSessionId ?? null,
      calendar_event_id: value.calendarEventId ?? null,
      created_at: value.createdAt,
      updated_at: value.updatedAt,
    });
    if (error) throw error;
  }

  async getBooking(id: string) {
    const { data, error } = await this.client.from("bookings").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? bookingFromRow(data) : undefined;
  }

  async updateBooking(id: string, patch: Partial<Booking>) {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.stripeSessionId !== undefined) row.stripe_session_id = patch.stripeSessionId;
    if (patch.calendarEventId !== undefined) row.calendar_event_id = patch.calendarEventId;
    if (patch.confirmedStart !== undefined) row.confirmed_start = patch.confirmedStart;
    const { data, error } = await this.client.from("bookings").update(row).eq("id", id).select("*").single();
    if (error) throw error;
    return bookingFromRow(data);
  }

  async markEventProcessed(provider: "meta" | "stripe", eventId: string) {
    const { error } = await this.client.from("processed_events").insert({ provider, event_id: eventId });
    if (!error) return true;
    if (error.code === "23505") return false;
    throw error;
  }

  async forgetEvent(provider: "meta" | "stripe", eventId: string) {
    const { error } = await this.client.from("processed_events").delete().eq("provider", provider).eq("event_id", eventId);
    if (error) throw error;
  }

  async createHandoff(input: Omit<Handoff, "id" | "createdAt" | "status">) {
    const row = { id: randomUUID(), wa_id: input.waId, category: input.category, summary: input.summary, status: "open" };
    const { data, error } = await this.client.from("handoffs").insert(row).select("*").single();
    if (error) throw error;
    return {
      id: String(data.id), waId: String(data.wa_id), category: data.category,
      summary: String(data.summary), status: data.status, createdAt: String(data.created_at),
    } as Handoff;
  }

  async saveGoogleRefreshToken(refreshToken: string) {
    const { error } = await this.client.from("integration_secrets").upsert({ name: "google_refresh_token", value: refreshToken, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  async getGoogleRefreshToken() {
    const { data, error } = await this.client.from("integration_secrets").select("value").eq("name", "google_refresh_token").maybeSingle();
    if (error) throw error;
    return data?.value ? String(data.value) : undefined;
  }
}
