import { prisma } from "@/lib/prisma";
import { MEMORY_ICONS } from "@/lib/memoryEngine";

export async function loadMemoryGame(code: string) {
  return prisma.memoryGameState.findUnique({
    where: { code: code.toUpperCase() },
    include: { scores: { orderBy: { score: "desc" } } }
  });
}

export async function serializeMemoryGame(id: string) {
  const game = await prisma.memoryGameState.findUniqueOrThrow({
    where: { id },
    include: { scores: { orderBy: { score: "desc" } } }
  });

  const cardOrder: number[] = JSON.parse(game.cardOrder);
  const matchedIdx: number[] = JSON.parse(game.matchedIdx);
  const matchedSet = new Set(matchedIdx);

  const cards = cardOrder.map((iconIdx, i) => {
    const visible = matchedSet.has(i) || i === game.flippedA;
    return { index: i, icon: visible ? MEMORY_ICONS[iconIdx % MEMORY_ICONS.length] : null, matched: matchedSet.has(i) };
  });

  return {
    code: game.code,
    level: game.level,
    pairCount: game.pairCount,
    durationSecs: game.durationSecs,
    status: game.status,
    matches: game.matches,
    flippedA: game.flippedA,
    roundStartAt: game.roundStartAt,
    cards,
    scores: game.scores.map((s: { login: string; name: string; color: string; score: number }) => ({
      login: s.login,
      name: s.name,
      color: s.color,
      score: s.score
    }))
  };
}
