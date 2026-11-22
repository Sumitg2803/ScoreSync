import React, { useState, useEffect } from 'react';
import type { Player, Round } from '../types/game';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditRoundSheetProps {
  isOpen: boolean;
  onClose: () => void;
  rounds: Round[];
  players: Player[];
  onSaveEdit: (roundNumber: number, scores: Record<string, number>, note?: string) => Promise<void>;
}

export const EditRoundSheet: React.FC<EditRoundSheetProps> = ({
  isOpen,
  onClose,
  rounds,
  players,
  onSaveEdit,
}) => {
  const [selectedRoundNum, setSelectedRoundNum] = useState<number>(1);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // When sheet opens or rounds change, set initial selected round
  useEffect(() => {
    if (isOpen && rounds.length > 0) {
      setSelectedRoundNum(rounds[rounds.length - 1].roundNumber || rounds.length);
    }
  }, [isOpen, rounds]);

  // When selected round changes, populate scores
  useEffect(() => {
    const currentRound = rounds.find(
      (r, idx) => (r.roundNumber || idx + 1) === selectedRoundNum
    );
    if (currentRound) {
      const initial: Record<string, string> = {};
      players.forEach((p) => {
        const val = currentRound.scores[p.id];
        initial[p.id] = val !== undefined ? String(val) : '0';
      });
      setScores(initial);
    }
  }, [selectedRoundNum, rounds, players]);

  const handleScoreChange = (playerId: string, val: string) => {
    setScores((prev) => ({ ...prev, [playerId]: val }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const parsed: Record<string, number> = {};
    Object.entries(scores).forEach(([pId, val]) => {
      parsed[pId] = parseFloat(val) || 0;
    });

    try {
      await onSaveEdit(selectedRoundNum, parsed, 'Historical score edit');
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } finally {
      setIsSaving(false);
    }
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
            className="absolute bottom-0 left-0 right-0 max-h-[90%] bg-white rounded-t-[32px] p-6 pb-8 z-50 flex flex-col shadow-2xl"
          >
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-[#1E1B4B]">Edit Round Scores</h2>
                <p className="text-xs text-slate-500 font-medium">Select a round to adjust previous scores</p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Round Selector Tabs */}
            {rounds.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                No rounds have been completed yet.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 overflow-x-auto py-3 px-1">
                  {rounds.map((r, idx) => {
                    const rNum = r.roundNumber || idx + 1;
                    const isSelected = rNum === selectedRoundNum;
                    return (
                      <button
                        key={rNum}
                        onClick={() => setSelectedRoundNum(rNum)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Round {rNum}
                      </button>
                    );
                  })}
                </div>

                {/* Score Editing Inputs */}
                <div className="py-2 space-y-3 overflow-y-auto max-h-[260px]">
                  {players.map((player) => (
                    <div key={player.id} className="flex items-center justify-between gap-4 p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="font-semibold text-sm text-[#1E1B4B]">{player.name}</span>
                      <input
                        type="number"
                        step="0.5"
                        value={scores[player.id] ?? ''}
                        onChange={(e) => handleScoreChange(player.id, e.target.value)}
                        placeholder="0.00"
                        className="w-28 text-right bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-sm text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#4F46E5] text-white font-bold text-base shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {success ? (
                      <>
                        <Check className="w-5 h-5 text-emerald-300 stroke-[3]" />
                        <span>Scores Updated!</span>
                      </>
                    ) : (
                      <span>{isSaving ? 'Updating...' : 'Save Changes'}</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
