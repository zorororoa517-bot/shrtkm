import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateRoomCode } from "@/lib/roomCode";
import { buildShuffledDeck, durationForLevel, pairCountForLevel } from "@/lib/memoryEngine";
import { serializeMemoryGame } from "@/lib/memoryRoomState";

const createSchema = z.object({ level: z.number().int().min(1).max(200).default(1) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  const level = parsed.success ? parsed.data.level : 1;
  const pairCount = pairCountForLevel(level);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const game = await prisma.memoryGameState.create({
        data: {
          code: generateRoomCode(),
          level,
          pairCount,
          durationSecs: durationForLevel(level),
          cardOrder: JSON.stringify(buildShuffledDeck(pairCount))
        }
      });
      return NextResponse.json(await serializeMemoryGame(game.id), { status: 201 });
    } catch (err: unknown) {
      const isUniqueViolation =
        typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
      if (!isUniqueViolation) throw err;
    }
  }
  return NextResponse.json({ error: "تعذّر إنشاء لوحة" }, { status: 500 });
}
