// apps/web/src/app/manage/register-property/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { RegisterPropertyView } from '@/components/dashboard/RegisterPropertyView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, ShieldAlert, Building2, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { ApplicationStatus, Role } from '@hbms/shared';

export default function RegisterPropertyPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [checking, setChecking] = useState(true);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [existingPropertyName, setExistingPropertyName] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/auth/login?redirect=/manage/register-property');
      return;
    }

    if (user.role !== Role.HOTEL_MANAGER && user.role !== Role.PLATFORM_ADMIN) {
      router.replace('/manage/dashboard');
      return;
    }

    // Check if manager already has a registered property or active application
    if (user.hotelId) {
      setAlreadyRegistered(true);
      setChecking(false);
      return;
    }

    // Verify against API
    Promise.allSettled([
      apiFetch<any>('/management/property'),
      apiFetch<any>('/applications/my'),
    ]).then(([hotelRes, appRes]) => {
      const hotel = hotelRes.status === 'fulfilled' ? hotelRes.value : null;
      const app = appRes.status === 'fulfilled' ? appRes.value : null;

      if (hotel) {
        setAlreadyRegistered(true);
        setExistingPropertyName(hotel.name);
      } else if (app && app.status !== ApplicationStatus.REJECTED) {
        setAlreadyRegistered(true);
        setExistingPropertyName(app.hotelName || app.hotel_name || 'Active Application');
      } else {
        setAlreadyRegistered(false);
      }
    }).catch(() => {
      setAlreadyRegistered(false);
    }).finally(() => {
      setChecking(false);
    });
  }, [user, authLoading, router]);

  return (
    <div className="flex min-h-screen bg-canvas-neutral">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-charcoal-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-normal text-charcoal-900 leading-tight">
              Property Registration Dossier
            </h1>
            {alreadyRegistered && (
              <Badge variant="neutral" className="text-[11px] font-mono font-normal">
                Single Property Limit
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/manage/dashboard')}
            className="gap-1.5 text-xs font-normal"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Button>
        </header>

        <main className="p-6 space-y-6 max-w-[1600px] w-full">
          {checking ? (
            <div className="h-64 rounded-2xl bg-white border border-charcoal-200 animate-pulse flex items-center justify-center text-xs text-charcoal-400 font-normal">
              Verifying manager registration credentials...
            </div>
          ) : alreadyRegistered ? (
            <div className="max-w-xl mx-auto pt-10">
              <Card className="p-8 bg-white border-charcoal-200 text-center space-y-5 shadow-sm rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-800">
                  <Building2 className="w-7 h-7" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-lg font-normal text-charcoal-900">
                    Property Already Registered
                  </h2>
                  <p className="text-xs text-charcoal-500 font-normal leading-relaxed max-w-md mx-auto">
                    You are already designated as the manager of{' '}
                    <span className="font-mono text-charcoal-900">
                      {existingPropertyName || 'an active property'}
                    </span>
                    . In accordance with system platform rules, each hotel manager can register and oversee at most one property.
                  </p>
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => router.push('/manage/dashboard')}
                    className="gap-1.5 text-xs font-normal"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Property Console</span>
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <RegisterPropertyView
              onCancel={() => router.push('/manage/dashboard')}
              onSuccess={async () => {
                await refreshUser();
                router.push('/manage/dashboard');
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
