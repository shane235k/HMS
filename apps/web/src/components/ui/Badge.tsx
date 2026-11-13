// apps/web/src/components/ui/Badge.tsx
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'ready'
  | 'occupied'
  | 'dirty'
  | 'cleaning'
  | 'inspection'
  | 'maintenance'
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'success'
  | 'danger'
  | 'warning'
  | 'neutral';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-charcoal-100 text-charcoal-700 border-charcoal-200',
    primary: 'bg-neutral-900 text-white border-black',
    ready: 'bg-status-ready-bg text-status-ready border-status-ready-border',
    occupied: 'bg-status-occupied-bg text-status-occupied border-status-occupied-border',
    dirty: 'bg-status-dirty-bg text-status-dirty border-status-dirty-border',
    cleaning: 'bg-status-cleaning-bg text-status-cleaning border-status-cleaning-border',
    inspection: 'bg-neutral-100 text-neutral-800 border-neutral-300',
    maintenance: 'bg-status-maintenance-bg text-status-maintenance border-status-maintenance-border',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    neutral: 'bg-charcoal-100 text-charcoal-700 border-charcoal-200',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-normal border tracking-wide uppercase',
          variants[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
};

