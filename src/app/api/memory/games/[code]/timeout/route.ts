import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadMemoryGame, serializeMemoryGame } from "@/lib/memoryRoomState";
import { levelRewardForMatches } from "@/lib/memoryEngine";

export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const game = await loadMemoryGame(params.code);
  if (!game) return NextResponse.json({ error: "اللوحة غير موجودة" }, { status: 404 });
  if (game.status !== "ACTIVE") return NextResponse.json(await serializeMemoryGame(game.id));

  await prisma.memoryGameState.update({ where: { id: game.id }, data: { status: "FINISHED" } });
  const reward = levelRewardForMatches(game.matches);
  const state = await serializeMemoryGame(game.id);
  return NextResponse.json({ ...state, timedOut: true, reward, newLevel: game.level + reward.jump });
}
