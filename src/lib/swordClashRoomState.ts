import { prisma } from "@/lib/prisma";
import { msElapsed } from "@/lib/chairsEngine";

async function raw(code: string) {
  return prisma.swordClashRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: { players: { orderBy: { joinOrder: "asc" } } }
  });
}
async function rawById(id: string) {
  return prisma.swordClashRoom.findUniqueOrThrow({
    where: { id },
    include: { players: { orderBy: { joinOrder: "asc" } } }
  });
}
type SwordRoomWithPlayers = NonNullable<Awaited<ReturnType<typeof raw>>>;

export async function loadSwordClashRoom(code: string): Promise<SwordRoomWithPlayers | null> {
  let room = await raw(code);
  if (!room) return null;
  if (room.status === "BATTLE" && room.phaseStartAt && msElapsed(room.phaseStartAt) >= room.battleSeconds * 1000) {
    await resolveSwordClashRound(room.id);
    room = await rawById(room.id);
  }
  return room;
}

export async function startSwordClashRound(roomId: string) {
  const room = await prisma.swordClashRoom.findUniqueOrThrow({ where: { id: roomId }, include: { players: true } });
  const active = room.players.filter((p) => !p.isEliminated);
  if (active.length < 2) throw new Error("لازم لاعبين اثنين على الأقل");

  await prisma.swordClashPlayer.updateMany({ where: { roomId, isEliminated: false }, data: { power: 0 } });
  await prisma.swordClashRoom.update({
    where: { id: roomId },
    data: { status: "BATTLE", round: room.round + 1, phaseStartAt: new Date() }
  });
}

export async function strikeSwordClash(roomId: string, login: string) {
  const room = await prisma.swordClashRoom.findUniqueOrThrow({ where: { id: roomId }, include: { players: true } });
  if (room.status !== "BATTLE") throw new Error("مو وقت المعركة الحين");
  const player = room.players.find((p) => p.login === login && !p.isEliminated);
  if (!player) throw new Error("لاعب غير موجود بهالجولة");
  await prisma.swordClashPlayer.update({ where: { id: player.id }, data: { power: { increment: 1 } } });
}

/** Weakest fighter (least ⚔️ clicks collected during the battle window) is cut
 *  down; ties are broken at random, same "unlucky draw" feel as the physics
 *  version's random collisions. */
export async function resolveSwordClashRound(roomId: string) {
  const room = await prisma.swordClashRoom.findUniqueOrThrow({ where: { id: roomId }, include: { players: true } });
  const active = room.players.filter((p) => !p.isEliminated);
  if (active.length === 0) return;
  const minPower = Math.min(...active.map((p) => p.power));
  const weakest = active.filter((p) => p.power === minPower);
  const eliminated = weakest[Math.floor(Math.random() * weakest.length)]!;

  await prisma.swordClashPlayer.update({ where: { id: eliminated.id }, data: { isEliminated: true } });
  const survivors = active.filter((p) => p.id !== eliminated.id);

  if (survivors.length <= 1) {
    await prisma.swordClashRoom.update({
      where: { id: roomId },
      data: { status: "FINISHED", winnerId: survivors[0]?.id ?? null }
    });
  } else {
    await prisma.swordClashRoom.update({ where: { id: roomId }, data: { status: "LOBBY" } });
  }
}

export async function serializeSwordClashRoom(roomId: string) {
  const room = await prisma.swordClashRoom.findUniqueOrThrow({
    where: { id: roomId },
    include: { players: { orderBy: { joinOrder: "asc" } } }
  });
  return {
    code: room.code,
    status: room.status,
    round: room.round,
    battleSeconds: room.battleSeconds,
    phaseStartAt: room.phaseStartAt,
    winnerId: room.winnerId,
    players: room.players.map((p) => ({
      id: p.id,
      login: p.login,
      name: p.name,
      color: p.color,
      letter: p.letter,
      isHost: p.isHost,
      isEliminated: p.isEliminated,
      power: p.power
    }))
  };
}
