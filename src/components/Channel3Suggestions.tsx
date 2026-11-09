'use client';

import React, { useState, useEffect } from 'react';
import { Channel3Product } from '@/lib/channel3';
import { Sparkles, ExternalLink, TrendingDown } from 'lucide-react';

interface Channel3SuggestionsProps {
  serviceName: string;
  category?: string;
  currentMonthlyCost?: number;
  onSelectAlternative?: (alt: Channel3Product) => void;
}

export const Channel3Suggestions: React.FC<Channel3SuggestionsProps> = ({
  serviceName,
  category,
  currentMonthlyCost,
  onSelectAlternative,
}) => {
  const [deals, setDeals] = useState<Channel3Product[]>([]);
  const query = (serviceName || category || '').trim();
  const activeDeals = query.length >= 2 ? deals : [];

  useEffect(() => {
    if (query.length < 2) return;

    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/channel3/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!isCancelled && Array.isArray(data.results) && data.results.length > 0) {
          setDeals(data.results.slice(0, 2));
        }
      } catch {
        if (!isCancelled) setDeals([]);
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (!activeDeals.length) return null;

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#7c3aed]/10 to-[#7c3aed]/[0.02] border border-[#7c3aed]/20 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#a855f7]" />
          <span className="text-xs font-semibold text-white">Channel3 Perpetual Alternatives</span>
        </div>
        <span className="text-[9px] font-mono uppercase tracking-wider text-[#a855f7] bg-[#7c3aed]/20 px-1.5 py-0.5 rounded border border-[#7c3aed]/30">
          Zero Monthly SaaS
        </span>
      </div>

      <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
        Replace recurring monthly fees for {serviceName || 'this service'} with verified lifetime or discounted licenses from the Channel3 Universal Product Graph.
      </p>

      <div className="grid grid-cols-1 gap-2 pt-1">
        {activeDeals.map((deal) => {
          const annualCost = (currentMonthlyCost || 15) * 12;
          const saving = deal.savingVersusRecurringYearly || Math.max(0, Math.round(annualCost - deal.price));

          return (
            <div
              key={deal.id}
              onClick={() => onSelectAlternative?.(deal)}
              className="p-2.5 rounded-xl bg-black/40 border border-white/[0.08] hover:border-[#a855f7]/40 hover:bg-white/[0.02] transition-all flex items-center justify-between gap-3 group cursor-pointer"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white truncate">{deal.title}</span>
                  {saving > 0 && (
                    <span className="text-[10px] font-mono text-[#30d158] flex items-center gap-0.5 shrink-0">
                      <TrendingDown className="w-3 h-3" />
                      Save ~${saving}/yr
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#86868b] flex items-center gap-1.5">
                  <span>{deal.brand}</span>
                  <span>•</span>
                  <span>{deal.merchantName}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-xs font-mono font-semibold text-white tabular-nums">
                    ${deal.price.toFixed(2)}
                  </div>
                  <div className="text-[9px] font-mono text-[#a855f7] uppercase">
                    {deal.recurringOrLifetime ? deal.recurringOrLifetime.toLowerCase() : 'one-time'}
                  </div>
                </div>

                <a
                  href={deal.buyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-[#7c3aed]/30 text-white transition-colors"
                  title="View Deal Offer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#a855f7]" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
