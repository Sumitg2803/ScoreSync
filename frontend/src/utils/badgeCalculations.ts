import type { GameState, PlayerRanking } from '../types/game';

export interface AwardBadge {
  id: 'comeback' | 'consistent' | 'high_roller' | 'rollercoaster';
  title: string;
  icon: string;
  recipientPlayerId: string;
  recipientName: string;
  subtitle: string;
  description: string;
  gradientClass: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

export function calculateGameBadges(
  game: GameState | null,
  rankings: PlayerRanking[]
): AwardBadge[] {
  if (!game || !game.players || game.players.length === 0 || !game.rounds || game.rounds.length === 0) {
    return [];
  }

  const badges: AwardBadge[] = [];
  const players = game.players;
  const rounds = game.rounds;
  const isHighestWins = (game.scoringRule || (game as any).scoring_rule) !== 'lowest_wins';

  // Map of player ID to final rank (1-based)
  const finalRankMap: Record<string, number> = {};
  rankings.forEach((r, idx) => {
    finalRankMap[r.player.id] = idx + 1;
  });

  // Player scores history: playerId -> array of round scores
  const playerScoresHistory: Record<string, number[]> = {};
  players.forEach((p) => {
    playerScoresHistory[p.id] = [];
  });

  rounds.forEach((round) => {
    players.forEach((p) => {
      const s = round.scores[p.id];
      if (typeof s === 'number') {
        playerScoresHistory[p.id].push(s);
      }
    });
  });

  // 1. 💥 High Roller (Available even for 1-round games)
  let peakScore: number | null = null;
  let peakPlayerId: string | null = null;
  let peakRoundNum = 1;

  rounds.forEach((round) => {
    Object.entries(round.scores).forEach(([playerId, score]) => {
      if (typeof score !== 'number') return;
      if (
        peakScore === null ||
        (isHighestWins ? score > peakScore : score < peakScore)
      ) {
        peakScore = score;
        peakPlayerId = playerId;
        peakRoundNum = round.roundNumber || (round as any).round_number || 1;
      }
    });
  });

  if (peakPlayerId && peakScore !== null) {
    const player = players.find((p) => p.id === peakPlayerId);
    if (player) {
      badges.push({
        id: 'high_roller',
        title: 'High Roller',
        icon: '💥',
        recipientPlayerId: player.id,
        recipientName: player.name,
        subtitle: `${peakScore} pts in Rd ${peakRoundNum}`,
        description: isHighestWins
          ? `Unleashed a monster ${peakScore} pts in Round ${peakRoundNum}!`
          : `Flawless! Sunk a match-best ${peakScore} pts in Round ${peakRoundNum}!`,
        gradientClass: 'from-amber-500/15 via-orange-500/10 to-amber-500/5',
        badgeBg: 'bg-amber-100 text-amber-800',
        badgeText: 'text-amber-600',
        borderColor: 'border-amber-300',
      });
    }
  }

  // Badges that require at least 2 rounds and at least 2 players
  if (rounds.length >= 2 && players.length >= 2) {
    // 2. 🚀 Comeback King / Queen
    // Compute cumulative rank of each player at the end of each round
    const cumulativeScores: Record<string, number> = {};
    players.forEach((p) => {
      cumulativeScores[p.id] = 0;
    });

    const rankHistoryPerPlayer: Record<string, number[]> = {};
    players.forEach((p) => {
      rankHistoryPerPlayer[p.id] = [];
    });

    rounds.forEach((round) => {
      Object.entries(round.scores).forEach(([pId, score]) => {
        if (typeof score === 'number' && cumulativeScores[pId] !== undefined) {
          cumulativeScores[pId] += score;
        }
      });

      // Rank all players at this round
      const roundRanks = [...players].sort((a, b) => {
        const scoreA = cumulativeScores[a.id];
        const scoreB = cumulativeScores[b.id];
        return isHighestWins ? scoreB - scoreA : scoreA - scoreB;
      });

      roundRanks.forEach((p, idx) => {
        rankHistoryPerPlayer[p.id].push(idx + 1);
      });
    });

    let bestClimb = 0;
    let comebackPlayerId: string | null = null;
    let worstPosition = 1;
    let finalPosition = 1;

    players.forEach((p) => {
      const ranks = rankHistoryPerPlayer[p.id];
      if (ranks && ranks.length > 0) {
        const worst = Math.max(...ranks);
        const final = finalRankMap[p.id] || ranks[ranks.length - 1];
        const climb = worst - final;

        if (climb > bestClimb) {
          bestClimb = climb;
          comebackPlayerId = p.id;
          worstPosition = worst;
          finalPosition = final;
        }
      }
    });

    if (comebackPlayerId && bestClimb >= 1) {
      const player = players.find((p) => p.id === comebackPlayerId);
      if (player) {
        badges.push({
          id: 'comeback',
          title: 'Comeback King',
          icon: '🚀',
          recipientPlayerId: player.id,
          recipientName: player.name,
          subtitle: `+${bestClimb} ranks climbed!`,
          description: `Fought back from #${worstPosition} all the way to #${finalPosition}!`,
          gradientClass: 'from-violet-500/15 via-purple-500/10 to-indigo-500/5',
          badgeBg: 'bg-violet-100 text-violet-800',
          badgeText: 'text-violet-600',
          borderColor: 'border-violet-300',
        });
      }
    }

    // 3. 🎯 Mr. / Ms. Consistent (Lowest standard deviation)
    let lowestStdDev = Infinity;
    let mostConsistentPlayerId: string | null = null;

    players.forEach((p) => {
      const scores = playerScoresHistory[p.id];
      if (scores && scores.length >= 2) {
        const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        const variance =
          scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev < lowestStdDev) {
          lowestStdDev = stdDev;
          mostConsistentPlayerId = p.id;
        }
      }
    });

    if (mostConsistentPlayerId && lowestStdDev < Infinity) {
      const player = players.find((p) => p.id === mostConsistentPlayerId);
      if (player) {
        badges.push({
          id: 'consistent',
          title: 'Mr. Consistent',
          icon: '🎯',
          recipientPlayerId: player.id,
          recipientName: player.name,
          subtitle: `±${lowestStdDev.toFixed(1)} pt variance`,
          description: `Rock solid! Average deviation of only ±${lowestStdDev.toFixed(1)} pts per round.`,
          gradientClass: 'from-emerald-500/15 via-teal-500/10 to-green-500/5',
          badgeBg: 'bg-emerald-100 text-emerald-800',
          badgeText: 'text-emerald-600',
          borderColor: 'border-emerald-300',
        });
      }
    }

    // 4. 🎢 The Rollercoaster (Largest swing between two consecutive rounds)
    let highestSwing = 0;
    let rollercoasterPlayerId: string | null = null;

    players.forEach((p) => {
      const scores = playerScoresHistory[p.id];
      if (scores && scores.length >= 2) {
        let maxSwingForPlayer = 0;
        for (let i = 1; i < scores.length; i++) {
          const swing = Math.abs(scores[i] - scores[i - 1]);
          if (swing > maxSwingForPlayer) {
            maxSwingForPlayer = swing;
          }
        }

        if (maxSwingForPlayer > highestSwing) {
          highestSwing = maxSwingForPlayer;
          rollercoasterPlayerId = p.id;
        }
      }
    });

    if (rollercoasterPlayerId && highestSwing > 0) {
      const player = players.find((p) => p.id === rollercoasterPlayerId);
      if (player) {
        badges.push({
          id: 'rollercoaster',
          title: 'Rollercoaster',
          icon: '🎢',
          recipientPlayerId: player.id,
          recipientName: player.name,
          subtitle: `${highestSwing} pt swing`,
          description: `Wild ride! Swung by ${highestSwing} pts between back-to-back rounds!`,
          gradientClass: 'from-pink-500/15 via-rose-500/10 to-red-500/5',
          badgeBg: 'bg-pink-100 text-pink-800',
          badgeText: 'text-pink-600',
          borderColor: 'border-pink-300',
        });
      }
    }
  }

  return badges;
}
