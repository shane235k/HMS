// apps/web/src/app/reservations/[id]/cancel/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import {
  Hourglass,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Calendar,
  MapPin,
  CreditCard,
  Building,
  RefreshCw,
  ShieldAlert,
  Info,
  XCircle,
  ChevronRight,
} from 'lucide-react';

export default function DedicatedRefundPage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [preview, setPreview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation form
  const [reason, setReason] = useState('Change of personal travel plans');
  const [customNotes, setCustomNotes] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Success state after cancellation
  const [cancellationResult, setCancellationResult] = useState<any | null>(null);

  // Dynamic live countdown
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/reservations/${reservationId}/cancel`);
      return;
    }

    async function loadPreview() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<any>(`/reservations/${reservationId}/cancellation-preview`);
        setPreview(data);
        if (data.timeRemainingMs !== undefined) {
          setRemainingMs(data.timeRemainingMs);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve cancellation terms and refund preview');
      } finally {
        setLoading(false);
      }
    }

    if (user && reservationId) {
      loadPreview();
    }
  }, [reservationId, user, authLoading, router]);

  // Live countdown timer ticking down
  useEffect(() => {
    if (remainingMs === null || remainingMs <= 0) return;
    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        if (prev === null || prev <= 1000) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingMs]);

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return 'Window Closed';
    const totalSecs = Math.floor(ms / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${mins}m left`;
    }
    return `${hours}h ${mins}m ${secs}s left`;
  };

  const handleExecuteCancel = async () => {
    if (!preview) return;
    try {
      setCancelling(true);
      setCancelError(null);

      const combinedReason = customNotes.trim()
        ? `${reason}: ${customNotes.trim()}`
        : reason;

      const result = await apiFetch<any>(`/reservations/${reservationId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          reason: combinedReason,
        }),
      });

      setCancellationResult(result);
    } catch (err: any) {
      setCancelError(err.message || 'Failed to complete cancellation. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas-white">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-charcoal-500 font-normal">
          <Link href="/reservations" className="hover:text-black transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>My Bookings</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-charcoal-300" />
          <span className="text-charcoal-800">Cancellation & Refund Breakdown</span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-black animate-spin mx-auto" />
            <p className="text-sm font-normal text-charcoal-600">
              Calculating itemized charges, fee deductions, and refund eligibility...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-6 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
              <h2 className="text-base font-normal text-red-900">Unable to Load Cancellation Preview</h2>
              <p className="text-xs font-normal text-red-700 max-w-md mx-auto">{error}</p>
              <div className="pt-2">
                <Link href="/reservations">
                  <Button variant="outline" size="sm" className="font-normal">
                    Return to My Bookings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Post-Cancellation Confirmation Screen */}
        {cancellationResult && (
          <Card className="border-charcoal-200 shadow-card overflow-hidden">
            <div className="bg-canvas-neutral p-6 sm:p-8 text-center space-y-4 border-b border-charcoal-200">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-charcoal-500 block mb-1">
                  Cancellation Confirmed
                </span>
                <h1 className="text-2xl font-serif font-normal text-black">
                  Reservation Cancelled & Refund Initiated
                </h1>
                <p className="text-xs text-charcoal-600 mt-1 max-w-md mx-auto font-normal">
                  Your reservation #{preview?.reservationCode} at {preview?.hotelName} has been officially cancelled.
                </p>
              </div>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-canvas-neutral border border-charcoal-200 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-charcoal-400 block">Refund Amount</span>
                  <p className="text-lg font-serif font-normal text-black">
                    ₹{((cancellationResult.cancellation?.eligible_refund_cents || 0) / 100).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-normal">
                    {cancellationResult.cancellation?.eligible_refund_cents === preview?.totalPaidCents
                      ? '100% Full Refund (Zero fee deduction)'
                      : 'Net Refund after cancellation fee'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-canvas-neutral border border-charcoal-200 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-charcoal-400 block">Refund Reference</span>
                  <p className="text-sm font-mono font-normal text-black">
                    {cancellationResult.cancellation?.refund?.refund_reference || 'REF-PENDING'}
                  </p>
                  <p className="text-[11px] text-charcoal-500 font-normal">
                    Status: {cancellationResult.cancellation?.refund?.status || 'PROCESSED'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-canvas-neutral border border-charcoal-200 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-charcoal-400 block">Payment Method</span>
                  <p className="text-sm font-normal text-black">Original Payment Card</p>
                  <p className="text-[11px] text-charcoal-500 font-normal">Processed directly back to card</p>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <Link href="/reservations">
                  <Button variant="primary" className="font-normal rounded-xl px-6">
                    Back to My Bookings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancellation Preview & Itemized Refund Breakdown Form */}
        {preview && !loading && !cancellationResult && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-charcoal-200 pb-5">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-black font-normal block mb-1">
                  Booking Refund Review
                </span>
                <h1 className="text-2xl sm:text-3xl font-serif font-normal text-charcoal-900">
                  Cancel Reservation #{preview.reservationCode}
                </h1>
                <p className="text-xs text-charcoal-600 mt-1 font-normal">
                  Review itemized fees, cancellation timeline, and eligible net refund before confirming.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    preview.hasReachedCheckIn
                      ? 'rejected'
                      : preview.isBeforeDeadline
                      ? 'ready'
                      : 'pending'
                  }
                >
                  {preview.hasReachedCheckIn
                    ? 'CHECK-IN REACHED'
                    : preview.isBeforeDeadline
                    ? '100% REFUND WINDOW'
                    : 'LATE CANCELLATION'}
                </Badge>
              </div>
            </div>

            {/* Alert for Check-In Reached */}
            {preview.hasReachedCheckIn && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-800">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-normal">Check-in date has arrived</p>
                  <p className="text-red-700 font-normal">
                    Per hotel policy, reservations cannot be cancelled online on or after the scheduled check-in date.
                    Please contact the front desk directly for assistance.
                  </p>
                </div>
              </div>
            )}

            {/* Main 2-Column Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Stay Overview & Cancellation Reason */}
              <div className="lg:col-span-7 space-y-6">
                {/* Stay Overview */}
                <Card className="border-charcoal-200 shadow-card">
                  <CardHeader className="p-5 border-b border-charcoal-200 bg-canvas-neutral/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-serif text-base">
                        {preview.hotelName?.[0] || 'H'}
                      </div>
                      <div>
                        <CardTitle className="text-base font-normal text-charcoal-900">
                          {preview.hotelName}
                        </CardTitle>
                        <CardDescription className="text-xs text-charcoal-500 font-normal flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                          <span>{preview.hotelAddress || 'Property Location'}</span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-canvas-neutral border border-charcoal-200">
                      <div>
                        <span className="text-[10px] font-mono text-charcoal-400 uppercase block">Check-In</span>
                        <p className="font-normal text-charcoal-900 mt-0.5">
                          {new Date(preview.checkInDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-charcoal-400 uppercase block">Check-Out</span>
                        <p className="font-normal text-charcoal-900 mt-0.5">
                          {new Date(preview.checkOutDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-mono uppercase text-charcoal-400 block">
                        Reserved Accommodations
                      </span>
                      {preview.rooms?.map((rm: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-charcoal-800">
                          <span>
                            {rm.name || 'Room'} (x{rm.quantity})
                          </span>
                          <span className="font-mono text-charcoal-600">
                            ₹{((rm.subtotalCents || 0) / 100).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-charcoal-200 flex justify-between items-center text-charcoal-600">
                      <span>Primary Guest</span>
                      <span className="font-normal text-charcoal-900">
                        {preview.guestName} ({preview.guestEmail})
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Reason for Cancellation Form */}
                {!preview.hasReachedCheckIn && (
                  <Card className="border-charcoal-200 shadow-card">
                    <CardHeader className="p-5 border-b border-charcoal-200">
                      <CardTitle className="text-sm font-normal text-charcoal-900">
                        Reason for Cancellation
                      </CardTitle>
                      <CardDescription className="text-xs text-charcoal-500 font-normal">
                        Help us understand your reason for cancelling. Your feedback helps properties improve.
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4 text-xs">
                      <div className="space-y-2">
                        {[
                          'Change of personal travel plans',
                          'Found alternative accommodation',
                          'Dates booked by mistake',
                          'Personal or medical emergency',
                          'Flight or transport cancellation',
                          'Other reason',
                        ].map((option) => (
                          <label
                            key={option}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-charcoal-200 hover:bg-canvas-neutral cursor-pointer transition-colors"
                          >
                            <input
                              type="radio"
                              name="cancelReason"
                              value={option}
                              checked={reason === option}
                              onChange={(e) => setReason(e.target.value)}
                              className="w-3.5 h-3.5 text-black border-charcoal-300 focus:ring-0"
                            />
                            <span className="text-charcoal-800 font-normal">{option}</span>
                          </label>
                        ))}
                      </div>

                      <div className="pt-2">
                        <label className="text-[11px] font-normal text-charcoal-600 block mb-1">
                          Additional details (optional)
                        </label>
                        <textarea
                          rows={2}
                          value={customNotes}
                          onChange={(e) => setCustomNotes(e.target.value)}
                          placeholder="Provide any additional context regarding your cancellation..."
                          className="w-full p-2.5 text-xs rounded-xl border border-charcoal-200 bg-canvas-white focus:outline-none focus:border-black font-normal"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column (5 cols): Itemized Financial Breakdown & Actions */}
              <div className="lg:col-span-5 space-y-6">
                {/* Cancellation Deadline & Sandglass Countdown Card */}
                <Card className="border-charcoal-200 shadow-card">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-black shrink-0">
                        <Hourglass className="w-4 h-4 text-black animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal-400 block font-normal">
                          Cancellation Deadline Window
                        </span>
                        <p className="text-xs font-normal text-charcoal-900">
                          {preview.hasReachedCheckIn
                            ? 'Cutoff reached on check-in date'
                            : `Cutoff: ${new Date(preview.cutoffTime).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`}
                        </p>
                      </div>
                    </div>

                    {!preview.hasReachedCheckIn && remainingMs !== null && (
                      <div className="p-3 rounded-xl bg-canvas-neutral border border-charcoal-200 flex items-center justify-between text-xs">
                        <span className="text-charcoal-500 font-normal flex items-center gap-1.5">
                          <Hourglass className="w-3.5 h-3.5 text-charcoal-600" />
                          Time Remaining:
                        </span>
                        <span className="font-mono text-black font-normal">
                          {formatCountdown(remainingMs)}
                        </span>
                      </div>
                    )}

                    <p className="text-[11px] text-charcoal-500 font-normal leading-relaxed">
                      {preview.message}
                    </p>
                  </CardContent>
                </Card>

                {/* Complete Itemized Charge Breakdown */}
                <Card className="border-charcoal-200 shadow-card">
                  <CardHeader className="p-5 border-b border-charcoal-200 bg-canvas-neutral/50">
                    <CardTitle className="text-sm font-normal text-charcoal-900">
                      Itemized Charge Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs text-charcoal-500 font-normal">
                      Full breakdown of all charged components and refund credits.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5 space-y-3.5 text-xs">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center text-charcoal-700">
                      <span>Room Charges Subtotal</span>
                      <span className="font-mono text-charcoal-900">
                        ₹{(preview.subtotalCents / 100).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    {/* Taxes */}
                    <div className="flex justify-between items-center text-charcoal-700">
                      <span>Taxes & GST (12%)</span>
                      <span className="font-mono text-charcoal-900">
                        ₹{(preview.taxCents / 100).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    {/* Fees */}
                    <div className="flex justify-between items-center text-charcoal-700">
                      <span>Platform & Service Fees</span>
                      <span className="font-mono text-charcoal-900">
                        ₹{(preview.feesCents / 100).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    {/* Total Paid */}
                    <div className="pt-2 border-t border-charcoal-200 flex justify-between items-center font-normal text-charcoal-900">
                      <span>Total Amount Paid</span>
                      <span className="font-mono font-normal">
                        ₹{(preview.totalPaidCents / 100).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    {/* Cancellation Fee / Deductions */}
                    <div className="flex justify-between items-center pt-2 border-t border-charcoal-200">
                      <div className="space-y-0.5">
                        <span className="text-charcoal-700 font-normal block">Cancellation Fee Deducted</span>
                        <span className="text-[10px] text-charcoal-400 block">
                          {preview.cancellationFeeCents === 0
                            ? 'Zero penalty within free window'
                            : 'First night charge retained'}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-normal ${
                          preview.cancellationFeeCents === 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {preview.cancellationFeeCents === 0
                          ? '₹0.00'
                          : `- ₹${(preview.cancellationFeeCents / 100).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`}
                      </span>
                    </div>

                    {/* Net Refund Amount Highlight */}
                    <div className="p-4 rounded-xl bg-canvas-neutral border border-charcoal-200 space-y-1 pt-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-normal text-charcoal-700 uppercase tracking-wider font-mono">
                          Net Refund Due
                        </span>
                        <span className="text-xl font-serif font-normal text-black">
                          ₹{(preview.eligibleRefundCents / 100).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <p className="text-[10px] text-charcoal-500 font-normal">
                        Credited back to original payment card immediately.
                      </p>
                    </div>

                    {/* Cancel Error Banner */}
                    {cancelError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                        {cancelError}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-3 space-y-2">
                      <Button
                        variant="destructive"
                        className="w-full font-normal rounded-xl py-2.5"
                        disabled={preview.hasReachedCheckIn || !preview.canCancel || cancelling}
                        isLoading={cancelling}
                        onClick={handleExecuteCancel}
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        <span>
                          {preview.hasReachedCheckIn
                            ? 'Cancellation Closed'
                            : `Confirm Cancellation & Refund ₹${(preview.eligibleRefundCents / 100).toLocaleString(
                                'en-IN',
                                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                              )}`}
                        </span>
                      </Button>

                      <Link href="/reservations" className="block w-full">
                        <Button
                          variant="outline"
                          className="w-full font-normal rounded-xl"
                          disabled={cancelling}
                        >
                          Keep Reservation
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

