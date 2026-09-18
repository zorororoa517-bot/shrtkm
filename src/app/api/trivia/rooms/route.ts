import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateRoomCode } from "@/lib/roomCode";
import { getTriviaGame } from "@/lib/trivia/registry";
import { shuffledIndices } from "@/lib/trivia/engine";
import { serializeTriviaRoom } from "@/lib/trivia/roomState";

const createSchema = z.object({ gameSlug: z.string().min(1) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });

  const game = getTriviaGame(parsed.data.gameSlug);
  if (!game) return NextResponse.json({ error: "لعبة غير معروفة" }, { status: 404 });

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const room = await prisma.triviaRoom.create({
        data: {
          code: generateRoomCode(),
          gameSlug: game.slug,
          deckOrder: JSON.stringify(shuffledIndices(game.bank.length)),
          timerSeconds: game.defaultTimerSeconds
        }
      });
      return NextResponse.json(await serializeTriviaRoom(room.id), { status: 201 });
    } catch (err: unknown) {
      const isUniqueViolation =
        typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
      if (!isUniqueViolation) throw err;
    }
  }
  return NextResponse.json({ error: "تعذّر إنشاء غرفة" }, { status: 500 });
}
