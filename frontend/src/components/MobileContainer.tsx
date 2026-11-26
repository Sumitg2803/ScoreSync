import React, { useState } from 'react';
import { FeedbackModal } from './FeedbackModal';

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

        {/* Content area */}
        <div className="relative z-10 flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
          {children}
        </div>

        {/* Global Footer on every page */}
        <footer className="relative z-20 py-2.5 px-4 text-center select-none shrink-0 border-t border-slate-200/20 flex items-center justify-center gap-1.5">
          <p className={`text-[11px] font-semibold tracking-wide ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            © {new Date().getFullYear()} Made with ❤️ By Sumit G.
          </p>
          <span className={`text-[11px] ${dark ? 'text-slate-600' : 'text-slate-300'}`}>•</span>
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className={`text-[11px] font-bold hover:underline cursor-pointer transition ${
              dark ? 'text-purple-400 hover:text-purple-300' : 'text-purple-700 hover:text-purple-900'
            }`}
          >
            Feedback
          </button>
        </footer>

        {/* Global Feedback Modal */}
        <FeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
        />
      </div>
    </div>
  );
};
