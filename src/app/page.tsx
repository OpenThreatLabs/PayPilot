'use client';

import React, { useState } from 'react';
import { TopNav, CurrencyOption, POPULAR_CURRENCIES } from '@/components/TopNav';
import { LeftSidebar, NavTab } from '@/components/LeftSidebar';
import { VigilDisclaimerModal } from '@/components/VigilDisclaimerModal';
import { INITIAL_SUBSCRIPTIONS } from '@/lib/initialData';
import { Subscription } from '@/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('DASHBOARD');
  const [currency, setCurrency] = useState<CurrencyOption>(POPULAR_CURRENCIES[0]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showVigilDisclaimer, setShowVigilDisclaimer] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(INITIAL_SUBSCRIPTIONS);

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
          collapsed={sidebarCollapsed}
        />

        <main className="flex-1 p-8 transition-all flex flex-col items-center justify-center">
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
    </div>
  );
}
