// apps/web/src/app/checkout/[code]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import {
  CreditCard,
  ShieldCheck,
  Timer,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  Info,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const reservationCode = params.code as string;

  const [reservation, setReservation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Countdown timer
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const { user, loading: authLoading } = useAuth();

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/checkout/${reservationCode}`)}`);
    }
  }, [authLoading, user, reservationCode, router]);

  // Payment form state
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expDate, setExpDate] = useState('12/28');
  const [cvv, setCvv] = useState('123');

  // Submitting state
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReservation() {
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await apiFetch<any>(`/reservations/${reservationCode}`);
        setReservation(data);

        // Autofill account holder / guest name
        if (data.guest_name && !cardholderName) {
          setCardholderName(data.guest_name);
        } else if (user && !cardholderName) {
          const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          if (userFullName) setCardholderName(userFullName);
        }

        // Calculate initial remaining seconds from hold_expires_at
        if (data.hold_expires_at) {
          const diffMs = new Date(data.hold_expires_at).getTime() - Date.now();
          setRemainingSeconds(Math.max(0, Math.floor(diffMs / 1000)));
        } else if (data.status === 'CONFIRMED') {
          // Already confirmed, redirect to confirmation
          router.push(`/checkout/confirmation/${data.reservation_code}`);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load booking hold');
      } finally {
        setLoading(false);
      }
    }
    loadReservation();
  }, [reservationCode, router, user, authLoading]);

  // Sync user name if available and cardholderName is empty
  useEffect(() => {
    if (user && !cardholderName) {
      const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      if (userFullName) setCardholderName(userFullName);
    }
  }, [user, cardholderName]);

  // Timer interval
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSeconds]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservation) return;

    const cleanCard = cardNumber.replace(/\D/g, '');
    if (cleanCard.length < 13 || cleanCard.length > 19) {
      setPaymentError('Please enter a valid card number with 13 to 19 digits.');
      return;
    }

    if (!cardholderName.trim()) {
      setPaymentError('Please enter the name on the card.');
      return;
    }

    if (!/^\d{1,2}\/\d{2}$/.test(expDate.trim())) {
      setPaymentError('Please enter a valid expiry date in MM/YY format.');
      return;
    }

    if (cvv.trim().length < 3) {
      setPaymentError('Please enter a valid 3 or 4-digit CVV / CVC code.');
      return;
    }

    try {
      setPaying(true);
      setPaymentError(null);

      // Parse expMonth and expYear
      const [m, y] = expDate.split('/');
      const expMonth = parseInt(m, 10) || 12;
      const fullYear = y && y.length === 2 ? parseInt(`20${y}`, 10) : 2028;

      const idempotencyKey = `PAY-${reservation.id}-${Date.now()}`;

      const result = await apiFetch<any>(`/reservations/${reservation.id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey,
          paymentMethod: 'CARD',
          cardDetails: {
            cardNumber: cleanCard,
            cardholderName: cardholderName.trim(),
            expMonth,
            expYear: fullYear,
            cvv: cvv.trim(),
          },
        }),
      });

      if (result.reservation?.reservation_code) {
        router.push(`/checkout/confirmation/${result.reservation.reservation_code}`);
      } else {
        router.push(`/checkout/confirmation/${reservation.reservation_code}`);
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Payment processing failed. Please verify your details.');
    } finally {
      setPaying(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas-white">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto px-4 py-20 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-normal text-charcoal-900">Sign in to complete booking</h1>
          <p className="text-xs text-charcoal-600 font-light">
            You must be logged in to confirm and complete payment for this reservation.
          </p>
          <Link href={`/login?returnUrl=${encodeURIComponent(`/checkout/${reservationCode}`)}`}>
            <Button variant="primary" className="rounded-full px-6 py-2.5 bg-black hover:bg-neutral-800 text-white font-normal text-xs mt-2">
              Sign In to Continue
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas-white">
        <Navbar />
        <main className="flex-1 max-w-5xl mx-auto px-4 py-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-black animate-spin" />
            <p className="text-sm font-normal text-charcoal-600">Loading checkout session...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas-white">
        <Navbar />
        <main className="flex-1 max-w-lg mx-auto px-4 py-16 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-normal text-charcoal-900">Hold Not Found or Inaccessible</h1>
          <p className="text-xs text-charcoal-600">{error || 'This booking session may have expired.'}</p>
          <Link href="/">
            <Button variant="primary" className="rounded-xl mt-4">
              Search New Stays
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const isHoldExpired = remainingSeconds !== null && remainingSeconds <= 0;

  return (
    <div className="min-h-screen flex flex-col bg-canvas-white">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-charcoal-200 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-charcoal-500 font-mono mb-1">
              <span>Checkout</span>
              <span>&bull;</span>
              <span className="text-black font-normal">{reservation.reservation_code}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-normal text-charcoal-900">
              Secure Booking Checkout
            </h1>
          </div>

          {/* Active Hold Countdown Badge */}
          {remainingSeconds !== null && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-mono font-normal ${
                isHoldExpired
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : remainingSeconds < 180
                  ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                  : 'bg-neutral-100 text-neutral-800 border-neutral-300'
              }`}
            >
              <Timer className="w-4 h-4" />
              <span>
                {isHoldExpired ? 'HOLD EXPIRED' : `Hold Window: ${formatTimer(remainingSeconds)}`}
              </span>
            </div>
          )}
        </div>

        {/* Expired Alert */}
        {isHoldExpired && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-900">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-normal text-sm">Your 15-Minute Inventory Hold Has Expired</h4>
              <p className="text-xs text-red-700">
                To guarantee room integrity and prevent overselling, temporary holds expire after 15 minutes. Please return to hotel availability to create a new hold.
              </p>
              <div className="pt-2">
                <Link href={`/hotels/${reservation.hotel_id}`}>
                  <Button variant="outline" size="sm" className="bg-white">
                    Check Current Availability
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Checkout Layout (Reference: g4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Payment Form & Test Card Selectors (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-charcoal-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-charcoal-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-black" />
                    <CardTitle className="text-base font-normal">Payment Details</CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-800 bg-neutral-100 px-2.5 py-1 rounded-full border border-neutral-300 font-normal">
                    <Lock className="w-3.5 h-3.5" />
                    <span>256-Bit SSL Encrypted</span>
                  </div>
                </div>
                <CardDescription className="text-xs font-light">
                  Simulated sandbox transaction. Authoritative backend validation with atomic inventory lock.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-5 space-y-5">
                {paymentError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-normal">{paymentError}</p>
                      <p className="text-[11px] text-red-600">
                        Your hold is still active. Please check the card details and retry before the timer runs out.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handlePayment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-normal text-charcoal-700 uppercase tracking-wider mb-1">
                      Name on Card
                    </label>
                    <Input
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      placeholder="e.g. Cardholder Full Name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-normal text-charcoal-700 uppercase tracking-wider mb-1">
                      Card Number
                    </label>
                    <div className="relative">
                      <Input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4242 4242 4242 4242"
                        className="font-mono"
                        required
                      />
                      <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-charcoal-100 text-charcoal-600">
                          VISA
                        </span>
                        <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-charcoal-100 text-charcoal-600">
                          MC
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-normal text-charcoal-700 uppercase tracking-wider mb-1">
                        Expiry Date
                      </label>
                      <Input
                        value={expDate}
                        onChange={(e) => setExpDate(e.target.value)}
                        placeholder="MM/YY"
                        className="font-mono text-center"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-normal text-charcoal-700 uppercase tracking-wider mb-1">
                        CVV / CVC
                      </label>
                      <Input
                        type="password"
                        maxLength={4}
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        placeholder="123"
                        className="font-mono text-center"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={paying}
                    disabled={isHoldExpired}
                    className="w-full rounded-xl gap-2 font-normal shadow-md mt-4"
                  >
                    <Lock className="w-4 h-4" />
                    <span>
                      Pay ₹{(reservation.total_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} & Confirm
                    </span>
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Platform Guarantee Badge */}
            <div className="p-4 rounded-2xl bg-canvas-neutral border border-charcoal-200 flex items-start gap-3 text-xs text-charcoal-600">
              <ShieldCheck className="w-5 h-5 text-black shrink-0 mt-0.5" />
              <div>
                <h4 className="font-normal text-charcoal-900 mb-0.5">Authoritative ACID Guarantee</h4>
                <p className="leading-relaxed font-light">
                  Confirmation executes within an atomic multi-document transaction with target-fingerprinted idempotency. Duplicate requests cannot charge or confirm twice.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Reservation & Price Summary (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-charcoal-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-canvas-neutral/80 border-b border-charcoal-200 pb-4">
                <Badge variant="primary" className="w-fit mb-2">
                  Stay Summary
                </Badge>
                <CardTitle className="text-lg font-serif font-normal">{reservation.hotel?.name}</CardTitle>
                <div className="flex items-center gap-1.5 text-xs text-charcoal-600 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                  <span className="font-normal">
                    {reservation.hotel?.city}, {reservation.hotel?.country}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Stay Dates */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-canvas-neutral rounded-xl border border-charcoal-200 text-xs">
                  <div>
                    <span className="text-[10px] text-charcoal-500 font-mono block">CHECK-IN</span>
                    <span className="font-normal text-charcoal-900">
                      {new Date(reservation.check_in_date).toISOString().split('T')[0]}
                    </span>
                    <span className="text-[10px] text-charcoal-500 block">
                      From {reservation.hotel?.check_in_time || '14:00'}
                    </span>
                  </div>
                  <div className="border-l border-charcoal-200 pl-3">
                    <span className="text-[10px] text-charcoal-500 font-mono block">CHECK-OUT</span>
                    <span className="font-normal text-charcoal-900">
                      {new Date(reservation.check_out_date).toISOString().split('T')[0]}
                    </span>
                    <span className="text-[10px] text-charcoal-500 block">
                      Until {reservation.hotel?.check_out_time || '11:00'}
                    </span>
                  </div>
                </div>

                {/* Rooms Line Items */}
                <div className="space-y-3">
                  <h4 className="text-xs font-normal text-charcoal-700 uppercase tracking-wider">
                    Reserved Accommodation
                  </h4>
                  {reservation.rooms?.map((rm: any) => (
                    <div
                      key={rm.id}
                      className="p-3 rounded-xl border border-charcoal-200 space-y-1.5 text-xs bg-white"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-normal text-charcoal-900">
                          {rm.room_type?.name} (x{rm.quantity})
                        </span>
                        <span className="font-mono font-normal text-charcoal-900">
                          ₹{(rm.total_price_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-charcoal-500">
                        <span>Rate Plan: {rm.rate_plan?.name}</span>
                        <span>&bull;</span>
                        <span className="text-emerald-700 font-normal">Free Cancellation (48h)</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Guest Info */}
                <div className="space-y-1.5 pt-2 border-t border-charcoal-200 text-xs">
                  <div className="flex justify-between">
                    <span className="text-charcoal-500 font-normal">Primary Guest:</span>
                    <span className="font-normal text-charcoal-900">{reservation.guest_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-500 font-normal">Contact Email:</span>
                    <span className="font-mono text-charcoal-700 font-normal">{reservation.guest_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-500 font-normal">Phone:</span>
                    <span className="text-charcoal-700 font-normal">{reservation.guest_phone}</span>
                  </div>
                </div>

                {/* Itemized Financial Breakdown */}
                <div className="pt-3 border-t border-charcoal-200 space-y-2 text-xs">
                  <div className="flex justify-between text-charcoal-600 font-normal">
                    <span>Room Accommodation Subtotal:</span>
                    <span className="font-mono font-normal">
                      ₹{(reservation.subtotal_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-charcoal-600 font-normal">
                    <span>Estimated Taxes & Tourism Levies:</span>
                    <span className="font-mono font-normal">
                      ₹{(reservation.tax_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {reservation.fees_cents > 0 && (
                    <div className="flex justify-between text-charcoal-600 font-normal">
                      <span>Service & Resort Fees:</span>
                      <span className="font-mono font-normal">
                        ₹{(reservation.fees_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2 border-t border-charcoal-200 text-sm font-normal text-charcoal-900">
                    <span className="font-normal">Total Due Now:</span>
                    <span className="text-lg font-serif text-black font-normal">
                      ₹{(reservation.total_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

