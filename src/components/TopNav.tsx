'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { ExchangeRateData } from '@/lib/currency';
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
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', countries: ['czech republic', 'czechia', 'cz'] },
  { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel', countries: ['israel', 'il'] },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', countries: ['chile', 'cl'] },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', countries: ['colombia', 'co'] },
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
  onSelectCurrency?: (currency: CurrencyOption) => void;
  ratesData?: ExchangeRateData;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onSearchClick,
  onSelectCurrency,
  ratesData,
  sidebarCollapsed,
  onToggleSidebar,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption>(POPULAR_CURRENCIES[0]);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const currencyRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setIsCurrencyOpen(false);
        setCurrencySearch('');
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCurrencySelect = (curr: CurrencyOption) => {
    setSelectedCurrency(curr);
    setIsCurrencyOpen(false);
    setCurrencySearch('');
    if (onSelectCurrency) {
      onSelectCurrency(curr);
    }
    toast.info(`Currency set to ${curr.code} (${curr.symbol})`);
  };

  const filteredCurrencies = useMemo(() => {
    if (!currencySearch.trim()) {
      return null;
    }
    const q = currencySearch.toLowerCase().trim();
    return ALL_CURRENCIES.filter((c) => {
      const codeMatch = c.code.toLowerCase().includes(q);
      const nameMatch = c.name.toLowerCase().includes(q);
      const countryMatch = c.countries.some((country) => country.includes(q) || q.includes(country));
      return codeMatch || nameMatch || countryMatch;
    });
  }, [currencySearch]);

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-transparent border-b border-transparent flex items-center justify-between px-8 select-none transition-colors">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-2 rounded-xl text-[#86868b] hover:text-[#f5f5f7] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
        >
          {sidebarCollapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        <div className="flex items-center gap-3 cursor-pointer ml-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#2997ff] to-[#0071e3] flex items-center justify-center text-white shadow-sm shadow-[#0071e3]/30">
            <span className="font-semibold text-sm tracking-tight">P</span>
          </div>

          <div
            className={`overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
              sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100'
            }`}
          >
            <span className="font-semibold text-base tracking-tight text-[#f5f5f7] whitespace-nowrap">
              PayPilot
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSearchClick}
          className="hidden md:flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs text-[#86868b] hover:text-[#f5f5f7] transition-all"
        >
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.08] text-[#86868b]">
            ⌘K
          </kbd>
        </button>

        <div className="relative" ref={currencyRef}>
          <button
            type="button"
            onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium text-[#f5f5f7] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all active:scale-95"
          >
            <span className="text-[#86868b] font-mono">{selectedCurrency.symbol}</span>
            <span>{selectedCurrency.code}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#86868b] transition-transform duration-150 ${isCurrencyOpen ? 'rotate-180' : ''}`} />
          </button>

          {isCurrencyOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#141519]/95 backdrop-blur-2xl border border-white/[0.12] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#86868b]" />
                <input
                  type="text"
                  autoFocus
                  value={currencySearch}
                  onChange={(e) => setCurrencySearch(e.target.value)}
                  placeholder="Search currency..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-xs text-[#f5f5f7] placeholder-[#86868b] focus:outline-none focus:border-[#2997ff]"
                />
              </div>

              {!filteredCurrencies ? (
                <div className="space-y-0.5">
                  {POPULAR_CURRENCIES.map((curr) => {
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
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[#f5f5f7] w-5 text-left">{curr.symbol}</span>
                          <span>{curr.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#2997ff]" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
                  {filteredCurrencies.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[#86868b]">
                      No results
                    </div>
                  ) : (
                    filteredCurrencies.map((curr) => {
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
                          <div className="flex items-center gap-2.5 truncate mr-2">
                            <span className="font-mono text-[#f5f5f7] w-5 text-left shrink-0">{curr.symbol}</span>
                            <span className="truncate">{curr.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#2997ff] shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              <div className="pt-2 mt-2 border-t border-white/[0.08] px-2 flex items-center justify-between text-[10px] text-[#86868b]">
                <span>Exchange Rates</span>
                <span>
                  {ratesData
                    ? ratesData.source === 'live'
                      ? `Live (${ratesData.date})`
                      : ratesData.source === 'cached'
                      ? `Cached (${ratesData.date})`
                      : `Offline Baseline (${ratesData.date})`
                    : 'Offline Baseline (2026-11-09)'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#86868b] hover:text-[#f5f5f7] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all relative active:scale-95"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#ff453a]"></span>
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#141519]/95 backdrop-blur-2xl border border-white/[0.12] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <span className="text-xs font-semibold text-[#f5f5f7]">Alerts</span>
                <span className="text-[10px] text-[#86868b] font-mono">1 Pending</span>
              </div>
              <div className="py-2">
                <div className="p-2.5 rounded-xl bg-white/[0.04] text-xs">
                  <div className="font-medium text-[#f5f5f7]">AWS CloudWatch Renewal</div>
                  <div className="text-[11px] text-[#86868b] mt-0.5">
                    $45.00 scheduled for billing on Nov 6 via PayPal.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#86868b] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all active:scale-95"
          >
            <User className="w-4 h-4" />
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
    </header>
  );
};
