'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  PanelLeftClose, 
  PanelLeft, 
  Plus, 
  LayoutDashboard, 
  CreditCard, 
  Sparkles, 
  Calendar, 
  Settings, 
  ChevronDown, 
  Check, 
  User, 
  LogOut, 
  ShieldCheck 
} from 'lucide-react';
import { toast } from 'sonner';

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
];

export type NavTab = 'DASHBOARD' | 'SUBSCRIPTIONS' | 'COPILOT' | 'RADAR';

interface AppSidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddModal?: () => void;
  onSelectCurrency?: (currency: CurrencyOption) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenAddModal,
  onSelectCurrency,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption>(CURRENCIES[0]);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const currencyRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setIsCurrencyOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCurrencySelect = (curr: CurrencyOption) => {
    setSelectedCurrency(curr);
    setIsCurrencyOpen(false);
    if (onSelectCurrency) {
      onSelectCurrency(curr);
    }
    toast.info(`Display currency changed to ${curr.code} (${curr.symbol})`);
  };

  const navItems = [
    { id: 'DASHBOARD' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'SUBSCRIPTIONS' as NavTab, label: 'Subscriptions', icon: CreditCard },
    { id: 'COPILOT' as NavTab, label: 'AI Copilot', icon: Sparkles },
    { id: 'RADAR' as NavTab, label: 'Renewal Radar', icon: Calendar },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-40 bg-[#0c0d10]/95 backdrop-blur-2xl border-r border-white/[0.06] flex flex-col justify-between transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/[0.06]">
          {!collapsed && (
            <div className="flex items-center gap-2.5 select-none">
              <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#2997ff] to-[#0071e3] flex items-center justify-center text-white shadow-sm shadow-[#0071e3]/30">
                <span className="font-semibold text-xs tracking-tight">P</span>
              </div>
              <span className="font-semibold text-[15px] tracking-tight text-[#f5f5f7]">
                PayPilot
              </span>
            </div>
          )}

          {collapsed && (
            <div className="w-full flex justify-center">
              <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#2997ff] to-[#0071e3] flex items-center justify-center text-white shadow-sm shadow-[#0071e3]/30 select-none">
                <span className="font-semibold text-xs tracking-tight">P</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[0.06] transition-colors select-none"
          >
            {collapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={onOpenAddModal}
            className={`w-full apple-primary-btn py-2 text-xs font-medium flex items-center justify-center gap-2 select-none ${
              collapsed ? 'px-0' : 'px-3'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            {!collapsed && <span>Track Service</span>}
          </button>
        </div>

        <nav className="px-2 space-y-1 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all select-none ${
                  isActive
                    ? 'bg-white/10 text-white shadow-xs'
                    : 'text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[0.04]'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#2997ff]' : 'text-[#86868b]'}`} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-white/[0.06] space-y-2">
        <div className="relative" ref={currencyRef}>
          <button
            type="button"
            onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
            className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[0.04] transition-all select-none ${
              collapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[#f5f5f7]">{selectedCurrency.symbol}</span>
              {!collapsed && <span>{selectedCurrency.code}</span>}
            </div>
            {!collapsed && (
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isCurrencyOpen ? 'rotate-180' : ''}`} />
            )}
          </button>

          {isCurrencyOpen && (
            <div className={`absolute bottom-full mb-2 w-56 rounded-2xl bg-[#141519]/95 backdrop-blur-2xl border border-white/[0.12] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ${
              collapsed ? 'left-full ml-2' : 'left-0'
            }`}>
              <div className="px-2.5 py-1.5 text-[10px] font-medium tracking-wider uppercase text-[#86868b]">
                Select Currency
              </div>
              <div className="max-h-56 overflow-y-auto space-y-0.5">
                {CURRENCIES.map((curr) => {
                  const isSelected = selectedCurrency.code === curr.code;
                  return (
                    <button
                      key={curr.code}
                      type="button"
                      onClick={() => handleCurrencySelect(curr)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                        isSelected 
                          ? 'bg-white/10 text-white font-medium' 
                          : 'text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#f5f5f7] w-6 text-left">{curr.symbol}</span>
                        <span>{curr.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#2997ff]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs text-[#f5f5f7] hover:bg-white/[0.04] transition-all select-none ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-[#86868b] hover:text-white transition-colors shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            {!collapsed && (
              <div className="flex-1 text-left truncate">
                <div className="font-medium text-xs truncate">Alex Mercer</div>
                <div className="text-[10px] text-[#86868b] truncate">alex.mercer@sandbox</div>
              </div>
            )}
          </button>

          {isProfileOpen && (
            <div className={`absolute bottom-full mb-2 w-64 rounded-2xl bg-[#141519]/95 backdrop-blur-2xl border border-white/[0.12] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 ${
              collapsed ? 'left-full ml-2' : 'left-0'
            }`}>
              <div className="px-3 py-2 border-b border-white/[0.08]">
                <div className="font-semibold text-xs text-[#f5f5f7]">Alex Mercer</div>
                <div className="text-[11px] text-[#86868b] font-mono mt-0.5">alex.mercer@sandbox.paypal</div>
              </div>

              <div className="py-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    toast.info('Viewing linked PayPal Wallet');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[0.06] transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#2997ff]" />
                  <span>PayPal Wallet</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    toast.info('Subscriptions Security active');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[0.06] transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#30d158]" />
                  <span>Security & Permissions</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    toast.info('Preferences opened');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[0.06] transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-[#86868b]" />
                  <span>Settings</span>
                </button>
              </div>

              <div className="pt-1 mt-1 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    toast.success('Signed out of session');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#ff453a] hover:bg-[#ff453a]/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
