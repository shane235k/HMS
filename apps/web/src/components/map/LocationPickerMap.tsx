// apps/web/src/components/map/LocationPickerMap.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// Ensure MapLibre Web Worker loads reliably in Next.js environment
if (typeof window !== 'undefined') {
  try {
    maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
  } catch (_) {}
}

export interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lon: number) => void;
  className?: string;
  zoom?: number;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onChange,
  className = '',
  zoom = 13,
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const isInternalMove = useRef(false);

  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || '';

  // Determine map style: Geoapify if key present, else CartoDB Positron (clean monochromatic)
  const styleUrl = apiKey
    ? `https://maps.geoapify.com/v1/styles/osm-bright-smooth/style.json?apiKey=${apiKey}`
    : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLng = !isNaN(longitude) ? longitude : 77.209;
    const initialLat = !isNaN(latitude) ? latitude : 28.6139;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: [initialLng, initialLat],
      zoom: zoom,
      minZoom: 2,
      maxZoom: 18,
      attributionControl: false,
    });

    // Custom Monochromatic Pin Element
    const el = document.createElement('div');
    el.className = 'cursor-grab active:cursor-grabbing';
    el.innerHTML = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: #000000; color: #FFFFFF; font-size: 10px; font-family: monospace; padding: 2px 8px; border-radius: 9999px; white-space: nowrap; margin-bottom: 4px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          Property Pin
        </div>
        <div style="width: 28px; height: 28px; background: #000000; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);">
          <div style="width: 10px; height: 10px; background: #FFFFFF; border-radius: 50%;"></div>
        </div>
      </div>
    `;

    const marker = new maplibregl.Marker({
      element: el,
      draggable: true,
    })
      .setLngLat([initialLng, initialLat])
      .addTo(map);

    markerRef.current = marker;

    // Drag end listener
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      isInternalMove.current = true;
      onChange(Number(lngLat.lat.toFixed(6)), Number(lngLat.lng.toFixed(6)));
    });

    // Map click listener
    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      marker.setLngLat([lng, lat]);
      isInternalMove.current = true;
      onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
    });

    map.on('load', () => {
      setMapLoaded(true);
    });

    mapInstanceRef.current = map;

    return () => {
      marker.remove();
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [styleUrl]);

  // Sync external coordinate changes into map
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    if (isNaN(latitude) || isNaN(longitude)) return;

    if (isInternalMove.current) {
      isInternalMove.current = false;
      return;
    }

    markerRef.current.setLngLat([longitude, latitude]);
    mapInstanceRef.current.easeTo({
      center: [longitude, latitude],
      duration: 600,
    });
  }, [latitude, longitude]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn({ duration: 300 });
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut({ duration: 300 });
    }
  };

  const handleResetCenter = () => {
    if (mapInstanceRef.current && !isNaN(longitude) && !isNaN(latitude)) {
      mapInstanceRef.current.flyTo({
        center: [longitude, latitude],
        zoom: 14,
        duration: 800,
      });
    }
  };

  return (
    <div className={`relative w-full h-[320px] rounded-2xl overflow-hidden border border-neutral-300 bg-neutral-100 ${className}`}>
      {/* The MapLibre Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading Skeleton */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-neutral-100 flex items-center justify-center text-xs text-neutral-500 font-mono">
          Loading interactive map layer...
        </div>
      )}

      {/* Top Floating Instruction Pill */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xs border border-neutral-200 text-[11px] font-normal text-neutral-800 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-neutral-900" />
          <span>Click anywhere or drag pin to position hotel</span>
        </div>
      </div>

      {/* Bottom Map Controls */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-800 hover:bg-neutral-50 shadow-xs transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-800 hover:bg-neutral-50 shadow-xs transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleResetCenter}
          title="Center Pin"
          className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-800 hover:bg-neutral-50 shadow-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

