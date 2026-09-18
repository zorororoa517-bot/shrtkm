import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";

interface StoreItemRow {
  slug: string;
  name: string;
  category: string;
  price: number;
  previewCss: string;
}

export async function GET() {
  const [items, user] = await Promise.all([
    prisma.storeItem.findMany({ orderBy: [{ category: "asc" }, { price: "asc" }] }) as Promise<StoreItemRow[]>,
    getCurrentUser()
  ]);

  const ownedSlugs = user
    ? new Set(
        (
          await prisma.storeItemPurchase.findMany({ where: { userId: user.id }, select: { item: { select: { slug: true } } } })
        ).map((p: { item: { slug: string } }) => p.item.slug)
      )
    : new Set<string>();

  return NextResponse.json({
    items: items.map((i) => ({
      slug: i.slug,
      name: i.name,
      category: i.category,
      price: i.price,
      previewCss: i.previewCss,
      owned: i.price === 0 || ownedSlugs.has(i.slug)
    })),
    coins: user?.coins ?? null,
    signedIn: !!user
  });
}
