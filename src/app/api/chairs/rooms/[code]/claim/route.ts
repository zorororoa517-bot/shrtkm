import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loadChairsRoom, resolveChairsRound, serializeChairsRoom } from "@/lib/chairsRoomState";

const claimSchema = z.object({ login: z.string().min(1), chairNumber: z.number().int().positive() });

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const room = await loadChairsRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });
  if (room.status !== "CLAIMING") return NextResponse.json({ error: "مو وقت الحجز الحين" }, { status: 409 });

  const parsed = claimSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });
  const { login, chairNumber } = parsed.data;

  const player = room.players.find((p) => p.login === login && !p.isEliminated);
  if (!player) return NextResponse.json({ error: "لاعب غير موجود بهالجولة" }, { status: 404 });

  const chairNumbers: number[] = JSON.parse(room.chairNumbers);
  if (!chairNumbers.includes(chairNumber)) {
    return NextResponse.json({ error: "رقم كرسي غير صالح" }, { status: 400 });
  }

  const claims: Record<string, number> = JSON.parse(room.claims);
  if (player.id in claims) return NextResponse.json(await serializeChairsRoom(room.id)); // حجز قبل كذا
  if (Object.values(claims).includes(chairNumber)) {
    return NextResponse.json({ error: "الكرسي محجوز من واحد ثاني" }, { status: 409 });
  }

  claims[player.id] = chairNumber;
  await prisma.chairsRoom.update({ where: { id: room.id }, data: { claims: JSON.stringify(claims) } });

  // Everyone still active already claimed → resolve immediately, no need to wait out the timer.
  const active = room.players.filter((p) => !p.isEliminated);
  if (Object.keys(claims).length >= active.length) {
    await resolveChairsRound(room.id);
  }

  return NextResponse.json(await serializeChairsRoom(room.id));
}
