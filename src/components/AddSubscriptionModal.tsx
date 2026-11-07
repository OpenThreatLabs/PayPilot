'use client';

import React, { useState, useEffect } from 'react';
import { Subscription, Category, BillingCycle, SubscriptionDataSource } from '@/types';
import { X, CreditCard, ShieldCheck, Loader2, ExternalLink, Sparkles, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Channel3Suggestions } from '@/components/Channel3Suggestions';
import { CompanyLogo } from '@/components/CompanyLogo';

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (sub: Subscription) => void;
  currencySymbol?: string;
  currencyCode?: string;
}

interface ServicePlanOption {
  name: string;
  amount: string;
  cycle: BillingCycle;
  features?: string;
}

interface ServiceDefinition {
  name: string;
  vendor: string;
  category: Category;
  plans: ServicePlanOption[];
}

const SERVICE_CATALOG: ServiceDefinition[] = [
  {
    name: 'Netflix',
    vendor: 'Netflix Inc',
    category: 'STREAMING_MEDIA',
    plans: [
      { name: 'Standard with Ads', amount: '6.99', cycle: 'MONTHLY', features: '1080p Full HD • 2 devices' },
      { name: 'Standard', amount: '15.49', cycle: 'MONTHLY', features: '1080p Full HD • Ad-free • 2 devices' },
      { name: 'Premium 4K Ultra HD', amount: '22.99', cycle: 'MONTHLY', features: '4K Ultra HD + HDR • Spatial Audio • 4 devices' },
    ]
  },
  {
    name: 'Spotify',
    vendor: 'Spotify AB',
    category: 'STREAMING_MEDIA',
    plans: [
      { name: 'Student Plan', amount: '5.99', cycle: 'MONTHLY', features: '1 account • Verified student discount' },
      { name: 'Individual Plan', amount: '11.99', cycle: 'MONTHLY', features: '1 ad-free account • Offline downloads' },
      { name: 'Duo (2 Accounts)', amount: '16.99', cycle: 'MONTHLY', features: '2 Premium accounts for couples under one roof' },
      { name: 'Family Plan', amount: '19.99', cycle: 'MONTHLY', features: 'Up to 6 accounts • Family mix & explicit block' },
    ]
  },
  {
    name: 'ChatGPT',
    vendor: 'OpenAI',
    category: 'AI_AND_ML',
    plans: [
      { name: 'ChatGPT Plus', amount: '20.00', cycle: 'MONTHLY', features: 'GPT-4o, DALL-E, Voice Mode, Advanced Data Analysis' },
      { name: 'ChatGPT Pro', amount: '200.00', cycle: 'MONTHLY', features: 'Unlimited o1, o1-pro mode, deep research reasoning' },
      { name: 'Team Workspace', amount: '25.00', cycle: 'MONTHLY', features: 'Per seat billed annually • Admin console & workspace' },
    ]
  },
  {
    name: 'Claude',
    vendor: 'Anthropic',
    category: 'AI_AND_ML',
    plans: [
      { name: 'Claude Pro', amount: '20.00', cycle: 'MONTHLY', features: 'Claude 3.5 Sonnet, Projects, 5x usage limits' },
      { name: 'Claude Team', amount: '25.00', cycle: 'MONTHLY', features: 'Per user • Minimum 5 seats • Early feature access' },
    ]
  },
  {
    name: 'Cursor',
    vendor: 'Anysphere Inc',
    category: 'DEV_TOOLS',
    plans: [
      { name: 'Cursor Pro', amount: '20.00', cycle: 'MONTHLY', features: '500 fast requests/mo, unlimited slow requests, Cursor Tab' },
      { name: 'Cursor Business', amount: '40.00', cycle: 'MONTHLY', features: 'Enforced privacy mode, centralized admin, SAML/SSO' },
    ]
  },
  {
    name: 'GitHub Copilot',
    vendor: 'Microsoft / GitHub',
    category: 'DEV_TOOLS',
    plans: [
      { name: 'Individual', amount: '10.00', cycle: 'MONTHLY', features: 'Code completions, CLI assistance, multi-editor support' },
      { name: 'Business Seat', amount: '19.00', cycle: 'MONTHLY', features: 'Organization management, policy controls, enterprise proxy' },
      { name: 'Enterprise Plan', amount: '39.00', cycle: 'MONTHLY', features: 'Custom fine-tuned models, PR summaries, Bing web search' },
    ]
  },
  {
    name: 'YouTube',
    vendor: 'Google LLC',
    category: 'STREAMING_MEDIA',
    plans: [
      { name: 'Student Premium', amount: '7.99', cycle: 'MONTHLY', features: 'Ad-free videos, background play, YouTube Music' },
      { name: 'Individual Premium', amount: '13.99', cycle: 'MONTHLY', features: 'Ad-free playback, offline downloads, YouTube Music Premium' },
      { name: 'Family Premium', amount: '22.99', cycle: 'MONTHLY', features: 'Up to 5 family members (ages 13+) in household' },
      { name: 'Annual Individual', amount: '139.99', cycle: 'YEARLY', features: '15% discount prepaid annual commitment' },
    ]
  },
  {
    name: 'Disney+',
    vendor: 'The Walt Disney Company',
    category: 'STREAMING_MEDIA',
    plans: [
      { name: 'Basic with Ads', amount: '9.99', cycle: 'MONTHLY', features: 'Stream with ads • Up to 1080p Full HD' },
      { name: 'Premium Ad-Free', amount: '15.99', cycle: 'MONTHLY', features: '4K Ultra HD & Dolby Atmos • Downloads on 10 devices' },
      { name: 'Trio Basic (Disney+, Hulu, ESPN+)', amount: '16.99', cycle: 'MONTHLY', features: 'Bundle streaming with ads' },
      { name: 'Trio Premium Bundle', amount: '26.99', cycle: 'MONTHLY', features: 'All three services completely ad-free' },
    ]
  },
  {
    name: 'Figma',
    vendor: 'Figma Inc',
    category: 'DESIGN_CREATIVE',
    plans: [
      { name: 'Professional Seat', amount: '15.00', cycle: 'MONTHLY', features: 'Unlimited files, team libraries, Dev Mode access' },
      { name: 'Organization Seat', amount: '45.00', cycle: 'MONTHLY', features: 'Design system analytics, private plugins, SSO' },
      { name: 'Enterprise Seat', amount: '75.00', cycle: 'MONTHLY', features: 'Dedicated workspaces, advanced security, guest controls' },
    ]
  },
  {
    name: 'Notion',
    vendor: 'Notion Labs',
    category: 'PRODUCTIVITY',
    plans: [
      { name: 'Plus Plan', amount: '10.00', cycle: 'MONTHLY', features: 'Unlimited blocks, file uploads, 100 guests' },
      { name: 'Plus + Notion AI', amount: '20.00', cycle: 'MONTHLY', features: 'Unlimited AI Q&A, autofill, translation in docs' },
      { name: 'Business Plan', amount: '18.00', cycle: 'MONTHLY', features: 'SAML SSO, private teamspaces, 250 guests' },
    ]
  },
  {
    name: 'Apple One',
    vendor: 'Apple Inc',
    category: 'STREAMING_MEDIA',
    plans: [
      { name: 'Individual', amount: '19.95', cycle: 'MONTHLY', features: 'Apple Music, TV+, Arcade, 50GB iCloud+' },
      { name: 'Family', amount: '25.95', cycle: 'MONTHLY', features: 'Share with up to 5 people • 200GB iCloud+' },
      { name: 'Premier', amount: '37.95', cycle: 'MONTHLY', features: 'Includes News+, Fitness+, and 2TB iCloud+' },
    ]
  },
  {
    name: 'Vercel',
    vendor: 'Vercel Inc',
    category: 'CLOUD_INFRA',
    plans: [
      { name: 'Pro Seat', amount: '20.00', cycle: 'MONTHLY', features: 'Per member/mo • 1TB bandwidth • Preview comments' },
      { name: 'Enterprise', amount: '150.00', cycle: 'MONTHLY', features: 'Custom limits, 99.99% SLA, Multi-region compute' },
    ]
  },
  {
    name: 'Canva',
    vendor: 'Canva Pty Ltd',
    category: 'DESIGN_CREATIVE',
    plans: [
      { name: 'Canva Pro', amount: '14.99', cycle: 'MONTHLY', features: '100M+ stock assets, Brand Kit, Magic Studio AI tools' },
      { name: 'Canva for Teams', amount: '29.99', cycle: 'MONTHLY', features: 'Team workflows, shared asset controls, approval chains' },
      { name: 'Canva Enterprise', amount: '60.00', cycle: 'MONTHLY', features: 'Enterprise security, SSO, dedicated account management' },
    ]
  },
  {
    name: 'Adobe Creative Cloud',
    vendor: 'Adobe',
    category: 'DESIGN_CREATIVE',
    plans: [
      { name: 'Photoshop Plan', amount: '22.99', cycle: 'MONTHLY', features: 'Photoshop on desktop and iPad + Adobe Express' },
      { name: 'Photography Plan (20GB)', amount: '9.99', cycle: 'MONTHLY', features: 'Lightroom and Photoshop' },
      { name: 'All Apps', amount: '59.99', cycle: 'MONTHLY', features: '20+ creative apps including Illustrator, Premiere Pro, After Effects' },
    ]
  },
  {
    name: 'Midjourney',
    vendor: 'Midjourney Inc',
    category: 'AI_AND_ML',
    plans: [
      { name: 'Basic Plan', amount: '10.00', cycle: 'MONTHLY', features: '3.3 hr/mo Fast GPU time, general commercial terms' },
      { name: 'Standard Plan', amount: '30.00', cycle: 'MONTHLY', features: '15 hr/mo Fast GPU time, unlimited Relax GPU generations' },
      { name: 'Pro Plan', amount: '60.00', cycle: 'MONTHLY', features: '30 hr/mo Fast GPU, Stealth generation mode' },
    ]
  },
  {
    name: 'Slack',
    vendor: 'Salesforce',
    category: 'PRODUCTIVITY',
    plans: [
      { name: 'Pro', amount: '8.75', cycle: 'MONTHLY', features: 'Unlimited message history, unlimited apps, canvas' },
      { name: 'Business+', amount: '15.00', cycle: 'MONTHLY', features: 'SAML SSO, 99.99% uptime guarantee, compliance exports' },
    ]
  },
  {
    name: 'Supabase',
    vendor: 'Supabase Inc',
    category: 'CLOUD_INFRA',
    plans: [
      { name: 'Pro', amount: '25.00', cycle: 'MONTHLY', features: '8GB database, daily backups, 100k MAU, compute credits' },
      { name: 'Team', amount: '599.00', cycle: 'MONTHLY', features: 'SOC2, priority support, organization-level audit logs' },
    ]
  },
  {
    name: 'Linear',
    vendor: 'Linear Orbit Inc',
    category: 'PRODUCTIVITY',
    plans: [
      { name: 'Standard', amount: '10.00', cycle: 'MONTHLY', features: 'Unlimited issues, file uploads, integrations' },
      { name: 'Plus', amount: '16.00', cycle: 'MONTHLY', features: 'SLA management, customer requests, private teams' },
    ]
  }
];

