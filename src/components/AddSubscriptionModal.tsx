'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Subscription, Category, BillingCycle, SubscriptionDataSource, PriceVerificationStatus } from '@/types';
import { X, CreditCard, ShieldCheck, Loader2, ExternalLink, Sparkles, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Channel3Suggestions } from '@/components/Channel3Suggestions';
import { CompanyLogo } from '@/components/CompanyLogo';
import { CANONICAL_SUBSCRIPTION_REGISTRY, CuratedService } from '@/lib/canonicalServices';
import { BASELINE_EXCHANGE_RATES, convertAmount } from '@/lib/currency';
import { REGIONAL_MARKETS } from '@/lib/priceIntelligence';

export interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (sub: Subscription) => void;
  currencySymbol?: string;
  currencyCode?: string;
  rates?: Record<string, number>;
}

export interface ServicePlanOption {
  name: string;
  amount: string;
  cycle: BillingCycle;
  features?: string;
  verificationStatus?: PriceVerificationStatus;
  sourceUrl?: string;
  sourceTitle?: string;
  lastVerified?: string;
  isIntroductory?: boolean;
  introductoryDetails?: string;
  isStudentDiscount?: boolean;
  taxDetails?: string;
  originalAmount?: number;
  originalCurrency?: string;
  isConvertedEquivalent?: boolean;
}

export interface ServiceDefinition {
  name: string;
  vendor: string;
  category: Category;
  country?: string;
  currency?: string;
  sourceCurrency?: string;
  isConvertedEquivalent?: boolean;
  plans: ServicePlanOption[];
  overallStatus?: PriceVerificationStatus;
  sourceType?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  lastVerified?: string;
  isCached?: boolean;
  cachedAt?: string;
  verificationNotes?: string;
}

function formatCycleDuration(cycle: BillingCycle): string {
  switch (cycle) {
    case 'YEARLY':
      return '/ year';
    case 'QUARTERLY':
      return '/ 3 months';
    case 'MONTHLY':
    default:
      return '/ mo';
  }
}

function calculateMonthlyEquivalent(amount: number, cycle: BillingCycle): number {
  if (cycle === 'YEARLY') return amount / 12;
  if (cycle === 'QUARTERLY') return amount / 3;
  return amount;
}

