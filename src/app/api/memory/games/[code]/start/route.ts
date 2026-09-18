import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadMemoryGame, serializeMemoryGame } from "@/lib/memoryRoomState";

export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const game = await loadMemoryGame(params.code);
  if (!game) return NextResponse.json({ error: "اللوحة غير موجودة" }, { status: 404 });
  await prisma.memoryGameState.update({
    where: { id: game.id },
    data: { status: "ACTIVE", roundStartAt: new Date() }
  });
  return NextResponse.json(await serializeMemoryGame(game.id));
}
