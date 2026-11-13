// apps/web/src/components/map/GlobeMapDynamic.tsx
'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Globe } from 'lucide-react';

function GlobeSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`fixed inset-0 w-full h-full bg-black flex flex-col items-center justify-center p-8 text-white z-10 ${className}`}
    >
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-neutral-800 border-t-white animate-spin flex items-center justify-center">
            <Globe className="w-8 h-8 text-neutral-400" />
          </div>
        </div>
        <div className="space-y-1">
          <h4 className="text-lg font-normal text-white tracking-wide">
            Voyage Planetary Explorer
          </h4>
          <p className="text-xs text-neutral-400 font-normal">
            Loading interactive 3D globe and verified hotel coordinates...
          </p>
        </div>
      </div>
    </div>
  );
}

export const GlobeMapDynamic = dynamic(() => import('./GlobeMap'), {
  ssr: false,
  loading: () => <GlobeSkeleton />,
});
