'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  ChevronDown, 
  Check, 
  User, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  CreditCard 
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

interface NavbarProps {
  onOpenAddModal?: () => void;
  onSelectCurrency?: (currency: CurrencyOption) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddModal,
  onSelectCurrency,
}) => {
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

  return (
    <header className="sticky top-0 z-40 w-full bg-transparent border-b border-transparent transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5 group cursor-pointer select-none">
          <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#2997ff] to-[#0071e3] flex items-center justify-center text-white shadow-sm shadow-[#0071e3]/30 transition-transform duration-150 active:scale-95">
            <span className="font-semibold text-xs tracking-tight">P</span>
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-[#f5f5f7]">
            PayPilot
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative" ref={currencyRef}>
            <button
              type="button"
              onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#f5f5f7] bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.06] transition-all select-none active:scale-95"
            >
              <span className="text-[#86868b] font-mono">{selectedCurrency.symbol}</span>
              <span>{selectedCurrency.code}</span>
              <ChevronDown className={`w-3 h-3 text-[#86868b] transition-transform duration-150 ${isCurrencyOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCurrencyOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#141519]/95 backdrop-blur-2xl border border-white/[0.12] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                <div className="px-2.5 py-1.5 text-[10px] font-medium tracking-wider uppercase text-[#86868b]">
                  Select Currency
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5">
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

          <button
            type="button"
            onClick={onOpenAddModal}
            className="apple-primary-btn px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 select-none"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Track</span>
          </button>

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#f5f5f7] bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.06] transition-all select-none active:scale-95"
            >
              <User className="w-4 h-4 text-[#86868b] hover:text-white transition-colors" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#141519]/95 backdrop-blur-2xl border border-white/[0.12] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
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
      </div>
    </header>
  );
};
