import { Subscription } from '@/types';
import { UserProfile } from '@/lib/userProfile';

export interface PayPilotVaultExport {
  version: number;
  exportedAt: string;
  source: string;
  profile: UserProfile | null;
  currencyCode: string;
  subscriptions: Subscription[];
}

export function exportPayPilotVault(
  profile: UserProfile | null,
  subscriptions: Subscription[],
  currencyCode: string = 'USD'
): void {
  const exportData: PayPilotVaultExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: 'PayPilot Vault',
    profile,
    currencyCode,
    subscriptions,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = profile?.name ? profile.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'paypilot';
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${safeName}_paypilot_vault_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parsePayPilotVaultBackup(jsonString: string): PayPilotVaultExport {
  const data = JSON.parse(jsonString);
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup file format');
  }

  if (!Array.isArray(data.subscriptions)) {
    throw new Error('Missing subscriptions array in vault backup');
  }

  return {
    version: data.version || 1,
    exportedAt: data.exportedAt || new Date().toISOString(),
    source: data.source || 'PayPilot Vault',
    profile: data.profile || null,
    currencyCode: data.currencyCode || 'USD',
    subscriptions: data.subscriptions,
  };
}
