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

export function packageMentions(text: string): PackageId[] {
  const normalized = text.toLowerCase();
  if (/^\s*[123]\s*$/.test(normalized)) return [`package_${normalized.trim()}` as PackageId];
  return [
    /\b((?:p|package)\s*1|hair|scalp|hair loss|hair fall|thinning hair)\b/.test(normalized) && "package_1",
    /\b((?:p|package)\s*2|skin|acne|pigmentation|dark spots?|dry skin|oily skin)\b/.test(normalized) && "package_2",
    /\b((?:p|package)\s*3|anti[- ]?wrinkle|wrinkles?|botox|forehead lines?|frown lines?|crow'?s feet)\b/.test(normalized) && "package_3",
  ].filter(Boolean) as PackageId[];
}

export function parsePackage(text: string): PackageId | undefined {
  const matches = packageMentions(text);
  return matches.length === 1 ? matches[0] : undefined;
}
