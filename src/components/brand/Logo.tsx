import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700/60 p-1.5 shadow-lg group-hover:border-zinc-500 transition`}>
        {/* Subtle internal gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/10 via-transparent to-white/5 rounded-xl pointer-events-none" />
        <svg viewBox="0 0 512 512" className="w-full h-full drop-shadow-sm">
          <g transform="translate(40, 80)">
            <path
              d="M320 240 H100 C55.8 240 20 204.2 20 160 C20 120.5 48.6 87.7 86.8 81.3 C96.2 35.1 137.1 0 186.7 0 C225.8 0 259.4 21.8 276.4 54.1 C288.7 45.2 303.8 40 320 40 C359.8 40 392.6 69.4 398.8 107.8 C411.5 116.8 420 131.8 420 148.8 C420 178.6 397.6 203.2 368.5 206.8 L320 206.8"
              fill="none"
              stroke="#ffffff"
              strokeWidth="32"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M150 175 C150 155 170 135 195 135 C225 135 245 175 275 175 C300 175 320 155 320 135"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="28"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="195" cy="135" r="10" fill="#38bdf8" />
            <circle cx="275" cy="175" r="10" fill="#60a5fa" />
          </g>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <span className={`font-black tracking-tight text-white leading-none ${textSizes[size]}`}>
            INF<span className="text-sky-400 font-extrabold">CLOUD</span>
          </span>
          {size === 'lg' && (
            <span className="text-xs text-zinc-400 font-medium tracking-wider uppercase mt-1">
              988 GB Capacity Tier
            </span>
          )}
        </div>
      )}
    </div>
  );
};
