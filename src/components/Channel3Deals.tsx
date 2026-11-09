'use client';

import React, { useState } from 'react';
import { Channel3Product } from '@/lib/channel3';
import { BASELINE_EXCHANGE_RATES, convertAmount } from '@/lib/currency';
import { Sparkles, Search, Loader2, ArrowUpRight, TrendingDown } from 'lucide-react';

interface Channel3DealsProps {
  currencySymbol?: string;
  currencyCode?: string;
  rates?: Record<string, number>;
}

export const Channel3Deals: React.FC<Channel3DealsProps> = ({
  currencySymbol = '$',
  currencyCode = 'USD',
  rates = BASELINE_EXCHANGE_RATES,
}) => {
  const [query, setQuery] = useState('design');
  const [products, setProducts] = useState<Channel3Product[]>([
    {
      id: 'ch3_sample_1',
      title: 'Affinity Designer 2 Lifetime License',
      brand: 'Serif Labs',
      price: 69.99,
      currency: 'USD',
      merchantName: 'Serif Official Store',
      buyUrl: 'https://affinity.serif.com/en-us/designer/',
      category: 'Design & Creative',
      recurringOrLifetime: 'LIFETIME',
      savingVersusRecurringYearly: 110.00,
    },
    {
      id: 'ch3_sample_2',
      title: 'Unified AI Developer Pass (Annual Single Payment)',
      brand: 'AI Marketplace',
      price: 119.00,
      currency: 'USD',
      merchantName: 'Channel3 Software Deals',
      buyUrl: 'https://trychannel3.com',
      category: 'AI & ML',
      recurringOrLifetime: 'ANNUAL',
      savingVersusRecurringYearly: 121.00,
    },
    {
      id: 'ch3_sample_3',
      title: 'Local Edge AI Accelerator Card (One-time Hardware Purchase)',
      brand: 'NeuralTech',
      price: 189.99,
      currency: 'USD',
      merchantName: 'Retail Partner',
      buyUrl: 'https://trychannel3.com',
      category: 'AI & ML',
      recurringOrLifetime: 'LIFETIME',
      savingVersusRecurringYearly: 290.00,
    },
    {
      id: 'ch3_sample_4',
      title: 'Tabnine Local AI Code Completion (Perpetual License)',
      brand: 'Tabnine',
      price: 144.00,
      currency: 'USD',
      merchantName: 'Tabnine Deals',
      buyUrl: 'https://tabnine.com',
      category: 'Developer Tools',
      recurringOrLifetime: 'ANNUAL',
      savingVersusRecurringYearly: 84.00,
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/channel3/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        setProducts(data.results);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#1c1c1e] border border-white/[0.08] shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#7c3aed]/20 text-[#a855f7] border border-[#7c3aed]/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-semibold text-white tracking-tight">Channel3 Perpetual Market</h2>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/[0.06] text-[#86868b] border border-white/[0.08]">
              Product Graph
            </span>
          </div>
          <p className="text-xs text-[#86868b] max-w-xl">
            Live catalog across 25,000+ digital merchants and brands. Discover verified lifetime and single-payment software licenses that replace recurring monthly subscription drains.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search software, tools..."
              className="w-56 bg-[#16171b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5e626b] focus:outline-none focus:border-[#7c3aed] transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-md shadow-[#7c3aed]/20"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Search</span>
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="p-5 rounded-2xl bg-[#1c1c1e] border border-white/[0.08] hover:border-white/[0.16] transition-all flex flex-col justify-between group shadow-lg"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider uppercase text-[#86868b] px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                  {p.category}
                </span>
                {p.savingVersusRecurringYearly && (
                  <span className="text-xs font-mono font-medium text-[#30d158] flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Save ~{currencySymbol}{convertAmount(p.savingVersusRecurringYearly, p.currency || 'USD', currencyCode, rates).toFixed(0)}/yr
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-white transition-colors">
                  {p.title}
                </h3>
                <div className="text-xs text-[#86868b] mt-1 flex items-center gap-2">
                  <span>{p.brand}</span>
                  <span>•</span>
                  <span>{p.merchantName}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <div>
                <span className="text-base font-semibold font-mono text-white tabular-nums">
                  {currencySymbol}{convertAmount(p.price, p.currency || 'USD', currencyCode, rates).toFixed(2)}
                </span>
                <span className="text-[10px] font-mono text-[#a855f7] ml-1.5 uppercase">
                  {p.recurringOrLifetime ? p.recurringOrLifetime.toLowerCase() : 'one-time'}
                </span>
              </div>

              <a
                href={p.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white transition-all flex items-center gap-1.5 active:scale-[0.98]"
              >
                <span>View Deal</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#86868b] group-hover:text-white" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
