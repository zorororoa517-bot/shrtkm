import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loadTriviaRoom, serializeTriviaRoom } from "@/lib/trivia/roomState";
import { getTriviaGame } from "@/lib/trivia/registry";
import { checkTriviaAnswer } from "@/lib/trivia/engine";

const answerSchema = z.object({
  login: z.string().min(1),
  name: z.string().min(1),
  color: z.string().default("#e8a00f"),
  message: z.string().min(1)
});

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const room = await loadTriviaRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });
  if (room.status !== "ACTIVE" || room.answered) {
    return NextResponse.json({ correct: false, roomClosed: true });
  }

  const body = await req.json().catch(() => null);
  const parsed = answerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });
  const { login, name, color, message } = parsed.data;

  const game = getTriviaGame(room.gameSlug);
  const deckOrder: number[] = JSON.parse(room.deckOrder);
  const bankIndex = deckOrder[room.currentIndex % deckOrder.length];
  const question = game && bankIndex !== undefined ? game.bank[bankIndex] : null;
  if (!question) return NextResponse.json({ error: "ما فيه سؤال حالي" }, { status: 400 });

  const correct = checkTriviaAnswer(question, message);
  if (!correct) return NextResponse.json({ correct: false });

  await prisma.$transaction([
    prisma.triviaRoom.update({ where: { id: room.id }, data: { answered: true } }),
    prisma.triviaScore.upsert({
      where: { roomId_login: { roomId: room.id, login } },
      create: { roomId: room.id, login, name, color, score: 1 },
      update: { score: { increment: 1 }, name }
    })
  ]);

  return NextResponse.json({ correct: true, winnerName: name, ...(await serializeTriviaRoom(room.id)) });
}
