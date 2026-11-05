'use client';

import React, { useState, useEffect } from 'react';
import { Subscription, Category, BillingCycle, SubscriptionDataSource } from '@/types';
import { X, CreditCard, ShieldCheck, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (sub: Subscription) => void;
  currencySymbol?: string;
}

const PRESET_SERVICES = [
  { name: 'Netflix', vendor: 'Netflix Inc', category: 'STREAMING_MEDIA' as Category, defaultAmount: 15.99, cycle: 'MONTHLY' as BillingCycle },
  { name: 'Spotify Premium', vendor: 'Spotify AB', category: 'STREAMING_MEDIA' as Category, defaultAmount: 11.99, cycle: 'MONTHLY' as BillingCycle },
  { name: 'ChatGPT Plus', vendor: 'OpenAI', category: 'AI_AND_ML' as Category, defaultAmount: 20.00, cycle: 'MONTHLY' as BillingCycle },
  { name: 'Claude Pro', vendor: 'Anthropic', category: 'AI_AND_ML' as Category, defaultAmount: 20.00, cycle: 'MONTHLY' as BillingCycle },
  { name: 'GitHub Copilot', vendor: 'Microsoft / GitHub', category: 'DEV_TOOLS' as Category, defaultAmount: 19.00, cycle: 'MONTHLY' as BillingCycle },
  { name: 'AWS Cloud', vendor: 'Amazon Web Services', category: 'CLOUD_INFRA' as Category, defaultAmount: 145.00, cycle: 'MONTHLY' as BillingCycle },
  { name: 'Figma Professional', vendor: 'Figma', category: 'DESIGN_CREATIVE' as Category, defaultAmount: 15.00, cycle: 'MONTHLY' as BillingCycle },
  { name: 'Notion Plus', vendor: 'Notion Labs', category: 'PRODUCTIVITY' as Category, defaultAmount: 10.00, cycle: 'MONTHLY' as BillingCycle },
];

