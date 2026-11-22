import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MobileContainer } from '../components/MobileContainer';
import { useGameStore } from '../store/useGameStore';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export const GameCreatedScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentGame = useGameStore((state) => state.currentGame);
  const gameId = id || currentGame?.id || 'A7K9D2';
  const joinUrl = `${window.location.origin}/join/${gameId}`;

  const [copied, setCopied] = useState(false);

  // Trigger celebration confetti on mount
  React.useEffect(() => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.3 },
      colors: ['#6366F1', '#A855F7', '#FBBF24', '#38BDF8'],
    });
  }, []);

  const handleCopyId = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join my ScoreSync game!',
        text: `Join my game with code ${gameId}`,
        url: joinUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col justify-between p-6 pt-10 pb-8 text-center">
        {/* Top Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-[#1E1B4B]">Game Created!</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Invite players to join using code or QR</p>
        </div>

        {/* QR Code Card */}
        <div className="my-auto flex flex-col items-center">
          <div className="bg-white p-6 rounded-3xl shadow-xl shadow-indigo-100 border border-slate-100 relative group flex items-center justify-center">
            <QRCodeSVG
              value={joinUrl}
              size={180}
              level="H"
              includeMargin={false}
              fgColor="#1E1B4B"
            />
            {/* Center link badge */}
            <div className="absolute w-10 h-10 bg-gradient-to-tr from-[#6366F1] to-[#7C3AED] rounded-full flex items-center justify-center shadow-md border-2 border-white">
              <Share2 className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Game ID Badge */}
          <div className="mt-6 flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Game ID</span>
            <span className="text-lg font-black tracking-widest text-[#1E1B4B]">{gameId}</span>
            <button
              onClick={handleCopyId}
              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition cursor-pointer ml-1"
              title="Copy Game ID"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleShare}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#4F46E5] text-white font-bold text-base shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-5 h-5" />
            <span>Share Link</span>
          </button>

          <button
            onClick={() => navigate(`/lobby/${gameId}`)}
            className="w-full py-3.5 px-6 rounded-2xl bg-white text-slate-700 font-bold text-sm shadow-xs border border-slate-200/80 hover:bg-slate-50 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </MobileContainer>
  );
};
