import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileContainer } from '../components/MobileContainer';
import { useGameStore } from '../store/useGameStore';
import { TrophyIllustration } from '../components/Illustrations';
import { Eye } from 'lucide-react';
import confetti from 'canvas-confetti';

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

  useEffect(() => {
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
      <div className="flex-1 flex flex-col justify-between p-6 pt-8 pb-8 text-center relative">
        {/* Top Floating Eye Counter (Only when viewers are watching) */}
        {spectatorCount > 0 && (
          <div className="flex justify-end mb-2">
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white shadow-xs border border-slate-200/80 text-slate-700 text-xs font-bold"
              title="Live Viewers"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5]" />
              <span>{spectatorCount}</span>
            </div>
          </div>
        )}

        {/* Celebration Header */}
        <div>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <TrophyIllustration size={100} />
            </div>
          </div>

          <h1 className="text-2xl font-black text-[#1E1B4B]">Game Completed!</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">Here are the final results</p>
        </div>

        {/* Final Standings List */}
        <div className="my-auto bg-white rounded-3xl p-4 shadow-xl shadow-indigo-100/70 border border-slate-100 divide-y divide-slate-100 text-left">
          {rankings.map((item, index) => {
            const badgeColors = [
              'bg-amber-400 text-white',
              'bg-slate-300 text-slate-700',
              'bg-amber-600 text-white',
              'bg-slate-100 text-slate-500',
            ];
            return (
              <div key={item.player.id} className="flex items-center justify-between py-3.5 px-2 first:pt-1 last:pb-1">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center ${
                      badgeColors[index] || badgeColors[3]
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="font-bold text-sm text-[#1E1B4B]">{item.player.name}</span>
                </div>

                <span className="font-black text-sm text-[#1E1B4B]">
                  {item.totalScore.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="space-y-3 pt-4">
          {isHost ? (
            <button
              onClick={handlePlayAgain}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#4F46E5] text-white font-bold text-base shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              Play Again
            </button>
          ) : (
            <div className="w-full py-3.5 px-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center gap-2 text-indigo-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>Waiting for Host to start another game...</span>
            </div>
          )}

          <button
            onClick={handleHome}
            className="w-full py-3.5 px-6 rounded-2xl bg-white text-slate-700 font-bold text-sm shadow-xs border border-slate-200/80 hover:bg-slate-50 transition cursor-pointer"
          >
            Home
          </button>
        </div>
      </div>
    </MobileContainer>
  );
};
