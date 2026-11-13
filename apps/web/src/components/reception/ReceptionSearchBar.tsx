// apps/web/src/components/reception/ReceptionSearchBar.tsx
'use client';

import React from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ReceptionSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  onClear: () => void;
  loading?: boolean;
  totalResults?: number | null;
  isSearchActive?: boolean;
}

export function ReceptionSearchBar({
  value,
  onChange,
  onSearch,
  onClear,
  loading = false,
  totalResults = null,
  isSearchActive = false,
}: ReceptionSearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim()) {
        onSearch(value.trim());
      }
    } else if (e.key === 'Escape' && isSearchActive) {
      onClear();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-charcoal-200 p-4 shadow-sm space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search front desk by guest name, email, phone (+33...), or booking reference (e.g. RES-)..."
            className="w-full pl-10 pr-9 py-2.5 text-xs rounded-lg border border-charcoal-200 bg-canvas-neutral focus:bg-white focus:outline-none focus:border-black transition-colors font-normal placeholder:text-charcoal-400 text-charcoal-900"
          />
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-black p-1 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!value.trim() || loading}
          className="text-xs font-normal px-4 py-2.5 gap-1.5 shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Searching...</span>
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              <span>Search Bookings</span>
            </>
          )}
        </Button>
      </form>

      {/* Active Search Context Indicator */}
      {isSearchActive && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-charcoal-100 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-charcoal-700">
            <span className="font-medium text-black">Active Search:</span>
            <span className="px-2 py-0.5 rounded bg-neutral-100 font-mono text-neutral-800 border border-neutral-200 text-[11px]">
              &ldquo;{value}&rdquo;
            </span>
            {totalResults !== null && (
              <span className="text-charcoal-500 font-normal">
                ({totalResults} reservation{totalResults === 1 ? '' : 's'} found)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-charcoal-500 hover:text-black underline font-normal transition-colors text-left sm:text-right"
          >
            Clear and return to scheduled view
          </button>
        </div>
      )}
    </div>
  );
}

