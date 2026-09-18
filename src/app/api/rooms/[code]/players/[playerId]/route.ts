import type { PlayerRecord } from "@/types/db";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadRoomByCode, serializeRoom } from "@/lib/roomState";

export async function DELETE(
  _req: Request,
  { params }: { params: { code: string; playerId: string } }
) {
  const room = await loadRoomByCode(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });

  const player = room.players.find((p: PlayerRecord) => p.id === params.playerId);
  if (!player) return NextResponse.json({ error: "اللاعب غير موجود" }, { status: 404 });

  await prisma.player.delete({ where: { id: player.id } });

  // If the removed player was mid-turn, clear the turn pointer so the host can re-spin.
  if (room.currentTurnId === player.id) {
    await prisma.room.update({ where: { id: room.id }, data: { currentTurnId: null, status: "LOBBY" } });
  }

  return NextResponse.json(await serializeRoom(room.id));
}
