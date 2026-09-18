import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateRoomCode } from "@/lib/roomCode";
import { serializeChairsRoom } from "@/lib/chairsRoomState";

const createSchema = z.object({
  hostLogin: z.string().min(1).max(40),
  hostName: z.string().min(1).max(40),
  hostColor: z.string().default("#e8a00f")
});

export async function POST(req: Request) {
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const { hostLogin, hostName, hostColor } = parsed.data;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const room = await prisma.chairsRoom.create({
        data: {
          code: generateRoomCode(),
          players: {
            create: [
              {
                login: hostLogin,
                name: hostName,
                color: hostColor,
                letter: hostName.trim().charAt(0).toUpperCase() || "?",
                isHost: true,
                joinOrder: 0
              }
            ]
          }
        }
      });
      return NextResponse.json(await serializeChairsRoom(room.id), { status: 201 });
    } catch (err: unknown) {
      const isUniqueViolation =
        typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
      if (!isUniqueViolation) throw err;
    }
  }
  return NextResponse.json({ error: "تعذّر إنشاء غرفة، جرّب مرة ثانية" }, { status: 500 });
}
