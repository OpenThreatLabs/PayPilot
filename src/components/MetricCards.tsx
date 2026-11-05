'use client';

import React from 'react';
import { SpendAnalytics } from '@/types';
import { TrendingDown, AlertTriangle, Sparkles } from 'lucide-react';

interface MetricCardsProps {
  analytics: SpendAnalytics;
  currencySymbol?: string;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ 
  analytics, 
  currencySymbol = '$' 
}) => {
  return (
    <section className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="apple-glass rounded-2xl p-5 flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 select-none">
          <div>
            <div className="flex items-center justify-between text-[#86868b] text-xs font-medium mb-2">
              <span>Monthly Outflow</span>
              <span className="w-2 h-2 rounded-full bg-[#0071e3]"></span>
            </div>
            <div className="text-3xl font-semibold tracking-tight text-[#f5f5f7] font-mono">
              {currencySymbol}{analytics.monthlyTotal.toFixed(2)}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#86868b]">
            <span>{analytics.activeCount} active subscriptions</span>
            <span className="font-mono text-[#f5f5f7]">{currencySymbol}{(analytics.annualizedTotal).toFixed(0)}/yr</span>
          </div>
        </div>

        <div className="apple-glass rounded-2xl p-5 flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 select-none">
          <div>
            <div className="flex items-center justify-between text-[#86868b] text-xs font-medium mb-2">
              <span>Recoverable Savings</span>
              <TrendingDown className="w-3.5 h-3.5 text-[#30d158]" />
            </div>
            <div className="text-3xl font-semibold tracking-tight text-[#30d158] font-mono">
              +{currencySymbol}{analytics.potentialAnnualSavings.toFixed(2)}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#86868b]">
            <span>Prune target</span>
            <span className="text-[#30d158] font-medium">Auto-identified</span>
          </div>
        </div>

        <div className="apple-glass rounded-2xl p-5 flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 select-none">
          <div>
            <div className="flex items-center justify-between text-[#86868b] text-xs font-medium mb-2">
              <span>Low Utilization</span>
              <AlertTriangle className="w-3.5 h-3.5 text-[#ff9f0a]" />
            </div>
            <div className="text-3xl font-semibold tracking-tight text-[#ff9f0a] font-mono">
              {analytics.flaggedZombieCount} Flagged
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#86868b]">
            <span>&lt; 30% monthly utility</span>
            <span className="text-[#ff9f0a] font-medium">Review pending</span>
          </div>
        </div>

        <div className="apple-glass rounded-2xl p-5 flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 select-none">
          <div>
            <div className="flex items-center justify-between text-[#86868b] text-xs font-medium mb-2">
              <span>PayPal Protection</span>
              <Sparkles className="w-3.5 h-3.5 text-[#2997ff]" />
            </div>
            <div className="text-xl font-semibold tracking-tight text-[#f5f5f7] flex items-center gap-2 pt-1">
              <span className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse"></span>
              <span>Autonomous Guard</span>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#86868b]">
            <span>REST API v1</span>
            <span className="text-[#2997ff] font-medium">Ready</span>
          </div>
        </div>
      </div>
    </section>
  );
};
