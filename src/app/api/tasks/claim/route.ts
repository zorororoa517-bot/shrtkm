import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/currentUser";
import { computeUserTaskStats } from "@/lib/tasksData";
import { TASK_DEFS, todayKey } from "@/lib/tasksEngine";
import { prisma } from "@/lib/prisma";

const schema = z.object({ taskId: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "لازم تسجّل دخول بتويتش" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });

  const def = TASK_DEFS.find((t) => t.id === parsed.data.taskId);
  if (!def) return NextResponse.json({ error: "مهمة غير موجودة" }, { status: 404 });

  const periodKey = def.period === "daily" ? todayKey() : "all";
  const existing = await prisma.taskProgress.findUnique({
    where: { login_taskId_periodKey: { login: user.login, taskId: def.id, periodKey } }
  });
  if (existing?.claimed) return NextResponse.json({ error: "استلمت هالمهمة قبل كذا" }, { status: 409 });

  const stats = await computeUserTaskStats(user.id, user.login);
  const progress = stats[def.stat];
  if (progress < def.target) return NextResponse.json({ error: "لسا ما وصلت الهدف" }, { status: 400 });

  await prisma.$transaction([
    prisma.taskProgress.upsert({
      where: { login_taskId_periodKey: { login: user.login, taskId: def.id, periodKey } },
      create: { login: user.login, taskId: def.id, periodKey, progress, claimed: true },
      update: { claimed: true, progress }
    }),
    prisma.user.update({ where: { id: user.id }, data: { coins: { increment: def.reward } } })
  ]);

  return NextResponse.json({ ok: true, reward: def.reward });
}
