import { NextResponse } from "next/server";
import { loadChairsRoom, serializeChairsRoom } from "@/lib/chairsRoomState";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const room = await loadChairsRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });
  return NextResponse.json(await serializeChairsRoom(room.id));
}
