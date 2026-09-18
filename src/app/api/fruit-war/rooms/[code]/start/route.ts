import { NextResponse } from "next/server";
import { z } from "zod";
import { loadFruitWarRoom, serializeFruitWarRoom, startFruitWarRound } from "@/lib/fruitWarRoomState";

const startSchema = z.object({ login: z.string().min(1) });

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const room = await loadFruitWarRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });

  const parsed = startSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });
  const requester = room.players.find((p) => p.login === parsed.data.login);
  if (!requester?.isHost) return NextResponse.json({ error: "بس المضيف يبدأ الجولة" }, { status: 403 });
  if (room.status !== "LOBBY") return NextResponse.json({ error: "الجولة شغّالة الحين" }, { status: 409 });

  try {
    await startFruitWarRound(room.id);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "خطأ" }, { status: 400 });
  }
  return NextResponse.json(await serializeFruitWarRoom(room.id, parsed.data.login));
}
