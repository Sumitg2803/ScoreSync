import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2 } from 'lucide-react';

interface GameCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
}

export const GameCodeModal: React.FC<GameCodeModalProps> = ({
  isOpen,
  onClose,
  gameId,
}) => {
  const [copied, setCopied] = React.useState(false);
  const joinUrl = `${window.location.origin}/join/${gameId}`;

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join my ScoreSync game!',
        text: `Join with Game Code: ${gameId}`,
        url: joinUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xs rounded-3xl p-5 relative flex flex-col items-center shadow-2xl text-center">
        {/* Header */}
        <div className="flex items-center justify-between w-full pb-3 border-b border-slate-100">
          <span className="font-bold text-sm text-[#1E1B4B]">Invite Players</span>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code */}
        <div className="my-5 p-3 bg-slate-50 rounded-2xl border border-slate-100">
          <QRCodeSVG value={joinUrl} size={150} level="H" fgColor="#1E1B4B" />
        </div>

        {/* Game ID Badge */}
        <div className="flex items-center justify-between w-full bg-slate-100/80 px-4 py-2.5 rounded-2xl mb-4">
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Game Code</span>
            <span className="text-base font-black tracking-widest text-[#1E1B4B]">{gameId}</span>
          </div>
          <button
            onClick={handleCopy}
            className="p-2 rounded-xl text-indigo-600 hover:bg-white transition cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#4F46E5] text-white font-bold text-xs shadow-md shadow-indigo-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Share Joining Link</span>
        </button>
      </div>
    </div>
  );
};
