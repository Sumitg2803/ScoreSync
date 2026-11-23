import React, { useState, useEffect } from 'react';
import { Settings, X, Gamepad2, Eye, Lock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HostSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  allowPlayers: boolean;
  allowViewers: boolean;
  onUpdate: (allowPlayers: boolean, allowViewers: boolean) => Promise<void>;
}

export const HostSettingsModal: React.FC<HostSettingsModalProps> = ({
  isOpen,
  onClose,
  allowPlayers,
  allowViewers,
  onUpdate,
}) => {
  const [playersState, setPlayersState] = useState(allowPlayers);
  const [viewersState, setViewersState] = useState(allowViewers);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPlayersState(allowPlayers);
    setViewersState(allowViewers);
  }, [allowPlayers, allowViewers]);

  if (!isOpen) return null;

  const handleTogglePlayers = async () => {
    const nextPlayers = !playersState;
    setPlayersState(nextPlayers);
    try {
      setIsSaving(true);
      await onUpdate(nextPlayers, viewersState);
    } catch {
      setPlayersState(playersState); // revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleViewers = async () => {
    const nextViewers = !viewersState;
    setViewersState(nextViewers);
    try {
      setIsSaving(true);
      await onUpdate(playersState, nextViewers);
    } catch {
      setViewersState(viewersState); // revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const isBothLocked = !playersState && !viewersState;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-white w-full max-w-sm rounded-[32px] p-6 relative flex flex-col shadow-2xl border border-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
                <Settings className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#1E1B4B]">Room Access</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Control who can join your match</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Status Pill */}
          <div className="mb-4">
            {playersState && viewersState && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>Open to Everyone (Players & Audience)</span>
              </div>
            )}
            {playersState && !viewersState && (
              <div className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                <span>Players Only (Audience Restricted)</span>
              </div>
            )}
            {!playersState && viewersState && (
              <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                <span>Audience Only (Player Entry Closed)</span>
              </div>
            )}
            {isBothLocked && (
              <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Room Locked (All New Entries Blocked)</span>
              </div>
            )}
          </div>

          {/* Toggle Switches */}
          <div className="space-y-3 mb-4">
            {/* Toggle 1: Allow Players */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3 pr-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Gamepad2 className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className="font-bold text-xs text-[#1E1B4B]">Allow Players</div>
                  <div className="text-[10px] text-slate-500 font-medium leading-tight">
                    New players can join & get scored
                  </div>
                </div>
              </div>

              {/* iOS Style Switch */}
              <button
                type="button"
                onClick={handleTogglePlayers}
                disabled={isSaving}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out shrink-0 ${
                  playersState ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    playersState ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Allow Viewers */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3 pr-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className="font-bold text-xs text-[#1E1B4B]">Allow Audience</div>
                  <div className="text-[10px] text-slate-500 font-medium leading-tight">
                    Spectators can watch live scores
                  </div>
                </div>
              </div>

              {/* iOS Style Switch */}
              <button
                type="button"
                onClick={handleToggleViewers}
                disabled={isSaving}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out shrink-0 ${
                  viewersState ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    viewersState ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Locked Notice */}
          {isBothLocked && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold leading-relaxed flex items-start gap-2 mb-4">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                QR Code and Game Code are now <strong>disabled</strong> on all connected phones. No new players or viewers can join until unlocked.
              </span>
            </div>
          )}

          {/* Close / Done Action */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-500/25 active:scale-[0.98] transition cursor-pointer"
          >
            Done
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
