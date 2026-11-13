// apps/web/src/app/manage/rates/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiFetch } from '@/lib/api';
import { CancellationPolicy } from '@hbms/shared';
import { CreateRatePlanView } from '@/components/dashboard/CreateRatePlanView';
import {
  DollarSign,
  CalendarDays,
  Plus,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Tag,
  Sliders,
} from 'lucide-react';

function ManagerRatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreatingPlan, setIsCreatingPlan] = useState(() => searchParams?.get('new') === 'true');

  useEffect(() => {
    if (searchParams?.get('new') === 'true') {
      setIsCreatingPlan(true);
    }
  }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ratePlans, setRatePlans] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);

  // Selected Rate Plan for Calendar Override Inspection
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [calendarData, setCalendarData] = useState<any | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Modals state
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Form states: Create Rate Plan
  const [planRoomTypeId, setPlanRoomTypeId] = useState('');
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planBasePrice, setPlanBasePrice] = useState('250.00');
  const [planPolicy, setPlanPolicy] = useState<CancellationPolicy>(CancellationPolicy.FREE_CANCELLATION);
  const [planDeadlineHours, setPlanDeadlineHours] = useState('48');
  const [planIsDefault, setPlanIsDefault] = useState(false);
  const [planActionLoading, setPlanActionLoading] = useState(false);
  const [planModalError, setPlanModalError] = useState<string | null>(null);

  // Form states: Single Date Override
  const [overrideDate, setOverrideDate] = useState('');
  const [overridePrice, setOverridePrice] = useState('');
  const [overrideAvailable, setOverrideAvailable] = useState(true);
  const [overrideActionLoading, setOverrideActionLoading] = useState(false);
  const [overrideModalError, setOverrideModalError] = useState<string | null>(null);

  // Form states: Bulk Date Override
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkAvailable, setBulkAvailable] = useState(true);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkModalError, setBulkModalError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [plansData, typesData] = await Promise.all([
        apiFetch<any[]>('/management/rate-plans'),
        apiFetch<any[]>('/management/room-types'),
      ]);
      setRatePlans(plansData || []);
      setRoomTypes(typesData || []);

      if (plansData && plansData.length > 0 && !selectedPlanId) {
        setSelectedPlanId(plansData[0].id);
      }
      if (typesData && typesData.length > 0 && !planRoomTypeId) {
        setPlanRoomTypeId(typesData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load rate plans');
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarOverrides = async (planId: string) => {
    if (!planId) return;
    try {
      setCalendarLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const future = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const data = await apiFetch<any>(
        `/management/rate-plans/${planId}/calendar?startDate=${today}&endDate=${future}`
      );
      setCalendarData(data);
    } catch (err: any) {
      console.error('Failed to load calendar overrides:', err);
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      loadCalendarOverrides(selectedPlanId);
    }
  }, [selectedPlanId]);

  // Handler: Create Rate Plan
  const handleCreateRatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanActionLoading(true);
    setPlanModalError(null);
    try {
      const basePriceCents = Math.round(parseFloat(planBasePrice) * 100);

      await apiFetch('/management/rate-plans', {
        method: 'POST',
        body: JSON.stringify({
          roomTypeId: planRoomTypeId,
          name: planName,
          description: planDescription,
          basePriceCents,
          cancellationPolicy: planPolicy,
          cancellationDeadlineHours: parseInt(planDeadlineHours, 10),
          isDefault: planIsDefault,
        }),
      });

      setIsCreatePlanModalOpen(false);
      resetPlanForm();
      await loadData();
    } catch (err: any) {
      setPlanModalError(err.message || 'Failed to create rate plan');
    } finally {
      setPlanActionLoading(false);
    }
  };

  // Handler: Set Single Date Override
  const handleSetOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !overrideDate) return;
    setOverrideActionLoading(true);
    setOverrideModalError(null);
    try {
      const priceCents = overridePrice ? Math.round(parseFloat(overridePrice) * 100) : null;

      await apiFetch(`/management/rate-plans/${selectedPlanId}/calendar`, {
        method: 'POST',
        body: JSON.stringify({
          date: overrideDate,
          priceOverrideCents: priceCents,
          isAvailable: overrideAvailable,
        }),
      });

      setIsOverrideModalOpen(false);
      await loadCalendarOverrides(selectedPlanId);
    } catch (err: any) {
      setOverrideModalError(err.message || 'Failed to save override');
    } finally {
      setOverrideActionLoading(false);
    }
  };

  // Handler: Bulk Set Overrides
  const handleBulkOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !bulkStartDate || !bulkEndDate) return;
    setBulkActionLoading(true);
    setBulkModalError(null);
    try {
      const priceCents = bulkPrice ? Math.round(parseFloat(bulkPrice) * 100) : null;

      await apiFetch(`/management/rate-plans/${selectedPlanId}/calendar/bulk`, {
        method: 'POST',
        body: JSON.stringify({
          startDate: bulkStartDate,
          endDate: bulkEndDate,
          priceOverrideCents: priceCents,
          isAvailable: bulkAvailable,
        }),
      });

      setIsBulkModalOpen(false);
      await loadCalendarOverrides(selectedPlanId);
    } catch (err: any) {
      setBulkModalError(err.message || 'Failed to apply bulk overrides');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const resetPlanForm = () => {
    setPlanName('');
    setPlanDescription('');
    setPlanBasePrice('250.00');
    setPlanPolicy(CancellationPolicy.FREE_CANCELLATION);
    setPlanDeadlineHours('48');
    setPlanIsDefault(false);
  };

  const selectedPlan = ratePlans.find((p) => p.id === selectedPlanId);

  return (
    <div className="flex min-h-screen bg-canvas-neutral">
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          {isCreatingPlan ? (
            <CreateRatePlanView
              roomTypes={roomTypes}
              onCancel={() => {
                setIsCreatingPlan(false);
                if (searchParams?.get('new')) {
                  router.replace('/manage/rates');
                }
              }}
              onSuccess={async () => {
                setIsCreatingPlan(false);
                if (searchParams?.get('new')) {
                  router.replace('/manage/rates');
                }
                await loadData();
              }}
            />
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-charcoal-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-normal uppercase tracking-wider text-black bg-neutral-100 px-2 py-0.5 rounded">
                      Rate Engine
                    </span>
                  </div>
                  <h1 className="text-3xl font-normal text-charcoal-900 font-sans tracking-tight mt-1">
                    Rate Plans & Calendar Overrides
                  </h1>
                  <p className="text-sm text-charcoal-600 mt-1 font-light">
                    Define commercial rate policies, integer minor-unit base pricing, and date-specific dynamic overrides.
                  </p>
                </div>

                <Button onClick={() => setIsCreatingPlan(true)} className="gap-2 font-normal">
                  <Plus className="w-4 h-4" /> Add Rate Plan
                </Button>
              </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Active Rate Plans */}
          <div className="space-y-4">
            <h2 className="text-lg font-normal text-charcoal-900 font-sans">Active Rate Plans</h2>

            {loading ? (
              <div className="p-12 text-center text-charcoal-500 font-light">Loading rate plans...</div>
            ) : ratePlans.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <DollarSign className="w-12 h-12 text-charcoal-300 mx-auto mb-3" />
                  <h3 className="text-lg font-normal text-charcoal-800">No rate plans configured</h3>
                  <p className="text-sm text-charcoal-500 max-w-md mx-auto mt-1 mb-4 font-light">
                    Create rate plans linked to your room categories to establish standard and promotional pricing.
                  </p>
                  <Button onClick={() => setIsCreatingPlan(true)} className="font-normal">Create Rate Plan</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ratePlans.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-all border-2 ${
                      selectedPlanId === plan.id
                        ? 'border-black shadow-md ring-2 ring-black/10'
                        : 'border-transparent hover:border-charcoal-200'
                    }`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono uppercase bg-neutral-100 text-black px-2 py-0.5 rounded font-normal">
                            {plan.room_type?.name || 'Category'}
                          </span>
                          <CardTitle className="text-base font-normal text-charcoal-900 mt-1">
                            {plan.name}
                          </CardTitle>
                        </div>
                        {plan.is_default && <Badge variant="success">DEFAULT</Badge>}
                      </div>
                      <CardDescription className="line-clamp-2 font-light">
                        {plan.description || 'Standard flexible commercial rate.'}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-3">
                      <div className="p-3 bg-canvas-neutral rounded-xl flex items-center justify-between">
                        <span className="text-xs font-mono text-charcoal-500 uppercase font-normal">Base Price</span>
                        <span className="text-xl font-normal font-mono text-charcoal-900">
                          ₹{(plan.base_price_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="text-xs text-charcoal-600 space-y-1 font-normal">
                        <p className="flex justify-between">
                          <span>Cancellation:</span>
                          <span className="font-normal text-charcoal-800">{plan.cancellation_policy}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Deadline:</span>
                          <span className="font-normal text-charcoal-800">
                            {plan.cancellation_deadline_hours}h prior
                          </span>
                        </p>
                      </div>

                      <div className="pt-2 border-t border-charcoal-100 flex items-center justify-between text-xs">
                        <span className="text-black font-normal flex items-center gap-1">
                          {selectedPlanId === plan.id ? 'Viewing Overrides' : 'Click to Inspect Calendar'}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Interactive Rate Calendar */}
          {selectedPlan && (
            <Card className="overflow-hidden">
              <CardHeader className="bg-canvas-neutral/50 border-b border-charcoal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase bg-neutral-100 text-black px-2 py-0.5 rounded font-normal">
                      Calendar Inspector
                    </span>
                    <span className="text-xs text-charcoal-500 font-mono font-normal">
                      Base: ₹{(selectedPlan.base_price_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-normal text-charcoal-900 mt-1">
                    {selectedPlan.name} &mdash; Overrides (Next 45 Days)
                  </CardTitle>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOverrideDate(new Date().toISOString().split('T')[0]);
                      setOverridePrice((selectedPlan.base_price_cents / 100).toFixed(2));
                      setIsOverrideModalOpen(true);
                    }}
                    className="gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" /> Single Date Override
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setBulkStartDate(today);
                      setBulkEndDate(today);
                      setBulkPrice((selectedPlan.base_price_cents / 100).toFixed(2));
                      setIsBulkModalOpen(true);
                    }}
                    className="gap-1.5"
                  >
                    <CalendarDays className="w-3.5 h-3.5" /> Bulk Overrides
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {calendarLoading ? (
                  <div className="p-12 text-center text-charcoal-500">Loading calendar overrides...</div>
                ) : !calendarData || calendarData.overrides.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-10 h-10 text-charcoal-300 mx-auto mb-2" />
                    <p className="text-sm font-normal text-charcoal-700">No active date overrides</p>
                    <p className="text-xs text-charcoal-500 max-w-md mx-auto mt-1 font-light">
                      All dates are currently using the default base price of ₹
                      {(selectedPlan.base_price_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Use the buttons above to set seasonal or event pricing.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {calendarData.overrides.map((ov: any) => (
                        <div
                          key={ov.id}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            ov.isAvailable === false
                              ? 'bg-red-50 border-red-200 text-red-800'
                              : 'bg-white border-charcoal-200 shadow-sm'
                          }`}
                        >
                          <span className="text-[11px] font-mono text-charcoal-500 block font-normal">
                            {new Date(ov.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              weekday: 'short',
                            })}
                          </span>
                          <span
                            className={`text-base font-normal font-mono mt-0.5 block ${
                              ov.isAvailable === false ? 'line-through text-red-500' : 'text-black'
                            }`}
                          >
                            {ov.priceOverrideCents !== null
                              ? `₹${(ov.priceOverrideCents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : `₹${(selectedPlan.base_price_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </span>
                          <span className="text-[10px] font-mono mt-1 block font-normal">
                            {ov.isAvailable === false ? (
                              <span className="text-red-600 font-normal">BLACKED OUT</span>
                            ) : ov.priceOverrideCents !== null ? (
                              <span className="text-emerald-600 font-normal">OVERRIDE</span>
                            ) : (
                              <span className="text-charcoal-400 font-normal">BASE RATE</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  </main>

      {/* MODAL: CREATE RATE PLAN */}
      <Modal
        isOpen={isCreatePlanModalOpen}
        onClose={() => setIsCreatePlanModalOpen(false)}
        title="Add Commercial Rate Plan"
      >
        <form onSubmit={handleCreateRatePlan} className="space-y-4">
          {planModalError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {planModalError}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-charcoal-700 block mb-1">Target Room Category *</label>
            <select
              value={planRoomTypeId}
              onChange={(e) => setPlanRoomTypeId(e.target.value)}
              className="w-full text-sm border border-charcoal-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/20/20"
              required
            >
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-charcoal-700 block mb-1">Rate Plan Name *</label>
            <Input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. Non-Refundable Advance Purchase"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-charcoal-700 block mb-1">Description</label>
            <Input
              value={planDescription}
              onChange={(e) => setPlanDescription(e.target.value)}
              placeholder="e.g. 15% discount for non-refundable reservations"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">
                Base Nightly Price (₹) *
              </label>
              <Input
                type="number"
                step="0.01"
                value={planBasePrice}
                onChange={(e) => setPlanBasePrice(e.target.value)}
                placeholder="250.00"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal-700 block mb-1">
                Cancellation Deadline (Hours) *
              </label>
              <Input
                type="number"
                min="0"
                value={planDeadlineHours}
                onChange={(e) => setPlanDeadlineHours(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-charcoal-700 block mb-1">Cancellation Policy *</label>
            <select
              value={planPolicy}
              onChange={(e) => setPlanPolicy(e.target.value as CancellationPolicy)}
              className="w-full text-sm border border-charcoal-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/20/20"
            >
              <option value={CancellationPolicy.FREE_CANCELLATION}>
                FREE CANCELLATION (Full refund before deadline)
              </option>
              <option value={CancellationPolicy.PARTIAL_REFUND}>
                PARTIAL REFUND (Subject to penalty)
              </option>
              <option value={CancellationPolicy.NON_REFUNDABLE}>
                NON-REFUNDABLE (No refund upon cancellation)
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isDefault"
              checked={planIsDefault}
              onChange={(e) => setPlanIsDefault(e.target.checked)}
              className="w-4 h-4 text-black rounded border-charcoal-300 focus:ring-black/20"
            />
            <label htmlFor="isDefault" className="text-xs font-medium text-charcoal-700">
              Set as primary default rate plan for this room category
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-charcoal-200">
            <Button type="button" variant="ghost" onClick={() => setIsCreatePlanModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={planActionLoading}>
              Create Rate Plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: SINGLE DATE OVERRIDE */}
      <Modal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        title="Single Date Override"
      >
        <form onSubmit={handleSetOverride} className="space-y-4">
          {overrideModalError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {overrideModalError}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-charcoal-700 block mb-1">Date *</label>
            <Input
              type="date"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-normal text-charcoal-700 block mb-1">
              Price Override (₹) &mdash; Leave blank to use base rate
            </label>
            <Input
              type="number"
              step="0.01"
              value={overridePrice}
              onChange={(e) => setOverridePrice(e.target.value)}
              placeholder="e.g. 350.00"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="overrideAvail"
              checked={overrideAvailable}
              onChange={(e) => setOverrideAvailable(e.target.checked)}
              className="w-4 h-4 text-black rounded border-charcoal-300 focus:ring-black/20"
            />
            <label htmlFor="overrideAvail" className="text-xs font-medium text-charcoal-700">
              Commercial availability open for booking
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-charcoal-200">
            <Button type="button" variant="ghost" onClick={() => setIsOverrideModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={overrideActionLoading}>
              Save Override
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: BULK DATE OVERRIDE */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Date Range Override"
      >
        <form onSubmit={handleBulkOverride} className="space-y-4">
          {bulkModalError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {bulkModalError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-charcoal-700 block mb-1">Start Date *</label>
              <Input
                type="date"
                value={bulkStartDate}
                onChange={(e) => setBulkStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal-700 block mb-1">End Date *</label>
              <Input
                type="date"
                value={bulkEndDate}
                onChange={(e) => setBulkEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-normal text-charcoal-700 block mb-1">
              Price Override (₹) &mdash; Leave blank for base rate
            </label>
            <Input
              type="number"
              step="0.01"
              value={bulkPrice}
              onChange={(e) => setBulkPrice(e.target.value)}
              placeholder="e.g. 299.00"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="bulkAvail"
              checked={bulkAvailable}
              onChange={(e) => setBulkAvailable(e.target.checked)}
              className="w-4 h-4 text-black rounded border-charcoal-300 focus:ring-black/20"
            />
            <label htmlFor="bulkAvail" className="text-xs font-medium text-charcoal-700">
              Commercial availability open for booking
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-charcoal-200">
            <Button type="button" variant="ghost" onClick={() => setIsBulkModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={bulkActionLoading}>
              Apply Overrides
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function ManagerRatesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas-neutral" />}>
      <ManagerRatesContent />
    </Suspense>
  );
}

