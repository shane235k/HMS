// apps/web/src/components/map/GlobeMap.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';

// Ensure MapLibre Web Worker loads reliably in Next.js/Webpack environment
if (typeof window !== 'undefined') {
  try {
    maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
  } catch (_) { }
}
import { DestinationSearch } from './DestinationSearch';
import { HotelPreviewCard } from './HotelPreviewCard';
import { HotelGeoJsonCollection, HotelGeoJsonProperties, HotelCategory } from '@hbms/shared';
import { apiFetch } from '@/lib/api';
import {
  Globe, Compass, Play, Pause, Plus, Minus,
  AlertTriangle, Layers, ExternalLink,
} from 'lucide-react';

interface GlobeMapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  className?: string;
  onSelectHotel?: (hotel: HotelGeoJsonProperties) => void;
}

const ROTATION_SPEED_DEG_PER_SEC = 1.5;
const IDLE_RESUME_DELAY_MS = 6000;

const HOTELS_FALLBACK: HotelGeoJsonCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', id: 'hotel-dubai', geometry: { type: 'Point', coordinates: [55.1389, 25.1124] }, properties: { id: '6af18cf91ed08fb37acd27d8', name: 'Emirates Mirage Palace', slug: 'emirates-mirage-palace', category: HotelCategory.LUXURY, star_rating: 5, address: 'Palm Jumeirah', city: 'Dubai', state: 'Dubai', country: 'UAE', postal_code: '00000', phone: '+971 4 301 7777', email: 'vip@miragedubai.ae', currency: 'INR', starting_price_cents: 3800000, total_rooms: 9, description: 'Monumental palace on Palm Jumeirah.' } },
    { type: 'Feature', id: 'hotel-nyc', geometry: { type: 'Point', coordinates: [-73.9834, 40.7571] }, properties: { id: '6af18cf91ed08fb37acd27d6', name: 'The Manhattan Executive Suites', slug: 'the-manhattan-executive-suites', category: HotelCategory.BUSINESS, star_rating: 4, address: '109 W 45th St', city: 'New York', state: 'New York', country: 'United States', postal_code: '10036', phone: '+1 212 555 7800', email: 'reservations@manhattansuites.com', currency: 'INR', starting_price_cents: 1850000, total_rooms: 9, description: 'Sleek tower near Times Square.' } },
    { type: 'Feature', id: 'hotel-bali', geometry: { type: 'Point', coordinates: [115.2285, -8.8032] }, properties: { id: '6af18cf91ed08fb37acd27d4', name: 'Azure Haven Resort', slug: 'azure-haven-resort', category: HotelCategory.RESORT, star_rating: 5, address: 'Jl. Raya Nusa Dua', city: 'Bali', state: 'Bali', country: 'Indonesia', postal_code: '80363', phone: '+62 361 770000', email: 'concierge@azurehaven.com', currency: 'INR', starting_price_cents: 2200000, total_rooms: 10, description: 'Ocean-view suites and infinity pools.' } },
    { type: 'Feature', id: 'hotel-tokyo', geometry: { type: 'Point', coordinates: [139.7649, 35.6719] }, properties: { id: '6af18cf91ed08fb37acd27d2', name: 'Sakura Boutique Hotel Tokyo', slug: 'sakura-boutique-hotel-tokyo', category: HotelCategory.BOUTIQUE, star_rating: 5, address: '4-12-8 Ginza', city: 'Tokyo', state: 'Tokyo', country: 'Japan', postal_code: '104-0061', phone: '+81 3 5555 0123', email: 'stay@sakurahotel.jp', currency: 'INR', starting_price_cents: 1950000, total_rooms: 9, description: 'Japanese luxury in Ginza.' } },
    { type: 'Feature', id: 'hotel-paris', geometry: { type: 'Point', coordinates: [2.3376, 48.8606] }, properties: { id: '6af18cf81ed08fb37acd27ce', name: 'Le Grand Luxe Paris', slug: 'le-grand-luxe-paris', category: HotelCategory.LUXURY, star_rating: 5, address: '25 Rue de Rivoli', city: 'Paris', state: 'Île-de-France', country: 'France', postal_code: '75001', phone: '+33 1 42 68 00 00', email: 'reservations@grandluxe.com', currency: 'INR', starting_price_cents: 2400000, total_rooms: 9, description: 'Historic palace overlooking the Louvre.' } },
  ],
};

