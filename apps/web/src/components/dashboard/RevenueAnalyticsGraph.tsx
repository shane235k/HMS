// apps/web/src/components/dashboard/RevenueAnalyticsGraph.tsx
'use client';

import React, { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { formatCurrencyMinor } from '@hbms/shared';

export interface AnalyticsDataPoint {
  label: string;
  revenueCents: number;
  revenueFormatted: string;
  transactionsCount: number;
}

export interface AnalyticsPeriodBundle {
  today: AnalyticsDataPoint[];
  week: AnalyticsDataPoint[];
  month: AnalyticsDataPoint[];
  year: AnalyticsDataPoint[];
}

export type RevenueMetric = 'cash_inflow' | 'realized_revenue' | 'compare';
export type RevenueTimeframe = 'today' | 'week' | 'month' | 'year';

export interface RevenueAnalyticsGraphProps {
  analytics?: {
    cash_inflow?: AnalyticsPeriodBundle;
    realized_revenue?: AnalyticsPeriodBundle;
  };
  fallbackMonthlyRevenue?: Array<{
    month: string;
    revenueCents: number;
    revenueFormatted: string;
    transactionsCount: number;
  }>;
  annualGrossRevenueFormatted?: string;
  metric?: RevenueMetric;
  timeframe?: RevenueTimeframe;
  onMetricChange?: (metric: RevenueMetric) => void;
  onTimeframeChange?: (timeframe: RevenueTimeframe) => void;
  className?: string;
}

export function RevenueAnalyticsGraph({
  analytics,
  fallbackMonthlyRevenue = [],
  annualGrossRevenueFormatted,
  metric: controlledMetric,
  timeframe: controlledTimeframe,
  onMetricChange,
  onTimeframeChange,
  className = '',
}: RevenueAnalyticsGraphProps) {
  const [internalMetric, setInternalMetric] = useState<RevenueMetric>('cash_inflow');
  const [internalTimeframe, setInternalTimeframe] = useState<RevenueTimeframe>('week');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const selectedMetric = controlledMetric !== undefined ? controlledMetric : internalMetric;
  const selectedTimeframe = controlledTimeframe !== undefined ? controlledTimeframe : internalTimeframe;

  const handleMetricChange = (newMetric: RevenueMetric) => {
    if (onMetricChange) onMetricChange(newMetric);
    setInternalMetric(newMetric);
  };

  const handleTimeframeChange = (newTimeframe: RevenueTimeframe) => {
    if (onTimeframeChange) onTimeframeChange(newTimeframe);
    setInternalTimeframe(newTimeframe);
  };

  // Standard blank fallback template generator
  const getBlankData = (tf: RevenueTimeframe): AnalyticsDataPoint[] => {
    if (tf === 'today') {
      return ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'].map((label) => ({
        label,
        revenueCents: 0,
        revenueFormatted: '₹0',
        transactionsCount: 0,
      }));
    }
    if (tf === 'week') {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => ({
        label,
        revenueCents: 0,
        revenueFormatted: '₹0',
        transactionsCount: 0,
      }));
    }
    if (tf === 'month') {
      return ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'].map((label) => ({
        label,
        revenueCents: 0,
        revenueFormatted: '₹0',
        transactionsCount: 0,
      }));
    }
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((label) => ({
      label,
      revenueCents: 0,
      revenueFormatted: '₹0',
      transactionsCount: 0,
    }));
  };

  // Derive cash_inflow series
  let inflowData: AnalyticsDataPoint[] = [];
  if (analytics?.cash_inflow?.[selectedTimeframe]) {
    inflowData = analytics.cash_inflow[selectedTimeframe];
  } else if (fallbackMonthlyRevenue.length > 0 && selectedTimeframe === 'year') {
    inflowData = fallbackMonthlyRevenue.map((m) => ({
      label: m.month,
      revenueCents: m.revenueCents,
      revenueFormatted: m.revenueFormatted,
      transactionsCount: m.transactionsCount,
    }));
  } else {
    inflowData = getBlankData(selectedTimeframe);
  }

  // Derive realized_revenue series (never fall back to payment inflow)
  let stayData: AnalyticsDataPoint[] = [];
  if (analytics?.realized_revenue?.[selectedTimeframe]) {
    stayData = analytics.realized_revenue[selectedTimeframe];
  } else {
    stayData = getBlankData(selectedTimeframe);
  }

  // Active series for single metric view
  const activeData: AnalyticsDataPoint[] = selectedMetric === 'realized_revenue' ? stayData : inflowData;

  // Period totals
  const inflowTotalCents = inflowData.reduce((sum, item) => sum + item.revenueCents, 0);
  const stayTotalCents = stayData.reduce((sum, item) => sum + item.revenueCents, 0);
  const activeTotalCents = selectedMetric === 'realized_revenue' ? stayTotalCents : inflowTotalCents;
  const activeTotalFormatted = formatCurrencyMinor(activeTotalCents, 'INR');

  // Unified Max Scale calculation
  const maxInflow = Math.max(...inflowData.map((d) => d.revenueCents), 0);
  const maxStay = Math.max(...stayData.map((d) => d.revenueCents), 0);
  const rawMax = selectedMetric === 'compare' ? Math.max(maxInflow, maxStay, 0) : Math.max(...activeData.map((d) => d.revenueCents), 0);
  const maxRevenueCents = rawMax > 0 ? rawMax : 10000000;

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 200;
  const plotLeft = 50;
  const plotRight = 580;
  const plotTop = 25;
  const plotBottom = 165;
  const plotRangeY = plotBottom - plotTop; // 140

  const count = activeData.length;
  const stepX = count > 1 ? (plotRight - plotLeft) / (count - 1) : 0;

  // Map data to chart coordinate points
  const buildChartPoints = (data: AnalyticsDataPoint[]) =>
    data.map((item, i) => {
      const x = plotLeft + i * stepX;
      const ratio = rawMax > 0 ? item.revenueCents / rawMax : 0;
      const y = plotBottom - ratio * plotRangeY;
      return { x, y, ...item };
    });

  const inflowPoints = buildChartPoints(inflowData);
  const stayPoints = buildChartPoints(stayData);
  const activePoints = selectedMetric === 'realized_revenue' ? stayPoints : inflowPoints;

  // Smooth Bezier path generator
  const buildPaths = (points: typeof activePoints) => {
    let linePathD = `M ${plotLeft} ${plotBottom} L ${plotRight} ${plotBottom}`;
    let areaPathD = `M ${plotLeft} ${plotBottom} L ${plotRight} ${plotBottom} L ${plotRight} ${plotBottom} Z`;

    if (points.length > 0) {
      linePathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cp1x = prev.x + (curr.x - prev.x) / 2;
        const cp1y = prev.y;
        const cp2x = cp1x;
        const cp2y = curr.y;
        linePathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
      }
      areaPathD = `${linePathD} L ${points[points.length - 1].x} ${plotBottom} L ${plotLeft} ${plotBottom} Z`;
    }
    return { linePathD, areaPathD };
  };

  const { linePathD: inflowLinePath, areaPathD: inflowAreaPath } = buildPaths(inflowPoints);
  const { linePathD: stayLinePath, areaPathD: stayAreaPath } = buildPaths(stayPoints);

  // Active hover point resolution
  const activeHoverIdx = hoveredIdx !== null && hoveredIdx < activePoints.length ? hoveredIdx : null;

  return (
    <div
      key={`rev-graph-${selectedMetric}-${selectedTimeframe}`}
      className={`p-6 rounded-2xl bg-white border border-neutral-200 space-y-4 shadow-sm ${className}`}
    >
      {/* Top Header: Title, Total, and Synchronized Metric & Timeframe Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-3 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-normal text-neutral-900">
              {selectedMetric === 'cash_inflow'
                ? 'Cash Inflow'
                : selectedMetric === 'realized_revenue'
                ? 'Realized Stay Revenue'
                : 'Revenue Comparison'}
            </h3>
            <span
              className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full font-normal transition-colors ${
                selectedMetric === 'cash_inflow'
                  ? 'bg-neutral-900 text-white'
                  : selectedMetric === 'realized_revenue'
                  ? 'bg-neutral-100 text-neutral-800 border border-neutral-300'
                  : 'bg-neutral-200 text-neutral-900'
              }`}
            >
              {selectedMetric === 'cash_inflow'
                ? 'Booking Date'
                : selectedMetric === 'realized_revenue'
                ? 'Check-In Date'
                : 'Inflow vs Stay'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-500 font-normal mt-1 flex-wrap font-mono">
            {selectedMetric === 'compare' ? (
              <>
                <span>
                  Cash Inflow: <strong className="font-normal text-neutral-900">{formatCurrencyMinor(inflowTotalCents, 'INR')}</strong>
                </span>
                <span className="text-neutral-300">|</span>
                <span>
                  Stay Revenue: <strong className="font-normal text-neutral-900">{formatCurrencyMinor(stayTotalCents, 'INR')}</strong>
                </span>
              </>
            ) : (
              <>
                <span>
                  Period Total: <strong className="font-normal text-neutral-900">{activeTotalFormatted}</strong>
                </span>
                {annualGrossRevenueFormatted && selectedTimeframe === 'year' && (
                  <>
                    <span className="text-neutral-300">|</span>
                    <span className="text-neutral-400">Annual Gross: {annualGrossRevenueFormatted}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Controls: Segmented Buttons + Dropdowns */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
          {/* Metric Selector Pills & Dropdown */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
            <button
              type="button"
              onClick={() => handleMetricChange('cash_inflow')}
              className={`px-2.5 py-1 text-xs font-normal rounded-lg transition-all ${
                selectedMetric === 'cash_inflow'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Cash Inflow
            </button>
            <button
              type="button"
              onClick={() => handleMetricChange('realized_revenue')}
              className={`px-2.5 py-1 text-xs font-normal rounded-lg transition-all ${
                selectedMetric === 'realized_revenue'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Stay Revenue
            </button>
            <button
              type="button"
              onClick={() => handleMetricChange('compare')}
              className={`px-2.5 py-1 text-xs font-normal rounded-lg transition-all ${
                selectedMetric === 'compare'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Compare
            </button>
          </div>

          {/* Timeframe Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedTimeframe}
              onChange={(e) => handleTimeframeChange(e.target.value as RevenueTimeframe)}
              aria-label="Timeframe selector"
              className="appearance-none pl-3 pr-8 py-1.5 text-xs font-normal text-neutral-800 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-black cursor-pointer shadow-2xs font-mono"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Responsive Clean SVG Bezier Chart */}
      <div className="relative w-full h-64 pt-2">
        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
          <defs>
            {/* Cash Inflow Gradient: Solid black fading down */}
            <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.14" />
              <stop offset="85%" stopColor="#000000" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.00" />
            </linearGradient>

            {/* Realized Stay Revenue Gradient: Subtle hatched or shaded accent */}
            <linearGradient id="stayGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4A4A4A" stopOpacity="0.12" />
              <stop offset="85%" stopColor="#4A4A4A" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#4A4A4A" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          <line x1={plotLeft} y1={plotTop} x2={plotRight} y2={plotTop} stroke="#F0F0F0" strokeDasharray="3 3" />
          <line x1={plotLeft} y1={plotTop + plotRangeY * 0.33} x2={plotRight} y2={plotTop + plotRangeY * 0.33} stroke="#F0F0F0" strokeDasharray="3 3" />
          <line x1={plotLeft} y1={plotTop + plotRangeY * 0.66} x2={plotRight} y2={plotTop + plotRangeY * 0.66} stroke="#F0F0F0" strokeDasharray="3 3" />
          <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="#E5E5E5" />

          {/* Y-Axis Labels */}
          <text x="5" y={plotTop + 4} fontSize="9" fill="#999999" fontFamily="monospace">
            {rawMax > 0 ? formatCurrencyMinor(rawMax, 'INR') : '₹100K'}
          </text>
          <text x="5" y={plotTop + plotRangeY * 0.5 + 4} fontSize="9" fill="#999999" fontFamily="monospace">
            {rawMax > 0 ? formatCurrencyMinor(Math.round(rawMax / 2), 'INR') : '₹50K'}
          </text>
          <text x="5" y={plotBottom + 3} fontSize="9" fill="#999999" fontFamily="monospace">
            ₹0
          </text>

          {/* 1. CASH INFLOW CURVE (Rendered when 'cash_inflow' or 'compare') */}
          {(selectedMetric === 'cash_inflow' || selectedMetric === 'compare') && (
            <>
              {selectedMetric === 'cash_inflow' && <path d={inflowAreaPath} fill="url(#inflowGrad)" />}
              <path
                d={inflowLinePath}
                fill="none"
                stroke="#000000"
                strokeWidth={selectedMetric === 'compare' ? '2.0' : '2.2'}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {inflowPoints.map((pt, idx) => (
                <circle
                  key={`inflow-dot-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={activeHoverIdx === idx ? '5' : '3.5'}
                  fill={activeHoverIdx === idx ? '#000000' : '#FFFFFF'}
                  stroke="#000000"
                  strokeWidth="2"
                  className="transition-all duration-150 pointer-events-none"
                />
              ))}
            </>
          )}

          {/* 2. REALIZED STAY REVENUE CURVE (Rendered with dashed line when 'realized_revenue' or 'compare') */}
          {(selectedMetric === 'realized_revenue' || selectedMetric === 'compare') && (
            <>
              {selectedMetric === 'realized_revenue' && <path d={stayAreaPath} fill="url(#stayGrad)" />}
              <path
                d={stayLinePath}
                fill="none"
                stroke="#000000"
                strokeWidth={selectedMetric === 'compare' ? '2.0' : '2.2'}
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {stayPoints.map((pt, idx) => (
                <g key={`stay-dot-${idx}`} className="pointer-events-none">
                  {/* Outer circle */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={activeHoverIdx === idx ? '5.5' : '4'}
                    fill="#FFFFFF"
                    stroke="#000000"
                    strokeWidth="1.5"
                    className="transition-all duration-150"
                  />
                  {/* Inner dot */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={activeHoverIdx === idx ? '2.5' : '1.8'}
                    fill="#000000"
                    className="transition-all duration-150"
                  />
                </g>
              ))}
            </>
          )}

          {/* Interactive Hover Hit Areas and X-Axis Labels */}
          {activePoints.map((pt, idx) => (
            <g
              key={`axis-col-${idx}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Vertical invisible hit box */}
              <rect
                x={pt.x - stepX / 2}
                y={plotTop}
                width={stepX}
                height={plotBottom - plotTop + 25}
                fill="transparent"
              />

              {/* Vertical dashed crosshair on hover */}
              {activeHoverIdx === idx && (
                <line
                  x1={pt.x}
                  y1={plotTop}
                  x2={pt.x}
                  y2={plotBottom}
                  stroke="#999999"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}

              {/* X-Axis Tick Label */}
              <text
                x={pt.x}
                y="185"
                textAnchor="middle"
                fontSize="10"
                fontFamily="monospace"
                fill={activeHoverIdx === idx ? '#000000' : '#888888'}
                fontWeight="normal"
              >
                {pt.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Card */}
        {activeHoverIdx !== null && (
          <div
            className="absolute -top-4 z-20 pointer-events-none transform -translate-x-1/2 bg-neutral-900 text-white px-3.5 py-2 rounded-xl shadow-lg border border-neutral-700 text-center whitespace-nowrap"
            style={{
              left: `${(activePoints[activeHoverIdx].x / svgWidth) * 100}%`,
            }}
          >
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
              {activePoints[activeHoverIdx].label} •{' '}
              {selectedMetric === 'compare'
                ? 'Comparison'
                : selectedMetric === 'cash_inflow'
                ? 'Booking Inflow'
                : 'Realized Stay'}
            </div>

            {selectedMetric === 'compare' ? (
              <div className="space-y-0.5 mt-1 text-left">
                <div className="text-xs font-mono font-normal flex items-center justify-between gap-3 text-white">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-0.5 bg-white inline-block"></span>
                    Inflow:
                  </span>
                  <span>{inflowPoints[activeHoverIdx].revenueFormatted}</span>
                </div>
                <div className="text-xs font-mono font-normal flex items-center justify-between gap-3 text-neutral-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-0.5 border-b border-dashed border-white inline-block"></span>
                    Stay:
                  </span>
                  <span>{stayPoints[activeHoverIdx].revenueFormatted}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm font-mono font-normal text-white mt-0.5">
                {activePoints[activeHoverIdx].revenueFormatted}
              </div>
            )}

            {activePoints[activeHoverIdx].transactionsCount > 0 && (
              <div className="text-[9px] font-mono text-neutral-400 mt-0.5">
                {activePoints[activeHoverIdx].transactionsCount} record
                {activePoints[activeHoverIdx].transactionsCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contextual Metric Explanation */}
      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs font-normal text-neutral-700 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          {selectedMetric === 'cash_inflow' && (
            <p>
              <strong className="font-normal text-neutral-900">Booking Cash Inflow:</strong> Displays total payments captured from guest reservations based on the transaction booking date.
            </p>
          )}

          {selectedMetric === 'realized_revenue' && (
            <p>
              <strong className="font-normal text-neutral-900">Realized Stay Revenue:</strong> Displays room revenue recognized upon guest check-in arrival dates across operational stay periods.
            </p>
          )}

          {selectedMetric === 'compare' && (
            <p>
              <strong className="font-normal text-neutral-900">Dual Comparison Mode:</strong> The <span className="underline decoration-solid">solid line</span> represents Booking Cash Inflow, while the <span className="underline decoration-dashed">dashed line</span> represents Realized Stay Revenue.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