export function AddSubscriptionModal({
  isOpen,
  onClose,
  onAdd,
  currencySymbol = '$',
}: AddSubscriptionModalProps) {
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState<Category>('PRODUCTIVITY');
  const [amount, setAmount] = useState('15.00');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [planName, setPlanName] = useState('Standard Tier');
  const [sourceType, setSourceType] = useState<SubscriptionDataSource>('PAYPAL_SANDBOX');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<{
    subscription: Subscription;
    approveUrl: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const handleSelectPreset = (preset: typeof PRESET_SERVICES[0]) => {
    setName(preset.name);
    setVendor(preset.vendor);
    setCategory(preset.category);
    setAmount(preset.defaultAmount.toFixed(2));
    setBillingCycle(preset.cycle);
    setPlanName('Standard Seat');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a service name');
      return;
    }

    const parsedAmount = parseFloat(amount) || 10.0;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);

    setIsSubmitting(true);

    try {
      if (sourceType === 'PAYPAL_SANDBOX') {
        const returnUrl = typeof window !== 'undefined' ? `${window.location.origin}?paypal_action=approved` : 'http://localhost:3000';
        const cancelUrl = typeof window !== 'undefined' ? `${window.location.origin}?paypal_action=cancelled` : 'http://localhost:3000';

        const res = await fetch('/api/paypal/subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CREATE',
            name: name.trim(),
            vendor: vendor.trim() || name.trim(),
            amount: parsedAmount,
            billingCycle,
            returnUrl,
            cancelUrl,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to initialize PayPal Sandbox subscription');
        }

        const data: {
          success: boolean;
          subscriptionId: string;
          planId: string;
          status: 'APPROVAL_PENDING' | 'ACTIVE';
          approveUrl: string;
          isSandboxLive: boolean;
        } = await res.json();

        const newSub: Subscription = {
          id: `sub_sbx_${Date.now()}`,
          name: name.trim(),
          vendor: vendor.trim() || name.trim(),
          category,
          amount: parsedAmount,
          currency: 'USD',
          billingCycle,
          status: data.status,
          nextBillingDate: nextDate.toISOString(),
          lastBilledDate: new Date().toISOString(),
          paypalAgreementId: data.subscriptionId,
          paypalPlanId: data.planId,
          approveUrl: data.approveUrl,
          usageScore: 100,
          planName: planName.trim() || 'Standard Tier',
          dataSource: 'PAYPAL_SANDBOX',
          lastSyncedAt: new Date().toISOString(),
        };

        onAdd(newSub);

        if (data.approveUrl) {
          setPendingApproval({
            subscription: newSub,
            approveUrl: data.approveUrl,
          });
          toast.success(`Subscription agreement created on PayPal Sandbox: ${data.subscriptionId}`);
          return;
        }

        toast.success(`Tracked ${newSub.name} on PayPal Sandbox`);
        onClose();
      } else {
        // Manual vault tracker
        const newSub: Subscription = {
          id: `sub_${Date.now()}`,
          name: name.trim(),
          vendor: vendor.trim() || name.trim(),
          category,
          amount: parsedAmount,
          currency: 'USD',
          billingCycle,
          status: 'ACTIVE',
          nextBillingDate: nextDate.toISOString(),
          lastBilledDate: new Date().toISOString(),
          paypalAgreementId: `LOCAL-VAULT-${Math.floor(100000 + Math.random() * 900000)}`,
          usageScore: 85,
          planName: planName.trim() || 'Standard Tier',
          dataSource: 'MANUAL_VAULT',
        };

        onAdd(newSub);
        toast.success(`Tracked ${newSub.name} locally in your device vault`);
        onClose();
      }

      setName('');
      setVendor('');
      setAmount('15.00');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-service-title"
        className="w-full max-w-lg rounded-[24px] bg-[#1c1c1e] border border-white/[0.12] shadow-2xl p-6 text-[#f5f5f7] transform transition-all flex flex-col"
        style={{
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div>
            <h2 id="add-service-title" className="text-lg font-semibold tracking-tight text-white">
              Track Recurring Service
            </h2>
            <p className="text-xs text-[#86868b] mt-0.5">
              Create a PayPal Sandbox subscription or track in local vault
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#86868b] hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pending Approval Modal View */}
        {pendingApproval ? (
          <div className="py-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#0071e3]/20 border border-[#0071e3]/40 flex items-center justify-center text-[#2997ff] mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">
                PayPal Sandbox Agreement Created
              </h3>
              <p className="text-xs text-[#86868b] max-w-sm mx-auto">
                Agreement ID <code className="text-[#2997ff] font-mono">{pendingApproval.subscription.paypalAgreementId}</code> is ready for Sandbox checkout approval.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-left space-y-1 font-mono">
              <div className="flex justify-between text-[#86868b]">
                <span>Service:</span>
                <span className="text-white font-sans">{pendingApproval.subscription.name}</span>
              </div>
              <div className="flex justify-between text-[#86868b]">
                <span>Rate:</span>
                <span className="text-white">${pendingApproval.subscription.amount.toFixed(2)} / {pendingApproval.subscription.billingCycle.toLowerCase()}</span>
              </div>
              <div className="flex justify-between text-[#86868b]">
                <span>Status:</span>
                <span className="text-[#ff9f0a]">APPROVAL_PENDING</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={pendingApproval.approveUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  toast.info('Completing sandbox approval...');
                  setTimeout(() => {
                    onClose();
                  }, 1200);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-[#0071e3]/30"
              >
                <span>Complete Approval on PayPal Sandbox</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs text-[#86868b] hover:text-white transition-colors"
              >
                Close & Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Source Mode Toggle */}
            <div className="my-3 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setSourceType('PAYPAL_SANDBOX')}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  sourceType === 'PAYPAL_SANDBOX'
                    ? 'bg-[#0071e3] text-white font-semibold shadow-sm'
                    : 'text-[#86868b] hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>PayPal Sandbox Live</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('MANUAL_VAULT')}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  sourceType === 'MANUAL_VAULT'
                    ? 'bg-white/10 text-white font-semibold shadow-sm'
                    : 'text-[#86868b] hover:text-white'
                }`}
              >
                <span>Manual Vault Item</span>
              </button>
            </div>

            {/* Presets */}
            <div className="mb-4">
              <label className="text-[11px] font-medium uppercase tracking-wider text-[#86868b] block mb-2">
                Quick Select Preset
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {PRESET_SERVICES.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-all shrink-0 active:scale-[0.96] ${
                      name === p.name
                        ? 'bg-white text-black font-semibold'
                        : 'bg-white/[0.06] text-[#86868b] hover:text-white hover:bg-white/[0.1]'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#86868b] block mb-1.5">
                    Service Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Netflix, Claude"
                    className="w-full bg-[#16171b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5e626b] focus:outline-none focus:border-white/[0.3] transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#86868b] block mb-1.5">
                    Vendor / Provider
                  </label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="e.g. OpenAI"
                    className="w-full bg-[#16171b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5e626b] focus:outline-none focus:border-white/[0.3] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#86868b] block mb-1.5">
                    Billing Rate ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#16171b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-[#5e626b] focus:outline-none focus:border-white/[0.3] transition-colors tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#86868b] block mb-1.5">
                    Billing Cycle
                  </label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                    className="w-full bg-[#16171b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/[0.3] transition-colors"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="QUARTERLY">Quarterly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#86868b] block mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full bg-[#16171b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/[0.3] transition-colors"
                  >
                    <option value="PRODUCTIVITY">Productivity</option>
                    <option value="DEV_TOOLS">Developer Tools</option>
                    <option value="AI_AND_ML">AI & Machine Learning</option>
                    <option value="CLOUD_INFRA">Cloud Infrastructure</option>
                    <option value="DESIGN_CREATIVE">Design & Creative</option>
                    <option value="STREAMING_MEDIA">Streaming & Media</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#86868b] block mb-1.5">
                    Plan Tier
                  </label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g. Pro, Family, Seat"
                    className="w-full bg-[#16171b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5e626b] focus:outline-none focus:border-white/[0.3] transition-colors"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#86868b] hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold transition-all active:scale-[0.96] shadow-md shadow-[#0071e3]/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {isSubmitting 
                      ? 'Creating on PayPal...' 
                      : sourceType === 'PAYPAL_SANDBOX' 
                      ? 'Create via PayPal Sandbox' 
                      : 'Save Service Locally'}
                  </span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
