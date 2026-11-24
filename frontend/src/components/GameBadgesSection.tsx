import React from 'react';
import type { AwardBadge } from '../utils/badgeCalculations';
import { Avatar } from './Avatar';
import { Award, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface GameBadgesSectionProps {
  badges: AwardBadge[];
}

export const GameBadgesSection: React.FC<GameBadgesSectionProps> = ({ badges }) => {
  if (!badges || badges.length === 0) {
    return null;
  }

  return (
    <div className="w-full my-4">
      {/* Section Title */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Game Night Honors
          </h2>
        </div>
        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
          {badges.length} {badges.length === 1 ? 'Award' : 'Awards'}
        </span>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {badges.map((badge, idx) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15 * idx, duration: 0.35, ease: 'easeOut' }}
            className={`p-3 rounded-2xl bg-gradient-to-br ${badge.gradientClass} bg-white border ${badge.borderColor} shadow-xs text-left relative flex flex-col justify-between overflow-hidden group hover:shadow-md transition-all`}
          >
            {/* Top row: Badge Icon & Title */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                  {badge.icon}
                </span>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${badge.badgeBg}`}
                >
                  {badge.title}
                </span>
              </div>

              {/* Player Info */}
              <div className="flex items-center gap-2 mt-1 min-w-0">
                <Avatar name={badge.recipientName} size="sm" />
                <span className="font-extrabold text-xs text-[#1E1B4B] truncate">
                  {badge.recipientName}
                </span>
              </div>
            </div>

            {/* Witty subtitle / description */}
            <div className="mt-2.5 pt-2 border-t border-slate-100/80">
              <span className={`text-[11px] font-bold block leading-tight ${badge.badgeText}`}>
                {badge.subtitle}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5 line-clamp-1">
                {badge.description}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
