import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MobileContainer } from '../components/MobileContainer';
import { useGameStore } from '../store/useGameStore';
import { Avatar } from '../components/Avatar';
import { AddRoundSheet } from '../components/AddRoundSheet';
import { EditRoundSheet } from '../components/EditRoundSheet';
import { GameCodeModal } from '../components/GameCodeModal';
import { TransferHostModal } from '../components/TransferHostModal';
import { CompleteGameModal } from '../components/CompleteGameModal';
import { ToastContainer } from '../components/ToastContainer';
import { Crown, Plus, BarChart2, CheckCircle2, Edit3, QrCode, LogOut } from 'lucide-react';

export const HostDashboardScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const currentGame = useGameStore((state) => state.currentGame);
  const getRankings = useGameStore((state) => state.getRankings);
  const addRound = useGameStore((state) => state.addRound);
  const editRound = useGameStore((state) => state.editRound);
  const completeGame = useGameStore((state) => state.completeGame);
  const transferHost = useGameStore((state) => state.transferHost);
  const setAdmissionLock = useGameStore((state) => state.setAdmissionLock);
  const connectWebSocket = useGameStore((state) => state.connectWebSocket);
  const toasts = useGameStore((state) => state.toasts);

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const gameId = id || currentGame?.id || 'A7K9D2';

  React.useEffect(() => {
    if (gameId) {
      connectWebSocket(gameId);
    }
  }, [gameId, connectWebSocket]);

  const gameTitle = currentGame?.name || 'Friday Game Night';
  const rankings = getRankings();
  const rounds = currentGame?.rounds || [];

  const highestScore = rankings[0]?.totalScore || 0;

  const handleOpenAddSheet = async () => {
    await setAdmissionLock(true);
    setIsAddSheetOpen(true);
  };

  const handleCloseAddSheet = async () => {
    await setAdmissionLock(false);
    setIsAddSheetOpen(false);
  };

  const handleOpenEditSheet = async () => {
    await setAdmissionLock(true);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = async () => {
    await setAdmissionLock(false);
    setIsEditSheetOpen(false);
  };

  const handleSaveRound = async (scores: Record<string, number>) => {
    await addRound(scores);
    await setAdmissionLock(false);
    setIsAddSheetOpen(false);
  };

  const handleSaveEdit = async (roundNumber: number, scores: Record<string, number>, note?: string) => {
    await editRound(roundNumber, scores, note);
  };

  const otherPlayers = (currentGame?.players || []).filter(
    (p) => p.id !== (currentGame?.hostId || (currentGame as any)?.host_id)
  );

  const handleFinishGame = async () => {
    try {
      setIsFinishing(true);
      await completeGame();
      setIsCompleteModalOpen(false);
      navigate(`/results/${gameId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to complete game');
    } finally {
      setIsFinishing(false);
    }
  };

  const handleOpenTransferModal = () => {
    if (otherPlayers.length === 0) {
      if (confirm('No other players are currently in the room. Exiting will finish this game. Proceed?')) {
        handleFinishGame();
      }
      return;
    }
    setIsTransferModalOpen(true);
  };

  const handleSelectNewHost = async (newHostId: string) => {
    try {
      setIsTransferring(true);
      await transferHost(newHostId);
      setIsTransferModalOpen(false);
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to transfer host');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <MobileContainer dark>
      <ToastContainer toasts={toasts} />
      <div className="flex-1 flex flex-col justify-between p-6 pt-8 pb-8 relative">
        {/* Top Live Bar & Corner Game ID */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <BarChart2 className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-bold text-white tracking-wide truncate max-w-[140px]">{gameTitle}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Corner Game ID & QR button */}
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
                title="Show QR Code"
              >
                <span>{gameId}</span>
                <QrCode className="w-3.5 h-3.5 text-indigo-400" />
              </button>

              {/* Host Exit Button */}
              <button
                onClick={handleOpenTransferModal}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-bold hover:bg-rose-900/60 transition cursor-pointer"
                title="Transfer Host & Exit"
              >
                <LogOut className="w-3 h-3 text-rose-400" />
                <span>Exit</span>
              </button>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-300">Live</span>
              </div>
            </div>
          </div>

          {/* Central Circular Progress Metric */}
          <div className="flex flex-col items-center justify-center my-4">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Outer Glow & Gradient Arc */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#1E293B"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="url(#accentArc)"
                  strokeWidth="7"
                  strokeDasharray="264"
                  strokeDashoffset="66"
                  strokeLinecap="round"
                  fill="transparent"
                />
                <defs>
                  <linearGradient id="accentArc" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="50%" stopColor="#818CF8" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-white tracking-tight">
                  {Math.round(highestScore)}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                  Round {currentGame?.rounds?.length || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Dark Leaderboard Player List */}
          <div className="space-y-2.5 mt-6">
            {rankings.map((item, index) => (
              <div
                key={item.player.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-md backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  {index === 0 ? (
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                    </div>
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                  )}
                  <Avatar name={item.player.name} size="sm" />
                  <div>
                    <span className="font-bold text-sm text-slate-100 block">
                      {item.player.id === (currentGame?.hostId || (currentGame as any)?.host_id)
                        ? `${item.player.name} Host (You)`
                        : item.player.name}
                    </span>
                  </div>
                </div>

                <span className="font-extrabold text-base text-white tracking-tight">
                  {item.totalScore.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-2.5 pt-4">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleOpenAddSheet}
              className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#4F46E5] text-white font-bold text-sm shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-indigo-500/50"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Round</span>
            </button>

            <button
              onClick={handleOpenEditSheet}
              disabled={rounds.length === 0}
              className="py-3.5 px-4 rounded-2xl bg-slate-800 text-slate-200 font-bold text-sm border border-slate-700/80 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Edit3 className="w-4 h-4 text-indigo-400 stroke-[2.2]" />
              <span>Edit Scores</span>
            </button>
          </div>

          <button
            onClick={() => setIsCompleteModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800/60 text-slate-400 font-semibold text-xs border border-slate-800 hover:bg-slate-800 hover:text-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Complete Game & View Results</span>
          </button>
        </div>

        {/* Add Round Bottom Sheet */}
        <AddRoundSheet
          isOpen={isAddSheetOpen}
          onClose={handleCloseAddSheet}
          players={rankings.map(r => r.player)}
          onSave={handleSaveRound}
        />

        {/* Edit Round Bottom Sheet */}
        <EditRoundSheet
          isOpen={isEditSheetOpen}
          onClose={handleCloseEditSheet}
          rounds={rounds}
          players={rankings.map(r => r.player)}
          onSaveEdit={handleSaveEdit}
        />

        {/* Game QR Modal */}
        <GameCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          gameId={gameId}
        />

        {/* Transfer Host Modal */}
        <TransferHostModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          players={otherPlayers}
          onSelectNewHost={handleSelectNewHost}
          isTransferring={isTransferring}
        />

        {/* Complete Game Confirmation Modal */}
        <CompleteGameModal
          isOpen={isCompleteModalOpen}
          onClose={() => setIsCompleteModalOpen(false)}
          onConfirm={handleFinishGame}
          isFinishing={isFinishing}
        />
      </div>
    </MobileContainer>
  );
};
