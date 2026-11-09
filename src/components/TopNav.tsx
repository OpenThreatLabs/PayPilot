'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  Check, 
  User, 
  CreditCard, 
  ShieldCheck, 
  Settings, 
  LogOut,
  Database,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { ExchangeRateData } from '@/lib/currency';
import { UserProfile } from '@/lib/userProfile';
import { Subscription } from '@/types';
import { NotificationCenter } from '@/components/NotificationCenter';
import { toast } from 'sonner';

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  countries: string[];
}

export const POPULAR_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', countries: ['united states', 'usa', 'us', 'america'] },
  { code: 'EUR', symbol: '€', name: 'Euro', countries: ['germany', 'france', 'italy', 'spain', 'netherlands', 'belgium', 'europe', 'portugal', 'ireland', 'austria', 'finland', 'greece'] },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', countries: ['india', 'bharat', 'in'] },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', countries: ['russia', 'russian federation', 'ru'] },
];

export const ALL_CURRENCIES: CurrencyOption[] = [
  ...POPULAR_CURRENCIES,
  { code: 'GBP', symbol: '£', name: 'British Pound', countries: ['united kingdom', 'uk', 'england', 'britain', 'scotland', 'wales'] },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', countries: ['japan', 'jp'] },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', countries: ['canada', 'ca'] },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', countries: ['australia', 'au'] },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', countries: ['switzerland', 'swiss', 'ch'] },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', countries: ['china', 'cn'] },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', countries: ['hong kong', 'hk'] },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', countries: ['singapore', 'sg'] },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', countries: ['sweden', 'se'] },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', countries: ['south korea', 'korea', 'kr'] },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', countries: ['norway', 'no'] },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', countries: ['new zealand', 'nz'] },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', countries: ['mexico', 'mx'] },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', countries: ['brazil', 'br'] },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', countries: ['south africa', 'za'] },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', countries: ['turkey', 'tr'] },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', countries: ['united arab emirates', 'uae', 'dubai', 'abu dhabi'] },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', countries: ['saudi arabia', 'saudi', 'sa'] },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', countries: ['poland', 'pl'] },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', countries: ['thailand', 'th'] },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', countries: ['indonesia', 'id'] },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', countries: ['malaysia', 'my'] },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', countries: ['philippines', 'ph'] },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', countries: ['egypt', 'eg'] },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', countries: ['vietnam', 'vn'] },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', countries: ['denmark', 'dk'] },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', countries: ['hungary', 'hu'] },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', countries: ['pakistan', 'pk'] },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', countries: ['bangladesh', 'bd'] },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', countries: ['argentina', 'ar'] },
  { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal', countries: ['qatar', 'qa'] },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', countries: ['kuwait', 'kw'] },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar', countries: ['bahrain', 'bh'] },
  { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', countries: ['oman', 'om'] },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', countries: ['nigeria', 'ng'] },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', countries: ['kenya', 'ke'] },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', countries: ['ukraine', 'ua'] },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', countries: ['romania', 'ro'] },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', countries: ['bulgaria', 'bg'] },
  { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna', countries: ['croatia', 'hr'] },
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', countries: ['taiwan', 'tw'] },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', countries: ['peru', 'pe'] },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', countries: ['ghana', 'gh'] },
  { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham', countries: ['morocco', 'ma'] },
  { code: 'DZD', symbol: 'DA', name: 'Algerian Dinar', countries: ['algeria', 'dz'] },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', countries: ['sri lanka', 'lk'] },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee', countries: ['nepal', 'np'] },
  { code: 'CRC', symbol: '₡', name: 'Costa Rican Colón', countries: ['costa rica', 'cr'] },
  { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso', countries: ['uruguay', 'uy'] },
  { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso', countries: ['dominican republic', 'do'] },
  { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar', countries: ['jamaica', 'jm'] },
  { code: 'ISK', symbol: 'kr', name: 'Icelandic Króna', countries: ['iceland', 'is'] },
  { code: 'RSD', symbol: 'din', name: 'Serbian Dinar', countries: ['serbia', 'rs'] },
  { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar', countries: ['jordan', 'jo'] },
  { code: 'TND', symbol: 'DT', name: 'Tunisian Dinar', countries: ['tunisia', 'tn'] },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', countries: ['uganda', 'ug'] },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', countries: ['tanzania', 'tz'] },
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge', countries: ['kazakhstan', 'kz'] },
  { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat', countries: ['azerbaijan', 'az'] },
  { code: 'GEL', symbol: '₾', name: 'Georgian Lari', countries: ['georgia', 'ge'] },
  { code: 'BYN', symbol: 'Br', name: 'Belarusian Ruble', countries: ['belarus', 'by'] },
  { code: 'AMD', symbol: '֏', name: 'Armenian Dram', countries: ['armenia', 'am'] },
  { code: 'UZS', symbol: 'soʻm', name: 'Uzbekistani Som', countries: ['uzbekistan', 'uz'] },
  { code: 'LBP', symbol: 'L£', name: 'Lebanese Pound', countries: ['lebanon', 'lb'] },
  { code: 'IQD', symbol: 'IQD', name: 'Iraqi Dinar', countries: ['iraq', 'iq'] },
  { code: 'BOB', symbol: 'Bs', name: 'Bolivian Boliviano', countries: ['bolivia', 'bo'] },
  { code: 'PYG', symbol: '₲', name: 'Paraguayan Guaraní', countries: ['paraguay', 'py'] },
  { code: 'PAB', symbol: 'B/.', name: 'Panamanian Balboa', countries: ['panama', 'pa'] },
  { code: 'BND', symbol: 'B$', name: 'Brunei Dollar', countries: ['brunei', 'bn'] },
  { code: 'MOP', symbol: 'MOP$', name: 'Macanese Pataca', countries: ['macau', 'mo'] },
  { code: 'BAM', symbol: 'KM', name: 'Bosnia-Herzegovina Mark', countries: ['bosnia', 'herzegovina', 'ba'] },
  { code: 'ALL', symbol: 'Lek', name: 'Albanian Lek', countries: ['albania', 'al'] },
  { code: 'MKD', symbol: 'ден', name: 'Macedonian Denar', countries: ['macedonia', 'north macedonia', 'mk'] },
  { code: 'MDL', symbol: 'L', name: 'Moldovan Leu', countries: ['moldova', 'md'] },
  { code: 'MNT', symbol: '₮', name: 'Mongolian Tögrög', countries: ['mongolia', 'mn'] },
  { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat', countries: ['myanmar', 'burma', 'mm'] },
  { code: 'KHR', symbol: '៛', name: 'Cambodian Riel', countries: ['cambodia', 'kh'] },
  { code: 'LAK', symbol: '₭', name: 'Lao Kip', countries: ['laos', 'la'] },
  { code: 'MVR', symbol: 'Rf', name: 'Maldivian Rufiyaa', countries: ['maldives', 'mv'] },
  { code: 'BBD', symbol: 'Bds$', name: 'Barbadian Dollar', countries: ['barbados', 'bb'] },
  { code: 'TTD', symbol: 'TT$', name: 'Trinidad and Tobago Dollar', countries: ['trinidad', 'tobago', 'tt'] },
  { code: 'XCD', symbol: 'EC$', name: 'East Caribbean Dollar', countries: ['caribbean', 'antigua', 'saint lucia', 'grenada'] },
  { code: 'FJD', symbol: 'FJ$', name: 'Fijian Dollar', countries: ['fiji', 'fj'] },
  { code: 'BWP', symbol: 'P', name: 'Botswana Pula', countries: ['botswana', 'bw'] },
  { code: 'MUR', symbol: '₨', name: 'Mauritian Rupee', countries: ['mauritius', 'mu'] },
  { code: 'NAD', symbol: 'N$', name: 'Namibian Dollar', countries: ['namibia', 'na'] },
  { code: 'SZL', symbol: 'E', name: 'Swazi Lilangeni', countries: ['eswatini', 'swaziland', 'sz'] },
  { code: 'LSL', symbol: 'L', name: 'Lesotho Loti', countries: ['lesotho', 'ls'] },
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', countries: ['rwanda', 'rw'] },
  { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical', countries: ['mozambique', 'mz'] },
  { code: 'AOA', symbol: 'Kz', name: 'Angolan Kwanza', countries: ['angola', 'ao'] },
  { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha', countries: ['zambia', 'zm'] },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', countries: ['ethiopia', 'et'] },
];

interface TopNavProps {
  onSearchClick?: () => void;
  currency?: CurrencyOption;
  onSelectCurrency?: (currency: CurrencyOption) => void;
  ratesData?: ExchangeRateData;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  profile?: UserProfile | null;
  subscriptions?: Subscription[];
  onOpenProfile?: (tab?: 'PROFILE' | 'PAYPAL' | 'DATA') => void;
  onNavigateTab?: (tab: 'DASHBOARD' | 'SUBSCRIPTIONS' | 'VIGIL') => void;
  onSignOut?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onSearchClick,
  currency,
  onSelectCurrency,
  ratesData,
  sidebarCollapsed,
  onToggleSidebar,
  profile,
  subscriptions = [],
  onOpenProfile,
  onNavigateTab,
  onSignOut,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption>(currency || POPULAR_CURRENCIES[0]);

  useEffect(() => {
    if (currency) {
      setSelectedCurrency(currency);
    }
  }, [currency]);

  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const currencyRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setIsCurrencyOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isCurrencyOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isCurrencyOpen]);

  const filteredCurrencies = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return ALL_CURRENCIES;

    return ALL_CURRENCIES.filter(curr => 
      curr.code.toLowerCase().includes(query) ||
      curr.name.toLowerCase().includes(query) ||
      curr.symbol.toLowerCase().includes(query) ||
      curr.countries.some(country => country.includes(query))
    );
  }, [searchQuery]);

  const handleSelect = (curr: CurrencyOption) => {
    setSelectedCurrency(curr);
    setIsCurrencyOpen(false);
    onSelectCurrency?.(curr);
    toast.success(`Currency changed to ${curr.code} (${curr.symbol})`);
  };

  return (
    <header className="h-16 border-b border-white/[0.04] bg-[#000000]/60 backdrop-blur-xl sticky top-0 z-40 px-6 flex items-center justify-between select-none">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="text-[#86868b] hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/[0.05]"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="w-5 h-5 stroke-[1.8]" />
          ) : (
            <PanelLeftClose className="w-5 h-5 stroke-[1.8]" />
          )}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0071e3] to-[#2997ff] flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
            <svg
              className="w-4 h-4 text-white fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.27 5.922-7.14 5.922h-1.892a.63.63 0 0 0-.623.535l-.893 5.65a.63.63 0 0 1-.623.532H4.895a.63.63 0 0 1-.623-.728l3.414-21.564a.63.63 0 0 1 .623-.532h5.795c3.21 0 5.485 1.547 5.963 4.858z" />
            </svg>
          </div>
          <span className="font-semibold text-base tracking-tight text-white flex items-center gap-1.5">
            PayPilot
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-white/[0.08] text-[#86868b]">
              v1.0
            </span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={currencyRef}>
          <button
            type="button"
            onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
            className="h-9 px-3 rounded-full flex items-center gap-2 text-xs font-medium text-[#f5f5f7] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <span className="font-semibold text-[#2997ff]">{selectedCurrency.symbol}</span>
            <span>{selectedCurrency.code}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#86868b] transition-transform duration-200 ${isCurrencyOpen ? 'rotate-180' : ''}`} />
          </button>

          {isCurrencyOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#1d1d1f]/95 backdrop-blur-3xl border border-white/[0.12] shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
              <div className="p-3 border-b border-white/[0.08]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#86868b] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search currency or country..."
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#86868b] focus:outline-none focus:border-[#2997ff]/50 transition-colors"
                  />
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                {filteredCurrencies.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#86868b]">
                    No currencies found matching &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  filteredCurrencies.map((curr) => {
                    const isSelected = selectedCurrency.code === curr.code;
                    return (
                      <button
                        key={curr.code}
                        type="button"
                        onClick={() => handleSelect(curr)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-[#0071e3] text-white font-medium' 
                            : 'text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`font-mono text-sm w-5 text-center ${isSelected ? 'text-white' : 'text-[#2997ff]'}`}>
                            {curr.symbol}
                          </span>
                          <div className="text-left">
                            <span className={isSelected ? 'text-white' : 'text-[#f5f5f7]'}>{curr.code}</span>
                            <span className={`ml-1.5 text-[11px] ${isSelected ? 'text-white/80' : 'text-[#86868b]'}`}>
                              {curr.name}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </button>
                    );
                  })
                )}
              </div>

              {ratesData && (
                <div className="p-2 border-t border-white/[0.08] bg-black/20 text-center">
                  <span className="text-[10px] text-[#86868b] font-mono">
                    Updated: {new Date(ratesData.lastFetchedAt || ratesData.date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <NotificationCenter
          subscriptions={subscriptions}
          currencySymbol={selectedCurrency.symbol}
          onNavigateTab={onNavigateTab}
        />

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#86868b] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all active:scale-95 cursor-pointer shadow-xs"
            title={profile ? profile.name : 'Account settings & vault'}
          >
            {profile ? (
              <span className="font-semibold text-xs text-white">
                {profile.name.trim().charAt(0).toUpperCase()}
              </span>
            ) : (
              <User className="w-4 h-4" />
            )}
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#1c1c1e]/95 backdrop-blur-2xl border border-white/[0.12] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
              {profile && (
                <div className="px-3 py-2 border-b border-white/[0.08] mb-1">
                  <p className="text-xs font-semibold text-white truncate">{profile.name}</p>
                  <p className="text-[11px] text-[#86868b] truncate">{profile.email}</p>
                </div>
              )}

              <div className="space-y-0.5">
                <Link
                  href="/profile?tab=profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#f5f5f7] hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer text-left active:scale-[0.98]"
                >
                  <User className="w-4 h-4 text-[#2997ff]" />
                  <span className="font-medium">Profile</span>
                </Link>

                <Link
                  href="/profile?tab=paypal"
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#f5f5f7] hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer text-left active:scale-[0.98]"
                >
                  <CreditCard className="w-4 h-4 text-[#0071e3]" />
                  <span className="font-medium">PayPal</span>
                </Link>

                <Link
                  href="/profile?tab=data"
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#f5f5f7] hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer text-left active:scale-[0.98]"
                >
                  <Database className="w-4 h-4 text-[#30d158]" />
                  <span className="font-medium">Data</span>
                </Link>
              </div>

              {profile && onSignOut && (
                <div className="mt-1 pt-1 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer text-left active:scale-[0.98]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
