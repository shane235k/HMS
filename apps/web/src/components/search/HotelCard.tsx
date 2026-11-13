// apps/web/src/components/search/HotelCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HotelSearchResult } from '@hbms/shared';
import {
  MapPin,
  Star,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building,
  Wifi,
  Sparkles,
  Calendar,
  MessageSquare,
} from 'lucide-react';

interface HotelCardProps {
  hotel: HotelSearchResult;
  checkInDate?: string;
  checkOutDate?: string;
  guests?: number | string;
  rooms?: number | string;
  totalNights?: number;
}

export const HotelCard: React.FC<HotelCardProps> = ({
  hotel,
  checkInDate,
  checkOutDate,
  guests = 2,
  rooms = 1,
  totalNights,
}) => {
  // Build query string for hotel details page to preserve search parameters
  const queryParams = new URLSearchParams();
  if (checkInDate) queryParams.set('checkIn', checkInDate);
  if (checkOutDate) queryParams.set('checkOut', checkOutDate);
  if (guests) queryParams.set('guests', String(guests));
  if (rooms) queryParams.set('rooms', String(rooms));

  const detailsUrl = `/hotels/${hotel.id}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const formatPrice = (cents: number) => {
    return `₹${Math.round(cents / 100).toLocaleString('en-IN')}`;
  };

  const nightsCount = totalNights && totalNights > 0 ? totalNights : 0;
  const hasDates = Boolean(checkInDate && checkOutDate && nightsCount > 0);

  return (
    <div className="group rounded-[30px] border border-neutral-200/80 bg-white overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Cover Image & Badges */}
        <div className="relative h-60 w-full bg-neutral-100 overflow-hidden">
          <Image
            src={hotel.coverImage}
            alt={hotel.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />

          {/* Category Badge */}
          <div className="absolute top-4 left-4 z-20 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-xs font-normal text-neutral-900 shadow-sm">
            {hotel.category}
          </div>

          {/* Rating Badges */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5">
            {hotel.totalReviews && hotel.totalReviews > 0 ? (
              <div className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-xs font-normal text-white flex items-center gap-1.5 shadow-sm">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{hotel.guestRating || hotel.starRating}.0</span>
                <span className="text-neutral-400 text-[11px]">({hotel.totalReviews})</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-xs font-normal text-white flex items-center gap-1.5 shadow-sm">
                <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                <span>No reviews</span>
              </div>
            )}
          </div>

          {/* Availability Pill */}
          <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs text-white bg-black/75 backdrop-blur-md px-3 py-1 rounded-full font-light border border-white/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{hotel.isAvailable ? 'Available for your stay' : 'Inventory open'}</span>
            </span>
            <span className="text-[11px] text-white/90 font-light drop-shadow-sm">
              {hotel.availableRoomTypesCount} room option{hotel.availableRoomTypesCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Content Info */}
        <div className="p-6 space-y-3.5">
          {/* Title */}
          <div>
            <h3 className="text-xl font-normal text-neutral-900 line-clamp-1 group-hover:text-black transition-colors">
              {hotel.name}
            </h3>
            <p className="flex items-center gap-1.5 text-sm text-neutral-500 font-light mt-1">
              <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
              <span className="truncate">
                {hotel.address ? `${hotel.address}, ` : ''}{hotel.city}, {hotel.country}
              </span>
            </p>
          </div>

          {/* Description */}
          {hotel.description && (
            <p className="text-xs text-neutral-500 font-light line-clamp-2 leading-relaxed">
              {hotel.description}
            </p>
          )}

          {/* Amenities Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {hotel.amenities.slice(0, 4).map((amenity, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full bg-neutral-100 text-[11px] text-neutral-600 font-light"
              >
                {amenity}
              </span>
            ))}
            {hotel.amenities.length > 4 && (
              <span className="px-2 py-1 rounded-full bg-neutral-50 text-[11px] text-neutral-400 font-light">
                +{hotel.amenities.length - 4} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Pricing & View Details Action */}
      <div className="p-6 pt-4 border-t border-neutral-100 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-normal text-neutral-900 tracking-tight">
              {formatPrice(hotel.startingPriceCents)}
            </span>
            <span className="text-xs text-neutral-500 font-light">/ night</span>
          </div>
          {hasDates ? (
            <p className="text-[11px] text-neutral-400 font-light">
              {formatPrice(hotel.totalStayPriceCents)} total for {nightsCount} night{nightsCount > 1 ? 's' : ''} (taxes incl.)
            </p>
          ) : (
            <p className="text-[11px] text-neutral-400 font-light">Starting nightly rate</p>
          )}
        </div>

        <Link
          href={detailsUrl}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-black hover:bg-neutral-800 text-white font-normal text-sm px-6 py-3 transition-all shadow-md select-none shrink-0"
        >
          <span>View Rooms</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
