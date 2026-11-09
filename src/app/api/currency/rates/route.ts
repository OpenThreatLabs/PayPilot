import { NextResponse } from 'next/server';
import { BASELINE_EXCHANGE_RATES, BASELINE_RATES_DATE, ExchangeRateData } from '@/lib/currency';

let serverRateCache: {
  data: ExchangeRateData;
  expiresAt: number;
} | null = null;

const SERVER_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export async function GET() {
  const now = Date.now();

  if (serverRateCache && serverRateCache.expiresAt > now) {
    return NextResponse.json({
      ...serverRateCache.data,
      source: 'cached',
    });
  }

  let mergedRates: Record<string, number> = { ...BASELINE_EXCHANGE_RATES };
  let effectiveDate = BASELINE_RATES_DATE;
  let sourceFound: 'live' | 'offline_baseline' = 'offline_baseline';

  // 1. Try Frankfurter API (ECB official free provider, no key needed)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const frankfurterRes = await fetch('https://api.frankfurter.dev/v1/latest?base=USD', {
      signal: controller.signal,
      next: { revalidate: 21600 },
    });
    clearTimeout(timeout);

    if (frankfurterRes.ok) {
      const data = await frankfurterRes.json();
      if (data?.rates) {
        mergedRates = {
          ...mergedRates,
          ...data.rates,
          USD: 1.0,
        };
        effectiveDate = data.date || effectiveDate;
        sourceFound = 'live';
      }
    }
  } catch {
    // Frankfurter unavailable; fallback will handle or secondary provider
  }

  // 2. Try Open Exchange Rates API for comprehensive global currency support
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const openErRes = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
      next: { revalidate: 21600 },
    });
    clearTimeout(timeout);

    if (openErRes.ok) {
      const data = await openErRes.json();
      if (data?.rates) {
        mergedRates = {
          ...mergedRates,
          ...data.rates,
          USD: 1.0,
        };
        if (data.time_last_update_utc) {
          try {
            effectiveDate = new Date(data.time_last_update_utc).toISOString().split('T')[0];
          } catch {
            // retain existing date
          }
        }
        sourceFound = 'live';
      }
    }
  } catch {
    // Retain merged or fallback
  }

  const responseData: ExchangeRateData = {
    base: 'USD',
    rates: mergedRates,
    date: effectiveDate,
    source: sourceFound,
    lastFetchedAt: new Date().toISOString(),
  };

  serverRateCache = {
    data: responseData,
    expiresAt: now + SERVER_CACHE_TTL_MS,
  };

  return NextResponse.json(responseData, {
    headers: {
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
    },
  });
}

