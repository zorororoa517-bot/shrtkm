import type { PlayerRecord } from "@/types/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loadRoomByCode, serializeRoom } from "@/lib/roomState";
import { resolveElimination, pickNextTurnHolder, isReviveUnlocked } from "@/lib/rouletteEngine";

const WIN_COINS_REWARD = 50;

const eliminateSchema = z.object({
  actorId: z.string().min(1),
  targetId: z.string().min(1)
});

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const room = await loadRoomByCode(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = eliminateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const { actorId, targetId } = parsed.data;

  if (room.currentTurnId !== actorId) {
    return NextResponse.json({ error: "مو دورك حالياً" }, { status: 403 });
  }
  const actor = room.players.find((p: PlayerRecord) => p.id === actorId);
  const target = room.players.find((p: PlayerRecord) => p.id === targetId);
  if (!actor || !target) return NextResponse.json({ error: "لاعب غير موجود" }, { status: 404 });
  if (target.isEliminated) return NextResponse.json({ error: "اللاعب مطرود أصلاً" }, { status: 400 });
  if (target.id === actor.id) return NextResponse.json({ error: "ما تقدر تطرد نفسك" }, { status: 400 });

  await prisma.$transaction([
    prisma.player.update({ where: { id: target.id }, data: { isEliminated: true } }),
    prisma.turnEvent.create({
      data: { roomId: room.id, actorPlayerId: actor.id, targetPlayerId: target.id, action: "ELIMINATE" }
    })
  ]);

  const activeAfter = room.players.filter((p: PlayerRecord) => !p.isEliminated && p.id !== target.id);
  const { keepsTurn, perkConsumed } = resolveElimination(actor, activeAfter.length);

  // Sole survivor → game over, record the winner.
  if (activeAfter.length === 1) {
    const champion = activeAfter[0]!;
    // Link to a persistent User (signed in with Twitch) if one matches this login,
    // so the win + coin reward carry over to the leaderboard/profile/wallet.
    const linkedUser = await prisma.user.findUnique({ where: { login: champion.login } });
    await prisma.$transaction([
      prisma.winner.create({
        data: { roomId: room.id, playerId: champion.id, userId: linkedUser?.id }
      }),
      // Winner carries the ⚡x2 double-elimination perk into the NEXT game.
      prisma.player.updateMany({ where: { roomId: room.id }, data: { hasDoubleElim: false } }),
      prisma.player.update({ where: { id: champion.id }, data: { hasDoubleElim: true } }),
      prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", currentTurnId: null } }),
      ...(linkedUser
        ? [prisma.user.update({ where: { id: linkedUser.id }, data: { coins: { increment: WIN_COINS_REWARD } } })]
        : [])
    ]);
    return NextResponse.json(await serializeRoom(room.id));
  }

  if (perkConsumed) {
    await prisma.player.update({ where: { id: actor.id }, data: { hasDoubleElim: false } });
  }

  await prisma.room.update({
    where: { id: room.id },
    data: {
      revivePhaseActive: room.revivePhaseActive || isReviveUnlocked(activeAfter.length),
      status: keepsTurn ? "AWAITING_TARGET" : "LOBBY",
      currentTurnId: keepsTurn ? actor.id : null
    }
  });

  const payload = await serializeRoom(room.id);
  return NextResponse.json({ ...payload, doubleElimBonusTurn: keepsTurn });
}
