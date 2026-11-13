// apps/web/src/components/dashboard/CreateRoomTypeView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { DeviceImageDropzone } from '@/components/ui/DeviceImageDropzone';
import { apiFetch, ApiError } from '@/lib/api';
import {
  BedDouble,
  Layers,
  Sparkles,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Users,
  Maximize2,
  Tag,
  ShieldCheck,
  IndianRupee,
} from 'lucide-react';

const COMMON_BED_PRESETS = [
  '1 King Bed',
  '2 Queen Beds',
  '1 King Bed + 1 Daybed',
  '2 Twin Beds',
  '1 Super King Bed',
  '3 Single Beds',
];

const SUGGESTED_AMENITIES = [
  'High-Speed Wi-Fi',
  'Private Balcony',
  'Ocean View',
  'Air Conditioner',
  'Marble Bath',
  'Nespresso Machine',
  'Mini Bar',
  'Smart TV',
  'Room Safe',
  'Work Desk',
  'Lounge Chairs: 2',
  'Bathtub',
  'Butler Service',
  'Walk-in Closet',
];

const SAMPLE_IMAGE_PRESETS = [
  { label: 'Suite Master Bedroom', url: '/images/rooms/ny-empire-suite-1.webp' },
  { label: 'Living Salon & Views', url: '/images/rooms/ny-empire-suite-2.webp' },
  { label: 'Penthouse Panorama', url: '/images/rooms/dubai-royal-penthouse-1.webp' },
  { label: 'Luxury Marble Bath', url: '/images/rooms/dubai-royal-penthouse-2.webp' },
  { label: 'Alpine Lake Balcony', url: '/images/rooms/st-moritz-penthouse-1.webp' },
];

export interface RoomTypeData {
  id?: string;
  name?: string;
  description?: string | null;
  max_guests?: number;
  maxGuests?: number;
  max_adults?: number;
  maxAdults?: number;
  max_children?: number;
  maxChildren?: number;
  bed_type?: string;
  bedType?: string;
  room_size_sqm?: number | null;
  roomSizeSqm?: number | null;
  amenities?: string[];
  images?: string[];
  basePriceCents?: number;
  base_price_cents?: number;
  rate_plans?: Array<{ base_price_cents: number; is_default?: boolean }>;
}

