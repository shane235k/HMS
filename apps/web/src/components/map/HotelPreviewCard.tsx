// apps/web/src/components/map/HotelPreviewCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { HotelGeoJsonProperties } from '@hbms/shared';
import { Star, MapPin, Building, ArrowRight, X, ExternalLink, MessageSquare } from 'lucide-react';
import { formatCurrencyMinor } from '@hbms/shared';

interface HotelPreviewCardProps {
  hotel: HotelGeoJsonProperties;
  onClose: () => void;
  onFocus?: () => void;
  className?: string;
  dark?: boolean;
}

export const HotelPreviewCard: React.FC<HotelPreviewCardProps> = ({
  hotel,
  onClose,
  onFocus,
  className = '',
  dark = false,
}) => {
  const formattedPrice =
    hotel.starting_price_cents > 0
      ? formatCurrencyMinor(hotel.starting_price_cents, hotel.currency || 'INR')
      : null;

  const containerClass = dark
    ? `bg-neutral-950/95 backdrop-blur-xl rounded-2xl border border-neutral-800 shadow-2xl p-5 w-80 sm:w-96 text-white animate-in fade-in slide-in-from-bottom-2 duration-200 ${className}`
    : `bg-white/95 backdrop-blur-xl rounded-2xl border border-charcoal-200 shadow-floating p-5 w-80 sm:w-96 text-charcoal-900 animate-in fade-in slide-in-from-bottom-2 duration-200 ${className}`;

  return (
    <div className={containerClass}>
      {/* Header with Category Badge and Close */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Badge className={dark ? 'bg-neutral-800 text-white border-neutral-700 font-normal' : 'bg-black text-white border-black font-normal'}>
            {hotel.category}
          </Badge>
          {hotel.reviews_count && hotel.reviews_count > 0 ? (
            <div className="flex items-center gap-1 text-xs font-normal text-neutral-300">
              <Star className="w-3.5 h-3.5 fill-current text-white" />
              <span className="font-mono">{hotel.star_rating}.0</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs font-normal text-neutral-400">
              <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
              <span>No reviews</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`p-1 rounded-full transition-colors ${
            dark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-charcoal-400 hover:text-charcoal-700 hover:bg-charcoal-100'
          }`}
          aria-label="Close hotel preview"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Hotel Title & Location */}
      <div className="space-y-1.5 mb-3">
        <h3 className={`text-lg font-normal leading-snug ${dark ? 'text-white' : 'text-charcoal-900'}`}>
          {hotel.name}
        </h3>
        <div className={`flex items-center gap-1.5 text-xs ${dark ? 'text-neutral-400' : 'text-charcoal-600'}`}>
          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="truncate">
            {hotel.address ? `${hotel.address}, ` : ''}
            {hotel.city}, {hotel.country}
          </span>
        </div>
      </div>

      {/* Description if present */}
      {hotel.description && (
        <p className={`text-xs line-clamp-2 leading-relaxed mb-4 font-normal ${dark ? 'text-neutral-300' : 'text-charcoal-600'}`}>
          {hotel.description}
        </p>
      )}

      {/* Highlights & Metrics */}
      <div
        className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border mb-4 text-xs font-normal ${
          dark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-canvas-neutral border-charcoal-200/60'
        }`}
      >
        <div>
          <span className={`text-[10px] font-normal block uppercase font-mono ${dark ? 'text-neutral-500' : 'text-charcoal-500'}`}>
            Inventory
          </span>
          <span className={`font-normal flex items-center gap-1 mt-0.5 ${dark ? 'text-neutral-200' : 'text-charcoal-800'}`}>
            <Building className={`w-3.5 h-3.5 ${dark ? 'text-white' : 'text-black'}`} />
            {hotel.total_rooms} Rooms
          </span>
        </div>
        <div>
          <span className={`text-[10px] font-normal block uppercase font-mono ${dark ? 'text-neutral-500' : 'text-charcoal-500'}`}>
            Starting From
          </span>
          <span className={`font-normal font-mono text-sm mt-0.5 block ${dark ? 'text-white' : 'text-black'}`}>
            {formattedPrice ? `${formattedPrice}/night` : 'On request'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Link
          href={`/hotels/${hotel.id}`}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl font-normal text-xs py-2 px-3 transition-colors shadow-sm cursor-pointer select-none ${
            dark ? 'bg-white hover:bg-neutral-200 text-black' : 'bg-black hover:bg-neutral-800 text-white'
          }`}
        >
          <span>Check Availability & Book</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        {onFocus && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onFocus}
            className={`rounded-xl px-2.5 font-normal ${
              dark ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white' : ''
            }`}
            title="Recenter camera on hotel"
          >
            <MapPin className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};
