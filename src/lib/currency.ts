export interface ExchangeRateData {
  base: string;
  rates: Record<string, number>;
  date: string;
  source: 'live' | 'cached' | 'offline_baseline';
  lastFetchedAt: string;
}

export const BASELINE_RATES_DATE = '2026-11-09';

export const BASELINE_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.8956,
  GBP: 0.7712,
  INR: 94.047,
  RUB: 81.93,
  JPY: 153.2,
  CAD: 1.385,
  AUD: 1.512,
  CHF: 0.865,
  CNY: 7.18,
  HKD: 7.77,
  SGD: 1.32,
  SEK: 10.28,
  KRW: 1385.0,
  NOK: 10.45,
  NZD: 1.64,
  MXN: 19.85,
  BRL: 5.68,
  ZAR: 17.65,
  TRY: 34.25,
  AED: 3.6725,
  SAR: 3.75,
  PLN: 3.88,
  THB: 33.8,
  IDR: 15650.0,
  MYR: 4.38,
  PHP: 57.5,
  CZK: 22.8,
  ILS: 3.72,
  CLP: 955.0,
  COP: 4320.0,
  EGP: 48.6,
  VND: 25300.0,
  DKK: 6.69,
  HUF: 368.0,
  PKR: 278.0,
  BDT: 119.5,
  ARS: 995.0,
  QAR: 3.64,
  KWD: 0.307,
  BHD: 0.376,
  OMR: 0.384,
  NGN: 1650.0,
  KES: 129.0,
  UAH: 41.3,
  RON: 4.45,
  BGN: 1.75,
  HRK: 6.75,
  TWD: 32.1,
  PEN: 3.77,
  GHS: 16.2,
  MAD: 9.85,
  DZD: 133.5,
  LKR: 293.0,
  NPR: 135.2,
  CRC: 512.0,
  UYU: 41.5,
  DOP: 60.1,
  JMD: 158.0,
  ISK: 137.0,
  RSD: 106.0,
  JOD: 0.709,
  TND: 3.08,
  UGX: 3680.0,
  TZS: 2680.0,
  KZT: 492.0,
  AZN: 1.7,
  GEL: 2.73,
  BYN: 3.28,
  AMD: 387.0,
  UZS: 12800.0,
  LBP: 89500.0,
  IQD: 1310.0,
  BOB: 6.91,
  PYG: 7850.0,
  PAB: 1.0,
  BND: 1.32,
  MOP: 8.01,
  BAM: 1.75,
  ALL: 89.2,
  MKD: 55.1,
  MDL: 17.9,
  MNT: 3410.0,
  MMK: 2095.0,
  KHR: 4050.0,
  LAK: 21900.0,
  MVR: 15.4,
  BBD: 2.0,
  TTD: 6.75,
  XCD: 2.7,
  FJD: 2.25,
  BWP: 13.5,
  MUR: 46.2,
  NAD: 17.65,
  SZL: 17.65,
  LSL: 17.65,
  RWF: 1365.0,
  MZN: 63.8,
  AOA: 915.0,
  ZMW: 26.5,
  ETB: 122.0,
};

export const DEFAULT_EXCHANGE_DATA: ExchangeRateData = {
  base: 'USD',
  rates: BASELINE_EXCHANGE_RATES,
  date: BASELINE_RATES_DATE,
  source: 'offline_baseline',
  lastFetchedAt: new Date().toISOString(),
};

const RATES_STORAGE_KEY = 'paypilot_exchange_rates_cache_v1';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number> = BASELINE_EXCHANGE_RATES
): number {
  if (typeof amount !== 'number' || isNaN(amount)) return 0;
  if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return amount;

  const normalizedFrom = fromCurrency.toUpperCase().trim();
  const normalizedTo = toCurrency.toUpperCase().trim();

  if (normalizedFrom === normalizedTo) return amount;

  const rateFrom = normalizedFrom === 'USD' ? 1.0 : rates[normalizedFrom];
  const rateTo = normalizedTo === 'USD' ? 1.0 : rates[normalizedTo];

  if (!rateFrom || !rateTo || rateFrom <= 0 || rateTo <= 0) {
    return amount;
  }

  const amountInUsd = amount / rateFrom;
  const converted = amountInUsd * rateTo;

  return Math.round(converted * 100) / 100;
}

export function formatConvertedCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  currencySymbol: string,
  rates: Record<string, number> = BASELINE_EXCHANGE_RATES,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const converted = convertAmount(amount, fromCurrency, toCurrency, rates);
  const minDigits = options?.minimumFractionDigits ?? 2;
  const maxDigits = options?.maximumFractionDigits ?? 2;
  return `${currencySymbol}${converted.toLocaleString(undefined, {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  })}`;
}

export async function fetchExchangeRates(forceRefresh = false): Promise<ExchangeRateData> {
  if (typeof window !== 'undefined' && !forceRefresh) {
    try {
      const cached = localStorage.getItem(RATES_STORAGE_KEY);
      if (cached) {
        const parsed: ExchangeRateData = JSON.parse(cached);
        const age = Date.now() - new Date(parsed.lastFetchedAt).getTime();
        if (age < CACHE_TTL_MS && parsed.rates && Object.keys(parsed.rates).length > 20) {
          return {
            ...parsed,
            source: 'cached',
          };
        }
      }
    } catch {
      // Fallback to fetch
    }
  }

  try {
    const res = await fetch('/api/currency/rates', {
      method: 'GET',
      headers: { credentials: 'omit' },
    });

    if (res.ok) {
      const data: ExchangeRateData = await res.json();
      if (data && data.rates && Object.keys(data.rates).length > 20) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(data));
          } catch {
            // Storage quota fallback
          }
        }
        return data;
      }
    }
  } catch {
    // API request failed; proceed to local storage fallback
  }

  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(RATES_STORAGE_KEY);
      if (cached) {
        const parsed: ExchangeRateData = JSON.parse(cached);
        return {
          ...parsed,
          source: 'cached',
        };
      }
    } catch {
      // Fallback
    }
  }

  return DEFAULT_EXCHANGE_DATA;
}

