// apps/web/src/components/dashboard/CreateRatePlanView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { apiFetch, ApiError } from '@/lib/api';
import { CancellationPolicy } from '@hbms/shared';
import {
  Tag,
  Calendar,
  Layers,
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Percent,
  Sliders,
  DollarSign,
  Coffee,
  Sparkles,
  IndianRupee,
} from 'lucide-react';

export interface RoomTypeOption {
  id: string;
  name: string;
  bed_type?: string;
  bedType?: string;
  room_size_sqm?: number;
  roomSizeSqm?: number;
  base_price_cents?: number;
  basePriceCents?: number;
}

export interface CreateRatePlanViewProps {
  roomTypes: RoomTypeOption[];
  initialRoomTypeId?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

const RATE_PLAN_PRESETS = [
  {
    name: 'Flexible Best Available Rate',
    description: 'Our standard flexible rate with free cancellation up to 48 hours prior to check-in date. Pay at booking with full refund protection.',
    policy: CancellationPolicy.FREE_CANCELLATION,
    deadlineHours: 48,
    multiplier: 1.0,
    isDefault: true,
  },
  {
    name: 'Non-Refundable Saver (15% Off)',
    description: 'Save 15% on your stay by paying in advance. Non-refundable upon booking confirmation.',
    policy: CancellationPolicy.NON_REFUNDABLE,
    deadlineHours: 0,
    multiplier: 0.85,
    isDefault: false,
  },
  {
    name: 'Bed & Breakfast Package',
    description: 'Includes full gourmet buffet breakfast daily for all registered guests in the hotel restaurant and late checkout until 2:00 PM.',
    policy: CancellationPolicy.FREE_CANCELLATION,
    deadlineHours: 48,
    multiplier: 1.15,
    isDefault: false,
  },
  {
    name: 'Extended Stay Experience (7+ Nights)',
    description: 'Special long-stay pricing with complimentary laundry service, airport executive transfers, and 20% dining credits.',
    policy: CancellationPolicy.PARTIAL_REFUND,
    deadlineHours: 72,
    multiplier: 0.8,
    isDefault: false,
  },
];

export const CreateRatePlanView: React.FC<CreateRatePlanViewProps> = ({
  roomTypes,
  initialRoomTypeId,
  onCancel,
  onSuccess,
}) => {
  // Target Room Type
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>(() => {
    if (initialRoomTypeId && roomTypes.some((r) => r.id === initialRoomTypeId)) {
      return initialRoomTypeId;
    }
    return roomTypes.length > 0 ? roomTypes[0].id : '';
  });

  // Selected Room Type Object
  const targetRoomType = roomTypes.find((r) => r.id === selectedRoomTypeId);
  const baseRateINR = targetRoomType
    ? ((targetRoomType.base_price_cents || targetRoomType.basePriceCents || 2500000) / 100)
    : 25000;

  // Form Fields
  const [name, setName] = useState('Flexible Best Available Rate');
  const [description, setDescription] = useState(
    'Our standard flexible rate with free cancellation up to 48 hours prior to check-in date. Full refund protection before deadline.'
  );
  const [priceINR, setPriceINR] = useState(baseRateINR.toString());
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy>(
    CancellationPolicy.FREE_CANCELLATION
  );
  const [deadlineHours, setDeadlineHours] = useState('48');
  const [isDefault, setIsDefault] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update default price when target room type changes
  useEffect(() => {
    if (targetRoomType) {
      const roomBase = (targetRoomType.base_price_cents || targetRoomType.basePriceCents || 2500000) / 100;
      setPriceINR(roomBase.toString());
    }
  }, [selectedRoomTypeId]);

  // Apply Package Preset
  const handleApplyPreset = (preset: typeof RATE_PLAN_PRESETS[0]) => {
    setName(preset.name);
    setDescription(preset.description);
    setCancellationPolicy(preset.policy);
    setDeadlineHours(preset.deadlineHours.toString());
    setIsDefault(preset.isDefault);

    const calculatedPrice = Math.round(baseRateINR * preset.multiplier);
    setPriceINR(calculatedPrice.toString());
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedRoomTypeId) {
      setError('Please select a target Room Category to attach this Rate Plan to.');
      return;
    }

    if (!name.trim()) {
      setError('Please provide a Rate Plan name.');
      return;
    }

    const parsedPrice = parseFloat(priceINR);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Please provide a valid nightly rate in ₹.');
      return;
    }

