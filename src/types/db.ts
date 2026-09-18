export interface PlayerRecord {
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
  joinOrder: number;
}
