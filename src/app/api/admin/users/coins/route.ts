import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

const schema = z.object({ login: z.string().min(1), delta: z.number().int().min(-100000).max(100000) });

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "بس الأدمن يقدر يسوي هالشي" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });

  try {
    const user = await prisma.user.update({
      where: { login: parsed.data.login },
      data: { coins: { increment: parsed.data.delta } }
    });
    if (user.coins < 0) {
      await prisma.user.update({ where: { login: parsed.data.login }, data: { coins: 0 } });
    }
  } catch {
    return NextResponse.json({ error: "مستخدم غير موجود" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
