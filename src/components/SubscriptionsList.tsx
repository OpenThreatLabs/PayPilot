'use client';

import React from 'react';
import { Subscription } from '@/types';
import { CheckCircle2, PauseCircle, XCircle, Zap, ShieldAlert } from 'lucide-react';

interface SubscriptionsListProps {
  subscriptions: Subscription[];
  onActionClick: (sub: Subscription, actionType: 'CANCEL' | 'SUSPEND') => void;
  loadingId?: string | null;
}

export const SubscriptionsList: React.FC<SubscriptionsListProps> = ({
  subscriptions,
  onActionClick,
  loadingId,
}) => {
  return (
    <div className="bg-[#111420]/80 border border-[#1e2538] rounded-xl overflow-hidden backdrop-blur-sm">
      <div className="px-6 py-4 border-b border-[#1e2538] flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Managed Subscriptions & Billing Agreements</h3>
          <p className="text-xs text-slate-400">Synchronized with PayPal Sandbox Billing APIs</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded bg-[#1e2538] text-slate-300 font-mono">
          {subscriptions.length} Agreements
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0b0f19] text-slate-400 text-xs uppercase tracking-wider border-b border-[#1e2538]">
            <tr>
              <th className="py-3 px-6">Service & Plan</th>
              <th className="py-3 px-4">Billing Rate</th>
              <th className="py-3 px-4">Agreement ID</th>
              <th className="py-3 px-4">Usage Index</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Next Renewal</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2538]/60 text-slate-300">
            {subscriptions.map((sub) => {
              const isFlagged = sub.usageScore < 30;
              const isWorking = loadingId === sub.id;

              return (
                <tr key={sub.id} className="hover:bg-[#161b2c]/40 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-medium text-white flex items-center gap-2">
                      {sub.name}
                      {sub.priceCreepRisk && (
                        <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded">
                          +{sub.priceCreepRisk.percentIncrease}% hike
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{sub.vendor}</span>
                      <span>•</span>
                      <span className="text-slate-500">{sub.planName}</span>
                    </div>
                  </td>

                  <td className="py-4 px-4 font-mono font-medium text-white">
                    ${sub.amount.toFixed(2)}
                    <span className="text-slate-400 text-xs font-normal"> / {sub.billingCycle.toLowerCase()}</span>
                  </td>

                  <td className="py-4 px-4 font-mono text-xs text-slate-400">
                    {sub.paypalAgreementId}
                  </td>

                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-[#1e2538] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            sub.usageScore > 60 ? 'bg-emerald-400' : sub.usageScore > 30 ? 'bg-amber-400' : 'bg-rose-500'
                          }`}
                          style={{ width: `${sub.usageScore}%` }}
                        />
                      </div>
                      <span className={`text-xs font-mono font-medium ${isFlagged ? 'text-rose-400' : 'text-slate-300'}`}>
                        {sub.usageScore}%
                      </span>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    {sub.status === 'ACTIVE' && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    )}
                    {sub.status === 'SUSPENDED' && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        <PauseCircle className="w-3 h-3" /> Paused
                      </span>
                    )}
                    {sub.status === 'CANCELLED' && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" /> Cancelled
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-4 text-xs font-mono text-slate-300">
                    {sub.nextBillingDate.slice(0, 10)}
                  </td>

                  <td className="py-4 px-6 text-right">
                    {sub.status === 'ACTIVE' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={isWorking}
                          onClick={() => onActionClick(sub, 'SUSPEND')}
                          className="px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded transition-colors disabled:opacity-50"
                        >
                          {isWorking ? 'Processing...' : 'Pause via PayPal'}
                        </button>
                        <button
                          disabled={isWorking}
                          onClick={() => onActionClick(sub, 'CANCEL')}
                          className="px-2.5 py-1 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded transition-colors disabled:opacity-50"
                        >
                          {isWorking ? 'Processing...' : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">No action needed</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