/**
 * Apply monochromatic dark-globe palette onto the loaded osm-bright-smooth style.
 * Using setPaintProperty() ensures high-contrast geography:
 *
 * Palette:
 *   Space/Canvas background      → #000000  pure black
 *   Ocean/water fill             → #090a0f  near-void black (subtly lighter than pure black space)
 *   Land/continents (background) → #282c37  clearly visible dark slate
 *   Land-use / parks             → #282c37  blends into landmass
 *   Country borders              → #8b949e  crisp visible silver
 *   Province/state borders       → #484f58  subtle dark border
 *   Country labels               → #f0f6fc  crisp white with dark halo
 *   City labels                  → #c9d1d9  clear silver
 *   Ocean labels                 → #484f58  muted dark
 */
function applyDarkPalette(map: maplibregl.Map) {
  const safe = (id: string, prop: string, value: any) => {
    try {
      if (map.getLayer(id)) map.setPaintProperty(id, prop as any, value);
    } catch (_) { }
  };

  // Land / continents base — prominent slate color with strong contrast against oceans
  safe('background', 'background-color', '#343946');

  // Land-use / landcover fills → slate to match continents cohesively
  [
    'landcover-glacier', 'landcover-wood', 'landcover-grass', 'landcover-grass-park',
    'landcover-ice-shelf', 'landuse-residential', 'landuse-commercial', 'landuse-industrial',
    'landuse-cemetery', 'landuse-hospital', 'landuse-school', 'landuse-railway',
    'park', 'building', 'building-top',
  ].forEach(id => {
    safe(id, 'fill-color', '#343946');
    safe(id, 'fill-opacity', 1);
  });

  // Water / oceans → deep void black (sharp, striking contrast against #343946 continents)
  safe('water-offset', 'fill-color', '#06070a');
  safe('water-offset', 'fill-opacity', 1);
  safe('water', 'fill-color', '#06070a');
  safe('water', 'fill-opacity', 1);
  safe('water-pattern', 'fill-opacity', 0); // remove wavy texture

  // Hide noisy roads and transport lines at globe level
  [
    'waterway-other', 'waterway-stream-canal', 'waterway-river', 'ferry',
    'highway-area', 'highway-minor-casing', 'highway-secondary-tertiary-casing',
    'highway-path', 'highway-minor', 'highway-secondary-tertiary', 'highway-primary', 'highway-trunk',
    'railway-transit', 'railway-transit-hatching', 'railway-service', 'railway-service-hatching',
    'railway', 'railway-hatching',
    'tunnel-service-track-casing', 'tunnel-minor-casing', 'tunnel-secondary-tertiary-casing',
    'tunnel-trunk-primary-casing', 'tunnel-motorway-casing', 'tunnel-path',
    'tunnel-service-track', 'tunnel-minor', 'tunnel-secondary-tertiary', 'tunnel-trunk-primary',
    'tunnel-motorway', 'tunnel-railway',
    'bridge-motorway-link-casing', 'bridge-link-casing', 'bridge-secondary-tertiary-casing',
    'bridge-trunk-primary-casing', 'bridge-motorway-casing', 'bridge-path-casing',
    'bridge-path', 'bridge-motorway-link', 'bridge-link', 'bridge-secondary-tertiary',
    'bridge-trunk-primary', 'bridge-motorway', 'bridge-railway', 'bridge-railway-hatching',
    'park-outline',
  ].forEach(id => {
    safe(id, 'line-color', 'transparent');
    safe(id, 'line-opacity', 0);
  });

  // Country & regional boundaries → bright visible silver outlines
  safe('boundary-land-level-2', 'line-color', '#a1a1aa');
  safe('boundary-land-level-2', 'line-width', 1.4);
  safe('boundary-land-level-2', 'line-opacity', 1.0);
  safe('boundary-land-level-4', 'line-color', '#52525b');
  safe('boundary-land-level-4', 'line-width', 0.9);
  safe('boundary-land-level-4', 'line-opacity', 0.8);
  safe('boundary-land-disputed', 'line-color', '#52525b');
  safe('boundary-land-disputed', 'line-opacity', 0.6);
  safe('boundary-water', 'line-color', '#06070a');
  safe('boundary-water', 'line-opacity', 0);

  // Country labels → crisp pure white with black halo
  ['place-country-1', 'place-country-2', 'place-country-3', 'place-country-other'].forEach(id => {
    safe(id, 'text-color', '#ffffff');
    safe(id, 'text-halo-color', '#000000');
    safe(id, 'text-halo-width', 2.5);
  });

  // City & capital labels → clear silver
  ['place-city', 'place-city-capital', 'place-town'].forEach(id => {
    safe(id, 'text-color', '#e4e4e7');
    safe(id, 'text-halo-color', '#000000');
    safe(id, 'text-halo-width', 2);
  });

  // Ocean / water labels → subtle dark
  ['water-name-ocean', 'water-name-lakeline', 'water-name-other'].forEach(id => {
    safe(id, 'text-color', '#52525b');
    safe(id, 'text-halo-color', '#06070a');
    safe(id, 'text-halo-width', 1.5);
  });

  // Suppress small symbols at globe scale
  ['place-other', 'place-village', 'place-continent', 'omt_watermark'].forEach(id => {
    safe(id, 'text-opacity', 0);
  });
}

