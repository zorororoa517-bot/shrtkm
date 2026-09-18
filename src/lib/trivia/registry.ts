import type { TriviaQuestion } from "./engine";
import { letterCellBank } from "./banks/letterCell";
import { fastestWordBank } from "./banks/fastestWord";
import { flagsGuessBank } from "./banks/flagsGuess";
import { capitalsGuessBank } from "./banks/capitalsGuess";
import { emojiGuessBank } from "./banks/emojiGuess";
import { quizBank } from "./banks/quiz";

export interface TriviaGameConfig {
  slug: string;
  title: string;
  emoji: string;
  instructions: string;
  defaultTimerSeconds: number;
  bank: TriviaQuestion[];
}

export const TRIVIA_GAMES: Record<string, TriviaGameConfig> = {
  "letter-cell": {
    slug: "letter-cell",
    title: "خلية الحروف",
    emoji: "🔤",
    instructions: "اكتب كلمة فيها الحرف المركزي (بأي مكان منها) ومكوّنة بس من حروف الخلية",
    defaultTimerSeconds: 25,
    bank: letterCellBank
  },
  "fastest-word": {
    slug: "fastest-word",
    title: "أسرع كلمة",
    emoji: "⚡",
    instructions: "أول واحد يكتب نفس الكلمة بالضبط بالشات ياخذ النقطة",
    defaultTimerSeconds: 12,
    bank: fastestWordBank
  },
  "flags-guess": {
    slug: "flags-guess",
    title: "تخمين الأعلام",
    emoji: "🏳️",
    instructions: "اكتب اسم الدولة صاحبة العلم",
    defaultTimerSeconds: 15,
    bank: flagsGuessBank
  },
  "capitals-guess": {
    slug: "capitals-guess",
    title: "تخمين العواصم",
    emoji: "🏛️",
    instructions: "اكتب اسم عاصمة الدولة الظاهرة",
    defaultTimerSeconds: 15,
    bank: capitalsGuessBank
  },
  "emoji-guess": {
    slug: "emoji-guess",
    title: "تخمين الإيموجي",
    emoji: "🧩",
    instructions: "خمّن العمل الفني من مجموعة الإيموجي",
    defaultTimerSeconds: 20,
    bank: emojiGuessBank
  },
  quiz: {
    slug: "quiz",
    title: "الكويز",
    emoji: "❓",
    instructions: "جاوب على السؤال أسرع من غيرك",
    defaultTimerSeconds: 15,
    bank: quizBank
  }
};

export function getTriviaGame(slug: string): TriviaGameConfig | null {
  return TRIVIA_GAMES[slug] ?? null;
}
