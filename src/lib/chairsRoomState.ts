import { prisma } from "@/lib/prisma";
import { generateChairNumbers, msElapsed } from "@/lib/chairsEngine";

async function raw(code: string) {
  return prisma.chairsRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: { players: { orderBy: { joinOrder: "asc" } } }
  });
}

async function rawById(id: string) {
  return prisma.chairsRoom.findUniqueOrThrow({
    where: { id },
    include: { players: { orderBy: { joinOrder: "asc" } } }
  });
}

type ChairsRoomWithPlayers = NonNullable<Awaited<ReturnType<typeof raw>>>;

/** Loads a room and applies any phase transition whose timer has already elapsed
 *  (moving→claiming reveal, or claiming→resolve). No cron needed: any request
 *  that lands after the deadline nudges the room forward first. */
export async function loadChairsRoom(code: string): Promise<ChairsRoomWithPlayers | null> {
  let room = await raw(code);
  if (!room) return null;

  if (room.status === "MOVING" && room.phaseStartAt && msElapsed(room.phaseStartAt) >= room.moveSeconds * 1000) {
    room = await prisma.chairsRoom.update({
      where: { id: room.id },
      data: { status: "CLAIMING", phaseStartAt: new Date() },
      include: { players: { orderBy: { joinOrder: "asc" } } }
    });
  }

  if (room.status === "CLAIMING" && room.phaseStartAt && msElapsed(room.phaseStartAt) >= room.claimSeconds * 1000) {
    await resolveChairsRound(room.id);
    room = await rawById(room.id);
  }

  return room;
}

/** Eliminates everyone who didn't claim a chair in time, then either finishes
 *  the game (1 survivor) or resets to LOBBY for the host to start the next round. */
export async function resolveChairsRound(roomId: string) {
  const room = await prisma.chairsRoom.findUniqueOrThrow({
    where: { id: roomId },
    include: { players: { orderBy: { joinOrder: "asc" } } }
  });
  const claims: Record<string, number> = JSON.parse(room.claims);
  const active = room.players.filter((p) => !p.isEliminated);
  const unclaimedIds = active.filter((p) => !(p.id in claims)).map((p) => p.id);

  if (unclaimedIds.length > 0) {
    await prisma.chairsPlayer.updateMany({ where: { id: { in: unclaimedIds } }, data: { isEliminated: true } });
  }

  const survivors = active.filter((p) => !unclaimedIds.includes(p.id));

  if (survivors.length <= 1) {
    await prisma.chairsRoom.update({
      where: { id: room.id },
      data: {
        status: "FINISHED",
        claims: "{}",
        chairNumbers: "[]",
        winnerId: survivors[0]?.id ?? null
      }
    });
  } else {
    await prisma.chairsRoom.update({
      where: { id: room.id },
      data: { status: "LOBBY", claims: "{}", chairNumbers: "[]" }
    });
  }
}

export async function serializeChairsRoom(roomId: string) {
  const room = await prisma.chairsRoom.findUniqueOrThrow({
    where: { id: roomId },
    include: { players: { orderBy: { joinOrder: "asc" } } }
  });
  const claims: Record<string, number> = JSON.parse(room.claims);
  const chairNumbers: number[] = JSON.parse(room.chairNumbers);
  const takenNumbers = new Set(Object.values(claims));

  return {
    code: room.code,
    status: room.status,
    round: room.round,
    moveSeconds: room.moveSeconds,
    claimSeconds: room.claimSeconds,
    phaseStartAt: room.phaseStartAt,
    winnerId: room.winnerId,
    // Numbers only make sense to reveal once the music stopped.
    chairNumbers: room.status === "CLAIMING" || room.status === "FINISHED" ? chairNumbers : [],
    availableNumbers: chairNumbers.filter((n) => !takenNumbers.has(n)),
    players: room.players.map((p) => ({
      id: p.id,
      login: p.login,
      name: p.name,
      color: p.color,
      letter: p.letter,
      isHost: p.isHost,
      isEliminated: p.isEliminated,
      claimedChair: claims[p.id] ?? null
    }))
  };
}

export async function startChairsRound(roomId: string) {
  const room = await prisma.chairsRoom.findUniqueOrThrow({ where: { id: roomId }, include: { players: true } });
  const active = room.players.filter((p) => !p.isEliminated);
  if (active.length < 2) throw new Error("لازم لاعبين اثنين على الأقل");
  const chairs = generateChairNumbers(active.length - 1);
  await prisma.chairsRoom.update({
    where: { id: roomId },
    data: {
      status: "MOVING",
      round: room.round + 1,
      chairNumbers: JSON.stringify(chairs),
      claims: "{}",
      phaseStartAt: new Date()
    }
  });
}
