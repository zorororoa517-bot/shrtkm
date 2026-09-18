import { NextResponse } from "next/server";
import { loadRoomByCode, serializeRoom } from "@/lib/roomState";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const room = await loadRoomByCode(params.code);
  if (!room) {
    return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });
  }
  const payload = await serializeRoom(room.id);
  return NextResponse.json(payload);
}
