import React from 'react';

interface MyVitaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  inverted?: boolean;
}

export function MyVitaLogo({
  className = '',
  size = 'md',
  showText = true,
  showTagline = false,
  inverted = false,
}: MyVitaLogoProps) {
  // Dimensions for the icon
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  }[size];

  const titleSizes = {
    sm: 'text-base font-bold',
    md: 'text-xl font-extrabold',
    lg: 'text-2xl font-black',
    xl: 'text-3xl font-black',
  }[size];

  const taglineSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm',
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Visual Logo Mark: Leaves + ECG pulse */}
      <div className={`relative ${iconDimensions} shrink-0 flex items-center justify-center select-none`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-xs"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left Leaf: Vibrant Teal */}
          <path
            d="M50 82C48 68 28 64 22 46C16 28 32 16 42 16C46 16 49 24 50 32C51 24 50 82 50 82Z"
            fill="url(#tealGradient)"
          />
          {/* Right Leaf: Fresh Lime Green */}
          <path
            d="M50 82C52 68 72 64 78 46C84 28 68 16 58 16C54 16 51 24 50 32C49 24 50 82 50 82Z"
            fill="url(#limeGradient)"
          />

          {/* White Heartbeat ECG Line across both leaves */}
          <path
            d="M 23 48 L 36 48 L 40 42 L 45 62 L 51 24 L 56 66 L 61 44 L 65 52 L 77 52"
            stroke="#FFFFFF"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="tealGradient" x1="20" y1="20" x2="50" y2="82" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00B4D8" />
              <stop offset="0.5" stopColor="#0D9488" />
              <stop offset="1" stopColor="#0F766E" />
            </linearGradient>
            <linearGradient id="limeGradient" x1="50" y1="82" x2="80" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#65A30D" />
              <stop offset="0.5" stopColor="#84CC16" />
              <stop offset="1" stopColor="#A3E635" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Name & Tagline */}
      {showText && (
        <div className="flex flex-col justify-center leading-tight">
          <div className="flex items-center gap-1.5">
            <span
              className={`${titleSizes} tracking-tight ${
                inverted ? 'text-white' : 'text-slate-900'
              }`}
            >
              My<span className="text-teal-600">Vita</span>
            </span>
          </div>
          {showTagline && (
            <p
              className={`${taglineSizes} font-semibold tracking-wide mt-0.5 ${
                inverted ? 'text-teal-200' : 'text-slate-600'
              }`}
            >
              Connect • Track • Understand • Thrive
            </p>
          )}
        </div>
      )}
    </div>
  );
}
