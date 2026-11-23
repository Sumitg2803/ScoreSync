import React, { useState, useEffect } from 'react';
import type { Player } from '../types/game';
import { Avatar } from './Avatar';
import { Crown, X, Dices, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TransferHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onSelectNewHost: (newHostId: string) => void;
  isTransferring: boolean;
}

export const TransferHostModal: React.FC<TransferHostModalProps> = ({
  isOpen,
  onClose,
  players,
  onSelectNewHost,
  isTransferring,
}) => {
  const [mode, setMode] = useState<'choose' | 'manual'>('choose');
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [finalWinnerId, setFinalWinnerId] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode('choose');
      setAnimatingIndex(null);
      setIsShuffling(false);
      setFinalWinnerId(null);
    }
  }, [isOpen]);

  const startRandomRoulette = () => {
    if (players.length === 0) return;
    setIsShuffling(true);

    const startTime = Date.now();
    const duration = 5000; // Exact 5 seconds animation as requested
    let currentIndex = 0;

    // Pick final winner upfront
    const winnerIdx = Math.floor(Math.random() * players.length);
    const chosenWinner = players[winnerIdx];

    const cycle = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (elapsed >= duration) {
        // Animation finished: land firmly on chosen winner
        setAnimatingIndex(winnerIdx);
        setFinalWinnerId(chosenWinner.id);
        setIsShuffling(false);

        // Pause 1 second on the winner so host sees the result, then trigger transfer
        setTimeout(() => {
          onSelectNewHost(chosenWinner.id);
        }, 1200);
        return;
      }

      currentIndex = (currentIndex + 1) % players.length;
      setAnimatingIndex(currentIndex);

      // Gradually slow down intervals over the 5 seconds (starts at 70ms, ends around 320ms)
      const currentDelay = 70 + Math.pow(progress, 2.2) * 250;
      setTimeout(cycle, currentDelay);
    };

    cycle();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative flex flex-col shadow-2xl text-center">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
            </div>
            <h3 className="font-extrabold text-base text-[#1E1B4B]">Transfer Host Control</h3>
          </div>
          {!isShuffling && (
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 font-medium my-3 text-left">
          {isShuffling
            ? 'Selecting a random host... Building suspense! 🎲'
            : finalWinnerId
            ? 'Host chosen! Handing over the crown... 👑'
            : 'You are leaving the game. Choose how to transfer host rights:'}
        </p>

        {/* Action Choice Mode */}
        {mode === 'choose' && !isShuffling && !finalWinnerId && (
          <div className="space-y-3 my-2">
            {/* Pick at Random Button */}
            <button
              onClick={startRandomRoulette}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 active:scale-[0.98] transition flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl group-hover:rotate-12 transition">
                  <Dices className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-black">Pick at Random 🎲</span>
                  <span className="text-[11px] text-amber-100 font-medium">Let the system choose</span>
                </div>
              </div>
              <span className="text-lg">→</span>
            </button>

            {/* Choose Manually Button */}
            <button
              onClick={() => setMode('manual')}
              className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-bold text-sm transition flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-200/70 rounded-xl text-indigo-600">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-black text-[#1E1B4B]">Choose Manually</span>
                  <span className="text-[11px] text-slate-400 font-medium">Pick a specific player</span>
                </div>
              </div>
              <span className="text-lg text-slate-400">→</span>
            </button>
          </div>
        )}

        {/* Shuffling Roulette Animation View */}
        {(isShuffling || finalWinnerId) && (
          <div className="my-2 space-y-2">
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
              {players.map((p, idx) => {
                const isCurrent = animatingIndex === idx;
                const isWinner = finalWinnerId === p.id;
                return (
                  <motion.div
                    key={p.id}
                    animate={{
                      scale: isWinner ? 1.05 : isCurrent ? 1.02 : 0.95,
                      opacity: isCurrent || isWinner ? 1 : 0.45,
                    }}
                    transition={{ duration: 0.1 }}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                      isWinner
                        ? 'bg-amber-100 border-amber-400 shadow-lg ring-2 ring-amber-400'
                        : isCurrent
                        ? 'bg-indigo-100 border-indigo-400 shadow-md ring-2 ring-indigo-400'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="relative">
                      <Avatar name={p.name} size="md" />
                      {isWinner && (
                        <div className="absolute -top-3 -right-2 bg-amber-400 text-white rounded-full p-1 shadow-md animate-bounce">
                          <Crown className="w-4 h-4 fill-white" />
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-xs text-[#1E1B4B] mt-2 truncate max-w-[100px]">
                      {p.name}
                    </span>
                    {isWinner && (
                      <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider mt-1">
                        New Host! 👑
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* 5-second Progress Bar */}
            {isShuffling && (
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-amber-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Manual Player Selection List */}
        {mode === 'manual' && !isShuffling && !finalWinnerId && (
          <div>
            <div className="space-y-2 max-h-56 overflow-y-auto py-1">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectNewHost(p.id)}
                  disabled={isTransferring}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-300 transition cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={p.name} size="sm" />
                    <span className="font-bold text-sm text-[#1E1B4B] group-hover:text-indigo-600 transition">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100/70 px-2.5 py-1 rounded-xl">
                    Make Host →
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setMode('choose')}
              className="text-xs text-indigo-600 font-bold mt-3 hover:underline cursor-pointer"
            >
              ← Back to options
            </button>
          </div>
        )}

        {/* Cancel Button */}
        {!isShuffling && !finalWinnerId && (
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
