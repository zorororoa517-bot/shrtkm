import type { PlayerRecord } from "@/types/db";

/** Revive mode unlocks once the field has thinned out to 5 or fewer active players. */
export const REVIVE_THRESHOLD = 5;

export function isReviveUnlocked(activePlayerCount: number): boolean {
  return activePlayerCount <= REVIVE_THRESHOLD;
}

export function canPlayerRevive(
  player: Pick<PlayerRecord, "hasRevived" | "wasRevived">,
  revivePhaseActive: boolean,
  eliminatedCount: number
): boolean {
  return revivePhaseActive && !player.hasRevived && !player.wasRevived && eliminatedCount > 0;
}

export function reviveDisabledReason(
  player: Pick<PlayerRecord, "hasRevived" | "wasRevived">,
  revivePhaseActive: boolean
): string | null {
  if (player.hasRevived) return "استخدمت فرصة الإنعاش مرة وحدة بس";
  if (player.wasRevived) return "انت انعشتك مرة، ما تقدر تنعش غيرك بنفس الجولة";
  if (!revivePhaseActive) return `الإنعاش يتفعّل لما يوصل العدد ${REVIVE_THRESHOLD} مشاركين أو أقل`;
  return null;
}

export interface EliminationOutcome {
  /** True when the acting player still keeps the turn (their ⚡x2 perk just consumed one use). */
  keepsTurn: boolean;
  /** The double-elim perk was consumed by this action. */
  perkConsumed: boolean;
}

/**
 * Mirrors the original client-side rule: a player carrying the "double elim"
 * perk (⚡x2 — won the previous game) gets to eliminate a SECOND time in the
 * same turn, as long as at least 2 players remain after the first kick.
 */
export function resolveElimination(
  actor: Pick<PlayerRecord, "hasDoubleElim">,
  remainingActiveAfterKick: number
): EliminationOutcome {
  if (actor.hasDoubleElim && remainingActiveAfterKick >= 2) {
    return { keepsTurn: true, perkConsumed: true };
  }
  return { keepsTurn: false, perkConsumed: false };
}

/** Random-but-fair pick of the next turn holder among active (non-eliminated) players. */
export function pickNextTurnHolder<T extends { id: string }>(activePlayers: T[]): T | null {
  if (activePlayers.length === 0) return null;
  const idx = Math.floor(Math.random() * activePlayers.length);
  return activePlayers[idx] ?? null;
}
