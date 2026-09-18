import { NextResponse } from "next/server";
import { z } from "zod";
import { loadDrawingRoom, chooseDrawingWord, serializeDrawingRoom } from "@/lib/drawingRoomState";

const schema = z.object({ login: z.string().min(1), word: z.string().min(1) });

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const room = await loadDrawingRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });

  try {
    await chooseDrawingWord(room.id, parsed.data.login, parsed.data.word);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "خطأ" }, { status: 400 });
  }
  return NextResponse.json(await serializeDrawingRoom(room.id, parsed.data.login));
}
