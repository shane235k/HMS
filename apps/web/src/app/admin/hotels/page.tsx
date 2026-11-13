// apps/web/src/app/admin/hotels/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { apiFetch, ApiError } from '@/lib/api';
import { formatCurrencyMinor } from '@hbms/shared';
import {
  Building2,
  TrendingUp,
  DollarSign,
  BedDouble,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  MapPin,
  Calendar,
  Lock,
  Unlock,
} from 'lucide-react';

interface HotelItem {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  category: string;
  star_rating: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  totalRooms: number;
  totalRoomTypes: number;
  manager?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  _count?: {
    rooms: number;
    room_types: number;
    reservations: number;
  };
}

interface PlatformStats {
  hotels?: {
    total?: number;
    active?: number;
    suspended?: number;
  };
  inventory?: {
    totalRoomsAcrossPlatform?: number;
  };
  rooms?: {
    totalRooms?: number;
  };
  bookings?: {
    totalCount?: number;
    statusBreakdown?: Record<string, number>;
  };
  reservations?: {
    total?: number;
    confirmed?: number;
    checkedIn?: number;
    checkedOut?: number;
    cancelled?: number;
  };
  financials?: {
    grossVolumeCents?: number;
    refundedVolumeCents?: number;
    netVolumeCents?: number;
    grossRevenueFormatted?: string;
    platformNetRevenueFormatted?: string;
    successfulPaymentsCount?: number;
    processedRefundsCount?: number;
  };
}

