import type { PlayerRecord } from "@/types/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loadRoomByCode, serializeRoom } from "@/lib/roomState";
import { canPlayerRevive } from "@/lib/rouletteEngine";

const reviveSchema = z.object({
  actorId: z.string().min(1),
  targetId: z.string().min(1)
});

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const room = await loadRoomByCode(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = reviveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const { actorId, targetId } = parsed.data;

  if (room.currentTurnId !== actorId) {
    return NextResponse.json({ error: "مو دورك حالياً" }, { status: 403 });
  }
  const actor = room.players.find((p: PlayerRecord) => p.id === actorId);
  const target = room.players.find((p: PlayerRecord) => p.id === targetId);
  if (!actor || !target) return NextResponse.json({ error: "لاعب غير موجود" }, { status: 404 });
  if (!target.isEliminated) return NextResponse.json({ error: "اللاعب مو مطرود" }, { status: 400 });

  const eliminatedCount = room.players.filter((p: PlayerRecord) => p.isEliminated).length;
  if (!canPlayerRevive(actor, room.revivePhaseActive, eliminatedCount)) {
    return NextResponse.json({ error: "ما تقدر تنعش دحين" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.player.update({ where: { id: target.id }, data: { isEliminated: false, wasRevived: true } }),
    prisma.player.update({ where: { id: actor.id }, data: { hasRevived: true } }),
    prisma.turnEvent.create({
      data: { roomId: room.id, actorPlayerId: actor.id, targetPlayerId: target.id, action: "REVIVE" }
    }),
    prisma.room.update({ where: { id: room.id }, data: { status: "LOBBY", currentTurnId: null } })
  ]);

  return NextResponse.json(await serializeRoom(room.id));
}
