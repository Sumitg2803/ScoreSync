import React from 'react';

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
  return (
    <div className="min-h-screen w-full flex justify-center items-center p-0 sm:py-6 bg-slate-100/70">
      <div
        className={`w-full max-w-[420px] min-h-screen sm:min-h-[840px] sm:max-h-[880px] sm:rounded-[36px] overflow-hidden flex flex-col relative shadow-2xl transition-all ${
          dark
            ? 'bg-[#0F172A] text-white'
            : 'bg-gradient-to-b from-[#F2F0FF] via-[#F8F9FE] to-[#EFF3FF] text-[#1E1B4B]'
        } ${className}`}
      >
        {/* Subtle decorative background wave blur */}
        {!dark && (
          <>
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-200/35 rounded-full blur-3xl pointer-events-none" />
          </>
        )}

        {/* Content area */}
        <div className="relative z-10 flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
          {children}
        </div>

        {/* Global Footer on every page */}
        <footer className="relative z-20 py-2.5 px-4 text-center select-none shrink-0 border-t border-slate-200/20">
          <p className={`text-[11px] font-semibold tracking-wide ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            © {new Date().getFullYear()} Made with ❤️ By Sumit G.
          </p>
        </footer>
      </div>
    </div>
  );
};
