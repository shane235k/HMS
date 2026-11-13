// apps/web/src/app/reservations/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import {
  Calendar,
  MapPin,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  RotateCcw,
  Printer,
  ChevronRight,
  Info,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Check,
  X,
  Lock,
  Star,
  Hourglass,
} from 'lucide-react';
import { ReviewModal } from '@/components/reviews/ReviewModal';

export default function GuestReservationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Retry Refund state
  const [retryingRefundId, setRetryingRefundId] = useState<string | null>(null);

  // Review Modal state
  const [selectedReviewRes, setSelectedReviewRes] = useState<any | null>(null);

  const formatTimeRemaining = (ms: number) => {
    if (ms <= 0) return 'Window closed';
    const totalSecs = Math.floor(ms / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h left to cancel`;
    return `${hours}h ${mins}m left to cancel`;
  };

  const loadReservations = async (tab = activeTab) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<any[]>(`/reservations/my?filter=${tab}`);
      setReservations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/reservations');
      return;
    }
    if (user) {
      loadReservations(activeTab);
    }
  }, [user, authLoading, activeTab]);

  const handleRetryRefund = async (reservationId: string) => {
    try {
      setRetryingRefundId(reservationId);
      await apiFetch<any>(`/reservations/${reservationId}/refund/retry`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await loadReservations(activeTab);
    } catch (err: any) {
      alert(`Refund retry failed: ${err.message}`);
    } finally {
      setRetryingRefundId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas-white">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-charcoal-200 pb-5">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-black font-normal block mb-1">
              Guest Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-normal text-charcoal-900">
              My Bookings & Stays
            </h1>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2 border-black text-black hover:bg-neutral-100 font-normal">
              <span>Find More Hotels</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 border-b border-charcoal-200 pb-2">
          {(['all', 'upcoming', 'completed', 'cancelled'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-normal uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? 'bg-black text-white shadow-sm'
                  : 'text-charcoal-600 hover:bg-canvas-neutral hover:text-charcoal-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content State */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-black animate-spin" />
            <p className="text-xs text-charcoal-500 font-light">Loading your reservation records...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <h3 className="font-normal text-sm">Failed to load reservations</h3>
            <p className="text-xs text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={() => loadReservations()}>
              Try Again
            </Button>
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-20 p-8 rounded-3xl bg-canvas-neutral border border-charcoal-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-800 mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-normal text-charcoal-900 text-base">No {activeTab} bookings found</h3>
              <p className="text-xs text-charcoal-500 max-w-sm mx-auto font-light">
                You do not have any {activeTab} reservations. Search boutique properties to plan your next retreat.
              </p>
            </div>
            <Link href="/">
              <Button variant="primary" className="rounded-xl mt-2 font-normal">
                Discover Hotels
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {reservations.map((res) => {
              const checkIn = new Date(res.check_in_date).toISOString().split('T')[0];
              const checkOut = new Date(res.check_out_date).toISOString().split('T')[0];
              const isCancelled = res.status === 'CANCELLED';
              const isExpired =
                res.status === 'EXPIRED' ||
                (res.status === 'TEMPORARY_HOLD' &&
                  res.hold_expires_at &&
                  new Date(res.hold_expires_at).getTime() < Date.now());
              const isHoldActive = res.status === 'TEMPORARY_HOLD' && !isExpired;
              const isConfirmed = res.status === 'CONFIRMED' || res.status === 'CHECKED_IN';
              const isCheckedIn = res.status === 'CHECKED_IN';
              const isCompleted = res.status === 'CHECKED_OUT';
              const refundRecord = res.cancellation?.refund;

              return (
                <Card
                  key={res.id}
                  className="border-charcoal-200 overflow-hidden shadow-card hover:shadow-floating transition-all duration-200"
                >
                  <CardHeader className="bg-canvas-neutral/70 border-b border-charcoal-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-normal font-serif shadow-sm">
                        {res.hotel?.name?.[0] || 'H'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-normal text-sm text-charcoal-900">{res.hotel?.name}</h3>
                          <Badge
                            variant={
                              isCancelled
                                ? 'rejected'
                                : isExpired
                                ? 'rejected'
                                : isHoldActive
                                ? 'pending'
                                : isCheckedIn
                                ? 'occupied'
                                : isCompleted
                                ? 'ready'
                                : 'approved'
                            }
                          >
                            {isHoldActive ? 'HOLD ACTIVE' : isExpired ? 'HOLD EXPIRED' : res.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-charcoal-500 mt-0.5 font-light">
                          <MapPin className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                          <span>
                            {res.hotel?.city}, {res.hotel?.country}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:text-right">
                      <div>
                        <span className="text-[10px] text-charcoal-400 font-mono block uppercase">Booking Ref</span>
                        <span className="text-sm font-mono font-normal text-black tracking-wider block">
                          {res.reservation_code}
                        </span>
                        {res.created_at && (
                          <span className="text-[11px] text-charcoal-500 font-mono block mt-0.5">
                            Booked: <strong>{new Date(res.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-6">
                    {/* Stay Info & Rooms */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Dates & Schedule */}
                      <div className="p-3.5 rounded-xl bg-canvas-neutral border border-charcoal-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-charcoal-500 uppercase block font-normal">
                            Stay Dates & Daily Hours
                          </span>
                          {res.created_at && (
                            <span className="text-[10px] font-mono text-neutral-600 bg-white/80 px-2 py-0.5 rounded border border-charcoal-100">
                              Booked {new Date(res.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <p className="font-normal text-charcoal-900 text-sm">
                          {checkIn} &rarr; {checkOut}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-charcoal-700 bg-white/70 px-2.5 py-1.5 rounded-lg border border-charcoal-100">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-neutral-500" />
                            Check-in: <strong>{res.hotel?.check_in_time || '14:00'}</strong>
                          </span>
                          <span className="text-charcoal-300">&bull;</span>
                          <span className="flex items-center gap-1 font-mono">
                            Check-out: <strong>{res.hotel?.check_out_time || '11:00'}</strong>
                          </span>
                        </div>
                        <p className="text-charcoal-500 font-normal text-[11px]">
                          {res.rooms?.length} Room Line{res.rooms?.length > 1 ? 's' : ''} &bull; Total {res.total_rooms_count} Room{res.total_rooms_count > 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Accommodation line item */}
                      <div className="p-3 rounded-xl bg-canvas-neutral border border-charcoal-200 space-y-1">
                        <span className="text-[10px] font-mono text-charcoal-500 uppercase block font-normal">
                          Reserved Room Types
                        </span>
                        {res.rooms?.map((rm: any) => (
                          <p key={rm.id} className="font-normal text-charcoal-900">
                            {rm.room_type?.name} (x{rm.quantity})
                          </p>
                        ))}
                        <p className="text-[11px] text-emerald-700 font-normal">Free cancellation policy</p>
                      </div>

                      {/* Total and Payment */}
                      <div className="p-3 rounded-xl bg-canvas-neutral border border-charcoal-200 space-y-1">
                        <span className="text-[10px] font-mono text-charcoal-500 uppercase block font-normal">
                          Payment Status
                        </span>
                        <p className="text-base font-serif font-normal text-black">
                          ₹{(res.total_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {isCancelled ? (
                            <Badge variant={refundRecord?.status === 'PROCESSED' ? 'ready' : 'rejected'}>
                              {refundRecord?.status === 'PROCESSED' ? 'REFUNDED' : 'REFUND FAILED'}
                            </Badge>
                          ) : isExpired ? (
                            <Badge variant="rejected">VOID / EXPIRED</Badge>
                          ) : isHoldActive ? (
                            <Badge variant="pending">PAYMENT PENDING</Badge>
                          ) : (
                            <Badge variant="ready">PAID IN FULL</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timeline visualization */}
                    <div className="pt-2 border-t border-charcoal-200">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal-400 font-normal block mb-3">
                        Reservation Status Timeline
                      </span>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        {/* Step 1: Hold Created */}
                        <div className="space-y-1">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-xs font-normal">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                          <span className="font-normal block text-[11px]">Hold Created</span>
                          <span className="text-[10px] text-charcoal-400 font-normal">Inventory Reserved</span>
                        </div>

                        {/* Step 2: Payment Captured */}
                        <div className="space-y-1">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto text-xs font-normal ${
                              isConfirmed || isCompleted
                                ? 'bg-emerald-100 text-emerald-700'
                                : isHoldActive
                                ? 'bg-amber-100 text-amber-700 animate-pulse'
                                : isExpired
                                ? 'bg-red-100 text-red-700'
                                : 'bg-charcoal-100 text-charcoal-400'
                            }`}
                          >
                            {isConfirmed || isCompleted ? (
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : isExpired ? (
                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : isHoldActive ? (
                              <Clock className="w-3.5 h-3.5" />
                            ) : (
                              '2'
                            )}
                          </div>
                          <span className="font-normal block text-[11px]">
                            {isHoldActive ? 'Payment Pending' : isExpired ? 'Hold Timed Out' : 'Payment Captured'}
                          </span>
                          <span className="text-[10px] text-charcoal-400 font-normal">
                            {isHoldActive ? '15m Window Open' : isExpired ? 'Rooms Released' : 'Card Authorized'}
                          </span>
                        </div>

                        {/* Step 3: Check-In */}
                        <div className="space-y-1">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto text-xs font-normal ${
                              isCheckedIn || isCompleted
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-charcoal-100 text-charcoal-400'
                            }`}
                          >
                            {isCheckedIn || isCompleted ? (
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : (
                              '3'
                            )}
                          </div>
                          <span className="font-normal block text-[11px]">Check-In</span>
                          <span className="text-[10px] text-charcoal-400 font-normal">Desk Key Handover</span>
                        </div>

                        {/* Step 4: Completed / Expired / Cancelled */}
                        <div className="space-y-1">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto text-xs font-normal ${
                              isCancelled
                                ? 'bg-red-100 text-red-700'
                                : isExpired
                                ? 'bg-red-100 text-red-700'
                                : isCompleted
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-charcoal-100 text-charcoal-400'
                            }`}
                          >
                            {isCancelled ? (
                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : isExpired ? (
                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : isCompleted ? (
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : (
                              '4'
                            )}
                          </div>
                          <span className="font-normal block text-[11px]">
                            {isCancelled ? 'Cancelled' : isExpired ? 'Expired' : 'Completed'}
                          </span>
                          <span className="text-[10px] text-charcoal-400 font-normal">
                            {isCancelled
                              ? 'Refund Issued'
                              : isExpired
                              ? 'Booking Void'
                              : isCompleted
                              ? 'Check-Out Done'
                              : 'Stay Concluded'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-charcoal-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {/* Complete Payment action for active hold */}
                        {isHoldActive && (
                          <Link href={`/checkout/${res.reservation_code}`}>
                            <Button variant="primary" size="sm" className="gap-1.5 font-normal shadow-sm">
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Complete Payment & Confirm</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        )}

                        {/* Re-book action for expired hold */}
                        {isExpired && (
                          <Link href={`/hotels/${res.hotel?.id || ''}`}>
                            <Button variant="outline" size="sm" className="gap-1.5 font-normal">
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Hold Expired &mdash; Re-book Stay</span>
                            </Button>
                          </Link>
                        )}

                        {/* View Receipt ONLY for Confirmed or Completed bookings */}
                        {(isConfirmed || isCompleted) && (
                          <Link href={`/checkout/confirmation/${res.reservation_code}`}>
                            <Button variant="outline" size="sm" className="gap-1.5 font-normal">
                              <Printer className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </Button>
                          </Link>
                        )}

                        {/* Rate Stay for Completed Stays (only if not already reviewed) */}
                        {isCompleted && !res.isReviewed && !res.review && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setSelectedReviewRes(res)}
                            className="gap-1.5 font-normal bg-black text-white hover:bg-neutral-800"
                          >
                            <Star className="w-3.5 h-3.5 fill-white text-white" />
                            <span>Rate Stay</span>
                          </Button>
                        )}

                        {isCompleted && (res.isReviewed || res.review) && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 text-charcoal-700 text-xs font-normal border border-charcoal-200">
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                            <span>Reviewed ({res.review?.rating || 5}★)</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isHoldActive && res.hold_expires_at && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-700 font-normal">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Lock expires:{' '}
                              {new Date(res.hold_expires_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}

                        {isConfirmed && (
                          <div className="flex items-center gap-2">
                            {res.cancellationDeadline && (
                              <div
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-normal border ${
                                  res.cancellationDeadline.hasReachedCheckIn
                                    ? 'bg-neutral-100 text-neutral-500 border-neutral-200'
                                    : res.cancellationDeadline.isBeforeDeadline
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                <Hourglass className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {res.cancellationDeadline.hasReachedCheckIn
                                    ? 'Check-in reached'
                                    : formatTimeRemaining(res.cancellationDeadline.timeRemainingMs)}
                                </span>
                              </div>
                            )}

                            <Link href={`/reservations/${res.id}/cancel`}>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1.5 font-normal"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Cancel Reservation</span>
                              </Button>
                            </Link>
                          </div>
                        )}

                        {isCancelled && refundRecord?.status === 'FAILED' && (
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={retryingRefundId === res.id}
                            onClick={() => handleRetryRefund(res.id)}
                            className="gap-1.5 font-normal"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry Failed Refund</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Review & Rating Modal for Completed Stay */}
      {selectedReviewRes && (
        <ReviewModal
          isOpen={true}
          onClose={() => setSelectedReviewRes(null)}
          hotelId={selectedReviewRes.hotel_id}
          hotelName={selectedReviewRes.hotel?.name}
          reservationId={selectedReviewRes.id}
          roomTypeId={selectedReviewRes.rooms?.[0]?.room_type_id}
          onSuccess={() => {
            loadReservations();
          }}
        />
      )}

      <Footer />
    </div>
  );
}

