export const ISO4217_EXPONENTS: Record<string, number> = {
  INR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  AUD: 2,
  SGD: 2,
  CHF: 2,
  JPY: 0,
  KRW: 0,
  CLP: 0,
  VND: 0,
  BHD: 3,
  KWD: 3,
  OMR: 3,
  JOD: 3,
};

export function getCurrencyExponent(currency: string = 'INR'): number {
  return ISO4217_EXPONENTS[currency.toUpperCase()] ?? 2;
}

export function fromMinorUnits(minorUnits: number, currency: string = 'INR'): number {
  const exp = getCurrencyExponent(currency);
  return minorUnits / Math.pow(10, exp);
}

export function formatCurrencyMinor(
  minorUnits: number,
  currency: string = 'INR',
  locale: string = 'en-IN'
): string {
  const major = fromMinorUnits(minorUnits, currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(major);
  } catch {
    return `₹${major.toLocaleString('en-IN')}`;
  }
}

