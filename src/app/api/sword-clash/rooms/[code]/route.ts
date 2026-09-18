import { NextResponse } from "next/server";
import { loadSwordClashRoom, serializeSwordClashRoom } from "@/lib/swordClashRoomState";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const room = await loadSwordClashRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });
  return NextResponse.json(await serializeSwordClashRoom(room.id));
}
