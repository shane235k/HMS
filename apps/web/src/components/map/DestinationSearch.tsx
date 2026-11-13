// apps/web/src/components/map/DestinationSearch.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, Sparkles, Building } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface DestinationResult {
  formatted: string;
  city: string;
  country: string;
  lon: number;
  lat: number;
  place_id?: string;
  badge?: string;
  isDb?: boolean;
}

interface DestinationSearchProps {
  apiKey?: string;
  onSelectDestination: (coords: [number, number], label: string) => void;
  className?: string;
  dark?: boolean;
}

// In-memory client-side cache for autocomplete results to conserve API quota
const autocompleteCache = new Map<string, DestinationResult[]>();

const FEATURED_DESTINATIONS: Array<{
  name: string;
  country: string;
  coords: [number, number]; // [lng, lat]
}> = [
  { name: 'Paris', country: 'France', coords: [2.3376, 48.8606] },
  { name: 'Tokyo', country: 'Japan', coords: [139.764, 35.6719] },
  { name: 'Bali', country: 'Indonesia', coords: [115.2289, -8.8032] },
  { name: 'New York', country: 'USA', coords: [-73.9834, 40.7571] },
  { name: 'Dubai', country: 'UAE', coords: [55.1389, 25.1124] },
];

export const DestinationSearch: React.FC<DestinationSearchProps> = ({
  apiKey,
  onSelectDestination,
  className = '',
  dark = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DestinationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced autocomplete query with 350ms delay
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Check if user entered direct coordinates (e.g., "48.86, 2.34" or "25.1124, 55.1389")
    const coordMatch = trimmed.match(/^([-+]?[0-9]*\.?[0-9]+)[,\s]+([-+]?[0-9]*\.?[0-9]+)$/);
    if (coordMatch) {
      const val1 = parseFloat(coordMatch[1]);
      const val2 = parseFloat(coordMatch[2]);
      let lat = val1;
      let lon = val2;
      // If first number > 90 and second <= 90, assume user provided [lon, lat]
      if (Math.abs(val1) > 90 && Math.abs(val2) <= 90) {
        lon = val1;
        lat = val2;
      }
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        const coordResult: DestinationResult = {
          formatted: `Coordinates: ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
          city: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
          country: 'Target Geospatial Coordinates',
          lon,
          lat,
        };
        setResults([coordResult]);
        setLoading(false);
        setIsOpen(true);
        return;
      }
    }

    // Check in-memory cache first
    const cacheKey = trimmed.toLowerCase();
    if (autocompleteCache.has(cacheKey)) {
      setResults(autocompleteCache.get(cacheKey)!);
      setIsOpen(true);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const combinedResults: DestinationResult[] = [];
        const seenKeys = new Set<string>();

        // 1. Query Database matches from our platform (/hotels/destinations)
        try {
          const dbDestinations = await apiFetch<any[]>(
            `/hotels/destinations?q=${encodeURIComponent(trimmed)}`
          );

          for (const item of dbDestinations || []) {
            if (
              typeof item.latitude === 'number' &&
              typeof item.longitude === 'number' &&
              !isNaN(item.latitude) &&
              !isNaN(item.longitude)
            ) {
              const key = `${item.latitude.toFixed(4)},${item.longitude.toFixed(4)}`;
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                combinedResults.push({
                  formatted: item.label,
                  city: item.name || item.city,
                  country: item.country || '',
                  lon: item.longitude,
                  lat: item.latitude,
                  badge: item.type === 'hotel' ? 'Hotel' : 'Destination',
                  isDb: true,
                });
              }
            }
          }
        } catch (dbErr) {
          // graceful fallback
        }

        // 2. Query Geoapify Geocoding if API key is provided
        if (apiKey) {
          try {
            const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
              trimmed
            )}&type=city&format=json&limit=5&apiKey=${apiKey}`;

            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              for (const r of data.results || []) {
                const key = `${Number(r.lat).toFixed(4)},${Number(r.lon).toFixed(4)}`;
                if (!seenKeys.has(key)) {
                  seenKeys.add(key);
                  combinedResults.push({
                    formatted: r.formatted || `${r.city || r.name}, ${r.country}`,
                    city: r.city || r.name || trimmed,
                    country: r.country || '',
                    lon: r.lon,
                    lat: r.lat,
                    place_id: r.place_id,
                    badge: 'Global Location',
                    isDb: false,
                  });
                }
              }
            }
          } catch (geoErr) {
            console.warn('Geoapify autocomplete error:', geoErr);
          }
        }

        // 3. Fallback filter over featured destinations if no results
        if (combinedResults.length === 0) {
          const localMatches = FEATURED_DESTINATIONS.filter(
            (d) =>
              d.name.toLowerCase().includes(cacheKey) ||
              d.country.toLowerCase().includes(cacheKey)
          ).map((d) => ({
            formatted: `${d.name}, ${d.country}`,
            city: d.name,
            country: d.country,
            lon: d.coords[0],
            lat: d.coords[1],
            badge: 'Featured',
          }));
          combinedResults.push(...localMatches);
        }

        autocompleteCache.set(cacheKey, combinedResults);
        setResults(combinedResults);
        setIsOpen(true);
      } catch (err) {
        console.warn('DestinationSearch error:', err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, apiKey]);

  const handleSelect = (dest: DestinationResult) => {
    setQuery(dest.city || dest.formatted);
    setIsOpen(false);
    onSelectDestination([dest.lon, dest.lat], dest.formatted);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const inputBarClass = dark
    ? 'relative flex items-center bg-neutral-900/90 backdrop-blur-md rounded-2xl border border-neutral-700 shadow-2xl px-4 py-3 focus-within:border-white focus-within:ring-2 focus-within:ring-white/10 transition-all'
    : 'relative flex items-center bg-white/95 backdrop-blur-md rounded-2xl border border-neutral-200 shadow-floating px-4 py-3 focus-within:border-black focus-within:ring-2 focus-within:ring-black/10 transition-all';

  return (
    <div ref={wrapperRef} className={`relative w-full max-w-lg ${className}`}>
      {/* Search Input Bar */}
      <div className={inputBarClass}>
        <Search className={`w-5 h-5 shrink-0 mr-3 ${dark ? 'text-neutral-400' : 'text-neutral-400'}`} />
        <input
          type="text"
          placeholder="Search global destinations or coordinates (e.g. Paris, Tokyo, 48.86, 2.34)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results.length > 0) {
              e.preventDefault();
              handleSelect(results[0]);
            }
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className={`w-full bg-transparent text-sm focus:outline-none font-normal ${
            dark ? 'text-white placeholder-neutral-500' : 'text-neutral-900 placeholder-neutral-400'
          }`}
        />

        {loading ? (
          <Loader2 className={`w-4 h-4 animate-spin shrink-0 ml-2 ${dark ? 'text-white' : 'text-black'}`} />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className={`p-1 transition-colors shrink-0 ml-2 ${
              dark ? 'text-neutral-400 hover:text-white' : 'text-neutral-400 hover:text-neutral-700'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Quick Pills for Featured Destinations */}
      <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
        <span
          className={`text-[11px] uppercase tracking-wider shrink-0 flex items-center gap-1 font-normal ${
            dark ? 'text-neutral-400' : 'text-neutral-500'
          }`}
        >
          <Sparkles className={`w-3 h-3 ${dark ? 'text-neutral-300' : 'text-neutral-700'}`} />
          Jump to:
        </span>
        {FEATURED_DESTINATIONS.map((d) => (
          <button
            key={d.name}
            type="button"
            onClick={() => {
              setQuery(d.name);
              onSelectDestination(d.coords, `${d.name}, ${d.country}`);
            }}
            className={`text-xs px-2.5 py-1 rounded-full border shadow-sm transition-all whitespace-nowrap font-normal ${
              dark
                ? 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-700 hover:border-white text-neutral-300 hover:text-white'
                : 'bg-white/90 hover:bg-neutral-100 border-neutral-200 hover:border-black text-neutral-700 hover:text-black'
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          className={`absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden divide-y max-h-64 overflow-y-auto ${
            dark
              ? 'bg-neutral-900 border-neutral-700 divide-neutral-800 text-white'
              : 'bg-white border-neutral-200 divide-neutral-100 text-neutral-900'
          }`}
        >
          {results.map((res, idx) => (
            <button
              key={`${res.lon}-${res.lat}-${idx}`}
              type="button"
              onClick={() => handleSelect(res)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors group font-normal ${
                dark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  dark
                    ? 'bg-neutral-800 text-neutral-300 group-hover:bg-white group-hover:text-black'
                    : 'bg-neutral-100 text-neutral-800 group-hover:bg-black group-hover:text-white'
                }`}
              >
                {res.badge?.includes('Hotel') ? (
                  <Building className="w-4 h-4" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
              </div>
              <div className="truncate flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-normal truncate ${dark ? 'text-white' : 'text-neutral-900 group-hover:text-black'}`}>
                    {res.city}
                  </span>
                  {res.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded tracking-wide border font-normal shrink-0 ${
                        res.isDb
                          ? dark
                            ? 'bg-neutral-800 text-neutral-200 border-neutral-700'
                            : 'bg-neutral-100 text-neutral-800 border-neutral-200'
                          : dark
                            ? 'text-neutral-500 border-neutral-800'
                            : 'text-neutral-400 border-neutral-200'
                      }`}
                    >
                      {res.badge}
                    </span>
                  )}
                </div>
                <div className={`text-xs truncate font-normal ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {res.formatted}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
