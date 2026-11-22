import React, { useState, useEffect } from 'react';
import type { Player } from '../types/game';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddRoundSheetProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onSave: (scores: Record<string, number>) => void;
}

export const AddRoundSheet: React.FC<AddRoundSheetProps> = ({
  isOpen,
  onClose,
  players,
  onSave,
}) => {
  const [scores, setScores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      // Initialize with empty inputs (no prefilled values)
      const initial: Record<string, string> = {};
      players.forEach((p) => {
        initial[p.id] = '';
      });
      setScores(initial);
    }
  }, [isOpen, players]);

  const handleScoreChange = (playerId: string, val: string) => {
    setScores(prev => ({ ...prev, [playerId]: val }));
  };

  const handleSave = () => {
    const parsed: Record<string, number> = {};
    Object.entries(scores).forEach(([pId, val]) => {
      parsed[pId] = parseFloat(val) || 0;
    });
    onSave(parsed);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950 z-40"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="absolute bottom-0 left-0 right-0 max-h-[85%] bg-white rounded-t-[32px] p-6 pb-8 z-50 flex flex-col shadow-2xl"
          >
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-[#1E1B4B]">Add Round</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Player Score Inputs */}
            <div className="py-4 space-y-3.5 overflow-y-auto max-h-[300px]">
              {players.map((player) => (
                <div key={player.id} className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-sm text-[#1E1B4B]">{player.name}</span>
                  <input
                    type="number"
                    step="0.5"
                    value={scores[player.id] || ''}
                    onChange={(e) => handleScoreChange(player.id, e.target.value)}
                    placeholder="0.00"
                    className="w-28 text-right bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-sm text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                onClick={handleSave}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#4F46E5] text-white font-bold text-base shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                Save Round
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
