'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Bell, 
  Check, 
  Trash2, 
  TrendingUp, 
  Clock, 
  ShieldAlert, 
  Sparkles, 
  CreditCard,
  ArrowRight,
  X,
  ExternalLink
} from 'lucide-react';
import { Subscription } from '@/types';
import { 
  PayPilotNotification, 
  generateLiveNotifications, 
  getStoredReadNotificationIds, 
  saveStoredReadNotificationIds 
} from '@/lib/notifications';
import { toast } from 'sonner';

interface NotificationCenterProps {
  subscriptions: Subscription[];
  currencySymbol?: string;
  onNavigateTab?: (tab: 'DASHBOARD' | 'SUBSCRIPTIONS' | 'VIGIL') => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  subscriptions,
  currencySymbol = '$',
  onNavigateTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => getStoredReadNotificationIds());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'URGENT'>('ALL');

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const liveAlerts = useMemo(() => {
    const generated = generateLiveNotifications(subscriptions, currencySymbol);
    return generated
      .filter((n) => !dismissedIds.has(n.id))
      .map((n) => ({
        ...n,
        read: readIds.has(n.id),
      }));
  }, [subscriptions, currencySymbol, dismissedIds, readIds]);

  const unreadCount = useMemo(() => {
    return liveAlerts.filter((n) => !n.read).length;
  }, [liveAlerts]);

  const filteredAlerts = useMemo(() => {
    if (filter === 'UNREAD') {
      return liveAlerts.filter((n) => !n.read);
    }
    if (filter === 'URGENT') {
      return liveAlerts.filter((n) => n.severity === 'critical' || n.severity === 'warning');
    }
    return liveAlerts;
  }, [liveAlerts, filter]);

  const handleMarkAsRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveStoredReadNotificationIds(next);
  };

  const handleMarkAllAsRead = () => {
    const next = new Set(readIds);
    liveAlerts.forEach((n) => next.add(n.id));
    setReadIds(next);
    saveStoredReadNotificationIds(next);
    toast.success('All notifications marked as read');
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(dismissedIds);
    next.add(id);
    setDismissedIds(next);
  };

  const handleActionClick = (notification: PayPilotNotification) => {
    handleMarkAsRead(notification.id);
    setIsOpen(false);
    if (notification.actionTab && onNavigateTab) {
      onNavigateTab(notification.actionTab);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full flex items-center justify-center text-[#86868b] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all active:scale-95 cursor-pointer shadow-xs relative"
        title="Live Alerts & Notifications"
      >
        <Bell className="w-4 h-4 stroke-[2]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-[#ff453a] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-black shadow-md shadow-[#ff453a]/30 animate-in zoom-in-75 duration-150">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2.5 w-[360px] sm:w-[400px] max-h-[540px] rounded-[24px] bg-[#1d1d1f]/95 backdrop-blur-3xl border border-white/[0.12] shadow-2xl overflow-hidden z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100 origin-top-right select-none"
          style={{
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          }}
        >
          <div className="p-4 pb-3 border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[14px] text-white tracking-tight">Notification Center</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30 font-medium">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] font-medium text-[#2997ff] hover:underline cursor-pointer active:scale-95 transition-transform"
                >
                  Mark read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-[#86868b] hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </div>
          </div>

          <div className="px-3 pt-2.5 pb-2 border-b border-white/[0.06] flex items-center gap-1.5 shrink-0">
            {(
              [
                { id: 'ALL', label: 'All Alerts' },
                { id: 'UNREAD', label: 'Unread' },
                { id: 'URGENT', label: 'Urgent' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`py-1 px-3 rounded-full text-[11px] font-medium transition-all active:scale-[0.97] cursor-pointer ${
                  filter === t.id
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-[#86868b] hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto p-2 space-y-1.5 flex-1 custom-scrollbar">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-[#86868b]">
                  <Check className="w-5 h-5 text-[#30d158]" />
                </div>
                <div className="text-xs font-semibold text-white">All caught up</div>
                <p className="text-[11px] text-[#86868b] leading-relaxed">
                  No alerts pending. Your recurring subscriptions, PayPal authorizations, and price checks are healthy.
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isCritical = alert.severity === 'critical';
                const isWarning = alert.severity === 'warning';

                return (
                  <div
                    key={alert.id}
                    onClick={() => handleMarkAsRead(alert.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer group relative flex flex-col justify-between ${
                      !alert.read
                        ? 'bg-white/[0.06] border-white/[0.12] hover:bg-white/[0.09]'
                        : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                          isCritical 
                            ? 'bg-red-500/15 border-red-500/30 text-red-400' 
                            : isWarning 
                            ? 'bg-[#ff9f0a]/15 border-[#ff9f0a]/30 text-[#ff9f0a]' 
                            : 'bg-[#2997ff]/15 border-[#2997ff]/30 text-[#2997ff]'
                        }`}>
                          {alert.type === 'PRICE_CREEP' && <TrendingUp className="w-4 h-4 stroke-[2.2]" />}
                          {alert.type === 'UPCOMING_RENEWAL' && <Clock className="w-4 h-4 stroke-[2.2]" />}
                          {alert.type === 'LOW_USAGE' && <ShieldAlert className="w-4 h-4 stroke-[2.2]" />}
                          {alert.type === 'APPROVAL_PENDING' && <CreditCard className="w-4 h-4 stroke-[2.2]" />}
                          {alert.type === 'SYSTEM' && <Sparkles className="w-4 h-4 stroke-[2.2]" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[12px] font-semibold truncate ${alert.read ? 'text-[#f5f5f7]' : 'text-white'}`}>
                              {alert.title}
                            </span>
                            {!alert.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2997ff] shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#86868b] mt-0.5 leading-relaxed">
                            {alert.message}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDismiss(alert.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/[0.1] text-[#86868b] hover:text-white transition-all cursor-pointer"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {alert.actionLabel && (
                      <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(alert);
                          }}
                          className="text-[11px] font-medium text-[#2997ff] hover:text-[#5ac8fa] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{alert.actionLabel}</span>
                          <ArrowRight className="w-3 h-3 stroke-[2.2]" />
                        </button>
                        <span className="text-[9px] font-mono text-[#86868b]">
                          {alert.type.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2.5 border-t border-white/[0.08] bg-black/40 text-center shrink-0">
            <span className="text-[10px] font-mono text-[#86868b]">
              Live monitoring powered by PayPilot Engine
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
