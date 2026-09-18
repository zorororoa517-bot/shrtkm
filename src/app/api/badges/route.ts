import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { buildBadgeCtx } from "@/lib/badgesData";
import { BADGE_DEFS, computeBadges, levelFromXp } from "@/lib/badgesEngine";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "لازم تسجّل دخول بتويتش عشان تشوف شاراتك" }, { status: 401 });

  const ctx = await buildBadgeCtx(user.id, user.login);
  const earned = computeBadges(ctx);
  const earnedIds = new Set(earned.map((b) => b.id));
  const level = levelFromXp(ctx.xp);

  return NextResponse.json({
    level,
    stats: { wins: ctx.wins, hosted: ctx.hosted, streak: ctx.streak, spent: ctx.spent },
    earned: earned.map((b) => ({ id: b.id, title: b.title, desc: b.desc, icon: b.icon })),
    all: BADGE_DEFS.filter((b) => !b.manual || earnedIds.has(b.id)).map((b) => ({
      id: b.id,
      title: b.title,
      desc: b.desc,
      icon: b.icon,
      manual: !!b.manual,
      earned: earnedIds.has(b.id)
    }))
  });
}
