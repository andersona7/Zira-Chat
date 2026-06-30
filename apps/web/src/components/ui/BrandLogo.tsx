import React from 'react';
import { motion } from 'framer-motion';

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  theme?: 'light' | 'dark' | 'responsive';
  mode?: 'icon-only' | 'full-logo';
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  theme = 'responsive',
  mode = 'icon-only',
  className = '',
  onClick,
}) => {
  // Map size classes for the logo image
  const sizeMap = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-24 h-24',
  };

  // Map text size classes
  const textMap = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base font-medium',
    lg: 'text-lg font-semibold',
    xl: 'text-2xl font-bold',
    '2xl': 'text-4xl font-light',
  };

  // Shadow class for light background contrast enhancement
  // Subtle shadow or outline (2-4% opacity black/dark shadow)
  const themeShadowClass =
    theme === 'light'
      ? 'shadow-[0_0_8px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03]'
      : theme === 'responsive'
      ? 'dark:shadow-none dark:ring-0 shadow-[0_0_8px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03]'
      : '';

  const logoImage = (
    <motion.img
      src="/logo.png"
      alt="Zira Chat Logo"
      className={`object-contain max-w-full max-h-full rounded-[28%] select-none ${sizeMap[size]} ${themeShadowClass}`}
      style={{ backfaceVisibility: 'hidden', transform: 'translate3d(0, 0, 0)' }}
      whileHover={{
        scale: 1.04,
        filter: 'drop-shadow(0px 0px 12px rgba(6, 182, 212, 0.3))',
        transition: { duration: 0.18, ease: 'easeOut' },
      }}
      whileTap={{
        scale: 0.97,
        transition: { duration: 0.16 },
      }}
    />
  );

  if (mode === 'icon-only') {
    return onClick ? (
      <button
        onClick={onClick}
        className={`focus:outline-none flex items-center justify-center ${className}`}
        aria-label="Zira Chat Home"
      >
        {logoImage}
      </button>
    ) : (
      <div className={`flex items-center justify-center ${className}`}>{logoImage}</div>
    );
  }

  // Full Logo (Icon + Text)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {onClick ? (
        <button
          onClick={onClick}
          className="focus:outline-none flex items-center justify-center"
          aria-label="Zira Chat Home"
        >
          {logoImage}
        </button>
      ) : (
        logoImage
      )}
      <span
        className={`font-display tracking-tight select-none text-text-primary ${textMap[size]}`}
      >
        Zira Chat
      </span>
    </div>
  );
};
