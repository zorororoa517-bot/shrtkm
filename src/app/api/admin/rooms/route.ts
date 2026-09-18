import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

type RoomRow = { gameType: string; gameLabel: string; code: string; status: string; playerCount: number; createdAt: Date };

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "بس الأدمن يقدر يشوف هالصفحة" }, { status: 403 });

  const [roulette, chairs, fruitWar, swordClash, drawing, trivia, memory, userCount] = await Promise.all([
    prisma.room.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { _count: { select: { players: true } } } }),
    prisma.chairsRoom.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { _count: { select: { players: true } } } }),
    prisma.fruitWarRoom.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { _count: { select: { players: true } } } }),
    prisma.swordClashRoom.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { _count: { select: { players: true } } } }),
    prisma.drawingRoom.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { _count: { select: { players: true } } } }),
    prisma.triviaRoom.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { _count: { select: { scores: true } } } }),
    prisma.memoryGameState.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { _count: { select: { scores: true } } } }),
    prisma.user.count()
  ]);

  const rows: RoomRow[] = [
    ...roulette.map((r) => ({ gameType: "roulette", gameLabel: "عجلة الشخصنة", code: r.code, status: r.status, playerCount: r._count.players, createdAt: r.createdAt })),
    ...chairs.map((r) => ({ gameType: "chairs", gameLabel: "الكراسي الموسيقية", code: r.code, status: r.status, playerCount: r._count.players, createdAt: r.createdAt })),
    ...fruitWar.map((r) => ({ gameType: "fruit-war", gameLabel: "صراع الفواكه", code: r.code, status: r.status, playerCount: r._count.players, createdAt: r.createdAt })),
    ...swordClash.map((r) => ({ gameType: "sword-clash", gameLabel: "تصادم السيوف", code: r.code, status: r.status, playerCount: r._count.players, createdAt: r.createdAt })),
    ...drawing.map((r) => ({ gameType: "drawing", gameLabel: "تحدي الرسم", code: r.code, status: r.status, playerCount: r._count.players, createdAt: r.createdAt })),
    ...trivia.map((r) => ({ gameType: "trivia", gameLabel: `أسئلة (${r.gameSlug})`, code: r.code, status: r.status, playerCount: r._count.scores, createdAt: r.createdAt })),
    ...memory.map((r) => ({ gameType: "memory", gameLabel: "الذاكرة", code: r.code, status: r.status, playerCount: r._count.scores, createdAt: r.createdAt }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return NextResponse.json({ rooms: rows, userCount });
}
