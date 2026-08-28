export type PackageId = "package_1" | "package_2" | "package_3";

export type ConversationState =
  | "new"
  | "awaiting_package"
  | "awaiting_name"
  | "awaiting_datetime"
  | "awaiting_policy"
  | "awaiting_payment"
  | "offering_booking"
  | "clarifying_once"
  | "clarifying_twice"
  | "confirmed"
  | "handover";

export interface Conversation {
  waId: string;
  state: ConversationState;
  customerName?: string;
  packageId?: PackageId;
  requestedStart?: string;
  concernCategory?: string;
  bookingId?: string;
  updatedAt: string;
}

export type BookingStatus =
  | "awaiting_payment"
  | "paid"
  | "confirmed"
  | "calendar_conflict"
  | "failed"
  | "cancelled";

export interface Booking {
  id: string;
  waId: string;
  customerName: string;
  packageId: PackageId;
  requestedStart: string;
  confirmedStart?: string;
  depositPence: number;
  status: BookingStatus;
  stripeSessionId?: string;
  calendarEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Handoff {
  id: string;
  waId: string;
  category: "general" | "medical" | "emergency" | "integration";
  summary: string;
  status: "open" | "closed";
  createdAt: string;
}

export interface IncomingMessage {
  id: string;
  from: string;
  text: string;
}
