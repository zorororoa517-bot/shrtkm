import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loadMemoryGame, serializeMemoryGame } from "@/lib/memoryRoomState";
import { buildShuffledDeck, durationForLevel, pairCountForLevel } from "@/lib/memoryEngine";

const restartSchema = z.object({ level: z.number().int().min(1).max(200) });

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const game = await loadMemoryGame(params.code);
  if (!game) return NextResponse.json({ error: "اللوحة غير موجودة" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = restartSchema.safeParse(body);
  const level = parsed.success ? parsed.data.level : game.level;
  const pairCount = pairCountForLevel(level);

  await prisma.$transaction([
    prisma.memoryGameState.update({
      where: { id: game.id },
      data: {
        level,
        pairCount,
        durationSecs: durationForLevel(level),
        cardOrder: JSON.stringify(buildShuffledDeck(pairCount)),
        matchedIdx: "[]",
        matches: 0,
        flippedA: null,
        status: "LOBBY",
        roundStartAt: null
      }
    }),
    prisma.memoryScore.deleteMany({ where: { gameId: game.id } })
  ]);

  return NextResponse.json(await serializeMemoryGame(game.id));
}
