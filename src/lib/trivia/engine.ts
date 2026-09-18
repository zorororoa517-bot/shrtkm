/** Same lenient Arabic normalization the original games used (hamza/ta-marbuta/tashkeel-insensitive). */
export function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ًٌٍَُِّْ]/g, "");
}

export function isCorrectAnswer(guess: string, accepted: string[]): boolean {
  const norm = normalize(guess);
  if (!norm) return false;
  return accepted.some((a) => normalize(a) === norm);
}

export function shuffledIndices(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export type PromptKind = "text" | "flag" | "emoji" | "letter-hive" | "choices";

/** A single question, kept server-side only — `accepted` never reaches the client. */
export interface TriviaQuestion {
  kind: PromptKind;
  /** What's shown to players: a hint sentence, a flag emoji, an emoji combo, hive letters, etc. */
  display: string;
  /** Extra display data for "choices" kind (multiple choice buttons) or "letter-hive" (outer letters). */
  meta?: { choices?: string[]; center?: string; outerLetters?: string[]; category?: string };
  accepted: string[];
}

export interface PublicQuestion {
  kind: PromptKind;
  display: string;
  meta?: TriviaQuestion["meta"];
}

export function toPublicQuestion(q: TriviaQuestion): PublicQuestion {
  return { kind: q.kind, display: q.display, meta: q.meta };
}

/**
 * Validates a guess against a question. Most kinds just match against the
 * fixed `accepted` list. "letter-hive" (خلية الحروف) is the one dynamic
 * exception: any word containing the center letter (anywhere, not just at
 * the start) and built only from the hive's own letters counts as correct —
 * it isn't limited to the handful of example words in `accepted`.
 */
export function checkTriviaAnswer(question: TriviaQuestion, guess: string): boolean {
  const norm = normalize(guess);
  if (!norm) return false;

  if (question.kind === "letter-hive" && question.meta?.center && question.meta.outerLetters) {
    const centerNorm = normalize(question.meta.center);
    const allowed = new Set([centerNorm, ...question.meta.outerLetters.map(normalize)].join("").split(""));
    const dynamicMatch = norm.length >= 2 && norm.includes(centerNorm) && [...norm].every((ch) => allowed.has(ch));
    if (dynamicMatch) return true;
  }

  return isCorrectAnswer(guess, question.accepted);
}