export function AddSubscriptionModal({
  isOpen,
  onClose,
  onAdd,
  currencySymbol = '$',
  currencyCode = 'USD',
  rates,
}: AddSubscriptionModalProps) {
  const activeRates = rates || BASELINE_EXCHANGE_RATES;

  const [name, setName] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState<Category>('PRODUCTIVITY');
  const [userAmountOverride, setUserAmountOverride] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [planName, setPlanName] = useState('Standard Tier');
  const [sourceType, setSourceType] = useState<SubscriptionDataSource>('PAYPAL_SANDBOX');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Native price tracking to avoid double-conversion and drift
  const [nativeAmount, setNativeAmount] = useState<number | null>(null);
  const [nativeCurrency, setNativeCurrency] = useState<string | null>(null);

  // Clear manual override when dashboard currency changes
  const [prevCurrency, setPrevCurrency] = useState(currencyCode);
  if (prevCurrency !== currencyCode) {
    setPrevCurrency(currencyCode);
    setUserAmountOverride(null);
  }

  const isConvertedEquivalent = Boolean(
    nativeCurrency && nativeCurrency.toUpperCase() !== currencyCode.toUpperCase()
  );

  const amount = useMemo(() => {
    if (userAmountOverride !== null) return userAmountOverride;
    if (nativeAmount !== null && nativeCurrency) {
      if (nativeCurrency.toUpperCase() === currencyCode.toUpperCase()) {
        return nativeAmount % 1 === 0 ? nativeAmount.toFixed(0) : nativeAmount.toFixed(2);
      }
      return convertAmount(nativeAmount, nativeCurrency, currencyCode, activeRates).toFixed(2);
    }
    return '15.00';
  }, [userAmountOverride, nativeAmount, nativeCurrency, currencyCode, activeRates]);

  const [selectedService, setSelectedService] = useState<ServiceDefinition | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiDiscoveredItem, setAiDiscoveredItem] = useState<ServiceDefinition | null>(null);

  const [pendingApproval, setPendingApproval] = useState<{
    subscription: Subscription;
    approveUrl: string;
  } | null>(null);

  // Suggestions derived directly from canonical registry with converted prices
  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (q.length === 0) return [];

    return CANONICAL_SUBSCRIPTION_REGISTRY.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.vendor.toLowerCase().includes(q)
    ).map((item) => {
      const nativeDirect = item.regionalPlans[currencyCode];
      let nativeCurr = currencyCode;
      let plans = nativeDirect;
      let isPlanConverted = false;

      if (!plans || plans.length === 0) {
        const availableCurrs = Object.keys(item.regionalPlans).filter(
          (k) => Array.isArray(item.regionalPlans[k]) && (item.regionalPlans[k]?.length ?? 0) > 0
        );
        const fallbackCurr = availableCurrs.includes('USD')
          ? 'USD'
          : availableCurrs.includes('INR')
          ? 'INR'
          : availableCurrs[0];

        if (fallbackCurr) {
          plans = item.regionalPlans[fallbackCurr];
          nativeCurr = fallbackCurr;
          isPlanConverted = nativeCurr.toUpperCase() !== currencyCode.toUpperCase();
        }
      }

      const firstPlan = plans && plans.length > 0 ? plans[0] : null;
      const rawNativeAmt = firstPlan ? parseFloat(firstPlan.amount) : 10;
      const displayAmt = isPlanConverted
        ? convertAmount(rawNativeAmt, nativeCurr, currencyCode, activeRates)
        : rawNativeAmt;

      return {
        item,
        nativeCurr,
        rawNativeAmt,
        displayAmt,
        isPlanConverted,
        firstPlan,
      };
    });
  }, [name, currencyCode, activeRates]);


  // Live lookup via Price Intelligence Engine
  useEffect(() => {
    const q = name.trim();
    if (q.length < 2) {
      const timer = setTimeout(() => {
        setAiDiscoveredItem(null);
        setIsAiSearching(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsAiSearching(true);
      try {
        const res = await fetch('/api/services/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, currency: currencyCode }),
        });
        if (!res.ok) {
          if (!isCancelled) setIsAiSearching(false);
          return;
        }
        const data: ServiceDefinition = await res.json();
        if (!isCancelled && data && data.name) {
          setAiDiscoveredItem(data);
        }
      } catch {
        if (!isCancelled) setAiDiscoveredItem(null);
      } finally {
        if (!isCancelled) setIsAiSearching(false);
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [name, currencyCode]);

  const handleSelectCanonicalService = (curated: CuratedService) => {
    setName(curated.name);
    setVendor(curated.vendor);
    setCategory(curated.category);

    const direct = curated.regionalPlans[currencyCode];
    let sourceCurrency = currencyCode;
    let sourceCountry = REGIONAL_MARKETS[currencyCode]?.country || 'Global';
    let isConverted = false;
    let rawPlans = direct;

    if (!rawPlans || rawPlans.length === 0) {
      const availableCurrs = Object.keys(curated.regionalPlans).filter(
        (k) => Array.isArray(curated.regionalPlans[k]) && (curated.regionalPlans[k]?.length ?? 0) > 0
      );
      const fallbackCurr = availableCurrs.includes('USD')
        ? 'USD'
        : availableCurrs.includes('INR')
        ? 'INR'
        : availableCurrs[0];

      if (fallbackCurr) {
        rawPlans = curated.regionalPlans[fallbackCurr];
        sourceCurrency = fallbackCurr;
        sourceCountry = REGIONAL_MARKETS[fallbackCurr]?.country || (fallbackCurr === 'INR' ? 'India' : 'United States');
        isConverted = sourceCurrency.toUpperCase() !== currencyCode.toUpperCase();
      }
    }

    const convertedPlans: ServicePlanOption[] = (rawPlans || []).map((p) => {
      const origAmt = parseFloat(p.amount);
      const convertedAmt = isConverted
        ? convertAmount(origAmt, sourceCurrency, currencyCode, activeRates)
        : origAmt;

      return {
        name: p.name,
        amount: convertedAmt.toFixed(2),
        cycle: p.cycle,
        features: p.features,
        verificationStatus: p.verificationStatus || 'VERIFIED',
        sourceUrl: p.sourceUrl || curated.officialUrl,
        sourceTitle: p.sourceTitle,
        isIntroductory: p.isIntroductory,
        introductoryDetails: p.introductoryDetails,
        isStudentDiscount: p.isStudentDiscount,
        originalAmount: origAmt,
        originalCurrency: sourceCurrency,
        isConvertedEquivalent: isConverted,
      };
    });

    const serviceDef: ServiceDefinition = {
      name: curated.name,
      vendor: curated.vendor,
      category: curated.category,
      country: sourceCountry,
      currency: currencyCode,
      sourceCurrency,
      isConvertedEquivalent: isConverted,
      plans: convertedPlans,
      overallStatus: 'VERIFIED',
      sourceType: 'BASELINE_REGISTRY',
      sourceUrl: curated.officialUrl,
      sourceTitle: `${curated.name} Official Registry`,
    };

    setSelectedService(serviceDef);

    if (convertedPlans.length > 0) {
      const first = convertedPlans[0];
      handleSelectPlan(first);
    }
    setShowSuggestions(false);
  };

  const handleSelectService = (service: ServiceDefinition) => {
    setSelectedService(service);
    setName(service.name);
    setVendor(service.vendor);
    setCategory(service.category);

    if (service.plans && service.plans.length > 0) {
      handleSelectPlan(service.plans[0]);
    }
    setShowSuggestions(false);
  };

  const handleSelectPlan = (plan: ServicePlanOption) => {
    setPlanName(plan.name);
    setBillingCycle(plan.cycle);

    const origAmount = plan.originalAmount ?? parseFloat(plan.amount);
    const origCurr = plan.originalCurrency || selectedService?.sourceCurrency || selectedService?.currency || currencyCode;

    setNativeAmount(origAmount);
    setNativeCurrency(origCurr);
    setUserAmountOverride(null);
  };

  const handleAmountChange = (newVal: string) => {
    setUserAmountOverride(newVal);
    const parsed = parseFloat(newVal);
    if (!isNaN(parsed) && parsed > 0) {
      if (nativeCurrency && nativeCurrency.toUpperCase() !== currencyCode.toUpperCase()) {
        const backToNative = convertAmount(parsed, currencyCode, nativeCurrency, activeRates);
        setNativeAmount(backToNative);
      } else {
        setNativeAmount(parsed);
        setNativeCurrency(currencyCode);
      }
    }
  };

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

        // Check if native currency is valid for standard international PayPal billing
        const isNativeInr = nativeCurrency?.toUpperCase() === 'INR';
        const paypalCurrency = isNativeInr ? currencyCode : (nativeCurrency || currencyCode);
        const paypalAmount = isNativeInr ? parsedAmount : (nativeAmount ?? parsedAmount);

        const res = await fetch('/api/paypal/subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CREATE',
            name: name.trim(),
            vendor: vendor.trim() || name.trim(),
            amount: paypalAmount,
            currency: paypalCurrency,
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
          amount: paypalAmount,
          currency: paypalCurrency,
          originalAmount: nativeAmount ?? paypalAmount,
          originalCurrency: nativeCurrency ?? paypalCurrency,
          isConvertedEquivalent: Boolean(isConvertedEquivalent),
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
        // MANUAL_VAULT: Preserves the authentic native regional price and currency
        const storeAmount = nativeAmount ?? parsedAmount;
        const storeCurrency = nativeCurrency ?? currencyCode;

        const newSub: Subscription = {
          id: `sub_${Date.now()}`,
          name: name.trim(),
          vendor: vendor.trim() || name.trim(),
          category,
          amount: storeAmount,
          currency: storeCurrency,
          originalAmount: storeAmount,
          originalCurrency: storeCurrency,
          isConvertedEquivalent: Boolean(isConvertedEquivalent && storeCurrency.toUpperCase() !== currencyCode.toUpperCase()),
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
      setUserAmountOverride(null);
      setNativeAmount(null);
      setNativeCurrency(null);
      setSelectedService(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-2xl select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-service-title"
        className="w-full max-w-[540px] max-h-[92vh] rounded-[28px] bg-[#1d1d1f]/90 backdrop-blur-3xl border border-white/[0.12] shadow-2xl p-6 sm:p-7 text-[#f5f5f7] transform transition-all flex flex-col overflow-hidden"
        style={{
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="flex items-start justify-between pb-4 border-b border-white/[0.08] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="add-service-title" className="text-[17px] font-semibold tracking-tight text-white">
                Track Service
              </h2>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/[0.08] text-[#86868b] border border-white/[0.08]">
                {currencyCode} ({currencySymbol})
              </span>
            </div>
            <p className="text-[13px] text-[#86868b] tracking-normal mt-0.5">
              Live PayPal recurring agreement or encrypted local ledger
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-[#86868b] hover:text-white flex items-center justify-center transition-all active:scale-[0.92] cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        <div className="overflow-y-auto pr-1 -mr-1 space-y-4 pt-3 flex-1">
          {pendingApproval ? (
            <div className="py-6 space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#0071e3]/20 border border-[#0071e3]/40 flex items-center justify-center text-[#2997ff] mx-auto shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white tracking-tight">
                  PayPal Sandbox Agreement Created
                </h3>
                <p className="text-xs text-[#86868b] max-w-sm mx-auto">
                  Agreement ID <code className="text-[#2997ff] font-mono">{pendingApproval.subscription.paypalAgreementId}</code> is ready for Sandbox checkout approval.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] text-xs text-left space-y-1.5 font-mono">
                <div className="flex justify-between text-[#86868b]">
                  <span>Service:</span>
                  <span className="text-white font-sans font-medium">{pendingApproval.subscription.name}</span>
                </div>
                <div className="flex justify-between text-[#86868b]">
                  <span>Rate:</span>
                  <span className="text-white tabular-nums">
                    {pendingApproval.subscription.currency} {pendingApproval.subscription.amount.toFixed(2)} {formatCycleDuration(pendingApproval.subscription.billingCycle)}
                  </span>
                </div>
                {pendingApproval.subscription.originalCurrency && pendingApproval.subscription.originalCurrency !== pendingApproval.subscription.currency && (
                  <div className="flex justify-between text-cyan-400">
                    <span>Native Rate:</span>
                    <span>
                      {pendingApproval.subscription.originalCurrency} {(pendingApproval.subscription.originalAmount ?? pendingApproval.subscription.amount).toFixed(2)}
                    </span>
                  </div>
                )}
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
                  className="w-full py-3 px-4 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-lg shadow-[#0071e3]/30 cursor-pointer"
                >
                  <span>Complete Approval on PayPal Sandbox</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 text-xs text-[#86868b] hover:text-white transition-colors cursor-pointer"
                >
                  Close & Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Segmented Control */}
              <div className="p-1 rounded-2xl bg-black/40 border border-white/[0.08] grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setSourceType('PAYPAL_SANDBOX')}
                  className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${
                    sourceType === 'PAYPAL_SANDBOX'
                      ? 'bg-[#0071e3] text-white font-semibold shadow-md shadow-[#0071e3]/30'
                      : 'text-[#86868b] hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>PayPal Sandbox Live</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceType('MANUAL_VAULT')}
                  className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${
                    sourceType === 'MANUAL_VAULT'
                      ? 'bg-white/15 text-white font-semibold shadow-sm'
                      : 'text-[#86868b] hover:text-white'
                  }`}
                >
                  <span>Manual Ledger Entry</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="text-[12px] font-medium text-[#86868b] block mb-1.5 tracking-tight">
                      Service Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="e.g. Swiggy, Netflix, Claude, Spotify"
                      className="w-full bg-black/30 border border-white/[0.12] hover:border-white/[0.22] focus:border-[#0071e3] rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-[#5e626b] focus:outline-none transition-all"
                    />

                    {showSuggestions && name.trim().length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-[#1d1d1f]/95 backdrop-blur-2xl border border-white/[0.14] shadow-2xl p-1.5 max-h-56 overflow-y-auto">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-[#86868b] px-2.5 py-1.5 flex items-center justify-between border-b border-white/[0.08] mb-1">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-[#2997ff]" />
                            <span>Curated Subscriptions</span>
                          </div>
                          <span className="text-[9px] text-[#30d158] font-mono font-medium">
                            {currencyCode} ({currencySymbol})
                          </span>
                        </div>

                        {suggestions.map(({ item, nativeCurr, rawNativeAmt, displayAmt, isPlanConverted, firstPlan }) => {
                          const origSymbol = REGIONAL_MARKETS[nativeCurr]?.symbol || nativeCurr;
                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => handleSelectCanonicalService(item)}
                              className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/[0.08] transition-all flex items-center justify-between group cursor-pointer active:scale-[0.98]"
                            >
                              <div className="flex items-center gap-2.5 truncate mr-2">
                                <CompanyLogo name={item.name} vendor={item.vendor} size={28} />
                                <div className="truncate">
                                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                    <span>{item.name}</span>
                                    {isPlanConverted && (
                                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                        {nativeCurr} Native
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-[#86868b] mt-0.5 truncate">
                                    {item.vendor} • {item.category.replace('_', ' ').toLowerCase()}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-mono font-medium text-white tabular-nums">
                                  from {currencySymbol}{displayAmt.toFixed(2)}
                                </div>
                                {isPlanConverted ? (
                                  <div className="text-[9px] text-[#86868b] font-mono">
                                    ≈ {origSymbol}{rawNativeAmt % 1 === 0 ? rawNativeAmt.toFixed(0) : rawNativeAmt.toFixed(2)}
                                  </div>
                                ) : (
                                  <div className="text-[9px] text-[#86868b] uppercase font-mono">
                                    {firstPlan?.cycle.toLowerCase()}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}

                        {isAiSearching && (
                          <div className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center gap-2.5 text-xs text-[#86868b] mt-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2997ff]" />
                            <span className="animate-pulse">
                              Discovering live {currencyCode} ({currencySymbol}) pricing for &quot;{name}&quot;...
                            </span>
                          </div>
                        )}

                        {aiDiscoveredItem && !suggestions.some((s) => s.item.name.toLowerCase() === aiDiscoveredItem.name.toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => handleSelectService(aiDiscoveredItem)}
                            className="w-full text-left px-2.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-[#2997ff]/40 transition-all flex items-center justify-between group cursor-pointer active:scale-[0.98] mt-1 shadow-sm"
                          >
                            <div className="flex items-center gap-2.5 truncate mr-2">
                              <CompanyLogo name={aiDiscoveredItem.name} vendor={aiDiscoveredItem.vendor} size={28} />
                              <div className="truncate">
                                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                  <span>{aiDiscoveredItem.name}</span>
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#0071e3]/20 text-[#2997ff] border border-[#0071e3]/40">
                                    {aiDiscoveredItem.isConvertedEquivalent ? `${aiDiscoveredItem.sourceCurrency} → ${currencyCode}` : `${currencyCode} Live`}
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#86868b] mt-0.5 truncate">{aiDiscoveredItem.vendor}</div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-mono font-medium text-white tabular-nums">
                                from {currencySymbol}{aiDiscoveredItem.plans[0]?.amount}
                              </div>
                              <div className="text-[9px] text-[#86868b] uppercase font-mono">{aiDiscoveredItem.plans[0]?.cycle.toLowerCase()}</div>
                            </div>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#86868b] block mb-1.5 tracking-tight">
                      Vendor / Provider
                    </label>
                    <input
                      type="text"
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      placeholder="e.g. Bundl Technologies, Netflix Inc"
                      className="w-full bg-black/30 border border-white/[0.12] hover:border-white/[0.22] focus:border-[#0071e3] rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-[#5e626b] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {selectedService && selectedService.plans && selectedService.plans.length > 0 && (
                  <div className="p-4 rounded-2xl bg-black/30 border border-white/[0.1] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CompanyLogo name={selectedService.name} vendor={selectedService.vendor} size={24} />
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5 tracking-tight">
                          <Sparkles className="w-3.5 h-3.5 text-[#2997ff]" />
                          <span>Select {selectedService.name} Tier</span>
                          {selectedService.isConvertedEquivalent ? (
                            <span className="text-[10px] font-mono text-cyan-400 font-normal">
                              ({currencyCode} Equiv • Native {selectedService.sourceCurrency || selectedService.country})
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-[#86868b] font-normal">
                              ({currencyCode})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedService.sourceType === 'BASELINE_REGISTRY' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Baseline Data
                          </span>
                        )}
                        {selectedService.sourceUrl && (
                          <a
                            href={selectedService.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-[#2997ff] hover:underline flex items-center gap-1"
                          >
                            <span>{selectedService.sourceTitle || 'Official Source'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {selectedService.isConvertedEquivalent && (
                      <div className="text-[11px] bg-cyan-950/30 border border-cyan-500/20 rounded-xl p-2.5 text-cyan-300">
                        <span className="font-semibold">{selectedService.name}</span> offers regional plans in{' '}
                        <span className="font-semibold">{selectedService.sourceCurrency || 'INR'}</span> ({selectedService.country || 'India'}).
                        Plan amounts below are converted into <span className="font-semibold">{currencyCode}</span> equivalents using current exchange rates.
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedService.plans.map((p) => {
                        const isSelected = planName.toLowerCase() === p.name.toLowerCase();
                        const vStatus = p.verificationStatus || selectedService.overallStatus || 'VERIFIED';

                        const origAmt = p.originalAmount ?? parseFloat(p.amount);
                        const origCurr = p.originalCurrency || selectedService.sourceCurrency || selectedService.currency || currencyCode;
                        const isPlanConverted = origCurr.toUpperCase() !== currencyCode.toUpperCase();

                        const planDisplayAmt = isPlanConverted
                          ? convertAmount(origAmt, origCurr, currencyCode, activeRates)
                          : origAmt;

                        const cycleDuration = formatCycleDuration(p.cycle);
                        const monthlyEquivDisplay = calculateMonthlyEquivalent(planDisplayAmt, p.cycle);
                        const monthlyEquivNative = calculateMonthlyEquivalent(origAmt, p.cycle);
                        const origSymbol = REGIONAL_MARKETS[origCurr]?.symbol || origCurr;

                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => handleSelectPlan(p)}
                            className={`text-left p-3 rounded-2xl border transition-all active:scale-[0.97] cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-[#0071e3]/15 border-[#0071e3] ring-2 ring-[#0071e3]/50 shadow-md shadow-[#0071e3]/20'
                                : 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.06]'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between text-xs mb-1">
                                <span className="font-semibold text-white flex items-center gap-1.5 mr-2">
                                  <span>{p.name}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-[#2997ff] shrink-0" />}
                                </span>
                                <div className="text-right shrink-0">
                                  <div className="font-mono font-semibold text-white tabular-nums text-xs">
                                    {currencySymbol}{planDisplayAmt.toFixed(2)}
                                    <span className="text-[10px] font-sans font-normal text-[#86868b] ml-1">
                                      {cycleDuration}
                                    </span>
                                  </div>
                                  {(p.cycle === 'QUARTERLY' || p.cycle === 'YEARLY') && (
                                    <div className="text-[10px] font-mono text-[#86868b] mt-0.5">
                                      Monthly equiv: {currencySymbol}{monthlyEquivDisplay.toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {p.features && (
                                <p className="text-[10px] text-[#86868b] line-clamp-2 leading-relaxed mt-1">
                                  {p.features}
                                </p>
                              )}
                            </div>

                            {isPlanConverted && (
                              <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-cyan-400">
                                <span>
                                  Native: {origSymbol}{origAmt % 1 === 0 ? origAmt.toFixed(0) : origAmt.toFixed(2)}
                                  {(p.cycle === 'QUARTERLY' || p.cycle === 'YEARLY') && (
                                    <span className="text-[#86868b] ml-1">
                                      (equiv. {origSymbol}{monthlyEquivNative.toFixed(2)}/mo)
                                    </span>
                                  )}
                                </span>
                                <span className="text-[9px] text-[#86868b]">
                                  {selectedService.country || origCurr}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-1.5 pt-2 mt-2 border-t border-white/[0.04]">
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                vStatus === 'VERIFIED'
                                  ? 'bg-[#30d158]/10 text-[#30d158]'
                                  : vStatus === 'CROSS_CHECKED'
                                  ? 'bg-[#2997ff]/10 text-[#2997ff]'
                                  : 'bg-[#ff9f0a]/10 text-[#ff9f0a]'
                              }`}>
                                {vStatus.replace('_', ' ')}
                              </span>

                              <div className="flex gap-1 flex-wrap">
                                {p.isStudentDiscount && (
                                  <span className="text-[9px] font-mono text-[#2997ff] bg-[#0071e3]/15 px-1 py-0.5 rounded">
                                    Student
                                  </span>
                                )}
                                {p.isIntroductory && (
                                  <span
                                    className="text-[9px] font-mono text-[#ff9f0a] bg-[#ff9f0a]/15 px-1 py-0.5 rounded cursor-help"
                                    title={p.introductoryDetails}
                                  >
                                    Intro Rate
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[12px] font-medium text-[#86868b] block tracking-tight">
                        Billing Rate ({currencySymbol})
                      </label>
                      {isConvertedEquivalent && nativeCurrency && (
                        <span className="text-[10px] font-mono text-cyan-400">
                          Native: {REGIONAL_MARKETS[nativeCurrency]?.symbol || nativeCurrency}
                          {nativeAmount ? (nativeAmount % 1 === 0 ? nativeAmount.toFixed(0) : nativeAmount.toFixed(2)) : ''}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="w-full bg-black/30 border border-white/[0.12] hover:border-white/[0.22] focus:border-[#0071e3] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-[#5e626b] focus:outline-none transition-all tabular-nums"
                    />
                    {billingCycle === 'QUARTERLY' && (
                      <div className="text-[10px] text-[#86868b] mt-1 font-mono">
                        Charged every 3 months • Monthly equivalent: {currencySymbol}{(parseFloat(amount || '0') / 3).toFixed(2)}/mo
                      </div>
                    )}
                    {billingCycle === 'YEARLY' && (
                      <div className="text-[10px] text-[#86868b] mt-1 font-mono">
                        Charged annually • Monthly equivalent: {currencySymbol}{(parseFloat(amount || '0') / 12).toFixed(2)}/mo
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#86868b] block mb-1.5 tracking-tight">
                      Billing Cycle
                    </label>
                    <div className="relative">
                      <select
                        value={billingCycle}
                        onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                        className="w-full bg-black/30 border border-white/[0.12] hover:border-white/[0.22] focus:border-[#0071e3] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all appearance-none cursor-pointer pr-8"
                      >
                        <option value="MONTHLY">Monthly (1 Month)</option>
                        <option value="QUARTERLY">Quarterly (3 Months)</option>
                        <option value="YEARLY">Yearly (12 Months)</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[#86868b] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-medium text-[#86868b] block mb-1.5 tracking-tight">
                      Category
                    </label>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as Category)}
                        className="w-full bg-black/30 border border-white/[0.12] hover:border-white/[0.22] focus:border-[#0071e3] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all appearance-none cursor-pointer pr-8"
                      >
                        <option value="PRODUCTIVITY">Productivity</option>
                        <option value="DEV_TOOLS">Developer Tools</option>
                        <option value="AI_AND_ML">AI & Machine Learning</option>
                        <option value="CLOUD_INFRA">Cloud Infrastructure</option>
                        <option value="DESIGN_CREATIVE">Design & Creative</option>
                        <option value="STREAMING_MEDIA">Streaming & Media</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[#86868b] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#86868b] block mb-1.5 tracking-tight">
                      Plan Tier
                    </label>
                    <input
                      type="text"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder="e.g. Swiggy One (3 Months), Pro, Family"
                      className="w-full bg-black/30 border border-white/[0.12] hover:border-white/[0.22] focus:border-[#0071e3] rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-[#5e626b] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {name.trim().length >= 2 && (
                  <Channel3Suggestions
                    serviceName={name}
                    category={category}
                    currentMonthlyCost={calculateMonthlyEquivalent(parseFloat(amount) || 15, billingCycle)}
                  />
                )}

                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-2xl text-xs font-medium text-[#86868b] hover:text-white transition-colors disabled:opacity-50 cursor-pointer active:scale-[0.97]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold transition-all active:scale-[0.96] shadow-md shadow-[#0071e3]/30 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
    </div>
  );
}
