import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateRoomCode } from "@/lib/roomCode";
import { serializeRoom } from "@/lib/roomState";

const createRoomSchema = z.object({
  hostLogin: z.string().min(1).max(40),
  hostName: z.string().min(1).max(40),
  hostColor: z.string().default("#e8a00f")
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { hostLogin, hostName, hostColor } = parsed.data;

  // Retry on the (very unlikely) chance the random code collides.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const room = await prisma.room.create({
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
      const payload = await serializeRoom(room.id);
      return NextResponse.json(payload, { status: 201 });
    } catch (err: unknown) {
      const isUniqueViolation =
        typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
      if (!isUniqueViolation) throw err;
    }
  }

  return NextResponse.json({ error: "تعذّر إنشاء غرفة، جرّب مرة ثانية" }, { status: 500 });
}
