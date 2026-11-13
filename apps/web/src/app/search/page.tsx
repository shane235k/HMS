// apps/web/src/app/search/page.tsx
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SearchForm } from '@/components/search/SearchForm';
import { FilterSidebar, FilterState } from '@/components/search/FilterSidebar';
import { HotelCard } from '@/components/search/HotelCard';
import { apiFetch } from '@/lib/api';
import { HotelSearchResult, HotelSearchResponse } from '@hbms/shared';
import {
  ArrowUpDown,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Building,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Initial State from URL Search Params
  // Minimum check-in is today (same-day booking allowed)
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

  const urlDestination = searchParams.get('destination') || searchParams.get('city') || '';
  const rawQueryIn = searchParams.get('checkInDate') || searchParams.get('checkIn');
  const urlCheckIn = rawQueryIn && rawQueryIn >= minCheckIn ? rawQueryIn : minCheckIn;
  const rawQueryOut = searchParams.get('checkOutDate') || searchParams.get('checkOut');
  const urlCheckOut = rawQueryOut && rawQueryOut > urlCheckIn ? rawQueryOut : minCheckOut;
  const rawGuests = searchParams.get('guests');
  const rawRooms = searchParams.get('rooms');
  const isAllParam = rawGuests === 'all' || rawRooms === 'all';
  const urlGuests: number | string = isAllParam ? 'all' : parseInt(rawGuests || '2', 10);
  const urlRooms: number | string = isAllParam ? 'all' : parseInt(rawRooms || '1', 10);
  const urlSort = searchParams.get('sort') || 'recommended';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);

  // Filters from URL
  const urlCategories = searchParams.get('category')
    ? searchParams.get('category')!.split(',').filter(Boolean)
    : [];
  const urlStars = searchParams.get('starRating')
    ? searchParams.get('starRating')!.split(',').map(Number).filter((n) => !isNaN(n))
    : [];
  const urlMinPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!, 10) : undefined;
  const urlMaxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!, 10) : undefined;
  const urlAmenities = searchParams.get('amenities')
    ? searchParams.get('amenities')!.split(',').filter(Boolean)
    : [];

  // 2. Component State
  const [destination, setDestination] = useState(urlDestination);
  const [checkInDate, setCheckInDate] = useState(urlCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(urlCheckOut);
  const [guests, setGuests] = useState<number | string>(urlGuests);
  const [rooms, setRooms] = useState<number | string>(urlRooms);
  const [sort, setSort] = useState(urlSort);
  const [page, setPage] = useState(urlPage);

  const [filters, setFilters] = useState<FilterState>({
    minPrice: urlMinPrice,
    maxPrice: urlMaxPrice,
    categories: urlCategories,
    starRatings: urlStars,
    amenities: urlAmenities,
    features: [],
  });

  // UI State: Sidebar must be visible by default on desktop!
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Results State
  const [hotels, setHotels] = useState<HotelSearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate total nights
  const totalNights = React.useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    const diff = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [checkInDate, checkOutDate]);

  // Count active filters
  const isAllMode = guests === 'all' || rooms === 'all';
  const activeFilterCount =
    (filters.categories.length || 0) +
    (filters.starRatings.length || 0) +
    (filters.guestRating ? 1 : 0) +
    (filters.amenities.length || 0) +
    (filters.features.length || 0) +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    (isAllMode ? 1 : 0);

  // 3. Update URL Query Parameters
  const updateUrl = useCallback(
    (newParams: {
      destination?: string;
      checkInDate?: string;
      checkOutDate?: string;
      guests?: number | string;
      rooms?: number | string;
      sort?: string;
      page?: number;
      filters?: FilterState;
    }) => {
      const q = new URLSearchParams();

      const d = newParams.destination !== undefined ? newParams.destination : destination;
      if (d) q.set('destination', d);

      const ci = newParams.checkInDate !== undefined ? newParams.checkInDate : checkInDate;
      if (ci) q.set('checkInDate', ci);

      const co = newParams.checkOutDate !== undefined ? newParams.checkOutDate : checkOutDate;
      if (co) q.set('checkOutDate', co);

      const g = newParams.guests !== undefined ? newParams.guests : guests;
      if (g) q.set('guests', String(g));

      const r = newParams.rooms !== undefined ? newParams.rooms : rooms;
      if (r) q.set('rooms', String(r));

      const s = newParams.sort !== undefined ? newParams.sort : sort;
      if (s && s !== 'recommended') q.set('sort', s);

      const p = newParams.page !== undefined ? newParams.page : page;
      if (p && p > 1) q.set('page', String(p));

      const f = newParams.filters !== undefined ? newParams.filters : filters;
      if (f.categories.length > 0) q.set('category', f.categories.join(','));
      if (f.starRatings.length > 0) q.set('starRating', f.starRatings.join(','));
      if (f.minPrice !== undefined) q.set('minPrice', String(f.minPrice));
      if (f.maxPrice !== undefined) q.set('maxPrice', String(f.maxPrice));
      if (f.amenities.length > 0) q.set('amenities', f.amenities.join(','));

      router.replace(`/search?${q.toString()}`, { scroll: false });
    },
    [destination, checkInDate, checkOutDate, guests, rooms, sort, page, filters, router]
  );

  // 4. Fetch Search Results from Backend
  const fetchSearchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (destination) q.set('destination', destination);
      if (checkInDate) q.set('checkInDate', checkInDate);
      if (checkOutDate) q.set('checkOutDate', checkOutDate);
      if (guests) q.set('guests', String(guests));
      if (rooms) q.set('rooms', String(rooms));
      if (sort) q.set('sort', sort);
      if (page) q.set('page', String(page));
      q.set('limit', '6');

      if (filters.categories.length > 0) q.set('category', filters.categories.join(','));
      if (filters.starRatings.length > 0) q.set('starRating', filters.starRatings.join(','));
      if (filters.minPrice !== undefined) q.set('minPrice', String(filters.minPrice));
      if (filters.maxPrice !== undefined) q.set('maxPrice', String(filters.maxPrice));
      if (filters.amenities.length > 0) q.set('amenities', filters.amenities.join(','));

      const res = await apiFetch<HotelSearchResponse>(`/hotels/search?${q.toString()}`);
      setHotels(res.hotels || []);
      setTotalCount(res.totalCount || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to fetch hotels:', err);
      setError(err.message || 'Failed to load hotel search results');
      setHotels([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [destination, checkInDate, checkOutDate, guests, rooms, sort, page, filters]);

  useEffect(() => {
    fetchSearchResults();
  }, [fetchSearchResults]);

  // 5. User Handlers
  const handleSearchSubmit = (newParams: {
    destination: string;
    checkInDate: string;
    checkOutDate: string;
    guests: number | string;
    rooms: number | string;
  }) => {
    setDestination(newParams.destination);
    setCheckInDate(newParams.checkInDate);
    setCheckOutDate(newParams.checkOutDate);
    setGuests(newParams.guests);
    setRooms(newParams.rooms);
    setPage(1);

    updateUrl({
      ...newParams,
      page: 1,
    });
  };

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
    updateUrl({
      filters: newFilters,
      page: 1,
    });
  };

  const handleClearFilters = () => {
    const emptyFilters: FilterState = {
      minPrice: undefined,
      maxPrice: undefined,
      categories: [],
      starRatings: [],
      guestRating: undefined,
      amenities: [],
      features: [],
    };
    setFilters(emptyFilters);
    setPage(1);
    updateUrl({
      filters: emptyFilters,
      page: 1,
    });
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setPage(1);
    updateUrl({
      sort: newSort,
      page: 1,
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl({
      page: newPage,
    });
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans">
      <Navbar />

      <main className="flex-1 max-w-[1480px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-8">
        {/* ======================================================== */}
        {/* 1. TOP CONVENTIONAL SEARCH BAR                           */}
        {/* ======================================================== */}
        <section>
          <SearchForm
            initialDestination={destination}
            initialCheckIn={checkInDate}
            initialCheckOut={checkOutDate}
            initialGuests={guests}
            initialRooms={rooms}
            onSearch={handleSearchSubmit}
          />
        </section>

        {/* ======================================================== */}
        {/* 2. RESULTS TOOLBAR WITH CLEAN SVG FILTER TOGGLE ICON     */}
        {/* ======================================================== */}
        <section className="border-b border-neutral-200 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Heading + Results Count + Pure SVG Filter Toggle Button */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Filter / Sliders SVG Icon (Transparent Background, No Container Box) */}
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(!sidebarOpen);
                  setMobileFilterOpen(!mobileFilterOpen);
                }}
                aria-label={sidebarOpen ? 'Hide filter sidebar' : 'Show filter sidebar'}
                title={sidebarOpen ? 'Hide filters' : 'Show filters'}
                className="inline-flex items-center gap-2 p-1 text-neutral-800 hover:text-black transition-colors focus:outline-none cursor-pointer bg-transparent border-0 select-none group"
              >
                {/* Standard SVG Filter / Sliders Icon */}
                <svg
                  className="w-5 h-5 text-neutral-800 group-hover:scale-105 transition-transform"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
                <span className="text-sm font-normal text-neutral-800 group-hover:text-black">
                  {sidebarOpen ? 'Hide Filters' : 'Filters'}
                </span>
                {activeFilterCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-black shrink-0" />
                )}
              </button>

              <div className="h-5 w-px bg-neutral-200 hidden sm:block" />

              {/* Destination Heading & Counts */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-normal text-neutral-900 tracking-tight">
                  {destination ? `Stays in ${destination}` : 'Discover Available Hotels'}
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 font-light mt-0.5">
                  {loading
                    ? 'Checking live availability...'
                    : isAllMode
                    ? `${totalCount} propert${totalCount === 1 ? 'y' : 'ies'} with available rooms found (Show All mode)`
                    : `${totalCount} verified propert${totalCount === 1 ? 'y' : 'ies'} match your criteria`}
                </p>
              </div>
            </div>

            {/* Right: Sorting Controls */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="text-xs text-neutral-400 font-light hidden md:inline">Sort by:</span>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="appearance-none bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200/70 text-xs text-neutral-800 rounded-full pl-4 pr-9 py-2 font-normal focus:outline-none focus:border-black transition-all cursor-pointer"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating_desc">Highest Rated</option>
                </select>
                <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Active Filter Indicator Tags */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-4">
              <span className="text-xs text-neutral-400 font-light">Active filters:</span>

              {isAllMode && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black text-white text-xs font-normal shadow-sm">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Show All Mode (Any hotel with ≥1 room)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setGuests(2);
                      setRooms(1);
                      updateUrl({ guests: 2, rooms: 1, page: 1 });
                    }}
                    className="hover:text-neutral-300 ml-1"
                    title="Switch to default 2 Guests, 1 Room"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.categories.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-xs font-light text-neutral-800"
                >
                  <span>{c}</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyFilters({
                        ...filters,
                        categories: filters.categories.filter((cat) => cat !== c),
                      })
                    }
                    className="hover:text-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {filters.starRatings.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-xs font-light text-neutral-800"
                >
                  <span>{s} Stars</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyFilters({
                        ...filters,
                        starRatings: filters.starRatings.filter((star) => star !== s),
                      })
                    }
                    className="hover:text-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-xs font-light text-neutral-800">
                  <span>
                    ₹{filters.minPrice ? (filters.minPrice / 100).toLocaleString('en-IN') : '0'} -{' '}
                    {filters.maxPrice ? `₹${(filters.maxPrice / 100).toLocaleString('en-IN')}` : 'Any'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyFilters({
                        ...filters,
                        minPrice: undefined,
                        maxPrice: undefined,
                      })
                    }
                    className="hover:text-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.amenities.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-xs font-light text-neutral-800"
                >
                  <span>{a}</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyFilters({
                        ...filters,
                        amenities: filters.amenities.filter((am) => am !== a),
                      })
                    }
                    className="hover:text-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-neutral-500 hover:text-black transition-colors font-light underline ml-1"
              >
                Clear all
              </button>
            </div>
          )}
        </section>

        {/* ======================================================== */}
        {/* 3. MAIN CONTENT: FILTER SIDEBAR & HOTEL CARDS GRID       */}
        {/* ======================================================== */}
        <section className="flex items-start gap-8">
          {/* Desktop Filter Sidebar: visible by default, toggled via SVG button */}
          {sidebarOpen && (
            <aside className="hidden lg:block w-72 lg:w-80 shrink-0 bg-white rounded-[32px] border border-neutral-200/80 p-6 shadow-xs">
              <FilterSidebar
                filters={filters}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
                activeCount={activeFilterCount}
              />
            </aside>
          )}

          {/* Results Grid Container */}
          <div className="flex-1 min-w-0 space-y-8">
            {loading ? (
              <div
                className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${
                  sidebarOpen ? '2xl:grid-cols-3' : 'lg:grid-cols-3 2xl:grid-cols-4'
                }`}
              >
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-96 rounded-[30px] bg-neutral-100 animate-pulse border border-neutral-200"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="p-12 text-center rounded-[32px] bg-red-50/50 border border-red-200 text-red-700 font-light space-y-3">
                <p className="text-base font-normal">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchSearchResults()}
                  className="rounded-full bg-black text-white px-6 py-2 text-xs font-normal"
                >
                  Try Again
                </button>
              </div>
            ) : hotels.length === 0 ? (
              <div className="p-16 text-center rounded-[32px] bg-neutral-50/70 border border-neutral-200 text-neutral-600 font-light space-y-4">
                <Building className="w-12 h-12 text-neutral-400 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-xl font-normal text-neutral-900">No matching hotels found</h3>
                  <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
                    Try broadening your destination, adjusting your travel dates, or removing some of your active filters.
                  </p>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex items-center gap-1.5 rounded-full bg-black text-white hover:bg-neutral-800 px-6 py-2.5 text-xs font-normal transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                )}
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${
                  sidebarOpen ? '2xl:grid-cols-3' : 'lg:grid-cols-3 2xl:grid-cols-4'
                }`}
              >
                {hotels.map((hotel) => (
                  <HotelCard
                    key={hotel.id}
                    hotel={hotel}
                    checkInDate={checkInDate}
                    checkOutDate={checkOutDate}
                    guests={guests}
                    rooms={rooms}
                    totalNights={totalNights}
                  />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-100 pt-6">
                <span className="text-xs text-neutral-500 font-light">
                  Showing page {page} of {totalPages} ({totalCount} total stays)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                    className="p-2 rounded-full border border-neutral-200 text-neutral-700 hover:text-black hover:border-black disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const p = idx + 1;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePageChange(p)}
                        className={`w-8 h-8 rounded-full text-xs font-normal transition-all ${
                          p === page
                            ? 'bg-black text-white shadow-sm'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => handlePageChange(page + 1)}
                    className="p-2 rounded-full border border-neutral-200 text-neutral-700 hover:text-black hover:border-black disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4. MOBILE SLIDE-IN FILTER DRAWER                         */}
        {/* ======================================================== */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileFilterOpen(false)}
            />

            {/* Sliding Drawer */}
            <div className="relative w-80 max-w-[85vw] bg-white h-full p-6 overflow-y-auto space-y-6 shadow-2xl z-10">
              <FilterSidebar
                filters={filters}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
                onCloseMobile={() => setMobileFilterOpen(false)}
                activeCount={activeFilterCount}
              />
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-sm font-light text-neutral-500">Loading hotel search...</div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