export default function GlobeMap({
  initialCenter = [15, 25],
  initialZoom = 1.7,
  className = '',
  onSelectHotel,
}: GlobeMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const domMarkersRef = useRef<maplibregl.Marker[]>([]);

  // Capture initial props into refs once so default array references never trigger effect re-runs
  const initialCenterRef = useRef<[number, number]>(initialCenter);
  const initialZoomRef = useRef<number>(initialZoom);

  // Keep callback and selection state refs updated
  const onSelectHotelRef = useRef(onSelectHotel);
  onSelectHotelRef.current = onSelectHotel;

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const isInteractingRef = useRef<boolean>(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isRotating, setIsRotating] = useState(true);
  const isRotatingRef = useRef(isRotating);
  isRotatingRef.current = isRotating;

  const [isGlobeProjection, setIsGlobeProjection] = useState(true);
  const [selectedHotel, setSelectedHotel] = useState<HotelGeoJsonProperties | null>(null);
  const selectedHotelRef = useRef(selectedHotel);
  selectedHotelRef.current = selectedHotel;

  const [hotelsData, setHotelsData] = useState<HotelGeoJsonCollection>(HOTELS_FALLBACK);
  const [mapError, setMapError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || '';

  const pauseRotation = useCallback(() => {
    isInteractingRef.current = true;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false;
      lastTimeRef.current = performance.now();
    }, IDLE_RESUME_DELAY_MS);
  }, []);

  // Stable animation loop that reads current rotation and interaction state from refs
  const rotateGlobe = useCallback((now: number) => {
    const dt = (now - lastTimeRef.current) / 1000;
    lastTimeRef.current = now;
    if (
      mapRef.current &&
      isRotatingRef.current &&
      !isInteractingRef.current &&
      !selectedHotelRef.current &&
      dt > 0 &&
      dt < 0.5
    ) {
      const c = mapRef.current.getCenter();
      mapRef.current.setCenter([(c.lng + ROTATION_SPEED_DEG_PER_SEC * dt) % 360, c.lat]);
    }
    animFrameRef.current = requestAnimationFrame(rotateGlobe);
  }, []);

  // Render DOM markers cleanly onto the map
  const renderMarkers = useCallback((map: maplibregl.Map, collection: HotelGeoJsonCollection) => {
    domMarkersRef.current.forEach(m => m.remove());
    domMarkersRef.current = [];

    collection.features.forEach(feat => {
      const coords = feat.geometry.coordinates as [number, number];
      const hotel = feat.properties as HotelGeoJsonProperties;

      // Outer wrapper
      const el = document.createElement('div');
      el.setAttribute(
        'style',
        'display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;'
      );

      // Label pill above marker
      const pill = document.createElement('div');
      pill.setAttribute(
        'style',
        [
          'margin-bottom:8px',
          'padding:4px 10px',
          'background:rgba(0,0,0,0.92)',
          'border:1px solid rgba(255,255,255,0.3)',
          'border-radius:999px',
          'display:flex',
          'align-items:center',
          'gap:5px',
          'white-space:nowrap',
          'box-shadow:0 4px 24px rgba(0,0,0,0.8)',
          'transition:border-color 0.2s,transform 0.2s',
          'pointer-events:none',
        ].join(';')
      );
      pill.innerHTML = `
        <span style="width:5px;height:5px;border-radius:50%;background:#ffffff;flex-shrink:0;"></span>
        <span style="color:#ffffff;font-size:11px;font-weight:400;font-family:inherit;">${hotel.city}</span>
        <span style="color:#6b7280;font-size:10px;">·</span>
        <span style="color:#d1d5db;font-size:10px;font-family:inherit;">${hotel.name}</span>
      `;

      // Ping ring wrapper
      const pingWrap = document.createElement('div');
      pingWrap.setAttribute(
        'style',
        'position:relative;display:flex;align-items:center;justify-content:center;'
      );

      const ping = document.createElement('span');
      ping.setAttribute(
        'style',
        [
          'position:absolute',
          'width:28px',
          'height:28px',
          'border-radius:50%',
          'background:rgba(255,255,255,0.25)',
          'animation:pin-pulse 1.8s ease-out infinite',
        ].join(';')
      );

      const disc = document.createElement('span');
      disc.setAttribute(
        'style',
        [
          'position:relative',
          'width:12px',
          'height:12px',
          'border-radius:50%',
          'background:#ffffff',
          'border:2px solid #000000',
          'box-shadow:0 0 10px rgba(255,255,255,0.7)',
          'transition:transform 0.15s ease',
          'display:flex',
          'align-items:center',
          'justify-content:center',
        ].join(';')
      );

      const core = document.createElement('span');
      core.setAttribute('style', 'width:3px;height:3px;border-radius:50%;background:#000000;');
      disc.appendChild(core);
      pingWrap.appendChild(ping);
      pingWrap.appendChild(disc);

      el.appendChild(pill);
      el.appendChild(pingWrap);

      el.addEventListener('mouseenter', () => {
        disc.style.transform = 'scale(1.35)';
        pill.style.borderColor = 'rgba(255,255,255,0.75)';
        pill.style.transform = 'scale(1.05)';
      });
      el.addEventListener('mouseleave', () => {
        disc.style.transform = 'scale(1)';
        pill.style.borderColor = 'rgba(255,255,255,0.3)';
        pill.style.transform = 'scale(1)';
      });
      el.addEventListener('click', e => {
        e.stopPropagation();
        setSelectedHotel(hotel);
        if (onSelectHotelRef.current) onSelectHotelRef.current(hotel);
        pauseRotation();
        map.flyTo({ center: coords, zoom: 10, pitch: 40, duration: 1800 });
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(coords)
        .addTo(map);
      domMarkersRef.current.push(marker);
    });
  }, [pauseRotation]);

  // Main MapLibre Initialization Effect — RUNS EXACTLY ONCE on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!apiKey) {
      setMapError('NO_KEY');
      return;
    }

    let disposed = false;

    // Load osm-bright-smooth style from Geoapify, then override colors after load
    const styleUrl = `https://maps.geoapify.com/v1/styles/osm-bright-smooth/style.json?apiKey=${apiKey}`;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: initialCenterRef.current,
      zoom: initialZoomRef.current,
      minZoom: 1,
      maxZoom: 18,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: { antialias: true, alpha: false },
    });
    mapRef.current = map;
    if (typeof window !== 'undefined') (window as any).__map = map;

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    const handleStyleLoad = () => {
      if (disposed) return;

      // 1. Enable 3D Globe Projection
      try {
        map.setProjection({ type: 'globe' });
      } catch (_) { }

      // 2. Apply high-contrast monochromatic dark palette
      applyDarkPalette(map);

      // 3. Attach hotel markers with fallback data immediately
      renderMarkers(map, HOTELS_FALLBACK);

      // 4. Fetch live coordinates from API asynchronously without interrupting the map
      apiFetch<HotelGeoJsonCollection>('/hotels/map')
        .then(live => {
          if (!disposed && live?.features && live.features.length > 0) {
            setHotelsData(live);
            renderMarkers(map, live);
          }
        })
        .catch(() => {
          // Keep fallback data silently
        });
    };

    map.on('style.load', handleStyleLoad);

    map.on('error', e => {
      console.warn('[GlobeMap]', e.error?.message);
    });

    map.on('mousedown', pauseRotation);
    map.on('touchstart', pauseRotation);
    map.on('movestart', pauseRotation);
    map.on('zoomstart', pauseRotation);

    map.on('load', () => {
      if (!disposed) map.resize();
    });

    const onResize = () => {
      if (mapRef.current) mapRef.current.resize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      domMarkersRef.current.forEach(m => m.remove());
      domMarkersRef.current = [];
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [apiKey, pauseRotation, renderMarkers]);

  // Animation Loop Effect — starts once, stays active, reads from refs
  useEffect(() => {
    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(rotateGlobe);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [rotateGlobe]);

  const flyTo = (coords: [number, number]) => {
    if (!mapRef.current) return;
    pauseRotation();
    mapRef.current.flyTo({ center: coords, zoom: 10, pitch: 40, duration: 2500, essential: true });
  };

  const toggleRotation = () => {
    setIsRotating(prev => {
      const next = !prev;
      if (next) {
        lastTimeRef.current = performance.now();
        isInteractingRef.current = false;
      }
      return next;
    });
  };

  const toggleProjection = () => {
    if (!mapRef.current) return;
    const next = !isGlobeProjection;
    setIsGlobeProjection(next);
    try {
      mapRef.current.setProjection({ type: next ? 'globe' : 'mercator' });
    } catch (_) { }
  };

  const resetNorth = () => {
    if (!mapRef.current) return;
    pauseRotation();
    mapRef.current.resetNorthPitch({ duration: 800 });
  };

  const zoomIn = () => {
    if (!mapRef.current) return;
    pauseRotation();
    mapRef.current.zoomIn({ duration: 400 });
  };

  const zoomOut = () => {
    if (!mapRef.current) return;
    pauseRotation();
    mapRef.current.zoomOut({ duration: 400 });
  };

  if (mapError) {
    return (
      <div className={`relative w-full h-full bg-black flex items-center justify-center p-8 text-white ${className}`}>
        <div className="max-w-lg text-center space-y-4 p-8 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center mx-auto">
            {mapError === 'NO_KEY' ? <Globe className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
          </div>
          <h3 className="text-2xl font-normal text-white">
            {mapError === 'NO_KEY' ? 'Geoapify API Key Required' : 'Interactive Map Unavailable'}
          </h3>
          <p className="text-sm text-neutral-400 font-normal">
            Configure <code className="text-white bg-neutral-800 px-1 py-0.5 rounded text-xs">NEXT_PUBLIC_GEOAPIFY_API_KEY</code> in <code className="text-white bg-neutral-800 px-1 py-0.5 rounded text-xs">.env.local</code> to enable the 3D Globe.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <a href="/" className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-normal transition-colors">Return Home</a>
            <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-normal transition-colors inline-flex items-center gap-1.5 border border-neutral-700">
              Get Free API Key <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden bg-black select-none ${className}`}>
      <style>{`
        @keyframes pin-pulse {
          0%   { transform: scale(1);   opacity: 0.75; }
          100% { transform: scale(2.6); opacity: 0;   }
        }
        .maplibregl-marker.maplibregl-marker-covered {
          opacity: 0 !important;
          pointer-events: none !important;
          transition: opacity 0.25s ease !important;
        }
        .maplibregl-ctrl-attrib { font-size: 10px !important; }
        .maplibregl-ctrl-logo { display: none !important; }
      `}</style>

      {/* Full-bleed map canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0 bg-black" />

      {/* Top-left: Search + coordinate input + jump pills */}
      <div className="absolute top-20 sm:top-24 left-4 sm:left-8 z-20 pointer-events-auto w-[min(calc(100vw-32px),440px)]">
        <DestinationSearch
          apiKey={apiKey}
          onSelectDestination={flyTo}
          dark={true}
        />
      </div>

      {/* Top-right: Verified Properties Counter HUD */}
      <div className="hidden md:flex absolute top-20 sm:top-24 right-8 z-20 pointer-events-none items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/85 backdrop-blur-md border border-neutral-800 shadow-2xl text-xs text-white">
        <Globe className="w-4 h-4 text-neutral-300" />
        <span className="font-normal">Interactive 3D Globe</span>
        <span className="text-neutral-700">|</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white font-normal">{hotelsData.features.length}</span>
        <span className="text-neutral-400 font-normal">Global Partner Properties</span>
      </div>

      {/* Hotel preview card when a pin is selected */}
      {selectedHotel && (
        <div className="absolute bottom-14 left-4 sm:left-8 z-30 pointer-events-auto">
          <HotelPreviewCard
            hotel={selectedHotel}
            onClose={() => setSelectedHotel(null)}
            dark={true}
            onFocus={() => {
              if (!mapRef.current) return;
              const f = hotelsData.features.find(x => x.id === selectedHotel.id);
              if (f) {
                mapRef.current.easeTo({
                  center: f.geometry.coordinates as [number, number],
                  zoom: 12,
                  pitch: 45,
                  duration: 1200,
                });
              }
            }}
          />
        </div>
      )}

      {/* Floating HUD Controls */}
      <div className="absolute right-4 sm:right-8 bottom-14 z-20 flex flex-col gap-2 pointer-events-auto">
        {([
          { icon: isRotating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />, fn: toggleRotation, label: 'Toggle rotation' },
          { icon: <Compass className="w-4 h-4" />, fn: resetNorth, label: 'Reset north' },
          { icon: <Layers className="w-4 h-4" />, fn: toggleProjection, label: 'Toggle projection' },
          { icon: <Plus className="w-4 h-4" />, fn: zoomIn, label: 'Zoom in' },
          { icon: <Minus className="w-4 h-4" />, fn: zoomOut, label: 'Zoom out' },
        ] as { icon: React.ReactNode; fn: () => void; label: string }[]).map((btn, i) => (
          <button
            key={i}
            type="button"
            onClick={btn.fn}
            title={btn.label}
            className="w-10 h-10 rounded-xl bg-black/85 hover:bg-neutral-900 backdrop-blur-md border border-neutral-800 hover:border-neutral-600 text-neutral-400 hover:text-white shadow-xl flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
          >
            {btn.icon}
          </button>
        ))}
      </div>

      {/* Bottom-left Geospatial status */}
      <div className="absolute bottom-14 left-4 sm:left-8 z-10 pointer-events-none hidden md:flex items-center gap-2 text-[11px] text-neutral-400 bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-neutral-800 font-normal">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Voyage Planetary Discovery • Live Geospatial</span>
      </div>
    </div>
  );
}
