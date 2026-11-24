import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MobileContainer } from '../components/MobileContainer';
import { useGameStore } from '../store/useGameStore';
import { TrophyIllustration } from '../components/Illustrations';
import { GameCodeModal } from '../components/GameCodeModal';
import { ExitConfirmModal } from '../components/ExitConfirmModal';
import { ToastContainer } from '../components/ToastContainer';
import { SoundToggleButton } from '../components/SoundToggleButton';
import { soundEffects } from '../utils/soundEffects';
import { FloatingReactionsCanvas, EmojiReactionDock } from '../components/EmojiReactions';
import { ArrowLeft, Crown, BarChart3, QrCode, LogOut, Eye, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export const LeaderboardScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const currentGame = useGameStore((state) => state.currentGame);
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);
  const isSpectator = useGameStore((state) => state.isSpectator);
  const spectatorCount = useGameStore((state) => state.spectatorCount);
  const getRankings = useGameStore((state) => state.getRankings);
  const leaveGame = useGameStore((state) => state.leaveGame);
  const leaveSpectator = useGameStore((state) => state.leaveSpectator);
  const connectWebSocket = useGameStore((state) => state.connectWebSocket);
  const fetchGame = useGameStore((state) => state.fetchGame);
  const toasts = useGameStore((state) => state.toasts);

  const [activeTab, setActiveTab] = useState<'overall' | 'rounds'>('overall');
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const gameId = id || currentGame?.id || 'A7K9D2';
  const isRoomLocked = currentGame?.allow_players === false && currentGame?.allow_viewers === false;

  React.useEffect(() => {
    if (gameId) {
      connectWebSocket(gameId);
      fetchGame(gameId);
    }
  }, [gameId, connectWebSocket, fetchGame]);

  React.useEffect(() => {
    if (currentGame && currentGame.status === 'completed') {
      navigate(`/results/${gameId}`);
    }
  }, [currentGame?.status, gameId, navigate]);

  // Play gentle chime when a new round is recorded
  const prevRoundsCountRef = React.useRef(currentGame?.rounds?.length || 0);
  React.useEffect(() => {
    const currentCount = currentGame?.rounds?.length || 0;
    if (currentCount > prevRoundsCountRef.current) {
      soundEffects.playRoundSaved();
    }
    prevRoundsCountRef.current = currentCount;
  }, [currentGame?.rounds?.length]);

  const handleConfirmExit = async () => {
    if (isSpectator) {
      await leaveSpectator();
    } else {
      await leaveGame();
    }
    setIsExitModalOpen(false);
    navigate('/');
  };

  // Audience Holding Screen: When host clicked "Play Again", spectators see this waiting screen
  if (isSpectator && currentGame?.status === 'waiting') {
    return (
      <MobileContainer>
        <ToastContainer toasts={toasts} />
        <div className="flex-1 flex flex-col justify-between p-6 pt-10 pb-8 relative">
          {/* Top Status & Controls */}
          <div className="flex items-center justify-between">
            {isRoomLocked ? (
              <div
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold"
                title="Room Locked - New entries closed"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Room Locked</span>
              </div>
            ) : (
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white shadow-xs border border-slate-200/80 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                <span>{gameId}</span>
                <QrCode className="w-3.5 h-3.5 text-indigo-600" />
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <SoundToggleButton />
              {spectatorCount > 0 && (
                <div
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white shadow-xs border border-slate-200/80 text-slate-700 text-xs font-bold"
                  title="Live Viewers"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5]" />
                  <span>{spectatorCount}</span>
                </div>
              )}

              <button
                onClick={() => setIsExitModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
                title="Exit Spectator Mode"
              >
                <LogOut className="w-3 h-3" />
                <span>Exit</span>
              </button>
            </div>
          </div>

          {/* Center Hero with Trophy, ScoreSync, and holding message */}
          <div className="flex-1 flex flex-col items-center justify-center text-center my-auto px-4">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: [1, 1.04, 1], opacity: 1 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-6 relative"
            >
              <div className="absolute inset-0 bg-[#7016E6]/25 rounded-full blur-2xl transform scale-125 pointer-events-none" />
              <img
                src="/logo.png"
                alt="ScoreSync Logo"
                className="w-28 h-28 object-contain relative z-10 drop-shadow-xl"
              />
            </motion.div>

            <h1 className="text-4xl font-extrabold tracking-tight text-[#1E1B4B] mb-2">
              ScoreSync
            </h1>

            <p className="text-sm font-semibold text-slate-600 max-w-xs mx-auto leading-relaxed mt-2">
              Game is not over yet, stay connected while next game start
            </p>

            <div className="mt-6 px-4 py-2 rounded-2xl bg-indigo-50/90 border border-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
              <span>Host is setting up the next match...</span>
            </div>

            {/* Live Emoji Reactions Dock for Spectators */}
            <div className="mt-6">
              <EmojiReactionDock />
            </div>
          </div>

          <FloatingReactionsCanvas />

          {/* Bottom Game ID Chip */}
          <div className="text-center text-[11px] font-bold text-slate-400">
            Spectating Game #{gameId}
          </div>

          <ExitConfirmModal
            isOpen={isExitModalOpen}
            onClose={() => setIsExitModalOpen(false)}
            onConfirm={handleConfirmExit}
            title="Exit Spectator Mode?"
            description="You will stop watching this game. You can re-join anytime using the game code."
            confirmText="Yes, Exit"
          />

          <GameCodeModal
            isOpen={isQrModalOpen}
            onClose={() => setIsQrModalOpen(false)}
            gameId={gameId}
          />
        </div>
      </MobileContainer>
    );
  }

  const rankings = getRankings();
  const rounds = currentGame?.rounds || [];
  const completedRoundsCount = rounds.length;

  // Default selected round to the latest completed round if none selected
  const activeRoundIndex = selectedRoundIndex !== null 
    ? selectedRoundIndex 
    : (completedRoundsCount > 0 ? completedRoundsCount - 1 : 0);

  const currentViewingRound = rounds[activeRoundIndex];

  return (
    <MobileContainer>
      <ToastContainer toasts={toasts} />
      <div className="flex-1 flex flex-col justify-between p-6 pt-6 pb-8">
        {/* Top Header with Back, Corner Game ID + QR, Eye counter, and Exit button */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => {
                if (isSpectator) {
                  setIsExitModalOpen(true);
                } else {
                  navigate('/');
                }
              }}
              className="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-white/60 transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-1.5">
              {/* Corner Game ID & QR button (Locked when both restricted) */}
              {isRoomLocked ? (
                <div
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold"
                  title="Room Locked - New entries closed"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Locked</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsQrModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white shadow-xs border border-slate-200/80 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  <span>{gameId}</span>
                  <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                </button>
              )}

              {/* Live Eye Counter (Only shown when viewers are watching) */}
              {spectatorCount > 0 && (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-xl bg-white shadow-xs border border-slate-200/80 text-indigo-600 text-xs font-bold"
                  title="Live Viewers"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5]" />
                  <span>{spectatorCount}</span>
                </div>
              )}

              {/* Sound FX Mute Toggle Button */}
              <SoundToggleButton />

              {/* Exit Game Button */}
              <button
                onClick={() => setIsExitModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
                title={isSpectator ? 'Exit Spectator Mode' : 'Exit Game'}
              >
                <LogOut className="w-3 h-3" />
                <span>Exit</span>
              </button>
            </div>
          </div>

          <div className="text-center mt-0 mb-3">
            <h1 className="text-xl font-black text-[#1E1B4B]">Leaderboard</h1>
          </div>

          {/* Small Trophy Centered Graphic */}
          <div className="flex justify-center mb-4">
            <TrophyIllustration size={64} />
          </div>

          {/* Overall vs Rounds Segmented Toggle */}
          <div className="flex bg-purple-100/70 p-1 rounded-2xl mb-4 max-w-[220px] mx-auto border border-purple-200/50">
            <button
              onClick={() => setActiveTab('overall')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeTab === 'overall'
                  ? 'bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF] text-white shadow-xs'
                  : 'text-purple-900/70 hover:text-purple-950'
              }`}
            >
              Overall
            </button>
            <button
              onClick={() => setActiveTab('rounds')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeTab === 'rounds'
                  ? 'bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF] text-white shadow-xs'
                  : 'text-purple-900/70 hover:text-purple-950'
              }`}
            >
              Rounds
            </button>
          </div>

          {/* Round Selector Pills (When in Rounds view) */}
          {activeTab === 'rounds' && rounds.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-3 mb-2 px-1">
              {rounds.map((r, idx) => (
                <button
                  key={r.roundNumber || idx}
                  onClick={() => setSelectedRoundIndex(idx)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    activeRoundIndex === idx
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Round {r.roundNumber || idx + 1}
                </button>
              ))}
            </div>
          )}

          {/* Ranked Player Cards */}
          <div className="bg-white rounded-3xl p-4 shadow-lg shadow-indigo-100/70 border border-slate-100 divide-y divide-slate-100">
            {rankings.map((item, index) => {
              const joinedAtRound = (item.player as any).joined_at_round || 1;
              const viewingRoundNumber = activeRoundIndex + 1;
              const didNotExist = viewingRoundNumber < joinedAtRound;
              const isCurrentUser = !isSpectator && item.player.id === currentPlayerId;

              // Calculate specific round score for this player
              let roundScore = 0;
              if (currentViewingRound && currentViewingRound.scores) {
                roundScore = currentViewingRound.scores[item.player.id] ?? 0;
              }

              return (
                <div key={item.player.id} className="flex items-center justify-between py-3.5 px-2 first:pt-1 last:pb-1">
                  <div className="flex items-center gap-2.5">
                    {index === 0 ? (
                      <Crown className="w-5 h-5 text-amber-500 fill-amber-400 ml-1" />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center ml-1">
                        {index + 1}
                      </span>
                    )}
                    <div>
                      <span className="font-bold text-sm text-[#1E1B4B] block">
                        {(() => {
                          const hostId = currentGame?.hostId || (currentGame as any)?.host_id;
                          const isHostPlayer = item.player.id === hostId;
                          if (isCurrentUser) {
                            return isHostPlayer
                              ? `${item.player.name} Host (you)`
                              : `${item.player.name} (You)`;
                          }
                          return isHostPlayer
                            ? `${item.player.name} Host`
                            : item.player.name;
                        })()}
                      </span>
                      {activeTab === 'rounds' && didNotExist && (
                        <span className="text-[10px] font-semibold text-amber-600 block">
                          {isCurrentUser
                            ? 'You didn’t exist here! 👻'
                            : 'Not born yet 🐣'}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="font-bold text-sm text-[#1E1B4B]">
                    {activeTab === 'overall'
                      ? item.totalScore.toFixed(2)
                      : didNotExist
                        ? '-'
                        : `${roundScore > 0 ? '+' : ''}${roundScore.toFixed(2)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Reactions Canvas */}
        <FloatingReactionsCanvas />

        {/* Bottom Current Round Status Chip & Floating Reaction Bar */}
        <div className="pt-3 space-y-2">
          {/* Reaction Bar */}
          <div className="flex justify-center">
            <EmojiReactionDock />
          </div>

          <div className="flex items-center justify-between w-full bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-xs">
            <span className="text-xs font-bold text-slate-700">
              {completedRoundsCount === 0
                ? 'Round 1 in progress...'
                : `Current Round: ${completedRoundsCount}`}
            </span>
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        {/* Game Code / QR Modal */}
        <GameCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          gameId={gameId}
        />

        {/* Exit Game Confirmation Modal */}
        <ExitConfirmModal
          isOpen={isExitModalOpen}
          onClose={() => setIsExitModalOpen(false)}
          onConfirm={handleConfirmExit}
          title={isSpectator ? 'Exit Spectator Mode?' : 'Exit Game?'}
          description={
            isSpectator
              ? 'You will stop watching this game. You can re-join anytime using the game code.'
              : 'Are you sure you want to exit? Your recorded scores will be completely removed and you will not be included in the final rankings.'
          }
          confirmText={isSpectator ? 'Yes, Exit' : 'Yes, Exit Game'}
        />
      </div>
    </MobileContainer>
  );
};
