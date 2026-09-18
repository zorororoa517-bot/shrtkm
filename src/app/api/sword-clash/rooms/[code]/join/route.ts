import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loadSwordClashRoom, serializeSwordClashRoom } from "@/lib/swordClashRoomState";
import { colorForIndex, letterFor } from "@/lib/palette";

const joinSchema = z.object({ login: z.string().min(1).max(40), name: z.string().min(1).max(40), color: z.string().optional() });

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const room = await loadSwordClashRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });
  if (room.status === "BATTLE") return NextResponse.json({ error: "المعركة شغّالة، انتظر الجولة الجاية" }, { status: 403 });

  const parsed = joinSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const { login, name, color } = parsed.data;

  const existing = room.players.find((p) => p.login === login);
  if (existing) {
    await prisma.swordClashPlayer.update({ where: { id: existing.id }, data: { name } });
    return NextResponse.json(await serializeSwordClashRoom(room.id));
  }

  await prisma.swordClashPlayer.create({
    data: {
      roomId: room.id,
      login,
      name,
      color: color ?? colorForIndex(room.players.length),
      letter: letterFor(name),
      joinOrder: room.players.length
    }
  });
  return NextResponse.json(await serializeSwordClashRoom(room.id), { status: 201 });
}
