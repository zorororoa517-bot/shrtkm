import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface UserRow {
  login: string;
  displayName: string;
  avatarUrl: string | null;
  coins: number;
  _count: { wins: number };
}

interface RankedEntry {
  login: string;
  displayName: string;
  avatarUrl: string | null;
  coins: number;
  wins: number;
}

export async function GET() {
  const users: UserRow[] = await prisma.user.findMany({
    select: {
      login: true,
      displayName: true,
      avatarUrl: true,
      coins: true,
      _count: { select: { wins: true } }
    }
  });

  const ranked = users
    .map(
      (u): RankedEntry => ({
        login: u.login,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        coins: u.coins,
        wins: u._count.wins
      })
    )
    .filter((u) => u.wins > 0)
    .sort((a, b) => b.wins - a.wins || b.coins - a.coins)
    .slice(0, 50);

  return NextResponse.json({ leaderboard: ranked });
}
