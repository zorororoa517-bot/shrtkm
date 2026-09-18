import type { PlayerRecord } from "@/types/db";
import { prisma } from "@/lib/prisma";
import { canPlayerRevive, isReviveUnlocked } from "@/lib/rouletteEngine";

export async function loadRoomByCode(code: string) {
  return prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      players: { orderBy: { joinOrder: "asc" } },
      winners: { include: { player: true }, orderBy: { createdAt: "desc" }, take: 1 }
    }
  });
}

export type RoomPayload = Awaited<ReturnType<typeof serializeRoom>>;

export async function serializeRoom(roomId: string) {
  const room = await prisma.room.findUniqueOrThrow({
    where: { id: roomId },
    include: {
      players: { orderBy: { joinOrder: "asc" } },
      winners: { include: { player: true }, orderBy: { createdAt: "desc" }, take: 1 }
    }
  });

  const active = room.players.filter((p: PlayerRecord) => !p.isEliminated);
  const eliminated = room.players.filter((p: PlayerRecord) => p.isEliminated);
  const currentTurnPlayer = room.players.find((p: PlayerRecord) => p.id === room.currentTurnId) ?? null;

  return {
    id: room.id,
    code: room.code,
    status: room.status,
    lockJoin: room.lockJoin,
    spinSeconds: room.spinSeconds,
    finalWinsNeeded: room.finalWinsNeeded,
    colorByChat: room.colorByChat,
    revivePhaseActive: room.revivePhaseActive || isReviveUnlocked(active.length),
    players: room.players.map((p: PlayerRecord) => ({
      id: p.id,
      login: p.login,
      name: p.name,
      color: p.color,
      letter: p.letter,
      isHost: p.isHost,
      isEliminated: p.isEliminated,
      hasRevived: p.hasRevived,
      wasRevived: p.wasRevived,
      hasDoubleElim: p.hasDoubleElim,
      canRevive: canPlayerRevive(p, room.revivePhaseActive, eliminated.length)
    })),
    activeCount: active.length,
    eliminatedCount: eliminated.length,
    currentTurn: currentTurnPlayer
      ? {
          id: currentTurnPlayer.id,
          name: currentTurnPlayer.name,
          hasDoubleElim: currentTurnPlayer.hasDoubleElim
        }
      : null,
    lastWinner: room.winners[0]
      ? { name: room.winners[0].player.name, at: room.winners[0].createdAt }
      : null
  };
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
