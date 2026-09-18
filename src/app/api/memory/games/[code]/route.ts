import { NextResponse } from "next/server";
import { loadMemoryGame, serializeMemoryGame } from "@/lib/memoryRoomState";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const game = await loadMemoryGame(params.code);
  if (!game) return NextResponse.json({ error: "اللوحة غير موجودة" }, { status: 404 });
  return NextResponse.json(await serializeMemoryGame(game.id));
}
