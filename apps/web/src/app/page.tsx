// apps/web/src/app/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { apiFetch } from '@/lib/api';
import {
  MapPin,
  Calendar,
  Users,
  Search,
  Building,
  ArrowUpRight,
  Moon,
  Waves,
  Mountain,
  Landmark,
  Sparkles,
  X,
  Loader2,
} from 'lucide-react';

export default function GuestHomePage() {
  const router = useRouter();
  // Minimum check-in is today (same-day booking allowed)
  const today = new Date();
  const minCheckIn = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [searchCity, setSearchCity] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [checkIn, setCheckIn] = useState(minCheckIn);
  const [duration, setDuration] = useState('2');
  const [guestCount, setGuestCount] = useState('2');
  const [roomCount, setRoomCount] = useState('1');
  const [exploreToggle, setExploreToggle] = useState(true);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for destinations and hotels (Autocomplete Mode 2)
  useEffect(() => {
    const query = searchCity.trim();
    if (!query || query.length < 2) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch<any[]>(`/hotels/destinations?query=${encodeURIComponent(query)}`);
        setSuggestions(Array.isArray(data) ? data.slice(0, 6) : []);
        setIsOpen(true);
      } catch (err) {
        console.error('Failed to fetch destination suggestions:', err);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchCity]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    const inDate = new Date(checkIn);
    const outDate = new Date(inDate);
    outDate.setDate(outDate.getDate() + parseInt(duration, 10));
    const outStr = outDate.toISOString().split('T')[0];

    const destQuery = searchCity.trim() ? `&destination=${encodeURIComponent(searchCity.trim())}` : '';
    router.push(`/search?checkInDate=${checkIn}&checkOutDate=${outStr}&guests=${guestCount}&rooms=${roomCount}${destQuery}`);
  };

  const handleSelectSuggestion = (item: any) => {
    setIsOpen(false);
    if (item.type === 'hotel') {
      router.push(`/hotels/${item.hotelSlug || item.hotelId}`);
    } else {
      setSearchCity(item.city);
      const inDate = new Date(checkIn);
      const outDate = new Date(inDate);
      outDate.setDate(outDate.getDate() + parseInt(duration, 10));
      const outStr = outDate.toISOString().split('T')[0];
      router.push(`/search?destination=${encodeURIComponent(item.city)}&checkInDate=${checkIn}&checkOutDate=${outStr}&guests=${guestCount}&rooms=${roomCount}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans">
      <Navbar />

      <main className="flex-1 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-6 w-full space-y-16">
        {/* ======================================================== */}
        {/* 1. TOP BAR: AUTOCOMPLETE SEARCH + EXPERIENCE PILLS       */}
        {/* ======================================================== */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2">
          {/* Quick Search with Autocomplete Floating Dropdown */}
          <div ref={searchContainerRef} className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search hotel, city, or destination..."
              value={searchCity}
              onFocus={() => {
                if (suggestions.length > 0) setIsOpen(true);
              }}
              onChange={(e) => setSearchCity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit(e);
                } else if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-full bg-neutral-100/80 border border-neutral-200/60 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all font-light"
            />
            {isLoadingSuggestions ? (
              <Loader2 className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin pointer-events-none" />
            ) : searchCity ? (
              <button
                type="button"
                onClick={() => {
                  setSearchCity('');
                  setSuggestions([]);
                  setIsOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}

            {/* Floating Autocomplete Dropdown (Mode 2) */}
            {isOpen && searchCity.trim().length >= 2 && (
              <div className="absolute left-0 top-full mt-2 w-full sm:w-96 bg-white rounded-2xl shadow-2xl border border-neutral-200/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="p-2.5 border-b border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400 font-light px-3.5 bg-neutral-50/60">
                  <span>Suggestions for &ldquo;{searchCity}&rdquo;</span>
                  <span className="text-[10px] text-neutral-400">Esc to close</span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100/80">
                  {suggestions.length === 0 && !isLoadingSuggestions ? (
                    <div className="p-4 text-center text-xs text-neutral-400 font-light">
                      No matching hotels or destinations found
                    </div>
                  ) : (
                    suggestions.map((item, idx) => (
                      <div
                        key={`${item.type}-${item.hotelId || item.name}-${idx}`}
                        onClick={() => handleSelectSuggestion(item)}
                        className="p-3 hover:bg-neutral-50 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0">
                            {item.type === 'hotel' ? (
                              <Building className="w-3.5 h-3.5 text-neutral-900" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 text-neutral-900" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-normal text-neutral-900 truncate">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-neutral-400 font-light truncate">
                              {item.city}, {item.country}
                            </p>
                          </div>
                        </div>

                        <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 shrink-0 font-normal">
                          {item.type === 'hotel' ? 'Hotel' : 'City'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer action: search all stays */}
                <div
                  onClick={(e) => {
                    setIsOpen(false);
                    handleSearchSubmit(e);
                  }}
                  className="p-2.5 bg-neutral-50 border-t border-neutral-100 text-center text-xs font-normal text-neutral-700 hover:text-black hover:bg-neutral-100/80 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3 h-3" />
                  <span>Search all stays for &ldquo;{searchCity}&rdquo;</span>
                </div>
              </div>
            )}
          </div>

          {/* Experience & Atmosphere Pills (First black, rest neutral, non-clickable/non-pointer) */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none select-none">
            <div
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-normal shrink-0 cursor-default bg-black text-white shadow-sm"
            >
              <Building className="w-3.5 h-3.5" />
              <span>All Stays</span>
            </div>

            <div
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-normal shrink-0 cursor-default bg-neutral-100 text-neutral-600"
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Beach & Coastal</span>
            </div>

            <div
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-normal shrink-0 cursor-default bg-neutral-100 text-neutral-600"
            >
              <Mountain className="w-3.5 h-3.5" />
              <span>Alpine & Mountain</span>
            </div>

            <div
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-normal shrink-0 cursor-default bg-neutral-100 text-neutral-600"
            >
              <Building className="w-3.5 h-3.5" />
              <span>City Center</span>
            </div>

            <div
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-normal shrink-0 cursor-default bg-neutral-100 text-neutral-600"
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Historic & Heritage</span>
            </div>

            <div
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-normal shrink-0 cursor-default bg-neutral-100 text-neutral-600"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Spa & Wellness</span>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 2. HERO SECTION (Asset: hero-alpine-lake.webp)           */}
        {/* ======================================================== */}
        <section className="relative rounded-[32px] overflow-hidden min-h-[520px] lg:min-h-[560px] flex items-center shadow-2xl bg-neutral-900">
          {/* Alpine lake scenery background */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('/images/homepage/hero-alpine-lake.webp')`,
            }}
          />
          {/* Soft dark vignette for contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/30" />

          <div className="relative z-10 w-full p-8 sm:p-12 lg:p-14 flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left Column: Heading + Reserve a Stay pill + paragraph */}
            <div className="max-w-xl text-white space-y-6">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-[1.18] tracking-tight text-white drop-shadow-sm">
                Where Architectural Elegance Meets Uncompromising Hospitality
              </h1>

              <div>
                <Link
                  href="/search"
                  className="rounded-full bg-black text-white hover:bg-neutral-800 px-6 py-2.5 text-xs sm:text-sm font-normal inline-flex items-center gap-2 transition-all shadow-lg border border-white/10 cursor-pointer"
                >
                  <Building className="w-3.5 h-3.5 text-white" />
                  <span>Reserve a Stay</span>
                </Link>
              </div>

              <p className="text-xs sm:text-sm text-neutral-200/90 font-light max-w-md leading-relaxed">
                Discover handpicked luxury hotels, boutique retreats, and serene resorts with guaranteed real-time availability, transparent itemized pricing, and instant booking confirmation.
              </p>
            </div>

            {/* Right Column: Sleek, compact 'Find Hotels' card */}
            <div className="w-full sm:w-80 bg-white rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-neutral-900" />
                <h3 className="font-normal text-neutral-900 text-sm">Find Hotels</h3>
              </div>

              <form onSubmit={handleSearchSubmit} className="space-y-3">
                {/* City or Hotel */}
                <div>
                  <label className="block text-[10px] text-neutral-400 font-light mb-1">
                    City or Hotel Name
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100/90 border border-neutral-200/40">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="e.g. Paris, Tokyo, or The Ritz"
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      className="w-full bg-transparent text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none font-light"
                    />
                  </div>
                </div>

                {/* Check-in & Duration */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-neutral-400 font-light mb-1">
                      Check - in
                    </label>
                    <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-neutral-100/90 border border-neutral-200/40">
                      <Calendar className="w-3 h-3 text-neutral-400 shrink-0" />
                      <input
                        type="date"
                        value={checkIn}
                        min={minCheckIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full bg-transparent text-[11px] text-neutral-800 focus:outline-none font-light"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-400 font-light mb-1">
                      Duration
                    </label>
                    <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-neutral-100/90 border border-neutral-200/40">
                      <Moon className="w-3 h-3 text-neutral-400 shrink-0" />
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full bg-transparent text-[11px] text-neutral-800 focus:outline-none font-light cursor-pointer"
                      >
                        <option value="1">1 Night</option>
                        <option value="2">2 Nights</option>
                        <option value="3">3 Nights</option>
                        <option value="5">5+ Nights</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Guests and Rooms */}
                <div>
                  <label className="block text-[10px] text-neutral-400 font-light mb-1">
                    Guests and Rooms
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100/90 border border-neutral-200/40">
                    <Users className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <select
                      value={guestCount === 'all' || roomCount === 'all' ? 'all' : `${guestCount}-${roomCount}`}
                      onChange={(e) => {
                        if (e.target.value === 'all') {
                          setGuestCount('all');
                          setRoomCount('all');
                        } else {
                          const [g, r] = e.target.value.split('-');
                          setGuestCount(g);
                          setRoomCount(r);
                        }
                      }}
                      className="w-full bg-transparent text-xs text-neutral-800 focus:outline-none font-light cursor-pointer"
                    >
                      <option value="all">Show All (Any hotel with ≥1 room)</option>
                      <option value="2-1">2 Adults, 1 Room</option>
                      <option value="1-1">1 Adult, 1 Room</option>
                      <option value="3-1">3 Adults, 1 Room</option>
                      <option value="4-2">4 Guests, 2 Rooms</option>
                    </select>
                  </div>
                </div>

                {/* Submit button (Black pill) */}
                <button
                  type="submit"
                  className="w-full mt-2 rounded-full bg-black text-white hover:bg-neutral-800 py-3 text-xs font-normal transition-all shadow-md cursor-pointer"
                >
                  Search Available Stays
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 3. POST-HERO CURATED PROMO & ARTISTIC CARDS              */}
        {/* ======================================================== */}
        <section className="space-y-8 pt-4">
          {/* Header row: Left title & Right paragraph + Book Now button */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-1">
              <span className="text-xs text-neutral-500 font-light block">Exclusive Collections</span>
              <h2 className="text-3xl sm:text-4xl font-normal text-neutral-900 leading-tight">
                Curated Stays &<br />
                Bespoke Suite<br />
                Privileges
              </h2>
            </div>

            <div className="space-y-3 lg:pl-12">
              <p className="text-xs sm:text-sm text-neutral-500 font-light leading-relaxed">
                Unlock preferred member rates on verified boutique properties, oceanfront villas, and alpine chalets. Enjoy flexible cancellation policies, complimentary breakfast packages, and guaranteed real-time availability.
              </p>
              <div>
                <Link
                  href="/search"
                  className="inline-block rounded-full bg-black text-white hover:bg-neutral-800 px-6 py-2.5 text-xs sm:text-sm font-normal transition-all shadow-sm cursor-pointer"
                >
                  Explore All Stays
                </Link>
              </div>
            </div>
          </div>

          {/* Promo Row: Merged Container (Left) + Card 3 (Middle) + Card 4 (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-end">
            {/* Merged Single Container: Two Travelers in European Alley (Left) + Curated Stays (Right) */}
            <div className="lg:col-span-2 rounded-[32px] overflow-hidden bg-[#f4f5f6] flex flex-col sm:flex-row items-stretch shadow-sm border border-neutral-200/60 min-h-[340px] sm:min-h-[380px] group">
              <div className="relative w-full sm:w-1/2 min-h-[260px] sm:min-h-full overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{
                    backgroundImage: `url('/images/homepage/promo-summer-friends.webp')`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-5 flex items-center justify-between z-10">
                  <span className="px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[11px] font-normal tracking-wide">
                    Seasonal Escape
                  </span>
                  <Link
                    href="/search?category=RESORT"
                    className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
                    title="Explore Resort Stays"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="w-full sm:w-1/2 p-6 sm:p-8 flex flex-col justify-between space-y-5 bg-[#f4f5f6]">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-2xl sm:text-3xl font-normal text-neutral-900 leading-snug tracking-tight">
                    Bespoke<br />
                    Retreats<br />
                    Worldwide
                  </h3>

                  {/* Functional toggle / check switch button */}
                  <button
                    type="button"
                    onClick={() => setExploreToggle(!exploreToggle)}
                    aria-label="Toggle stay philosophy"
                    className={`w-12 h-6.5 rounded-full transition-colors flex items-center p-0.5 cursor-pointer shrink-0 ${
                      exploreToggle ? 'bg-neutral-800' : 'bg-neutral-300'
                    }`}
                  >
                    <div
                      className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                        exploreToggle ? 'translate-x-5.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-neutral-500 font-light leading-relaxed">
                  {exploreToggle
                    ? 'From historic European palaces to secluded tropical sanctuaries, every property in our collection is independently verified for architectural elegance, exceptional service, and uncompromising comfort.'
                    : 'Discover exclusive boutique retreats and handpicked escapes with instant real-time booking confirmation and zero overbooking.'}
                </p>
              </div>
            </div>

            {/* Card 3: Tallest vertical card (Asset: promo-seasonal-ocean.webp) */}
            <div className="lg:col-span-1 relative h-96 sm:h-[440px] rounded-[32px] overflow-hidden shadow-md flex flex-col justify-between group">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{
                  backgroundImage: `url('/images/homepage/promo-seasonal-ocean.webp')`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

              {/* Top frosted glass stay privilege card */}
              <div className="relative z-10 m-4 p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-white/40 shadow-sm">
                <p className="text-xs text-neutral-700 font-light leading-relaxed">
                  Complimentary Suite Upgrades & Extended Stays. Reserve 3 or more consecutive nights at selected boutique resorts to enjoy complimentary breakfast and flexible late check-out privileges.
                </p>
              </div>

              {/* Bottom promo tag + circular button */}
              <div className="relative z-10 p-5 flex items-center justify-between">
                <span className="px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md text-neutral-900 text-[11px] font-normal shadow-sm">
                  Seasonal Privilege
                </span>
                <Link
                  href="/search"
                  className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                  title="Explore Seasonal Offers"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 4: Curated Stays Asset */}
            <div className="lg:col-span-1 relative h-64 sm:h-[280px] rounded-[32px] overflow-hidden shadow-sm group">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{
                  backgroundImage: `url('/images/homepage/promo-flight-wing.webp')`,
                }}
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />

              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Link
                  href="/search"
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
                  title="Explore Destination Stays"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4. RECOMMENDED DESTINATIONS (Curated Destination Assets) */}
        {/* ======================================================== */}
        <section className="space-y-6 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-neutral-400 font-light block mb-1">
                Curated Luxury Stays
              </span>
              <h2 className="text-2xl sm:text-3xl font-normal text-neutral-900">
                Recommended Destinations & Suites
              </h2>
            </div>
            <span className="text-xs text-neutral-400 font-light hidden sm:block">Starting nightly rates</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Destination 1: Tropical Coast */}
            <Link href="/search?destination=Bali" className="relative rounded-3xl overflow-hidden shadow-sm group h-72 sm:h-80 block">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                style={{ backgroundImage: `url('/images/homepage/dest-tropical-coast.webp')` }}
              />
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-normal text-neutral-900 shadow-sm z-10">
                ₹22,000
              </div>
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white z-10">
                <h4 className="text-sm font-normal">Nusa Dua, Bali</h4>
                <p className="text-[11px] text-neutral-200/90 font-light">Coral Reef Retreats</p>
              </div>
            </Link>

            {/* Destination 2: Misty Lake */}
            <Link href="/search?destination=Norway" className="relative rounded-3xl overflow-hidden shadow-sm group h-72 sm:h-80 block">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                style={{ backgroundImage: `url('/images/homepage/dest-misty-lake.webp')` }}
              />
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-normal text-neutral-900 shadow-sm z-10">
                ₹14,500
              </div>
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white z-10">
                <h4 className="text-sm font-normal">Flåm, Norway</h4>
                <p className="text-[11px] text-neutral-200/90 font-light">Fjordfront Cabins</p>
              </div>
            </Link>

            {/* Destination 3: Foggy Alpine Valley */}
            <Link href="/search?destination=Alps" className="relative rounded-3xl overflow-hidden shadow-sm group h-72 sm:h-80 block">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                style={{ backgroundImage: `url('/images/homepage/dest-foggy-valley.webp')` }}
              />
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-normal text-neutral-900 shadow-sm z-10">
                ₹18,000
              </div>
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white z-10">
                <h4 className="text-sm font-normal">Zermatt, Alps</h4>
                <p className="text-[11px] text-neutral-200/90 font-light">Matterhorn View Chalet</p>
              </div>
            </Link>

            {/* Destination 4: Golden Sunset Ridge */}
            <Link href="/search?destination=Paris" className="relative rounded-3xl overflow-hidden shadow-sm group h-72 sm:h-80 block">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                style={{ backgroundImage: `url('/images/homepage/dest-sunset-ridge.webp')` }}
              />
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-normal text-neutral-900 shadow-sm z-10">
                ₹58,000
              </div>
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white z-10">
                <h4 className="text-sm font-normal">Paris Palace</h4>
                <p className="text-[11px] text-neutral-200/90 font-light">Royal Tuileries Suite</p>
              </div>
            </Link>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 5. CULTURAL EDITORIAL BANNER                             */}
        {/* ======================================================== */}
        <section className="relative rounded-[32px] overflow-hidden min-h-[280px] sm:min-h-[320px] flex items-center shadow-md bg-neutral-900">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('/images/homepage/feature-festival-portrait.webp')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

          <div className="relative z-10 p-8 sm:p-12 max-w-xl text-white space-y-3">
            <span className="text-[11px] font-normal uppercase tracking-widest text-neutral-300 block">
              Verified Hospitality • Bespoke Guest Experiences
            </span>
            <h3 className="text-2xl sm:text-3xl font-normal leading-snug">
              Immerse Yourself in World Heritage & Distinctive Hospitality
            </h3>
            <p className="text-xs sm:text-sm text-neutral-200/90 font-light leading-relaxed">
              Every reservation connects you with independently verified hoteliers offering personalized concierge service, curated dining, and immersive local experiences.
            </p>
            <div className="pt-2">
              <Link href="/search">
                <button
                  type="button"
                  className="rounded-full bg-white text-black hover:bg-neutral-100 px-5 py-2 text-xs font-normal transition-all shadow-md cursor-pointer"
                >
                  Explore Stays Worldwide
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 6. ABOUT US & ARCHITECTURAL HIGHLIGHTS                   */}
        {/* ======================================================== */}
        <section className="pt-8 border-t border-neutral-100">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="space-y-3">
              <h3 className="text-xl sm:text-2xl font-normal text-neutral-900">
                About<br />Us
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500 font-light leading-relaxed">
                Voyage is a next-generation hospitality reservation system connecting travelers with verified boutique hotels worldwide. Built on enterprise concurrency controls and real-time operational property management, every reservation is guaranteed with zero overbooking and transparent pricing.
              </p>
            </div>

            {/* Two Partner Architectural Highlights beside About Us */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative h-56 rounded-3xl overflow-hidden shadow-sm group">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                  style={{ backgroundImage: `url('/images/homepage/hotel-modern-facade.webp')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <span className="text-[10px] text-neutral-300 font-light block">Boutique Architecture</span>
                  <h5 className="text-sm font-normal">Contemporary Urban Facades</h5>
                </div>
              </div>

              <div className="relative h-56 rounded-3xl overflow-hidden shadow-sm group">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                  style={{ backgroundImage: `url('/images/homepage/hotel-resort-overwater.webp')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <span className="text-[10px] text-neutral-300 font-light block">Island Sanctuaries</span>
                  <h5 className="text-sm font-normal">Overwater Lagoon Retreats</h5>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
