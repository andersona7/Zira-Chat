import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@zira/utils';

export interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, className }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      className={cn(
        "relative inline-flex h-6.5 w-12 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-background",
        enabled ? "bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-[0_2px_10px_rgba(6,182,212,0.3)]" : "bg-glass-bg-elevated/40 border border-glass-border-elevated",
        className
      )}
      onClick={() => onChange(!enabled)}
    >
      <span className="sr-only">Toggle setting</span>
      <motion.span
        animate={{ x: enabled ? 22 : 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 32 }}
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 self-center m-0.5"
      />
    </button>
  );
};