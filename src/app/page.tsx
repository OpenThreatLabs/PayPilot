'use client';

import React, { useState, useEffect } from 'react';
import { TopNav, CurrencyOption, POPULAR_CURRENCIES } from '@/components/TopNav';
import { LeftSidebar, NavTab } from '@/components/LeftSidebar';
import { VigilDisclaimerModal } from '@/components/VigilDisclaimerModal';
import { SpendHeader } from '@/components/SpendHeader';
import { SpendMetricCards } from '@/components/SpendMetricCards';
import { SubscriptionsTableView, SubscriptionFilterType } from '@/components/SubscriptionsTableView';
import { AddSubscriptionModal } from '@/components/AddSubscriptionModal';
import { ProfileModal } from '@/components/ProfileModal';
import { UserProfile, getStoredUserProfile, clearStoredUserProfile, getUserVaultStorageKey } from '@/lib/userProfile';
import { VigilChatView } from '@/components/VigilChatView';
import { Channel3Deals } from '@/components/Channel3Deals';
import { INITIAL_SUBSCRIPTIONS } from '@/lib/initialData';
import { Subscription } from '@/types';
import { ExchangeRateData, DEFAULT_EXCHANGE_DATA, fetchExchangeRates } from '@/lib/currency';
import { toast } from 'sonner';

