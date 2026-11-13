// apps/web/src/components/search/SearchForm.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Calendar,
  Users,
  Search,
  X,
  Loader2,
  Building,
  Globe,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export interface SearchFormProps {
  initialDestination?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number | string;
  initialRooms?: number | string;
  onSearch: (params: {
    destination: string;
    checkInDate: string;
    checkOutDate: string;
    guests: number | string;
    rooms: number | string;
  }) => void;
}

export interface DestinationSuggestion {
  label: string;
  value: string;
  type: 'hotel' | 'location' | 'geo' | 'preset';
  subLabel?: string;
}

const FEATURED_SUGGESTIONS = [
  { name: 'Paris', country: 'France', label: 'Paris, Île-de-France, France' },
  { name: 'Tokyo', country: 'Japan', label: 'Tokyo, Kantō, Japan' },
  { name: 'Bali', country: 'Indonesia', label: 'Bali, Nusa Dua, Indonesia' },
  { name: 'New York', country: 'United States', label: 'New York, NY, USA' },
  { name: 'St. Moritz', country: 'Switzerland', label: 'St. Moritz, Graubünden, Switzerland' },
  { name: 'Dubai', country: 'United Arab Emirates', label: 'Dubai, UAE' },
];

export const SearchForm: React.FC<SearchFormProps> = ({
  initialDestination = '',
  initialCheckIn = '',
  initialCheckOut = '',
  initialGuests = 2,
  initialRooms = 1,
  onSearch,
}) => {
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

  const safeInitialIn = initialCheckIn && initialCheckIn >= minCheckIn ? initialCheckIn : minCheckIn;
  const safeInitialOut = initialCheckOut && initialCheckOut > safeInitialIn ? initialCheckOut : getMinCheckOutFor(safeInitialIn);

  const [destination, setDestination] = useState(initialDestination);
  const [checkIn, setCheckIn] = useState(safeInitialIn);
  const [checkOut, setCheckOut] = useState(safeInitialOut);
  const [guests, setGuests] = useState<number | string>(initialGuests);
  const [rooms, setRooms] = useState<number | string>(initialRooms);

  const handleCheckInChange = (newIn: string) => {
    if (newIn < minCheckIn) {
      newIn = minCheckIn;
    }
    setCheckIn(newIn);
    const minOut = getMinCheckOutFor(newIn);
    if (!checkOut || checkOut <= newIn) {
      setCheckOut(minOut);
    }
  };

  const handleCheckOutChange = (newOut: string) => {
    const minOut = getMinCheckOutFor(checkIn);
    if (newOut < minOut) {
      newOut = minOut;
    }
    setCheckOut(newOut);
  };

  // Autocomplete dropdown state
  const [suggestions, setSuggestions] = useState<DestinationSuggestion[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchingGeo, setIsSearchingGeo] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync with initial props
  useEffect(() => {
    setDestination(initialDestination);
  }, [initialDestination]);

  useEffect(() => {
    setCheckIn(initialCheckIn);
  }, [initialCheckIn]);

  useEffect(() => {
    setCheckOut(initialCheckOut);
  }, [initialCheckOut]);

  useEffect(() => {
    setGuests(initialGuests);
  }, [initialGuests]);

  useEffect(() => {
    setRooms(initialRooms);
  }, [initialRooms]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions from both our Database and Geocoding APIs (debounced)
  useEffect(() => {
    const trimmed = destination.trim();

    const timer = setTimeout(async () => {
      try {
        setIsSearchingGeo(true);
        const combinedSuggestions: DestinationSuggestion[] = [];
        const seenValues = new Set<string>();

        // 1. ALWAYS query actual Database matches from our platform
        try {
          const dbDestinations = await apiFetch<any[]>(
            `/hotels/destinations${trimmed ? `?q=${encodeURIComponent(trimmed)}` : ''}`
          );

          for (const item of dbDestinations || []) {
            const key = item.label.toLowerCase();
            if (!seenValues.has(key)) {
              seenValues.add(key);
              combinedSuggestions.push({
                label: item.label,
                value: item.type === 'hotel' ? item.name : item.city,
                type: item.type === 'hotel' ? 'hotel' : 'location',
                subLabel:
                  item.type === 'hotel'
                    ? `${item.city}, ${item.country} • Registered Hotel`
                    : `${item.country} • Destination`,
              });
            }
          }
        } catch (dbErr) {
          // graceful fallback if offline
        }

        // 2. Query Geoapify autocomplete for global places if input has at least 2 chars
        if (trimmed.length >= 2) {
          const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
          if (apiKey) {
            try {
              const geoUrl = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
                trimmed
              )}&type=city&limit=4&apiKey=${apiKey}`;
              const res = await fetch(geoUrl);
              if (res.ok) {
                const data = await res.json();
                for (const f of data.features || []) {
                  const formatted = f.properties?.formatted;
                  const city = f.properties?.city || f.properties?.name || formatted;
                  if (formatted && !seenValues.has(formatted.toLowerCase())) {
                    seenValues.add(formatted.toLowerCase());
                    combinedSuggestions.push({
                      label: formatted,
                      value: city,
                      type: 'geo',
                      subLabel: 'Global Destination',
                    });
                  }
                }
              }
            } catch (e) {
              // ignore geo errors
            }
          }

          // 3. Match local featured suggestions
          const q = trimmed.toLowerCase();
          for (const s of FEATURED_SUGGESTIONS) {
            if (
              (s.name.toLowerCase().includes(q) || s.country.toLowerCase().includes(q)) &&
              !seenValues.has(s.label.toLowerCase())
            ) {
              seenValues.add(s.label.toLowerCase());
              combinedSuggestions.push({
                label: s.label,
                value: s.name,
                type: 'preset',
                subLabel: `${s.country} • Featured Destination`,
              });
            }
          }
        }

        setSuggestions(combinedSuggestions.slice(0, 8));
        if (combinedSuggestions.length > 0 && document.activeElement === wrapperRef.current?.querySelector('input')) {
          setIsDropdownOpen(true);
        }
      } finally {
        setIsSearchingGeo(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [destination]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDropdownOpen(false);
    onSearch({
      destination: destination.trim(),
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guests,
      rooms,
    });
  };

  const handleSelectSuggestion = (s: DestinationSuggestion) => {
    setDestination(s.value);
    setIsDropdownOpen(false);
  };

  return (
    <div className="w-full bg-white rounded-[32px] border border-neutral-200/90 p-4 sm:p-6 shadow-md">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        {/* Destination with Autocomplete */}
        <div ref={wrapperRef} className="relative md:col-span-4">
          <label className="block text-xs text-neutral-400 font-light mb-1.5">
            Destination or City
          </label>
          <div className="relative flex items-center bg-neutral-100/90 border border-neutral-200/70 rounded-2xl px-3.5 py-3 focus-within:border-black focus-within:bg-white transition-all">
            <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mr-2.5" />
            <input
              type="text"
              placeholder="Where are you going? (e.g. Paris, Tokyo)"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => {
                if (suggestions.length > 0) setIsDropdownOpen(true);
              }}
              className="w-full bg-transparent text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none font-light"
            />
            {isSearchingGeo && <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin mr-1" />}
            {destination && (
              <button
                type="button"
                onClick={() => {
                  setDestination('');
                  setSuggestions([]);
                }}
                className="text-neutral-400 hover:text-black ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-neutral-200 shadow-xl z-50 overflow-hidden py-1 max-h-72 overflow-y-auto">
              <span className="px-3.5 py-1.5 text-[10px] uppercase font-mono text-neutral-400 block tracking-wider border-b border-neutral-100">
                Destinations & Hotels
              </span>
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full text-left px-3.5 py-2.5 text-xs text-neutral-800 hover:bg-neutral-50 flex items-center justify-between gap-2 transition-colors cursor-pointer border-b border-neutral-50 last:border-b-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {s.type === 'hotel' ? (
                      <Building className="w-4 h-4 text-neutral-900 shrink-0" />
                    ) : s.type === 'location' ? (
                      <MapPin className="w-4 h-4 text-neutral-900 shrink-0" />
                    ) : (
                      <Globe className="w-4 h-4 text-neutral-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-normal text-neutral-900 truncate">{s.label}</div>
                      {s.subLabel && <div className="text-[10px] text-neutral-400 font-mono truncate">{s.subLabel}</div>}
                    </div>
                  </div>
                  {s.type === 'hotel' ? (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 text-white shrink-0">
                      Hotel
                    </span>
                  ) : s.type === 'location' ? (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200 shrink-0">
                      Destination
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Check-in Date */}
        <div className="md:col-span-2">
          <label className="block text-xs text-neutral-400 font-light mb-1.5">Check - in</label>
          <div className="flex items-center bg-neutral-100/90 border border-neutral-200/70 rounded-2xl px-3 py-3 focus-within:border-black focus-within:bg-white transition-all">
            <Calendar className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
            <input
              type="date"
              value={checkIn}
              min={minCheckIn}
              onChange={(e) => handleCheckInChange(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-neutral-800 focus:outline-none font-light"
            />
          </div>
        </div>

        {/* Check-out Date */}
        <div className="md:col-span-2">
          <label className="block text-xs text-neutral-400 font-light mb-1.5">Check - out</label>
          <div className="flex items-center bg-neutral-100/90 border border-neutral-200/70 rounded-2xl px-3 py-3 focus-within:border-black focus-within:bg-white transition-all">
            <Calendar className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
            <input
              type="date"
              value={checkOut}
              min={getMinCheckOutFor(checkIn)}
              onChange={(e) => handleCheckOutChange(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-neutral-800 focus:outline-none font-light"
            />
          </div>
        </div>

        {/* Guests & Rooms */}
        <div className="md:col-span-2">
          <label className="block text-xs text-neutral-400 font-light mb-1.5">Guests & Rooms</label>
          <div className="flex items-center bg-neutral-100/90 border border-neutral-200/70 rounded-2xl px-3 py-3 focus-within:border-black focus-within:bg-white transition-all">
            <Users className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
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
                } else {
                  const [g, r] = e.target.value.split('-').map(Number);
                  setGuests(g);
                  setRooms(r);
                }
              }}
              className="w-full bg-transparent text-xs sm:text-sm text-neutral-800 focus:outline-none font-light cursor-pointer"
            >
              <option value="all">Show All (Any hotel with ≥1 room)</option>
              <option value="1-1">1 Guest, 1 Room</option>
              <option value="2-1">2 Guests, 1 Room</option>
              <option value="3-1">3 Guests, 1 Room</option>
              <option value="4-2">4 Guests, 2 Rooms</option>
              <option value="5-2">5 Guests, 2 Rooms</option>
              <option value="6-3">6 Guests, 3 Rooms</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full rounded-2xl bg-black hover:bg-neutral-800 text-white py-3.5 px-5 text-sm font-normal flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer select-none"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </div>
      </form>
    </div>
  );
};

