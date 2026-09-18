import { prisma } from "@/lib/prisma";
import { assignFruits, emojiForFruitLabel } from "@/lib/fruitWarEngine";
import { msElapsed } from "@/lib/chairsEngine";

async function raw(code: string) {
  return prisma.fruitWarRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: { players: { orderBy: { joinOrder: "asc" } } }
  });
}
async function rawById(id: string) {
  return prisma.fruitWarRoom.findUniqueOrThrow({
    where: { id },
    include: { players: { orderBy: { joinOrder: "asc" } } }
  });
}
type FruitRoomWithPlayers = NonNullable<Awaited<ReturnType<typeof raw>>>;

export async function loadFruitWarRoom(code: string): Promise<FruitRoomWithPlayers | null> {
  let room = await raw(code);
  if (!room) return null;
  if (room.status === "VOTING" && room.phaseStartAt && msElapsed(room.phaseStartAt) >= room.voteSeconds * 1000) {
    await resolveFruitWarRound(room.id);
    room = await rawById(room.id);
  }
  return room;
}

export async function startFruitWarRound(roomId: string) {
  const room = await prisma.fruitWarRoom.findUniqueOrThrow({ where: { id: roomId }, include: { players: true } });
  const active = room.players.filter((p) => !p.isEliminated);
  if (active.length < 2) throw new Error("لازم لاعبين اثنين على الأقل");

  // First round of the whole game: hand out fruit. Later rounds just clear the vote tally.
  if (room.round === 0) {
    const fruits = assignFruits(active.length);
    await prisma.$transaction(
      active.map((p, i) =>
        prisma.fruitWarPlayer.update({ where: { id: p.id }, data: { fruitLabel: fruits[i]!, votes: 0, votedForId: null } })
      )
    );
  } else {
    await prisma.fruitWarPlayer.updateMany({ where: { roomId, isEliminated: false }, data: { votes: 0, votedForId: null } });
  }

  await prisma.fruitWarRoom.update({
    where: { id: roomId },
    data: { status: "VOTING", round: room.round + 1, phaseStartAt: new Date() }
  });
}

export async function castFruitWarVote(roomId: string, voterLogin: string, targetPlayerId: string) {
  const room = await prisma.fruitWarRoom.findUniqueOrThrow({ where: { id: roomId }, include: { players: true } });
  if (room.status !== "VOTING") throw new Error("مو وقت التصويت الحين");
  const voter = room.players.find((p) => p.login === voterLogin && !p.isEliminated);
  if (!voter) throw new Error("لاعب غير موجود");
  const target = room.players.find((p) => p.id === targetPlayerId && !p.isEliminated);
  if (!target) throw new Error("هدف التصويت غير صالح");
  if (target.id === voter.id) throw new Error("ما تقدر تصوّت لنفسك");
  if (voter.votedForId === target.id) return; // نفس الصوت، ما نكرره

  await prisma.$transaction(async (tx) => {
    if (voter.votedForId) {
      await tx.fruitWarPlayer.update({ where: { id: voter.votedForId }, data: { votes: { decrement: 1 } } });
    }
    await tx.fruitWarPlayer.update({ where: { id: target.id }, data: { votes: { increment: 1 } } });
    await tx.fruitWarPlayer.update({ where: { id: voter.id }, data: { votedForId: target.id } });
  });
}

export async function resolveFruitWarRound(roomId: string) {
  const room = await prisma.fruitWarRoom.findUniqueOrThrow({ where: { id: roomId }, include: { players: true } });
  const active = room.players.filter((p) => !p.isEliminated);
  if (active.length === 0) return;
  const maxVotes = Math.max(...active.map((p) => p.votes));
  const topCandidates = active.filter((p) => p.votes === maxVotes);
  const eliminated = topCandidates[Math.floor(Math.random() * topCandidates.length)]!;

  await prisma.fruitWarPlayer.update({ where: { id: eliminated.id }, data: { isEliminated: true } });
  const survivors = active.filter((p) => p.id !== eliminated.id);

  if (survivors.length <= 1) {
    await prisma.fruitWarRoom.update({
      where: { id: roomId },
      data: { status: "FINISHED", winnerId: survivors[0]?.id ?? null }
    });
  } else {
    await prisma.fruitWarRoom.update({ where: { id: roomId }, data: { status: "LOBBY" } });
  }
}

/** viewerLogin, if given, gets told their OWN secret fruit. Nobody else's fruit
 *  ownership is exposed while they're still alive — you vote for a *fruit*,
 *  not a person, and only find out who it belonged to once it's eliminated
 *  (or the game ends). This mirrors the "guess whose fruit it is" suspense
 *  from the original game instead of just voting people out by name. */
export async function serializeFruitWarRoom(roomId: string, viewerLogin?: string) {
  const room = await prisma.fruitWarRoom.findUniqueOrThrow({
    where: { id: roomId },
    include: { players: { orderBy: { joinOrder: "asc" } } }
  });
  const finished = room.status === "FINISHED";
  const viewer = viewerLogin ? room.players.find((p) => p.login === viewerLogin) : undefined;

  return {
    code: room.code,
    status: room.status,
    round: room.round,
    voteSeconds: room.voteSeconds,
    phaseStartAt: room.phaseStartAt,
    winnerId: room.winnerId,
    yourFruit:
      viewer && viewer.fruitLabel
        ? { label: viewer.fruitLabel, emoji: emojiForFruitLabel(viewer.fruitLabel) }
        : null,
    // The voting board: every active fruit, anonymized (no owner shown) plus
    // its live vote count so people can see what's trending without knowing
    // who they'd be eliminating.
    fruits: room.players
      .filter((p) => !p.isEliminated && p.fruitLabel)
      .map((p) => ({ playerId: p.id, label: p.fruitLabel, emoji: emojiForFruitLabel(p.fruitLabel), votes: p.votes })),
    players: room.players.map((p) => {
      const revealFruit = p.isEliminated || finished;
      return {
        id: p.id,
        login: p.login,
        name: p.name,
        color: p.color,
        letter: p.letter,
        isHost: p.isHost,
        isEliminated: p.isEliminated,
        fruitLabel: revealFruit ? p.fruitLabel : "",
        fruitEmoji: revealFruit && p.fruitLabel ? emojiForFruitLabel(p.fruitLabel) : "",
        votedForId: p.login === viewerLogin ? p.votedForId : undefined
      };
    })
  };
}
