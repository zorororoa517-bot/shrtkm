import { prisma } from "@/lib/prisma";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Counts how many rooms (across every game type that has a "host") this login
 *  created, optionally restricted to today only. Trivia and Memory boards have
 *  no single host concept so they're not counted here. */
async function countHosted(login: string, sinceToday: boolean) {
  const since = sinceToday ? startOfToday() : undefined;
  const roomWhere = since ? { createdAt: { gte: since } } : {};
  const [roulette, chairs, fruitWar, swordClash, drawing] = await Promise.all([
    prisma.player.count({ where: { login, isHost: true, room: roomWhere } }),
    prisma.chairsPlayer.count({ where: { login, isHost: true, room: roomWhere } }),
    prisma.fruitWarPlayer.count({ where: { login, isHost: true, room: roomWhere } }),
    prisma.swordClashPlayer.count({ where: { login, isHost: true, room: roomWhere } }),
    prisma.drawingPlayer.count({ where: { login, isHost: true, room: roomWhere } })
  ]);
  return roulette + chairs + fruitWar + swordClash + drawing;
}

/** Counts wins across roulette (Winner table) and the elimination mini-games
 *  (finished room whose winnerId points at this login's player row). */
async function countWins(login: string, userId: string, sinceToday: boolean) {
  const since = sinceToday ? startOfToday() : undefined;
  const winnerWhere = since ? { createdAt: { gte: since } } : {};
  const roomWhere = since ? { updatedAt: { gte: since } } : {};

  const [roulette, chairsWins, fruitWarWins, swordClashWins] = await Promise.all([
    prisma.winner.count({ where: { userId, ...winnerWhere } }),
    prisma.chairsRoom.count({ where: { status: "FINISHED", players: { some: { login } }, ...roomWhere, winnerId: { not: null } } }),
    prisma.fruitWarRoom.count({ where: { status: "FINISHED", players: { some: { login } }, ...roomWhere, winnerId: { not: null } } }),
    prisma.swordClashRoom.count({ where: { status: "FINISHED", players: { some: { login } }, ...roomWhere, winnerId: { not: null } } })
  ]);

  // The queries above only narrow down to rooms this login played in; confirm
  // the winner really is them (not just any finished room they took part in).
  const [chairsRooms, fruitRooms, swordRooms] = await Promise.all([
    prisma.chairsRoom.findMany({ where: { status: "FINISHED", players: { some: { login } }, ...roomWhere }, include: { players: true } }),
    prisma.fruitWarRoom.findMany({ where: { status: "FINISHED", players: { some: { login } }, ...roomWhere }, include: { players: true } }),
    prisma.swordClashRoom.findMany({ where: { status: "FINISHED", players: { some: { login } }, ...roomWhere }, include: { players: true } })
  ]);
  void chairsWins;
  void fruitWarWins;
  void swordClashWins;
  const wonRooms = (rooms: { winnerId: string | null; players: { id: string; login: string }[] }[]) =>
    rooms.filter((r) => r.players.some((p) => p.id === r.winnerId && p.login === login)).length;

  return roulette + wonRooms(chairsRooms) + wonRooms(fruitRooms) + wonRooms(swordRooms);
}

async function countEliminationsToday(login: string) {
  return prisma.turnEvent.count({
    where: { action: "ELIMINATE", createdAt: { gte: startOfToday() }, actorPlayer: { login } }
  });
}

export interface UserTaskStats {
  hostedToday: number;
  winsToday: number;
  eliminationsToday: number;
  totalWins: number;
  totalHosted: number;
}

export async function computeUserTaskStats(userId: string, login: string): Promise<UserTaskStats> {
  const [hostedToday, winsToday, eliminationsToday, totalWins, totalHosted] = await Promise.all([
    countHosted(login, true),
    countWins(login, userId, true),
    countEliminationsToday(login),
    countWins(login, userId, false),
    countHosted(login, false)
  ]);
  return { hostedToday, winsToday, eliminationsToday, totalWins, totalHosted };
}