export default function AdminHotelsPage() {
  const [hotels, setHotels] = useState<HotelItem[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Status Toggle Modal
  const [selectedHotel, setSelectedHotel] = useState<HotelItem | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [hotelsData, statsData] = await Promise.all([
        apiFetch<HotelItem[]>('/admin/hotels'),
        apiFetch<PlatformStats>('/admin/stats'),
      ]);
      setHotels(hotelsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to load platform hotel directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openStatusToggleModal = (hotel: HotelItem) => {
    setSelectedHotel(hotel);
    setStatusReason('');
    setIsStatusModalOpen(true);
  };

  const handleStatusToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel) return;
    setStatusLoading(true);
    setError(null);

    const newStatus = selectedHotel.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    try {
      await apiFetch(`/admin/hotels/${selectedHotel.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          reason: statusReason || `Platform admin status change to ${newStatus}`,
        }),
      });

      setActionSuccess(`Hotel ${selectedHotel.name} has been set to ${newStatus}.`);
      setIsStatusModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to update hotel status');
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas-neutral">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-charcoal-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-normal text-charcoal-900 leading-tight">Registered Hotels Directory</h1>
            <Badge variant="primary" className="text-[11px] font-normal">
              Global Property Portfolio
            </Badge>
          </div>

          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs font-normal">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </header>

        {/* Content */}
        <main className="p-6 space-y-6 max-w-[1600px] w-full">
          {actionSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-normal">{actionSuccess}</span>
              </div>
              <button onClick={() => setActionSuccess(null)} className="text-emerald-600 font-normal">
                ×
              </button>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="font-normal">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-600 font-normal">
                ×
              </button>
            </div>
          )}

          {/* 4 Global Platform Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="highlight" className="p-5 flex flex-col justify-between">
              <span className="text-xs text-neutral-300 font-normal">Active Hotel Portfolio</span>
              <div className="my-2">
                <div className="text-3xl font-normal font-mono">
                  {stats?.hotels ? `${stats.hotels.active ?? 0}/${stats.hotels.total ?? 0}` : '0/0'}
                </div>
              </div>
              <div className="text-[11px] text-neutral-400 font-mono">
                {stats?.hotels?.suspended ?? 0} currently suspended properties
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between bg-white">
              <span className="text-xs text-charcoal-500 font-normal">Global Capacity</span>
              <div className="my-2">
                <div className="text-3xl font-normal font-mono text-charcoal-900">
                  {stats?.inventory?.totalRoomsAcrossPlatform ?? stats?.rooms?.totalRooms ?? 0}
                </div>
              </div>
              <div className="text-[11px] text-charcoal-500 font-mono">
                Physical rooms across verified hotels
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between bg-white">
              <span className="text-xs text-charcoal-500 font-normal">Global Gross Bookings</span>
              <div className="my-2">
                <div className="text-3xl font-normal font-mono text-charcoal-900">
                  {stats?.financials?.grossRevenueFormatted ??
                    formatCurrencyMinor(stats?.financials?.grossVolumeCents ?? 0, 'INR')}
                </div>
              </div>
              <div className="text-[11px] text-emerald-600 font-mono">
                {(stats?.bookings?.totalCount ?? stats?.reservations?.total ?? 0)} lifetime reservations
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between bg-white">
              <span className="text-xs text-charcoal-500 font-normal">Platform Net Commission</span>
              <div className="my-2">
                <div className="text-3xl font-normal font-mono text-black">
                  {stats?.financials?.platformNetRevenueFormatted ??
                    formatCurrencyMinor(stats?.financials?.netVolumeCents ?? 0, 'INR')}
                </div>
              </div>
              <div className="text-[11px] text-charcoal-500 font-mono">
                Voyage platform margin retention
              </div>
            </Card>
          </div>

          {/* Hotel Directory Table */}
          <Card className="p-5 bg-white border-charcoal-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Approved Hotel Properties</CardTitle>
                <CardDescription>
                  Audit property operational status, room capacity, and 1:1 designated managers
                </CardDescription>
              </div>
            </div>

            {loading ? (
              <div className="h-48 rounded-xl bg-canvas-neutral animate-pulse flex items-center justify-center text-xs text-charcoal-400">
                Loading Hotel Directory...
              </div>
            ) : hotels.length === 0 ? (
              <div className="p-8 text-center text-charcoal-500 text-xs">
                No hotels found in the directory.
              </div>
            ) : (
              <div className="space-y-3">
                {hotels.map((h) => (
                  <div
                    key={h.id}
                    className="p-4 rounded-xl border border-charcoal-200 bg-white hover:border-neutral-200 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Hotel Details */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-normal text-charcoal-900">{h.name}</h3>
                        <Badge
                          variant={
                            h.status === 'ACTIVE'
                              ? 'approved'
                              : h.status === 'SUSPENDED'
                              ? 'rejected'
                              : 'neutral'
                          }
                        >
                          {h.status}
                        </Badge>
                        <span className="text-xs font-mono text-charcoal-400">
                          {h.star_rating}-Star {h.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-charcoal-500">
                        <MapPin className="w-3.5 h-3.5 text-charcoal-400" />
                        <span>
                          {h.address}, {h.city}, {h.country}
                        </span>
                        <span>•</span>
                        <span className="font-mono uppercase">{h.currency}</span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-charcoal-600 font-mono pt-1">
                        <span>
                          Physical Rooms: <span className="text-neutral-900">{h.totalRooms || h._count?.rooms || 0}</span>
                        </span>
                        <span>•</span>
                        <span>
                          Room Categories: <span className="text-neutral-900">{h.totalRoomTypes || h._count?.room_types || 0}</span>
                        </span>
                      </div>
                    </div>

                    {/* Manager & Action */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-charcoal-100">
                      {h.manager ? (
                        <div className="p-2.5 rounded-lg bg-canvas-neutral border border-charcoal-200 text-xs space-y-0.5">
                          <div className="text-[10px] text-charcoal-400 font-mono uppercase">
                            Designated Manager
                          </div>
                          <div className="font-normal text-charcoal-900">
                            {h.manager.first_name} {h.manager.last_name}
                          </div>
                          <div className="text-[11px] text-charcoal-500">{h.manager.email}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-charcoal-400 italic">No manager assigned</span>
                      )}

                      <Button
                        variant={h.status === 'ACTIVE' ? 'destructive' : 'primary'}
                        size="sm"
                        onClick={() => openStatusToggleModal(h)}
                        className="gap-1.5 text-xs font-normal"
                      >
                        {h.status === 'ACTIVE' ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Suspend Property</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Reactivate Property</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </main>
      </div>

      {/* Suspend/Reactivate Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={
          selectedHotel?.status === 'ACTIVE'
            ? `Suspend Property — ${selectedHotel?.name}`
            : `Reactivate Property — ${selectedHotel?.name}`
        }
      >
        <form onSubmit={handleStatusToggle} className="space-y-4">
          <p className="text-xs text-charcoal-600 leading-relaxed font-normal">
            {selectedHotel?.status === 'ACTIVE'
              ? 'Suspending this hotel immediately prevents new holds and reservations. Active reservations remain intact. This action is permanently recorded in the system audit log.'
              : 'Reactivating this hotel restores its public visibility and availability for new bookings.'}
          </p>

          <div>
            <label className="block text-xs font-normal text-charcoal-700 mb-1">
              Audit Reason / Administrative Notes
            </label>
            <textarea
              required
              rows={3}
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="e.g. Annual safety compliance audit pending, licensing renewal verified..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-charcoal-200 bg-white font-normal"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsStatusModalOpen(false)}
              className="font-normal"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={selectedHotel?.status === 'ACTIVE' ? 'destructive' : 'primary'}
              size="sm"
              disabled={statusLoading}
              className="font-normal"
            >
              {statusLoading
                ? 'Updating...'
                : selectedHotel?.status === 'ACTIVE'
                ? 'Confirm Suspension'
                : 'Confirm Reactivation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
