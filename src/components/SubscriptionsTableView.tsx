'use client';

import React, { useState, useMemo } from 'react';
import { Subscription } from '@/types';
import { Search, Pause, X, Play, Loader2, FileSpreadsheet, ExternalLink, RefreshCw, CreditCard } from 'lucide-react';
import { PowerAuditModal } from '@/components/PowerAuditModal';
import { toast } from 'sonner';

export type SubscriptionFilterType = 'ALL' | 'ACTIVE' | 'PAYPAL_LIVE' | 'UPCOMING' | 'LOW_USAGE' | 'PRICE_CREEP';

interface SubscriptionsTableViewProps {
  subscriptions: Subscription[];
  currencySymbol?: string;
  initialFilter?: SubscriptionFilterType;
  onExecuteAction: (action: 'CANCEL' | 'SUSPEND' | 'ACTIVATE', id: string, agreementId: string) => Promise<void>;
  onSyncStatus?: (subscriptionId: string, agreementId: string) => Promise<void>;
}

export function SubscriptionsTableView({
  subscriptions,
  currencySymbol = '$',
  initialFilter = 'ALL',
  onExecuteAction,
  onSyncStatus,
}: SubscriptionsTableViewProps) {
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<SubscriptionFilterType>(initialFilter);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredSubscriptions = useMemo(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return subscriptions.filter((sub) => {
      if (selectedFilter === 'ACTIVE' && sub.status !== 'ACTIVE') return false;
      if (selectedFilter === 'PAYPAL_LIVE' && sub.dataSource !== 'PAYPAL_SANDBOX') return false;
      if (selectedFilter === 'LOW_USAGE' && sub.usageScore >= 40) return false;
      if (selectedFilter === 'PRICE_CREEP' && (!sub.priceCreepRisk || sub.priceCreepRisk.percentIncrease <= 0)) return false;
      if (selectedFilter === 'UPCOMING') {
        if (!sub.nextBillingDate) return false;
        const d = new Date(sub.nextBillingDate);
        if (d < now || d > sevenDaysFromNow) return false;
      }

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        sub.name.toLowerCase().includes(query) ||
        sub.vendor.toLowerCase().includes(query) ||
        sub.category.toLowerCase().includes(query) ||
        sub.planName.toLowerCase().includes(query) ||
        sub.paypalAgreementId.toLowerCase().includes(query)
      );
    });
  }, [subscriptions, selectedFilter, searchQuery]);

  const handleAction = async (action: 'CANCEL' | 'SUSPEND' | 'ACTIVATE', sub: Subscription) => {
    try {
      setLoadingId(sub.id);
      await onExecuteAction(action, sub.id, sub.paypalAgreementId);
      toast.success(
        action === 'CANCEL' 
          ? `${sub.name} cancelled via PayPal` 
          : action === 'SUSPEND'
          ? `${sub.name} paused via PayPal`
          : `${sub.name} reactivated via PayPal`
      );
    } catch {
      toast.error(`Failed to ${action.toLowerCase()} ${sub.name}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleSync = async (sub: Subscription) => {
    if (onSyncStatus) {
      setLoadingId(sub.id);
      try {
        await onSyncStatus(sub.id, sub.paypalAgreementId);
        toast.success(`Synchronized status for ${sub.name}`);
      } catch {
        toast.error(`Failed to sync status for ${sub.name}`);
      } finally {
        setLoadingId(null);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Subscriptions
          </h1>
          <p className="text-xs text-[#86868b] mt-0.5">
            {subscriptions.length} recurring commitments tracked • Live PayPal Sandbox & Local Vault
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAuditModal(true)}
            className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white text-xs font-medium transition-all active:scale-[0.96] flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#0071e3]" />
            <span>Power Audit (AG Grid)</span>
          </button>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter subscriptions..."
              className="bg-[#1c1c1e]/60 border border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#86868b] focus:outline-none focus:border-white/[0.2] transition-colors w-52 sm:w-64"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: 'ALL', label: 'All' },
            { id: 'PAYPAL_LIVE', label: 'PayPal Sandbox Live' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'UPCOMING', label: 'Renewing Soon' },
            { id: 'LOW_USAGE', label: 'Low Usage (<40%)' },
            { id: 'PRICE_CREEP', label: 'Price Hikes' },
          ] as const
        ).map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setSelectedFilter(filter.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 active:scale-[0.96] select-none ${
              selectedFilter === filter.id
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'bg-white/[0.06] text-[#86868b] hover:text-white hover:bg-white/[0.1]'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-[#1c1c1e]/60 border border-white/[0.08] overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-[#86868b] font-medium bg-white/[0.02]">
                <th className="py-3 px-5">Service</th>
                <th className="py-3 px-4">Rate</th>
                <th className="py-3 px-4">Agreement / Source</th>
                <th className="py-3 px-4">Next Renewal</th>
                <th className="py-3 px-4">Usage</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredSubscriptions.map((sub) => {
                const isLoading = loadingId === sub.id;
                const isCancelled = sub.status === 'CANCELLED';
                const isPending = sub.status === 'APPROVAL_PENDING';

                return (
                  <tr
                    key={sub.id}
                    className="hover:bg-white/[0.02] transition-colors group select-none"
                  >
                    <td className="py-4 px-5">
                      <div className="font-medium text-white text-[13px] flex items-center gap-2">
                        <span>{sub.name}</span>
                        {sub.dataSource === 'PAYPAL_SANDBOX' && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0071e3]/10 text-[#2997ff] border border-[#0071e3]/20 flex items-center gap-1">
                            <CreditCard className="w-2.5 h-2.5" />
                            PayPal Sandbox
                          </span>
                        )}
                        {sub.dataSource === 'DEMO_SEED' && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-[#86868b] border border-white/[0.08]">
                            Demo Seed
                          </span>
                        )}
                        {sub.priceCreepRisk && sub.priceCreepRisk.percentIncrease > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                            +{sub.priceCreepRisk.percentIncrease}%
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#86868b] mt-0.5">
                        {sub.vendor} • {sub.planName}
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono font-medium text-white tabular-nums">
                      {currencySymbol}{sub.amount.toFixed(2)}
                      <span className="text-[10px] text-[#86868b] ml-1 font-sans">/{sub.billingCycle.toLowerCase()}</span>
                    </td>

                    <td className="py-4 px-4 font-mono text-[11px] text-[#86868b]">
                      <div className="flex items-center gap-1.5">
                        <span>{sub.paypalAgreementId}</span>
                        {onSyncStatus && sub.dataSource === 'PAYPAL_SANDBOX' && (
                          <button
                            type="button"
                            onClick={() => handleSync(sub)}
                            disabled={isLoading}
                            title="Sync status from PayPal Sandbox"
                            className="p-1 rounded hover:bg-white/[0.08] text-[#86868b] hover:text-white transition-colors"
                          >
                            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-[#86868b] tabular-nums">
                      {formatDate(sub.nextBillingDate)}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              sub.usageScore >= 70
                                ? 'bg-[#30d158]'
                                : sub.usageScore >= 40
                                ? 'bg-[#0071e3]'
                                : 'bg-[#ff9f0a]'
                            }`}
                            style={{ width: `${sub.usageScore}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-[#86868b] tabular-nums">
                          {sub.usageScore}%
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          sub.status === 'ACTIVE'
                            ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20'
                            : sub.status === 'SUSPENDED'
                            ? 'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20'
                            : sub.status === 'APPROVAL_PENDING'
                            ? 'bg-[#2997ff]/10 text-[#2997ff] border-[#2997ff]/20'
                            : 'bg-white/[0.05] text-[#86868b] border-white/[0.08]'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right">
                      {isCancelled ? (
                        <span className="text-[11px] text-[#86868b]">Cancelled</span>
                      ) : isPending && sub.approveUrl ? (
                        <a
                          href={sub.approveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white text-[11px] font-semibold transition-all active:scale-[0.96]"
                        >
                          <span>Approve</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {sub.status === 'ACTIVE' && (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleAction('SUSPEND', sub)}
                              className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white text-[11px] font-medium transition-all active:scale-[0.96] flex items-center gap-1 disabled:opacity-50"
                            >
                              {isLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Pause className="w-3 h-3" />
                              )}
                              <span>Pause</span>
                            </button>
                          )}

                          {sub.status === 'SUSPENDED' && (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleAction('ACTIVATE', sub)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-medium transition-all active:scale-[0.96] flex items-center gap-1 disabled:opacity-50"
                            >
                              {isLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              <span>Resume</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleAction('CANCEL', sub)}
                            className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-medium transition-all active:scale-[0.96] flex items-center gap-1 disabled:opacity-50"
                          >
                            {isLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            <span>Cancel</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PowerAuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        subscriptions={subscriptions}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}
