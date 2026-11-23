import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Avatar } from './Avatar';
import { Crown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const HostRouletteOverlay: React.FC = () => {
  const hostRoulette = useGameStore((state) => state.hostRoulette);
  const dismissHostRoulette = useGameStore((state) => state.dismissHostRoulette);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [isLanded, setIsLanded] = useState(false);

  useEffect(() => {
    if (!hostRoulette || !hostRoulette.active || hostRoulette.candidates.length === 0) {
      setIsLanded(false);
      return;
    }

    const { candidates, winnerId, durationMs } = hostRoulette;
    const winnerIdx = candidates.findIndex((c) => c.id === winnerId);
    const targetIdx = winnerIdx >= 0 ? winnerIdx : 0;

    setIsLanded(false);
    const startTime = Date.now();
    let currentIndex = 0;
    let timerId: ReturnType<typeof setTimeout>;

    const cycle = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      if (elapsed >= durationMs) {
        setHighlightedIndex(targetIdx);
        setIsLanded(true);
        return;
      }

      currentIndex = (currentIndex + 1) % candidates.length;
      setHighlightedIndex(currentIndex);

      // Decelerate from 70ms up to 320ms towards the end
      const delay = 70 + Math.pow(progress, 2.2) * 260;
      timerId = setTimeout(cycle, delay);
    };

    cycle();

    // Safety timeout in case backend is delayed
    const safetyTimer = setTimeout(() => {
      dismissHostRoulette();
    }, durationMs + 4000);

    return () => {
      clearTimeout(timerId);
      clearTimeout(safetyTimer);
    };
  }, [hostRoulette, dismissHostRoulette]);

  if (!hostRoulette || !hostRoulette.active) {
    return null;
  }

  const { candidates, winnerName, oldHostName } = hostRoulette;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white w-full max-w-sm rounded-3xl p-6 relative flex flex-col shadow-2xl text-center border border-amber-300/40 overflow-hidden"
        >
          {/* Top Decorative Glow */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-400/20 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col items-center mb-4">
            <motion.div
              animate={isLanded ? { scale: [1, 1.25, 1], rotate: [0, -10, 10, 0] } : { rotate: [0, -5, 5, 0] }}
              transition={{ repeat: isLanded ? 0 : Infinity, duration: 1.5 }}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg mb-3 ${
                isLanded
                  ? 'bg-gradient-to-tr from-amber-400 to-orange-500 shadow-amber-500/30'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              <Crown className={`w-8 h-8 ${isLanded ? 'text-white fill-white' : 'text-amber-500 fill-amber-400'}`} />
            </motion.div>

            <h3 className="font-black text-lg text-[#1E1B4B]">
              {isLanded ? 'New Host Chosen! 👑' : 'Host Roulette! 🎲'}
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              {isLanded
                ? `${winnerName} is now leading the room!`
                : `${oldHostName || 'Host'} is stepping down. Picking randomly...`}
            </p>
          </div>

          {/* Candidates Grid */}
          <div className="grid grid-cols-2 gap-2.5 my-3 max-h-56 overflow-y-auto p-1">
            {candidates.map((player, idx) => {
              const isSelected = highlightedIndex === idx;
              return (
                <motion.div
                  key={player.id}
                  animate={
                    isSelected
                      ? {
                          scale: isLanded ? 1.05 : 1.02,
                          borderColor: isLanded ? '#F59E0B' : '#6366F1',
                        }
                      : { scale: 1, borderColor: '#F1F5F9' }
                  }
                  transition={{ duration: 0.15 }}
                  className={`p-3 rounded-2xl flex items-center gap-2.5 transition-all border-2 text-left relative overflow-hidden ${
                    isSelected
                      ? isLanded
                        ? 'bg-amber-50/90 border-amber-500 shadow-md shadow-amber-500/20'
                        : 'bg-indigo-50 border-indigo-500 shadow-md shadow-indigo-500/15'
                      : 'bg-slate-50 border-slate-100 opacity-60'
                  }`}
                >
                  <Avatar name={player.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <span
                      className={`block text-xs font-black truncate ${
                        isSelected ? (isLanded ? 'text-amber-900' : 'text-indigo-950') : 'text-slate-600'
                      }`}
                    >
                      {player.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold block">
                      {isSelected ? (isLanded ? '👑 NEW HOST' : '🎲 Selected...') : 'Player'}
                    </span>
                  </div>

                  {isSelected && isLanded && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-2 text-amber-500"
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Footer Status */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{isLanded ? 'Updating room permissions...' : 'Broadcasting live across all phones...'}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
