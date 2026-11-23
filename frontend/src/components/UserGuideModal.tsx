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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'host' | 'player'>('host');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white w-full max-w-md max-h-[88vh] rounded-[32px] flex flex-col shadow-2xl overflow-hidden border border-slate-100"
        >
          {/* Header */}
          <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/60 to-indigo-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
                <BookOpen className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base font-black text-[#1E1B4B] tracking-tight">How to Play ScoreSync</h2>
                <p className="text-[11px] text-slate-500 font-semibold">Your quick, complete game night guide</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/80 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Segmented Tab Selector */}
          <div className="p-3 bg-slate-50 border-b border-slate-100">
            <div className="flex bg-slate-200/70 p-1 rounded-2xl max-w-xs mx-auto">
              <button
                onClick={() => setActiveTab('host')}
                className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
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
                className={`flex-1 py-2 px-3 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
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
            {activeTab === 'host' ? (
              // HOST PERSPECTIVE
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

                {/* Section 1: Setup */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    <span>1. Creating & Inviting Players</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    Name your game and choose whether <strong>Highest Score Wins</strong> or <strong>Lowest Score Wins</strong>. Show the large on-screen QR code or copy the 6-character Game Code for your friends. Zero sign-up required.
                  </p>
                </div>

                {/* Section 2: Waiting Room */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>2. The Waiting Room & Starting</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    Watch players connect live. Only you have the <strong>"Start Game ▶"</strong> button. If you need to back out, tapping the back arrow lets you cancel the game cleanly so no one is left hanging.
                  </p>
                </div>

                {/* Section 3: Scores & Rounds */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <PlusCircle className="w-4 h-4 text-indigo-600" />
                    <span>3. Adding Rounds & Editing Scores</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    In your dark navy dashboard, tap <strong>"+ Add Round"</strong> to record points for each player. Made a typo? Tap <strong>"Edit Scores"</strong> to pick any past round and fix numbers—all player leaderboards update in real time!
                  </p>
                </div>

                {/* Section 4: Mid-Game Admission Lock */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span>4. Anti-Chaos Admission Lock</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    While you are actively typing scores, new incoming players are placed in a gentle waiting queue so your inputs are never interrupted. As soon as you save the round, they are admitted automatically!
                  </p>
                </div>

                {/* Section 5: Exiting & Handing Over */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <Dices className="w-4 h-4 text-orange-500" />
                    <span>5. Need to Leave Mid-Game? Pass the Crown</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    If you must leave an active game, tap <strong>"Exit"</strong>. You can either pick a new host manually or tap <strong>"Pick at Random 🎲"</strong> to let the system select the next host. The chosen player immediately receives full hosting powers, and the match goes on!
                  </p>
                </div>

                {/* Section 6: Finishing */}
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
            ) : (
              // PLAYER PERSPECTIVE
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

                {/* Section 1: Zero Login Join */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span>1. Instant Join (Zero Signup)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    Enter the 6-character Game Code or use the built-in <strong>"Scan QR Code"</strong> camera scanner. Type your display name and you’re in. No accounts, passwords, or app downloads needed.
                  </p>
                </div>

                {/* Section 2: Real-time Leaderboard */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>2. Live Leaderboard & Round History</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    Your screen synchronizes in real time. Switch between <strong>Overall</strong> to see cumulative totals and ranks, or tap <strong>Rounds</strong> to inspect exactly what points were scored in each round.
                  </p>
                </div>

                {/* Section 3: Mid-Game Joiners */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>3. Joining Mid-Game?</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    Anyone can join an ongoing game via the top corner QR code. When looking back at rounds before you arrived, your card playfully shows <em>"You didn’t exist here! 👻"</em> while you start earning points from the current round onward.
                  </p>
                </div>

                {/* Section 4: Device Lock & Persistence */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <RotateCcw className="w-4 h-4 text-emerald-600" />
                    <span>4. Safe from Accidental Closes</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    Swiped your browser away? Phone switched from Wi-Fi to cellular? Simply open the site again: ScoreSync automatically restores your ongoing game and live score without asking you to re-join!
                  </p>
                </div>

                {/* Section 5: Exiting & Final Results */}
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

          {/* Bottom Close Button */}
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
