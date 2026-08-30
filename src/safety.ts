export type SafetyDecision = "emergency" | "medical" | "general" | undefined;

const minorAge = String.raw`(?:[0-9]|1[0-7]|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)`;

const emergencyPatterns = [
  /\b(can'?t breathe|cannot breathe|hard to breathe|breathing difficulty|struggling to breathe|wheezing|chest (?:feels? )?tight|tight chest)\b/i,
  /\b(unconscious|loss of consciousness|passed out|black(?:ed|ing)? out)\b/i,
  /\b(severe pain|heavy bleeding|loads of blood|blood.{0,30}(?:won'?t|will not) stop|anaphylaxis|choking|seizure)\b/i,
  /\b(heart attack|stroke|life[- ]threatening|emergency)\b/i,
  /\b(?:lips?|tongue).{0,25}\b(?:swelling|swollen)\b|\b(?:swelling|swollen).{0,25}\b(?:lips?|tongue)\b/i,
  /\b(fainted|won'?t wake|will not wake|confused and drowsy)\b/i,
  /\bA\s*(?:&|and)\s*E\b/i,
];

const medicalPatterns = [
  /\b(pregnan(?:t|cy)|preggers?|preggo|(?:i'?m|i am) expecting|expecting (?:a )?baby|breastfeed(?:ing)?|nursing)\b/i,
  /\b(allerg(?:y|ic|ies)?|medication|meds|prescription|blood[- ]?thinn(?:ers?|ing)|anticoagulants?|medical condition|medical history)\b/i,
  /\b(?:on|taking|take)\s+(?:(?:blood[- ]?thinning|prescription)\s+)?(?:tablets?|pills?|warfarin|aspirin|antibiotics?)\b/i,
  /\b(adverse reaction|bad reaction|complication|symptom|diagnos)/i,
  /\b(diabet(?:es|ic)|eczema|autoimmune|isotretinoin|accutane|recent surgery|surgery (?:very )?recent(?:ly)?|bruise(?:s)? (?:very )?easily)\b/i,
  /\b(headache|dizz(?:y|iness)).{0,35}\bafter (?:an? |the |my )?(?:treatment|injection)\b/i,
  /\bmy scalp\b.{0,35}\b(?:flaky|dry|irritated|itchy|sore)\b/i,
  /\b(?:rash|puffed right up).{0,30}\bafter (?:a |the )?treatment\b/i,
  /\b(i have|i'm having|i am having|experiencing|after my).{0,40}\b(side effects?|reaction|pain|swelling)\b/i,
  /\bmy\b.{0,30}\b(?:(?:is|are|feels?|looks?)\s+(?:swollen|swelling|painful|hurting)|(?:blew|swelled)\s+up)\b/i,
  /\b(dose|dosage|injection technique|aftercare)\b/i,
  /\b(am i safe|safe for me|suitable for me|can i have botox)\b/i,
  new RegExp(String.raw`\b(?:under 18|minor|(?:age|aged|i'?m|i am)\s*${minorAge}\b)`, "i"),
  new RegExp(String.raw`\b(?:son|daughter|child|kid|lad|lass|niece|nephew|granddaughter|grandson|grandchild)\s+(?:is|'s|aged?|age)?\s*${minorAge}\b`, "i"),
];

const generalPatterns = [
  /\b(human|(?:real|actual) person|reception|someone to talk|somebody to talk|agent)\b/i,
  /\b(complaint|refund|money back|lawyer|solicitor|legal|suing|sue (?:you|the clinic)|court action|safeguard|custom quote)\b/i,
  /\b(?:forcing|pressuring|coercing|making) me to (?:have|get|book|do) (?:this |a |the )?(?:treatment|procedure|appointment)\b/i,
];

export function detectSafety(text: string): SafetyDecision {
  if (emergencyPatterns.some((pattern) => pattern.test(text))) return "emergency";
  if (medicalPatterns.some((pattern) => pattern.test(text))) return "medical";
  if (generalPatterns.some((pattern) => pattern.test(text))) return "general";
  return undefined;
}
