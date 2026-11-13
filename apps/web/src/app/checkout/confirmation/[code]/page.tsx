// apps/web/src/app/checkout/confirmation/[code]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiFetch } from '@/lib/api';
import {
  CheckCircle2,
  Printer,
  Calendar,
  MapPin,
  Users,
  CreditCard,
  Building,
  ShieldCheck,
  Copy,
  Check,
  ArrowRight,
  Download,
  AlertCircle,
  Clock,
  RefreshCw,
  Mail,
  Phone,
} from 'lucide-react';

export default function BookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [reservation, setReservation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadConfirmation() {
      try {
        setLoading(true);
        const data = await apiFetch<any>(`/reservations/${code}`);
        // If reservation is still an unconfirmed hold, redirect to payment checkout page
        if (data && data.status === 'TEMPORARY_HOLD') {
          router.replace(`/checkout/${data.reservation_code}`);
          return;
        }
        setReservation(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load booking confirmation');
      } finally {
        setLoading(false);
      }
    }
    loadConfirmation();
  }, [code, router]);

  const handleCopyCode = () => {
    if (!reservation?.reservation_code) return;
    navigator.clipboard.writeText(reservation.reservation_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas-white">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-black animate-spin" />
            <p className="text-sm font-normal text-charcoal-600">Retrieving official booking receipt...</p>
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
          <h1 className="text-xl font-normal text-charcoal-900">Confirmation Not Found</h1>
          <p className="text-xs text-charcoal-600">{error || 'Unable to locate this reservation.'}</p>
          <Link href="/">
            <Button variant="primary" className="rounded-xl mt-4">
              Return to Homepage
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const primaryPayment = reservation.payments?.[0] || null;

  return (
    <div className="min-h-screen flex flex-col bg-canvas-white print:bg-white">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Success Banner (Hidden on print) */}
        <div className="print:hidden p-6 rounded-3xl bg-gradient-to-r from-emerald-50 via-emerald-100/40 to-teal-50 border border-emerald-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 font-bold block mb-0.5">
                Payment Authorized & Guaranteed
              </span>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-charcoal-900">
                Reservation Confirmed!
              </h1>
              <p className="text-xs text-charcoal-600 mt-0.5">
                A confirmation receipt has been issued to <span className="font-semibold text-charcoal-800">{reservation.guest_email}</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 shadow-sm bg-white">
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </Button>
            <Link href="/reservations">
              <Button variant="primary" size="sm" className="gap-1.5 shadow-sm">
                <span>My Bookings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Printable Official Booking Receipt Document */}
        <div id="booking-receipt" className="bg-white rounded-3xl border border-charcoal-200 shadow-card p-6 sm:p-10 space-y-8 print:border-none print:shadow-none print:p-0">
          {/* Receipt Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-charcoal-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-normal font-serif text-charcoal-900">Voyage</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 font-mono font-normal border border-neutral-300">
                  OFFICIAL RECEIPT
                </span>
              </div>
              <p className="text-xs text-charcoal-500 mt-1 font-light">Verified Booking Confirmation</p>
              <p className="text-[11px] text-charcoal-700 font-mono mt-0.5">
                Booked on: <strong className="text-black">{new Date(reservation.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
              </p>
            </div>

            {/* Reference Box */}
            <div className="p-3.5 rounded-2xl bg-canvas-neutral border border-charcoal-200 space-y-1 sm:text-right">
              <span className="text-[10px] text-charcoal-500 font-mono uppercase tracking-wider block">
                Booking Reference Code
              </span>
              <div className="flex items-center sm:justify-end gap-2">
                <span className="text-xl font-mono font-normal text-black tracking-wider">
                  {reservation.reservation_code}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Copy code"
                  className="p-1 rounded-md hover:bg-charcoal-200 text-charcoal-500 transition-colors print:hidden"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-charcoal-600 font-mono">
                Booking Date: <strong>{new Date(reservation.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
              </p>
              <div className="flex items-center sm:justify-end gap-1.5 pt-1">
                <Badge variant="approved">{reservation.status}</Badge>
                {primaryPayment?.status === 'SUCCESS' && <Badge variant="ready">PAID</Badge>}
              </div>
            </div>
          </div>

          {/* Hotel & Guest Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-2xl bg-canvas-neutral/60 border border-charcoal-200 text-xs font-normal">
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal-500 font-normal block">
                Property Details
              </span>
              <h3 className="text-sm font-normal text-charcoal-900">{reservation.hotel?.name}</h3>
              <div className="space-y-1 text-charcoal-600 font-normal">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                  <span>
                    {reservation.hotel?.address}, {reservation.hotel?.city}, {reservation.hotel?.country}
                  </span>
                </div>
                {reservation.hotel?.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                    <span>{reservation.hotel?.phone}</span>
                  </div>
                )}
                {reservation.hotel?.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                    <span className="font-mono font-normal">{reservation.hotel?.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 sm:border-l sm:border-charcoal-200 sm:pl-6">
              <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal-500 font-normal block">
                Guest Information
              </span>
              <h3 className="text-sm font-normal text-charcoal-900">{reservation.guest_name}</h3>
              <div className="space-y-1 text-charcoal-600 font-normal">
                <p>
                  <span className="text-charcoal-500">Email:</span>{' '}
                  <span className="font-mono font-normal">{reservation.guest_email}</span>
                </p>
                <p>
                  <span className="text-charcoal-500">Phone:</span> {reservation.guest_phone}
                </p>
                <p>
                  <span className="text-charcoal-500">Total Rooms:</span> {reservation.total_rooms_count}
                </p>
              </div>
            </div>
          </div>

          {/* Stay Itinerary Details */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-2xl border border-charcoal-200 text-xs text-center font-normal">
            <div>
              <span className="text-[10px] text-charcoal-500 font-mono uppercase block">Booking Date</span>
              <span className="text-sm font-normal text-charcoal-900 block mt-0.5">
                {new Date(reservation.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="text-[10px] text-charcoal-500 font-normal">Transaction confirmed</span>
            </div>
            <div>
              <span className="text-[10px] text-charcoal-500 font-mono uppercase block">Check-In</span>
              <span className="text-sm font-normal text-charcoal-900 block mt-0.5">
                {new Date(reservation.check_in_date).toISOString().split('T')[0]}
              </span>
              <span className="text-[10px] text-charcoal-500 font-normal">From {reservation.hotel?.check_in_time || '14:00'}</span>
            </div>
            <div>
              <span className="text-[10px] text-charcoal-500 font-mono uppercase block">Check-Out</span>
              <span className="text-sm font-normal text-charcoal-900 block mt-0.5">
                {new Date(reservation.check_out_date).toISOString().split('T')[0]}
              </span>
              <span className="text-[10px] text-charcoal-500 font-normal">Until {reservation.hotel?.check_out_time || '11:00'}</span>
            </div>
            <div>
              <span className="text-[10px] text-charcoal-500 font-mono uppercase block">Duration</span>
              <span className="text-sm font-normal text-charcoal-900 block mt-0.5">
                {Math.max(
                  1,
                  Math.round(
                    (new Date(reservation.check_out_date).getTime() -
                      new Date(reservation.check_in_date).getTime()) /
                      (24 * 60 * 60 * 1000)
                  )
                )}{' '}
                Nights
              </span>
              <span className="text-[10px] text-emerald-700 font-normal">Guaranteed</span>
            </div>
            <div>
              <span className="text-[10px] text-charcoal-500 font-mono uppercase block">Status</span>
              <span className="text-sm font-normal text-charcoal-900 block mt-0.5">{reservation.status}</span>
              <span className="text-[10px] text-emerald-700 font-normal">Verified reservation</span>
            </div>
          </div>

          {/* Reserved Rooms Table */}
          <div className="space-y-3 font-normal">
            <h4 className="text-xs font-normal text-charcoal-700 uppercase tracking-wider">
              Room & Rate Breakdown
            </h4>
            <div className="border border-charcoal-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs font-normal">
                <thead className="bg-canvas-neutral border-b border-charcoal-200 text-[10px] font-mono uppercase text-charcoal-500 font-normal">
                  <tr>
                    <th className="py-2.5 px-4 font-normal">Room Type</th>
                    <th className="py-2.5 px-4 font-normal">Rate Plan</th>
                    <th className="py-2.5 px-4 font-normal text-center">Qty</th>
                    <th className="py-2.5 px-4 font-normal text-right">Avg Nightly</th>
                    <th className="py-2.5 px-4 font-normal text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-200">
                  {reservation.rooms?.map((rm: any) => (
                    <tr key={rm.id} className="hover:bg-canvas-neutral/40">
                      <td className="py-3 px-4 font-normal text-charcoal-900">{rm.room_type?.name}</td>
                      <td className="py-3 px-4 text-charcoal-600">
                        {rm.rate_plan?.name}
                        <span className="block text-[10px] text-emerald-700">Free Cancellation (48h)</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{rm.quantity}</td>
                      <td className="py-3 px-4 text-right font-mono text-charcoal-600 font-normal">
                        ₹{(rm.nightly_rate_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-normal text-charcoal-900">
                        ₹{(rm.total_price_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Itemized Financial Accounting & Payment Record */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-charcoal-200">
            {/* Payment Record Details */}
            <div className="p-4 rounded-2xl bg-canvas-neutral/60 border border-charcoal-200 text-xs space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal-500 font-normal block">
                Payment Verification
              </span>
              <div className="flex justify-between font-normal">
                <span className="text-charcoal-500">Payment Status:</span>
                <span className="font-normal text-emerald-700">COMPLETED & VERIFIED</span>
              </div>
              {primaryPayment && (
                <>
                  <div className="flex justify-between">
                    <span className="text-charcoal-500">Transaction Reference:</span>
                    <span className="font-mono text-charcoal-800">{primaryPayment.transaction_reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-500">Payment Method:</span>
                    <span className="font-mono">{primaryPayment.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-500">Provider:</span>
                    <span className="font-mono">{primaryPayment.payment_provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-500">Processed At:</span>
                    <span className="font-mono">
                      {new Date(primaryPayment.created_at).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Total Financial Summary */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-charcoal-600">
                <span>Room Charges:</span>
                <span className="font-mono">
                  ₹{(reservation.subtotal_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-charcoal-600">
                <span>Estimated Taxes & Levies:</span>
                <span className="font-mono">
                  ₹{(reservation.tax_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {reservation.fees_cents > 0 && (
                <div className="flex justify-between text-charcoal-600">
                  <span>Resort & Service Fees:</span>
                  <span className="font-mono">
                    ₹{(reservation.fees_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-charcoal-200 text-base font-normal text-charcoal-900">
                <span>Total Amount Paid:</span>
                <span className="text-xl font-serif text-black font-normal">
                  ₹{(reservation.total_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Policy Footer */}
          <div className="pt-4 border-t border-charcoal-200 text-xs text-charcoal-500 space-y-1">
            <h5 className="font-semibold text-charcoal-700">Cancellation Policy</h5>
            <p className="leading-relaxed">
              Standard 48-hour free cancellation applies. Cancellations made 48 hours prior to check-in receive an authoritative 100% full refund back to the original card. Cancellations made after the deadline are subject to a first-night fee.
            </p>
          </div>
        </div>

        {/* Bottom Navigation Buttons (Hidden on print) */}
        <div className="print:hidden flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <span>Return to Homepage</span>
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              <span>Print Official Receipt</span>
            </Button>
            <Link href="/reservations">
              <Button variant="primary" className="gap-2">
                <span>View in My Bookings</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}

