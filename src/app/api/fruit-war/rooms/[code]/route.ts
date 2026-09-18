import { NextResponse } from "next/server";
import { loadFruitWarRoom, serializeFruitWarRoom } from "@/lib/fruitWarRoomState";

export async function GET(req: Request, { params }: { params: { code: string } }) {
  const room = await loadFruitWarRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });
  const login = new URL(req.url).searchParams.get("login") ?? undefined;
  return NextResponse.json(await serializeFruitWarRoom(room.id, login));
}
