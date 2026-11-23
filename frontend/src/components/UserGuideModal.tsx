import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Crown,
  Gamepad2,
  QrCode,
  Users,
  PlusCircle,
  Edit3,
  ShieldAlert,
  Dices,
  Trophy,
  RotateCcw,
  Sparkles,
  Smartphone,
  LogOut,
  Layers,
  Lightbulb,
  FileX,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  // Default tab is "why" as requested
  const [activeTab, setActiveTab] = useState<'why' | 'host' | 'player'>('why');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white w-full max-w-md max-h-[90vh] rounded-[32px] flex flex-col shadow-2xl overflow-hidden border border-slate-100"
        >
          {/* Header */}
          <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/60 via-indigo-50/60 to-amber-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
                <BookOpen className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base font-black text-[#1E1B4B] tracking-tight">ScoreSync Guide</h2>
                <p className="text-[11px] text-slate-500 font-semibold">Play • Score • Enjoy without chaos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/80 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 3-Way Segmented Tab Selector */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-100">
            <div className="flex bg-slate-200/80 p-1 rounded-2xl max-w-sm mx-auto">
              <button
                onClick={() => setActiveTab('why')}
                className={`flex-1 py-1.5 px-2 text-[11px] font-black rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'why'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Why Use?</span>
              </button>
              <button
                onClick={() => setActiveTab('host')}
                className={`flex-1 py-1.5 px-2 text-[11px] font-black rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'host'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Host Guide</span>
              </button>
              <button
                onClick={() => setActiveTab('player')}
                className={`flex-1 py-1.5 px-2 text-[11px] font-black rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'player'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Player Guide</span>
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-left text-slate-700">
            {/* TAB 1: WHY SCORESYNC? (OPENS FIRST) */}
            {activeTab === 'why' && (
              <>
                {/* Hero Nostalgia Card */}
                <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-4 rounded-3xl text-white shadow-md shadow-orange-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="w-5 h-5 text-amber-200 animate-pulse" />
                    <h3 className="font-black text-sm tracking-wide uppercase text-amber-100">
                      RIP Pen & Paper! 🪦🎉
                    </h3>
                  </div>
                  <p className="text-xs text-white/95 leading-relaxed font-medium mt-1">
                    Remember hunting for a pen that actually writes, tearing the last page out of someone's notebook, and having that one suspicious friend doing math who always "magically" wins by 5 points? 🤨
                  </p>
                  <p className="text-xs font-black text-amber-100 mt-2">
                    Never again! ScoreSync turns every phone in the room into a synchronized live scoreboard with zero signup hassle.
                  </p>
                </div>

                {/* Where to Use Section */}
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4 text-indigo-600" />
                    <span>Games Where ScoreSync Is a Lifesaver:</span>
                  </h4>

                  {/* Game 1: Chor Chithiya / Raja Mantri */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-start gap-2.5">
                    <span className="text-lg">🕵️‍♂️</span>
                    <div>
                      <span className="font-bold text-xs text-[#1E1B4B] block">
                        Chor Chithiya / Raja Mantri Chor Sipahi
                      </span>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                        No more scribbling numbers on torn paper chits! Enter round points (Raja=1000, Mantri=800, Sipahi=500, Chor=0) and let ScoreSync rank the true King.
                      </p>
                    </div>
                  </div>

                  {/* Game 2: Uno & Card Games */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-start gap-2.5">
                    <span className="text-lg">🃏</span>
                    <div>
                      <span className="font-bold text-xs text-[#1E1B4B] block">
                        Uno, Rummy, Teen Patti & Bluff
                      </span>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                        Tally card penalty points or poker chips round-by-round. Switch to <strong>Lowest Score Wins</strong> mode for Uno and watch standings adjust instantly!
                      </p>
                    </div>
                  </div>

                  {/* Game 3: Tambola / Housie */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-start gap-2.5">
                    <span className="text-lg">🎟️</span>
                    <div>
                      <span className="font-bold text-xs text-[#1E1B4B] block">
                        Tambola & Housie Family Nights
                      </span>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                        Track winners of Early 5, Corners, Rows, and Full House without arguing over napkin paper math.
                      </p>
                    </div>
                  </div>

                  {/* Game 4: Board Games & Charades */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-start gap-2.5">
                    <span className="text-lg">🎲</span>
                    <div>
                      <span className="font-bold text-xs text-[#1E1B4B] block">
                        Scrabble, Catan, Trivia & Dumb Charades
                      </span>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                        Team vs Team points, Friday night Bollywood quizzes, Carrom tournaments, or darts battles.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ScoreSync Superpowers */}
                <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100 space-y-2 mt-2">
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>The ScoreSync Superpowers:</span>
                  </h4>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 pl-1">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><strong>Zero Math Arguments:</strong> Auto-calculates ties, ranks, and medals.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><strong>Zero Signup:</strong> Scan QR code and play in 3 seconds.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><strong>Live Sync:</strong> Every phone in the room jumps and celebrates together!</span>
                    </li>
                  </ul>
                </div>
              </>
            )}

            {/* TAB 2: HOST PERSPECTIVE */}
            {activeTab === 'host' && (
              <>
                <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100/80">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Crown className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-xs text-indigo-950 uppercase tracking-wider">
                      The Host's Command Center
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    As the Host, you create the room, control the game pace, enter scores, and crown the winner.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    <span>1. Creating & Inviting Players</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    Name your game and choose whether <strong>Highest Score Wins</strong> or <strong>Lowest Score Wins</strong>. Show the large on-screen QR code or copy the 6-character Game Code for your friends. Zero sign-up required.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>2. The Waiting Room & Starting</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    Watch players connect live. Only you have the <strong>"Start Game ▶"</strong> button. If you need to back out, tapping the back arrow lets you cancel the game cleanly so no one is left hanging.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <PlusCircle className="w-4 h-4 text-indigo-600" />
                    <span>3. Adding Rounds & Editing Scores</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    In your dark navy dashboard, tap <strong>"+ Add Round"</strong> to record points for each player. Made a typo? Tap <strong>"Edit Scores"</strong> to pick any past round and fix numbers—all player leaderboards update in real time!
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span>4. Anti-Chaos Admission Lock</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    While you are actively typing scores, new incoming players are placed in a gentle waiting queue so your inputs are never interrupted. As soon as you save the round, they are admitted automatically!
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <Dices className="w-4 h-4 text-orange-500" />
                    <span>5. Need to Leave Mid-Game? Pass the Crown</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    If you must leave an active game, tap <strong>"Exit"</strong>. You can either pick a new host manually or tap <strong>"Pick at Random 🎲"</strong> to let the system select the next host. The chosen player immediately receives full hosting powers!
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>6. Crowning the Winner & Next Games</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    Tap <strong>"Complete Game"</strong> (with a comedy safeguard against misclicks) to reveal final champion standings with confetti. Tap <strong>"Play Again"</strong> to jump all connected friends straight back to the lobby for match #2, or <strong>"Home"</strong> to safely conclude the night.
                  </p>
                </div>
              </>
            )}

            {/* TAB 3: PLAYER PERSPECTIVE */}
            {activeTab === 'player' && (
              <>
                <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100/80">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Gamepad2 className="w-4 h-4 text-purple-600" />
                    <h3 className="font-bold text-xs text-purple-950 uppercase tracking-wider">
                      The Player's Experience
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Join seamlessly from your phone, watch live leaderboard sync, and compete for the top podium spot.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span>1. Instant Join (Zero Signup)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    Enter the 6-character Game Code or use the built-in <strong>"Scan QR Code"</strong> camera scanner. Type your display name and you’re in. No accounts, passwords, or app downloads needed.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>2. Live Leaderboard & Round History</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    Your screen synchronizes in real time. Switch between <strong>Overall</strong> to see cumulative totals and ranks, or tap <strong>Rounds</strong> to inspect exactly what points were scored in each round.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>3. Joining Mid-Game?</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    Anyone can join an ongoing game via the top corner QR code. When looking back at rounds before you arrived, your card playfully shows <em>"You didn’t exist here! 👻"</em> while you start earning points from the current round onward.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <RotateCcw className="w-4 h-4 text-emerald-600" />
                    <span>4. Safe from Accidental Closes</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    Swiped your browser away? Phone switched from Wi-Fi to cellular? Simply open the site again: ScoreSync automatically restores your ongoing game and live score without asking you to re-join!
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>5. Leaving or Finishing</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    If you must drop out mid-game, tapping <strong>"Exit"</strong> gives a confirmation and scrubs your entry. When the game ends naturally, your final rank remains celebrated on the podium even if you tap <strong>"Home"</strong>.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Bottom Close Action */}
          <div className="p-3 bg-slate-50 border-t border-slate-100">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-500/25 active:scale-[0.98] transition cursor-pointer"
            >
              Got it, let's play! 🚀
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
