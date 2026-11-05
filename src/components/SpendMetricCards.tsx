'use client';

import React from 'react';
import { Subscription } from '@/types';

export type MetricFilterType = 'ALL' | 'ACTIVE' | 'UPCOMING' | 'LOW_USAGE' | 'PRICE_CREEP';

interface SpendMetricCardsProps {
  subscriptions: Subscription[];
  currencySymbol?: string;
  currencyRate?: number;
  onFilterClick?: (filterType: MetricFilterType) => void;
}

export function SpendMetricCards({
  subscriptions,
  currencySymbol = '$',
  currencyRate = 1.0,
  onFilterClick,
}: SpendMetricCardsProps) {
  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');

  const now = new Date('2026-11-05T00:00:00Z');
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcomingRenewals = activeSubs.filter((s) => {
    if (!s.nextBillingDate) return false;
    const renewalDate = new Date(s.nextBillingDate);
    return renewalDate >= now && renewalDate <= sevenDaysFromNow;
  });

  const upcomingAmount = upcomingRenewals.reduce((sum, s) => sum + s.amount, 0) * currencyRate;

  const lowUsageSubs = activeSubs.filter((s) => (s.usageScore ?? 100) < 40);
  const recoverableMonthly = lowUsageSubs.reduce((sum, s) => {
    if (s.billingCycle === 'YEARLY') return sum + s.amount / 12;
    if (s.billingCycle === 'QUARTERLY') return sum + s.amount / 3;
    return sum + s.amount;
  }, 0) * currencyRate;

  const priceCreepSubs = activeSubs.filter((s) => s.priceCreepRisk && s.priceCreepRisk.percentIncrease > 0);
  const totalCreepAmount = priceCreepSubs.reduce((sum, s) => {
    if (!s.priceCreepRisk) return sum;
    const diff = s.amount - s.priceCreepRisk.previousAmount;
    return sum + (diff > 0 ? diff : 0);
  }, 0) * currencyRate;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      <div 
        onClick={() => onFilterClick && onFilterClick('ALL')}
        className="group relative rounded-2xl bg-[#1c1c1e]/60 border border-white/[0.08] p-5 flex flex-col justify-between transition-all duration-150 hover:bg-[#1c1c1e]/90 hover:border-white/[0.14] active:scale-[0.98] cursor-pointer select-none"
        style={{
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}
      >
        <div>
          <div className="flex items-center justify-between text-[#86868b] text-[12px] font-medium mb-3">
            <span>Active Subscriptions</span>
            <span className="w-2 h-2 rounded-full bg-[#0071e3]"></span>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-white tabular-nums">
            {activeSubs.length}
          </div>
        </div>
        <div className="pt-3 mt-4 border-t border-white/[0.06] flex items-center justify-between text-[12px] text-[#86868b]">
          <span>Tracked recurring items</span>
        </div>
      </div>

      <div 
        onClick={() => onFilterClick && onFilterClick('UPCOMING')}
        className="group relative rounded-2xl bg-[#1c1c1e]/60 border border-white/[0.08] p-5 flex flex-col justify-between transition-all duration-150 hover:bg-[#1c1c1e]/90 hover:border-white/[0.14] active:scale-[0.98] cursor-pointer select-none"
        style={{
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}
      >
        <div>
          <div className="flex items-center justify-between text-[#86868b] text-[12px] font-medium mb-3">
            <span>Renewing This Week</span>
            <span className="w-2 h-2 rounded-full bg-[#ff9f0a]"></span>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-white tabular-nums flex items-baseline gap-2">
            <span>{upcomingRenewals.length}</span>
            <span className="text-sm font-normal text-[#86868b]">
              ({currencySymbol}{upcomingAmount.toFixed(2)})
            </span>
          </div>
        </div>
        <div className="pt-3 mt-4 border-t border-white/[0.06] flex items-center justify-between text-[12px] text-[#86868b]">
          <span>Next 7 days</span>
        </div>
      </div>

      <div 
        onClick={() => onFilterClick && onFilterClick('LOW_USAGE')}
        className="group relative rounded-2xl bg-[#1c1c1e]/60 border border-white/[0.08] p-5 flex flex-col justify-between transition-all duration-150 hover:bg-[#1c1c1e]/90 hover:border-white/[0.14] active:scale-[0.98] cursor-pointer select-none"
        style={{
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}
      >
        <div>
          <div className="flex items-center justify-between text-[#86868b] text-[12px] font-medium mb-3">
            <span>Low Utilization</span>
            <span className="w-2 h-2 rounded-full bg-[#30d158]"></span>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-[#30d158] tabular-nums">
            +{currencySymbol}{recoverableMonthly.toFixed(2)}
            <span className="text-xs text-[#86868b] font-normal text-white">/mo</span>
          </div>
        </div>
        <div className="pt-3 mt-4 border-t border-white/[0.06] flex items-center justify-between text-[12px] text-[#86868b]">
          <span>{lowUsageSubs.length} flagged &lt; 40% use</span>
        </div>
      </div>

      <div 
        onClick={() => onFilterClick && onFilterClick('PRICE_CREEP')}
        className="group relative rounded-2xl bg-[#1c1c1e]/60 border border-white/[0.08] p-5 flex flex-col justify-between transition-all duration-150 hover:bg-[#1c1c1e]/90 hover:border-white/[0.14] active:scale-[0.98] cursor-pointer select-none"
        style={{
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}
      >
        <div>
          <div className="flex items-center justify-between text-[#86868b] text-[12px] font-medium mb-3">
            <span>Price Creep Detected</span>
            <span className="w-2 h-2 rounded-full bg-[#ff453a]"></span>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-[#ff453a] tabular-nums flex items-baseline gap-2">
            <span>{priceCreepSubs.length}</span>
            <span className="text-xs font-normal text-[#86868b]">
              (+{currencySymbol}{totalCreepAmount.toFixed(2)}/mo)
            </span>
          </div>
        </div>
        <div className="pt-3 mt-4 border-t border-white/[0.06] flex items-center justify-between text-[12px] text-[#86868b]">
          <span>Unannounced price hikes</span>
        </div>
      </div>
    </div>
  );
}
