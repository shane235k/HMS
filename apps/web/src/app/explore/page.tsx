// apps/web/src/app/explore/page.tsx
'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { GlobeMapDynamic } from '@/components/map/GlobeMapDynamic';

export default function ExploreGlobePage() {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black text-white select-none">
      {/* 1. Navbar with dark mode enabled (white text and links against dark translucent background) */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <Navbar dark={true} />
      </div>

      {/* 2. Full-screen 3D Globe with integrated floating HUD overlays */}
      <main className="w-full h-full absolute inset-0 z-0">
        <GlobeMapDynamic className="w-full h-full" />
      </main>
    </div>
  );
}
