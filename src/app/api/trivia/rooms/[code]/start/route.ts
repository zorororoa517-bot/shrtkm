import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadTriviaRoom, serializeTriviaRoom } from "@/lib/trivia/roomState";

export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const room = await loadTriviaRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });
  if (room.status !== "LOBBY") return NextResponse.json({ error: "اللعبة بدأت أصلاً" }, { status: 409 });

  await prisma.triviaRoom.update({
    where: { id: room.id },
    data: { status: "ACTIVE", roundNum: 1, currentIndex: 0, answered: false, roundStartAt: new Date() }
  });

  return NextResponse.json(await serializeTriviaRoom(room.id));
}
