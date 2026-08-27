export type SafetyDecision = "emergency" | "medical" | "general" | undefined;

const emergencyPatterns = [
  /\b(can'?t breathe|cannot breathe|breathing difficulty)\b/i,
  /\b(unconscious|loss of consciousness|passed out)\b/i,
  /\b(severe pain|heavy bleeding|anaphylaxis|choking|seizure)\b/i,
  /\b(heart attack|stroke|life[- ]threatening|emergency)\b/i,
];

const medicalPatterns = [
  /\b(pregnan|breastfeed)/i,
  /\b(allerg|medication|prescription|medical condition|medical history)\b/i,
  /\b(adverse reaction|complication|symptom|diagnos)/i,
  /\b(i have|i'm having|i am having|experiencing|after my).{0,40}\b(side effects?|reaction|pain|swelling)\b/i,
  /\b(dose|dosage|injection technique|aftercare)\b/i,
  /\b(am i safe|safe for me|suitable for me|can i have botox)\b/i,
  /\b(under 18|minor|(?:age|aged|i'?m|i am)\s*(?:[0-9]|1[0-7]))\b/i,
];

const generalPatterns = [
  /\b(human|real person|reception|someone to talk|agent)\b/i,
  /\b(complaint|refund|lawyer|legal|safeguard|custom quote)\b/i,
];

export function detectSafety(text: string): SafetyDecision {
  if (emergencyPatterns.some((pattern) => pattern.test(text))) return "emergency";
  if (medicalPatterns.some((pattern) => pattern.test(text))) return "medical";
  if (generalPatterns.some((pattern) => pattern.test(text))) return "general";
  return undefined;
}