export function AddSubscriptionModal({
  isOpen,
  onClose,
  onAdd,
  currencySymbol = '$',
  currencyCode = 'USD',
}: AddSubscriptionModalProps) {
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState<Category>('PRODUCTIVITY');
  const [amount, setAmount] = useState('15.00');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [planName, setPlanName] = useState('Standard Tier');
  const [sourceType, setSourceType] = useState<SubscriptionDataSource>('PAYPAL_SANDBOX');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = name.trim().length > 0
    ? SERVICE_CATALOG.filter((item) =>
        item.name.toLowerCase().includes(name.trim().toLowerCase()) ||
        item.vendor.toLowerCase().includes(name.trim().toLowerCase())
      )
    : [];

  const [selectedService, setSelectedService] = useState<ServiceDefinition | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiDiscoveredItem, setAiDiscoveredItem] = useState<ServiceDefinition | null>(null);

  useEffect(() => {
    const q = name.trim();
    if (q.length < 2) {
      setAiDiscoveredItem(null);
      setIsAiSearching(false);
      return;
    }

    if (currencyCode === 'USD') {
      const hasExactCatalogMatch = SERVICE_CATALOG.some(
        (item) => item.name.toLowerCase() === q.toLowerCase()
      );
      if (hasExactCatalogMatch) {
        setAiDiscoveredItem(null);
        setIsAiSearching(false);
        return;
      }
    }

    setIsAiSearching(true);
    let isCancelled = false;
    const timer = setTimeout(async () => {
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
    }, 400);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [name, currencyCode]);

  const handleSelectService = (service: ServiceDefinition) => {
    setSelectedService(service);
    setName(service.name);
    setVendor(service.vendor);
    setCategory(service.category);
    if (service.plans.length > 0) {
      const firstPlan = service.plans[0];
      setPlanName(firstPlan.name);
      setAmount(firstPlan.amount);
      setBillingCycle(firstPlan.cycle);
    }
    setShowSuggestions(false);
  };

  const handleSelectPlan = (plan: ServicePlanOption) => {
    setPlanName(plan.name);
    setAmount(plan.amount);
    setBillingCycle(plan.cycle);
  };

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
          currency: currencyCode,
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
        const newSub: Subscription = {
          id: `sub_${Date.now()}`,
          name: name.trim(),
          vendor: vendor.trim() || name.trim(),
          category,
          amount: parsedAmount,
          currency: currencyCode,
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
                  <span className="text-white tabular-nums">{currencySymbol}{pendingApproval.subscription.amount.toFixed(2)} / {pendingApproval.subscription.billingCycle.toLowerCase()}</span>
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
                      placeholder="e.g. Netflix, Claude, Spotify"
                      className="w-full bg-black/30 border border-white/[0.12] hover:border-white/[0.22] focus:border-[#0071e3] rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-[#5e626b] focus:outline-none transition-all"
                    />

                    {showSuggestions && name.trim().length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-[#1d1d1f]/95 backdrop-blur-2xl border border-white/[0.14] shadow-2xl p-1.5 max-h-52 overflow-y-auto">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-[#86868b] px-2.5 py-1.5 flex items-center justify-between border-b border-white/[0.08] mb-1">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-[#2997ff]" />
                            <span>Suggested Services</span>
                          </div>
                          <span className="text-[9px] text-[#30d158] font-mono font-medium">{currencyCode} Regional</span>
                        </div>

                        {currencyCode === 'USD' && suggestions.map((item) => (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => handleSelectService(item)}
                            className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/[0.08] transition-all flex items-center justify-between group cursor-pointer active:scale-[0.98]"
                          >
                            <div className="flex items-center gap-2.5">
                              <CompanyLogo name={item.name} vendor={item.vendor} size={28} />
                              <div>
                                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                  <span>{item.name}</span>
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-white/[0.08] text-[#86868b] border border-white/[0.08]">
                                    {item.category.replace('_', ' ').toLowerCase()}
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#86868b] mt-0.5">{item.vendor} • {item.plans.length} plan tiers</div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-mono font-medium text-white tabular-nums">from {currencySymbol}{item.plans[0]?.amount}</div>
                              <div className="text-[9px] text-[#86868b] uppercase font-mono">{item.plans[0]?.cycle.toLowerCase()}</div>
                            </div>
                          </button>
                        ))}

                        {isAiSearching && (
                          <div className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center gap-2.5 text-xs text-[#86868b]">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2997ff]" />
                            <span className="animate-pulse">
                              Searching live {currencyCode} ({currencySymbol}) rates for &quot;{name}&quot;...
                            </span>
                          </div>
                        )}

                        {aiDiscoveredItem && (currencyCode !== 'USD' || !suggestions.some((s) => s.name.toLowerCase() === aiDiscoveredItem.name.toLowerCase())) && (
                          <button
                            type="button"
                            onClick={() => handleSelectService(aiDiscoveredItem)}
                            className="w-full text-left px-2.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-[#2997ff]/40 transition-all flex items-center justify-between group cursor-pointer active:scale-[0.98] mt-1 shadow-sm"
                          >
                            <div className="flex items-center gap-2.5">
                              <CompanyLogo name={aiDiscoveredItem.name} vendor={aiDiscoveredItem.vendor} size={28} />
                              <div>
                                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                  <span>{aiDiscoveredItem.name}</span>
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#0071e3]/20 text-[#2997ff] border border-[#0071e3]/40">
                                    {currencyCode} Live
                                  </span>
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-white/[0.08] text-[#86868b] border border-white/[0.08]">
                                    {aiDiscoveredItem.category.replace('_', ' ').toLowerCase()}
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#86868b] mt-0.5">{aiDiscoveredItem.vendor} • {aiDiscoveredItem.plans.length} plan tiers</div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-mono font-medium text-white tabular-nums">from {currencySymbol}{aiDiscoveredItem.plans[0]?.amount}</div>
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
                      placeholder="e.g. Netflix Inc"
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
                          <span>Which {selectedService.name} plan are you on?</span>
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#86868b] uppercase tracking-wider">Select Tier</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedService.plans.map((p) => {
                        const isSelected = planName.toLowerCase() === p.name.toLowerCase();
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
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-white flex items-center gap-1.5">
                                {p.name}
                                {isSelected && <Check className="w-3 h-3 text-[#2997ff]" />}
                              </span>
                              <span className="font-mono font-semibold text-white tabular-nums">
                                {currencySymbol}{p.amount}/{p.cycle === 'YEARLY' ? 'yr' : 'mo'}
                              </span>
                            </div>
                            {p.features && (
                              <p className="text-[10px] text-[#86868b] line-clamp-2 leading-relaxed">{p.features}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-medium text-[#86868b] block mb-1.5 tracking-tight">
                      Billing Rate ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-black/30 border border-white/[0.12] hover:border-white/[0.22] focus:border-[#0071e3] rounded-2xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-[#5e626b] focus:outline-none transition-all tabular-nums"
                    />
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
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                        <option value="QUARTERLY">Quarterly</option>
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
                      placeholder="e.g. Pro, Family, Seat"
                      className="w-full bg-black/30 border border-white/[0.12] hover:border-white/[0.22] focus:border-[#0071e3] rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-[#5e626b] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {name.trim().length >= 2 && (
                  <Channel3Suggestions
                    serviceName={name}
                    category={category}
                    currentMonthlyCost={parseFloat(amount) || 15}
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
