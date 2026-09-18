import { NextResponse } from "next/server";
import { loadDrawingRoom, serializeDrawingRoom } from "@/lib/drawingRoomState";

export async function GET(req: Request, { params }: { params: { code: string } }) {
  const room = await loadDrawingRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });
  const login = new URL(req.url).searchParams.get("login") ?? undefined;
  return NextResponse.json(await serializeDrawingRoom(room.id, login));
}
