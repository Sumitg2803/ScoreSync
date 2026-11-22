import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, ScoringRule, Player, PlayerRanking } from '../types/game';
import { apiRequest, WS_BASE, getOrCreateDeviceToken } from '../services/api';

interface GameStore {
  currentGame: GameState | null;
  currentPlayerId: string | null;
  hostToken: string | null;
  isHost: boolean;
  isConnected: boolean;
  socket: WebSocket | null;
  toasts: { id: string; type: 'player_joined' | 'player_left' | 'info'; message: string }[];

  // Actions
  addToast: (type: 'player_joined' | 'player_left' | 'info', message: string) => void;
  removeToast: (id: string) => void;
  setGame: (game: GameState) => void;
  setCurrentPlayer: (playerId: string, isHost?: boolean) => void;
  createGame: (name: string, scoringRule: ScoringRule, hostName?: string) => Promise<GameState>;
  joinGame: (gameId: string, playerName: string) => Promise<Player>;
  leaveGame: () => Promise<void>;
  setAdmissionLock: (lock: boolean) => Promise<void>;
  startGame: () => Promise<void>;
  addRound: (scores: Record<string, number>, note?: string) => Promise<void>;
  editRound: (roundNumber: number, scores: Record<string, number>, note?: string) => Promise<void>;
  completeGame: () => Promise<void>;
  playAgain: () => Promise<void>;
  transferHost: (newHostId: string) => Promise<void>;
  resetCurrentGame: () => Promise<void>;
  connectWebSocket: (gameId: string) => void;
  disconnectWebSocket: () => void;
  getRankings: () => PlayerRanking[];
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      currentGame: null,
      currentPlayerId: null,
      hostToken: null,
      isHost: false,
      isConnected: false,
      socket: null,
      toasts: [],

      addToast: (type, message) => {
        // Prevent duplicate toasts within a short window
        const { toasts } = get();
        if (toasts.some((t) => t.message === message)) {
          return;
        }

        const id = Math.random().toString(36).substring(2, 9);
        // Keep at most 1 visible toast at a time for clean UX
        set({ toasts: [{ id, type, message }] });
        setTimeout(() => {
          get().removeToast(id);
        }, 3500);
      },

      removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      },

      setGame: (game: GameState) => set({ currentGame: game }),
      setCurrentPlayer: (playerId: string, isHost = false) => set({ currentPlayerId: playerId, isHost }),

      createGame: async (name: string, scoringRule: ScoringRule, hostName = 'Host') => {
        const data = await apiRequest('/api/games/create', {
          method: 'POST',
          body: JSON.stringify({ name, scoring_rule: scoringRule, host_name: hostName }),
        });

        localStorage.setItem('scoresync_host_token', data.host_token);
        set({
          currentGame: data,
          currentPlayerId: data.host_id,
          hostToken: data.host_token,
          isHost: true,
        });

        get().connectWebSocket(data.id);
        return data;
      },

      joinGame: async (gameId: string, playerName: string) => {
        const deviceToken = getOrCreateDeviceToken();
        const data = await apiRequest(`/api/games/${gameId.toUpperCase()}/join`, {
          method: 'POST',
          body: JSON.stringify({ player_name: playerName, device_token: deviceToken }),
        });

        const player = data.game.players.find((p: Player) => p.id === data.player_id);
        set({
          currentGame: data.game,
          currentPlayerId: data.player_id,
          isHost: false,
        });

        get().connectWebSocket(gameId.toUpperCase());
        return player;
      },

      leaveGame: async () => {
        const { currentGame, currentPlayerId } = get();
        if (currentGame && currentPlayerId) {
          try {
            await apiRequest(`/api/games/${currentGame.id}/leave?player_id=${currentPlayerId}`, {
              method: 'POST',
            });
          } catch {
            // ignore
          }
        }
        localStorage.removeItem('scoresync_device_token');
        get().disconnectWebSocket();
        set({ currentGame: null, currentPlayerId: null, isHost: false });
      },

      setAdmissionLock: async (lock: boolean) => {
        const { currentGame } = get();
        if (!currentGame) return;
        try {
          await apiRequest(`/api/games/${currentGame.id}/lock-admission?lock=${lock}`, {
            method: 'POST',
          });
        } catch {
          // ignore
        }
      },

      startGame: async () => {
        const { currentGame } = get();
        if (!currentGame) return;
        const updated = await apiRequest(`/api/games/${currentGame.id}/start`, { method: 'POST' });
        set({ currentGame: updated });
      },

      addRound: async (scores: Record<string, number>, note?: string) => {
        const { currentGame } = get();
        if (!currentGame) return;
        const updated = await apiRequest(`/api/games/${currentGame.id}/rounds`, {
          method: 'POST',
          body: JSON.stringify({ scores, note }),
        });
        set({ currentGame: updated });
      },

      editRound: async (roundNumber: number, scores: Record<string, number>, note?: string) => {
        const { currentGame } = get();
        if (!currentGame) return;
        const updated = await apiRequest(`/api/games/${currentGame.id}/rounds/${roundNumber}`, {
          method: 'PUT',
          body: JSON.stringify({ scores, note }),
        });
        set({ currentGame: updated });
      },

      completeGame: async () => {
        const { currentGame } = get();
        if (!currentGame) return;
        const updated = await apiRequest(`/api/games/${currentGame.id}/complete`, { method: 'POST' });
        set({ currentGame: updated });
      },

      playAgain: async () => {
        const { currentGame } = get();
        if (!currentGame) return;
        const updated = await apiRequest(`/api/games/${currentGame.id}/play-again`, { method: 'POST' });
        set({ currentGame: updated });
      },

      transferHost: async (newHostId: string) => {
        const { currentGame } = get();
        if (!currentGame) return;
        await apiRequest(`/api/games/${currentGame.id}/transfer-host?new_host_id=${newHostId}`, {
          method: 'POST',
        });
        localStorage.removeItem('scoresync_host_token');
        get().disconnectWebSocket();
        set({ currentGame: null, currentPlayerId: null, hostToken: null, isHost: false });
      },

      resetCurrentGame: async () => {
        const { currentGame } = get();
        if (currentGame) {
          try {
            await apiRequest(`/api/games/${currentGame.id}/reset`, { method: 'POST' });
          } catch {
            // Ignored if already cleaned
          }
        }
        localStorage.removeItem('scoresync_host_token');
        get().disconnectWebSocket();
        set({ currentGame: null, currentPlayerId: null, hostToken: null, isHost: false });
      },

      connectWebSocket: (gameId: string) => {
        const { socket } = get();
        if (socket) {
          socket.close();
        }

        const wsUrl = `${WS_BASE}/ws/${gameId}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          set({ isConnected: true });
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'GAME_TERMINATED') {
              localStorage.removeItem('scoresync_host_token');
              get().disconnectWebSocket();
              set({ currentGame: null, currentPlayerId: null, hostToken: null, isHost: false });
              window.location.href = '/';
              return;
            }

            if (data.event === 'HOST_TRANSFERRED' && data.meta) {
              const { currentPlayerId } = get();
              // If this device is the chosen new host, upgrade rights and persist new host token
              if (data.meta.newHostId === currentPlayerId) {
                localStorage.setItem('scoresync_host_token', data.meta.newHostToken);
                set({ isHost: true, hostToken: data.meta.newHostToken });
                window.location.href = `/host-dashboard/${data.game.id}`;
                return;
              }
              get().addToast('info', data.meta.message);
            } else if (data.event === 'PLAYER_JOINED' && data.meta?.message) {
              get().addToast('player_joined', data.meta.message);
            } else if (data.event === 'PLAYER_LEFT' && data.meta?.message) {
              get().addToast('player_left', data.meta.message);
            }

            if (data.game) {
              set({ currentGame: data.game });
            }
          } catch {
            // Non-JSON message
          }
        };

        ws.onclose = () => {
          set({ isConnected: false, socket: null });
        };

        set({ socket: ws });
      },

      disconnectWebSocket: () => {
        const { socket } = get();
        if (socket) {
          socket.close();
          set({ socket: null, isConnected: false });
        }
      },

      getRankings: () => {
        const { currentGame } = get();
        if (!currentGame || !currentGame.players || !currentGame.players.length) return [];

        const totals: Record<string, { total: number; rounds: number[] }> = {};
        currentGame.players.forEach(p => {
          totals[p.id] = { total: 0, rounds: [] };
        });

        (currentGame.rounds || []).forEach(r => {
          Object.entries(r.scores || {}).forEach(([pId, score]) => {
            if (totals[pId]) {
              totals[pId].total += score;
              totals[pId].rounds.push(score);
            }
          });
        });

        const isHighest = currentGame.scoringRule === 'highest_wins' || (currentGame as any).scoring_rule === 'highest_wins';

        const list: PlayerRanking[] = currentGame.players.map(p => ({
          player: p,
          totalScore: totals[p.id]?.total ?? 0,
          rank: 1,
          roundScores: totals[p.id]?.rounds ?? [],
        }));

        list.sort((a, b) => {
          if (isHighest) {
            return b.totalScore - a.totalScore;
          } else {
            return a.totalScore - b.totalScore;
          }
        });

        let currentRank = 1;
        for (let i = 0; i < list.length; i++) {
          if (i > 0 && list[i].totalScore === list[i - 1].totalScore) {
            list[i].rank = list[i - 1].rank;
          } else {
            list[i].rank = currentRank;
          }
          currentRank++;
        }

        return list;
      },
    }),
    {
      name: 'scoresync_game_storage',
      partialize: (state) => ({
        currentGame: state.currentGame,
        currentPlayerId: state.currentPlayerId,
        hostToken: state.hostToken,
        isHost: state.isHost,
      }),
    }
  )
);
