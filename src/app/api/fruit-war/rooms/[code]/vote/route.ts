import { NextResponse } from "next/server";
import { z } from "zod";
import { loadFruitWarRoom, castFruitWarVote, serializeFruitWarRoom } from "@/lib/fruitWarRoomState";

const voteSchema = z.object({ login: z.string().min(1), targetPlayerId: z.string().min(1) });

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const room = await loadFruitWarRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });

  const parsed = voteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });

  try {
    await castFruitWarVote(room.id, parsed.data.login, parsed.data.targetPlayerId);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "خطأ" }, { status: 400 });
  }
  return NextResponse.json(await serializeFruitWarRoom(room.id, parsed.data.login));
}
