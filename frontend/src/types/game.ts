export type ScoringRule = 'highest_wins' | 'lowest_wins';

export type GameStatus = 'waiting' | 'in_progress' | 'completed';

export interface Player {
  id: string;
  name: string;
  avatarSeed?: string;
  connected: boolean;
  joinedAt: string;
  joined_at_round?: number;
}

export interface RoundScore {
  playerId: string;
  score: number;
}

export interface Round {
  roundNumber: number;
  scores: Record<string, number>; // playerId -> score
  timestamp: string;
  note?: string;
}

export interface GameState {
  id: string; // 6-character code e.g. A7K9D2
  name: string;
  hostId: string;
  scoringRule: ScoringRule;
  status: GameStatus;
  createdAt: string;
  completedAt?: string;
  admission_locked?: boolean;
  spectators?: string[];
  spectator_count?: number;
  players: Player[];
  rounds: Round[];
}

export interface PlayerRanking {
  player: Player;
  totalScore: number;
  rank: number;
  roundScores: number[];
}
