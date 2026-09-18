import type { PlayerRecord } from "@/types/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loadRoomByCode, serializeRoom } from "@/lib/roomState";
import { colorForIndex, letterFor } from "@/lib/palette";

const joinSchema = z.object({
  login: z.string().min(1).max(40),
  name: z.string().min(1).max(40),
  color: z.string().optional()
});

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const room = await loadRoomByCode(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });
  if (room.lockJoin) return NextResponse.json({ error: "الانضمام مقفول حالياً" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const { login, name, color } = parsed.data;

  const existing = room.players.find((p: PlayerRecord) => p.login === login);
  if (existing) {
    // Re-joining (e.g. page refresh) just updates the display name, doesn't duplicate the player.
    await prisma.player.update({ where: { id: existing.id }, data: { name } });
    return NextResponse.json(await serializeRoom(room.id));
  }

  await prisma.player.create({
    data: {
      roomId: room.id,
      login,
      name,
      color: color ?? colorForIndex(room.players.length),
      letter: letterFor(name),
      joinOrder: room.players.length
    }
  });

  return NextResponse.json(await serializeRoom(room.id), { status: 201 });
}
