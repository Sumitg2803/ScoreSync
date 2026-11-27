import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CalendarClock, Sparkles } from 'lucide-react';

export interface PublicAnnouncement {
  id: string;
  message: string;
  created_at: string;
  expires_at: string;
}

interface AnnouncementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: PublicAnnouncement[];
  isLoading?: boolean;
}

export const AnnouncementsModal: React.FC<AnnouncementsModalProps> = ({
  isOpen,
  onClose,
  announcements,
  isLoading = false,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-purple-100 relative overflow-hidden text-left max-h-[85vh] flex flex-col"
          >
            {/* Top decorative glow */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF]" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close announcements"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4 pr-6 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-[#1E1B4B]">Announcements</h3>
                  {announcements.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black">
                      {announcements.length}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-semibold">
                  Latest updates & notices from ScoreSync
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
              {isLoading ? (
                <div className="py-10 text-center text-xs text-slate-400 font-semibold">
                  Loading announcements...
                </div>
              ) : announcements.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-400 flex items-center justify-center mb-2.5">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-[#1E1B4B]">No Announcements Yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                    Check back later for new updates, events, or maintenance notices!
                  </p>
                </div>
              ) : (
                announcements.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-2"
                  >
                    <p className="text-xs font-semibold text-[#1E1B4B] leading-relaxed whitespace-pre-wrap break-words">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-700/80">
                      <CalendarClock className="w-3 h-3 shrink-0" />
                      <span>
                        {new Date(item.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
