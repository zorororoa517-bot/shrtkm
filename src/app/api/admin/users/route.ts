import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "بس الأدمن يقدر يشوف هالصفحة" }, { status: 403 });

  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const users = await prisma.user.findMany({
    where: q ? { login: { contains: q } } : {},
    orderBy: { createdAt: "desc" },
    take: 30
  });

  return NextResponse.json({
    users: users.map((u) => ({
      login: u.login,
      displayName: u.displayName,
      coins: u.coins,
      isAdmin: u.isAdmin,
      specialBadges: JSON.parse(u.specialBadges) as string[],
      currentStreak: u.currentStreak,
      createdAt: u.createdAt
    }))
  });
}
