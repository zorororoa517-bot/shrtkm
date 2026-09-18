import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadTriviaRoom, serializeTriviaRoom } from "@/lib/trivia/roomState";
import { shuffledIndices } from "@/lib/trivia/engine";
import { getTriviaGame } from "@/lib/trivia/registry";

export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const room = await loadTriviaRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });
  if (room.status !== "ACTIVE") return NextResponse.json({ error: "اللعبة مو شغّالة" }, { status: 409 });

  const nextRoundNum = room.roundNum + 1;
  if (nextRoundNum > room.roundLimit) {
    await prisma.triviaRoom.update({ where: { id: room.id }, data: { status: "FINISHED" } });
    return NextResponse.json(await serializeTriviaRoom(room.id));
  }

  const nextIndex = room.currentIndex + 1;
  const deckOrder: number[] = JSON.parse(room.deckOrder);
  const game = getTriviaGame(room.gameSlug);
  const needsReshuffle = game && nextIndex >= deckOrder.length;

  await prisma.triviaRoom.update({
    where: { id: room.id },
    data: {
      roundNum: nextRoundNum,
      currentIndex: needsReshuffle ? 0 : nextIndex,
      deckOrder: needsReshuffle ? JSON.stringify(shuffledIndices(game!.bank.length)) : undefined,
      answered: false,
      roundStartAt: new Date()
    }
  });

  return NextResponse.json(await serializeTriviaRoom(room.id));
}
