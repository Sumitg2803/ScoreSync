import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileContainer } from '../components/MobileContainer';
import { GameControllerAccent } from '../components/Illustrations';
import { useGameStore } from '../store/useGameStore';
import { ArrowRight, BookOpen, Eye, Gamepad2, Download, Wrench, Clock, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserGuideModal } from '../components/UserGuideModal';
import { InstallPwaModal, usePwaInstall } from '../components/InstallPwaModal';
import { computeEffectiveMaintenance } from '../components/MaintenanceOverlay';
import { AnnouncementsModal, type PublicAnnouncement } from '../components/AnnouncementsModal';
import { apiRequest } from '../services/api';

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const currentGame = useGameStore((state) => state.currentGame);
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);
  const isHost = useGameStore((state) => state.isHost);
  const isSpectator = useGameStore((state) => state.isSpectator);
  const connectWebSocket = useGameStore((state) => state.connectWebSocket);
  const maintenance = useGameStore((state) => state.maintenance);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    if (!maintenance?.scheduled_start && !maintenance?.scheduled_end) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [maintenance?.scheduled_start, maintenance?.scheduled_end]);

  const {
    disableGames: isGamesLocked,
    masterShutdown: isMasterLocked,
    isUpcoming: isMaintenanceUpcoming,
    isWithin15Min,
    startMs,
    endMs,
  } = computeEffectiveMaintenance(maintenance, nowMs);
  const isMaintenanceActive = isGamesLocked;

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [isBellRinging, setIsBellRinging] = useState(false);
  const { isInstalled, isIos, isAndroid, deferredPrompt, promptInstall } = usePwaInstall();

  const fetchAnnouncements = async () => {
    try {
      setIsLoadingAnnouncements(true);
      const data = await apiRequest('/api/announcements');
      if (Array.isArray(data)) {
        setAnnouncements(data);
      }
    } catch {
      // non-fatal
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    const onFocus = () => fetchAnnouncements();
    const onBroadcast = (e: any) => {
      if (e.detail?.type === 'ANNOUNCEMENTS_UPDATED') {
        fetchAnnouncements();
      }
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('scoresync-broadcast' as any, onBroadcast);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('scoresync-broadcast' as any, onBroadcast);
    };
  }, []);

  // Ring bell left & right every 10 seconds to draw user attention
  useEffect(() => {
    let ringTimeout: ReturnType<typeof setTimeout> | null = null;
    const triggerRing = () => {
      setIsBellRinging(true);
      ringTimeout = setTimeout(() => setIsBellRinging(false), 1100);
    };

    const initialTimer = setTimeout(triggerRing, 1500);
    const interval = setInterval(triggerRing, 10000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      if (ringTimeout) clearTimeout(ringTimeout);
    };
  }, []);

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
        {/* Top Header Bar: Add to Home Screen (left) + Bell Icon (right) */}
        <div className="flex justify-between items-center text-xs font-semibold px-1 min-h-[36px]">
          <div>
            {!isInstalled && (
              <button
                disabled={isMasterLocked}
                onClick={() => !isMasterLocked && setIsInstallModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition shadow-xs ${
                  isMasterLocked
                    ? 'bg-neutral-200 border border-neutral-300 text-neutral-500 grayscale opacity-60 cursor-not-allowed'
                    : 'bg-purple-100/90 border border-purple-200/80 text-purple-900 hover:bg-purple-200/80 cursor-pointer active:scale-95'
                }`}
                title="Add to Home Screen"
              >
                <Download className={`w-3.5 h-3.5 ${isMasterLocked ? 'text-neutral-500' : 'text-purple-700'}`} />
                <span>Add to Home Screen</span>
              </button>
            )}
          </div>

          <button
            disabled={isMasterLocked}
            onClick={() => {
              if (isMasterLocked) return;
              setIsAnnouncementsOpen(true);
              fetchAnnouncements();
            }}
            className={`relative p-2 rounded-xl transition shadow-xs ${
              isMasterLocked
                ? 'bg-neutral-200 border border-neutral-300 text-neutral-500 grayscale opacity-60 cursor-not-allowed'
                : 'bg-purple-100/90 border border-purple-200/80 text-purple-900 hover:bg-purple-200/80 cursor-pointer active:scale-95'
            }`}
            title="Announcements"
            aria-label="Announcements"
          >
            <motion.div
              animate={
                isBellRinging && !isMasterLocked
                  ? { rotate: [0, -20, 20, -16, 16, -10, 10, 0] }
                  : { rotate: 0 }
              }
              transition={{ duration: 0.9, ease: 'easeInOut' }}
              style={{ originY: 0.15 }}
            >
              <Bell className={`w-4 h-4 stroke-[2.3] ${isMasterLocked ? 'text-neutral-500' : 'text-purple-700'}`} />
            </motion.div>

            {announcements.length > 0 && !isMasterLocked && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                {announcements.length}
              </span>
            )}
          </button>
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
          {/* Scheduled Upcoming Maintenance Notice (Purple >15m, Yellow <=15m) */}
          {!isMaintenanceActive && isMaintenanceUpcoming && startMs && (
            <div
              className={`p-3.5 rounded-2xl border-2 shadow-xs mb-2 transition-colors duration-300 ${
                isWithin15Min
                  ? 'bg-amber-50 border-amber-400 text-amber-950'
                  : 'bg-purple-50 border-purple-200 text-purple-950'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isWithin15Min
                      ? 'bg-amber-300/80 text-amber-900'
                      : 'bg-purple-200/80 text-purple-800'
                  }`}
                >
                  <Clock className={`w-4 h-4 ${isWithin15Min ? 'animate-pulse' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-[11px] font-black uppercase tracking-wider ${
                        isWithin15Min ? 'text-amber-900' : 'text-purple-900'
                      }`}
                    >
                      {isWithin15Min ? 'Maintenance Starting Soon' : 'Scheduled Maintenance Notice'}
                    </h3>
                  </div>
                  <p
                    className={`text-xs font-semibold mt-0.5 leading-relaxed ${
                      isWithin15Min ? 'text-amber-900/90' : 'text-purple-900/90'
                    }`}
                  >
                    {maintenance?.scheduled_message ||
                      maintenance?.message ||
                      'ScoreSync has upcoming scheduled maintenance.'}
                  </p>
                  <div
                    className={`mt-2 flex flex-col gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg ${
                      isWithin15Min
                        ? 'text-amber-950 bg-amber-200/70'
                        : 'text-purple-900 bg-purple-200/50'
                    }`}
                  >
                    <span>
                      Start: {new Date(startMs).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {endMs && (
                      <span>
                        End: {new Date(endMs).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Maintenance Lockdown Notice Card (Red) */}
          {isMaintenanceActive && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-950 shadow-sm mb-2">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-200/80 flex items-center justify-center shrink-0 mt-0.5">
                  <Wrench className="w-4 h-4 text-rose-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-900">
                    Site Under Maintenance
                  </h3>
                  <p className="text-xs font-semibold text-rose-900/90 mt-1 leading-relaxed">
                    {maintenance?.message || 'ScoreSync is temporarily locked for maintenance. Please check back shortly.'}
                  </p>
                  {(startMs || endMs) && (
                    <div className="mt-2 flex flex-col gap-1 text-[11px] font-bold text-rose-900 bg-rose-200/60 px-2.5 py-1.5 rounded-lg">
                      {startMs && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>
                            Start: {new Date(startMs).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </span>
                      )}
                      {endMs && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>
                            End: {new Date(endMs).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Create Game Button (Disabled & Black & White during maintenance) */}
          <button
            disabled={isMaintenanceActive}
            onClick={() => !isMaintenanceActive && navigate('/create')}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
              isMaintenanceActive
                ? 'bg-neutral-300 text-neutral-600 border border-neutral-400 grayscale cursor-not-allowed opacity-70 shadow-none'
                : 'bg-gradient-to-r from-[#4A10A8] via-[#7016E6] to-[#8625FF] text-white shadow-lg shadow-purple-600/30 active:scale-[0.98] cursor-pointer hover:shadow-purple-600/45'
            }`}
          >
            <span>Create Game</span>
            <ArrowRight className="w-5 h-5 ml-1 stroke-[2.5]" />
          </button>

          {/* Join Game Button (Disabled & Black & White during maintenance) */}
          <button
            disabled={isMaintenanceActive}
            onClick={() => !isMaintenanceActive && navigate('/join?mode=player')}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-base border transition-all flex items-center justify-center gap-2.5 ${
              isMaintenanceActive
                ? 'bg-neutral-200 text-neutral-500 border-neutral-300 grayscale cursor-not-allowed opacity-70 shadow-none'
                : 'bg-white text-[#1E1B4B] shadow-md shadow-purple-100/70 border-purple-100/60 active:scale-[0.98] cursor-pointer hover:bg-purple-50/50'
            }`}
          >
            <Gamepad2 className={`w-5 h-5 stroke-[2.2] ${isMaintenanceActive ? 'text-neutral-500' : 'text-purple-700'}`} />
            <span>Join Game</span>
          </button>

          {/* Join as Audience Button (Disabled & Black & White during maintenance) */}
          <button
            disabled={isMaintenanceActive}
            onClick={() => !isMaintenanceActive && navigate('/join?mode=audience')}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-base border transition-all flex items-center justify-center gap-2.5 ${
              isMaintenanceActive
                ? 'bg-neutral-200 text-neutral-500 border-neutral-300 grayscale cursor-not-allowed opacity-70 shadow-none'
                : 'bg-white text-purple-950 shadow-md shadow-purple-100/70 border-purple-100/60 active:scale-[0.98] cursor-pointer hover:bg-purple-50/50'
            }`}
          >
            <Eye className={`w-5 h-5 stroke-[2.2] ${isMaintenanceActive ? 'text-neutral-500' : 'text-[#8625FF]'}`} />
            <span>Join as Audience</span>
          </button>

          {/* User Guide Pill Button */}
          <button
            disabled={isMasterLocked}
            onClick={() => !isMasterLocked && setIsGuideOpen(true)}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 ${
              isMasterLocked
                ? 'bg-neutral-200 text-neutral-500 border-neutral-300 grayscale opacity-60 cursor-not-allowed'
                : 'bg-purple-100/50 text-purple-900 border-purple-200/60 active:scale-[0.98] cursor-pointer hover:bg-purple-100/80'
            }`}
          >
            <BookOpen className={`w-4 h-4 ${isMasterLocked ? 'text-neutral-500' : 'text-purple-700'}`} />
            <span>How to Play • User Guide</span>
          </button>

          <GameControllerAccent className="absolute -bottom-8 -right-4" />
        </motion.div>

        {/* User Guide Modal */}
        <UserGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />

        {/* Announcements Modal */}
        <AnnouncementsModal
          isOpen={isAnnouncementsOpen}
          onClose={() => setIsAnnouncementsOpen(false)}
          announcements={announcements}
          isLoading={isLoadingAnnouncements}
        />

        {/* PWA Install Modal */}
        <InstallPwaModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
          promptInstall={promptInstall}
          isIos={isIos}
          isAndroid={isAndroid}
          deferredPrompt={deferredPrompt}
        />
      </div>
    </MobileContainer>
  );
};
