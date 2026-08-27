import type { PackageId } from "./types.js";

export const CLINIC = {
  name: "Aesthetic Clinic",
  location: "Leeds, United Kingdom",
  timezone: "Europe/London",
  minimumNoticeMinutes: 120,
  cancellationNoticeHours: 24,
  openingHours: {
    1: { start: "10:00", end: "16:00" },
    2: { start: "10:00", end: "19:00" },
    3: { start: "10:00", end: "19:00" },
    4: { start: "10:00", end: "19:00" },
    5: { start: "10:00", end: "16:00" },
    6: { start: "10:00", end: "16:00" },
  } as Record<number, { start: string; end: string }>,
} as const;

export const PACKAGES = {
  package_1: {
    id: "package_1",
    number: 1,
    name: "Hair & Scalp Consultation",
    durationMinutes: 15,
    pricePence: 5000,
    depositPence: 1000,
  },
  package_2: {
    id: "package_2",
    number: 2,
    name: "Personalised Skin Consultation",
    durationMinutes: 30,
    pricePence: 10000,
    depositPence: 2000,
  },
  package_3: {
    id: "package_3",
    number: 3,
    name: "Anti-Wrinkle Consultation",
    durationMinutes: 60,
    pricePence: 15000,
    depositPence: 3000,
  },
} satisfies Record<PackageId, {
  id: PackageId;
  number: number;
  name: string;
  durationMinutes: number;
  pricePence: number;
  depositPence: number;
}>;

export function parsePackage(text: string): PackageId | undefined {
  const normalized = text.toLowerCase();
  if (/^\s*1\s*$/.test(normalized)) return "package_1";
  if (/^\s*2\s*$/.test(normalized)) return "package_2";
  if (/^\s*3\s*$/.test(normalized)) return "package_3";
  if (/\b(package\s*1|hair|scalp)\b/.test(normalized)) return "package_1";
  if (/\b(package\s*2|skin)\b/.test(normalized)) return "package_2";
  if (/\b(package\s*3|anti[- ]?wrinkle|botox)\b/.test(normalized)) return "package_3";
  return undefined;
}
