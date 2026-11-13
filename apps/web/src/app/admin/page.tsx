// apps/web/src/app/admin/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-canvas-neutral flex items-center justify-center text-xs text-charcoal-400 font-normal">
      Redirecting to Executive Dashboard...
    </div>
  );
}

