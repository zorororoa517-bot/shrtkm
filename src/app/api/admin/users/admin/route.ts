import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

const schema = z.object({ login: z.string().min(1), isAdmin: z.boolean() });

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "بس الأدمن يقدر يسوي هالشي" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });

  if (parsed.data.login === admin.login && !parsed.data.isAdmin) {
    return NextResponse.json({ error: "ما تقدر تسحب صلاحيتك من نفسك" }, { status: 400 });
  }

  try {
    await prisma.user.update({ where: { login: parsed.data.login }, data: { isAdmin: parsed.data.isAdmin } });
  } catch {
    return NextResponse.json({ error: "مستخدم غير موجود" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
