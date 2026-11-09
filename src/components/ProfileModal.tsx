'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { 
  X, 
  User, 
  Mail, 
  LogOut, 
  Check, 
  ArrowRight, 
  Download, 
  Upload, 
  Database, 
  Smartphone, 
  CreditCard,
  Zap,
  Lock,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { UserProfile, saveStoredUserProfile, clearStoredUserProfile } from '@/lib/userProfile';
import { exportPayPilotVault, parsePayPilotVaultBackup } from '@/lib/vaultData';
import { Subscription } from '@/types';
import { toast } from 'sonner';

export type ProfileTab = 'PROFILE' | 'PAYPAL' | 'DATA';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  subscriptions?: Subscription[];
  currencyCode?: string;
  onUpdateProfile: (profile: UserProfile | null) => void;
  onImportData?: (subscriptions: Subscription[], profile: UserProfile | null, currencyCode?: string) => void;
  initialTab?: ProfileTab;
}

export function ProfileModal({
  isOpen,
  onClose,
  profile,
  subscriptions = [],
  currencyCode = 'USD',
  onUpdateProfile,
  onImportData,
  initialTab = 'PROFILE',
}: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');

  const [paypalMode, setPaypalMode] = useState<'DEFAULT' | 'CUSTOM'>(() => {
    if (profile?.paypalMerchantId && profile.paypalMerchantId !== 'sandbox-payer-default') {
      return 'CUSTOM';
    }
    return 'DEFAULT';
  });
  const [customPaypalId, setCustomPaypalId] = useState(
    profile?.paypalMerchantId && profile.paypalMerchantId !== 'sandbox-payer-default'
      ? profile.paypalMerchantId
      : ''
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error('Please enter your name and email address');
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
    onUpdateProfile(updated);
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
      onUpdateProfile(updated);
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
      onUpdateProfile(updated);
      toast.success('Custom PayPal account linked to profile');
    }
  };

  const handleSignOut = () => {
    clearStoredUserProfile();
    onUpdateProfile(null);
    setIsEditing(false);
    toast.success('Signed out of profile');
    onClose();
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

        if (onImportData) {
          onImportData(backup.subscriptions, backup.profile, backup.currencyCode);
        }

        toast.success(`Restored ${backup.subscriptions.length} subscriptions onto this device!`);
        onClose();
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-2xl select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="w-full max-w-[520px] max-h-[92vh] rounded-[28px] bg-[#1d1d1f]/90 backdrop-blur-3xl border border-white/[0.12] shadow-2xl p-6 sm:p-7 text-[#f5f5f7] transform transition-all flex flex-col overflow-hidden"
        style={{
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        }}
      >
        <div className="flex items-start justify-between pb-3.5 border-b border-white/[0.08] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="profile-modal-title" className="text-[17px] font-semibold tracking-tight text-white">
                {activeTab === 'PROFILE' && (profile && !isEditing ? 'Account Profile' : profile ? 'Edit Profile' : 'Set Up Account')}
                {activeTab === 'PAYPAL' && 'PayPal Connection'}
                {activeTab === 'DATA' && 'Data Management'}
              </h2>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/[0.08] text-[#86868b] border border-white/[0.08]">
                Local Vault
              </span>
            </div>
            <p className="text-[12px] text-[#86868b] tracking-normal mt-0.5">
              {activeTab === 'PROFILE' && (profile && !isEditing ? 'Your local vault profile' : 'Stored securely in your local browser vault')}
              {activeTab === 'PAYPAL' && 'Choose default sandbox or connect your custom PayPal account'}
              {activeTab === 'DATA' && 'Export and restore your subscriptions across phones or computers'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-[#86868b] hover:text-white flex items-center justify-center transition-all active:scale-[0.92] cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        <div className="pt-3 pb-1">
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-black/40 border border-white/[0.08] gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('PROFILE')}
              className={`py-2 px-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer ${
                activeTab === 'PROFILE'
                  ? 'bg-[#0071e3] text-white font-semibold shadow-md shadow-[#0071e3]/30'
                  : 'text-[#86868b] hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PAYPAL')}
              className={`py-2 px-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer ${
                activeTab === 'PAYPAL'
                  ? 'bg-[#0071e3] text-white font-semibold shadow-md shadow-[#0071e3]/30'
                  : 'text-[#86868b] hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>PayPal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DATA')}
              className={`py-2 px-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer ${
                activeTab === 'DATA'
                  ? 'bg-[#0071e3] text-white font-semibold shadow-md shadow-[#0071e3]/30'
                  : 'text-[#86868b] hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Data</span>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto pr-1 -mr-1 flex-1">
          {activeTab === 'PROFILE' && (
            profile && !isEditing ? (
              <div className="pt-4 space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                  <div 
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#2997ff] flex items-center justify-center text-white font-semibold text-xl shrink-0 shadow-lg shadow-[#0071e3]/30"
                    style={{ borderRadius: '16px' }}
                  >
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white text-base tracking-tight truncate">
                      {profile.name}
                    </div>
                    <div className="text-xs text-[#86868b] font-mono truncate mt-0.5">
                      {profile.email}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/25 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                        Active Local Session
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-[#86868b]">PayPal Status</div>
                    <div className="text-xs font-semibold text-white mt-0.5">
                      {profile.paypalMerchantId && profile.paypalMerchantId !== 'sandbox-payer-default'
                        ? 'Custom PayPal Linked'
                        : 'Sandbox Default Payer'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('PAYPAL')}
                    className="text-[11px] font-medium text-[#2997ff] hover:underline cursor-pointer"
                  >
                    Change →
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-[#86868b]">Local Storage</div>
                    <div className="text-xs font-semibold text-white mt-0.5">
                      {subscriptions.length} tracked subscriptions on this device
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('DATA')}
                    className="text-[11px] font-medium text-[#30d158] hover:underline cursor-pointer"
                  >
                    Manage Data →
                  </button>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <Link
                    href="/profile"
                    onClick={onClose}
                    className="flex-1 py-3 px-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-xs font-semibold text-white transition-all active:scale-[0.97] cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <span>Full Profile Page</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setFullName(profile.name);
                      setEmail(profile.email);
                      setIsEditing(true);
                    }}
                    className="py-3 px-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-white transition-all active:scale-[0.97] cursor-pointer text-center"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="py-3 px-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold text-red-400 transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateOrUpdate} className="pt-4 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-[12px] font-medium text-[#86868b] block mb-1.5 tracking-tight">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-[#86868b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Alex Mercer"
                        className="w-full bg-black/30 border border-white/[0.12] hover:border-white/[0.22] focus:border-[#0071e3] rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-[#5e626b] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#86868b] block mb-1.5 tracking-tight">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-[#86868b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. alex.mercer@sandbox.paypal"
                        className="w-full bg-black/30 border border-white/[0.12] hover:border-white/[0.22] focus:border-[#0071e3] rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-[#5e626b] focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/[0.08]">
                  {profile && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2.5 rounded-2xl text-xs font-medium text-[#86868b] hover:text-white transition-colors cursor-pointer active:scale-[0.97]"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold transition-all active:scale-[0.96] shadow-md shadow-[#0071e3]/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{profile ? 'Save Changes' : 'Create Local Account'}</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
                  </button>
                </div>
              </form>
            )
          )}

          {activeTab === 'PAYPAL' && (
            <div className="pt-4 space-y-4">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#0071e3]" />
                    <span className="text-xs font-semibold text-white tracking-tight">PayPal Connection Mode</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#86868b]">
                    {paypalMode === 'DEFAULT' ? 'Sandbox Default' : 'Custom Linked'}
                  </span>
                </div>

                <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] gap-1">
                  <button
                    type="button"
                    onClick={() => handleTogglePaypalMode('DEFAULT')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 ${
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
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 ${
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
                        className="px-3.5 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold active:scale-[0.96] transition-all cursor-pointer shadow-sm"
                      >
                        Save
                      </button>
                    </div>
                    <p className="text-[10px] text-[#86868b]">
                      This ID is linked to your billing agreements and Vigil payment authorizations.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                    <div className="text-[11px] text-[#86868b] flex items-center justify-between">
                      <span>Default Sandbox Payer:</span>
                      <span className="font-mono text-[#2997ff] text-[11px]">sandbox-payer-default</span>
                    </div>
                    <p className="text-[10px] text-[#86868b] pt-0.5">
                      Ready out-of-the-box for PayPal hackathon review, test billing agreements, and simulated renewals.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#30d158]" />
                  <span>Encrypted Payment Staging</span>
                </div>
                <p className="text-[11px] text-[#86868b] leading-relaxed">
                  PayPal tokens and authorizations remain strictly in your browser. All subscription changes require your explicit permission.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'DATA' && (
            <div className="pt-4 space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0071e3]/15 border border-[#0071e3]/30 flex items-center justify-center text-[#2997ff] shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Device Portability</h4>
                    <p className="text-[11px] text-[#86868b] mt-0.5 leading-relaxed">
                      PayPilot stores all data locally on this browser. Export a JSON backup when switching to another phone or laptop.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.06]">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
                    <div className="text-[10px] text-[#86868b]">Active Subscriptions</div>
                    <div className="text-sm font-semibold text-white mt-0.5 tabular-nums">{subscriptions.length}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
                    <div className="text-[10px] text-[#86868b]">Preferred Currency</div>
                    <div className="text-sm font-semibold text-white mt-0.5 font-mono">{currencyCode}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-left transition-all active:scale-[0.98] cursor-pointer flex flex-col justify-between"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#0071e3]/15 border border-[#0071e3]/30 flex items-center justify-center text-[#2997ff] mb-2">
                    <Download className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Export Vault</div>
                    <div className="text-[10px] text-[#86868b] mt-0.5">Download .json backup file</div>
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
                    className="w-full h-full p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-left transition-all active:scale-[0.98] cursor-pointer flex flex-col justify-between"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#30d158]/15 border border-[#30d158]/30 flex items-center justify-center text-[#30d158] mb-2">
                      <Upload className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Import from Device</div>
                      <div className="text-[10px] text-[#86868b] mt-0.5">Restore vault from backup</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
