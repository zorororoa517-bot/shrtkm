export type BadgeCtx = {
  login: string;
  wins: number;
  hosted: number;
  level: number;
  streak: number;
  spent: number;
  ownsAllFrames: boolean;
  isFounder: boolean;
  specialBadges: string[]; // admin-granted, from User.specialBadges
};

export interface BadgeDef {
  id: string;
  title: string;
  desc: string;
  icon: string;
  group?: string; // only the highest tier within a group is kept
  tier?: number;
  manual?: boolean; // granted by an admin, not computed from stats
  test: (ctx: BadgeCtx) => boolean;
}

export const BADGE_DEFS: BadgeDef[] = [
  { id: "owner", title: "مالك سهرتكم", desc: "تُمنح لصاحب القناة والموقع فقط.", icon: "👑", manual: true, test: (c) => c.specialBadges.includes("owner") },
  { id: "verified", title: "حساب موثّق", desc: "تُمنح يدويًا من الإدارة للحسابات الموثوقة.", icon: "✅", manual: true, test: (c) => c.specialBadges.includes("verified") },
  { id: "staff", title: "فريق العمل", desc: "تُمنح لأعضاء فريق العمل والمشرفين.", icon: "🛡️", manual: true, test: (c) => c.specialBadges.includes("staff") },
  { id: "vip", title: "VIP", desc: "تُمنح للأعضاء المميزين من الإدارة.", icon: "💎", manual: true, test: (c) => c.specialBadges.includes("vip") },
  { id: "bug_hunter", title: "مكتشف المشاكل", desc: "تُمنح لمن يكتشف مشكلة حقيقية ويبلغ عنها.", icon: "🐞", manual: true, test: (c) => c.specialBadges.includes("bug_hunter") },
  { id: "suggester", title: "صاحب اقتراح", desc: "تُمنح لمن يقترح فكرة تتضاف فعليًا للموقع.", icon: "💡", manual: true, test: (c) => c.specialBadges.includes("suggester") },
  { id: "rising_star", title: "نجم صاعد", desc: "حقق 5 فوز أو أكثر بأي لعبة.", group: "wins", tier: 1, icon: "🌟", test: (c) => c.wins >= 5 },
  { id: "legend", title: "بطل أسطوري", desc: "حقق 30 فوز أو أكثر بأي لعبة.", group: "wins", tier: 2, icon: "🏆", test: (c) => c.wins >= 30 },
  { id: "veteran_host", title: "مضيف محترف", desc: "استضاف 20 جولة أو أكثر.", icon: "🎪", test: (c) => c.hosted >= 20 },
  { id: "level10", title: "عضو مميز", desc: "وصل للمستوى 10 أو أعلى.", group: "level", tier: 1, icon: "🔥", test: (c) => c.level >= 10 },
  { id: "level25", title: "نخبة", desc: "وصل للمستوى 25 أو أعلى.", group: "level", tier: 2, icon: "💫", test: (c) => c.level >= 25 },
  { id: "streak7", title: "مواظب", desc: "سجّل حضورك 7 أيام متواصلة.", group: "streak", tier: 1, icon: "📅", test: (c) => c.streak >= 7 },
  { id: "streak30", title: "مواظب بلاتيني", desc: "سجّل حضورك 30 يوم متواصل.", group: "streak", tier: 2, icon: "🗓️", test: (c) => c.streak >= 30 },
  { id: "collector", title: "جامع", desc: "امتلك كل إطارات الصور المتوفرة بالمتجر.", icon: "🖼️", test: (c) => c.ownsAllFrames },
  { id: "spender", title: "داعم كبير", desc: "صرف 1000 نقطة أو أكثر بالمتجر.", icon: "🛍️", test: (c) => c.spent >= 1000 },
  { id: "founder", title: "فاوندر", desc: "من أول 50 حساب سجّلوا بالموقع منذ انطلاقه.", icon: "🪙", test: (c) => c.isFounder }
];

export function computeBadges(ctx: BadgeCtx) {
  const bestByGroup = new Map<string, BadgeDef>();
  for (const def of BADGE_DEFS) {
    if (!def.group || !def.test(ctx)) continue;
    const current = bestByGroup.get(def.group);
    if (!current || (def.tier ?? 0) > (current.tier ?? 0)) bestByGroup.set(def.group, def);
  }
  const seenGroups = new Set<string>();
  const result: BadgeDef[] = [];
  for (const def of BADGE_DEFS) {
    if (def.group) {
      if (seenGroups.has(def.group)) continue;
      seenGroups.add(def.group);
      const best = bestByGroup.get(def.group);
      if (best) result.push(best);
    } else if (def.test(ctx)) {
      result.push(def);
    }
  }
  return result;
}

/** Linear level curve: level N needs N*100 total XP. Simple and predictable. */
export function levelFromXp(xp: number) {
  let level = 1;
  let needCumulative = 100;
  while (xp >= needCumulative) {
    level += 1;
    needCumulative += level * 100;
  }
  const prevCumulative = needCumulative - level * 100;
  const into = xp - prevCumulative;
  const need = level * 100;
  return { level, into, need, pct: Math.min(100, Math.round((into / need) * 100)) };
}

/** XP formula: wins matter most, then hosting, then daily loyalty, then spending. */
export function computeXp(input: { wins: number; hosted: number; streak: number; spent: number }) {
  return input.wins * 50 + input.hosted * 30 + input.streak * 5 + Math.floor(input.spent * 0.2);
}
