export type SafetyDecision = "emergency" | "medical" | "general" | undefined;

const minorAge = String.raw`(?:[0-9]|1[0-7]|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)`;

const emergencyPatterns = [
  /\b(can'?t breathe|cannot breathe|breathing difficulty|struggling to breathe|wheezing)\b/i,
  /\b(unconscious|loss of consciousness|passed out|black(?:ed|ing)? out)\b/i,
  /\b(severe pain|heavy bleeding|loads of blood|blood.{0,30}(?:won'?t|will not) stop|anaphylaxis|choking|seizure)\b/i,
  /\b(heart attack|stroke|life[- ]threatening|emergency)\b/i,
  /\bA\s*(?:&|and)\s*E\b/i,
];

const medicalPatterns = [
  /\b(pregnan(?:t|cy)|preggers?|preggo|(?:i'?m|i am) expecting|expecting (?:a )?baby|breastfeed(?:ing)?|nursing)\b/i,
  /\b(allerg(?:y|ic|ies)?|medication|meds|prescription|blood[- ]?thinn(?:ers?|ing)|anticoagulants?|medical condition|medical history)\b/i,
  /\b(?:on|taking|take)\s+(?:(?:blood[- ]?thinning|prescription)\s+)?(?:tablets?|pills?|warfarin|aspirin|antibiotics?)\b/i,
  /\b(adverse reaction|complication|symptom|diagnos)/i,
  /\b(?:rash|puffed right up).{0,30}\bafter (?:a |the )?treatment\b/i,
  /\b(i have|i'm having|i am having|experiencing|after my).{0,40}\b(side effects?|reaction|pain|swelling)\b/i,
  /\bmy\b.{0,30}\b(?:(?:is|are|feels?|looks?)\s+(?:swollen|swelling|painful|hurting)|(?:blew|swelled)\s+up)\b/i,
  /\b(dose|dosage|injection technique|aftercare)\b/i,
  /\b(am i safe|safe for me|suitable for me|can i have botox)\b/i,
  new RegExp(String.raw`\b(?:under 18|minor|(?:age|aged|i'?m|i am)\s*${minorAge}\b)`, "i"),
  new RegExp(String.raw`\b(?:son|daughter|child|kid|lad|lass)\s+(?:is|'s|aged?|age)?\s*${minorAge}\b`, "i"),
];

const generalPatterns = [
  /\b(human|(?:real|actual) person|reception|someone to talk|somebody to talk|agent)\b/i,
  /\b(complaint|refund|money back|lawyer|legal|safeguard|custom quote)\b/i,
];

export function detectSafety(text: string): SafetyDecision {
  if (emergencyPatterns.some((pattern) => pattern.test(text))) return "emergency";
  if (medicalPatterns.some((pattern) => pattern.test(text))) return "medical";
  if (generalPatterns.some((pattern) => pattern.test(text))) return "general";
  return undefined;
}
