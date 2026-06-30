import React from 'react';
import { cn } from '@zira/utils';

export interface AvatarProps {
  src?: string;
  alt?: string;
  fallback: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  onClick?: () => void;
  showOnline?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, fallback, size = 'md', className, onClick, showOnline }) => {
  const sizes = {
    sm: 'w-8 h-8 text-[11px] rounded-[32%]',
    md: 'w-10 h-10 text-[13px] rounded-[32%]',
    lg: 'w-12 h-12 text-[15px] rounded-[32%]',
    xl: 'w-16 h-16 text-lg rounded-[32%]',
    '2xl': 'w-48 h-48 text-4xl rounded-[30%]',
  };

  const onlineDotSizes = {
    sm: 'w-2.5 h-2.5 border-[1.5px]',
    md: 'w-3.5 h-3.5 border-2',
    lg: 'w-3.5 h-3.5 border-2',
    xl: 'w-4.5 h-4.5 border-2',
    '2xl': 'w-6 h-6 border-[3px]',
  };

  const getInitials = (name: string) => {
    if (typeof name !== 'string') return '';
    return name
      .split(' ')
      .map((n) => n[0] || '')
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Generate a consistent gradient from the fallback string with premium colors
  const getGradient = (name: string) => {
    const gradients = [
      'from-indigo-600 to-cyan-500',
      'from-cyan-500 to-emerald-500',
      'from-indigo-500 to-cyan-600',
      'from-cyan-600 to-indigo-900',
      'from-emerald-400 to-cyan-600',
      'from-indigo-400 to-cyan-300',
      'from-cyan-500 to-indigo-700',
      'from-indigo-800 to-emerald-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div className="relative inline-flex shrink-0">
      <div
        onClick={onClick}
        className={cn(
          'relative inline-flex items-center justify-center overflow-hidden shrink-0 transition-all duration-300 shadow-glass-sm border border-glass-border-surface',
          onClick && 'cursor-pointer hover:opacity-90 active:scale-95 hover:shadow-glass-md',
          !src && `bg-gradient-to-br ${getGradient(fallback)} text-white`,
          src && 'bg-surface',
          sizes[size],
          className
        )}
      >
        {src ? (
          <img src={src} alt={alt || fallback} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="font-semibold tracking-wide drop-shadow-sm">{getInitials(fallback)}</span>
        )}
      </div>
      {showOnline && (
        <div 
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full bg-success border-2 border-background animate-scale-in glow-success animate-pulse-soft",
            onlineDotSizes[size]
          )} 
        />
      )}
    </div>
  );
};