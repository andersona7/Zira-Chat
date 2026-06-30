import React, { useState } from 'react';
import { cn } from '@zira/utils';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type, ...props }, ref) => {
    const uniqueId = React.useId();
    const inputId = id || uniqueId;
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={isPassword && showPassword ? 'text' : type}
            className={cn(
              "flex h-12 w-full rounded-xl bg-composer px-4.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted/40 transition-all duration-300 neo-in-sm",
              "focus:outline-none focus:ring-2 focus:ring-secondary/20",
              "disabled:cursor-not-allowed disabled:opacity-30",
              error && "border-error focus:ring-error focus:border-error",
              isPassword && "pr-12",
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors duration-200 p-1"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-2 text-xs font-medium text-error flex items-center gap-1.5 animate-fade-in">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';