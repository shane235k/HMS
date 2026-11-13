// apps/web/src/app/hotels/[id]/rooms/[roomTypeId]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { formatCurrencyMinor } from '@hbms/shared';
import {
  MapPin,
  Calendar,
  Users,
  Star,
  Check,
  ArrowLeft,
  Share2,
  ShieldCheck,
  Sparkles,
  Bed,
  Bath,
  Armchair,
  Wind,
  Wifi,
  Waves,
  Refrigerator,
  Tv,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Lock,
  MessageSquare,
} from 'lucide-react';

export default function RoomDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const hotelId = params.id as string;
  const roomTypeId = params.roomTypeId as string;

  // Strictly future dates helper (minimum tomorrow, not today or past)
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
  const initialCheckIn = rawQueryIn && rawQueryIn >= minCheckIn ? rawQueryIn : minCheckIn;
  const rawQueryOut = searchParams.get('checkOutDate') || searchParams.get('checkOut');
  const initialCheckOut = rawQueryOut && rawQueryOut > initialCheckIn ? rawQueryOut : getMinCheckOutFor(initialCheckIn);
  const queryGuests = searchParams.get('guests') || '2';
  const queryRooms = searchParams.get('rooms') || '1';

  const [checkInDate, setCheckInDate] = useState(initialCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOut);
  const [guests, setGuests] = useState(queryGuests);
  const [rooms, setRooms] = useState(queryRooms);

  // Room data and reviews
  const [roomData, setRoomData] = useState<any | null>(null);
  const [reviewsData, setReviewsData] = useState<any | null>(null);
  const [selectedRatePlanId, setSelectedRatePlanId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Reservation hold state
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [guestName, setGuestName] = useState(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone || '');
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      if (fullName && !guestName) setGuestName(fullName);
      if (user.email && !guestEmail) setGuestEmail(user.email);
      if (user.phone && !guestPhone) setGuestPhone(user.phone);
    }
  }, [user]);

  // Review submission state
  const [newRating, setNewRating] = useState(5);
  const [newReviewTitle, setNewReviewTitle] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    hasReviewed?: boolean;
    reason?: string;
  } | null>(null);

  const checkEligibility = async () => {
    if (!user || !hotelId) {
      setEligibility(null);
      return;
    }
    try {
      const res = await apiFetch<any>(`/hotels/${hotelId}/review-eligibility`);
      setEligibility(res);
    } catch {
      setEligibility(null);
    }
  };

  useEffect(() => {
    checkEligibility();
  }, [hotelId, user]);

  // Fetch Room Type Details from Backend
  const loadRoomDetails = async (
    cIn: string = checkInDate,
    cOut: string = checkOutDate,
    g: string = guests,
    r: string = rooms
  ) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<any>(
        `/hotels/${hotelId}/rooms/${roomTypeId}?checkInDate=${cIn}&checkOutDate=${cOut}&guests=${g}&rooms=${r}`
      );
      setRoomData(res);
      if (res.ratePlans && res.ratePlans.length > 0) {
        const defaultRp = res.ratePlans.find((rp: any) => rp.isDefault) || res.ratePlans[0];
        setSelectedRatePlanId(defaultRp.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load room details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Verified Reviews from Backend
  const loadReviews = async () => {
    try {
      const res = await apiFetch<any>(`/hotels/${hotelId}/reviews?roomTypeId=${roomTypeId}`);
      setReviewsData(res);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    }
  };

  useEffect(() => {
    if (hotelId && roomTypeId) {
      loadRoomDetails(initialCheckIn, initialCheckOut, queryGuests, queryRooms);
      loadReviews();
    }
  }, [hotelId, roomTypeId]);

  // Handle Review Submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewComment.trim()) return;
    try {
      setSubmittingReview(true);
      await apiFetch(`/hotels/${hotelId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: newRating,
          title: newReviewTitle.trim() || undefined,
          comment: newReviewComment.trim(),
          roomTypeId,
        }),
      });
      setNewReviewTitle('');
      setNewReviewComment('');
      setReviewSuccess(true);
      await loadReviews();
      await checkEligibility();
      setTimeout(() => setReviewSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCheckInChange = (newIn: string) => {
    if (newIn < minCheckIn) {
      newIn = minCheckIn;
    }
    setCheckInDate(newIn);
    let newOut = checkOutDate;
    const minOut = getMinCheckOutFor(newIn);
    if (!newOut || newOut <= newIn) {
      newOut = minOut;
      setCheckOutDate(newOut);
    }
    loadRoomDetails(newIn, newOut, guests, rooms);
  };

  const handleCheckOutChange = (newOut: string) => {
    const minOut = getMinCheckOutFor(checkInDate);
    if (newOut < minOut) {
      newOut = minOut;
    }
    setCheckOutDate(newOut);
    loadRoomDetails(checkInDate, newOut, guests, rooms);
  };

  // Handle Temporary Hold Reservation
  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/login?returnUrl=${returnUrl}`);
      return;
    }
    if (!selectedRatePlanId) return;

    if (checkInDate < minCheckIn) {
      setReserveError(`Check-in date cannot be in the past (minimum ${minCheckIn}).`);
      return;
    }
    if (checkOutDate <= checkInDate) {
      setReserveError('Check-out date must be strictly after the check-in date.');
      return;
    }

    try {
      setReserveLoading(true);
      setReserveError(null);
      const holdRes = await apiFetch<any>(`/hotels/${hotelId}/holds`, {
        method: 'POST',
        body: JSON.stringify({
          checkInDate,
          checkOutDate,
          guestName,
          guestEmail,
          guestPhone,
          rooms: [
            {
              roomTypeId,
              ratePlanId: selectedRatePlanId,
              quantity: isNaN(parseInt(rooms, 10)) || parseInt(rooms, 10) < 1 ? 1 : parseInt(rooms, 10),
            },
          ],
        }),
      });

      // Redirect to checkout payment page
      const resCode = holdRes?.reservation_code || holdRes?.reservationCode;
      if (resCode) {
        router.push(`/checkout/${resCode}`);
      } else {
        router.push('/reservations');
      }
    } catch (err: any) {
      setReserveError(err.message || 'Failed to secure room reservation');
    } finally {
      setReserveLoading(false);
    }
  };

  // Calculate pricing
  const totalNights = Math.max(
    1,
    Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)) || 1
  );

  const selectedRatePlan = roomData?.ratePlans?.find((rp: any) => rp.id === selectedRatePlanId) || roomData?.ratePlans?.[0];
  const nightlyRateCents = selectedRatePlan?.basePriceCents || 0;
  const subtotalCents = nightlyRateCents * totalNights * parseInt(rooms, 10);
  const taxCents = Math.round((subtotalCents * (roomData?.hotel?.taxRateBps || 1200)) / 10000);
  const feesCents = Math.round(subtotalCents * 0.05); // 5% service fee
  const grandTotalCents = subtotalCents + taxCents + feesCents;

  const copyShareLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Collage Images with Graceful High-Res Fallbacks
  const sampleImages = [
    '/images/homepage/hotel-resort-overwater.webp',
    '/images/homepage/dest-tropical-coast.webp',
    '/images/homepage/dest-misty-lake.webp',
  ];

  const collageImages = [
    roomData?.images?.[0] || sampleImages[0],
    roomData?.images?.[1] || sampleImages[1],
    roomData?.images?.[2] || sampleImages[2],
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans">
      <Navbar />

      <main className="flex-1 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-6 w-full space-y-8">
        {/* Top Header Bar & Breadcrumb Navigation */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/hotels/${hotelId}?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&guests=${guests}&rooms=${rooms}`}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Hotel Overview</span>
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="text-xs font-normal text-neutral-900">{roomData?.name || 'Room Details'}</span>
          </div>

          <button
            type="button"
            onClick={copyShareLink}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-black px-3 py-1.5 rounded-full border border-neutral-200 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedLink ? 'Link Copied!' : 'Share Room'}</span>
          </button>
        </div>

        {loading ? (
          <div className="p-24 text-center space-y-4">
            <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-neutral-500 font-light">Loading verified room details & pricing...</p>
          </div>
        ) : error || !roomData ? (
          <div className="p-12 text-center bg-red-50 rounded-3xl border border-red-200 space-y-3">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <h3 className="text-base font-normal text-red-900">{error || 'Room not found'}</h3>
            <Link href={`/hotels/${hotelId}`} className="inline-block text-xs text-black underline">
              Return to property overview
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {/* ======================================================== */}
            {/* 1. VISUAL GALLERY COLLAGE (Matching Reference Screenshot) */}
            {/* 1 Hero Photo on Left + 2 Stacked Photos on Right         */}
            {/* ======================================================== */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5 rounded-[32px] overflow-hidden">
              {/* Left Column: Large Hero Image (2/3 width on desktop) */}
              <div className="md:col-span-2 relative h-[360px] sm:h-[480px] lg:h-[540px] rounded-2xl md:rounded-l-3xl md:rounded-r-none overflow-hidden group">
                <img
                  src={collageImages[0]}
                  alt={roomData.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e: any) => {
                    e.currentTarget.src = sampleImages[0];
                  }}
                />
                <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-xs font-normal text-neutral-900 shadow-sm">
                  {roomData.hotel.name}
                </div>
              </div>

              {/* Right Column: 2 Stacked Images (1/3 width on desktop) */}
              <div className="md:col-span-1 grid grid-cols-2 md:grid-cols-1 gap-3.5 h-[240px] sm:h-[480px] lg:h-[540px]">
                {/* Top Right Photo */}
                <div className="relative h-full rounded-2xl md:rounded-tr-3xl overflow-hidden group">
                  <img
                    src={collageImages[1]}
                    alt={`${roomData.name} view 2`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e: any) => {
                      e.currentTarget.src = sampleImages[1];
                    }}
                  />
                </div>

                {/* Bottom Right Photo */}
                <div className="relative h-full rounded-2xl md:rounded-br-3xl overflow-hidden group">
                  <img
                    src={collageImages[2]}
                    alt={`${roomData.name} view 3`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e: any) => {
                      e.currentTarget.src = sampleImages[2];
                    }}
                  />
                </div>
              </div>
            </section>

            {/* ======================================================== */}
            {/* 2. TWO-COLUMN CONTENT LAYOUT                              */}
            {/* Left: Overview, Amenities, Policies, Verified Reviews    */}
            {/* Right: Sticky Details Card with Rates & Reserve Button    */}
            {/* ======================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* Left Column (8 cols): Room Info, Amenities, Reviews */}
              <div className="lg:col-span-8 space-y-8">
                {/* Title & Location Header */}
                <div className="space-y-2 border-b border-neutral-100 pb-6">
                  <h1 className="text-3xl sm:text-4xl font-normal text-neutral-900 tracking-tight">
                    {roomData.name}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-neutral-500 font-light">
                    <span className="flex items-center gap-1.5 text-neutral-800">
                      <MapPin className="w-4 h-4 text-neutral-500 shrink-0" />
                      {roomData.hotel.address}, {roomData.hotel.city}, {roomData.hotel.country}
                    </span>
                    <span className="text-neutral-300">•</span>
                    {(reviewsData?.totalReviews || roomData.reviewsSummary?.totalReviews || 0) > 0 ? (
                      <span className="flex items-center gap-1 text-black font-normal">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>{reviewsData?.averageRating || roomData.reviewsSummary?.averageRating}.0</span>
                        <span className="text-neutral-500 font-light">
                          ({reviewsData?.totalReviews || roomData.reviewsSummary?.totalReviews} verified reviews)
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-neutral-500 font-normal">
                        <MessageSquare className="w-4 h-4 text-neutral-400" />
                        <span>No reviews yet</span>
                      </span>
                    )}
                  </div>

                  {/* Specifications Pill Bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-3">
                    <span className="px-3 py-1.5 rounded-full bg-neutral-100 text-xs text-neutral-700 font-light">
                      {roomData.bedType}
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-neutral-100 text-xs text-neutral-700 font-light">
                      Up to {roomData.maxGuests} Guests ({roomData.maxAdults} Adults, {roomData.maxChildren} Children)
                    </span>
                    {roomData.roomSizeSqm && (
                      <span className="px-3 py-1.5 rounded-full bg-neutral-100 text-xs text-neutral-700 font-light">
                        {roomData.roomSizeSqm} m² / {Math.round(roomData.roomSizeSqm * 10.764)} sqft
                      </span>
                    )}
                  </div>
                </div>

                {/* Description with Read More Toggle */}
                <div className="space-y-3">
                  <h3 className="text-base font-normal text-neutral-900">About this Space</h3>
                  <p className={`text-sm text-neutral-600 font-light leading-relaxed ${isDescExpanded ? '' : 'line-clamp-3'}`}>
                    {roomData.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                    className="text-xs text-black underline font-normal cursor-pointer"
                  >
                    {isDescExpanded ? 'Show Less' : 'Read More'}
                  </button>
                </div>

                {/* ==================================================== */}
                {/* 3. AMENITIES GRID (Matching Screenshot Layout)       */}
                {/* ==================================================== */}
                <div className="rounded-3xl border border-neutral-200/80 p-6 sm:p-8 space-y-6 bg-white">
                  <h3 className="text-lg font-normal text-neutral-900">Amenities</h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-6">
                    {/* Render DB Amenities */}
                    {roomData.amenities.map((amenity: string, idx: number) => {
                      const lower = amenity.toLowerCase();
                      let Icon = Sparkles;
                      if (lower.includes('bed')) Icon = Bed;
                      else if (lower.includes('bath') || lower.includes('tub') || lower.includes('shower')) Icon = Bath;
                      else if (lower.includes('lounge') || lower.includes('chair')) Icon = Armchair;
                      else if (lower.includes('air') || lower.includes('wind')) Icon = Wind;
                      else if (lower.includes('wifi')) Icon = Wifi;
                      else if (lower.includes('pool') || lower.includes('ocean')) Icon = Waves;
                      else if (lower.includes('refrigerator') || lower.includes('mini')) Icon = Refrigerator;
                      else if (lower.includes('tv') || lower.includes('screen')) Icon = Tv;
                      else if (lower.includes('coffee') || lower.includes('tea') || lower.includes('espresso')) Icon = Coffee;

                      return (
                        <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm text-neutral-700 font-light">
                          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-neutral-600" />
                          </div>
                          <span className="truncate">{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ==================================================== */}
                {/* 4. HOTEL & ROOM POLICIES                             */}
                {/* ==================================================== */}
                <div className="rounded-3xl border border-neutral-200/80 p-6 sm:p-8 space-y-4 bg-white">
                  <h3 className="text-lg font-normal text-neutral-900">Policies & Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-light text-neutral-600">
                    <div className="p-4 rounded-2xl bg-neutral-50 space-y-1">
                      <span className="text-[10px] uppercase text-neutral-400 block font-normal">Check-in</span>
                      <span className="text-sm font-normal text-neutral-900">{roomData.hotel.checkInTime}</span>
                      <p className="text-[11px] text-neutral-500">Government ID required</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-neutral-50 space-y-1">
                      <span className="text-[10px] uppercase text-neutral-400 block font-normal">Check-out</span>
                      <span className="text-sm font-normal text-neutral-900">{roomData.hotel.checkOutTime}</span>
                      <p className="text-[11px] text-neutral-500">Late check-out upon request</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-neutral-50 space-y-1">
                      <span className="text-[10px] uppercase text-neutral-400 block font-normal">Cancellation</span>
                      <span className="text-sm font-normal text-neutral-900">Free Cancellation</span>
                      <p className="text-[11px] text-neutral-500">Up to 48 hours before arrival</p>
                    </div>
                  </div>
                </div>

                {/* ==================================================== */}
                {/* 5. VERIFIED GUEST REVIEWS SECTION                    */}
                {/* Only Real Registered Users from Database             */}
                {/* ==================================================== */}
                <div className="rounded-3xl border border-neutral-200/80 p-6 sm:p-8 space-y-6 bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-normal text-neutral-900">Verified Guest Reviews</h3>
                      <p className="text-xs text-neutral-500 font-light mt-0.5">
                        Authentic feedback from real registered guests who confirmed reservations at this property.
                      </p>
                    </div>

                    {(reviewsData?.totalReviews || 0) > 0 ? (
                      <div className="flex items-center gap-2 bg-neutral-100 rounded-full px-4 py-2 text-xs font-normal self-start sm:self-auto">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-normal text-neutral-900">
                          {reviewsData?.averageRating} / 5.0
                        </span>
                        <span className="text-neutral-400">({reviewsData?.totalReviews} reviews)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-neutral-100 rounded-full px-3.5 py-1.5 text-xs text-neutral-600 font-normal self-start sm:self-auto">
                        <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                        <span>No reviews yet</span>
                      </div>
                    )}
                  </div>

                  {/* Reviews List */}
                  <div className="space-y-4 pt-2">
                    {!reviewsData || reviewsData.reviews.length === 0 ? (
                      <div className="text-center py-10 text-neutral-400 text-xs font-light">
                        No reviews yet for this room type. Be the first verified guest to review!
                      </div>
                    ) : (
                      reviewsData.reviews.map((rev: any) => (
                        <div key={rev.id} className="p-5 rounded-2xl bg-neutral-50 space-y-2.5 border border-neutral-100">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-black text-white text-xs flex items-center justify-center font-normal uppercase">
                                {rev.user?.firstName?.[0] || 'G'}
                                {rev.user?.lastName?.[0] || 'U'}
                              </div>
                              <div>
                                <span className="text-xs font-normal text-neutral-900 block">
                                  {rev.user?.firstName} {rev.user?.lastName}
                                </span>
                                <span className="text-[10px] text-neutral-400 font-light flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Verified Stay • {rev.stayDate || 'Recent'}</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${
                                    i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          {rev.title && <h5 className="text-xs font-normal text-neutral-900">{rev.title}</h5>}
                          <p className="text-xs text-neutral-600 font-light leading-relaxed">{rev.comment}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Review Submission Form */}
                  <div className="pt-6 border-t border-neutral-100">
                    <h4 className="text-sm font-normal text-neutral-900 mb-2">Verified Guest Feedback</h4>
                    {reviewSuccess && (
                      <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Thank you! Your verified review has been published.</span>
                      </div>
                    )}

                    {eligibility?.hasReviewed ? (
                      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center gap-2 text-xs text-neutral-600 font-normal">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>You have already submitted a verified review for your stay at this hotel. Thank you!</span>
                      </div>
                    ) : eligibility?.eligible ? (
                      <form onSubmit={handleReviewSubmit} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-500 font-light">Rating:</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setNewRating(star)}
                                className="p-0.5"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <input
                          type="text"
                          placeholder="Headline (e.g. Unbelievable ocean views!)"
                          value={newReviewTitle}
                          onChange={(e) => setNewReviewTitle(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-black font-light"
                        />

                        <textarea
                          rows={3}
                          placeholder="Write your honest feedback regarding the room comfort, cleanliness, and service..."
                          value={newReviewComment}
                          onChange={(e) => setNewReviewComment(e.target.value)}
                          required
                          className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 focus:outline-none focus:border-black font-light resize-none"
                        />

                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="rounded-full bg-black hover:bg-neutral-800 text-white text-xs px-5 py-2 font-normal inline-flex items-center gap-2 shadow-sm"
                        >
                          <Send className="w-3 h-3" />
                          <span>{submittingReview ? 'Submitting...' : 'Post Review'}</span>
                        </button>
                      </form>
                    ) : user ? (
                      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-xs text-neutral-500 font-normal">
                        Only verified guests with a completed stay can rate and review this hotel.
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-between text-xs">
                        <span className="text-neutral-500 font-light">
                          Sign in with your registered HBMS account to review this room.
                        </span>
                        <Link
                          href="/login"
                          className="px-4 py-1.5 rounded-full bg-black text-white hover:bg-neutral-800 transition-colors font-normal"
                        >
                          Log in
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ==================================================== */}
              {/* Right Column (4 cols): Sticky Details Card           */}
              {/* (Exact match for Details Card in reference image)    */}
              {/* ==================================================== */}
              <div className="lg:col-span-4 sticky top-24 space-y-4">
                <div className="rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-xl bg-white space-y-5">
                  <h3 className="text-lg font-normal text-neutral-900">Details</h3>

                  {/* Dates Selection (Check-in -> Check-out) */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-neutral-400 font-light flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Dates</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-neutral-100/80 border border-neutral-200/50">
                        <span className="text-[10px] text-neutral-400 block font-light">Check-in</span>
                        <input
                          type="date"
                          value={checkInDate}
                          min={minCheckIn}
                          onChange={(e) => handleCheckInChange(e.target.value)}
                          className="w-full bg-transparent text-xs text-neutral-800 focus:outline-none font-light cursor-pointer"
                        />
                      </div>
                      <div className="p-2.5 rounded-xl bg-neutral-100/80 border border-neutral-200/50">
                        <span className="text-[10px] text-neutral-400 block font-light">Check-out</span>
                        <input
                          type="date"
                          value={checkOutDate}
                          min={getMinCheckOutFor(checkInDate)}
                          onChange={(e) => handleCheckOutChange(e.target.value)}
                          className="w-full bg-transparent text-xs text-neutral-800 focus:outline-none font-light cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Guests & Room Quantity */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-neutral-400 font-light flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Occupancy</span>
                    </label>
                    <div className="p-3 rounded-xl bg-neutral-100/80 border border-neutral-200/50 flex items-center justify-between">
                      <select
                        value={
                          String(guests).toLowerCase() === 'all' ||
                          String(rooms).toLowerCase() === 'all' ||
                          (Number(guests) === 0 && Number(rooms) === 0)
                            ? 'all'
                            : `${guests}-${rooms}`
                        }
                        onChange={(e) => {
                          if (e.target.value === 'all') {
                            setGuests('all');
                            setRooms('all');
                            loadRoomDetails(checkInDate, checkOutDate, 'all', 'all');
                          } else {
                            const [g, r] = e.target.value.split('-');
                            setGuests(g);
                            setRooms(r);
                            loadRoomDetails(checkInDate, checkOutDate, g, r);
                          }
                        }}
                        className="w-full bg-transparent text-xs text-neutral-800 focus:outline-none font-light cursor-pointer"
                      >
                        <option value="all">Show All / Any Occupancy</option>
                        <option value="2-1">1 Room, 2 Adults</option>
                        <option value="1-1">1 Room, 1 Adult</option>
                        <option value="3-1">1 Room, 3 Guests</option>
                        <option value="4-2">2 Rooms, 4 Guests</option>
                      </select>
                    </div>
                  </div>

                  {/* Special Rates Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-neutral-400 font-light">
                      Special Rates / Package
                    </label>
                    <select
                      value={selectedRatePlanId}
                      onChange={(e) => setSelectedRatePlanId(e.target.value)}
                      className="w-full p-3 text-xs rounded-xl bg-neutral-100/80 border border-neutral-200/50 text-neutral-800 focus:outline-none font-light cursor-pointer"
                    >
                      {roomData.ratePlans.map((rp: any) => (
                        <option key={rp.id} value={rp.id}>
                          {rp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pricing Display in Rupees */}
                  <div className="pt-2 border-t border-neutral-100 flex items-baseline justify-between">
                    <span className="text-xs text-neutral-500 font-light">Nightly Rate</span>
                    <span className="text-2xl font-normal text-neutral-900 tracking-tight">
                      {formatCurrencyMinor(nightlyRateCents, roomData.hotel.currency || 'INR')}
                      <span className="text-xs text-neutral-400 font-light"> / night</span>
                    </span>
                  </div>

                  {/* Complete Cost Breakdown in Rupees */}
                  <div className="space-y-2 py-3 border-y border-neutral-100 text-xs font-light text-neutral-600">
                    <div className="flex items-center justify-between">
                      <span>
                        {formatCurrencyMinor(nightlyRateCents, roomData.hotel.currency || 'INR')} &times; {totalNights} night{totalNights > 1 ? 's' : ''} ({rooms} room)
                      </span>
                      <span>{formatCurrencyMinor(subtotalCents, roomData.hotel.currency || 'INR')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Taxes (12% GST)</span>
                      <span>{formatCurrencyMinor(taxCents, roomData.hotel.currency || 'INR')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Resort & Service Fees (5%)</span>
                      <span>{formatCurrencyMinor(feesCents, roomData.hotel.currency || 'INR')}</span>
                    </div>
                    <div className="pt-2 border-t border-neutral-200 flex items-baseline justify-between font-normal text-neutral-900 text-sm">
                      <span>Total Amount (INR)</span>
                      <span className="text-lg font-normal">
                        {formatCurrencyMinor(grandTotalCents, roomData.hotel.currency || 'INR')}
                      </span>
                    </div>
                  </div>

                  {/* Black Reserve Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                        router.push(`/login?returnUrl=${returnUrl}`);
                        return;
                      }
                      setIsReserveModalOpen(true);
                    }}
                    className="w-full rounded-2xl bg-black hover:bg-neutral-800 text-white py-3.5 text-sm font-normal transition-all shadow-md cursor-pointer select-none"
                  >
                    {user ? 'Reserve Now' : 'Sign In to Reserve'}
                  </button>

                  <p className="text-center text-[11px] text-neutral-400 font-light">
                    Zero overbooking guarantee • 15-minute temporary inventory hold
                  </p>
                </div>
              </div>
            </div>

            {/* ==================================================== */}
            {/* 6. RESERVATION HOLD MODAL                            */}
            {/* ==================================================== */}
            {isReserveModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-neutral-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-normal text-neutral-900">Secure Your Stay</h3>
                      <p className="text-xs text-neutral-500 font-light mt-0.5">
                        {roomData.name} • {roomData.hotel.name}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsReserveModalOpen(false)}
                      className="text-neutral-400 hover:text-black text-lg p-1"
                    >
                      &times;
                    </button>
                  </div>

                  {reserveError && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                      {reserveError}
                    </div>
                  )}

                  <form onSubmit={handleReserve} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] text-neutral-400 font-light mb-1">Guest Full Name</label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-100 border border-neutral-200 focus:outline-none focus:border-black font-light"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-400 font-light mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-100 border border-neutral-200 focus:outline-none focus:border-black font-light"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-400 font-light mb-1">Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-100 border border-neutral-200 focus:outline-none focus:border-black font-light"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs space-y-1">
                      <div className="flex justify-between text-neutral-500 font-light">
                        <span>Stay Period</span>
                        <span className="font-normal text-neutral-800">{checkInDate} to {checkOutDate} ({totalNights} nights)</span>
                      </div>
                      <div className="flex justify-between text-neutral-500 font-light">
                        <span>Total Due</span>
                        <span className="font-normal text-neutral-900">{formatCurrencyMinor(grandTotalCents, 'INR')}</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={reserveLoading}
                      className="w-full rounded-2xl bg-black hover:bg-neutral-800 text-white py-3 text-xs font-normal transition-all shadow-md mt-2"
                    >
                      {reserveLoading ? 'Securing Hold...' : 'Confirm & Proceed to Payment'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

