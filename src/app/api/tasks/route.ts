import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { computeUserTaskStats } from "@/lib/tasksData";
import { TASK_DEFS, todayKey } from "@/lib/tasksEngine";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "لازم تسجّل دخول بتويتش عشان تشوف مهامك" }, { status: 401 });

  const stats = await computeUserTaskStats(user.id, user.login);
  const today = todayKey();
  const progressRows = await prisma.taskProgress.findMany({
    where: { login: user.login, periodKey: { in: [today, "all"] } }
  });
  const claimedMap = new Map(progressRows.map((r) => [`${r.taskId}:${r.periodKey}`, r.claimed]));

  const tasks = TASK_DEFS.map((def) => {
    const periodKey = def.period === "daily" ? today : "all";
    const progress = stats[def.stat];
    const claimed = claimedMap.get(`${def.id}:${periodKey}`) ?? false;
    return {
      id: def.id,
      title: def.title,
      icon: def.icon,
      target: def.target,
      reward: def.reward,
      period: def.period,
      progress: Math.min(progress, def.target),
      completed: progress >= def.target,
      claimed
    };
  });

  return NextResponse.json({ tasks, coins: user.coins });
}
