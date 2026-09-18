import { prisma } from "@/lib/prisma";
import { getTriviaGame } from "@/lib/trivia/registry";
import { toPublicQuestion } from "@/lib/trivia/engine";

export async function loadTriviaRoom(code: string) {
  return prisma.triviaRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: { scores: { orderBy: { score: "desc" } } }
  });
}

export async function serializeTriviaRoom(id: string) {
  const room = await prisma.triviaRoom.findUniqueOrThrow({
    where: { id },
    include: { scores: { orderBy: { score: "desc" } } }
  });
  const game = getTriviaGame(room.gameSlug);
  const deckOrder: number[] = JSON.parse(room.deckOrder);
  const bankIndex = deckOrder[room.currentIndex % deckOrder.length];
  const question = room.status === "ACTIVE" && game && bankIndex !== undefined ? game.bank[bankIndex] : null;

  return {
    code: room.code,
    gameSlug: room.gameSlug,
    title: game?.title ?? room.gameSlug,
    instructions: game?.instructions ?? "",
    status: room.status,
    roundNum: room.roundNum,
    roundLimit: room.roundLimit,
    timerSeconds: room.timerSeconds,
    roundStartAt: room.roundStartAt,
    answered: room.answered,
    question: question ? toPublicQuestion(question) : null,
    scores: room.scores.map((s: { login: string; name: string; color: string; score: number }) => ({
      login: s.login,
      name: s.name,
      color: s.color,
      score: s.score
    }))
  };
}
