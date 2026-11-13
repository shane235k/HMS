// apps/api/src/common/utils/revenueAnalytics.ts
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

export interface RevenueAnalyticsResult {
  cash_inflow: AnalyticsPeriodBundle;
  realized_revenue: AnalyticsPeriodBundle;
}

/**
 * Computes multi-timeframe analytics for Cash Inflow (Booking/Payment Date)
 * and Realized Stay Revenue (Check-In Date).
 */
export function computeRevenueAnalytics(
  payments: { amount_cents: number; created_at: Date }[],
  reservations: { total_cents: number; check_in_date: Date; created_at: Date }[],
  referenceDate: Date = new Date()
): RevenueAnalyticsResult {
  const ref = new Date(referenceDate);

  // Time boundaries
  const startOfToday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  // Week boundaries: Monday 00:00 to Sunday 23:59:59
  const dayOfWeek = (ref.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const startOfWeek = new Date(startOfToday.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Month boundaries: 1st of month to end of month
  const startOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 1, 0, 0, 0, 0);

  // Year boundaries: Jan 1 to Dec 31
  const startOfYear = new Date(ref.getFullYear(), 0, 1, 0, 0, 0, 0);
  const endOfYear = new Date(ref.getFullYear() + 1, 0, 1, 0, 0, 0, 0);

  // Labels
  const todayLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
  const yearLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const createPoints = (labels: string[]): AnalyticsDataPoint[] =>
    labels.map((label) => ({
      label,
      revenueCents: 0,
      revenueFormatted: '₹0',
      transactionsCount: 0,
    }));

  // 1. CASH INFLOW (Booking/Payment Date)
  const cashInflowToday = createPoints(todayLabels);
  const cashInflowWeek = createPoints(weekLabels);
  const cashInflowMonth = createPoints(monthLabels);
  const cashInflowYear = createPoints(yearLabels);

  for (const p of payments) {
    const pDate = new Date(p.created_at);
    const pTime = pDate.getTime();

    // Today (Hourly slots: 4 hours each)
    if (pTime >= startOfToday.getTime() && pTime < endOfToday.getTime()) {
      const slot = Math.min(5, Math.floor(pDate.getHours() / 4));
      cashInflowToday[slot].revenueCents += p.amount_cents;
      cashInflowToday[slot].transactionsCount += 1;
    }

    // Week (Mon-Sun)
    if (pTime >= startOfWeek.getTime() && pTime < endOfWeek.getTime()) {
      const dayIdx = (pDate.getDay() + 6) % 7;
      cashInflowWeek[dayIdx].revenueCents += p.amount_cents;
      cashInflowWeek[dayIdx].transactionsCount += 1;
    }

    // Month (Weeks 1 to 5)
    if (pTime >= startOfMonth.getTime() && pTime < endOfMonth.getTime()) {
      const wIdx = Math.min(4, Math.floor((pDate.getDate() - 1) / 7));
      cashInflowMonth[wIdx].revenueCents += p.amount_cents;
      cashInflowMonth[wIdx].transactionsCount += 1;
    }

    // Year (Months Jan-Dec)
    if (pTime >= startOfYear.getTime() && pTime < endOfYear.getTime()) {
      const mIdx = pDate.getMonth();
      if (mIdx >= 0 && mIdx < 12) {
        cashInflowYear[mIdx].revenueCents += p.amount_cents;
        cashInflowYear[mIdx].transactionsCount += 1;
      }
    }
  }

  // 2. REALIZED STAY REVENUE (Check-In Date)
  const realizedRevenueToday = createPoints(todayLabels);
  const realizedRevenueWeek = createPoints(weekLabels);
  const realizedRevenueMonth = createPoints(monthLabels);
  const realizedRevenueYear = createPoints(yearLabels);

  for (const r of reservations) {
    const rDate = new Date(r.check_in_date);
    const rTime = rDate.getTime();

    // Today (Check-ins scheduled for today)
    if (rTime >= startOfToday.getTime() && rTime < endOfToday.getTime()) {
      // Place in standard afternoon check-in slot (12:00-16:00 slot 3) or actual hour if specified
      const slot = Math.min(5, Math.floor(rDate.getHours() / 4)) || 3;
      realizedRevenueToday[slot].revenueCents += r.total_cents;
      realizedRevenueToday[slot].transactionsCount += 1;
    }

    // Week (Check-ins this week)
    if (rTime >= startOfWeek.getTime() && rTime < endOfWeek.getTime()) {
      const dayIdx = (rDate.getDay() + 6) % 7;
      realizedRevenueWeek[dayIdx].revenueCents += r.total_cents;
      realizedRevenueWeek[dayIdx].transactionsCount += 1;
    }

    // Month (Check-ins this month)
    if (rTime >= startOfMonth.getTime() && rTime < endOfMonth.getTime()) {
      const wIdx = Math.min(4, Math.floor((rDate.getDate() - 1) / 7));
      realizedRevenueMonth[wIdx].revenueCents += r.total_cents;
      realizedRevenueMonth[wIdx].transactionsCount += 1;
    }

    // Year (Check-ins this calendar year)
    if (rTime >= startOfYear.getTime() && rTime < endOfYear.getTime()) {
      const mIdx = rDate.getMonth();
      if (mIdx >= 0 && mIdx < 12) {
        realizedRevenueYear[mIdx].revenueCents += r.total_cents;
        realizedRevenueYear[mIdx].transactionsCount += 1;
      }
    }
  }

  // Format currencies
  const formatList = (list: AnalyticsDataPoint[]) => {
    for (const item of list) {
      item.revenueFormatted = formatCurrencyMinor(item.revenueCents, 'INR');
    }
  };

  [
    cashInflowToday,
    cashInflowWeek,
    cashInflowMonth,
    cashInflowYear,
    realizedRevenueToday,
    realizedRevenueWeek,
    realizedRevenueMonth,
    realizedRevenueYear,
  ].forEach(formatList);

  return {
    cash_inflow: {
      today: cashInflowToday,
      week: cashInflowWeek,
      month: cashInflowMonth,
      year: cashInflowYear,
    },
    realized_revenue: {
      today: realizedRevenueToday,
      week: realizedRevenueWeek,
      month: realizedRevenueMonth,
      year: realizedRevenueYear,
    },
  };
}

