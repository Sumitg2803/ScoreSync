import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ToastMessage {
  id: string;
  type: 'player_joined' | 'player_left' | 'info';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-4 space-y-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`pointer-events-auto max-w-sm px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border text-xs font-bold ${
              t.type === 'player_joined'
                ? 'bg-gradient-to-r from-indigo-900 to-purple-900 text-white border-purple-500/40 shadow-indigo-500/30'
                : 'bg-rose-950 text-rose-100 border-rose-600/40 shadow-rose-900/30'
            }`}
          >
            <span className="text-base">{t.type === 'player_joined' ? '🎮' : '🚪'}</span>
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