const STORAGE_KEY = 'paypilot_user_subscriptions_vault_v1';
const CURRENCY_STORAGE_KEY = 'paypilot_preferred_currency_vault_v1';

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('DASHBOARD');
  const [currency, setCurrency] = useState<CurrencyOption>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.code) {
            return parsed;
          }
        }
      } catch {
        // Fallback
      }
    }
    return POPULAR_CURRENCIES[0];
  });

  const handleSelectCurrency = (newCurrency: CurrencyOption) => {
    setCurrency(newCurrency);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(newCurrency));
      } catch {
        // Fallback
      }
    }
  };
  const [ratesData, setRatesData] = useState<ExchangeRateData>(DEFAULT_EXCHANGE_DATA);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showVigilDisclaimer, setShowVigilDisclaimer] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'PROFILE' | 'PAYPAL' | 'DATA'>('PROFILE');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionFilterType>('ALL');

  // Initialize state from localStorage lazily, applying any URL approval updates on mount
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    let initial = INITIAL_SUBSCRIPTIONS;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const seen = new Set<string>();
            const deduped: Subscription[] = [];
            for (const item of parsed) {
              const dedupeKey = item.id || item.paypalAgreementId;
              if (dedupeKey && !seen.has(dedupeKey)) {
                seen.add(dedupeKey);
                deduped.push(item);
              }
            }
            initial = deduped.length > 0 ? deduped : parsed;
          }
        }

        const urlParams = new URLSearchParams(window.location.search);
        const paypalAction = urlParams.get('paypal_action');
        const sandboxSubApproval = urlParams.get('paypal_sandbox_approval');

        if (paypalAction === 'approved' || sandboxSubApproval) {
          initial = initial.map((s) => {
            if (s.status === 'APPROVAL_PENDING' || s.paypalAgreementId === sandboxSubApproval) {
              return {
                ...s,
                status: 'ACTIVE' as const,
                lastSyncedAt: new Date().toISOString(),
              };
            }
            return s;
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        }
      } catch {
        // Fallback
      }
    }
    return initial;
  });

  // Handle URL side effects (notifications & URL cleanup) without setting state in effect
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const paypalAction = urlParams.get('paypal_action');
    const sandboxSubApproval = urlParams.get('paypal_sandbox_approval');

    if (paypalAction === 'approved' || sandboxSubApproval) {
      toast.success('PayPal Sandbox subscription checkout completed and approved!');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paypalAction === 'cancelled') {
      toast.info('PayPal subscription checkout was cancelled by user');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    let mounted = true;
    const stored = getStoredUserProfile();
    if (stored) setUserProfile(stored);

    fetchExchangeRates().then((data) => {
      if (mounted) setRatesData(data);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const updateAndPersistSubscriptions = (updater: Subscription[] | ((prev: Subscription[]) => Subscription[])) => {
    setSubscriptions((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      try {
        const key = getUserVaultStorageKey(userProfile);
        localStorage.setItem(key, JSON.stringify(next));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage limit or private browsing fallback
      }
      return next;
    });
  };

  const handleProfileUpdate = (newProfile: UserProfile | null) => {
    setUserProfile(newProfile);
    if (typeof window !== 'undefined') {
      try {
        const userKey = getUserVaultStorageKey(newProfile);
        const stored = localStorage.getItem(userKey) || localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSubscriptions(parsed);
            return;
          }
        }
      } catch {
        // Fallback
      }
    }
  };

  const handleImportVaultData = (importedSubs: Subscription[], importedProfile: UserProfile | null, importedCurrency?: string) => {
    updateAndPersistSubscriptions(importedSubs);
    if (importedProfile) {
      setUserProfile(importedProfile);
    }
    if (importedCurrency) {
      const match = POPULAR_CURRENCIES.find((c) => c.code.toUpperCase() === importedCurrency.toUpperCase());
      if (match) {
        handleSelectCurrency(match);
      }
    }
  };

  const handleAddSubscription = (newSub: Subscription) => {
    updateAndPersistSubscriptions((prev) => {
      const existsIndex = prev.findIndex((s) => s.id === newSub.id || (s.paypalAgreementId && s.paypalAgreementId === newSub.paypalAgreementId));
      if (existsIndex >= 0) {
        const updated = [...prev];
        updated[existsIndex] = { ...updated[existsIndex], ...newSub };
        return updated;
      }
      return [newSub, ...prev];
    });

    // Dispatch Zapier lifecycle event (non-blocking)
    fetch('/api/zapier/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'SUBSCRIPTION_CREATED',
        subscription: {
          id: newSub.id,
          name: newSub.name,
          amount: newSub.amount,
          paypalAgreementId: newSub.paypalAgreementId,
          dataSource: newSub.dataSource,
        },
      }),
    }).catch(() => {});
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
    action: 'CANCEL' | 'SUSPEND' | 'ACTIVATE',
    subscriptionId: string,
    agreementId: string
  ) => {
    const res = await fetch('/api/paypal/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        subscriptionId: agreementId,
        reason: `Direct action from PayPilot UI: ${action}`,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'PayPal action failed');
    }

    const nextStatus = action === 'CANCEL' ? 'CANCELLED' : action === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE';

    updateAndPersistSubscriptions((prev) =>
      prev.map((s) => {
        if (s.id === subscriptionId || s.paypalAgreementId === agreementId) {
          return {
            ...s,
            status: nextStatus,
            lastSyncedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );

    // Dispatch Zapier lifecycle event (non-blocking)
    fetch('/api/zapier/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: action === 'CANCEL' ? 'SUBSCRIPTION_CANCELLED' : action === 'SUSPEND' ? 'SUBSCRIPTION_SUSPENDED' : 'SUBSCRIPTION_ACTIVATED',
        subscription: {
          id: subscriptionId,
          paypalAgreementId: agreementId,
          action,
        },
      }),
    }).catch(() => {});
  };

  const handleDeleteSubscription = (id: string, agreementId: string) => {
    updateAndPersistSubscriptions((prev) =>
      prev.filter((s) => s.id !== id && s.paypalAgreementId !== agreementId)
    );
  };

  const handleSyncStatus = async (subscriptionId: string, agreementId: string) => {
    const res = await fetch(`/api/paypal/subscription?subscriptionId=${encodeURIComponent(agreementId)}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch PayPal status');
    }

    const details = await res.json();
    const liveStatus = details.status;

    if (liveStatus) {
      updateAndPersistSubscriptions((prev) =>
        prev.map((s) => {
          if (s.id === subscriptionId || s.paypalAgreementId === agreementId) {
            return {
              ...s,
              status: liveStatus,
              lastSyncedAt: new Date().toISOString(),
            };
          }
          return s;
        })
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] flex flex-col font-sans selection:bg-[#0071e3]/30">
      <TopNav 
        currency={currency}
        onSelectCurrency={handleSelectCurrency}
        ratesData={ratesData}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        profile={userProfile}
        subscriptions={subscriptions}
        onOpenProfile={(tab = 'PROFILE') => {
          setProfileModalTab(tab);
          setShowProfileModal(true);
        }}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onSignOut={() => {
          clearStoredUserProfile();
          setUserProfile(null);
          toast.success('Signed out of session');
        }}
      />

      <div className="flex-1 flex">
        <LeftSidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          onOpenAddModal={() => setShowAddModal(true)}
          collapsed={sidebarCollapsed}
          profile={userProfile}
          onOpenProfile={() => setShowProfileModal(true)}
        />

        <main className="flex-1 p-6 sm:p-10 transition-all flex flex-col items-center">
          <div className="w-full max-w-6xl">
            {activeTab === 'DASHBOARD' && (
              <div>
                <SpendHeader
                  subscriptions={subscriptions}
                  currencySymbol={currency.symbol}
                  currencyCode={currency.code}
                  rates={ratesData.rates}
                  profile={userProfile}
                />
                <SpendMetricCards
                  subscriptions={subscriptions}
                  currencySymbol={currency.symbol}
                  currencyCode={currency.code}
                  rates={ratesData.rates}
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
                currencyCode={currency.code}
                rates={ratesData.rates}
                initialFilter={subscriptionFilter}
                onExecuteAction={handleExecutePayPalAction}
                onDeleteSubscription={handleDeleteSubscription}
                onSyncStatus={handleSyncStatus}
                onUpdateSubscriptions={updateAndPersistSubscriptions}
              />
            )}

            {activeTab === 'VIGIL' && (
              <div className="w-full flex justify-center">
                <VigilChatView
                  subscriptions={subscriptions}
                  currencySymbol={currency.symbol}
                  currencyCode={currency.code}
                  rates={ratesData.rates}
                  profile={userProfile}
                  onExecuteAction={handleExecutePayPalAction}
                />
              </div>
            )}

            {activeTab === 'CHANNEL3' && (
              <div className="w-full">
                <Channel3Deals
                  currencySymbol={currency.symbol}
                  currencyCode={currency.code}
                  rates={ratesData.rates}
                />
              </div>
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
        currencyCode={currency.code}
        currencySymbol={currency.symbol}
        rates={ratesData.rates}
        profile={userProfile}
      />

      <ProfileModal
        key={profileModalTab}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={userProfile}
        subscriptions={subscriptions}
        currencyCode={currency.code}
        initialTab={profileModalTab}
        onUpdateProfile={handleProfileUpdate}
        onImportData={handleImportVaultData}
      />
    </div>
  );
}
