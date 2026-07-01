import React from 'react';
import { cn } from '@zira/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  label: string; // Required for accessibility
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.9 }}
        aria-label={label}
        title={label}
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-[0.625rem] text-text-secondary hover:bg-glass-bg-elevated hover:text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 hover:border-glass-border-elevated border border-transparent shadow-glass-sm',
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

IconButton.displayName = 'IconButton';