    const parsedHours = parseInt(deadlineHours, 10);
    const basePriceCents = Math.round(parsedPrice * 100);

    try {
      setSubmitting(true);
      await apiFetch('/management/rate-plans', {
        method: 'POST',
        body: JSON.stringify({
          roomTypeId: selectedRoomTypeId,
          name: name.trim(),
          description: description.trim() || undefined,
          basePriceCents,
          cancellationPolicy,
          cancellationDeadlineHours: isNaN(parsedHours) ? 48 : parsedHours,
          isDefault,
        }),
      });

      onSuccess();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create rate plan. Please verify inputs and retry.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const parsedRateNumber = !isNaN(parseFloat(priceINR)) ? parseFloat(priceINR) : baseRateINR;

  return (
    <div className="space-y-6">
      {/* Header bar within manager workspace */}
      <div className="p-5 rounded-2xl bg-white border border-charcoal-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-lg border border-charcoal-200 hover:bg-neutral-100 text-charcoal-700 transition-colors"
              title="Return to Rates"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-normal text-charcoal-900">Create Commercial Rate Plan</h2>
            <Badge variant="neutral" className="font-mono text-[10px] px-2.5 py-0.5 font-normal">
              Rate Plan Architecture
            </Badge>
          </div>
          <p className="text-xs text-charcoal-500 font-normal">
            Configure a specialized commercial rate plan with custom pricing multipliers, refund policies, and package inclusions tied to a room category.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="gap-1.5 text-xs font-normal"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Rates & Calendar</span>
        </Button>
      </div>

      {/* Form Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 font-normal">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-normal text-red-800">Validation Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Two-Column Form Layout */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Configuration Sections (Col-span 7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* SECTION 1: TARGET ROOM TYPE */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b border-charcoal-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-neutral-900">Target Room Category</h3>
                  <p className="text-[11px] text-neutral-400 font-normal">Select which room category this rate plan applies to</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-normal uppercase tracking-wider text-neutral-600 font-mono">
                  Room Category *
                </label>
                {roomTypes.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-normal">
                    No active room categories found. You must create at least one Room Category in Room Inventory before attaching rate plans.
                  </div>
                ) : (
                  <select
                    value={selectedRoomTypeId}
                    onChange={(e) => setSelectedRoomTypeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-charcoal-200 text-neutral-900 focus:outline-none focus:border-black font-normal"
                    required
                  >
                    {roomTypes.map((rt) => {
                      const base = ((rt.base_price_cents || rt.basePriceCents || 0) / 100).toLocaleString('en-IN');
                      const bed = rt.bed_type || rt.bedType || 'Standard Bed';
                      return (
                        <option key={rt.id} value={rt.id}>
                          {rt.name} &mdash; {bed} (Base: ₹{base}/night)
                        </option>
                      );
                    })}
                  </select>
                )}

                {targetRoomType && (
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 text-xs font-mono text-neutral-600 flex items-center justify-between">
                    <span>Category Reference Base:</span>
                    <span className="text-neutral-900 font-normal">₹{baseRateINR.toLocaleString('en-IN')} / night</span>
                  </div>
                )}
              </div>
            </Card>

            {/* SECTION 2: RATE PLAN IDENTITY & PRESETS */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b border-charcoal-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-neutral-900">Commercial Plan Identity</h3>
                  <p className="text-[11px] text-neutral-400 font-normal">Plan title, editorial benefits, and package inclusions</p>
                </div>
              </div>

              {/* Quick Template Presets */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-neutral-500 block">
                  Quick Package Templates:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {RATE_PLAN_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        name === preset.name
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-800'
                      }`}
                    >
                      <div className="text-xs font-normal truncate">{preset.name}</div>
                      <div
                        className={`text-[10px] mt-0.5 truncate font-mono ${
                          name === preset.name ? 'text-neutral-300' : 'text-neutral-500'
                        }`}
                      >
                        {preset.policy} • {preset.deadlineHours}h •{' '}
                        {preset.multiplier === 1.0 ? 'Base Rate' : `${Math.round(preset.multiplier * 100)}%`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <Input
                  label="Rate Plan Name *"
                  placeholder="e.g. Bed & Breakfast Experience"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-600 mb-1.5 font-mono">
                    Package Description & Inclusions
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Specify package perks, dining vouchers, airport transfers, or special booking rules..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-charcoal-200 text-neutral-900 focus:outline-none focus:border-black font-normal leading-relaxed"
                  />
                </div>
              </div>
            </Card>

            {/* SECTION 3: PRICING & CALCULATION */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b border-charcoal-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-neutral-900">Commercial Pricing</h3>
                  <p className="text-[11px] text-neutral-400 font-normal">Nightly rate in Indian Rupees before calendar date overrides</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-600 mb-1.5 font-mono">
                    Base Rate (₹ INR / Night) *
                  </label>
                  <Input
                    type="number"
                    step="100"
                    min="100"
                    placeholder="e.g. 28500"
                    value={priceINR}
                    onChange={(e) => setPriceINR(e.target.value)}
                    required
                  />
                </div>

                {/* Pricing Multipliers relative to Room Base Price */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-neutral-500 block">
                    Quick Rate Adjustments (vs. Category Base ₹{baseRateINR.toLocaleString('en-IN')}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '-15% Discount', factor: 0.85 },
                      { label: '-10% Promo', factor: 0.9 },
                      { label: 'Exact Base Rate (100%)', factor: 1.0 },
                      { label: '+15% Premium Package', factor: 1.15 },
                      { label: '+25% Luxury Inclusions', factor: 1.25 },
                    ].map((adj) => (
                      <button
                        key={adj.label}
                        type="button"
                        onClick={() => {
                          const calculated = Math.round(baseRateINR * adj.factor);
                          setPriceINR(calculated.toString());
                        }}
                        className="text-[11px] font-mono px-2.5 py-1 rounded-lg border bg-white border-neutral-200 text-neutral-700 hover:border-black hover:text-black transition-all"
                      >
                        {adj.label} (₹{Math.round(baseRateINR * adj.factor).toLocaleString('en-IN')})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* SECTION 4: CANCELLATION POLICIES & TERMS */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b border-charcoal-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-neutral-900">Cancellation Policy & Rules</h3>
                  <p className="text-[11px] text-neutral-400 font-normal">Refund eligibility, deadline window, and default display</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-normal uppercase tracking-wider text-neutral-600 mb-1.5 font-mono">
                      Cancellation Policy Type *
                    </label>
                    <select
                      value={cancellationPolicy}
                      onChange={(e) => {
                        const newPol = e.target.value as CancellationPolicy;
                        setCancellationPolicy(newPol);
                        if (newPol === CancellationPolicy.NON_REFUNDABLE) {
                          setDeadlineHours('0');
                        } else if (deadlineHours === '0') {
                          setDeadlineHours('48');
                        }
                      }}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-charcoal-200 text-neutral-900 focus:outline-none focus:border-black font-normal"
                    >
                      <option value={CancellationPolicy.FREE_CANCELLATION}>
                        FREE CANCELLATION (Full Refund Before Deadline)
                      </option>
                      <option value={CancellationPolicy.PARTIAL_REFUND}>
                        PARTIAL REFUND (50% Refund Before Deadline)
                      </option>
                      <option value={CancellationPolicy.NON_REFUNDABLE}>
                        NON REFUNDABLE (No Refunds)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-normal uppercase tracking-wider text-neutral-600 mb-1.5 font-mono">
                      Cancellation Deadline (Hours Prior to Check-in)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="48"
                      value={deadlineHours}
                      onChange={(e) => setDeadlineHours(e.target.value)}
                      disabled={cancellationPolicy === CancellationPolicy.NON_REFUNDABLE}
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      {['24', '48', '72'].map((hrs) => (
                        <button
                          key={hrs}
                          type="button"
                          disabled={cancellationPolicy === CancellationPolicy.NON_REFUNDABLE}
                          onClick={() => setDeadlineHours(hrs)}
                          className="text-[10px] font-mono px-2 py-0.5 rounded border bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100 disabled:opacity-40"
                        >
                          {hrs} Hours
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Primary Default Rate Plan Toggle */}
                <div className="pt-3 border-t border-charcoal-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-normal text-neutral-900 block">
                      Primary Default Rate Plan
                    </span>
                    <span className="text-[11px] text-neutral-500 font-normal">
                      Display this rate plan as the primary pricing tier shown to prospective guests.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded border-charcoal-300 text-black focus:ring-black cursor-pointer"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Live Rate Plan Preview Card & Submission (Col-span 5) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            {/* Live Rate Plan Card */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Guest Commercial Card Preview
                </span>
                <Badge
                  variant={isDefault ? 'approved' : 'neutral'}
                  className="font-mono text-[10px] font-normal"
                >
                  {isDefault ? 'Primary Default' : 'Optional Package'}
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">
                    {targetRoomType?.name || 'Selected Room Category'}
                  </span>
                  <h3 className="text-lg font-normal text-neutral-900 leading-snug mt-0.5">
                    {name.trim() || 'Commercial Rate Plan Title'}
                  </h3>
                </div>

                {/* Price Display */}
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-neutral-500 block uppercase">Nightly Price</span>
                    <div className="text-2xl font-normal font-mono text-neutral-900 mt-0.5">
                      ₹{parsedRateNumber.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-neutral-400">per night</span>
                </div>

                {/* Cancellation & Inclusions */}
                <div className="space-y-2 text-xs font-normal">
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200/80 bg-white">
                    <span className="text-neutral-600 font-mono text-[11px]">Policy:</span>
                    <Badge variant={cancellationPolicy === CancellationPolicy.NON_REFUNDABLE ? 'neutral' : 'approved'}>
                      {cancellationPolicy.replace('_', ' ')}
                    </Badge>
                  </div>

                  {cancellationPolicy !== CancellationPolicy.NON_REFUNDABLE && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200/80 bg-white">
                      <span className="text-neutral-600 font-mono text-[11px]">Free Cancellation:</span>
                      <span className="font-mono text-neutral-900">Up to {deadlineHours}h prior</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-neutral-500 font-normal leading-relaxed">
                  {description.trim() ||
                    'Describe key package perks and booking provisions to help guests choose the right commercial rate plan.'}
                </p>
              </div>
            </Card>

            {/* Operational Impact Card */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-800" />
                <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-900">
                  What Unlocks For This Rate Plan
                </h4>
              </div>

              <ul className="space-y-2 text-xs text-neutral-600 font-normal">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0 mt-0.5" />
                  <span>Immediate visibility in the guest booking engine for this room category</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0 mt-0.5" />
                  <span>Automatic calculation of guest holds and checkout totals</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0 mt-0.5" />
                  <span>Interactive single-date and bulk calendar rate override management</span>
                </li>
              </ul>

              <div className="pt-2 border-t border-charcoal-100">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  className="w-full py-3 text-xs font-normal rounded-xl justify-center shadow-xs"
                >
                  {submitting ? 'Creating Commercial Rate Plan...' : 'Confirm & Create Rate Plan'}
                </Button>
                <p className="text-[10px] text-neutral-400 text-center mt-2 font-mono">
                  This rate plan will immediately become available across booking reservations.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};
