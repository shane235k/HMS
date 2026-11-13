// apps/web/src/components/ui/Input.tsx
'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-normal uppercase tracking-wider text-charcoal-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full px-3.5 py-2.5 text-sm rounded-lg bg-white border border-charcoal-200 text-charcoal-900 placeholder-charcoal-400 transition-colors',
              'focus:outline-none focus:border-black focus:ring-2 focus:ring-black/15',
              error && 'border-red-400 focus:border-red-500 focus:ring-red-500/15',
              className
            )
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-charcoal-600">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

