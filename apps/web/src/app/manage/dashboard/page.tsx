// apps/web/src/app/manage/dashboard/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiFetch, ApiError } from '@/lib/api';
import { HotelSummary, HotelCategory, ApplicationStatus, Role, formatCurrencyMinor } from '@hbms/shared';
import { OperationalRingChart } from '@/components/dashboard/OperationalRingChart';
import { RevenueAnalyticsGraph } from '@/components/dashboard/RevenueAnalyticsGraph';
import { RegisterPropertyView } from '@/components/dashboard/RegisterPropertyView';
import {
  TrendingUp,
  BedDouble,
  IndianRupee,
  ClipboardList,
  Plus,
  Building2,
  Users,
  MapPin,
  Calendar,
  AlertCircle,
  FileCheck2,
  Download,
  Search,
  RefreshCw,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';

export interface DailyOperationsReport {
  date?: string;
  reportDate?: string;
  totalRooms?: number;
  inventory?: {
    totalRooms?: number;
    statusCounts?: Record<string, number>;
    occupancyRatePercent?: number;
  };
  occupancy?: {
    occupiedRooms?: number;
    totalRooms?: number;
    occupancyRateFormatted?: string;
    occupancyRatePercent?: number;
  };
  revenue?: {
    dailyRevenueCents?: number;
    todayCashInflowCents?: number;
    todayCashInflowFormatted?: string;
    todayStayRevenueCents?: number;
    todayStayRevenueFormatted?: string;
    paymentsCollectedTodayCents?: number;
    inHouseStayRevenueCents?: number;
    totalRevenueCents?: number;
    totalRevenueFormatted?: string;
    annualGrossRevenueCents?: number;
    annualGrossRevenueFormatted?: string;
    revPARCents?: number;
    revparCents?: number;
    revparFormatted?: string;
    adrCents?: number;
    adrFormatted?: string;
    analytics?: any;
  };
  analytics?: any;
  monthlyRevenue?: Array<{
    month: string;
    revenueCents: number;
    revenueFormatted: string;
    transactionsCount: number;
  }>;
  roomCategories?: Array<{
    id: string;
    name: string;
    slug: string;
    bedType: string;
    maxGuests: number;
    roomCount: number;
    percentage: number;
    basePriceCents: number;
    basePriceFormatted: string;
    readyCount: number;
    occupiedCount: number;
  }>;
  roomStatusBreakdown?: {
    ready?: number;
    occupied?: number;
    dirty?: number;
    cleaning?: number;
    inspection?: number;
    maintenance?: number;
  };
  roomStatusList?: Array<{
    status: string;
    label: string;
    count: number;
    percentage: number;
    color: string;
    textColor: string;
    badgeColor: string;
    description: string;
  }>;
  frontDesk?: {
    arrivalsCount?: number;
    departuresCount?: number;
    inHouseCount?: number;
    inHouseReservationsCount?: number;
  };
  housekeeping?: {
    totalTasks?: number;
    tasksToday?: number;
    completedTasks?: number;
    completedCleansToday?: number;
    inProgressTasks?: number;
    pendingTasks?: number;
    completionRatePercent?: number;
  };
  maintenance?: {
    openIssuesCount?: number;
    openCount?: number;
  };
}

function ManagerDashboardContent() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [hotel, setHotel] = useState<HotelSummary | null>(null);
  const [dailyReport, setDailyReport] = useState<DailyOperationsReport | null>(null);
  const [reportDate, setReportDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any | null>(null);
  const [graphMetric, setGraphMetric] = useState<'cash_inflow' | 'realized_revenue' | 'compare'>('cash_inflow');
  const [graphTimeframe, setGraphTimeframe] = useState<'today' | 'week' | 'month' | 'year'>('week');
  const [isRegistering, setIsRegistering] = useState(() => searchParams?.get('register') === 'true');

  const canRegister = !hotel && (!application || application.status === ApplicationStatus.REJECTED);

  useEffect(() => {
    if (searchParams?.get('register') === 'true') {
      if (!loading) {
        if (!canRegister) {
          setIsRegistering(false);
          router.replace('/manage/dashboard');
        } else {
          setIsRegistering(true);
        }
      }
    }
  }, [searchParams, canRegister, loading, router]);

  useEffect(() => {
    if (!loading && isRegistering && !canRegister) {
      setIsRegistering(false);
      if (searchParams?.get('register')) {
        router.replace('/manage/dashboard');
      }
    }
  }, [loading, isRegistering, canRegister, searchParams, router]);

  // Role Gate: Redirect non-managers to their assigned operational areas
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

  const loadData = async () => {
    if (user && user.role !== Role.HOTEL_MANAGER) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Attempt to load assigned hotel
      const hotelData = await apiFetch<HotelSummary>('/management/property');
      setHotel(hotelData);

      // Load live operations daily report
      try {
        const report = await apiFetch<DailyOperationsReport>(`/management/reports/daily?date=${reportDate}`);
        setDailyReport(report);
      } catch (err) {
        console.error('Failed to load daily report:', err);
      }
    } catch {
      // If manager has no approved hotel, check application status
      try {
        const appData = await apiFetch<any>('/applications/my');
        setApplication(appData);
      } catch {
        setApplication(null);
      }
      setHotel(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reportDate, user]);

  // If user is receptionist or housekeeping, prevent rendering management controls
  if (user && user.role !== Role.HOTEL_MANAGER && user.role !== Role.PLATFORM_ADMIN) {
    return (
      <div className="flex min-h-screen bg-canvas-neutral items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4 bg-white border-charcoal-200">
          <ShieldAlert className="w-12 h-12 text-neutral-400 mx-auto" />
          <h2 className="text-lg font-normal text-charcoal-900">Restricted Access Portal</h2>
          <p className="text-xs text-charcoal-500 leading-relaxed font-normal">
            Property registration and executive dashboards are restricted to designated Hotel Managers. You are being redirected to your working operational console.
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

  return (
    <div className="flex min-h-screen bg-canvas-neutral">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-charcoal-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-normal text-charcoal-900 leading-tight">
              {isRegistering ? 'Property Registration Dossier' : 'Property Operations Dashboard'}
            </h1>
            {hotel && !isRegistering && (
              <Badge variant="primary" className="text-[11px] font-normal">
                {hotel.name}
              </Badge>
            )}
            {isRegistering && (
              <Badge variant="neutral" className="text-[11px] font-mono font-normal">
                Dossier Submission
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isRegistering ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsRegistering(false);
                  if (searchParams?.get('register')) {
                    router.replace('/manage/dashboard');
                  }
                }}
                className="gap-1.5 text-xs font-normal"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Overview</span>
              </Button>
            ) : (
              <>
                {hotel && (
                  <Link href="/manage/rates">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs font-normal">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Rate Calendar</span>
                    </Button>
                  </Link>
                )}
                {hotel && (
                  <Link href="/manage/inventory">
                    <Button variant="primary" size="sm" className="gap-1.5 text-xs font-normal">
                      <BedDouble className="w-3.5 h-3.5" />
                      <span>Manage Rooms</span>
                    </Button>
                  </Link>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5 text-xs font-normal print:hidden"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="p-6 space-y-6 max-w-[1600px] w-full">
          {loading ? (
            <div className="h-64 rounded-2xl bg-white border border-charcoal-200 animate-pulse flex items-center justify-center text-xs text-charcoal-400 font-normal">
              Loading operational metrics...
            </div>
          ) : isRegistering && canRegister ? (
            <RegisterPropertyView
              onCancel={() => {
                setIsRegistering(false);
                if (searchParams?.get('register')) {
                  router.replace('/manage/dashboard');
                }
              }}
              onSuccess={async () => {
                setIsRegistering(false);
                if (searchParams?.get('register')) {
                  router.replace('/manage/dashboard');
                }
                await refreshUser();
                await loadData();
              }}
            />
          ) : !hotel ? (
            /* Unassigned or Pending Application View */
            <div className="space-y-6">
              {!application ? (
                /* No application submitted yet */
                <Card className="rounded-2xl border-charcoal-200 bg-white shadow-card p-12 text-center max-w-2xl mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-canvas-neutral flex items-center justify-center mx-auto text-charcoal-400">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-normal text-charcoal-900">Welcome to Voyage Partner Network</h2>
                    <p className="text-xs text-charcoal-500 max-w-md mx-auto leading-relaxed font-normal">
                      You are authenticated as a Hotel Manager. To begin accepting guest holds, managing rooms, and configuring rate plans, submit your hotel registration dossier for administrative verification.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    className="gap-2 text-xs font-normal"
                    onClick={() => setIsRegistering(true)}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Register Hotel Property</span>
                  </Button>
                </Card>
              ) : (
                /* Application exists */
                <Card className="rounded-2xl border-charcoal-200 bg-white shadow-card p-8 max-w-2xl mx-auto space-y-6">
                  <div className="flex items-center justify-between border-b border-charcoal-100 pb-4">
                    <div className="flex items-center gap-3">
                      <FileCheck2 className="w-6 h-6 text-charcoal-600" />
                      <div>
                        <h2 className="text-base font-normal text-charcoal-900">
                          {application.hotelName || application.hotel_name || 'Hotel Property Registration'}
                        </h2>
                        <p className="text-xs text-charcoal-400 font-normal">Submitted Dossier Status</p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        application.status === ApplicationStatus.APPROVED
                          ? 'approved'
                          : application.status === ApplicationStatus.PENDING
                          ? 'pending'
                          : application.status === ApplicationStatus.UNDER_REVIEW
                          ? 'primary'
                          : 'rejected'
                      }
                      className="font-normal"
                    >
                      {application.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-normal">
                    <div>
                      <span className="text-charcoal-400">Location:</span>
                      <p className="text-charcoal-800">{application.city}, {application.country}</p>
                    </div>
                    <div>
                      <span className="text-charcoal-400">Property Category:</span>
                      <p className="text-charcoal-800">{application.category}</p>
                    </div>
                    <div>
                      <span className="text-charcoal-400">Business Registration:</span>
                      <p className="font-mono text-charcoal-800">{application.businessRegistrationNumber || application.business_registration_number || '—'}</p>
                    </div>
                    <div>
                      <span className="text-charcoal-400">Tax Identification:</span>
                      <p className="font-mono text-charcoal-800">{application.taxId || application.tax_id || '—'}</p>
                    </div>
                  </div>

                  {application.status === ApplicationStatus.REJECTED && application.rejectionReason && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1 font-normal">
                      <p className="font-normal">Rejection Feedback:</p>
                      <p>{application.rejectionReason}</p>
                    </div>
                  )}

                  {application.status === ApplicationStatus.REJECTED && (
                    <div className="pt-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsRegistering(true)}
                        className="gap-1.5 text-xs font-normal"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Submit New Registration Dossier</span>
                      </Button>
                    </div>
                  )}

                  {application.status === ApplicationStatus.PENDING && (
                    <p className="text-xs text-charcoal-500 bg-canvas-neutral p-3 rounded-lg border border-charcoal-200 font-normal">
                      Your dossier is pending review by the platform administrator. Once verified, room inventory and rate management will unlock immediately.
                    </p>
                  )}
                </Card>
              )}
            </div>
          ) : (
            /* Active Hotel Operational Dashboard */
            <div className="space-y-6">
              {/* Hotel Overview Header Bar */}
              <div className="p-5 rounded-2xl bg-white border border-charcoal-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-normal text-charcoal-900">{hotel.name}</h2>
                    <Badge variant="approved" className="font-normal">Property Active</Badge>
                    <span className="text-xs font-mono text-charcoal-400">
                      {hotel.starRating || (hotel as any).star_rating || 5}-Star {hotel.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-charcoal-500 font-normal">
                    <MapPin className="w-3.5 h-3.5 text-charcoal-400" />
                    <span>{hotel.address}, {hotel.city}, {hotel.country}</span>
                    <span>•</span>
                    <span className="font-mono uppercase">{(hotel as any).currency || 'INR'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <span className="text-charcoal-400 block font-normal">Operations Date</span>
                    <span className="font-mono text-charcoal-800 font-normal">{reportDate}</span>
                  </div>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-charcoal-200 bg-canvas-neutral font-mono focus:bg-white focus:outline-none font-normal"
                  />
                  <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs font-normal">
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh</span>
                  </Button>
                </div>
              </div>

              {/* 5 Top KPI Cards (Live Database Metrics & Dual Revenue Tracking) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Highlighted Accent Card: Occupancy Rate */}
                <Card variant="highlight" className="p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-300 font-normal">Occupancy Rate</span>
                    <TrendingUp className="w-4 h-4 text-neutral-300" />
                  </div>
                  <div className="my-2">
                    <div className="text-3xl font-normal font-mono">
                      {dailyReport?.occupancy?.occupancyRateFormatted ??
                        (dailyReport?.inventory?.occupancyRatePercent !== undefined
                          ? `${dailyReport.inventory.occupancyRatePercent.toFixed(1)}%`
                          : '0.0%')}
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-300 font-mono">
                    {dailyReport?.occupancy
                      ? `${dailyReport.occupancy.occupiedRooms ?? 0} of ${dailyReport.occupancy.totalRooms ?? 0} rooms occupied`
                      : dailyReport?.inventory
                      ? `${dailyReport.inventory.statusCounts?.OCCUPIED ?? 0} of ${dailyReport.inventory.totalRooms ?? 0} rooms occupied`
                      : 'Live database metric'}
                  </div>
                </Card>

                {/* 2. Check-ins Today Card */}
                <Card className="p-5 flex flex-col justify-between bg-white">
                  <div className="flex items-center justify-between text-charcoal-600">
                    <span className="text-xs font-normal">Arrivals & Check-ins</span>
                    <Calendar className="w-4 h-4 text-charcoal-400" />
                  </div>
                  <div className="my-2">
                    <div className="text-3xl font-normal font-mono text-charcoal-900">
                      {dailyReport?.frontDesk?.arrivalsCount ?? 0}
                    </div>
                  </div>
                  <div className="text-[11px] text-charcoal-500 font-mono">
                    {dailyReport?.frontDesk
                      ? `${dailyReport.frontDesk.departuresCount ?? 0} departures • ${dailyReport.frontDesk.inHouseCount ?? dailyReport.frontDesk.inHouseReservationsCount ?? 0} in-house`
                      : 'Live calculation'}
                  </div>
                </Card>

                {/* 3. Cash Inflow Today (Booking / Payment Date) */}
                <Card
                  onClick={() => {
                    setGraphMetric('cash_inflow');
                    setGraphTimeframe('today');
                  }}
                  title="Click to view Cash Inflow on graph"
                  className={`p-5 flex flex-col justify-between bg-white cursor-pointer transition-all hover:border-neutral-400 ${
                    graphMetric === 'cash_inflow' && graphTimeframe === 'today'
                      ? 'border-neutral-900 ring-1 ring-neutral-900'
                      : 'border-charcoal-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-charcoal-600">
                    <span className="text-xs font-normal">Cash Inflow Today</span>
                    <IndianRupee className="w-4 h-4 text-charcoal-400" />
                  </div>
                  <div className="my-2">
                    <div className="text-3xl font-normal font-mono text-charcoal-900">
                      {dailyReport?.revenue?.todayCashInflowFormatted ??
                        formatCurrencyMinor(dailyReport?.revenue?.todayCashInflowCents ?? dailyReport?.revenue?.paymentsCollectedTodayCents ?? 0, 'INR')}
                    </div>
                  </div>
                  <div className="text-[11px] text-charcoal-500 font-normal font-mono">
                    Payments collected today
                  </div>
                </Card>

                {/* 4. Realized Stay Revenue Today (Check-In / Operations Date) */}
                <Card
                  onClick={() => {
                    setGraphMetric('realized_revenue');
                    setGraphTimeframe('today');
                  }}
                  title="Click to view Stay Revenue on graph"
                  className={`p-5 flex flex-col justify-between bg-white cursor-pointer transition-all hover:border-neutral-400 ${
                    graphMetric === 'realized_revenue' && graphTimeframe === 'today'
                      ? 'border-neutral-900 ring-1 ring-neutral-900'
                      : 'border-charcoal-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-charcoal-600">
                    <span className="text-xs font-normal">Stay Revenue Today</span>
                    <Building2 className="w-4 h-4 text-charcoal-400" />
                  </div>
                  <div className="my-2">
                    <div className="text-3xl font-normal font-mono text-charcoal-900">
                      {dailyReport?.revenue?.todayStayRevenueFormatted ??
                        formatCurrencyMinor(dailyReport?.revenue?.todayStayRevenueCents ?? dailyReport?.revenue?.inHouseStayRevenueCents ?? 0, 'INR')}
                    </div>
                  </div>
                  <div className="text-[11px] text-emerald-600 font-normal font-mono">
                    {dailyReport?.revenue
                      ? `RevPAR: ${dailyReport.revenue.revparFormatted ?? formatCurrencyMinor(dailyReport.revenue.revparCents ?? 0, 'INR')} • ADR: ${dailyReport.revenue.adrFormatted ?? formatCurrencyMinor(dailyReport.revenue.adrCents ?? 0, 'INR')}`
                      : 'Active stay revenue'}
                  </div>
                </Card>

                {/* 5. Housekeeping & Maintenance Tasks Card */}
                <Card className="p-5 flex flex-col justify-between bg-white">
                  <div className="flex items-center justify-between text-charcoal-600">
                    <span className="text-xs font-normal">Housekeeping Progress</span>
                    <ClipboardList className="w-4 h-4 text-charcoal-400" />
                  </div>
                  <div className="my-2">
                    <div className="text-3xl font-normal font-mono text-charcoal-900">
                      {dailyReport?.housekeeping
                        ? `${dailyReport.housekeeping.completedTasks ?? dailyReport.housekeeping.completedCleansToday ?? 0}/${dailyReport.housekeeping.totalTasks ?? dailyReport.housekeeping.tasksToday ?? 0}`
                        : '0/0'}
                    </div>
                  </div>
                  <div className="text-[11px] text-charcoal-500 font-mono">
                    {dailyReport?.housekeeping
                      ? `${dailyReport.housekeeping.completionRatePercent ?? 0}% turnover done • ${dailyReport.maintenance?.openIssuesCount ?? dailyReport.maintenance?.openCount ?? 0} open issues`
                      : '0 completed'}
                  </div>
                </Card>
              </div>

              {/* Main Operational & Financial Grid: Left Vertical Completion Bars + Right (Top Line Graph / Bottom Room Categories) */}
              {(() => {
                const totalPhysicalRooms = dailyReport?.totalRooms ?? dailyReport?.inventory?.totalRooms ?? 0;
                const readyRoomsCount = dailyReport?.roomStatusBreakdown?.ready ?? dailyReport?.inventory?.statusCounts?.READY ?? 0;
                const turnoverRoomsCount = (dailyReport?.roomStatusBreakdown?.dirty ?? 0) +
                  (dailyReport?.roomStatusBreakdown?.cleaning ?? 0) +
                  (dailyReport?.roomStatusBreakdown?.inspection ?? 0);

                const roomStatusItems = [
                  {
                    key: 'READY',
                    label: 'Ready for Check-In',
                    count: readyRoomsCount,
                    hexColor: '#000000',
                    color: 'bg-black',
                    dotColor: 'bg-black',
                    badgeColor: 'text-white bg-black border-black',
                    description: 'Cleaned, inspected, and primed for immediate guest allocation',
                  },
                  {
                    key: 'OCCUPIED',
                    label: 'Occupied (In-House)',
                    count: dailyReport?.roomStatusBreakdown?.occupied ?? dailyReport?.inventory?.statusCounts?.OCCUPIED ?? 0,
                    hexColor: '#333333',
                    color: 'bg-[#333333]',
                    dotColor: 'bg-[#333333]',
                    badgeColor: 'text-white bg-[#333333] border-[#333333]',
                    description: 'Active checked-in guests currently residing in room',
                  },
                  {
                    key: 'DIRTY',
                    label: 'Dirty (Post-Checkout)',
                    count: dailyReport?.roomStatusBreakdown?.dirty ?? dailyReport?.inventory?.statusCounts?.DIRTY ?? 0,
                    hexColor: '#555555',
                    color: 'bg-[#555555]',
                    dotColor: 'bg-[#555555]',
                    badgeColor: 'text-white bg-[#555555] border-[#555555]',
                    description: 'Awaiting turnover housekeeping dispatch following departure',
                  },
                  {
                    key: 'CLEANING',
                    label: 'Cleaning in Progress',
                    count: dailyReport?.roomStatusBreakdown?.cleaning ?? dailyReport?.inventory?.statusCounts?.CLEANING ?? 0,
                    hexColor: '#777777',
                    color: 'bg-[#777777]',
                    dotColor: 'bg-[#777777]',
                    badgeColor: 'text-neutral-900 bg-[#777777]/20 border-[#777777]',
                    description: 'Housekeeping staff actively executing turnover protocol',
                  },
                  {
                    key: 'INSPECTION',
                    label: 'Under Inspection',
                    count: dailyReport?.roomStatusBreakdown?.inspection ?? dailyReport?.inventory?.statusCounts?.INSPECTION ?? 0,
                    hexColor: '#999999',
                    color: 'bg-[#999999]',
                    dotColor: 'bg-[#999999]',
                    badgeColor: 'text-neutral-900 bg-[#999999]/20 border-[#999999]',
                    description: 'Cleaning complete; awaiting supervisor quality sign-off',
                  },
                  {
                    key: 'MAINTENANCE',
                    label: 'Out of Order / Repair',
                    count: dailyReport?.roomStatusBreakdown?.maintenance ?? dailyReport?.inventory?.statusCounts?.MAINTENANCE ?? 0,
                    hexColor: '#CCCCCC',
                    color: 'bg-[#CCCCCC]',
                    dotColor: 'bg-[#CCCCCC]',
                    badgeColor: 'text-neutral-900 bg-[#CCCCCC]/30 border-[#CCCCCC]',
                    description: 'Blocked from sale for mechanical, HVAC or plumbing repairs',
                  },
                ].map((item) => ({
                  ...item,
                  percentage: totalPhysicalRooms > 0 ? Number(((item.count / totalPhysicalRooms) * 100).toFixed(1)) : 0,
                }));

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* LEFT COLUMN: Vertical Parent Div with Operational Ring Chart (Col-span 4) */}
                    <Card className="lg:col-span-4 p-5 bg-white border-charcoal-200 shadow-sm">
                      <OperationalRingChart
                        title="Physical Rooms Operational Status"
                        subtitle="Real-time room lifecycle and turnover tracking"
                        totalRooms={totalPhysicalRooms}
                        items={roomStatusItems}
                        turnoverCount={turnoverRoomsCount}
                        readinessScore={totalPhysicalRooms > 0 ? Number(((readyRoomsCount / totalPhysicalRooms) * 100).toFixed(1)) : 0}
                      />
                    </Card>

                    {/* RIGHT COLUMN: Right Top (Line Graph with Shade) + Right Bottom (Room Category Inventory) */}
                    <div className="lg:col-span-8 space-y-6">
                      {/* RIGHT TOP: Interactive Revenue Graph with Dual Metrics & Working Timeframe Selectors */}
                      <RevenueAnalyticsGraph
                        analytics={dailyReport?.revenue?.analytics || dailyReport?.analytics}
                        fallbackMonthlyRevenue={dailyReport?.monthlyRevenue}
                        annualGrossRevenueFormatted={dailyReport?.revenue?.annualGrossRevenueFormatted}
                        metric={graphMetric}
                        timeframe={graphTimeframe}
                        onMetricChange={setGraphMetric}
                        onTimeframeChange={setGraphTimeframe}
                      />

                      {/* RIGHT BOTTOM: Real-Data Replacement for Bookings by Platform (Room Category Inventory & Capacity) */}
                      <Card className="p-6 space-y-4 bg-white border-charcoal-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base font-normal text-charcoal-900">
                              Room Category Inventory & Capacity Distribution
                            </CardTitle>
                            <CardDescription className="text-xs font-normal text-charcoal-500">
                              Real physical rooms categorized by room type, bedding, and baseline pricing
                            </CardDescription>
                          </div>
                          <span className="text-xs font-mono font-normal px-2.5 py-1 rounded bg-canvas-neutral border border-charcoal-200 text-charcoal-700">
                            {dailyReport?.roomCategories?.length || 0} Categories Registered
                          </span>
                        </div>

                        {dailyReport?.roomCategories && dailyReport.roomCategories.length > 0 ? (
                          <div className="space-y-3.5 pt-1">
                            {dailyReport.roomCategories.map((cat) => (
                              <div
                                key={cat.id}
                                className="p-3.5 rounded-xl border border-charcoal-200 bg-canvas-neutral/30 space-y-2 hover:bg-canvas-neutral/60 transition-colors"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-normal text-charcoal-900">{cat.name}</span>
                                    <span className="text-[11px] text-charcoal-500 font-mono">
                                      {cat.bedType} • Max {cat.maxGuests} Guests
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono text-charcoal-900 font-normal">
                                      {cat.basePriceFormatted}
                                    </span>
                                    <span className="text-[10px] text-charcoal-500 font-normal"> / night</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] font-mono text-charcoal-600">
                                  <span>
                                    {cat.roomCount} Rooms ({cat.percentage}% of property capacity)
                                  </span>
                                  <span className="text-neutral-800">
                                    {cat.readyCount} Ready • {cat.occupiedCount} Occupied
                                  </span>
                                </div>

                                <div className="w-full h-2 bg-charcoal-200/60 rounded-full overflow-hidden">
                                  <div
                                    style={{ width: `${Math.min(100, cat.percentage)}%` }}
                                    className="h-full bg-neutral-900 rounded-full transition-all duration-500"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-xs text-charcoal-400 font-mono">
                            No room categories registered in database for this property.
                          </div>
                        )}
                      </Card>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ManagerDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas-neutral" />}>
      <ManagerDashboardContent />
    </Suspense>
  );
}
