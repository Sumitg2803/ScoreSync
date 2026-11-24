import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { soundEffects } from '../utils/soundEffects';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingEmoji {
  id: string;
  emoji: string;
  xJitter: number;
  rotation: number;
}

const PARTY_EMOJIS = ['🔥', '👏', '😱', '👑', '💀'];

/**
 * Canvas that animates emoji bubbles floating up from bottom-right (Instagram Live style)
 */
export const FloatingReactionsCanvas: React.FC = () => {
  const latestReaction = useGameStore((state) => state.latestReaction);
  const [activeEmojis, setActiveEmojis] = useState<FloatingEmoji[]>([]);

  useEffect(() => {
    if (!latestReaction) return;

    const newParticle: FloatingEmoji = {
      id: `${latestReaction.id}-${Date.now()}-${Math.random()}`,
      emoji: latestReaction.emoji,
      xJitter: Math.floor(Math.random() * 40) - 20, // -20px to +20px wobble
      rotation: Math.floor(Math.random() * 30) - 15, // -15deg to +15deg
    };

    setActiveEmojis((prev) => [...prev.slice(-15), newParticle]); // Keep max 15 active

    // Prune particle after animation finishes
    const timer = setTimeout(() => {
      setActiveEmojis((prev) => prev.filter((p) => p.id !== newParticle.id));
    }, 2400);

    return () => clearTimeout(timer);
  }, [latestReaction]);

  return (
    <div className="pointer-events-none fixed bottom-20 right-6 z-40 w-24 h-64 overflow-visible">
      <AnimatePresence>
        {activeEmojis.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 0, scale: 0.6, x: item.xJitter, rotate: item.rotation }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: -220,
              scale: [0.6, 1.25, 1.1, 0.85],
              x: [item.xJitter, item.xJitter + 14, item.xJitter - 8],
              rotate: [item.rotation, item.rotation + 10, item.rotation - 10],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, ease: 'easeOut' }}
            className="absolute bottom-0 right-3 select-none text-2xl drop-shadow-md"
          >
            {item.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

/**
 * Floating Emoji Reaction Dock (bottom-right interactive pill bar)
 */
export const EmojiReactionDock: React.FC = () => {
  const sendReaction = useGameStore((state) => state.sendReaction);
  const lastTapRef = useRef<number>(0);

  const handleTap = (emoji: string) => {
    const now = Date.now();
    // Throttle client taps to max 4 per second
    if (now - lastTapRef.current < 220) return;
    lastTapRef.current = now;

    // 1. Instant local audio & haptic feedback
    soundEffects.playReactionPop();

    // 2. Broadcast via WebSocket
    sendReaction(emoji);

    // 3. Trigger immediate local particle so user feels instant zero-lag response
    useGameStore.setState({
      latestReaction: {
        id: `local-${Math.random()}`,
        emoji,
        timestamp: now,
      },
    });
  };

  return (
    <div className="flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg shadow-indigo-500/10 border border-slate-200/80">
      {PARTY_EMOJIS.map((emoji) => (
        <motion.button
          key={emoji}
          onClick={() => handleTap(emoji)}
          whileTap={{ scale: 0.75 }}
          whileHover={{ scale: 1.15 }}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-lg hover:bg-slate-100 active:bg-indigo-50 transition cursor-pointer select-none"
          title={`React with ${emoji}`}
        >
          {emoji}
        </motion.button>
      ))}
    </div>
  );
};
