'use client';

import React, { useState, useEffect } from 'react';
import { TopNav, CurrencyOption, POPULAR_CURRENCIES } from '@/components/TopNav';
import { LeftSidebar, NavTab } from '@/components/LeftSidebar';
import { VigilDisclaimerModal } from '@/components/VigilDisclaimerModal';
import { SpendHeader } from '@/components/SpendHeader';
import { SpendMetricCards } from '@/components/SpendMetricCards';
import { SubscriptionsTableView, SubscriptionFilterType } from '@/components/SubscriptionsTableView';
import { AddSubscriptionModal } from '@/components/AddSubscriptionModal';
import { INITIAL_SUBSCRIPTIONS } from '@/lib/initialData';
import { Subscription } from '@/types';

const STORAGE_KEY = 'paypilot_user_subscriptions_vault_v1';

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('DASHBOARD');
  const [currency, setCurrency] = useState<CurrencyOption>(POPULAR_CURRENCIES[0]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showVigilDisclaimer, setShowVigilDisclaimer] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(INITIAL_SUBSCRIPTIONS);
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionFilterType>('ALL');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSubscriptions(parsed);
        }
      }
    } catch {
      // Fallback to initial seed
    }
  }, []);

  const updateAndPersistSubscriptions = (updater: Subscription[] | ((prev: Subscription[]) => Subscription[])) => {
    setSubscriptions((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage limit or private browsing fallback
      }
      return next;
    });
  };

  const handleAddSubscription = (newSub: Subscription) => {
    updateAndPersistSubscriptions((prev) => [newSub, ...prev]);
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'VIGIL') {
      const acknowledged = localStorage.getItem('paypilot_vigil_disclaimer_ack');
      if (!acknowledged) {
        setShowVigilDisclaimer(true);
      }
    }
  };

  const handleAcknowledgeDisclaimer = () => {
    localStorage.setItem('paypilot_vigil_disclaimer_ack', 'true');
    setShowVigilDisclaimer(false);
  };

  const handleExecutePayPalAction = async (
    action: 'CANCEL' | 'SUSPEND',
    subscriptionId: string,
    agreementId: string
  ) => {
    const res = await fetch('/api/paypal/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        subscriptionId: agreementId,
        reason: `Direct action from Subscriptions view: ${action}`,
      }),
    });

    if (!res.ok) {
      throw new Error('PayPal action failed');
    }

    updateAndPersistSubscriptions((prev) =>
      prev.map((s) => {
        if (s.id === subscriptionId || s.paypalAgreementId === agreementId) {
          return {
            ...s,
            status: action === 'CANCEL' ? 'CANCELLED' : 'SUSPENDED',
          };
        }
        return s;
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] flex flex-col font-sans selection:bg-[#0071e3]/30">
      <TopNav 
        onSelectCurrency={setCurrency}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex">
        <LeftSidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          onOpenAddModal={() => setShowAddModal(true)}
          collapsed={sidebarCollapsed}
        />

        <main className="flex-1 p-6 sm:p-10 transition-all flex flex-col items-center">
          <div className="w-full max-w-6xl">
            {activeTab === 'DASHBOARD' && (
              <div>
                <SpendHeader
                  subscriptions={subscriptions}
                  currencySymbol={currency.symbol}
                />
                <SpendMetricCards
                  subscriptions={subscriptions}
                  currencySymbol={currency.symbol}
                  onFilterClick={(type) => {
                    setSubscriptionFilter(type);
                    setActiveTab('SUBSCRIPTIONS');
                  }}
                />
              </div>
            )}

            {activeTab === 'SUBSCRIPTIONS' && (
              <SubscriptionsTableView
                key={subscriptionFilter}
                subscriptions={subscriptions}
                currencySymbol={currency.symbol}
                initialFilter={subscriptionFilter}
                onExecuteAction={handleExecutePayPalAction}
              />
            )}
          </div>
        </main>
      </div>

      <VigilDisclaimerModal
        isOpen={showVigilDisclaimer}
        onAcknowledge={handleAcknowledgeDisclaimer}
        onCancel={() => {
          setShowVigilDisclaimer(false);
          setActiveTab('DASHBOARD');
        }}
      />

      <AddSubscriptionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddSubscription}
        currencySymbol={currency.symbol}
      />
    </div>
  );
}
