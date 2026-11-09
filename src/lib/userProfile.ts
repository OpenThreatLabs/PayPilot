export interface UserProfile {
  name: string;
  email: string;
  paypalMerchantId?: string;
  createdAt: string;
  avatarSeed?: string;
}

const PROFILE_STORAGE_KEY = 'paypilot_user_profile_vault_v1';
const BASE_SUBSCRIPTIONS_STORAGE_KEY = 'paypilot_user_subscriptions_vault_v1';

export function getUserVaultStorageKey(profile: UserProfile | null): string {
  if (!profile || !profile.email) {
    return BASE_SUBSCRIPTIONS_STORAGE_KEY;
  }
  const cleanEmail = profile.email.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `paypilot_user_subscriptions_vault_v1_${cleanEmail}`;
}

export function getStoredUserProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveStoredUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Local storage fallback
  }
}

export function clearStoredUserProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // Local storage fallback
  }
}
