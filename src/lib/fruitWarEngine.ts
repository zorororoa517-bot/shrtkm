export interface FruitDef {
  label: string;
  emoji: string;
}

// نفس قائمة الفواكه من النسخة القديمة، بإيموجي بدل صور خارجية (بدون طلبات شبكة).
export const FRUIT_POOL: FruitDef[] = [
  { label: "تفاح", emoji: "🍎" },
  { label: "موز", emoji: "🍌" },
  { label: "برتقال", emoji: "🍊" },
  { label: "عنب", emoji: "🍇" },
  { label: "بطيخ", emoji: "🍉" },
  { label: "فراولة", emoji: "🍓" },
  { label: "أناناس", emoji: "🍍" },
  { label: "مانجو", emoji: "🥭" },
  { label: "كيوي", emoji: "🥝" },
  { label: "كرز", emoji: "🍒" },
  { label: "كمثرى", emoji: "🍐" },
  { label: "خوخ", emoji: "🍑" },
  { label: "ليمون", emoji: "🍋" },
  { label: "جوز الهند", emoji: "🥥" },
  { label: "رمان", emoji: "🌰" },
  { label: "تين", emoji: "🫐" },
  { label: "جوافة", emoji: "🍈" },
  { label: "أفوكادو", emoji: "🥑" },
  { label: "مشمش", emoji: "🍑" },
  { label: "برقوق", emoji: "🍇" },
  { label: "توت أزرق", emoji: "🫐" },
  { label: "توت العليق", emoji: "🍓" },
  { label: "يوسفي", emoji: "🍊" },
  { label: "جريب فروت", emoji: "🍊" },
  { label: "بابايا", emoji: "🍈" },
  { label: "تمر", emoji: "🌴" },
  { label: "كاكا", emoji: "🍅" },
  { label: "ليم أخضر", emoji: "🍏" },
  { label: "شمام", emoji: "🍈" },
  { label: "تمر هندي", emoji: "🌱" },
  { label: "كرز أسود", emoji: "🍒" },
  { label: "عنب أخضر", emoji: "🍏" },
  { label: "عنب أسود", emoji: "🍇" },
  { label: "برتقال دم", emoji: "🍊" },
  { label: "ليتشي", emoji: "🍑" },
  { label: "رامبوتان", emoji: "🍒" },
  { label: "مانجوستين", emoji: "🟣" },
  { label: "فاكهة التنين", emoji: "🐉" },
  { label: "كاجو", emoji: "🥜" },
  { label: "قشطة", emoji: "🍈" },
  { label: "توت بري", emoji: "🔴" },
  { label: "الكرمبولا", emoji: "⭐" },
  { label: "فاكهة الباشن", emoji: "🟡" },
  { label: "توت شامي", emoji: "🫐" },
  { label: "سفرجل", emoji: "🍐" },
  { label: "نبق", emoji: "🟠" },
  { label: "تفاح أخضر", emoji: "🍏" },
  { label: "عليق", emoji: "🍇" },
  { label: "الكمكوات", emoji: "🟠" },
  { label: "كستناء", emoji: "🌰" }
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** One unique fruit label per player, cycling through the pool (with a numeric
 *  suffix) if there are more players than fruit varieties. */
export function assignFruits(playerCount: number): string[] {
  const pool = shuffle(FRUIT_POOL);
  const usage: Record<string, number> = {};
  return Array.from({ length: playerCount }, (_, i) => {
    const base = pool[i % pool.length]!;
    usage[base.label] = (usage[base.label] ?? 0) + 1;
    const n = usage[base.label]!;
    return n > 1 ? `${base.label} ${n}` : base.label;
  });
}

export function emojiForFruitLabel(label: string): string {
  const base = label.replace(/\s+\d+$/, "");
  return FRUIT_POOL.find((f) => f.label === base)?.emoji ?? "🍒";
}
