import { NextResponse } from "next/server";
import { z } from "zod";
import { loadSwordClashRoom, strikeSwordClash, serializeSwordClashRoom } from "@/lib/swordClashRoomState";

const strikeSchema = z.object({ login: z.string().min(1) });

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const room = await loadSwordClashRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });

  const parsed = strikeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });

  try {
    await strikeSwordClash(room.id, parsed.data.login);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "خطأ" }, { status: 400 });
  }
  return NextResponse.json(await serializeSwordClashRoom(room.id));
}
