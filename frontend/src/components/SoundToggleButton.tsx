import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface SoundToggleButtonProps {
  dark?: boolean;
}

export const SoundToggleButton: React.FC<SoundToggleButtonProps> = ({ dark = false }) => {
  const [muted, setMuted] = useState(soundEffects.isMuted());

  useEffect(() => {
    return soundEffects.subscribeMute((newMuted) => {
      setMuted(newMuted);
    });
  }, []);

  const handleToggle = () => {
    const next = soundEffects.toggleMute();
    if (!next) {
      // Play a cute soft chime to confirm sound is active
      soundEffects.playRoundSaved();
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-1.5 rounded-xl transition cursor-pointer flex items-center justify-center ${
        dark
          ? muted
            ? 'bg-slate-800/80 text-slate-500 hover:text-slate-300 border border-slate-700/60'
            : 'bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30'
          : muted
          ? 'bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200/80'
          : 'bg-indigo-50 text-indigo-600 hover:text-indigo-700 border border-indigo-100'
      }`}
      title={muted ? 'Unmute Sound FX' : 'Mute Sound FX'}
      aria-label={muted ? 'Unmute Sound FX' : 'Mute Sound FX'}
    >
      {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
    </button>
  );
};
