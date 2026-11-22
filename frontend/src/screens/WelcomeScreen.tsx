import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileContainer } from '../components/MobileContainer';
import { TrophyIllustration, GameControllerAccent } from '../components/Illustrations';
import { useGameStore } from '../store/useGameStore';
import { ArrowRight, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const currentGame = useGameStore((state) => state.currentGame);
  const isHost = useGameStore((state) => state.isHost);
  const connectWebSocket = useGameStore((state) => state.connectWebSocket);

  // Persistent Device Lock: Auto-resume active game immediately
  useEffect(() => {
    if (currentGame && currentGame.id) {
      connectWebSocket(currentGame.id);
      if (currentGame.status === 'in_progress') {
        if (isHost) {
          navigate(`/host-dashboard/${currentGame.id}`, { replace: true });
        } else {
          navigate(`/leaderboard/${currentGame.id}`, { replace: true });
        }
      } else if (currentGame.status === 'waiting') {
        navigate(`/lobby/${currentGame.id}`, { replace: true });
      }
    }
  }, [currentGame, isHost, connectWebSocket, navigate]);

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col justify-between p-6 pt-12 pb-8">
        {/* Top Status Bar Placeholder */}
        <div className="flex justify-between items-center text-xs font-semibold text-slate-400 px-1">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
            <span className="w-4 h-2 rounded-full bg-slate-400"></span>
          </div>
        </div>

        {/* Center Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center my-auto text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mb-6"
          >
            <TrophyIllustration size={110} />
          </motion.div>

          <motion.h1
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-4xl font-extrabold tracking-tight text-[#1E1B4B] mb-2"
          >
            ScoreSync
          </motion.h1>

          <motion.p
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="text-sm font-semibold tracking-wider text-indigo-900/60 uppercase"
          >
            Play • Score • Enjoy
          </motion.p>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="space-y-3.5 relative"
        >
          {/* Create Game Button (Primary violet/purple gradient) */}
          <button
            onClick={() => navigate('/create')}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#4F46E5] text-white font-bold text-base shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-indigo-500/40"
          >
            <span>Create Game</span>
            <ArrowRight className="w-5 h-5 ml-1 stroke-[2.5]" />
          </button>

          {/* Join Game Button (Secondary white card pill) */}
          <button
            onClick={() => navigate('/join')}
            className="w-full py-4 px-6 rounded-2xl bg-white text-[#1E1B4B] font-bold text-base shadow-md shadow-indigo-100/70 border border-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer hover:bg-slate-50"
          >
            <QrCode className="w-5 h-5 text-indigo-600 stroke-[2.2]" />
            <span>Join Game</span>
          </button>

          <GameControllerAccent className="absolute -bottom-8 -right-4" />
        </motion.div>
      </div>
    </MobileContainer>
  );
};
