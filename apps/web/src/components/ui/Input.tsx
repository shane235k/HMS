// apps/web/src/components/ui/Input.tsx
'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, showPasswordToggle = true, className, id, type, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const isPassword = type === 'password';
    const [showPassword, setShowPassword] = useState(false);

    const actualType = isPassword ? (showPassword ? 'text' : 'password') : type;
    const canTogglePassword = isPassword && showPasswordToggle;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-normal uppercase tracking-wider text-charcoal-700">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={actualType}
            className={twMerge(
              clsx(
                'w-full px-3.5 py-2.5 text-sm rounded-lg bg-white border border-charcoal-200 text-charcoal-900 placeholder-charcoal-400 transition-colors',
                'focus:outline-none focus:border-black focus:ring-2 focus:ring-black/15',
                canTogglePassword && 'pr-10',
                error && 'border-red-400 focus:border-red-500 focus:ring-red-500/15',
                className
              )
            )}
            {...props}
          />
          {canTogglePassword && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-black focus:outline-none transition-colors p-1 rounded-md"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-charcoal-600">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
