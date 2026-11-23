import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Exit Game?',
  description = 'Are you sure you want to exit? Your recorded scores will be completely removed and you will not be included in the final rankings.',
  confirmText = 'Yes, Exit Game',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xs rounded-3xl p-6 relative flex flex-col items-center shadow-2xl text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
        </div>

        <h3 className="font-extrabold text-lg text-[#1E1B4B] mb-1">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
          {description}
        </p>

        <div className="space-y-2.5 w-full">
          <button
            onClick={onConfirm}
            className="w-full py-3.5 rounded-2xl bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-500/30 active:scale-[0.98] transition cursor-pointer"
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
