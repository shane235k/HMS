// apps/web/src/app/hotels/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import {
  BedDouble,
  Calendar,
  Users,
  MapPin,
  Star,
  Check,
  Clock,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Info,
  Timer,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';

export default function HotelAvailabilityPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hotelId = params.id as string;

  // Search criteria - Minimum check-in is today (same-day booking allowed)
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const minCheckIn = formatYMD(now);
  const minCheckOut = formatYMD(tomorrow);

  const getMinCheckOutFor = (inDateStr: string) => {
    if (!inDateStr) return minCheckOut;
    const parts = inDateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] + 1);
    return formatYMD(d);
  };

  const rawQueryIn = searchParams.get('checkInDate') || searchParams.get('checkIn');
  const defaultCheckIn = rawQueryIn && rawQueryIn >= minCheckIn ? rawQueryIn : minCheckIn;
  const rawQueryOut = searchParams.get('checkOutDate') || searchParams.get('checkOut');
  const defaultCheckOut = rawQueryOut && rawQueryOut > defaultCheckIn ? rawQueryOut : getMinCheckOutFor(defaultCheckIn);
  const defaultGuests = searchParams.get('guests') || '2';
  const defaultRooms = searchParams.get('rooms') || '1';

  const [checkInDate, setCheckInDate] = useState(defaultCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(defaultCheckOut);
  const [guests, setGuests] = useState(defaultGuests);
  const [rooms, setRooms] = useState(defaultRooms);

  const handleCheckInChange = (newIn: string) => {
    if (newIn < minCheckIn) {
      newIn = minCheckIn;
    }
    setCheckInDate(newIn);
    const minOut = getMinCheckOutFor(newIn);
    if (!checkOutDate || checkOutDate <= newIn) {
      setCheckOutDate(minOut);
    }
  };

  const handleCheckOutChange = (newOut: string) => {
    const minOut = getMinCheckOutFor(checkInDate);
    if (newOut < minOut) {
      newOut = minOut;
    }
    setCheckOutDate(newOut);
  };

  // Availability data
  const [hotelData, setHotelData] = useState<any | null>(null);
  const [availability, setAvailability] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hold Modal
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState<any | null>(null);
  const [selectedRatePlan, setSelectedRatePlan] = useState<any | null>(null);

  // Guest details form
  const { user } = useAuth();
  const [guestName, setGuestName] = useState(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone || '');
  const [holdLoading, setHoldLoading] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      if (fullName && !guestName) setGuestName(fullName);
      if (user.email && !guestEmail) setGuestEmail(user.email);
      if (user.phone && !guestPhone) setGuestPhone(user.phone);
    }
  }, [user]);

  // Confirmed Hold result
  const [confirmedHold, setConfirmedHold] = useState<any | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(15 * 60);

  // Reviews & Eligibility state
  const [reviewsData, setReviewsData] = useState<{ reviews: any[]; total: number; averageRating: number | null }>({
    reviews: [],
    total: 0,
    averageRating: null,
  });
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    hasReviewed?: boolean;
    reason?: string;
    hotelName?: string;
    reservationId?: string;
    roomTypeId?: string;
    stayDate?: string;
  } | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const loadReviews = async () => {
    try {
      const data = await apiFetch<any>(`/hotels/${hotelId}/reviews?limit=100`);
      setReviewsData({
        reviews: data.reviews || [],
        total: data.totalReviews ?? data.total ?? 0,
        averageRating: data.averageRating ?? null,
      });
    } catch {
      // ignore
    }
  };

  const checkEligibility = async () => {
    if (!user) {
      setEligibility(null);
      return;
    }
    try {
      const res = await apiFetch<any>(`/hotels/${hotelId}/review-eligibility`);
      setEligibility(res);
      if (searchParams.get('review') === 'true' && res.eligible && !res.hasReviewed) {
        setIsReviewModalOpen(true);
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    } catch {
      setEligibility(null);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [hotelId]);

  useEffect(() => {
    checkEligibility();
  }, [hotelId, user]);

  // Countdown timer effect
  useEffect(() => {
    if (!confirmedHold || countdownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [confirmedHold, countdownSeconds]);

  const loadHotel = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any>(`/hotels/id/${hotelId}`);
      setHotelData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load hotel profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async (
    overrideIn?: string,
    overrideOut?: string,
    overrideGuests?: string,
    overrideRooms?: string
  ) => {
    try {
      setSearchLoading(true);
      setError(null);
      const inDate = overrideIn || checkInDate;
      const outDate = overrideOut || checkOutDate;
      const g = overrideGuests || guests;
      const r = overrideRooms || rooms;
      const data = await apiFetch<any>(
        `/hotels/${hotelId}/availability?checkInDate=${inDate}&checkOutDate=${outDate}&guests=${g}&rooms=${r}`
      );
      setAvailability(data);
    } catch (err: any) {
      setError(err.message || 'Availability search error');
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (hotelId) {
      loadHotel();
      fetchAvailability(defaultCheckIn, defaultCheckOut, defaultGuests, defaultRooms);
    }
  }, [hotelId]);

  useEffect(() => {
    const qIn = searchParams.get('checkInDate') || searchParams.get('checkIn');
    const qOut = searchParams.get('checkOutDate') || searchParams.get('checkOut');
    const qGuests = searchParams.get('guests');
    const qRooms = searchParams.get('rooms');
    if (qIn) setCheckInDate(qIn);
    if (qOut) setCheckOutDate(qOut);
    if (qGuests) setGuests(qGuests);
    if (qRooms) setRooms(qRooms);
    if (hotelId && (qIn || qOut || qGuests || qRooms)) {
      fetchAvailability(qIn || undefined, qOut || undefined, qGuests || undefined, qRooms || undefined);
    }
  }, [searchParams, hotelId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAvailability();
  };

  const handleOpenHoldModal = (rt: any, rp: any) => {
    if (!user) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/login?returnUrl=${returnUrl}`);
      return;
    }
    setSelectedRoomType(rt);
    setSelectedRatePlan(rp);
    setHoldError(null);
    setIsHoldModalOpen(true);
  };

  const handleCreateHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/login?returnUrl=${returnUrl}`);
      return;
    }
    if (!selectedRoomType || !selectedRatePlan) return;
    if (checkInDate < minCheckIn) {
      setHoldError(`Check-in date cannot be in the past (minimum ${minCheckIn}).`);
      return;
    }
    if (checkOutDate <= checkInDate) {
      setHoldError('Check-out date must be strictly after the check-in date.');
      return;
    }
    setHoldLoading(true);
    setHoldError(null);
    try {
      const result = await apiFetch<any>(`/hotels/${hotelId}/holds`, {
        method: 'POST',
        body: JSON.stringify({
          checkInDate,
          checkOutDate,
          guestName,
          guestEmail,
          guestPhone,
          rooms: [
            {
              roomTypeId: selectedRoomType.roomTypeId,
              ratePlanId: selectedRatePlan.ratePlanId,
              quantity: isNaN(parseInt(rooms, 10)) || parseInt(rooms, 10) < 1 ? 1 : parseInt(rooms, 10),
            },
          ],
        }),
      });

      setConfirmedHold(result);
      setCountdownSeconds(15 * 60); // 15 minutes
      // Refresh availability in background
      fetchAvailability();
    } catch (err: any) {
      setHoldError(err.message || 'Failed to secure temporary hold');
    } finally {
      setHoldLoading(false);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div className="min-h-screen bg-canvas-neutral flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hotel Header Banner */}
        {loading ? (
          <div className="h-48 bg-white rounded-2xl animate-pulse flex items-center justify-center">
            <span className="text-charcoal-400 font-mono text-sm">Loading hotel sanctuary...</span>
          </div>
        ) : hotelData ? (
          <div className="bg-white rounded-2xl border border-charcoal-200 p-6 sm:p-8 shadow-sm">
            {(() => {
              const hotelThumbnail =
                hotelData.coverImage ||
                (hotelData.images && hotelData.images.length > 0 ? hotelData.images[0] : null) ||
                '/images/homepage/hotel-modern-facade.webp';

              return (
                <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
                  {/* Left Column: Hotel Info & Description */}
                  <div className="space-y-4 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="primary">{hotelData.category}</Badge>
                      {hotelData.totalReviews && hotelData.totalReviews > 0 ? (
                        <div className="flex items-center text-amber-500 text-xs font-normal gap-1">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{hotelData.averageRating || hotelData.star_rating} Stars ({hotelData.totalReviews} reviews)</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-neutral-500 text-xs font-normal gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                          <span>No reviews yet</span>
                        </div>
                      )}
                      <span className="text-xs text-charcoal-400 font-mono font-normal">• Direct Reservation</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-normal text-charcoal-900 font-sans tracking-tight">
                      {hotelData.name}
                    </h1>

                    <p className="text-sm text-charcoal-600 flex items-center gap-1.5 font-normal">
                      <MapPin className="w-4 h-4 text-black shrink-0" />
                      {hotelData.address}, {hotelData.city}, {hotelData.country}
                    </p>

                    <p className="text-sm text-charcoal-600 leading-relaxed font-light whitespace-pre-line">
                      {hotelData.description ||
                        'An exceptional luxury retreat offering bespoke accommodations and refined hospitality.'}
                    </p>
                  </div>

                  {/* Right Column: Single Hotel Thumbnail Image & Property Info (Beside Description) */}
                  <div className="w-full lg:w-[400px] xl:w-[440px] shrink-0 flex flex-col gap-4">
                    {/* Hotel Thumbnail Image */}
                    <div className="relative h-60 sm:h-72 w-full rounded-2xl overflow-hidden border border-neutral-200/90 bg-neutral-100 shadow-sm">
                      <img
                        src={hotelThumbnail}
                        alt={hotelData.name}
                        className="w-full h-full object-cover"
                        onError={(e: any) => {
                          e.currentTarget.src = '/images/homepage/hotel-modern-facade.webp';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-xs font-normal text-neutral-900 shadow-sm">
                        {hotelData.category}
                      </div>
                    </div>

                    {/* Property Specs & Verified Property Badge */}
                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center lg:items-start xl:items-center justify-between gap-3 p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200/60">
                      <div className="space-y-0.5 text-xs text-charcoal-600 font-mono font-normal">
                        <p>Check-in: <span className="font-semibold text-charcoal-900">{hotelData.check_in_time || '14:00'}</span></p>
                        <p>Check-out: <span className="font-semibold text-charcoal-900">{hotelData.check_out_time || '11:00'}</span></p>
                        <p>Currency: <span className="font-semibold text-charcoal-900">{hotelData.currency || 'INR'}</span></p>
                      </div>

                      <div>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 whitespace-nowrap">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          Verified Property & Instant Inventory
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : null}

        {/* Search Dates Bar */}
        <Card className="shadow-md border-neutral-200">
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="text-xs font-normal text-charcoal-700 font-mono uppercase block mb-1.5">
                  Check-in Date
                </label>
                <Input
                  type="date"
                  value={checkInDate}
                  min={minCheckIn}
                  onChange={(e) => handleCheckInChange(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-normal text-charcoal-700 font-mono uppercase block mb-1.5">
                  Check-out Date
                </label>
                <Input
                  type="date"
                  value={checkOutDate}
                  min={getMinCheckOutFor(checkInDate)}
                  onChange={(e) => handleCheckOutChange(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-normal text-charcoal-700 font-mono uppercase block mb-1.5">
                  Guests
                </label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full text-sm border border-charcoal-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/20"
                >
                  <option value="all">Show All Rooms (Any Guests)</option>
                  <option value="1">1 Guest</option>
                  <option value="2">2 Guests</option>
                  <option value="3">3 Guests</option>
                  <option value="4">4 Guests</option>
                  <option value="5">5+ Guests</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-normal text-charcoal-700 font-mono uppercase block mb-1.5">
                  Rooms
                </label>
                <select
                  value={rooms}
                  onChange={(e) => setRooms(e.target.value)}
                  className="w-full text-sm border border-charcoal-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black/20"
                >
                  <option value="all">All Rooms</option>
                  <option value="1">1 Room</option>
                  <option value="2">2 Rooms</option>
                  <option value="3">3 Rooms</option>
                </select>
              </div>

              <div>
                <div className="flex gap-2">
                  <Button type="submit" variant="primary" isLoading={searchLoading} className="flex-1 h-10 gap-1.5 bg-black hover:bg-neutral-800 text-white font-normal rounded-xl">
                    <Calendar className="w-4 h-4" /> Check
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setGuests('all');
                      setRooms('all');
                      fetchAvailability(checkInDate, checkOutDate, 'all', 'all');
                    }}
                    className={`h-10 text-xs px-3 rounded-xl border transition-all whitespace-nowrap cursor-pointer select-none ${
                      guests === 'all' || rooms === 'all'
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-white hover:bg-neutral-100 text-neutral-800 border-charcoal-300'
                    }`}
                    title="Show every room this hotel offers"
                  >
                    Show All
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Verified Stay Review Request Banner (Only for guests with completed stay who haven't reviewed) */}
        {eligibility?.eligible && !eligibility?.hasReviewed && (
          <div className="p-4 rounded-2xl bg-black text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md font-normal">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 fill-white text-white" />
              </div>
              <div>
                <h4 className="text-sm font-normal text-white">You recently stayed at {hotelData?.name || 'this hotel'}</h4>
                <p className="text-xs text-neutral-400 font-normal">
                  Your verified stay review helps fellow travelers. Share your experience with the community.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsReviewModalOpen(true)}
              className="bg-white text-black hover:bg-neutral-200 text-xs font-normal shrink-0"
            >
              Write a Review
            </Button>
          </div>
        )}

        {/* Available Room Types Results */}
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-normal text-charcoal-900 font-sans tracking-tight">
                Available Room Options ({availability?.roomTypes?.length || 0})
              </h2>
              {(guests === 'all' || rooms === 'all') && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black text-white text-[11px] font-mono">
                  Showing Every Room Offered
                </span>
              )}
            </div>
            {availability && (
              <span className="text-xs font-mono text-charcoal-500">
                {availability.totalNights} Night{availability.totalNights > 1 ? 's' : ''} ({availability.checkInDate} &rarr; {availability.checkOutDate})
              </span>
            )}
          </div>

          {searchLoading ? (
            <div className="p-16 text-center text-charcoal-500">
              <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto mb-3" />
              <span>Calculating live night-by-night availability across inventory...</span>
            </div>
          ) : !availability || availability.roomTypes.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <BedDouble className="w-12 h-12 text-charcoal-300 mx-auto mb-3" />
                <h3 className="text-lg font-normal text-charcoal-800">No rooms available for the selected dates</h3>
                <p className="text-sm text-charcoal-500 max-w-md mx-auto mt-1 mb-4">
                  All rooms are fully booked or blocked for maintenance during this period. Try adjusting your dates.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {availability.roomTypes.map((rt: any) => {
                const isAll = guests === 'all' || rooms === 'all';
                const isSoldOut = isAll ? rt.availableQuantity < 1 : rt.availableQuantity < (parseInt(rooms, 10) || 1);

                return (
                  <Card
                    key={rt.roomTypeId}
                    className={`overflow-hidden transition-all border ${
                      isSoldOut ? 'opacity-60 bg-charcoal-50/50' : 'hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row">
                      {/* Left: Thumbnail & Badges */}
                      <div className="lg:w-80 h-56 lg:h-auto bg-charcoal-100 relative overflow-hidden flex items-center justify-center shrink-0">
                        {rt.images && rt.images.length > 0 ? (
                          <img src={rt.images[0]} alt={rt.name} className="w-full h-full object-cover" />
                        ) : (
                          <img
                            src="/images/homepage/hotel-modern-facade.webp"
                            alt={rt.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute top-3 left-3">
                          {isSoldOut ? (
                            <Badge variant="danger">FULLY BOOKED</Badge>
                          ) : (
                            <Badge variant="success">
                              {rt.availableQuantity} Room{rt.availableQuantity > 1 ? 's' : ''} Left
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Middle: Details */}
                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-normal text-charcoal-900 font-sans">{rt.name}</h3>
                              <p className="text-xs text-charcoal-500 font-mono mt-0.5">
                                {rt.bedType} &bull; Up to {rt.maxGuests} Guests ({rt.maxAdults} Adults, {rt.maxChildren} Children)
                                {rt.roomSizeSqm && ` • ${rt.roomSizeSqm} m²`}
                              </p>
                            </div>

                            <Link
                              href={`/hotels/${hotelId}/rooms/${rt.roomTypeId}?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&guests=${guests}&rooms=${rooms}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-300 hover:border-black text-xs font-normal text-neutral-900 transition-colors self-start shrink-0"
                            >
                              <span>View Room Details</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>

                          <p className="text-sm text-charcoal-600 mt-2 line-clamp-2">
                            {rt.description || 'Finely appointed sanctuary with high ceilings, fine linens, and plush amenities.'}
                          </p>

                          {/* Amenities */}
                          {rt.amenities && rt.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-3">
                              {rt.amenities.map((amenity: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-xs font-mono bg-neutral-100 text-neutral-800 px-2.5 py-1 rounded-lg flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3 text-black" />
                                  {amenity}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Rate Plans List for this Room Type */}
                        <div className="pt-4 border-t border-charcoal-100 space-y-3">
                          <p className="text-xs font-mono font-normal uppercase text-charcoal-500">
                            Select Rate Option & Hold Inventory
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {rt.ratePlans.map((rp: any) => {
                              const canBook = rp.isAvailable && !isSoldOut;

                              return (
                                <div
                                  key={rp.ratePlanId}
                                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                                    canBook
                                      ? 'bg-white border-charcoal-200 hover:border-black shadow-sm'
                                      : 'bg-charcoal-50 border-charcoal-200 text-charcoal-400'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className="font-normal text-sm text-charcoal-900">{rp.name}</h4>
                                      {rp.isDefault && <Badge variant="neutral">RECOMMENDED</Badge>}
                                    </div>
                                    <p className="text-xs text-charcoal-500 mt-1">
                                      {rp.cancellationPolicy === 'FREE_CANCELLATION'
                                        ? `Free cancellation up to ${rp.cancellationDeadlineHours}h before arrival`
                                        : rp.cancellationPolicy}
                                    </p>
                                  </div>

                                  <div className="pt-4 mt-3 border-t border-charcoal-100 flex items-end justify-between">
                                    <div>
                                      <span className="text-[10px] font-mono uppercase text-charcoal-500 block">
                                        Total for {availability.totalNights} Night{availability.totalNights > 1 ? 's' : ''} (incl. tax)
                                      </span>
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-xl font-normal font-mono text-black">
                                          ₹{Math.round((rp.totalCents || 0) / 100).toLocaleString('en-IN')}
                                        </span>
                                      </div>
                                    </div>

                                    <Button
                                      size="sm"
                                      disabled={!canBook}
                                      onClick={() => handleOpenHoldModal(rt, rp)}
                                      className="gap-1.5 shrink-0"
                                    >
                                      Hold Room <ArrowRight className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* GUEST REVIEWS SECTION                                */}
        {/* ==================================================== */}
        <section className="mt-16 pt-10 border-t border-charcoal-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-normal text-charcoal-900 tracking-tight">Verified Guest Reviews</h2>
                {reviewsData.total > 0 && (
                  <Badge variant="neutral" className="text-xs font-normal">
                    {reviewsData.total} {reviewsData.total === 1 ? 'Review' : 'Reviews'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-charcoal-500 font-normal mt-0.5">
                Authentic ratings submitted exclusively by guests who completed a stay.
              </p>
            </div>

            {eligibility?.eligible && !eligibility?.hasReviewed ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsReviewModalOpen(true)}
                className="gap-1.5 text-xs font-normal bg-black text-white hover:bg-neutral-800"
              >
                <Star className="w-3.5 h-3.5 fill-white text-white" />
                <span>Write a Review</span>
              </Button>
            ) : eligibility?.hasReviewed ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 text-charcoal-700 text-xs font-normal border border-charcoal-200">
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                <span>You reviewed this hotel</span>
              </div>
            ) : (
              <span className="text-[11px] font-mono text-neutral-400">
                Only verified completed stays can submit reviews
              </span>
            )}
          </div>

          {/* Rating Summary Scorecard */}
          <div className="p-6 rounded-2xl bg-canvas-neutral border border-charcoal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-normal">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-black text-white flex flex-col items-center justify-center font-mono font-normal">
                <span className="text-lg leading-none">
                  {reviewsData.averageRating ? reviewsData.averageRating.toFixed(1) : '—'}
                </span>
                <span className="text-[9px] text-neutral-400 leading-none mt-1">/ 5.0</span>
              </div>
              <div>
                <h4 className="text-sm font-normal text-neutral-900">
                  {reviewsData.averageRating && reviewsData.averageRating >= 4.5
                    ? 'Exceptional Experience'
                    : reviewsData.averageRating && reviewsData.averageRating >= 4.0
                    ? 'Very Good'
                    : reviewsData.averageRating
                    ? 'Recommended Stay'
                    : 'No verified reviews yet'}
                </h4>
                <p className="text-xs text-neutral-500 font-normal">
                  Based on {reviewsData.total} verified reservation{reviewsData.total === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-600 font-normal">
              <ShieldCheck className="w-4 h-4 text-black" />
              <span>100% Verified Guest Reviews &bull; Zero Fake Ratings</span>
            </div>
          </div>

          {/* Individual Reviews Grid */}
          <div className="space-y-3">
            {reviewsData.reviews.length > 0 ? (
              reviewsData.reviews.map((rev: any) => (
                <div
                  key={rev.id}
                  className="p-5 rounded-2xl bg-white border border-charcoal-200 space-y-3 font-normal shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-normal text-neutral-900">
                        {rev.user ? `${rev.user.firstName} ${rev.user.lastName}` : 'Verified Traveler'}
                      </span>
                      <Badge variant="ready" className="text-[9px] font-normal px-1.5 py-0">
                        Verified Stay
                      </Badge>
                      {rev.stayDate && (
                        <span className="text-[11px] font-mono text-neutral-400">&bull; {rev.stayDate}</span>
                      )}
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            rev.rating >= s ? 'fill-black text-black' : 'fill-transparent text-neutral-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Room Booked / Option Taken */}
                  {rev.roomType && (
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-neutral-100 text-charcoal-700 text-xs font-normal">
                      <BedDouble className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span className="text-neutral-500 text-[11px]">Room Booked:</span>
                      <span className="font-medium text-neutral-900 text-xs">{rev.roomType.name}</span>
                      {rev.roomType.bedType && (
                        <span className="text-neutral-400 text-[11px]">&bull; {rev.roomType.bedType}</span>
                      )}
                    </div>
                  )}

                  {rev.title && (
                    <h5 className="text-xs font-normal text-neutral-900">{rev.title}</h5>
                  )}

                  <p className="text-xs text-neutral-600 font-normal leading-relaxed">{rev.comment}</p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center border border-charcoal-200/60 rounded-2xl bg-white text-xs text-neutral-400 font-normal">
                No reviews yet for this hotel. Be the first verified guest to share feedback after your stay!
              </div>
            )}
          </div>
        </section>
      </main>

      {/* MODAL: HOLD CONFIRMATION & GUEST INFO */}
      <Modal
        isOpen={isHoldModalOpen}
        onClose={() => {
          setIsHoldModalOpen(false);
          setConfirmedHold(null);
        }}
        title={confirmedHold ? 'Temporary Hold Confirmed' : 'Lock Temporary Hold'}
      >
        {confirmedHold ? (
          <div className="space-y-5 text-center py-2">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-charcoal-500 font-normal">
                Temporary Inventory Hold Secured
              </span>
              <h3 className="text-2xl font-normal text-charcoal-900 font-mono mt-1">
                {confirmedHold.reservation_code}
              </h3>
            </div>

            {/* Countdown Banner */}
            <div className="p-4 bg-neutral-100 border border-neutral-300 rounded-xl flex items-center justify-center gap-3">
              <Timer className="w-5 h-5 text-black animate-pulse" />
              <div className="text-left">
                <span className="text-xs font-normal text-black block">
                  Time Remaining: {formatTimer(countdownSeconds)}
                </span>
                <span className="text-[11px] text-neutral-600 font-light">
                  Room inventory is reserved and locked exclusively for you.
                </span>
              </div>
            </div>

            <div className="bg-canvas-neutral p-4 rounded-xl text-left text-xs space-y-2 border border-charcoal-200 font-mono">
              <div className="flex justify-between">
                <span className="text-charcoal-500 font-normal">Stay Window:</span>
                <span className="font-normal text-charcoal-800">
                  {checkInDate} &rarr; {checkOutDate} ({availability?.totalNights} Nights)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-500 font-normal">Room Category:</span>
                <span className="font-normal text-charcoal-800">{selectedRoomType?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-500 font-normal">Rate Plan:</span>
                <span className="font-normal text-charcoal-800">{selectedRatePlan?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-500 font-normal">Guest:</span>
                <span className="font-normal text-charcoal-800">{guestName} ({guestEmail})</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-charcoal-200 text-sm">
                <span className="font-normal text-charcoal-900">Total Price:</span>
                <span className="font-normal text-black">
                  ₹{(confirmedHold.total_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <p className="text-xs text-charcoal-500 font-light">
              Your 15-minute room inventory hold is active. Complete simulated payment to permanently secure your booking.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <Link href={`/checkout/${confirmedHold.reservation_code}`}>
                <Button variant="primary" className="w-full gap-2 font-normal shadow-md">
                  <span>Proceed to Checkout & Pay</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-charcoal-500 font-normal"
                onClick={() => {
                  setIsHoldModalOpen(false);
                  setConfirmedHold(null);
                }}
              >
                Close & Continue Browsing
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateHold} className="space-y-4">
            {holdError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {holdError}
              </div>
            )}

            <div className="p-3 bg-canvas-neutral rounded-xl text-xs space-y-1 border border-charcoal-200">
              <p className="font-normal text-charcoal-900">{selectedRoomType?.name}</p>
              <p className="text-charcoal-600 font-mono font-light">
                {selectedRatePlan?.name} &bull; {availability?.totalNights} Night{availability?.totalNights > 1 ? 's' : ''} ({checkInDate} &rarr; {checkOutDate})
              </p>
              <p className="font-mono text-black font-normal text-sm pt-1">
                Total: ₹{(selectedRatePlan?.totalCents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Guest Full Name *</label>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Account Holder Name"
                required
              />
            </div>

            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Email Address *</label>
              <Input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="e.g. guest@example.com"
                required
              />
            </div>

            <div>
              <label className="text-xs font-normal text-charcoal-700 block mb-1">Phone Number *</label>
              <Input
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="e.g. +91 98200 12345"
                required
              />
            </div>

            <div className="p-3 bg-neutral-100 rounded-xl flex items-start gap-2.5 text-xs text-neutral-800 border border-neutral-300">
              <Info className="w-4 h-4 text-black shrink-0 mt-0.5" />
              <span>
                Submitting this form initiates an atomic 15-minute hold on the selected room inventory, preventing other guests from taking it while you checkout.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-charcoal-200">
              <Button type="button" variant="ghost" onClick={() => setIsHoldModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={holdLoading}>
                Confirm 15-Min Hold
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Review Modal (only if eligible and not yet reviewed) */}
      {eligibility?.eligible && !eligibility?.hasReviewed && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          hotelId={hotelId}
          hotelName={hotelData?.name}
          reservationId={eligibility?.reservationId}
          roomTypeId={eligibility?.roomTypeId}
          onSuccess={() => {
            setIsReviewModalOpen(false);
            loadReviews();
            checkEligibility();
          }}
        />
      )}

      <Footer />
    </div>
  );
}

