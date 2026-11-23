import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileContainer } from '../components/MobileContainer';
import type { ScoringRule } from '../types/game';
import { useGameStore } from '../store/useGameStore';
import { ArrowLeft, ArrowRight, Gamepad2, Trophy, ArrowDown, HelpCircle, User } from 'lucide-react';
import { GameControllerAccent } from '../components/Illustrations';

export const CreateGameScreen: React.FC = () => {
  const navigate = useNavigate();
  const createGame = useGameStore((state) => state.createGame);

  const [gameName, setGameName] = useState('Friday Game Night');
  const [hostName, setHostName] = useState('');
  const [scoringRule, setScoringRule] = useState<ScoringRule>('highest_wins');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!gameName.trim()) {
      alert('Please enter a game name');
      return;
    }
    if (!hostName.trim()) {
      alert('Please enter your name');
      return;
    }
    try {
      setIsLoading(true);
      const newGame = await createGame(gameName.trim(), scoringRule, hostName.trim());
      navigate(`/game-created/${newGame.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create game');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col justify-between p-6 pt-8 pb-8 relative">
        {/* Top Header */}
        <div>
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-white/60 transition cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
          </button>

          <div className="mt-4 mb-8">
            <h1 className="text-2xl font-bold text-[#1E1B4B]">Create Game</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Set up your game</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-5">
            {/* Host Name Input */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Your Name (Host)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-indigo-500">
                  <User className="w-5 h-5 stroke-[2.2]" />
                </div>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Enter your name (e.g. Alex)"
                  className="w-full bg-white pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200/80 text-[#1E1B4B] font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-xs"
                />
              </div>
            </div>

            {/* Game Name Input */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Game Name
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-indigo-500">
                  <Gamepad2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Friday Game Night"
                  className="w-full bg-white pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200/80 text-[#1E1B4B] font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-xs"
                />
              </div>
            </div>

            {/* Scoring Rule Option */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Scoring Rule
                </label>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Highest Score Wins */}
                <button
                  type="button"
                  onClick={() => setScoringRule('highest_wins')}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    scoringRule === 'highest_wins'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-xl mb-2 ${scoringRule === 'highest_wins' ? 'bg-indigo-500' : 'bg-slate-100'}`}>
                    <Trophy className={`w-5 h-5 ${scoringRule === 'highest_wins' ? 'text-amber-300' : 'text-slate-600'}`} />
                  </div>
                  <span className="text-xs font-bold leading-tight">Highest<br />Score Wins</span>
                </button>

                {/* Lowest Score Wins */}
                <button
                  type="button"
                  onClick={() => setScoringRule('lowest_wins')}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    scoringRule === 'lowest_wins'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-xl mb-2 ${scoringRule === 'lowest_wins' ? 'bg-indigo-500' : 'bg-slate-100'}`}>
                    <div className="flex gap-0.5">
                      <ArrowDown className={`w-4 h-4 ${scoringRule === 'lowest_wins' ? 'text-amber-300' : 'text-slate-600'}`} />
                      <ArrowDown className={`w-4 h-4 ${scoringRule === 'lowest_wins' ? 'text-amber-300' : 'text-slate-600'}`} />
                    </div>
                  </div>
                  <span className="text-xs font-bold leading-tight">Lowest<br />Score Wins</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="relative pt-6">
          <button
            onClick={handleCreate}
            disabled={!gameName.trim() || !hostName.trim() || isLoading}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#4F46E5] text-white font-bold text-base shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{isLoading ? 'Creating...' : 'Create Game'}</span>
            <ArrowRight className="w-5 h-5 ml-1 stroke-[2.5]" />
          </button>

          <GameControllerAccent className="absolute -bottom-6 right-0" />
        </div>
      </div>
    </MobileContainer>
  );
};
