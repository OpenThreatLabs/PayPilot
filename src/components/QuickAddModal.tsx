'use client';

import React, { useState } from 'react';
import { CATALOG_PRESETS, CatalogPreset } from '@/lib/sublyPresets';
import { Subscription } from '@/types';
import { X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (sub: Subscription) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<CatalogPreset | null>(null);
  const [amount, setAmount] = useState<string>('20.00');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  if (!isOpen) return null;

  const handleSelectPreset = (p: CatalogPreset) => {
    setSelectedPreset(p);
    setAmount(p.defaultAmount.toFixed(2));
    setBillingCycle(p.billingCycle);
  };

  const handleConfirm = () => {
    if (!selectedPreset) return;

    const parsedAmount = parseFloat(amount) || selectedPreset.defaultAmount;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);

    const newSub: Subscription = {
      id: `sub_${Date.now()}`,
      name: selectedPreset.name,
      vendor: selectedPreset.vendor,
      category: selectedPreset.category,
      amount: parsedAmount,
      currency: 'USD',
      billingCycle,
      status: 'ACTIVE',
      nextBillingDate: nextDate.toISOString(),
      lastBilledDate: new Date().toISOString(),
      paypalAgreementId: `I-PP-SUB-${Math.floor(100000 + Math.random() * 900000)}`,
      usageScore: 80,
      planName: selectedPreset.planName,
    };

    onAdd(newSub);
    toast.success(`Added ${newSub.name} ($${newSub.amount}/${billingCycle.toLowerCase()}) to PayPal tracking`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#111215] border border-[#23252a] rounded-lg max-w-md w-full p-5 text-white shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#23252a]">
          <div>
            <h3 className="text-sm font-semibold">Track New Subscription</h3>
            <p className="text-xs text-[#8c9099]">Select a popular preset or customize amounts</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8c9099] hover:text-white hover:bg-[#17181c]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4">
          <label className="text-xs text-[#8c9099] uppercase font-mono block mb-2">
            Popular Presets
          </label>
          <div className="grid grid-cols-4 gap-2">
            {CATALOG_PRESETS.map((p) => {
              const isSelected = selectedPreset?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`p-2.5 rounded border text-center flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'border-[#2563eb] bg-[#1f2126]'
                      : 'border-[#23252a] bg-[#17181c] hover:border-[#32353d]'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold text-white mb-1"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.initials}
                  </div>
                  <span className="text-[11px] font-medium text-white truncate max-w-full">
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedPreset && (
          <div className="mt-4 pt-3 border-t border-[#23252a] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8c9099]">Billing Cycle</span>
              <div className="flex rounded border border-[#23252a] p-0.5 bg-[#0c0d0f]">
                <button
                  type="button"
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`px-2.5 py-0.5 text-xs font-mono rounded ${
                    billingCycle === 'MONTHLY' ? 'bg-[#1f2126] text-white' : 'text-[#8c9099]'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('YEARLY')}
                  className={`px-2.5 py-0.5 text-xs font-mono rounded ${
                    billingCycle === 'YEARLY' ? 'bg-[#1f2126] text-white' : 'text-[#8c9099]'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8c9099]">Amount (USD)</span>
              <div className="flex items-center gap-1 font-mono">
                <span className="text-xs text-[#5e626b]">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-24 px-2 py-1 bg-[#17181c] border border-[#23252a] rounded text-xs text-white text-right focus:outline-none focus:border-[#38bdf8]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              className="w-full mt-2 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm & Link to PayPal Sandbox</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
