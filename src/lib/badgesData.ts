import { prisma } from "@/lib/prisma";
import { computeUserTaskStats } from "@/lib/tasksData";
import type { BadgeCtx } from "@/lib/badgesEngine";
import { computeXp, levelFromXp } from "@/lib/badgesEngine";

const FOUNDER_LIMIT = 50;

export async function buildBadgeCtx(userId: string, login: string): Promise<BadgeCtx & { xp: number }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const [stats, purchases, frameItems, founderRank] = await Promise.all([
    computeUserTaskStats(userId, login),
    prisma.storeItemPurchase.findMany({ where: { userId }, include: { item: true } }),
    prisma.storeItem.findMany({ where: { category: "AVATAR_FRAME" } }),
    prisma.user.count({ where: { createdAt: { lte: user.createdAt } } })
  ]);

  const spent = purchases.reduce((sum, p) => sum + p.item.price, 0);
  const ownedFrameSlugs = new Set(purchases.filter((p) => p.item.category === "AVATAR_FRAME").map((p) => p.item.slug));
  const ownsAllFrames = frameItems.length > 0 && frameItems.every((f) => ownedFrameSlugs.has(f.slug));
  const xp = computeXp({ wins: stats.totalWins, hosted: stats.totalHosted, streak: user.currentStreak, spent });
  const { level } = levelFromXp(xp);

  return {
    login,
    wins: stats.totalWins,
    hosted: stats.totalHosted,
    level,
    streak: user.currentStreak,
    spent,
    ownsAllFrames,
    isFounder: founderRank <= FOUNDER_LIMIT,
    specialBadges: JSON.parse(user.specialBadges) as string[],
    xp
  };
}

/** Bumps the daily login streak: +1 if the user was last active yesterday,
 *  reset to 1 if they skipped a day (or this is their first visit), and left
 *  untouched if they already visited today. Call this from a route every
 *  signed-in page hits once per load (/api/me). */
export async function touchLoginStreak(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const todayStr = new Date().toISOString().slice(0, 10);
  const lastStr = user.lastActiveDate ? user.lastActiveDate.toISOString().slice(0, 10) : null;
  if (lastStr === todayStr) return; // already counted today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const nextStreak = lastStr === yesterdayStr ? user.currentStreak + 1 : 1;
  await prisma.user.update({ where: { id: userId }, data: { currentStreak: nextStreak, lastActiveDate: new Date() } });
}
