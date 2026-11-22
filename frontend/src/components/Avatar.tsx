import React from 'react';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  connected?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', className = '', connected }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base font-semibold',
  };

  // Fun vibrant color pairings derived from name string
  const colors = [
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
  ];

  const charCode = name.charCodeAt(0) || 0;
  const color = colors[charCode % colors.length];
  const initial = name.slice(0, 2).toUpperCase();

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <div
        className={`${sizeClasses[size]} ${color.bg} ${color.text} ${color.border} border font-bold rounded-full flex items-center justify-center shadow-xs select-none`}
      >
        {initial}
      </div>
      {connected !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
            connected ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
        />
      )}
    </div>
  );
};
