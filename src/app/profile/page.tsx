'use client';

import React, { useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  User, 
  Mail, 
  ArrowLeft, 
  Check, 
  LogOut, 
  CreditCard, 
  Database, 
  Download, 
  Upload, 
  ShieldCheck, 
  Save,
  Zap,
  Lock
} from 'lucide-react';
import { 
  UserProfile, 
  getStoredUserProfile, 
  saveStoredUserProfile, 
  clearStoredUserProfile,
  getUserVaultStorageKey 
} from '@/lib/userProfile';
import { exportPayPilotVault, parsePayPilotVaultBackup } from '@/lib/vaultData';
import { Subscription } from '@/types';
import { INITIAL_SUBSCRIPTIONS } from '@/lib/initialData';
import { toast } from 'sonner';

const SUBS_STORAGE_KEY = 'paypilot_user_subscriptions_vault_v1';
const CURRENCY_STORAGE_KEY = 'paypilot_preferred_currency_vault_v1';

export type ProfileSettingsTab = 'ALL' | 'PROFILE' | 'PAYPAL' | 'DATA';

function ProfilePageContent() {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get('tab')?.toUpperCase();
  const validTab: ProfileSettingsTab = (initialTabParam === 'PROFILE' || initialTabParam === 'PAYPAL' || initialTabParam === 'DATA') 
    ? initialTabParam 
    : 'ALL';

  const [prevParam, setPrevParam] = useState(initialTabParam);
  const [activeTab, setActiveTab] = useState<ProfileSettingsTab>(validTab);

  if (prevParam !== initialTabParam) {
    setPrevParam(initialTabParam);
    if (validTab !== activeTab) {
      setActiveTab(validTab);
    }
  }

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      return getStoredUserProfile();
    }
    return null;
  });

  const [fullName, setFullName] = useState(() => {
    if (typeof window !== 'undefined') {
      return getStoredUserProfile()?.name || '';
    }
    return '';
  });

  const [email, setEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      return getStoredUserProfile()?.email || '';
    }
    return '';
  });

  const [paypalMode, setPaypalMode] = useState<'DEFAULT' | 'CUSTOM'>(() => {
    if (typeof window !== 'undefined') {
      const p = getStoredUserProfile();
      if (p?.paypalMerchantId && p.paypalMerchantId !== 'sandbox-payer-default') return 'CUSTOM';
    }
    return 'DEFAULT';
  });

  const [customPaypalId, setCustomPaypalId] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = getStoredUserProfile();
      if (p?.paypalMerchantId && p.paypalMerchantId !== 'sandbox-payer-default') return p.paypalMerchantId;
    }
    return '';
  });

  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const loadedProfile = getStoredUserProfile();
        const activeKey = getUserVaultStorageKey(loadedProfile);
        const rawSubs = localStorage.getItem(activeKey) || localStorage.getItem(SUBS_STORAGE_KEY);
        if (rawSubs) {
          return JSON.parse(rawSubs);
        }
      } catch {
        // Fallback
      }
    }
    return INITIAL_SUBSCRIPTIONS;
  });

  const [currencyCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const rawCurr = localStorage.getItem(CURRENCY_STORAGE_KEY);
        if (rawCurr) {
          const parsed = JSON.parse(rawCurr);
          if (parsed?.code) return parsed.code;
        }
      } catch {
        // Fallback
      }
    }
    return 'USD';
  });

  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error('Please enter your full name and email address');
      return;
    }

    const resolvedPaypalId = paypalMode === 'CUSTOM' && customPaypalId.trim()
      ? customPaypalId.trim()
      : 'sandbox-payer-default';

    const updated: UserProfile = {
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      paypalMerchantId: resolvedPaypalId,
      createdAt: profile?.createdAt || new Date().toISOString(),
      avatarSeed: fullName.trim(),
    };

    saveStoredUserProfile(updated);
    setProfile(updated);
    setIsEditing(false);
    toast.success(profile ? 'Profile updated successfully' : 'Account created on local vault!');
  };

  const handleTogglePaypalMode = (mode: 'DEFAULT' | 'CUSTOM') => {
    setPaypalMode(mode);
    if (profile) {
      const resolvedId = mode === 'CUSTOM' && customPaypalId.trim()
        ? customPaypalId.trim()
        : 'sandbox-payer-default';
      const updated: UserProfile = {
        ...profile,
        paypalMerchantId: resolvedId,
      };
      saveStoredUserProfile(updated);
      setProfile(updated);
      toast.success(
        mode === 'DEFAULT'
          ? 'Switched to PayPal Sandbox Default payer'
          : 'Switched to Custom PayPal mode'
      );
    }
  };

  const handleSaveCustomPaypal = () => {
    if (!customPaypalId.trim()) {
      toast.error('Please enter a PayPal Payer ID or email');
      return;
    }
    if (profile) {
      const updated: UserProfile = {
        ...profile,
        paypalMerchantId: customPaypalId.trim(),
      };
      saveStoredUserProfile(updated);
      setProfile(updated);
      toast.success('Custom PayPal account linked to profile');
    }
  };

  const handleSignOut = () => {
    clearStoredUserProfile();
    setProfile(null);
    setIsEditing(false);
    setFullName('');
    setEmail('');
    toast.success('Signed out of profile session');
  };

  const handleExportData = () => {
    try {
      exportPayPilotVault(profile, subscriptions, currencyCode);
      toast.success('PayPilot vault exported as JSON!');
    } catch {
      toast.error('Failed to export vault data');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const backup = parsePayPilotVaultBackup(text);

        if (backup.profile) {
          saveStoredUserProfile(backup.profile);
          setProfile(backup.profile);
          setFullName(backup.profile.name);
          setEmail(backup.profile.email);
        }

        const vaultKey = getUserVaultStorageKey(backup.profile);
        localStorage.setItem(vaultKey, JSON.stringify(backup.subscriptions));
        setSubscriptions(backup.subscriptions);

        toast.success(`Restored ${backup.subscriptions.length} subscriptions onto this device!`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to import vault backup');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const initial = (profile?.name || fullName || 'P').trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] flex flex-col font-sans selection:bg-[#0071e3]/30">
      <header className="h-16 border-b border-white/[0.04] bg-[#000000]/60 backdrop-blur-xl sticky top-0 z-40 px-6 flex items-center justify-between select-none">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-medium text-[#86868b] hover:text-white transition-colors p-2 rounded-xl hover:bg-white/[0.05]"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[#86868b] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
            Local Vault Active
          </span>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-10 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-8 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Manage Profile & Local Vault
              </h1>
              <p className="text-xs sm:text-sm text-[#86868b] mt-1">
                Configure your account identity, PayPal payment routing, and device portability
              </p>
            </div>

            {profile && (
              <button
                type="button"
                onClick={handleSignOut}
                className="self-start sm:self-auto py-2 px-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold text-red-400 transition-all active:scale-[0.97] flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(
              [
                { id: 'ALL' as ProfileSettingsTab, label: 'All Settings' },
                { id: 'PROFILE' as ProfileSettingsTab, label: 'Profile' },
                { id: 'PAYPAL' as ProfileSettingsTab, label: 'PayPal' },
                { id: 'DATA' as ProfileSettingsTab, label: 'Data & Vault' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 active:scale-[0.96] select-none cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#0071e3] text-white font-semibold shadow-xs shadow-[#0071e3]/30'
                    : 'text-[#86868b] hover:text-[#f5f5f7] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="p-6 rounded-3xl bg-[#1c1c1e]/70 border border-white/[0.08] backdrop-blur-2xl flex flex-col items-center text-center space-y-4">
                <div 
                  className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#0071e3] to-[#2997ff] flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-[#0071e3]/30"
                  style={{ borderRadius: '22px' }}
                >
                  {initial}
                </div>

                <div className="min-w-0 w-full">
                  <h3 className="font-semibold text-lg text-white tracking-tight truncate">
                    {profile ? profile.name : 'Guest User'}
                  </h3>
                  <div className="text-xs text-[#86868b] font-mono truncate mt-0.5">
                    {profile ? profile.email : 'Not signed in'}
                  </div>

                  <div className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/25">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Active Session</span>
                  </div>
                </div>

                <div className="w-full pt-4 border-t border-white/[0.06] text-left space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#86868b]">Tracked Subs:</span>
                    <span className="font-semibold text-white tabular-nums">{subscriptions.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#86868b]">Currency:</span>
                    <span className="font-mono text-white font-semibold">{currencyCode}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#86868b]">Storage:</span>
                    <span className="font-mono text-[#2997ff]">Local Browser</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#30d158]" />
                  <span>Zero-Cloud Privacy</span>
                </div>
                <p className="text-[11px] text-[#86868b] leading-relaxed">
                  PayPilot operates local-first. None of your subscription commitments, agreements, or identity records are ever transferred to unauthorized third-party clouds.
                </p>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {(activeTab === 'ALL' || activeTab === 'PROFILE') && (
              <div className="p-6 rounded-3xl bg-[#1c1c1e]/70 border border-white/[0.08] backdrop-blur-2xl space-y-6 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                  <div>
                    <h3 className="text-base font-semibold text-white">Identity & Account Details</h3>
                    <p className="text-xs text-[#86868b] mt-0.5">Manage your personal profile stored in this browser</p>
                  </div>
                  {profile && !isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-all cursor-pointer active:scale-95"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditing || !profile ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-[#86868b] block mb-1.5">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-[#86868b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. Alex Mercer"
                            className="w-full bg-black/40 border border-white/[0.12] hover:border-white/[0.22] focus:border-[#0071e3] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#5e626b] focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[#86868b] block mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-[#86868b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. alex.mercer@sandbox.paypal"
                            className="w-full bg-black/40 border border-white/[0.12] hover:border-white/[0.22] focus:border-[#0071e3] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#5e626b] focus:outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                      {profile && (
                        <button
                          type="button"
                          onClick={() => {
                            setFullName(profile.name);
                            setEmail(profile.email);
                            setIsEditing(false);
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-medium text-[#86868b] hover:text-white transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="apple-primary-btn px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#0071e3]/30"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{profile ? 'Save Profile' : 'Create Account'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06]">
                      <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold">Full Name</div>
                      <div className="text-sm font-semibold text-white mt-1">{profile.name}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06]">
                      <div className="text-[10px] text-[#86868b] uppercase tracking-wider font-semibold">Email</div>
                      <div className="text-sm font-semibold text-white mt-1 font-mono truncate">{profile.email}</div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {(activeTab === 'ALL' || activeTab === 'PAYPAL') && (
              <div className="p-6 rounded-3xl bg-[#1c1c1e]/70 border border-white/[0.08] backdrop-blur-2xl space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#0071e3]" />
                      <span>PayPal Connection</span>
                    </h3>
                    <p className="text-xs text-[#86868b] mt-0.5">Configure default sandbox payer or link custom PayPal account</p>
                  </div>
                  <span className="text-[10px] font-mono text-[#86868b]">
                    {paypalMode === 'DEFAULT' ? 'Sandbox Default' : 'Custom Linked'}
                  </span>
                </div>

                <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/40 border border-white/[0.06] gap-1">
                  <button
                    type="button"
                    onClick={() => handleTogglePaypalMode('DEFAULT')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 ${
                      paypalMode === 'DEFAULT'
                        ? 'bg-white/15 text-white font-semibold shadow-xs'
                        : 'text-[#86868b] hover:text-white'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-[#2997ff]" />
                    <span>Use Default</span>
                    {paypalMode === 'DEFAULT' && <Check className="w-3 h-3 text-[#2997ff]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePaypalMode('CUSTOM')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 ${
                      paypalMode === 'CUSTOM'
                        ? 'bg-white/15 text-white font-semibold shadow-xs'
                        : 'text-[#86868b] hover:text-white'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 text-[#30d158]" />
                    <span>Connect PayPal</span>
                    {paypalMode === 'CUSTOM' && <Check className="w-3 h-3 text-[#2997ff]" />}
                  </button>
                </div>

                {paypalMode === 'CUSTOM' ? (
                  <div className="space-y-2 pt-2">
                    <label className="text-[11px] text-[#86868b] block tracking-tight">
                      Custom PayPal Payer / Merchant ID or Sandbox Email
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customPaypalId}
                        onChange={(e) => setCustomPaypalId(e.target.value)}
                        placeholder="e.g. payer-account-9281 or sandbox email"
                        className="flex-1 bg-black/40 border border-white/[0.1] hover:border-white/[0.2] focus:border-[#0071e3] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5e626b] font-mono focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleSaveCustomPaypal}
                        className="px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold active:scale-[0.96] transition-all cursor-pointer shadow-sm"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                    <div className="text-xs text-[#86868b] flex items-center justify-between">
                      <span>Default Sandbox Payer:</span>
                      <span className="font-mono text-[#2997ff] text-xs">sandbox-payer-default</span>
                    </div>
                    <p className="text-[11px] text-[#86868b] pt-0.5">
                      Ready out-of-the-box for hackathon evaluation and simulated PayPal billing workflows.
                    </p>
                  </div>
                )}
              </div>
              )}

              {(activeTab === 'ALL' || activeTab === 'DATA') && (
              <div className="p-6 rounded-3xl bg-[#1c1c1e]/70 border border-white/[0.08] backdrop-blur-2xl space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-[#30d158]" />
                      <span>Data Management & Device Portability</span>
                    </h3>
                    <p className="text-xs text-[#86868b] mt-0.5">Export your local portfolio to switch devices or restore from backup</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-left transition-all active:scale-[0.98] cursor-pointer flex flex-col justify-between"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#0071e3]/15 border border-[#0071e3]/30 flex items-center justify-center text-[#2997ff] mb-3">
                      <Download className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Export Vault Backup</div>
                      <div className="text-[11px] text-[#86868b] mt-0.5">Download full JSON portfolio backup</div>
                    </div>
                  </button>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-full p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-left transition-all active:scale-[0.98] cursor-pointer flex flex-col justify-between"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#30d158]/15 border border-[#30d158]/30 flex items-center justify-center text-[#30d158] mb-3">
                        <Upload className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">Import from Device</div>
                        <div className="text-[11px] text-[#86868b] mt-0.5">Restore subscriptions from backup file</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ProfilePageContent />
    </Suspense>
  );
}
