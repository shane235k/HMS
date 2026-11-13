// apps/web/src/app/(auth)/register/page.tsx
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
import { User, Hotel, Lock } from 'lucide-react';
import { clsx } from 'clsx';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const { login } = useAuth();

  const [role, setRole] = useState<Role.GUEST | Role.HOTEL_MANAGER>(Role.GUEST);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          password,
          role,
        }),
      });

      login(res.tokens, res.user);

      if (role === Role.HOTEL_MANAGER) {
        router.push('/manage/dashboard');
      } else if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        router.push(returnUrl);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Registration failed. Please check your information.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isBookingReturn = returnUrl && (returnUrl.includes('/hotels') || returnUrl.includes('/checkout'));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas-neutral p-4 sm:p-6">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <span className="text-3xl font-normal tracking-tight text-neutral-900">
          Voyage.
        </span>
      </Link>

      <div className="w-full max-w-lg space-y-6">
        {isBookingReturn && (
          <div className="p-3.5 bg-neutral-900 text-white rounded-2xl flex items-center gap-2.5 text-xs shadow-md">
            <Lock className="w-4 h-4 text-neutral-300 shrink-0" />
            <span>Create your account to proceed with room reservation and instant checkout.</span>
          </div>
        )}

        <Card className="rounded-2xl shadow-floating border-neutral-200">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-normal text-neutral-900">Create your account</CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Select your account type to register on the platform.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-0">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-normal">
                {error}
              </div>
            )}

            {/* Role Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-neutral-100 border border-neutral-200">
              <button
                type="button"
                onClick={() => setRole(Role.GUEST)}
                className={clsx(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-normal transition-all',
                  role === Role.GUEST
                    ? 'bg-black text-white shadow-sm'
                    : 'text-neutral-600 hover:text-black'
                )}
              >
                <User className="w-4 h-4" />
                <span>Guest Traveler</span>
              </button>

              <button
                type="button"
                onClick={() => setRole(Role.HOTEL_MANAGER)}
                className={clsx(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-normal transition-all',
                  role === Role.HOTEL_MANAGER
                    ? 'bg-black text-white shadow-sm'
                    : 'text-neutral-600 hover:text-black'
                )}
              >
                <Hotel className="w-4 h-4" />
                <span>Hotel Manager</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  placeholder="e.g. John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <Input
                  label="Last Name"
                  placeholder="e.g. Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                placeholder="john.doe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Phone Number (Optional)"
                type="tel"
                placeholder="+1 555-0199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <Input
                label="Password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />

              <Button type="submit" variant="primary" className="w-full rounded-full bg-black hover:bg-neutral-800 text-white font-normal py-2.5 mt-2" isLoading={loading}>
                {role === Role.HOTEL_MANAGER ? 'Register as Hotel Manager' : 'Create Guest Account'}
              </Button>
            </form>

            <div className="text-center pt-2">
              <span className="text-xs text-neutral-500">Already registered? </span>
              <Link href={`/login${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`} className="text-xs font-normal text-black hover:underline">
                Sign in here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas-neutral" />}>
      <RegisterForm />
    </Suspense>
  );
}
