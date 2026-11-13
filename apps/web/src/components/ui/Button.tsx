// apps/web/src/components/ui/Button.tsx
'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-normal transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-black/20 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-black hover:bg-neutral-800 text-white shadow-sm active:scale-[0.98]',
    secondary: 'bg-canvas-neutral hover:bg-white text-charcoal-900 border border-charcoal-200 active:scale-[0.98]',
    outline: 'bg-transparent border border-black text-black hover:bg-neutral-100 active:scale-[0.98]',
    ghost: 'bg-transparent text-charcoal-600 hover:bg-canvas-neutral hover:text-charcoal-900',
    danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
    destructive: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 rounded-lg h-8',
    md: 'text-sm px-4 py-2 rounded-lg h-10',
    lg: 'text-base px-6 py-2.5 rounded-xl h-12',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

