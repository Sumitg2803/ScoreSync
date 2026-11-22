import React from 'react';

export const TrophyIllustration: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 96 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Background glow & sparkles */}
      <div className="absolute w-28 h-28 bg-amber-200/40 rounded-full blur-xl animate-pulse" />
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative drop-shadow-md"
      >
        {/* Sparkles */}
        <path d="M24 32L26 24L34 22L26 20L24 12L22 20L14 22L22 24L24 32Z" fill="#818CF8" />
        <path d="M96 28L97.5 22L103.5 20.5L97.5 19L96 13L94.5 19L88.5 20.5L94.5 22L96 28Z" fill="#C084FC" />
        <circle cx="102" cy="46" r="3" fill="#FBBF24" />
        <circle cx="18" cy="54" r="2.5" fill="#38BDF8" />

        {/* Trophy Base */}
        <path
          d="M44 98H76C78.2091 98 80 99.7909 80 102V104C80 105.105 79.1046 106 78 106H42C40.8954 106 40 105.105 40 104V102C40 99.7909 41.7909 98 44 98Z"
          fill="#D97706"
        />
        <rect x="46" y="86" width="28" height="12" rx="2" fill="#B45309" />
        <rect x="48" y="88" width="24" height="8" rx="1" fill="#F59E0B" />

        {/* Stem */}
        <path d="M54 74H66V86H54V74Z" fill="#F59E0B" />

        {/* Cup Handles */}
        <path
          d="M38 32H28C22.4772 32 18 36.4772 18 42C18 51.5 25.5 59 35 60L38 60.3V52L34.5 51.6C29 51 25.5 46.5 25.5 42C25.5 39.5 27 38 29.5 38H38V32Z"
          fill="#F59E0B"
        />
        <path
          d="M82 32H92C97.5228 32 102 36.4772 102 42C102 51.5 94.5 59 85 60L82 60.3V52L85.5 51.6C91 51 94.5 46.5 94.5 42C94.5 39.5 93 38 90.5 38H82V32Z"
          fill="#F59E0B"
        />

        {/* Cup Body */}
        <path
          d="M36 24H84V46C84 59.2548 73.2548 70 60 70C46.7452 70 36 59.2548 36 46V24Z"
          fill="url(#goldGradient)"
        />

        {/* Cup Rim */}
        <rect x="33" y="20" width="54" height="7" rx="3.5" fill="#FCD34D" />

        {/* Star in Trophy */}
        <path
          d="M60 36L62.4 42.2L69 42.8L64 47.1L65.5 53.6L60 50.1L54.5 53.6L56 47.1L51 42.8L57.6 42.2L60 36Z"
          fill="#FFFBEB"
        />

        {/* Highlights */}
        <path
          d="M40 28C40 28 44 48 50 56"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.6"
        />

        <defs>
          <linearGradient id="goldGradient" x1="36" y1="24" x2="84" y2="70" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FBBF24" />
            <stop offset="0.5" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export const GameControllerAccent: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`pointer-events-none opacity-40 select-none ${className}`}>
      <svg width="100" height="70" viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M20 15C20 6.71573 26.7157 0 35 0H65C73.2843 0 80 6.71573 80 15V35C80 48.8071 68.8071 60 55 60H53C49.134 60 45.6416 57.8115 44 54.4952L40.5 47.5C39.5 45.5 37 45.5 36 47.5L32.5 54.4952C30.8584 57.8115 27.366 60 23.5 60H21C11.6112 60 4 52.3888 4 43V31C4 22.1634 11.1634 15 20 15Z"
          fill="#818CF8"
          fillOpacity="0.35"
        />
        {/* D-Pad */}
        <rect x="22" y="24" width="6" height="16" rx="2" fill="#4F46E5" fillOpacity="0.6" />
        <rect x="17" y="29" width="16" height="6" rx="2" fill="#4F46E5" fillOpacity="0.6" />
        {/* Action Buttons */}
        <circle cx="65" cy="27" r="3.5" fill="#4F46E5" fillOpacity="0.6" />
        <circle cx="73" cy="33" r="3.5" fill="#4F46E5" fillOpacity="0.6" />
      </svg>
    </div>
  );
};
