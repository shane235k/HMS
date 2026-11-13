// apps/web/src/components/search/FilterSidebar.tsx
'use client';

import React, { useState } from 'react';
import { HotelCategory } from '@hbms/shared';
import {
  X,
  Star,
  Check,
  RotateCcw,
  Sliders,
  DollarSign,
  Wifi,
  Sparkles,
} from 'lucide-react';

export interface FilterState {
  minPrice?: number; // in cents
  maxPrice?: number; // in cents
  categories: string[];
  starRatings: number[];
  guestRating?: number;
  amenities: string[];
  features: string[];
}

interface FilterSidebarProps {
  filters: FilterState;
  onApplyFilters: (newFilters: FilterState) => void;
  onClearFilters: () => void;
  onCloseMobile?: () => void;
  activeCount: number;
}

const CATEGORIES = [
  { value: HotelCategory.LUXURY, label: 'Luxury Palace & Grand' },
  { value: HotelCategory.BOUTIQUE, label: 'Boutique & Heritage' },
  { value: HotelCategory.RESORT, label: 'Resort & Island Sanctuary' },
  { value: HotelCategory.BUSINESS, label: 'Executive & Business' },
];

const STAR_OPTIONS = [5, 4, 3];

const GUEST_RATING_OPTIONS = [
  { value: 4.5, label: '4.5+ Exceptional' },
  { value: 4.0, label: '4.0+ Very Good' },
  { value: 3.5, label: '3.5+ Good' },
];

const AMENITY_OPTIONS = [
  'Wi-Fi',
  'Swimming Pool',
  'Spa & Wellness',
  'Fitness Center',
  'Restaurant / Fine Dining',
  'Ocean / Sea View',
  'Balcony',
  'Bar & Lounge',
  'Air Conditioning',
];

const FEATURE_OPTIONS = [
  { id: 'free_cancellation', label: 'Free Cancellation Available' },
  { id: 'instant_confirmation', label: 'Instant Confirmation' },
];

