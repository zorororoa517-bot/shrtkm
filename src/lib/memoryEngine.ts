export const MEMORY_ICONS = [
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
  "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🦄", "🐢",
  "🍎", "🍌", "🍇", "🍓", "🍉", "🍒", "🍍", "🥝", "🍑", "🥑",
  "⚽", "🏀", "🏈", "🎾", "🎱", "🎮", "🎲", "🎯", "🎸", "🎧",
  "🚗", "✈️", "🚀", "🚲", "🚁", "⛵", "🚂", "🛵", "🏍️", "🚤"
] as const;

export function pairCountForLevel(lv: number): number {
  return Math.min(50, 6 + (lv - 1) * 2);
}

export function durationForLevel(lv: number): number {
  return Math.min(900, 180 + pairCountForLevel(lv) * 12);
}

export function buildShuffledDeck(pairCount: number): number[] {
  const icons = Array.from({ length: pairCount }, (_, i) => i % MEMORY_ICONS.length);
  const deck = [...icons, ...icons];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}

export interface LevelReward {
  stars: 0 | 1 | 2 | 3;
  jump: 0 | 1 | 2 | 4;
}

/** Same tiered rule added to the HTML version: 5/10/15+ matched pairs → 1/2/4 level jump. */
export function levelRewardForMatches(matches: number): LevelReward {
  if (matches >= 15) return { stars: 3, jump: 4 };
  if (matches >= 10) return { stars: 2, jump: 2 };
  if (matches >= 5) return { stars: 1, jump: 1 };
  return { stars: 0, jump: 0 };
}
