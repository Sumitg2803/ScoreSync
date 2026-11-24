import React from 'react';
import { Trophy, X } from 'lucide-react';

interface CompleteGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isFinishing: boolean;
}

export const CompleteGameModal: React.FC<CompleteGameModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isFinishing,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xs rounded-3xl p-6 relative flex flex-col items-center shadow-2xl text-center">
        {/* Close Icon */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dramatic Animated Trophy Icon */}
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-3 text-amber-500 shadow-inner">
          <Trophy className="w-7 h-7 fill-amber-400 stroke-[2.2] animate-bounce" />
        </div>

        {/* Comedic Title */}
        <h3 className="font-black text-xl text-[#1E1B4B] mb-2 tracking-tight">
          Hold Up, Boss! 🛑
        </h3>

        {/* Comedic Message Body */}
        <p className="text-xs text-slate-600 leading-relaxed font-medium mb-6 px-1">
          Are you sure you want to end this game? Once you blow the final whistle, friendships might be ruined, tears will be shed, and there’s <span className="font-bold text-rose-600">NO going back!</span> Ready to crown the winner?
        </p>

        {/* Action Buttons */}
        <div className="space-y-2.5 w-full">
          <button
            onClick={onConfirm}
            disabled={isFinishing}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF] text-white font-bold text-xs shadow-lg shadow-purple-600/30 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>{isFinishing ? 'Crowning Winner...' : 'Yes, Crown the Champion! 👑'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
          >
            Wait, We're Still Fighting! ⚔️
          </button>
        </div>
      </div>
    </div>
  );
};
