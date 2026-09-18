import { NextResponse } from "next/server";
import { loadTriviaRoom, serializeTriviaRoom } from "@/lib/trivia/roomState";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const room = await loadTriviaRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });
  return NextResponse.json(await serializeTriviaRoom(room.id));
}
