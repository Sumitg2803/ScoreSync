import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileContainer } from '../components/MobileContainer';
import { useGameStore } from '../store/useGameStore';
import { TrophyIllustration } from '../components/Illustrations';
import { Eye } from 'lucide-react';
import confetti from 'canvas-confetti';
import { calculateGameBadges } from '../utils/badgeCalculations';
import { GameBadgesSection } from '../components/GameBadgesSection';
import { SoundToggleButton } from '../components/SoundToggleButton';
import { soundEffects } from '../utils/soundEffects';
import { FloatingReactionsCanvas, EmojiReactionDock } from '../components/EmojiReactions';

export const ResultsScreen: React.FC = () => {
  const navigate = useNavigate();
  const currentGame = useGameStore((state) => state.currentGame);
  const isHost = useGameStore((state) => state.isHost);
  const isSpectator = useGameStore((state) => state.isSpectator);
  const spectatorCount = useGameStore((state) => state.spectatorCount);
  const getRankings = useGameStore((state) => state.getRankings);
  const playAgain = useGameStore((state) => state.playAgain);
  const leaveSpectator = useGameStore((state) => state.leaveSpectator);
  const resetCurrentGame = useGameStore((state) => state.resetCurrentGame);
  const connectWebSocket = useGameStore((state) => state.connectWebSocket);

  const gameId = currentGame?.id;

  React.useEffect(() => {
    if (gameId) {
      connectWebSocket(gameId);
    }
  }, [gameId, connectWebSocket]);

  // When host resets game back to lobby via playAgain:
  // - Players navigate back to waiting room
  // - Viewers navigate to LeaderboardScreen (which renders the Audience Holding Screen)
  React.useEffect(() => {
    if (currentGame && currentGame.status === 'waiting' && gameId) {
      if (isSpectator) {
        navigate(`/leaderboard/${gameId}`);
      } else {
        navigate(`/lobby/${gameId}`);
      }
    }
  }, [currentGame?.status, isSpectator, gameId, navigate]);

  const rankings = getRankings();

  // Compute fun awards and match highlights
  const badges = useMemo(() => {
    return calculateGameBadges(currentGame, rankings);
  }, [currentGame, rankings]);

  useEffect(() => {
    // Play celebratory victory fanfare
    soundEffects.playVictoryFanfare();

    // Grand celebration confetti
    const end = Date.now() + 2 * 1000;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const handlePlayAgain = async () => {
    if (isHost) {
      await playAgain();
      if (gameId) {
        navigate(`/lobby/${gameId}`);
      }
    }
  };

  const handleHome = async () => {
    if (isHost) {
      await resetCurrentGame();
      navigate('/');
    } else if (isSpectator) {
      await leaveSpectator();
      navigate('/');
    } else {
      // Player leaves the final results screen: cleanly disconnect without deleting completed scores
      const { disconnectWebSocket } = useGameStore.getState();
      disconnectWebSocket();
      localStorage.removeItem('scoresync_game_storage');
      useGameStore.setState({ currentGame: null, currentPlayerId: null, isHost: false, isSpectator: false, spectatorCount: 0 });
      navigate('/');
    }
  };

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col justify-between p-5 pt-6 pb-6 text-center relative overflow-hidden">
        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto pr-0.5 space-y-3">
          {/* Top Floating Action Bar: Sound Mute & Eye Counter */}
          <div className="flex items-center justify-end gap-1.5 mb-1">
            <SoundToggleButton />
            {spectatorCount > 0 && (
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white shadow-xs border border-slate-200/80 text-slate-700 text-xs font-bold"
                title="Live Viewers"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5]" />
                <span>{spectatorCount}</span>
              </div>
            )}
          </div>

          {/* Celebration Header */}
          <div>
            <div className="flex justify-center mb-3">
              <div className="relative">
                <TrophyIllustration size={88} />
              </div>
            </div>

            <h1 className="text-2xl font-black text-[#1E1B4B]">Game Completed!</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Here are the final results</p>
          </div>

          {/* 🏅 Game Night Honors & Badges Section */}
          <GameBadgesSection badges={badges} />

          {/* Final Standings List */}
          <div className="bg-white rounded-3xl p-4 shadow-xl shadow-indigo-100/70 border border-slate-100 divide-y divide-slate-100 text-left">
            <div className="pb-2 mb-1 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400">
              <span>Final Standings</span>
              <span>Total Pts</span>
            </div>

            {rankings.map((item, index) => {
              const badgeColors = [
                'bg-amber-400 text-white',
                'bg-slate-300 text-slate-700',
                'bg-amber-600 text-white',
                'bg-slate-100 text-slate-500',
              ];

              const playerBadges = badges.filter((b) => b.recipientPlayerId === item.player.id);

              return (
                <div key={item.player.id} className="flex items-center justify-between py-3.5 px-2 first:pt-2 last:pb-1">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <span
                      className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                        badgeColors[index] || badgeColors[3]
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-[#1E1B4B] truncate">
                          {item.player.name}
                        </span>

                        {/* Player Badges Pills */}
                        {playerBadges.map((b) => (
                          <span
                            key={b.id}
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${b.badgeBg} flex items-center gap-0.5 shrink-0`}
                            title={b.description}
                          >
                            <span>{b.icon}</span>
                            <span className="hidden xs:inline">{b.title}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <span className="font-black text-sm text-[#1E1B4B] shrink-0">
                    {item.totalScore.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Reactions Canvas */}
        <FloatingReactionsCanvas />

        {/* Bottom Actions */}
        <div className="space-y-2.5 pt-3 border-t border-slate-100/80 bg-white/40 backdrop-blur-xs">
          {/* Reaction Bar */}
          <div className="flex justify-center">
            <EmojiReactionDock />
          </div>

          {isHost ? (
            <button
              onClick={handlePlayAgain}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#4F46E5] text-white font-bold text-sm shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              Play Again
            </button>
          ) : (
            <div className="w-full py-3 px-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center gap-2 text-indigo-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>Waiting for Host to start another game...</span>
            </div>
          )}

          <button
            onClick={handleHome}
            className="w-full py-3 px-6 rounded-2xl bg-white text-slate-700 font-bold text-sm shadow-xs border border-slate-200/80 hover:bg-slate-50 transition cursor-pointer"
          >
            Home
          </button>
        </div>
      </div>
    </MobileContainer>
  );
};
