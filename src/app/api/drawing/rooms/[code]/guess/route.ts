import { NextResponse } from "next/server";
import { z } from "zod";
import { loadDrawingRoom, submitDrawingGuess, serializeDrawingRoom } from "@/lib/drawingRoomState";

const schema = z.object({ login: z.string().min(1), text: z.string().min(1).max(60) });

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const room = await loadDrawingRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });

  const result = await submitDrawingGuess(room.id, parsed.data.login, parsed.data.text);
  const state = await serializeDrawingRoom(room.id, parsed.data.login);
  return NextResponse.json({ ...state, guessResult: result });
}
