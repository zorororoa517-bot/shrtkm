import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loadMemoryGame, serializeMemoryGame } from "@/lib/memoryRoomState";
import { MEMORY_ICONS, levelRewardForMatches } from "@/lib/memoryEngine";

const flipSchema = z.object({
  login: z.string().min(1),
  name: z.string().min(1),
  color: z.string().default("#e8a00f"),
  index: z.number().int().min(0)
});

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const game = await loadMemoryGame(params.code);
  if (!game) return NextResponse.json({ error: "اللوحة غير موجودة" }, { status: 404 });
  if (game.status !== "ACTIVE") return NextResponse.json({ error: "اللعبة مو شغّالة" }, { status: 409 });

  const body = await req.json().catch(() => null);
  const parsed = flipSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });
  const { login, name, color, index } = parsed.data;

  const cardOrder: number[] = JSON.parse(game.cardOrder);
  const matchedIdx: number[] = JSON.parse(game.matchedIdx);
  if (index >= cardOrder.length || matchedIdx.includes(index)) {
    return NextResponse.json({ error: "بطاقة غير صالحة" }, { status: 400 });
  }

  // First pick of the pair: just reveal it and remember it server-side.
  if (game.flippedA === null) {
    if (index === game.flippedA) return NextResponse.json(await serializeMemoryGame(game.id));
    await prisma.memoryGameState.update({ where: { id: game.id }, data: { flippedA: index } });
    return NextResponse.json(await serializeMemoryGame(game.id));
  }

  if (index === game.flippedA) {
    return NextResponse.json(await serializeMemoryGame(game.id));
  }

  // Second pick: resolve the match.
  const firstIcon = cardOrder[game.flippedA];
  const secondIcon = cardOrder[index];
  const isMatch = firstIcon === secondIcon;

  if (!isMatch) {
    // Briefly reveal both mismatched cards in THIS response only, then reset
    // server-side state right away (a simple, race-free way to do the
    // "flip back" without persisting a timer).
    const revealed = {
      a: { index: game.flippedA, icon: MEMORY_ICONS[firstIcon! % MEMORY_ICONS.length] },
      b: { index, icon: MEMORY_ICONS[secondIcon! % MEMORY_ICONS.length] }
    };
    await prisma.memoryGameState.update({ where: { id: game.id }, data: { flippedA: null } });
    const state = await serializeMemoryGame(game.id);
    return NextResponse.json({ ...state, mismatchReveal: revealed });
  }

  const newMatchedIdx = [...matchedIdx, game.flippedA, index];
  const newMatches = game.matches + 1;
  const won = newMatches >= game.pairCount;

  await prisma.$transaction([
    prisma.memoryGameState.update({
      where: { id: game.id },
      data: {
        matchedIdx: JSON.stringify(newMatchedIdx),
        matches: newMatches,
        flippedA: null,
        status: won ? "FINISHED" : "ACTIVE"
      }
    }),
    prisma.memoryScore.upsert({
      where: { gameId_login: { gameId: game.id, login } },
      create: { gameId: game.id, login, name, color, score: 1 },
      update: { score: { increment: 1 }, name }
    })
  ]);

  const state = await serializeMemoryGame(game.id);
  if (won) {
    const reward = levelRewardForMatches(newMatches);
    return NextResponse.json({ ...state, finished: true, reward, newLevel: game.level + reward.jump });
  }
  return NextResponse.json(state);
}
