import React, { useState, useEffect } from 'react';
import type { Player } from '../types/game';
import { Avatar } from './Avatar';
import { Crown, X, Dices, UserCheck } from 'lucide-react';

interface TransferHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onSelectNewHost: (newHostId: string) => void;
  onStartRandomRoulette?: () => void;
  isTransferring: boolean;
}

export const TransferHostModal: React.FC<TransferHostModalProps> = ({
  isOpen,
  onClose,
  players,
  onSelectNewHost,
  onStartRandomRoulette,
  isTransferring,
}) => {
  const [mode, setMode] = useState<'choose' | 'manual'>('choose');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode('choose');
    }
  }, [isOpen]);

  const handlePickRandom = () => {
    if (onStartRandomRoulette) {
      onStartRandomRoulette();
      onClose();
    }
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
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 font-medium my-3 text-left">
          You are leaving the game. Choose how to transfer host rights:
        </p>

        {/* Action Choice Mode */}
        {mode === 'choose' && (
          <div className="space-y-3 my-2">
            {/* Pick at Random Button */}
            <button
              onClick={handlePickRandom}
              disabled={isTransferring}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 active:scale-[0.98] transition flex items-center justify-between cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl group-hover:rotate-12 transition">
                  <Dices className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-black">Pick at Random 🎲</span>
                  <span className="text-[11px] text-amber-100 font-medium">Broadcasts suspense live to all screens</span>
                </div>
              </div>
              <span className="text-lg">→</span>
            </button>

            {/* Choose Manually Button */}
            <button
              onClick={() => setMode('manual')}
              disabled={isTransferring}
              className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-bold text-sm transition flex items-center justify-between cursor-pointer group disabled:opacity-50"
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

        {/* Manual Player Selection List Mode */}
        {mode === 'manual' && (
          <div>
            <div className="space-y-2 max-h-56 overflow-y-auto py-1">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectNewHost(p.id)}
                  disabled={isTransferring}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-300 transition cursor-pointer group text-left disabled:opacity-50"
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
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
