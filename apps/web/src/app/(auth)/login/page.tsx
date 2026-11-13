// apps/web/src/app/(auth)/login/page.tsx
'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { apiFetch, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Role, AuthResponse } from '@hbms/shared';
import { ShieldCheck, Hotel, Users, User, Lock } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      login(res.tokens, res.user);

      // Route strictly based on assigned staff / admin role or returnUrl
      if (res.user.role === Role.PLATFORM_ADMIN) {
        router.push('/admin/dashboard');
      } else if (res.user.role === Role.HOTEL_MANAGER) {
        router.push('/manage/dashboard');
      } else if (res.user.role === Role.RECEPTIONIST) {
        router.push('/reception');
      } else if (res.user.role === Role.HOUSEKEEPING) {
        router.push('/housekeeping');
      } else if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        router.push(returnUrl);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  const isBookingReturn = returnUrl && (returnUrl.includes('/hotels') || returnUrl.includes('/checkout'));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas-neutral p-4 sm:p-6">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <span className="text-3xl font-normal tracking-tight text-neutral-900">
          Voyage.
        </span>
      </Link>

      <div className="w-full max-w-md space-y-6">
        {isBookingReturn && (
          <div className="p-3.5 bg-neutral-900 text-white rounded-2xl flex items-center gap-2.5 text-xs shadow-md">
            <Lock className="w-4 h-4 text-neutral-300 shrink-0" />
            <span>Please sign in to proceed with your room reservation and checkout.</span>
          </div>
        )}

        <Card className="rounded-2xl shadow-floating border-neutral-200">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-normal text-neutral-900">Sign in to your account</CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Access the guest portal, hotel property management, or administrative console.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-normal">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button type="submit" variant="primary" className="w-full rounded-full bg-black hover:bg-neutral-800 text-white font-normal py-2.5" isLoading={loading}>
                Sign In
              </Button>
            </form>

            <div className="text-center pt-2">
              <span className="text-xs text-neutral-500">Don't have an account yet? </span>
              <Link href={`/register${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`} className="text-xs font-normal text-black hover:underline">
                Register as Guest or Manager
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Demo Logins Helper */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-neutral-500">
            <span>Demo One-Click Credentials</span>
            <span className="text-[10px] bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded font-normal">
              Instant Fill
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setDemoCredentials('admin@hbms.com', 'Admin123!')}
              className="p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-left transition-colors flex items-center gap-2 group"
            >
              <ShieldCheck className="w-4 h-4 text-neutral-700 shrink-0" />
              <div className="truncate">
                <div className="font-normal text-neutral-900 group-hover:text-black">Platform Admin</div>
                <div className="text-[10px] text-neutral-400">admin@hbms.com</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDemoCredentials('manager.paris@grandluxe.com', 'Manager123!')}
              className="p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-left transition-colors flex items-center gap-2 group"
            >
              <Hotel className="w-4 h-4 text-neutral-700 shrink-0" />
              <div className="truncate">
                <div className="font-normal text-neutral-900 group-hover:text-black">Hotel Manager</div>
                <div className="text-[10px] text-neutral-400">Paris Grand Luxe</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDemoCredentials('receptionist.paris@grandluxe.com', 'Staff123!')}
              className="p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-left transition-colors flex items-center gap-2 group"
            >
              <Users className="w-4 h-4 text-neutral-700 shrink-0" />
              <div className="truncate">
                <div className="font-normal text-neutral-900 group-hover:text-black">Receptionist</div>
                <div className="text-[10px] text-neutral-400">Paris Front Desk</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDemoCredentials('guest.sophia@example.com', 'Guest123!')}
              className="p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-left transition-colors flex items-center gap-2 group"
            >
              <User className="w-4 h-4 text-neutral-700 shrink-0" />
              <div className="truncate">
                <div className="font-normal text-neutral-900 group-hover:text-black">Guest User</div>
                <div className="text-[10px] text-neutral-400">Sophia Martinez</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas-neutral" />}>
      <LoginForm />
    </Suspense>
  );
}
