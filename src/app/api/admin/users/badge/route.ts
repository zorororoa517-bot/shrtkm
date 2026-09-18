import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

const MANUAL_BADGES = ["owner", "verified", "staff", "vip", "bug_hunter", "suggester"] as const;
const schema = z.object({ login: z.string().min(1), badgeId: z.enum(MANUAL_BADGES), grant: z.boolean() });

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "بس الأدمن يقدر يسوي هالشي" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });
  const { login, badgeId, grant } = parsed.data;

  const user = await prisma.user.findUnique({ where: { login } });
  if (!user) return NextResponse.json({ error: "مستخدم غير موجود" }, { status: 404 });

  const current = new Set(JSON.parse(user.specialBadges) as string[]);
  if (grant) current.add(badgeId);
  else current.delete(badgeId);

  await prisma.user.update({ where: { login }, data: { specialBadges: JSON.stringify([...current]) } });
  return NextResponse.json({ ok: true });
}
