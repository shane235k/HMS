// apps/web/src/components/dashboard/OperationalRingChart.tsx
'use client';

import React, { useState } from 'react';

export interface OperationalStatusItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
  hexColor: string;
  dotColor?: string;
  description?: string;
}

export interface OperationalRingChartProps {
  title?: string;
  subtitle?: string;
  totalRooms: number;
  items: OperationalStatusItem[];
  turnoverCount?: number;
  readinessScore?: number;
  layout?: 'auto' | 'stacked' | 'side-by-side';
  className?: string;
}

export function OperationalRingChart({
  title = 'Physical Rooms Operational Status',
  subtitle = 'Real-time room lifecycle and turnover tracking',
  totalRooms,
  items,
  turnoverCount,
  readinessScore,
  layout = 'auto',
  className = '',
}: OperationalRingChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Default descending shades of black
  const defaultShades = ['#000000', '#333333', '#555555', '#777777', '#999999', '#CCCCCC'];

  // Ensure all items strictly have a shade of black
  const normalizedItems = items.map((item, idx) => ({
    ...item,
    hexColor: item.hexColor || defaultShades[idx % defaultShades.length],
  }));

  // Filter items with count > 0 for ring rendering
  const activeSlices = normalizedItems.filter((item) => item.count > 0);

  // Determine dominant or hovered item for the callout pill
  const dominantItem = normalizedItems.reduce(
    (max, item) => (item.count > max.count ? item : max),
    normalizedItems[0] || { key: 'READY', label: 'Ready for Guests', count: 0, percentage: 0, hexColor: '#000000' }
  );

  const activeItem = hoveredKey
    ? normalizedItems.find((i) => i.key === hoveredKey) || dominantItem
    : dominantItem;

  // SVG Donut Math
  const radius = 54;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  const gap = activeSlices.length > 1 ? 3 : 0;

  let cumulativeLength = 0;
  const slicesWithOffsets = activeSlices.map((slice) => {
    const fraction = totalRooms > 0 ? slice.count / totalRooms : 0;
    const sliceLength = fraction * circumference;
    const dash = Math.max(0, sliceLength - gap);
    const offset = cumulativeLength;
    cumulativeLength += sliceLength;
    return {
      ...slice,
      dash,
      offset,
    };
  });

  const layoutClass =
    layout === 'stacked'
      ? 'flex flex-col items-center gap-4'
      : layout === 'side-by-side'
      ? 'flex flex-row items-center justify-between gap-5'
      : 'flex flex-col 2xl:flex-row items-center justify-center gap-5';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between border-b border-charcoal-200 pb-3">
          <div>
            <h3 className="text-base font-normal text-charcoal-900 font-sans tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs font-normal text-charcoal-500 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-canvas-neutral border border-charcoal-200 text-charcoal-700 font-normal shrink-0">
            {totalRooms} Rooms
          </span>
        </div>
      )}

      {/* Ring Chart & Legend Layout */}
      <div className={`${layoutClass} pt-1`}>
        {/* Ring Chart Container with Center Badge */}
        <div className="relative flex flex-col items-center shrink-0">
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
              {/* Background Ring */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke="#f4f4f5"
                strokeWidth={strokeWidth}
              />

              {/* Slices */}
              {totalRooms > 0 &&
                slicesWithOffsets.map((slice) => {
                  const isHovered = hoveredKey === slice.key;
                  return (
                    <circle
                      key={slice.key}
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke={slice.hexColor}
                      strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                      strokeDasharray={`${slice.dash} ${circumference - slice.dash}`}
                      strokeDashoffset={-slice.offset}
                      strokeLinecap="butt"
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredKey(slice.key)}
                      onMouseLeave={() => setHoveredKey(null)}
                    />
                  );
                })}
            </svg>

            {/* Inner Donut Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-normal font-mono text-charcoal-900 leading-none">
                {totalRooms}
              </span>
              <span className="text-[10px] text-charcoal-500 uppercase tracking-wider font-normal mt-0.5 font-mono">
                Rooms
              </span>
            </div>
          </div>

          {/* Floating Callout Pill (Exact match to reference photo) */}
          <div className="mt-3 w-full flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black text-white text-[11px] font-normal shadow-sm border border-neutral-800 max-w-full">
              <span className="font-mono text-white font-normal shrink-0">
                {activeItem?.percentage ?? 0}%
              </span>
              <span className="text-neutral-500 font-normal">—</span>
              <span className="text-neutral-200 font-normal truncate max-w-[170px]">
                {activeItem?.label || 'Total Rooms'}
              </span>
            </div>
          </div>
        </div>

        {/* Legend on Right (Exact match to reference photo) */}
        <div className="flex-1 w-full space-y-1.5">
          {normalizedItems.map((item) => {
            const isHovered = hoveredKey === item.key;
            return (
              <div
                key={item.key}
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`flex items-center justify-between text-xs cursor-pointer py-1 px-2 rounded-lg transition-colors font-normal ${
                  isHovered ? 'bg-neutral-100 text-charcoal-900' : 'text-charcoal-700 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.hexColor }}
                  />
                  <span className="truncate font-normal text-xs" title={item.label}>
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-charcoal-600 shrink-0 ml-2">
                  <span className="text-charcoal-900 font-normal">({item.count})</span>
                  <span className="text-[10px] text-charcoal-400 font-normal">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Optional Readiness Score & Turnover Summary Footer */}
      {(readinessScore !== undefined || turnoverCount !== undefined) && (
        <div className="pt-2 border-t border-charcoal-200 flex items-center justify-between text-xs font-normal text-charcoal-600">
          {readinessScore !== undefined && (
            <span>
              Readiness Score:{' '}
              <span className="text-neutral-900 font-mono font-normal">
                {readinessScore}%
              </span>
            </span>
          )}
          {turnoverCount !== undefined && (
            <span className="font-mono text-charcoal-500 font-normal">
              {turnoverCount} in turnover cycle
            </span>
          )}
        </div>
      )}
    </div>
  );
}
