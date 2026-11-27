import React, { useState } from 'react';
import { Mail, MessageSquare, Bug, Sparkles } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { useGameStore } from '../store/useGameStore';
import { computeEffectiveMaintenance } from './MaintenanceOverlay';

interface MobileContainerProps {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({
  children,
  dark = false,
  className = '',
}) => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'feedback' | 'report'>('feedback');
  const maintenance = useGameStore((state) => state.maintenance);
  const { disableFeedback, masterShutdown } = computeEffectiveMaintenance(maintenance);
  const isFeedbackLocked = disableFeedback || masterShutdown;

  const openModal = (mode: 'feedback' | 'report') => {
    if (isFeedbackLocked) return;
    setModalMode(mode);
    setIsFeedbackOpen(true);
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center p-0 sm:py-6 bg-[#EBE4F7]/80">
      <div
        className={`w-full max-w-[420px] min-h-screen sm:min-h-[840px] sm:max-h-[880px] sm:rounded-[36px] overflow-hidden flex flex-col relative shadow-2xl transition-all ${
          dark
            ? 'bg-[#0E0620] text-white'
            : 'bg-gradient-to-b from-[#FAF7FF] via-[#F4EEFD] to-[#ECE2FA] text-[#1E1B4B]'
        } ${className}`}
      >
        {/* Subtle decorative background wave blur matching logo ultraviolet aura */}
        {!dark && (
          <>
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-300/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-violet-300/30 rounded-full blur-3xl pointer-events-none" />
          </>
        )}

        {/* Scrollable Content + Below-the-Fold Dark Footer */}
        <div className="relative z-10 flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
          {/* Main screen fills 100% of initial viewport so footer is hidden until user scrolls down */}
          <div className="min-h-[100dvh] sm:min-h-[840px] flex flex-col shrink-0">
            {children}
          </div>

          {/* Dark Footer (visible when scrolling down) */}
          <footer className="relative z-20 bg-[#0B0518] text-slate-200 px-6 py-8 border-t border-purple-900/60 overflow-hidden shrink-0">
            {/* Subtle ultraviolet aura inside dark footer */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#7016E6]/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-5 text-center">
              {/* Brand & Quote */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-800/50 text-[10px] font-black uppercase tracking-widest text-purple-300">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>ScoreSync</span>
                </div>
                <p className="text-xs italic text-slate-300 leading-relaxed max-w-[300px] mx-auto">
                  &ldquo;Every round tells a story, every point sparks a memory — play fair, cheer loud, and keep the score alive.&rdquo;
                </p>
              </div>

              {/* Action Buttons: Feedback & Report a Problem */}
              <div className="space-y-2">
                {isFeedbackLocked && (
                  <p className="text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-1.5">
                    Feedback &amp; Problem Reports are temporarily paused for maintenance.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={isFeedbackLocked}
                    onClick={() => openModal('feedback')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                      isFeedbackLocked
                        ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 grayscale opacity-60 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#4A10A8] to-[#7016E6] hover:from-[#5B17C9] hover:to-[#8625FF] text-white shadow-lg shadow-purple-900/40 active:scale-[0.98] cursor-pointer'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Feedback</span>
                  </button>

                  <button
                    type="button"
                    disabled={isFeedbackLocked}
                    onClick={() => openModal('report')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                      isFeedbackLocked
                        ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 grayscale opacity-60 cursor-not-allowed'
                        : 'bg-[#180C35] hover:bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:text-white active:scale-[0.98] cursor-pointer'
                    }`}
                  >
                    <Bug className="w-3.5 h-3.5" />
                    <span>Report a Problem</span>
                  </button>
                </div>
              </div>

              {/* Contact Details */}
              <div className="pt-4 border-t border-purple-950/80 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Contact Support
                </span>
                <a
                  href="mailto:sumit.s.gaikwad28@gmail.com"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-purple-200 transition"
                >
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                  <span>sumit.s.gaikwad28@gmail.com</span>
                </a>
              </div>

              {/* Copyright */}
              <p className="text-[11px] text-slate-500 font-medium pt-1">
                © {new Date().getFullYear()} ScoreSync • Made with ❤️ by Sumit G.
              </p>
            </div>
          </footer>
        </div>

        {/* Global Feedback & Problem Report Modal */}
        <FeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
          initialMode={modalMode}
        />
      </div>
    </div>
  );
};
