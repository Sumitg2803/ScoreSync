import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileContainer } from '../components/MobileContainer';
import { GameControllerAccent } from '../components/Illustrations';
import { useGameStore } from '../store/useGameStore';
import { ArrowRight, BookOpen, Eye, Gamepad2, Smartphone, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserGuideModal } from '../components/UserGuideModal';
import { InstallPwaModal, usePwaInstall } from '../components/InstallPwaModal';

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const currentGame = useGameStore((state) => state.currentGame);
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);
  const isHost = useGameStore((state) => state.isHost);
  const isSpectator = useGameStore((state) => state.isSpectator);
  const connectWebSocket = useGameStore((state) => state.connectWebSocket);

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const { isInstalled, isIos, promptInstall } = usePwaInstall();

  // Persistent Device Lock: Auto-resume active game immediately
  useEffect(() => {
    if (currentGame && currentGame.id) {
      // Safety check: ensure this player is still actually part of the room
      const isStillInGame = isSpectator || (currentPlayerId && currentGame.players?.some((p) => p.id === currentPlayerId));
      if (!isStillInGame) {
        useGameStore.setState({ currentGame: null, currentPlayerId: null, isHost: false, isSpectator: false, spectatorCount: 0 });
        return;
      }

      connectWebSocket(currentGame.id);
      if (isSpectator) {
        if (currentGame.status === 'completed') {
          navigate(`/results/${currentGame.id}`, { replace: true });
        } else {
          navigate(`/leaderboard/${currentGame.id}`, { replace: true });
        }
      } else if (currentGame.status === 'in_progress') {
        if (isHost) {
          navigate(`/host-dashboard/${currentGame.id}`, { replace: true });
        } else {
          navigate(`/leaderboard/${currentGame.id}`, { replace: true });
        }
      } else if (currentGame.status === 'waiting') {
        navigate(`/lobby/${currentGame.id}`, { replace: true });
      } else if (currentGame.status === 'completed') {
        navigate(`/results/${currentGame.id}`, { replace: true });
      }
    }
  }, [currentGame, currentPlayerId, isHost, isSpectator, connectWebSocket, navigate]);

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col justify-between p-6 pt-12 pb-8">
        {/* Top Header Bar */}
        <div className="flex justify-between items-center text-xs font-semibold px-1">
          <div className="flex items-center gap-1.5 text-purple-950 font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ScoreSync Live</span>
          </div>
          {!isInstalled && (
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-100/90 border border-purple-200/80 text-purple-900 font-bold hover:bg-purple-200/80 transition cursor-pointer shadow-2xs"
              title="Install App"
            >
              <Download className="w-3.5 h-3.5 text-purple-700" />
              <span>Install App</span>
            </button>
          )}
        </div>

        {/* Center Hero Section with Official Logo */}
        <div className="flex-1 flex flex-col items-center justify-center my-auto text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mb-5 relative"
          >
            {/* Ambient ultraviolet glow behind logo */}
            <div className="absolute inset-0 bg-[#7016E6]/25 rounded-full blur-2xl transform scale-125 pointer-events-none" />
            <img
              src="/logo.png"
              alt="ScoreSync Logo"
              className="w-32 h-32 object-contain relative z-10 drop-shadow-2xl"
            />
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
            className="text-sm font-semibold tracking-wider text-purple-900/70 uppercase"
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
          {/* Create Game Button (Primary signature violet/purple gradient) */}
          <button
            onClick={() => navigate('/create')}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF] text-white font-bold text-base shadow-lg shadow-purple-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-purple-600/45"
          >
            <span>Create Game</span>
            <ArrowRight className="w-5 h-5 ml-1 stroke-[2.5]" />
          </button>

          {/* Join Game Button (Secondary white card pill - for Players) */}
          <button
            onClick={() => navigate('/join?mode=player')}
            className="w-full py-3.5 px-6 rounded-2xl bg-white text-[#1E1B4B] font-bold text-base shadow-md shadow-purple-100/70 border border-purple-100/60 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer hover:bg-purple-50/50"
          >
            <Gamepad2 className="w-5 h-5 text-purple-700 stroke-[2.2]" />
            <span>Join Game</span>
          </button>

          {/* Join as Audience Button (Secondary pill - for Spectators) */}
          <button
            onClick={() => navigate('/join?mode=audience')}
            className="w-full py-3.5 px-6 rounded-2xl bg-white text-purple-950 font-bold text-base shadow-md shadow-purple-100/70 border border-purple-100/60 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer hover:bg-purple-50/50"
          >
            <Eye className="w-5 h-5 text-[#8625FF] stroke-[2.2]" />
            <span>Join as Audience</span>
          </button>

          {/* User Guide & Install Row */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-purple-100/50 text-purple-900 font-bold text-xs border border-purple-200/60 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:bg-purple-100/80"
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-700" />
              <span>User Guide</span>
            </button>

            {!isInstalled && (
              <button
                onClick={() => setIsInstallModalOpen(true)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-purple-100/70 text-purple-900 font-bold text-xs border border-purple-200/80 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:bg-purple-200/70"
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-700" />
                <span>Install App</span>
              </button>
            )}
          </div>

          <GameControllerAccent className="absolute -bottom-8 -right-4" />
        </motion.div>

        {/* User Guide Modal */}
        <UserGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />

        {/* PWA Install Modal */}
        <InstallPwaModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
          promptInstall={promptInstall}
          isIos={isIos}
        />
      </div>
    </MobileContainer>
  );
};
