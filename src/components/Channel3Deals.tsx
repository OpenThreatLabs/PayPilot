'use client';

import React, { useState } from 'react';
import { Channel3Product } from '@/lib/channel3';
import { ExternalLink } from 'lucide-react';

export const Channel3Deals: React.FC = () => {
  const [query, setQuery] = useState('AI software');
  const [products, setProducts] = useState<Channel3Product[]>([
    {
      id: 'ch3_sample_1',
      title: 'Unified AI Developer Pass (Annual Single Payment)',
      brand: 'AI Marketplace',
      price: 119.00,
      currency: 'USD',
      merchantName: 'Channel3 Software Deals',
      buyUrl: 'https://trychannel3.com',
      category: 'AI & ML',
      savingVersusRecurringYearly: 121.00,
    },
    {
      id: 'ch3_sample_2',
      title: 'Affinity Designer Lifetime License (Zero Monthly SaaS)',
      brand: 'Serif Labs',
      price: 69.99,
      currency: 'USD',
      merchantName: 'Channel3 Partner Network',
      buyUrl: 'https://trychannel3.com',
      category: 'Design & Creative',
      savingVersusRecurringYearly: 110.00,
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
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.results) {
        setProducts(data.results);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111215] border border-[#23252a] rounded-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-[#23252a]">
        <div>
          <h3 className="text-sm font-semibold text-white">SaaS Perpetual Replacements</h3>
          <p className="text-xs text-[#8c9099]">Channel3 Universal Product Graph (100M+ catalog across 25k merchants)</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search deals..."
            className="px-2.5 py-1 bg-[#17181c] border border-[#23252a] rounded text-xs text-white placeholder-[#5e626b] focus:outline-none focus:border-[#38bdf8] w-44"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-2.5 py-1 bg-[#23252a] hover:bg-[#32353d] disabled:opacity-40 text-white rounded text-xs font-medium transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {products.map((p) => (
          <div
            key={p.id}
            className="bg-[#17181c] border border-[#23252a] rounded p-3.5 flex flex-col justify-between hover:border-[#32353d] transition-colors"
          >
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[11px] font-mono text-[#8c9099] uppercase">
                  {p.category}
                </span>
                {p.savingVersusRecurringYearly && (
                  <span className="text-[#22c55e] font-mono text-xs">
                    Save ~${p.savingVersusRecurringYearly}/yr
                  </span>
                )}
              </div>

              <h4 className="text-xs font-medium text-white mb-0.5">{p.title}</h4>
              <div className="text-[11px] text-[#5e626b] mb-3">
                {p.brand} · {p.merchantName}
              </div>
            </div>

            <div className="pt-2 border-t border-[#23252a] flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold font-mono text-white">
                  ${p.price.toFixed(2)}
                </span>
                <span className="text-[10px] text-[#5e626b] ml-1">one-time</span>
              </div>

              <a
                href={p.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#8c9099] hover:text-white bg-[#111215] hover:bg-[#23252a] border border-[#23252a] rounded transition-colors"
              >
                <span>Offer</span>
                <ExternalLink className="w-3 h-3 text-[#5e626b]" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