const PRICE_PRESETS = [
  { label: 'Under ₹20,000', min: undefined, max: 2000000 },
  { label: '₹20k - ₹40k', min: 2000000, max: 4000000 },
  { label: '₹40k - ₹70k', min: 4000000, max: 7000000 },
  { label: '₹70,000+', min: 7000000, max: undefined },
];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onApplyFilters,
  onClearFilters,
  onCloseMobile,
  activeCount,
}) => {
  // Local state so user can configure filters before clicking Apply
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // Sync if external filters change
  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const toggleCategory = (cat: string) => {
    setLocalFilters((prev) => {
      const exists = prev.categories.includes(cat);
      const next = exists ? prev.categories.filter((c) => c !== cat) : [...prev.categories, cat];
      return { ...prev, categories: next };
    });
  };

  const toggleStar = (star: number) => {
    setLocalFilters((prev) => {
      const exists = prev.starRatings.includes(star);
      const next = exists ? prev.starRatings.filter((s) => s !== star) : [...prev.starRatings, star];
      return { ...prev, starRatings: next };
    });
  };

  const setGuestRating = (rating?: number) => {
    setLocalFilters((prev) => ({
      ...prev,
      guestRating: prev.guestRating === rating ? undefined : rating,
    }));
  };

  const toggleAmenity = (amenity: string) => {
    setLocalFilters((prev) => {
      const exists = prev.amenities.includes(amenity);
      const next = exists ? prev.amenities.filter((a) => a !== amenity) : [...prev.amenities, amenity];
      return { ...prev, amenities: next };
    });
  };

  const toggleFeature = (featureId: string) => {
    setLocalFilters((prev) => {
      const exists = prev.features.includes(featureId);
      const next = exists ? prev.features.filter((f) => f !== featureId) : [...prev.features, featureId];
      return { ...prev, features: next };
    });
  };

  const applyPresetPrice = (min?: number, max?: number) => {
    setLocalFilters((prev) => ({
      ...prev,
      minPrice: min,
      maxPrice: max,
    }));
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters(localFilters);
    if (onCloseMobile) onCloseMobile();
  };

  const handleClear = () => {
    onClearFilters();
    setLocalFilters({
      minPrice: undefined,
      maxPrice: undefined,
      categories: [],
      starRatings: [],
      guestRating: undefined,
      amenities: [],
      features: [],
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-normal text-neutral-900 tracking-tight">Filters</h3>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-black text-white text-[11px] font-normal">
              {activeCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-neutral-500 hover:text-black transition-colors font-light"
            >
              Clear All
            </button>
          )}

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleApply} className="space-y-6">
        {/* 1. Price Range */}
        <div className="space-y-3">
          <label className="block text-xs font-normal uppercase tracking-wider text-neutral-900">
            Nightly Price Range
          </label>

          {/* Quick presets */}
          <div className="grid grid-cols-2 gap-1.5">
            {PRICE_PRESETS.map((preset, idx) => {
              const isSelected =
                localFilters.minPrice === preset.min && localFilters.maxPrice === preset.max;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPresetPrice(preset.min, preset.max)}
                  className={`text-xs py-1.5 px-2.5 rounded-full border transition-all text-left truncate font-light ${
                    isSelected
                      ? 'border-black bg-black text-white'
                      : 'border-neutral-200 hover:border-black text-neutral-700 bg-neutral-50/50'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Min & Max inputs */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <span className="text-[10px] text-neutral-400 font-light block mb-1">Min (₹)</span>
              <input
                type="number"
                placeholder="0"
                value={localFilters.minPrice ? localFilters.minPrice / 100 : ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) * 100 : undefined;
                  setLocalFilters((prev) => ({ ...prev, minPrice: val }));
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-100/80 border border-neutral-200 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-black font-light"
              />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 font-light block mb-1">Max (₹)</span>
              <input
                type="number"
                placeholder="Any"
                value={localFilters.maxPrice ? localFilters.maxPrice / 100 : ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) * 100 : undefined;
                  setLocalFilters((prev) => ({ ...prev, maxPrice: val }));
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-100/80 border border-neutral-200 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-black font-light"
              />
            </div>
          </div>
        </div>

        {/* 2. Hotel Category */}
        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <label className="block text-xs font-normal uppercase tracking-wider text-neutral-900">
            Property Category
          </label>
          <div className="space-y-1.5">
            {CATEGORIES.map((cat) => {
              const checked = localFilters.categories.includes(cat.value);
              return (
                <label
                  key={cat.value}
                  className="flex items-center gap-2.5 text-xs text-neutral-700 font-light cursor-pointer select-none hover:text-black py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(cat.value)}
                    className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer accent-black"
                  />
                  <span>{cat.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 3. Star Rating */}
        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <label className="block text-xs font-normal uppercase tracking-wider text-neutral-900">
            Star Rating
          </label>
          <div className="space-y-1.5">
            {STAR_OPTIONS.map((stars) => {
              const checked = localFilters.starRatings.includes(stars);
              return (
                <label
                  key={stars}
                  className="flex items-center gap-2.5 text-xs text-neutral-700 font-light cursor-pointer select-none hover:text-black py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleStar(stars)}
                    className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer accent-black"
                  />
                  <div className="flex items-center gap-1">
                    {Array.from({ length: stars }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="ml-1 text-neutral-600">{stars} Stars</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* 4. Guest Rating */}
        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <label className="block text-xs font-normal uppercase tracking-wider text-neutral-900">
            Guest Score
          </label>
          <div className="space-y-1.5">
            {GUEST_RATING_OPTIONS.map((opt) => {
              const selected = localFilters.guestRating === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGuestRating(opt.value)}
                  className={`w-full text-xs py-2 px-3 rounded-xl border text-left flex items-center justify-between transition-all font-light ${
                    selected
                      ? 'border-black bg-neutral-900 text-white'
                      : 'border-neutral-200 hover:border-black text-neutral-700 bg-white'
                  }`}
                >
                  <span>{opt.label}</span>
                  {selected && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Amenities */}
        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <label className="block text-xs font-normal uppercase tracking-wider text-neutral-900">
            Popular Amenities
          </label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-none">
            {AMENITY_OPTIONS.map((amenity) => {
              const checked = localFilters.amenities.includes(amenity);
              return (
                <label
                  key={amenity}
                  className="flex items-center gap-2.5 text-xs text-neutral-700 font-light cursor-pointer select-none hover:text-black py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAmenity(amenity)}
                    className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer accent-black"
                  />
                  <span>{amenity}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 6. Property Features */}
        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <label className="block text-xs font-normal uppercase tracking-wider text-neutral-900">
            Booking Policies
          </label>
          <div className="space-y-1.5">
            {FEATURE_OPTIONS.map((feat) => {
              const checked = localFilters.features.includes(feat.id);
              return (
                <label
                  key={feat.id}
                  className="flex items-center gap-2.5 text-xs text-neutral-700 font-light cursor-pointer select-none hover:text-black py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFeature(feat.id)}
                    className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer accent-black"
                  />
                  <span>{feat.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-neutral-200 space-y-2">
          <button
            type="submit"
            className="w-full rounded-full bg-black hover:bg-neutral-800 text-white py-3 text-xs font-normal transition-all shadow-md cursor-pointer"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="w-full rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2.5 text-xs font-light transition-all cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      </form>
    </div>
  );
};

