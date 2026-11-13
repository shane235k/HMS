// apps/web/src/app/admin/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiFetch } from '@/lib/api';
import { formatCurrencyMinor } from '@hbms/shared';
import { RevenueAnalyticsGraph } from '@/components/dashboard/RevenueAnalyticsGraph';
import {
  TrendingUp,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  CheckSquare,
  Square,
  ChevronDown,
  Building2,
  IndianRupee,
  BedDouble,
  User,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

interface PlatformStats {
  hotels?: {
    total?: number;
    active?: number;
    suspended?: number;
  };
  inventory?: {
    totalRoomsAcrossPlatform?: number;
    totalRooms?: number;
    occupiedRooms?: number;
    occupancyRatePercent?: number;
  };
  rooms?: {
    totalRooms?: number;
    occupiedRooms?: number;
  };
  bookings?: {
    totalCount?: number;
    statusBreakdown?: Record<string, number>;
    todayCheckInsCount?: number;
    checkInsProcessedCount?: number;
    checkInsPendingCount?: number;
  };
  reservations?: {
    total?: number;
    confirmed?: number;
    checkedIn?: number;
    checkedOut?: number;
    cancelled?: number;
    recent?: Array<{
      id: string;
      reservationCode: string;
      guestName: string;
      hotelName: string;
      hotelCity: string;
      roomTypeName: string;
      checkInDate: string;
      checkOutDate: string;
      status: string;
      totalFormatted: string;
    }>;
  };
  auditLogs?: {
    total?: number;
    recent?: Array<{
      id: string;
      action: string;
      actorRole: string;
      entityType: string;
      entityId?: string;
      hotelName?: string | null;
      createdAt: string;
      ipAddress?: string | null;
    }>;
  };
  tasks?: {
    total?: number;
    open?: number;
    completed?: number;
    recent?: Array<{
      id: string;
      title: string;
      roomNumber: string;
      department: string;
      status: string;
      createdAt: string;
    }>;
  };
  portfolioDistribution?: Array<{
    hotelId: string;
    hotelName: string;
    city: string;
    category: string;
    roomCount: number;
    percentage: number;
  }>;
  operationalStatusCounts?: Record<string, number>;
  financials?: {
    todayRevenueCents?: number;
    todayRevenueFormatted?: string;
    todayRealizedRevenueCents?: number;
    todayRealizedRevenueFormatted?: string;
    todayRealizedRevenueLabel?: string;
    analytics?: any;
    yesterdayRevenueCents?: number;
    yesterdayRevenueFormatted?: string;
    revenueChangePercent?: number;
    revenueChangeLabel?: string;
    grossVolumeCents?: number;
    refundedVolumeCents?: number;
    netVolumeCents?: number;
    successfulPaymentsCount?: number;
    processedRefundsCount?: number;
    grossRevenueFormatted?: string;
    platformNetRevenueFormatted?: string;
    annualGrossRevenueCents?: number;
    annualGrossRevenueFormatted?: string;
    monthlyRevenue?: Array<{
      month: string;
      revenueCents: number;
      revenueFormatted: string;
      transactionsCount: number;
    }>;
  };
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    USER_LOGIN: 'User Signed In',
    USER_REGISTERED: 'Account Registered',
    HOTEL_APPLICATION_SUBMITTED: 'Partner Application Submitted',
    HOTEL_APPLICATION_APPROVED: 'Partner Application Approved',
    HOTEL_APPLICATION_REJECTED: 'Application Rejected',
    HOTEL_REGISTERED: 'New Property Registered',
    HOTEL_UPDATED: 'Hotel Settings Updated',
    HOTEL_STATUS_TOGGLED: 'Hotel Status Toggled',
    HOTEL_SUSPENDED: 'Property Suspended',
    HOTEL_ACTIVATED: 'Property Activated',
    ROOM_TYPE_CREATED: 'Room Type Created',
    ROOM_TYPE_UPDATED: 'Room Type Updated',
    ROOM_CREATED: 'Physical Room Added',
    RATE_PLAN_CREATED: 'Rate Plan Created',
    RATE_OVERRIDE_SET: 'Seasonal Rate Override Set',
    STAFF_MEMBER_CREATED: 'Staff Member Onboarded',
    STAFF_STATUS_UPDATED: 'Staff Status Changed',
    RESERVATION_CONFIRMED: 'Booking Confirmed',
    CHECK_IN_PROCESSED: 'Guest Checked In',
    CHECK_OUT_PROCESSED: 'Guest Checked Out',
  };
  return map[action] || action.replace(/_/g, ' ');
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [distributionView, setDistributionView] = useState<'By Property' | 'Room Status'>('By Property');
  const [graphMetric, setGraphMetric] = useState<'cash_inflow' | 'realized_revenue' | 'compare'>('cash_inflow');
  const [graphTimeframe, setGraphTimeframe] = useState<'today' | 'week' | 'month' | 'year'>('week');
  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const data = await apiFetch<PlatformStats>('/admin/stats');
        setStats(data);
      } catch (err) {
        console.error('Failed to load admin platform stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const reservationsList = stats?.reservations?.recent || [];
  const auditLogsList = stats?.auditLogs?.recent || [];

  return (
    <div className="flex min-h-screen bg-canvas-neutral">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-charcoal-200 px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-normal text-neutral-900 tracking-tight">Dashboard</h1>
              <p className="text-xs text-neutral-500 font-normal">Monitor your key performance indicators</p>
            </div>

            <div className="flex items-center gap-3 print:hidden">
              {/* Export Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                className="gap-2 text-xs font-normal bg-black hover:bg-neutral-800 text-white shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Main Canvas */}
        <main className="p-8 space-y-6 max-w-[1600px] w-full">
          {/* ==================================================== */}
          {/* TOP ROW: KPI CARDS                                    */}
          {/* ==================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. OCCUPANCY RATE */}
            <div className="p-5 rounded-2xl bg-black text-white flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-300 font-normal">Occupancy Rate</span>
                <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-neutral-200" />
                </div>
              </div>
              <div className="my-2">
                <div className="text-3xl font-normal font-mono text-white tracking-tight">
                  {stats?.inventory?.occupancyRatePercent ?? 0}%
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-neutral-300 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">
                  {stats?.inventory?.occupiedRooms ?? 0} occupied
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {stats?.inventory?.totalRoomsAcrossPlatform || 0} rooms
                </span>
              </div>
            </div>

            {/* 2. CHECK-INS TODAY */}
            <div className="p-5 rounded-2xl bg-white border border-neutral-200 text-neutral-900 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-600 font-normal">Check-ins Today</span>
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5 text-neutral-600" />
                </div>
              </div>
              <div className="my-2">
                <div className="text-3xl font-normal font-mono text-neutral-900 tracking-tight">
                  {stats?.bookings?.todayCheckInsCount ?? 0}
                </div>
              </div>
              <div className="text-[10px] font-mono text-neutral-500">
                {stats?.bookings?.checkInsProcessedCount ?? 0} Done — {stats?.bookings?.checkInsPendingCount ?? 0} Pending
              </div>
            </div>

            {/* 3. CASH INFLOW TODAY (Booking Date) */}
            <div
              onClick={() => {
                setGraphMetric('cash_inflow');
                setGraphTimeframe('today');
              }}
              title="Click to view Cash Inflow on graph"
              className={`p-5 rounded-2xl bg-white border text-neutral-900 flex flex-col justify-between shadow-sm cursor-pointer transition-all hover:border-neutral-400 ${
                graphMetric === 'cash_inflow' && graphTimeframe === 'today'
                  ? 'border-neutral-900 ring-1 ring-neutral-900'
                  : 'border-neutral-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-600 font-normal">Cash Inflow Today</span>
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <IndianRupee className="w-3.5 h-3.5 text-neutral-600" />
                </div>
              </div>
              <div className="my-2">
                <div className="text-3xl font-normal font-mono text-neutral-900 tracking-tight">
                  {stats?.financials?.todayRevenueFormatted || '₹0'}
                </div>
              </div>
              <div className="text-[10px] font-mono text-neutral-600">
                {stats?.financials?.revenueChangeLabel || 'Live payments recorded'}
              </div>
            </div>

            {/* 4. REALIZED STAY REVENUE TODAY (Check-In Date) */}
            <div
              onClick={() => {
                setGraphMetric('realized_revenue');
                setGraphTimeframe('today');
              }}
              title="Click to view Stay Revenue on graph"
              className={`p-5 rounded-2xl bg-white border text-neutral-900 flex flex-col justify-between shadow-sm cursor-pointer transition-all hover:border-neutral-400 ${
                graphMetric === 'realized_revenue' && graphTimeframe === 'today'
                  ? 'border-neutral-900 ring-1 ring-neutral-900'
                  : 'border-neutral-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-600 font-normal">Stay Revenue Today</span>
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-neutral-600" />
                </div>
              </div>
              <div className="my-2">
                <div className="text-3xl font-normal font-mono text-neutral-900 tracking-tight">
                  {stats?.financials?.todayRealizedRevenueFormatted || '₹0'}
                </div>
              </div>
              <div className="text-[10px] font-mono text-neutral-600">
                {stats?.financials?.todayRealizedRevenueLabel || 'From stays & arrivals today'}
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* MIDDLE ROW: CHARTS SECTION                           */}
          {/* Left: Interactive Revenue Analytics | Right: Donut   */}
          {/* ==================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Revenue Graph with Dual Metrics & Multi-Timeframes (2/3 width) */}
            <RevenueAnalyticsGraph
              className="lg:col-span-2"
              analytics={stats?.financials?.analytics}
              fallbackMonthlyRevenue={stats?.financials?.monthlyRevenue}
              annualGrossRevenueFormatted={
                stats?.financials?.annualGrossRevenueFormatted || stats?.financials?.grossRevenueFormatted
              }
              metric={graphMetric}
              timeframe={graphTimeframe}
              onMetricChange={setGraphMetric}
              onTimeframeChange={setGraphTimeframe}
            />

            {/* Portfolio Distribution Donut Chart (1/3 width, live database data) */}
            <div className="p-6 rounded-2xl bg-white border border-neutral-200 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-normal text-neutral-900">
                    {distributionView === 'By Property' ? 'Portfolio Distribution' : 'Room Status Overview'}
                  </h3>
                  <p className="text-xs text-neutral-400 font-normal">
                    {distributionView === 'By Property' ? 'Verified rooms by partner hotel' : 'Operational room state breakdown'}
                  </p>
                </div>

                <div className="relative">
                  <select
                    value={distributionView}
                    onChange={(e) => setDistributionView(e.target.value as any)}
                    className="border border-neutral-200 rounded-lg px-2.5 py-1 text-xs font-mono text-neutral-700 bg-white cursor-pointer focus:outline-none focus:border-black appearance-none pr-7 font-normal"
                  >
                    <option value="By Property">By Property</option>
                    <option value="Room Status">Room Status</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Dynamic SVG Donut and Live Legend */}
              {(() => {
                const colors = ['#000000', '#333333', '#555555', '#777777', '#999999', '#CCCCCC'];
                const circumference = 2 * Math.PI * 38; // ~238.76

                let items: Array<{ label: string; count: number; percentage: number; color: string; sublabel?: string }> = [];

                if (distributionView === 'By Property') {
                  const list = stats?.portfolioDistribution || [];
                  items = list.map((p, idx) => ({
                    label: p.hotelName,
                    sublabel: p.city,
                    count: p.roomCount,
                    percentage: p.percentage,
                    color: colors[idx % colors.length],
                  }));
                } else {
                  const counts = stats?.operationalStatusCounts || {};
                  const total = Object.values(counts).reduce((a, b) => a + b, 0);
                  const statusConfig = [
                    { key: 'READY', label: 'Ready for Guest', color: '#000000' },
                    { key: 'OCCUPIED', label: 'Occupied', color: '#404040' },
                    { key: 'DIRTY', label: 'Dirty / Turnover', color: '#737373' },
                    { key: 'CLEANING', label: 'Cleaning In Progress', color: '#999999' },
                    { key: 'INSPECTION', label: 'Under Inspection', color: '#B3B3B3' },
                    { key: 'MAINTENANCE', label: 'Out of Order', color: '#D4D4D4' },
                  ];
                  items = statusConfig
                    .map((sc) => {
                      const count = counts[sc.key] || 0;
                      return {
                        label: sc.label,
                        count,
                        percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
                        color: sc.color,
                      };
                    })
                    .filter((item) => item.count > 0 || total === 0);
                }

                const totalCount = items.reduce((sum, it) => sum + it.count, 0);

                let accumulatedOffset = 0;
                const segments = items.map((item) => {
                  const dashLength = totalCount > 0 ? (item.count / totalCount) * circumference : 0;
                  const offset = -accumulatedOffset;
                  accumulatedOffset += dashLength;
                  return {
                    ...item,
                    dashLength,
                    offset,
                  };
                });

                const topItem = items.length > 0
                  ? items.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), items[0])
                  : null;

                return (
                  <>
                    <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                      {/* SVG Donut */}
                      <div className="relative w-40 h-40 shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          {/* Background track */}
                          <circle cx="50" cy="50" r="38" fill="none" stroke="#F0F0F0" strokeWidth="18" />

                          {totalCount > 0 ? (
                            segments.map((seg, i) => (
                              <circle
                                key={seg.label + i}
                                cx="50"
                                cy="50"
                                r="38"
                                fill="none"
                                stroke={seg.color}
                                strokeWidth="18"
                                strokeDasharray={`${seg.dashLength.toFixed(1)} ${circumference.toFixed(1)}`}
                                strokeDashoffset={seg.offset.toFixed(1)}
                              />
                            ))
                          ) : (
                            <circle cx="50" cy="50" r="38" fill="none" stroke="#E5E5E5" strokeWidth="18" />
                          )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-xs font-mono font-normal text-neutral-400">Total</span>
                          <span className="text-lg font-mono font-normal text-neutral-900">{totalCount}</span>
                        </div>
                      </div>

                      {/* Legend list with real counts */}
                      <div className="space-y-2 text-xs font-mono text-neutral-600 flex-1 max-h-44 overflow-y-auto pr-1">
                        {items.length > 0 ? (
                          items.map((item, i) => (
                            <div key={item.label + i} className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-2 truncate min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="truncate text-neutral-700" title={item.label}>
                                  {item.label}
                                </span>
                              </span>
                              <span className="text-neutral-900 font-normal shrink-0">
                                ({item.count}) <span className="text-neutral-400 text-[10px]">{item.percentage}%</span>
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-neutral-400 text-xs py-4 text-center">No inventory registered.</div>
                        )}
                      </div>
                    </div>

                    {/* Callout Pill */}
                    <div className="p-2.5 rounded-xl bg-black text-white text-[11px] font-mono flex items-center justify-between">
                      <span>
                        {distributionView === 'By Property'
                          ? topItem && topItem.count > 0
                            ? `${topItem.percentage}% — ${topItem.label} holds highest platform room capacity`
                            : 'Platform inventory verified across active partner hotels'
                          : topItem && topItem.count > 0
                          ? `${topItem.count} rooms (${topItem.percentage}%) currently in ${topItem.label.toLowerCase()}`
                          : 'Live operational status synchronized across all properties'}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0 ml-2" />
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* ==================================================== */}
          {/* BOTTOM ROW: BOOKING SCHEDULE & TASKS QUEUE           */}
          {/* Left: Live Bookings Feed | Right: Tasks Queue        */}
          {/* ==================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Booking Calendar Schedule (2/3 width) */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-neutral-200 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-normal text-neutral-900">Recent Bookings</h3>
                  <p className="text-xs text-neutral-400 font-normal">Active property room reservations across platform</p>
                </div>

                <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg px-2.5 py-1 text-xs font-mono text-neutral-700 bg-white">
                  <span>{stats?.reservations?.total || 0} Total Bookings</span>
                </div>
              </div>

              {/* Bookings Feed */}
              <div className="space-y-2.5">
                {reservationsList.length > 0 ? (
                  reservationsList.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition-colors flex items-center justify-between gap-4 font-normal"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-900 font-normal">{b.guestName}</span>
                          <span className="text-[10px] font-mono text-neutral-400">({b.reservationCode})</span>
                          <Badge variant="primary" className="text-[9px] font-normal px-1.5 py-0">
                            {b.status}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-neutral-500 font-normal mt-0.5">
                          {b.hotelName} {b.hotelCity ? `• ${b.hotelCity}` : ''} — {b.roomTypeName}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono text-neutral-900">{b.totalFormatted}</div>
                        <div className="text-[10px] font-mono text-neutral-400">
                          {new Date(b.checkInDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} →{' '}
                          {new Date(b.checkOutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-neutral-400 border border-neutral-100 rounded-xl">
                    No active reservations recorded on platform yet.
                  </div>
                )}
              </div>
            </div>

            {/* Platform Audit & Governance Feed (1/3 width) */}
            <div className="p-6 rounded-2xl bg-white border border-neutral-200 space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-normal text-neutral-900">Platform Activity</h3>
                    <p className="text-xs text-neutral-400 font-normal">Security & governance journal</p>
                  </div>
                  <Badge variant="primary" className="text-[10px] font-normal">
                    {stats?.auditLogs?.total ?? auditLogsList.length} Events
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {auditLogsList.length > 0 ? (
                    auditLogsList.map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition-colors space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-neutral-400">
                            {formatRelativeTime(log.createdAt)}
                          </span>
                          <span className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded text-[10px] font-mono">
                            {log.actorRole}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-neutral-900 font-normal">
                          <ShieldCheck className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                          <span className="truncate">{formatAction(log.action)}</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-neutral-500 font-normal pt-1 border-t border-neutral-100">
                          <span className="truncate max-w-[180px]" title={log.hotelName || log.entityType}>
                            {log.hotelName ? log.hotelName : log.entityType}
                          </span>
                          {log.ipAddress && (
                            <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                              {log.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-neutral-400 border border-neutral-100 rounded-xl">
                      No platform audit activity logged yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 text-center">
                <Link href="/admin/audit" className="w-full">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-neutral-600 hover:text-black font-normal">
                    View Full Audit Journal →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

