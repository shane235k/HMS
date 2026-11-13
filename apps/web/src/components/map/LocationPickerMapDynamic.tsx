// apps/web/src/components/map/LocationPickerMapDynamic.tsx
'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { MapPin } from 'lucide-react';
import type { LocationPickerMapProps } from './LocationPickerMap';

function LocationPickerSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`w-full h-[320px] rounded-2xl border border-neutral-300 bg-neutral-100 flex flex-col items-center justify-center p-6 text-neutral-500 font-mono text-xs ${className}`}
    >
      <div className="flex flex-col items-center space-y-3 text-center">
        <div className="w-10 h-10 rounded-full border border-neutral-300 border-t-black animate-spin flex items-center justify-center">
          <MapPin className="w-4 h-4 text-neutral-600" />
        </div>
        <p className="text-xs text-neutral-600 font-normal">Loading interactive location picker...</p>
      </div>
    </div>
  );
}

export const LocationPickerMapDynamic = dynamic<LocationPickerMapProps>(
  () => import('./LocationPickerMap'),
  {
    ssr: false,
    loading: () => <LocationPickerSkeleton />,
  }
);

