import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { touchLoginStreak } from "@/lib/badgesData";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  await touchLoginStreak(user.id);

  const [purchases, winsCount] = await Promise.all([
    prisma.storeItemPurchase.findMany({ where: { userId: user.id }, include: { item: true } }),
    prisma.winner.count({ where: { userId: user.id } })
  ]);

  return NextResponse.json({
    user: {
      login: user.login,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      coins: user.coins,
      isAdmin: user.isAdmin,
      winsCount
    },
    ownedItemSlugs: purchases.map((p: { item: { slug: string } }) => p.item.slug)
  });
}
