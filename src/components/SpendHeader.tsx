'use client';

import React from 'react';
import { Subscription } from '@/types';
import { BASELINE_EXCHANGE_RATES, convertAmount } from '@/lib/currency';

interface SpendHeaderProps {
  subscriptions: Subscription[];
  currencySymbol?: string;
  currencyCode?: string;
  rates?: Record<string, number>;
}

export function SpendHeader({
  subscriptions,
  currencySymbol = '$',
  currencyCode = 'USD',
  rates = BASELINE_EXCHANGE_RATES,
}: SpendHeaderProps) {
  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');

  const monthlyTotal = activeSubs.reduce((acc, s) => {
    const converted = convertAmount(s.amount, s.currency || 'USD', currencyCode, rates);
    if (s.billingCycle === 'YEARLY') return acc + converted / 12;
    if (s.billingCycle === 'QUARTERLY') return acc + converted / 3;
    return acc + converted;
  }, 0);

  const annualTotal = monthlyTotal * 12;

  return (
    <div className="w-full mb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] font-medium tracking-wider uppercase text-[#86868b]">
              Total Commitments
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white tabular-nums">
              {currencySymbol}{monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-lg sm:text-xl font-normal text-[#86868b]">
              / month
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-[#86868b] sm:text-right">
          <div className="space-y-0.5">
            <div className="text-[11px] uppercase tracking-wider text-[#86868b]">Annual Run Rate</div>
            <div className="text-lg font-medium text-[#f5f5f7] tabular-nums">
              {currencySymbol}{annualTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              <span className="text-xs text-[#86868b] font-normal"> / yr</span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/[0.08] hidden sm:block"></div>
          <div className="space-y-0.5 hidden sm:block">
            <div className="text-[11px] uppercase tracking-wider text-[#86868b]">Active Services</div>
            <div className="text-lg font-medium text-[#f5f5f7] tabular-nums">
              {activeSubs.length} <span className="text-xs text-[#86868b] font-normal">subscriptions</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
