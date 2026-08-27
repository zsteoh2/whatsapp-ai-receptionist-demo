import { google, type calendar_v3 } from "googleapis";
import { DateTime } from "luxon";
import { CLINIC, PACKAGES } from "./clinic.js";
import { config } from "./config.js";
import type { Store } from "./store.js";
import type { Booking, PackageId } from "./types.js";

export interface CalendarGateway {
  validateSlot(startIso: string, packageId: PackageId, now?: DateTime): Promise<{ valid: boolean; reason?: string }>;
  findAlternatives(packageId: PackageId, from?: DateTime, limit?: number): Promise<string[]>;
  createBookingEvent(booking: Booking): Promise<string>;
}

export function parseLocalDateTime(value: string): DateTime | undefined {
  const dt = DateTime.fromISO(value, { zone: CLINIC.timezone });
  return dt.isValid ? dt : undefined;
}

export function validateBusinessSlot(start: DateTime, durationMinutes: number, now: DateTime = DateTime.now().setZone(CLINIC.timezone)) {
  if (start < now.plus({ minutes: CLINIC.minimumNoticeMinutes })) return "Appointments require at least two hours’ notice.";
  const hours = CLINIC.openingHours[start.weekday];
  if (!hours) return "The clinic is closed on that day.";
  const opening = DateTime.fromISO(`${start.toISODate()}T${hours.start}`, { zone: CLINIC.timezone });
  const closing = DateTime.fromISO(`${start.toISODate()}T${hours.end}`, { zone: CLINIC.timezone });
  if (start < opening || start.plus({ minutes: durationMinutes }) > closing) return "That time is outside appointment hours.";
  if (start.minute % 15 !== 0 || start.second !== 0) return "Appointments start in 15-minute intervals.";
  return undefined;
}

export class GoogleCalendarGateway implements CalendarGateway {
  constructor(private readonly store: Store) {}

  private async client(): Promise<calendar_v3.Calendar> {
    const { clientId, clientSecret, redirectUri, calendarId } = config.google;
    if (!clientId || !clientSecret || !calendarId) throw new Error("Google Calendar is not configured");
    const refreshToken = config.google.refreshToken ?? await this.store.getGoogleRefreshToken();
    if (!refreshToken) throw new Error("Google Calendar authorization is not complete");
    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    auth.setCredentials({ refresh_token: refreshToken });
    return google.calendar({ version: "v3", auth });
  }

  private async busy(start: DateTime, end: DateTime) {
    const calendar = await this.client();
    const response = await calendar.freebusy.query({ requestBody: {
      timeMin: start.toUTC().toISO(), timeMax: end.toUTC().toISO(), timeZone: CLINIC.timezone,
      items: [{ id: config.google.calendarId! }],
    } });
    return response.data.calendars?.[config.google.calendarId!]?.busy ?? [];
  }

  async validateSlot(startIso: string, packageId: PackageId, now?: DateTime) {
    const start = DateTime.fromISO(startIso, { setZone: true }).setZone(CLINIC.timezone);
    const duration = PACKAGES[packageId].durationMinutes;
    const reason = validateBusinessSlot(start, duration, now);
    if (reason) return { valid: false, reason };
    const end = start.plus({ minutes: duration });
    const busy = await this.busy(start, end);
    return busy.length ? { valid: false, reason: "That slot is already occupied." } : { valid: true };
  }

  async findAlternatives(packageId: PackageId, from = DateTime.now().setZone(CLINIC.timezone), limit = 3) {
    const duration = PACKAGES[packageId].durationMinutes;
    const rangeStart = from.plus({ minutes: CLINIC.minimumNoticeMinutes }).startOf("minute");
    const rangeEnd = rangeStart.plus({ days: 14 });
    const busy = await this.busy(rangeStart, rangeEnd);
    const slots: string[] = [];

    for (let day = rangeStart.startOf("day"); day < rangeEnd && slots.length < limit; day = day.plus({ days: 1 })) {
      const hours = CLINIC.openingHours[day.weekday];
      if (!hours) continue;
      let slot = DateTime.fromISO(`${day.toISODate()}T${hours.start}`, { zone: CLINIC.timezone });
      const close = DateTime.fromISO(`${day.toISODate()}T${hours.end}`, { zone: CLINIC.timezone });
      while (slot.plus({ minutes: duration }) <= close && slots.length < limit) {
        const end = slot.plus({ minutes: duration });
        const overlaps = busy.some((period) => {
          const busyStart = DateTime.fromISO(period.start ?? "");
          const busyEnd = DateTime.fromISO(period.end ?? "");
          return busyStart < end && busyEnd > slot;
        });
        if (slot >= rangeStart && !overlaps) slots.push(slot.toUTC().toISO()!);
        slot = slot.plus({ minutes: 15 });
      }
    }
    return slots;
  }

  async createBookingEvent(booking: Booking) {
    const calendar = await this.client();
    const pack = PACKAGES[booking.packageId];
    const start = DateTime.fromISO(booking.requestedStart, { setZone: true });
    const end = start.plus({ minutes: pack.durationMinutes });
    const response = await calendar.events.insert({
      calendarId: config.google.calendarId!,
      requestBody: {
        summary: `${pack.name} — ${booking.customerName}`,
        description: `WhatsApp: ${booking.waId}\nDemo booking: ${booking.id}\nStripe Test deposit: £${(booking.depositPence / 100).toFixed(2)}`,
        start: { dateTime: start.toISO(), timeZone: CLINIC.timezone },
        end: { dateTime: end.toISO(), timeZone: CLINIC.timezone },
        extendedProperties: { private: { demo_booking_id: booking.id } },
      },
    });
    if (!response.data.id) throw new Error("Google Calendar did not return an event ID");
    return response.data.id;
  }
}