export interface CreateRoomTypeViewProps {
  initialData?: RoomTypeData | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export const CreateRoomTypeView: React.FC<CreateRoomTypeViewProps> = ({
  initialData,
  onCancel,
  onSuccess,
}) => {
  const isEditing = Boolean(initialData && initialData.id);

  // Form States
  const [name, setName] = useState(() => initialData?.name || '');
  const [description, setDescription] = useState(() => initialData?.description || '');
  const [maxGuests, setMaxGuests] = useState(() => String(initialData?.max_guests ?? initialData?.maxGuests ?? '2'));
  const [maxAdults, setMaxAdults] = useState(() => String(initialData?.max_adults ?? initialData?.maxAdults ?? '2'));
  const [maxChildren, setMaxChildren] = useState(() => String(initialData?.max_children ?? initialData?.maxChildren ?? '0'));
  const [bedType, setBedType] = useState(() => initialData?.bed_type ?? initialData?.bedType ?? '1 King Bed');
  const [roomSizeSqm, setRoomSizeSqm] = useState(() => String(initialData?.room_size_sqm ?? initialData?.roomSizeSqm ?? '55.0'));

  const getInitialPrice = () => {
    if (initialData?.rate_plans && initialData.rate_plans.length > 0) {
      const def = initialData.rate_plans.find((rp) => rp.is_default) || initialData.rate_plans[0];
      return String(def.base_price_cents / 100);
    }
    if (initialData?.basePriceCents) return String(initialData.basePriceCents / 100);
    if (initialData?.base_price_cents) return String(initialData.base_price_cents / 100);
    return '25000';
  };
  const [basePrice, setBasePrice] = useState(getInitialPrice);

  // Amenities chip list
  const [amenities, setAmenities] = useState<string[]>(() => {
    if (initialData?.amenities && Array.isArray(initialData.amenities) && initialData.amenities.length > 0) {
      return initialData.amenities;
    }
    return [
      'High-Speed Wi-Fi',
      'Air Conditioner',
      'Private Balcony',
      'Mini Bar',
    ];
  });
  const [customAmenity, setCustomAmenity] = useState('');

  // Images gallery list
  const [images, setImages] = useState<string[]>(() => {
    if (initialData?.images && Array.isArray(initialData.images) && initialData.images.length > 0) {
      return initialData.images;
    }
    return ['/images/rooms/ny-empire-suite-1.webp'];
  });
  const [customImageUrl, setCustomImageUrl] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setMaxGuests(String(initialData.max_guests ?? initialData.maxGuests ?? '2'));
      setMaxAdults(String(initialData.max_adults ?? initialData.maxAdults ?? '2'));
      setMaxChildren(String(initialData.max_children ?? initialData.maxChildren ?? '0'));
      setBedType(initialData.bed_type ?? initialData.bedType ?? '1 King Bed');
      setRoomSizeSqm(String(initialData.room_size_sqm ?? initialData.roomSizeSqm ?? '55.0'));
      if (initialData.amenities && Array.isArray(initialData.amenities)) {
        setAmenities(initialData.amenities);
      }
      if (initialData.images && Array.isArray(initialData.images)) {
        setImages(initialData.images);
      }
    }
  }, [initialData]);

  // Amenities handlers
  const handleAddAmenity = (item: string) => {
    const trimmed = item.trim();
    if (trimmed && !amenities.includes(trimmed)) {
      setAmenities([...amenities, trimmed]);
      setCustomAmenity('');
    }
  };

  const handleRemoveAmenity = (indexToRemove: number) => {
    setAmenities(amenities.filter((_, idx) => idx !== indexToRemove));
  };

  // Image handlers
  const handleAddImage = (url: string) => {
    const trimmed = url.trim();
    if (trimmed && !images.includes(trimmed)) {
      if (images.length >= 3) {
        setError('Maximum of 3 gallery photos allowed per room category.');
        return;
      }
      setImages([...images, trimmed]);
      setCustomImageUrl('');
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(images.filter((_, idx) => idx !== indexToRemove));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedGuests = parseInt(maxGuests, 10);
    const parsedAdults = parseInt(maxAdults, 10);
    const parsedChildren = parseInt(maxChildren, 10);
    const parsedSize = parseFloat(roomSizeSqm || '0');
    const parsedBaseRate = parseFloat(basePrice || '0');

    if (!name.trim()) {
      setError('Please provide a descriptive Room Category Name.');
      return;
    }

    if (isNaN(parsedGuests) || parsedGuests < 1) {
      setError('Max guests capacity must be at least 1 person.');
      return;
    }

    if (isNaN(parsedAdults) || parsedAdults < 1) {
      setError('Max adults capacity must be at least 1 person.');
      return;
    }

    if (!isEditing && (isNaN(parsedBaseRate) || parsedBaseRate <= 0)) {
      setError('Please provide a valid initial nightly base price in ₹.');
      return;
    }

    const basePriceCents = Math.round(parsedBaseRate * 100);

    try {
      setSubmitting(true);
      if (isEditing && initialData?.id) {
        await apiFetch(`/management/room-types/${initialData.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            maxGuests: parsedGuests,
            maxAdults: parsedAdults,
            maxChildren: isNaN(parsedChildren) ? 0 : parsedChildren,
            bedType: bedType.trim(),
            roomSizeSqm: parsedSize > 0 ? parsedSize : undefined,
            amenities,
            images,
          }),
        });
      } else {
        await apiFetch('/management/room-types', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            maxGuests: parsedGuests,
            maxAdults: parsedAdults,
            maxChildren: isNaN(parsedChildren) ? 0 : parsedChildren,
            bedType: bedType.trim(),
            roomSizeSqm: parsedSize > 0 ? parsedSize : undefined,
            amenities,
            images,
            basePriceCents: basePriceCents > 0 ? basePriceCents : undefined,
          }),
        });
      }

      onSuccess();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(
          isEditing
            ? 'Failed to update room type. Please verify inputs and retry.'
            : 'Failed to create room type. Please verify inputs and retry.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

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
              title="Return to Inventory"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-normal text-charcoal-900">
              {isEditing ? 'Edit Room Category' : 'Create Room Category'}
            </h2>
            <Badge variant="neutral" className="font-mono text-[10px] px-2.5 py-0.5 font-normal">
              {isEditing ? 'PMS Inventory Modification' : 'PMS Inventory Specification'}
            </Badge>
          </div>
          <p className="text-xs text-charcoal-500 font-normal">
            {isEditing
              ? 'Update architectural room specification, occupancy limits, room inclusions, and visual assets.'
              : 'Define a new architectural room specification, guest occupancy limits, room inclusions, and default pricing.'}
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
          <span>Back to Room Inventory</span>
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

      {/* Two-Column Registration Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Configuration Sections (Col-span 7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* SECTION 1: CATEGORY IDENTITY */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b border-charcoal-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <BedDouble className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-neutral-900">Room Category Identity</h3>
                  <p className="text-[11px] text-neutral-400 font-normal">Commercial category title and spatial description</p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Room Category Name *"
                  placeholder="e.g. Deluxe Tuileries Suite"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-600 mb-1.5 font-mono">
                    Editorial Room Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the architectural layout, panoramic views, custom furnishings, and atmosphere..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-charcoal-200 text-neutral-900 focus:outline-none focus:border-black font-normal leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-normal uppercase tracking-wider text-neutral-600 mb-1.5 font-mono">
                      Floor Area (Square Meters, m²)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="10"
                      placeholder="e.g. 55.0"
                      value={roomSizeSqm}
                      onChange={(e) => setRoomSizeSqm(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-normal uppercase tracking-wider text-neutral-600 mb-1.5 font-mono">
                      Starting Base Rate (₹ INR / Night) *
                    </label>
                    <Input
                      type="number"
                      step="100"
                      min="100"
                      placeholder="e.g. 25000"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      required
                    />
                    <span className="text-[10px] text-charcoal-400 font-mono mt-1 block font-normal">
                      Automatically generates a primary flexible rate plan.
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* SECTION 2: OCCUPANCY & BED CONFIGURATION */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b border-charcoal-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-neutral-900">Occupancy & Sleeping Layout</h3>
                  <p className="text-[11px] text-neutral-400 font-normal">Maximum guest headcount and bed layout</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Max Guests *"
                    type="number"
                    min="1"
                    max="12"
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(e.target.value)}
                    required
                  />

                  <Input
                    label="Max Adults *"
                    type="number"
                    min="1"
                    max="10"
                    value={maxAdults}
                    onChange={(e) => setMaxAdults(e.target.value)}
                    required
                  />

                  <Input
                    label="Max Children"
                    type="number"
                    min="0"
                    max="6"
                    value={maxChildren}
                    onChange={(e) => setMaxChildren(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-normal uppercase tracking-wider text-neutral-600 mb-1.5 font-mono">
                    Bed Configuration *
                  </label>
                  <Input
                    placeholder="e.g. 1 King Bed"
                    value={bedType}
                    onChange={(e) => setBedType(e.target.value)}
                    required
                  />

                  {/* Bed Configuration Presets */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {COMMON_BED_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBedType(preset)}
                        className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                          bedType === preset
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* SECTION 3: INCLUSIONS & AMENITIES */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b border-charcoal-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-neutral-900">Amenities & Room Inclusions</h3>
                  <p className="text-[11px] text-neutral-400 font-normal">Furnishings, technology, comforts, and bathroom offerings</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Custom Amenity Adder */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom amenity (e.g. Marble Fireplace, Rain Shower)..."
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAmenity(customAmenity);
                      }
                    }}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white border border-charcoal-200 text-neutral-900 focus:outline-none focus:border-black font-normal"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddAmenity(customAmenity)}
                    className="gap-1 text-xs font-normal"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </Button>
                </div>

                {/* Active Amenities Chips */}
                {amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-neutral-50 border border-neutral-200/60 min-h-[44px]">
                    {amenities.map((item, idx) => (
                      <span
                        key={`${item}-${idx}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-neutral-200 text-xs text-neutral-800 font-normal shadow-2xs"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAmenity(idx)}
                          className="text-neutral-400 hover:text-red-600 transition-colors"
                          title="Remove amenity"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Suggested Quick Inclusions */}
                <div>
                  <span className="text-[11px] font-mono text-neutral-400 block mb-1.5">
                    Click to add suggested amenities:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_AMENITIES.map((sug) => {
                      const alreadyAdded = amenities.includes(sug);
                      return (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => !alreadyAdded && handleAddAmenity(sug)}
                          disabled={alreadyAdded}
                          className={`text-[11px] font-mono px-2 py-0.5 rounded-lg border transition-all ${
                            alreadyAdded
                              ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:border-black hover:text-black'
                          }`}
                        >
                          + {sug}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            {/* SECTION 4: VISUAL ASSETS & ROOM GALLERY */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 border-b border-charcoal-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-neutral-900">Room Gallery Assets</h3>
                  <p className="text-[11px] text-neutral-400 font-normal">Drop or upload up to 3 photography assets from your device for the public guest showcase</p>
                </div>
              </div>

              {/* Device Drag & Drop / Upload Component */}
              <DeviceImageDropzone
                images={images}
                onChange={setImages}
                maxImages={3}
                maxFileSizeMb={5}
                label="Room Photography Upload"
                helperText="Drag & drop up to 3 photos directly from your device, or click to browse files (PNG, JPG, WEBP)."
              />

              {/* Alternative: Quick Presets & URL Adder */}
              <div className="pt-3 border-t border-charcoal-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-neutral-400 block">
                    Or select pre-optimized suite photography assets:
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {images.length}/3 slots used
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_IMAGE_PRESETS.map((preset) => {
                    const alreadyAdded = images.includes(preset.url);
                    const disabled = alreadyAdded || images.length >= 3;
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => handleAddImage(preset.url)}
                        disabled={disabled}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded-lg border transition-all ${
                          disabled
                            ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
                            : 'bg-white border-neutral-200 text-neutral-700 hover:border-black hover:text-black'
                        }`}
                      >
                        + {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Optional Custom URL input */}
                {images.length < 3 && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Or paste external image URL..."
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddImage(customImageUrl);
                        }
                      }}
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white border border-charcoal-200 text-neutral-900 focus:outline-none focus:border-black font-normal font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddImage(customImageUrl)}
                      disabled={!customImageUrl.trim() || images.length >= 3}
                      className="gap-1 text-xs font-normal"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add URL</span>
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Live Dossier Preview Card & Submission (Col-span 5) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            {/* Live Room Showcase Card */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Live Room Showcase Preview
                </span>
                <Badge variant="approved" className="font-mono text-[10px] font-normal">
                  Active Specification
                </Badge>
              </div>

              {/* Primary Image Preview */}
              <div className="relative rounded-xl overflow-hidden aspect-video bg-neutral-100 border border-neutral-200">
                <img
                  src={images[0] || '/images/homepage/hotel-modern-facade.webp'}
                  alt={name || 'Room preview'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as any).src = '/images/homepage/hotel-modern-facade.webp';
                  }}
                />
                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-mono">
                  ₹{parseFloat(basePrice || '0').toLocaleString('en-IN')} / night
                </div>
                {images.length > 1 && (
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
                    +{images.length - 1} photos
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-normal text-neutral-900 leading-snug">
                    {name.trim() || 'Room Category Name'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500 font-mono">
                    <span>{bedType}</span>
                    <span>•</span>
                    <span>{roomSizeSqm} m²</span>
                  </div>
                </div>

                {/* Capacity Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 text-[10px] font-mono">
                    Max {maxGuests} Guests
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 text-[10px] font-mono">
                    {maxAdults} Adults
                  </span>
                  {parseInt(maxChildren, 10) > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 text-[10px] font-mono">
                      {maxChildren} Children
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-500 font-normal leading-relaxed line-clamp-3">
                  {description.trim() ||
                    'Add an editorial description detailing architectural notes, balcony orientations, and suite comforts.'}
                </p>

                {/* Amenities List Preview */}
                <div className="pt-2 border-t border-neutral-100">
                  <span className="text-[11px] font-mono text-neutral-400 block mb-2">
                    Inclusions ({amenities.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {amenities.slice(0, 6).map((am, i) => (
                      <span
                        key={`${am}-${i}`}
                        className="px-2 py-0.5 rounded bg-neutral-50 border border-neutral-200 text-[10px] text-neutral-700 font-mono"
                      >
                        ✓ {am}
                      </span>
                    ))}
                    {amenities.length > 6 && (
                      <span className="px-2 py-0.5 rounded bg-neutral-100 text-[10px] text-neutral-500 font-mono">
                        +{amenities.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Operational Impact Card */}
            <Card className="p-6 bg-white border-charcoal-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-800" />
                <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-900">
                  {isEditing ? 'Category Operational Status' : 'What Unlocks For This Category'}
                </h4>
              </div>

              <ul className="space-y-2 text-xs text-neutral-600 font-normal">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0 mt-0.5" />
                  <span>
                    {isEditing
                      ? 'Live update of room size, bedding, and maximum occupancy limits'
                      : 'Immediate assignment of physical room door numbers (e.g. 101, 102)'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0 mt-0.5" />
                  <span>
                    {isEditing
                      ? 'Synchronization of amenities and visual gallery photos for guest booking portal'
                      : 'Automatic creation of a default flexible rate plan in the PMS'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0 mt-0.5" />
                  <span>
                    {isEditing
                      ? 'Preserves linked rate plans and existing physical room assignments'
                      : 'Configurable date-specific calendar rate overrides and blackout windows'}
                  </span>
                </li>
              </ul>

              <div className="pt-2 border-t border-charcoal-100">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  className="w-full py-3 text-xs font-normal rounded-xl justify-center shadow-xs"
                >
                  {isEditing
                    ? submitting
                      ? 'Updating...'
                      : 'Update'
                    : submitting
                    ? 'Creating Room Category...'
                    : 'Confirm & Create Room Category'}
                </Button>
                <p className="text-[10px] text-neutral-400 text-center mt-2 font-mono">
                  {isEditing
                    ? 'This room specification will immediately update across guest bookings and property management consoles.'
                    : 'This room specification will immediately become available across your property management console.'}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

