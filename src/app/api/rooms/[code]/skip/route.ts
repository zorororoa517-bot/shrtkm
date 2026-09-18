import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loadRoomByCode, serializeRoom } from "@/lib/roomState";

const skipSchema = z.object({ actorId: z.string().min(1) });

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const room = await loadRoomByCode(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = skipSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  if (room.currentTurnId !== parsed.data.actorId) {
    return NextResponse.json({ error: "مو دورك حالياً" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.turnEvent.create({
      data: { roomId: room.id, actorPlayerId: parsed.data.actorId, action: "SKIP_NO_KICK" }
    }),
    prisma.room.update({ where: { id: room.id }, data: { status: "LOBBY", currentTurnId: null } })
  ]);

  return NextResponse.json(await serializeRoom(room.id));
}
