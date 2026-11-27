import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, ScoringRule, Player, PlayerRanking } from '../types/game';
import { apiRequest, WS_BASE, getOrCreateDeviceToken } from '../services/api';
import { soundEffects } from '../utils/soundEffects';

export interface HostRouletteState {
  active: boolean;
  candidates: { id: string; name: string }[];
  winnerId: string;
  winnerName: string;
  durationMs: number;
  oldHostName?: string;
}

export interface MaintenanceInfo {
  is_active: boolean;
  disable_games?: boolean;
  disable_feedback?: boolean;
  master_shutdown?: boolean;
  message: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
}

interface GameStore {
  currentGame: GameState | null;
  currentPlayerId: string | null;
  hostToken: string | null;
  isHost: boolean;
  isSpectator: boolean;
  spectatorCount: number;
  isConnected: boolean;
  socket: WebSocket | null;
  toasts: { id: string; type: 'player_joined' | 'player_left' | 'info'; message: string }[];
  hostRoulette: HostRouletteState | null;
  latestReaction: { id: string; emoji: string; timestamp: number } | null;
  maintenance: MaintenanceInfo | null;

  // Actions
  setMaintenance: (maintenance: MaintenanceInfo | null) => void;
  addToast: (type: 'player_joined' | 'player_left' | 'info', message: string) => void;
  removeToast: (id: string) => void;
  setGame: (game: GameState) => void;
  setCurrentPlayer: (playerId: string, isHost?: boolean) => void;
  fetchGame: (gameId: string) => Promise<GameState>;
  createGame: (name: string, scoringRule: ScoringRule, hostName?: string) => Promise<GameState>;
  joinGame: (gameId: string, playerName: string) => Promise<Player>;
  joinAsSpectator: (gameId: string) => Promise<GameState>;
  leaveGame: () => Promise<void>;
  leaveSpectator: () => Promise<void>;
  updateAccessSettings: (allowPlayers: boolean, allowViewers: boolean) => Promise<void>;
  setAdmissionLock: (lock: boolean) => Promise<void>;
  startGame: () => Promise<void>;
  addRound: (scores: Record<string, number>, note?: string) => Promise<void>;
  editRound: (roundNumber: number, scores: Record<string, number>, note?: string) => Promise<void>;
  completeGame: () => Promise<void>;
  playAgain: () => Promise<void>;
  startHostRoulette: () => Promise<void>;
  transferHost: (newHostId: string) => Promise<void>;
  dismissHostRoulette: () => void;
  sendReaction: (emoji: string) => void;
  resetCurrentGame: () => Promise<void>;
  connectWebSocket: (gameId: string) => void;
  disconnectWebSocket: () => void;
  getRankings: () => PlayerRanking[];
}

let wsHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let wsVisibilityListenerAttached = false;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      currentGame: null,
      currentPlayerId: null,
      hostToken: null,
      isHost: false,
      isSpectator: false,
      spectatorCount: 0,
      isConnected: false,
      socket: null,
      toasts: [],
      hostRoulette: null,
      latestReaction: null,
      maintenance: null,

      setMaintenance: (maintenance) => set({ maintenance }),

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

      fetchGame: async (gameId: string) => {
        const data = await apiRequest(`/api/games/${gameId.toUpperCase()}`);
        const count = data.spectator_count ?? (data.spectators?.length ?? 0);
        set({ currentGame: data, spectatorCount: count });
        return data;
      },

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
          isSpectator: false,
          spectatorCount: 0,
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
        const sCount = data.game.spectator_count ?? (data.game.spectators?.length ?? 0);
        set({
          currentGame: data.game,
          currentPlayerId: data.player_id,
          isHost: false,
          isSpectator: false,
          spectatorCount: sCount,
        });

        get().connectWebSocket(gameId.toUpperCase());
        return player;
      },

      joinAsSpectator: async (gameId: string) => {
        const deviceToken = getOrCreateDeviceToken();
        const data = await apiRequest(`/api/games/${gameId.toUpperCase()}/join-spectator`, {
          method: 'POST',
          body: JSON.stringify({ device_token: deviceToken }),
        });

        const sCount = data.spectator_count ?? (data.game?.spectator_count ?? (data.game?.spectators?.length ?? 0));
        set({
          currentGame: data.game,
          currentPlayerId: null,
          isHost: false,
          isSpectator: true,
          spectatorCount: sCount,
        });

        get().connectWebSocket(gameId.toUpperCase());
        return data.game;
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
        localStorage.removeItem('scoresync_game_storage');
        get().disconnectWebSocket();
        set({ currentGame: null, currentPlayerId: null, isHost: false, isSpectator: false, spectatorCount: 0 });
      },

      leaveSpectator: async () => {
        const { currentGame } = get();
        const deviceToken = localStorage.getItem('scoresync_device_token');
        if (currentGame && deviceToken) {
          try {
            await apiRequest(`/api/games/${currentGame.id}/leave-spectator?device_token=${encodeURIComponent(deviceToken)}`, {
              method: 'POST',
            });
          } catch {
            // ignore
          }
        }
        localStorage.removeItem('scoresync_device_token');
        localStorage.removeItem('scoresync_game_storage');
        get().disconnectWebSocket();
        set({
          currentGame: null,
          currentPlayerId: null,
          isHost: false,
          isSpectator: false,
          spectatorCount: 0,
        });
      },

      updateAccessSettings: async (allowPlayers: boolean, allowViewers: boolean) => {
        const { currentGame } = get();
        if (!currentGame) return;
        const updated = await apiRequest(`/api/games/${currentGame.id}/access-settings`, {
          method: 'POST',
          body: JSON.stringify({ allow_players: allowPlayers, allow_viewers: allowViewers }),
        });
        set({ currentGame: updated });
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

      startHostRoulette: async () => {
        const { currentGame, hostToken } = get();
        if (!currentGame) return;
        const token = hostToken || localStorage.getItem('scoresync_host_token');
        await apiRequest(`/api/games/${currentGame.id}/start-host-roulette`, {
          method: 'POST',
          headers: token ? { 'X-Host-Token': token } : {},
        });
      },

      dismissHostRoulette: () => {
        set({ hostRoulette: null });
      },

      sendReaction: (emoji: string) => {
        const { socket } = get();
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ action: 'reaction', emoji }));
        }
      },

      transferHost: async (newHostId: string) => {
        const { currentGame, hostToken } = get();
        if (!currentGame) return;
        const gameId = currentGame.id;
        const token = hostToken || localStorage.getItem('scoresync_host_token');

        // 1. Send the transfer request FIRST with host credentials intact
        await apiRequest(`/api/games/${gameId}/transfer-host?new_host_id=${newHostId}`, {
          method: 'POST',
          headers: token ? { 'X-Host-Token': token } : {},
        });

        // 2. ONLY upon successful API response, cleanly detach and clear host storage
        get().disconnectWebSocket();
        localStorage.removeItem('scoresync_host_token');
        localStorage.removeItem('scoresync_game_storage');
        set({
          currentGame: null,
          currentPlayerId: null,
          hostToken: null,
          isHost: false,
          isSpectator: false,
          spectatorCount: 0,
          hostRoulette: null,
          toasts: [],
        });
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
        set({ currentGame: null, currentPlayerId: null, hostToken: null, isHost: false, isSpectator: false, spectatorCount: 0 });
      },

      connectWebSocket: (gameId: string) => {
        if (wsReconnectTimer) {
          clearTimeout(wsReconnectTimer);
          wsReconnectTimer = null;
        }

        const { socket } = get();
        if (socket) {
          socket.close();
        }

        const wsUrl = `${WS_BASE}/ws/${gameId}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          set({ isConnected: true });
          // Heartbeat ping every 25 seconds to keep Render connection alive indefinitely
          if (wsHeartbeatTimer) clearInterval(wsHeartbeatTimer);
          wsHeartbeatTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'GAME_TERMINATED') {
              localStorage.removeItem('scoresync_host_token');
              localStorage.removeItem('scoresync_device_token');
              get().disconnectWebSocket();
              set({ currentGame: null, currentPlayerId: null, hostToken: null, isHost: false, isSpectator: false, spectatorCount: 0 });
              window.location.href = '/';
              return;
            }

            // Immediate state hydration on connect
            if (data.event === 'SYNC_STATE' && data.game) {
              const count = data.game.spectator_count ?? (data.game.spectators?.length ?? get().spectatorCount);
              set({ currentGame: data.game, spectatorCount: count });
              return;
            }

            if (data.event === 'MAINTENANCE_UPDATE' || data.event === 'GLOBAL_ANNOUNCEMENT' || data.event === 'ROOM_ADMIN_MESSAGE') {
              window.dispatchEvent(
                new CustomEvent('scoresync-broadcast', { detail: { type: data.event, data: data.meta } })
              );
              return;
            }

            // Live floating emoji reaction from viewer or player
            if (data.event === 'EMOJI_REACTION' && data.meta?.emoji) {
              soundEffects.playReactionPop();
              set({
                latestReaction: {
                  id: data.meta.id || Math.random().toString(),
                  emoji: data.meta.emoji,
                  timestamp: Date.now(),
                },
              });
              return;
            }

            if (data.event === 'SPECTATOR_COUNT_CHANGED') {
              if (typeof data.meta?.spectator_count === 'number') {
                set({ spectatorCount: data.meta.spectator_count });
              }
            }

            if (data.event === 'HOST_ROULETTE_STARTED' && data.meta) {
              set({
                hostRoulette: {
                  active: true,
                  candidates: data.meta.candidates || [],
                  winnerId: data.meta.winnerId,
                  winnerName: data.meta.winnerName,
                  durationMs: data.meta.durationMs || 5000,
                  oldHostName: data.meta.oldHostName || 'Host',
                },
              });
            }

            if (data.event === 'HOST_TRANSFERRED' && data.meta) {
              const { currentPlayerId, isHost } = get();

              // If this device was the OLD host that transferred and left:
              if (isHost && data.meta.newHostId !== currentPlayerId) {
                get().disconnectWebSocket();
                localStorage.removeItem('scoresync_host_token');
                localStorage.removeItem('scoresync_game_storage');
                set({
                  currentGame: null,
                  currentPlayerId: null,
                  hostToken: null,
                  isHost: false,
                  isSpectator: false,
                  spectatorCount: 0,
                  hostRoulette: null,
                  toasts: [],
                });
                window.location.href = '/';
                return;
              }

              // If this device is the chosen NEW host, upgrade rights and persist new host token
              if (data.meta.newHostId === currentPlayerId) {
                localStorage.setItem('scoresync_host_token', data.meta.newHostToken);
                const count = data.game?.spectator_count ?? (data.meta.spectator_count ?? get().spectatorCount);
                set({
                  currentGame: data.game,
                  isHost: true,
                  hostToken: data.meta.newHostToken,
                  spectatorCount: count,
                  hostRoulette: null,
                });
                get().addToast('info', '👑 You are now the Host!');
                setTimeout(() => {
                  window.location.href = `/host-dashboard/${data.game.id}`;
                }, 1200);
                return;
              }

              set({ hostRoulette: null });
              get().addToast('info', data.meta.message);
            } else if (data.event === 'PLAYER_JOINED' && data.meta?.message) {
              get().addToast('player_joined', data.meta.message);
            } else if (data.event === 'PLAYER_LEFT' && data.meta?.message) {
              get().addToast('player_left', data.meta.message);
            }

            if (data.game) {
              const count = data.game.spectator_count ?? (data.game.spectators?.length ?? get().spectatorCount);
              set({ currentGame: data.game, spectatorCount: count });
            }
          } catch {
            // Non-JSON message
          }
        };

        ws.onclose = () => {
          set({ isConnected: false, socket: null });
          if (wsHeartbeatTimer) {
            clearInterval(wsHeartbeatTimer);
            wsHeartbeatTimer = null;
          }

          // Resilient auto-reconnect: if game is still active, retry in 1.5s
          if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
          const { currentGame } = get();
          if (currentGame && currentGame.id === gameId) {
            wsReconnectTimer = setTimeout(() => {
              get().connectWebSocket(gameId);
            }, 1500);
          }
        };

        set({ socket: ws });

        // Visibility & focus listener: catch up immediately when user returns to this tab or unlocks screen
        if (!wsVisibilityListenerAttached && typeof document !== 'undefined') {
          wsVisibilityListenerAttached = true;
          const handleWakeup = () => {
            if (document.visibilityState === 'visible') {
              const { currentGame: activeGame, socket: activeSocket, isConnected: connected } = get();
              if (activeGame && activeGame.id) {
                if (!activeSocket || !connected || activeSocket.readyState !== WebSocket.OPEN) {
                  get().connectWebSocket(activeGame.id);
                }
                get().fetchGame(activeGame.id).catch(() => {});
              }
            }
          };
          document.addEventListener('visibilitychange', handleWakeup);
          window.addEventListener('focus', handleWakeup);
        }
      },

      disconnectWebSocket: () => {
        if (wsHeartbeatTimer) {
          clearInterval(wsHeartbeatTimer);
          wsHeartbeatTimer = null;
        }
        if (wsReconnectTimer) {
          clearTimeout(wsReconnectTimer);
          wsReconnectTimer = null;
        }
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
        isSpectator: state.isSpectator,
      }),
    }
  )
);
