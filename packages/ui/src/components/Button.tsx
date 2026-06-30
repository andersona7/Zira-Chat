import React from 'react';
import { cn } from '@zira/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'neo-btn inline-flex items-center justify-center font-medium disabled:opacity-30 disabled:pointer-events-none tracking-tight select-none';
    
    const variants = {
      primary: 'neo-btn-primary focus:ring-secondary',
      secondary: 'neo-btn-secondary focus:ring-secondary',
      ghost: 'neo-btn-ghost focus:ring-secondary',
      danger: 'neo-btn-danger focus:ring-error',
    };

    const sizes = {
      sm: 'h-9 px-4 text-xs gap-2 rounded-lg',
      md: 'h-11 px-5.5 py-2.5 gap-2.5 rounded-xl',
      lg: 'h-13 px-7 text-sm gap-3 rounded-2xl',
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current animate-pulse-soft" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : null}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';