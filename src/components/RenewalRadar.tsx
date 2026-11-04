'use client';

import React from 'react';
import { Subscription } from '@/types';
import { getDaysRemaining } from '@/lib/sublyPresets';
import { Calendar, Bell, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface RenewalRadarProps {
  subscriptions: Subscription[];
}

export const RenewalRadar: React.FC<RenewalRadarProps> = ({ subscriptions }) => {
  const activeSubs = subscriptions
    .filter((s) => s.status === 'ACTIVE')
    .map((s) => ({
      ...s,
      daysLeft: getDaysRemaining(s.nextBillingDate),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  const handleSetReminder = (subName: string, daysLeft: number) => {
    toast.success(`Renewal reminder primed for ${subName}`, {
      description: `Notification will trigger 48h before billing (${daysLeft} days remaining).`,
    });
  };

  return (
    <div className="bg-[#111215] border border-[#23252a] rounded-lg p-5">
      <div className="flex items-center justify-between pb-3 border-b border-[#23252a] mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#38bdf8]" />
          <div>
            <h3 className="text-sm font-semibold text-white">Upcoming Renewals Radar</h3>
            <p className="text-xs text-[#8c9099]">Subly-inspired days-remaining countdown and trial alerts</p>
          </div>
        </div>
        <span className="text-xs font-mono text-[#8c9099]">Next 5 renewals</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {activeSubs.map((sub) => {
          const isImminent = sub.daysLeft <= 3;

          return (
            <div
              key={sub.id}
              className={`p-3 rounded border flex flex-col justify-between transition-colors ${
                isImminent
                  ? 'border-[#ef4444]/40 bg-[#171415]'
                  : 'border-[#23252a] bg-[#17181c] hover:border-[#32353d]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-[#5e626b] truncate max-w-[80px]">
                    {sub.vendor}
                  </span>
                  <button
                    onClick={() => handleSetReminder(sub.name, sub.daysLeft)}
                    title="Set Renewal Reminder"
                    className="text-[#5e626b] hover:text-[#38bdf8] p-0.5"
                  >
                    <Bell className="w-3 h-3" />
                  </button>
                </div>
                <h4 className="text-xs font-semibold text-white truncate">{sub.name}</h4>
                <div className="text-xs font-mono text-white font-medium mt-1">
                  ${sub.amount.toFixed(2)}
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-[#23252a] flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] font-mono">
                  <Clock className="w-3 h-3 text-[#5e626b]" />
                  <span className={isImminent ? 'text-[#ef4444] font-bold' : 'text-[#8c9099]'}>
                    {sub.daysLeft === 0 ? 'Today' : `${sub.daysLeft}d left`}
                  </span>
                </div>
                <span className="text-[10px] text-[#5e626b] font-mono">
                  {sub.nextBillingDate.slice(5, 10)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
