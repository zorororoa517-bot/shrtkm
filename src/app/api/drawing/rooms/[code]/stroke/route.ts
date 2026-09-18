import { NextResponse } from "next/server";
import { z } from "zod";
import { loadDrawingRoom, addDrawingStroke, serializeDrawingRoom } from "@/lib/drawingRoomState";

const pointSchema = z.object({ x: z.number(), y: z.number() });
const schema = z.object({
  login: z.string().min(1),
  stroke: z.object({ points: z.array(pointSchema).min(1).max(2000), color: z.string(), width: z.number().min(1).max(40) })
});

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const room = await loadDrawingRoom(params.code);
  if (!room) return NextResponse.json({ error: "الغرفة غير موجودة" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });

  try {
    await addDrawingStroke(room.id, parsed.data.login, parsed.data.stroke);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "خطأ" }, { status: 400 });
  }
  return NextResponse.json(await serializeDrawingRoom(room.id, parsed.data.login));
}
