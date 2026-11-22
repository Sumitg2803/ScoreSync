import React from 'react';
import type { Player } from '../types/game';
import { Avatar } from './Avatar';
import { Crown, X } from 'lucide-react';

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
          Select a player to take over as the new Host. They will manage rounds and scores, and you will leave the game.
        </p>

        {/* Players List */}
        <div className="space-y-2 max-h-60 overflow-y-auto py-1">
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
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
