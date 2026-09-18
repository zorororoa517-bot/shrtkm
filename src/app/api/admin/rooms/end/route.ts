import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

const schema = z.object({
  gameType: z.enum(["roulette", "chairs", "fruit-war", "sword-clash", "drawing", "trivia", "memory"]),
  code: z.string().min(1)
});
type GameType = z.infer<typeof schema>["gameType"];

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "بس الأدمن يقدر يسوي هالشي" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });
  const { gameType, code } = parsed.data;

  const models: Record<GameType, () => Promise<unknown>> = {
    roulette: () => prisma.room.delete({ where: { code } }),
    chairs: () => prisma.chairsRoom.delete({ where: { code } }),
    "fruit-war": () => prisma.fruitWarRoom.delete({ where: { code } }),
    "sword-clash": () => prisma.swordClashRoom.delete({ where: { code } }),
    drawing: () => prisma.drawingRoom.delete({ where: { code } }),
    trivia: () => prisma.triviaRoom.delete({ where: { code } }),
    memory: () => prisma.memoryGameState.delete({ where: { code } })
  };

  try {
    await models[gameType]();
  } catch {
    return NextResponse.json({ error: "الغرفة غير موجودة أو انحذفت أصلاً" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
