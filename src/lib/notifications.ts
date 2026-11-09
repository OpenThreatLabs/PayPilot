import { Subscription } from '@/types';

export type NotificationType = 'PRICE_CREEP' | 'UPCOMING_RENEWAL' | 'LOW_USAGE' | 'APPROVAL_PENDING' | 'SYSTEM';

export interface PayPilotNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  subscriptionId?: string;
  paypalAgreementId?: string;
  severity: 'critical' | 'warning' | 'info';
  read: boolean;
  actionLabel?: string;
  actionTab?: 'DASHBOARD' | 'SUBSCRIPTIONS' | 'VIGIL';
}

const NOTIFICATIONS_STORAGE_KEY = 'paypilot_notifications_vault_v1';

export function generateLiveNotifications(
  subscriptions: Subscription[],
  currencySymbol: string = '$'
): PayPilotNotification[] {
  const alerts: PayPilotNotification[] = [];
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  subscriptions.forEach((sub) => {
    if (sub.status === 'APPROVAL_PENDING') {
      alerts.push({
        id: `pending_${sub.id}`,
        type: 'APPROVAL_PENDING',
        title: `${sub.name} Approval Pending`,
        message: `PayPal billing agreement authorization required to activate ${currencySymbol}${sub.amount.toFixed(2)} / ${sub.billingCycle.toLowerCase()} plan.`,
        timestamp: new Date().toISOString(),
        subscriptionId: sub.id,
        paypalAgreementId: sub.paypalAgreementId,
        severity: 'critical',
        read: false,
        actionLabel: 'Review in Subscriptions',
        actionTab: 'SUBSCRIPTIONS',
      });
    }

    if (sub.priceCreepRisk && sub.priceCreepRisk.percentIncrease > 0) {
      alerts.push({
        id: `creep_${sub.id}`,
        type: 'PRICE_CREEP',
        title: `Price Creep Detected: ${sub.name}`,
        message: `Plan rate increased by +${sub.priceCreepRisk.percentIncrease}% (+${currencySymbol}${(sub.priceCreepRisk.monthlyImpact ?? 0).toFixed(2)}/mo).`,
        timestamp: sub.priceCreepRisk.detectedAt || new Date().toISOString(),
        subscriptionId: sub.id,
        paypalAgreementId: sub.paypalAgreementId,
        severity: 'warning',
        read: false,
        actionLabel: 'Analyze with Vigil',
        actionTab: 'VIGIL',
      });
    }

    if (sub.status === 'ACTIVE' && sub.nextBillingDate) {
      try {
        const renewalDate = new Date(sub.nextBillingDate);
        if (renewalDate >= now && renewalDate <= sevenDaysFromNow) {
          const daysLeft = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          alerts.push({
            id: `renewal_${sub.id}`,
            type: 'UPCOMING_RENEWAL',
            title: `Renewal in ${daysLeft === 0 ? 'Today' : `${daysLeft}d`}: ${sub.name}`,
            message: `${currencySymbol}${sub.amount.toFixed(2)} scheduled via PayPal (${sub.paypalAgreementId.slice(0, 14)}...).`,
            timestamp: renewalDate.toISOString(),
            subscriptionId: sub.id,
            paypalAgreementId: sub.paypalAgreementId,
            severity: daysLeft <= 2 ? 'warning' : 'info',
            read: false,
            actionLabel: 'View Subscription',
            actionTab: 'SUBSCRIPTIONS',
          });
        }
      } catch {}
    }

    if (sub.status === 'ACTIVE' && (sub.usageScore ?? 100) < 30) {
      alerts.push({
        id: `waste_${sub.id}`,
        type: 'LOW_USAGE',
        title: `Low Utilization Alert: ${sub.name}`,
        message: `Usage score dropped to ${sub.usageScore}%. You could save ${currencySymbol}${sub.amount.toFixed(2)} by pausing this cycle.`,
        timestamp: new Date().toISOString(),
        subscriptionId: sub.id,
        paypalAgreementId: sub.paypalAgreementId,
        severity: 'warning',
        read: false,
        actionLabel: 'Optimize with Vigil',
        actionTab: 'VIGIL',
      });
    }
  });

  return alerts;
}

export function getStoredReadNotificationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function saveStoredReadNotificationIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}
