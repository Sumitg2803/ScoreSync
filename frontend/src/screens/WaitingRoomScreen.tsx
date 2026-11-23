import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MobileContainer } from '../components/MobileContainer';
import { useGameStore } from '../store/useGameStore';
import { Avatar } from '../components/Avatar';
import { CancelGameModal } from '../components/CancelGameModal';
import { HostSettingsModal } from '../components/HostSettingsModal';
import { ToastContainer } from '../components/ToastContainer';
import { ArrowLeft, Play, Copy, Check, Users, Eye, Settings, Lock } from 'lucide-react';

export const WaitingRoomScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const currentGame = useGameStore((state) => state.currentGame);
  const isHost = useGameStore((state) => state.isHost);
  const spectatorCount = useGameStore((state) => state.spectatorCount);
  const startGame = useGameStore((state) => state.startGame);
  const leaveGame = useGameStore((state) => state.leaveGame);
  const resetCurrentGame = useGameStore((state) => state.resetCurrentGame);
  const updateAccessSettings = useGameStore((state) => state.updateAccessSettings);
  const connectWebSocket = useGameStore((state) => state.connectWebSocket);
  const fetchGame = useGameStore((state) => state.fetchGame);
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);
  const toasts = useGameStore((state) => state.toasts);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const allowPlayers = currentGame?.allow_players ?? true;
  const allowViewers = currentGame?.allow_viewers ?? true;
  const isRoomLocked = !allowPlayers && !allowViewers;

  const gameId = id || currentGame?.id || 'A7K9D2';
  const players = currentGame?.players || [];

  React.useEffect(() => {
    if (gameId) {
      connectWebSocket(gameId);
      fetchGame(gameId);
    }
  }, [gameId, connectWebSocket, fetchGame]);

  React.useEffect(() => {
    if (currentGame && currentGame.status === 'in_progress') {
      if (isHost) {
        navigate(`/host-dashboard/${gameId}`);
      } else {
        navigate(`/leaderboard/${gameId}`);
      }
    }
  }, [currentGame?.status, isHost, gameId, navigate]);

  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    await startGame();
    navigate(`/host-dashboard/${gameId}`);
  };

  const handleConfirmExit = async () => {
    setIsCancelModalOpen(false);
    if (isHost) {
      await resetCurrentGame();
    } else {
      await leaveGame();
    }
    navigate('/');
  };

  return (
    <MobileContainer>
      <ToastContainer toasts={toasts} />
      <div className="flex-1 flex flex-col justify-between p-6 pt-8 pb-8">
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-white/60 transition cursor-pointer"
              title={isHost ? 'Cancel Game' : 'Leave Room'}
            >
              <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-2">
              {isHost && (
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="p-2 rounded-xl bg-white shadow-xs border border-slate-200 text-slate-600 hover:text-indigo-600 transition cursor-pointer"
                  title="Room Privacy & Access Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}

              {spectatorCount > 0 && (
                <div
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white shadow-xs border border-slate-200/80 text-slate-700 text-xs font-bold"
                  title="Live Viewers"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5]" />
                  <span>{spectatorCount}</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-center mt-1 mb-6">
            <h1 className="text-2xl font-bold text-[#1E1B4B]">Waiting Room</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Waiting for more players...</p>
          </div>

          {/* Player Crowd Silhouette Banner */}
          <div className="flex justify-center items-center gap-2 mb-6 opacity-30 text-indigo-950">
            <Users className="w-6 h-6" />
            <Users className="w-8 h-8" />
            <Users className="w-6 h-6" />
          </div>

          {/* Real-time Player List Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-4 shadow-lg shadow-indigo-100/60 border border-slate-100 divide-y divide-slate-100">
            {players.map((player) => {
              const hostId = currentGame?.hostId || (currentGame as any)?.host_id;
              const isHostPlayer = player.id === hostId;
              const isSelf = player.id === currentPlayerId;
              const displayName = isSelf
                ? (isHostPlayer ? `${player.name} Host (you)` : `${player.name} (you)`)
                : (isHostPlayer ? `${player.name} Host` : player.name);

              return (
                <div key={player.id} className="flex items-center justify-between py-3.5 px-2 first:pt-1 last:pb-1">
                  <div className="flex items-center gap-3.5">
                    <Avatar name={player.name} size="md" />
                    <span className="font-bold text-sm text-[#1E1B4B]">{displayName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-600">Connected</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Game ID & Host Start CTA */}
        <div className="space-y-4 pt-4">
          {/* Game ID Badge with Copy (Disabled if room locked) */}
          {isRoomLocked ? (
            <div className="flex items-center justify-between bg-amber-50 px-5 py-3 rounded-2xl border border-amber-200/80 shadow-xs">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Game Code</span>
                  <span className="text-xs font-bold text-amber-900">Room Locked • Entries Disabled</span>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase text-amber-700 px-2 py-0.5 rounded-md bg-amber-200/60">
                Private
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Game ID</span>
                <span className="text-base font-black tracking-widest text-[#1E1B4B]">{gameId}</span>
              </div>
              <button
                onClick={handleCopyId}
                className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                title="Copy Game ID"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Start Game CTA - ONLY VISIBLE TO HOST */}
          {isHost ? (
            <button
              onClick={handleStartGame}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#4F46E5] text-white font-bold text-base shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start Game</span>
              <Play className="w-4 h-4 fill-white ml-1" />
            </button>
          ) : (
            <div className="w-full py-3.5 px-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center gap-2 text-indigo-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>Waiting for Host to start the game...</span>
            </div>
          )}
        </div>

        {/* Exit Confirmation Modal */}
        <CancelGameModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          onConfirm={handleConfirmExit}
          isHost={isHost}
        />

        {/* Room Privacy & Admission Settings Modal */}
        <HostSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          allowPlayers={allowPlayers}
          allowViewers={allowViewers}
          onUpdate={updateAccessSettings}
        />
      </div>
    </MobileContainer>
  );
};
