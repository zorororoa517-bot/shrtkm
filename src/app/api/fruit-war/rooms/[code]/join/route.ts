import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loadFruitWarRoom, serializeFruitWarRoom } from "@/lib/fruitWarRoomState";
import { colorForIndex, letterFor } from "@/lib/palette";

const joinSchema = z.object({ login: z.string().min(1).max(40), name: z.string().min(1).max(40), color: z.string().optional() });

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const room = await loadFruitWarRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });
  if (room.status === "VOTING") return NextResponse.json({ error: "الجولة شغّالة، انتظر الجولة الجاية" }, { status: 403 });

  const parsed = joinSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const { login, name, color } = parsed.data;

  const existing = room.players.find((p) => p.login === login);
  if (existing) {
    await prisma.fruitWarPlayer.update({ where: { id: existing.id }, data: { name } });
    return NextResponse.json(await serializeFruitWarRoom(room.id, login));
  }
  if (room.round > 0) {
    return NextResponse.json({ error: "اللعبة بدأت أصلاً، انتظر جولة جديدة" }, { status: 403 });
  }

  await prisma.fruitWarPlayer.create({
    data: {
      roomId: room.id,
      login,
      name,
      color: color ?? colorForIndex(room.players.length),
      letter: letterFor(name),
      joinOrder: room.players.length
    }
  });
  return NextResponse.json(await serializeFruitWarRoom(room.id, login), { status: 201 });
}
