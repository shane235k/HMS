// apps/web/src/app/manage/transactions/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { apiFetch } from '@/lib/api';
import {
  Role,
  ManagerTransactionsResponse,
  ManagerTransactionRecord,
  formatCurrencyMinor,
} from '@hbms/shared';
import {
  Receipt,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  RefreshCw,
  Calendar,
  BedDouble,
  Users,
  ShieldAlert,
  ArrowLeft,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  Building2,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface HotelSummary {
  id: string;
  name: string;
  slug: string;
  currency: string;
  city: string;
  country: string;
}

export default function ManagerTransactionsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [hotel, setHotel] = useState<HotelSummary | null>(null);
  const [data, setData] = useState<ManagerTransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Pagination State
  const [filterType, setFilterType] = useState<'ALL' | 'PAYMENTS' | 'CANCELLATIONS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Role gate: redirect non-managers
  useEffect(() => {
    if (user) {
      if (user.role === Role.RECEPTIONIST) {
        router.replace('/reception');
      } else if (user.role === Role.HOUSEKEEPING) {
        router.replace('/housekeeping');
      } else if (user.role === Role.PLATFORM_ADMIN) {
        router.replace('/admin/dashboard');
      }
    }
  }, [user, router]);

  const loadTransactions = async (isManualRefresh = false) => {
    if (user && user.role !== Role.HOTEL_MANAGER && user.role !== Role.PLATFORM_ADMIN) {
      setLoading(false);
      return;
    }

    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      // Load hotel property info if not loaded
      if (!hotel) {
        const hotelData = await apiFetch<HotelSummary>('/management/property');
        setHotel(hotelData);
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        filter: filterType,
      });

      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const res = await apiFetch<ManagerTransactionsResponse>(`/management/transactions?${params.toString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load hotel transactions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [currentPage, filterType, debouncedSearch, user]);

  if (user && user.role !== Role.HOTEL_MANAGER && user.role !== Role.PLATFORM_ADMIN) {
    return (
      <div className="flex min-h-screen bg-canvas-neutral items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4 bg-white border-charcoal-200">
          <ShieldAlert className="w-12 h-12 text-neutral-400 mx-auto" />
          <h2 className="text-lg font-normal text-charcoal-900">Restricted Access Portal</h2>
          <p className="text-xs text-charcoal-500 leading-relaxed font-normal">
            Financial journal and guest transaction records are restricted to designated Hotel Managers.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(user.role === Role.RECEPTIONIST ? '/reception' : '/housekeeping')}
              className="font-normal"
            >
              Go to Working Station
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const summary = data?.summary || {
    grossRevenueCents: 0,
    grossRevenueFormatted: '₹0',
    totalRefundsCents: 0,
    totalRefundsFormatted: '₹0',
    netRevenueCents: 0,
    netRevenueFormatted: '₹0',
    totalTransactionsCount: 0,
    completedBookingsCount: 0,
    cancellationsCount: 0,
    currency: hotel?.currency || 'INR',
  };

  const transactions = data?.transactions || [];
  const pagination = data?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 };

  const formatTimestamp = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }),
      };
    } catch {
      return { date: isoDate, time: '' };
    }
  };

  const formatStayRange = (checkInStr: string, checkOutStr: string, nights: number) => {
    try {
      const cin = new Date(checkInStr);
      const cout = new Date(checkOutStr);
      const cinFormatted = cin.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const coutFormatted = cout.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${cinFormatted} → ${coutFormatted} (${nights} ${nights === 1 ? 'night' : 'nights'})`;
    } catch {
      return `${checkInStr} to ${checkOutStr}`;
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas-neutral">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <header className="h-16 bg-white border-b border-charcoal-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-normal text-charcoal-900 leading-tight">
              Financial Journal & Transactions
            </h1>
            {hotel && (
              <Badge variant="primary" className="text-[11px] font-normal">
                {hotel.name}
              </Badge>
            )}
            <Badge variant="neutral" className="text-[11px] font-mono font-normal">
              25 Records / Page
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/manage/dashboard">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-normal">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard Overview</span>
              </Button>
            </Link>
            <Link href="/manage/rates">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-normal">
                <Calendar className="w-3.5 h-3.5" />
                <span>Rate Calendar</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs font-normal print:hidden"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Ledger</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => loadTransactions(true)}
              disabled={refreshing}
              className="gap-1.5 text-xs font-normal"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-6 space-y-6 max-w-[1600px] w-full">
          {/* Top 4 Summary Cards (Cards above showing the overall revenue) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Gross Revenue / Inflow (Green Accent) */}
            <Card className="p-5 flex flex-col justify-between bg-white border-charcoal-200 hover:border-emerald-300 transition-colors">
              <div className="flex items-center justify-between text-charcoal-600">
                <span className="text-xs font-normal">Total Gross Payments</span>
                <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
                  <ArrowDownLeft className="w-4 h-4" />
                </span>
              </div>
              <div className="my-2">
                <div className="text-3xl font-normal font-mono text-emerald-700">
                  {summary.grossRevenueFormatted}
                </div>
              </div>
              <div className="text-[11px] text-charcoal-500 font-mono">
                {summary.completedBookingsCount} confirmed {summary.completedBookingsCount === 1 ? 'booking' : 'bookings'} captured
              </div>
            </Card>

            {/* 2. Net Realized Revenue (Dark Luxury Accent) */}
            <Card variant="highlight" className="p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-300 font-normal">Net Captured Revenue</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="my-2">
                <div className="text-3xl font-normal font-mono text-white">
                  {summary.netRevenueFormatted}
                </div>
              </div>
              <div className="text-[11px] text-neutral-300 font-mono">
                After accounting for all guest refunds
              </div>
            </Card>

            {/* 3. Cancellations & Refunds (Red Accent) */}
            <Card className="p-5 flex flex-col justify-between bg-white border-charcoal-200 hover:border-red-300 transition-colors">
              <div className="flex items-center justify-between text-charcoal-600">
                <span className="text-xs font-normal">Cancellations & Refunds</span>
                <span className="p-1 rounded-md bg-red-50 text-red-700">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <div className="my-2">
                <div className="text-3xl font-normal font-mono text-red-700">
                  {summary.totalRefundsCents > 0 ? `-${summary.totalRefundsFormatted}` : summary.totalRefundsFormatted}
                </div>
              </div>
              <div className="text-[11px] text-charcoal-500 font-mono">
                {summary.cancellationsCount} {summary.cancellationsCount === 1 ? 'cancellation' : 'cancellations'} processed
              </div>
            </Card>

            {/* 4. Total Transaction Volume */}
            <Card className="p-5 flex flex-col justify-between bg-white border-charcoal-200">
              <div className="flex items-center justify-between text-charcoal-600">
                <span className="text-xs font-normal">Transaction Journal Volume</span>
                <Receipt className="w-4 h-4 text-charcoal-400" />
              </div>
              <div className="my-2">
                <div className="text-3xl font-normal font-mono text-charcoal-900">
                  {summary.totalTransactionsCount}
                </div>
              </div>
              <div className="text-[11px] text-charcoal-500 font-mono">
                Audit-verified double-entry records
              </div>
            </Card>
          </div>

          {/* Search, Filter Pills & Controls Bar */}
          <div className="p-4 rounded-2xl bg-white border border-charcoal-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-canvas-neutral rounded-xl border border-charcoal-200">
              <button
                type="button"
                onClick={() => {
                  setFilterType('ALL');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-normal rounded-lg transition-all ${
                  filterType === 'ALL'
                    ? 'bg-white text-charcoal-900 shadow-sm font-medium'
                    : 'text-charcoal-500 hover:text-charcoal-800'
                }`}
              >
                All Records ({summary.totalTransactionsCount})
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterType('PAYMENTS');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-normal rounded-lg flex items-center gap-1.5 transition-all ${
                  filterType === 'PAYMENTS'
                    ? 'bg-white text-emerald-800 shadow-sm font-medium'
                    : 'text-charcoal-500 hover:text-emerald-700'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Payments & Inflows ({summary.completedBookingsCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterType('CANCELLATIONS');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-normal rounded-lg flex items-center gap-1.5 transition-all ${
                  filterType === 'CANCELLATIONS'
                    ? 'bg-white text-red-800 shadow-sm font-medium'
                    : 'text-charcoal-500 hover:text-red-700'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Cancellations & Refunds ({summary.cancellationsCount})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by code, ref, guest, suite..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-charcoal-200 bg-canvas-neutral focus:bg-white focus:outline-none font-normal"
              />
            </div>
          </div>

          {/* Transactions Table Card */}
          <Card className="rounded-2xl border-charcoal-200 bg-white shadow-card overflow-hidden">
            {loading ? (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-charcoal-400 animate-spin mx-auto" />
                <p className="text-xs text-charcoal-500 font-normal">Loading transaction ledger...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Receipt className="w-10 h-10 text-charcoal-300 mx-auto" />
                <h3 className="text-sm font-normal text-charcoal-900">No Transaction Records Found</h3>
                <p className="text-xs text-charcoal-500 max-w-sm mx-auto font-normal">
                  {searchQuery
                    ? `No transactions match your search filter "${searchQuery}". Try a different keyword.`
                    : 'No transactional activity has been recorded for this property yet.'}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-normal mt-2"
                  >
                    Clear Search Filter
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-charcoal-200/80 bg-canvas-neutral/60 text-charcoal-500 uppercase font-mono text-[10px] tracking-wider">
                      <th className="py-3 px-4">Transaction / Booking</th>
                      <th className="py-3 px-4">Guest Details</th>
                      <th className="py-3 px-4">Suite Booked</th>
                      <th className="py-3 px-4 text-right">Nightly Rate</th>
                      <th className="py-3 px-4">Exact Booked Timestamp</th>
                      <th className="py-3 px-4">Stay / Booking Dates</th>
                      <th className="py-3 px-4 text-center">Status & Flow</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal-100">
                    {transactions.map((tx) => {
                      const isPayment = tx.type === 'PAYMENT';
                      const bookedTimestamp = formatTimestamp(tx.bookedAt);
                      const stayRange = formatStayRange(tx.checkInDate, tx.checkOutDate, tx.nightsCount);

                      return (
                        <tr
                          key={tx.id}
                          className={`hover:bg-charcoal-50/50 transition-colors ${
                            !isPayment ? 'bg-red-50/15' : ''
                          }`}
                        >
                          {/* 1. Transaction Ref & Booking Code */}
                          <td className="py-3.5 px-4 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  isPayment ? 'bg-emerald-500' : 'bg-red-500'
                                }`}
                              />
                              <span className="font-medium text-charcoal-900">{tx.transactionReference}</span>
                            </div>
                            <span className="text-[11px] text-charcoal-400 pl-3 block">
                              Ref: {tx.bookingCode}
                            </span>
                          </td>

                          {/* 2. Guest Details */}
                          <td className="py-3.5 px-4">
                            <div className="font-normal text-charcoal-900">{tx.guestName}</div>
                            <div className="text-[11px] text-charcoal-500 font-mono">{tx.guestEmail}</div>
                            {tx.guestPhone && (
                              <div className="text-[10px] text-charcoal-400 font-mono">{tx.guestPhone}</div>
                            )}
                          </td>

                          {/* 3. Suite Booked ("the suite they booked") */}
                          <td className="py-3.5 px-4">
                            <div className="font-normal text-charcoal-900 flex items-center gap-1.5">
                              <BedDouble className="w-3.5 h-3.5 text-charcoal-400 flex-shrink-0" />
                              <span>{tx.suiteName}</span>
                            </div>
                            {tx.roomNumbers && tx.roomNumbers.length > 0 && (
                              <div className="mt-1 flex items-center gap-1">
                                {tx.roomNumbers.map((rn) => (
                                  <span
                                    key={rn}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-canvas-neutral border border-charcoal-200 text-charcoal-700"
                                  >
                                    Room {rn}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* 4. Nightly Rate ("the rate") */}
                          <td className="py-3.5 px-4 text-right font-mono">
                            <span className="text-charcoal-800 font-normal">{tx.nightlyRateFormatted}</span>
                            <span className="block text-[10px] text-charcoal-400 font-sans">/ night</span>
                          </td>

                          {/* 5. Exact Timestamp When Booked ("exact timestamp when they booked") */}
                          <td className="py-3.5 px-4 font-mono">
                            <div className="flex items-center gap-1.5 text-charcoal-800">
                              <Clock className="w-3 h-3 text-charcoal-400 flex-shrink-0" />
                              <span>{bookedTimestamp.date}</span>
                            </div>
                            <div className="text-[10px] text-charcoal-400 pl-4">{bookedTimestamp.time}</div>
                          </td>

                          {/* 6. Booking / Stay Dates ("heir booking date") */}
                          <td className="py-3.5 px-4 font-mono">
                            <div className="flex items-center gap-1.5 text-charcoal-800">
                              <Calendar className="w-3 h-3 text-charcoal-400 flex-shrink-0" />
                              <span>{stayRange}</span>
                            </div>
                          </td>

                          {/* 7. Status & Flow (Green / Red combination) */}
                          <td className="py-3.5 px-4 text-center">
                            {isPayment ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{tx.status}</span>
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-red-50 text-red-700 border border-red-200">
                                  <XCircle className="w-3 h-3" />
                                  <span>{tx.status}</span>
                                </span>
                                {tx.cancellationReason && (
                                  <span className="block text-[10px] text-red-600 truncate max-w-[140px] mx-auto">
                                    {tx.cancellationReason}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 8. Transaction Amount (Green / Red combination) */}
                          <td className="py-3.5 px-4 text-right font-mono">
                            {isPayment ? (
                              <span className="text-emerald-700 font-medium text-sm">
                                {tx.amountFormatted}
                              </span>
                            ) : (
                              <span className="text-red-700 font-medium text-sm">
                                {tx.amountFormatted}
                              </span>
                            )}
                            <span className="block text-[10px] text-charcoal-400 font-sans">
                              {isPayment ? 'Cash Inflow' : 'Refund Issued'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls Footer (say for 25 records) */}
            <div className="p-4 border-t border-charcoal-200 bg-canvas-neutral/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-charcoal-600">
              <div className="font-mono text-charcoal-500">
                Showing{' '}
                <span className="font-medium text-charcoal-800">
                  {pagination.total > 0 ? (pagination.page - 1) * pageSize + 1 : 0}
                </span>{' '}
                to{' '}
                <span className="font-medium text-charcoal-800">
                  {Math.min(pagination.page * pageSize, pagination.total)}
                </span>{' '}
                of <span className="font-medium text-charcoal-800">{pagination.total}</span> records
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1 || loading}
                  className="gap-1 text-xs font-normal"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </Button>

                <span className="px-3 py-1 rounded-lg bg-white border border-charcoal-200 font-mono text-charcoal-800 font-normal">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="gap-1 text-xs font-normal"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
