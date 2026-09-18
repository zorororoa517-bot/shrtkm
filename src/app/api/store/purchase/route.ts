import { NextResponse } from "next/server";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";

const purchaseSchema = z.object({ slug: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "لازم تسجل دخولك بتويتش الأول" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صحيح" }, { status: 422 });

  const item = await prisma.storeItem.findUnique({ where: { slug: parsed.data.slug } });
  if (!item) return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });

  const already = await prisma.storeItemPurchase.findUnique({
    where: { userId_itemId: { userId: user.id, itemId: item.id } }
  });
  if (already) return NextResponse.json({ error: "عندك هالعنصر أصلاً" }, { status: 409 });

  if (user.coins < item.price) {
    return NextResponse.json({ error: "نقاطك ما تكفي" }, { status: 402 });
  }

  try {
    await prisma.$transaction(async (tx: PrismaClient) => {
      // Atomic guard: only proceeds if the user still has enough coins right
      // now, avoiding a race where two requests both pass the earlier check.
      const deducted = await tx.user.updateMany({
        where: { id: user.id, coins: { gte: item.price } },
        data: { coins: { decrement: item.price } }
      });
      if (deducted.count === 0) throw new Error("INSUFFICIENT_COINS");
      await tx.storeItemPurchase.create({ data: { userId: user.id, itemId: item.id } });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_COINS") {
      return NextResponse.json({ error: "نقاطك ما تكفي" }, { status: 402 });
    }
    throw err;
  }

  const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  return NextResponse.json({ ok: true, coins: fresh.coins });
}
