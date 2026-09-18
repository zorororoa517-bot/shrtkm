export type RoomStatus = "LOBBY" | "SPINNING" | "AWAITING_TARGET" | "FINISHED";

export interface ClientPlayer {
  id: string;
  login: string;
  name: string;
  color: string;
  letter: string;
  isHost: boolean;
  isEliminated: boolean;
  hasRevived: boolean;
  wasRevived: boolean;
  hasDoubleElim: boolean;
  canRevive: boolean;
}

export interface ClientRoom {
  id: string;
  code: string;
  status: RoomStatus;
  lockJoin: boolean;
  spinSeconds: number;
  finalWinsNeeded: number;
  colorByChat: boolean;
  revivePhaseActive: boolean;
  players: ClientPlayer[];
  activeCount: number;
  eliminatedCount: number;
  currentTurn: { id: string; name: string; hasDoubleElim: boolean } | null;
  lastWinner: { name: string; at: string } | null;
  spinTargetIndex?: number;
  spinPlayerId?: string;
}
