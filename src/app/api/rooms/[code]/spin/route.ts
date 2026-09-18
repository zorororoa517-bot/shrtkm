import type { PlayerRecord } from "@/types/db";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadRoomByCode, serializeRoom } from "@/lib/roomState";
import { pickNextTurnHolder } from "@/lib/rouletteEngine";

export async function POST(_req: Request, { params }: { params: { code: string } }) {
  const room = await loadRoomByCode(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });
  if (room.status === "SPINNING") {
    return NextResponse.json({ error: "العجلة تدور أصلاً" }, { status: 409 });
  }

  const active = room.players.filter((p: PlayerRecord) => !p.isEliminated);
  if (active.length < 2) {
    return NextResponse.json({ error: "لازم لاعبين اثنين على الأقل" }, { status: 400 });
  }

  // The chosen player is decided HERE, server-side, before any animation —
  // the client only animates the wheel to visually land on this result.
  const winner = pickNextTurnHolder(active)!;

  await prisma.room.update({
    where: { id: room.id },
    data: { status: "AWAITING_TARGET", currentTurnId: winner.id }
  });

  const payload = await serializeRoom(room.id);
  // targetIndex tells the client which slice (in its current active-player order) to land on.
  const targetIndex = active.findIndex((p: PlayerRecord) => p.id === winner.id);
  return NextResponse.json({ ...payload, spinTargetIndex: targetIndex, spinPlayerId: winner.id });
}
