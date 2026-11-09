import type { Subscription, PriceHistoryRecord, VerifiedPlanOption } from '../types/index.ts';
import { researchSubscriptionPrice } from './priceIntelligence';

export interface PriceDeltaAlert {
  subscriptionId: string;
  subscriptionName: string;
  vendor: string;
  planName: string;
  currency: string;
  previousAmount: number;
  newAmount: number;
  difference: number;
  percentChange: number;
  monthlyImpact: number;
  annualImpact: number;
  sourceUrl?: string;
  sourceTitle?: string;
  detectedAt: string;
}

export interface PriceAuditReport {
  totalChecked: number;
  increasesDetected: number;
  decreasesDetected: number;
  netMonthlyImpact: number;
  netAnnualImpact: number;
  alerts: PriceDeltaAlert[];
  timestamp: string;
  persistenceScope: 'BROWSER_LOCAL_STORAGE';
}

function findBestMatchingPlan(
  currentPlanName: string,
  plans: VerifiedPlanOption[]
): VerifiedPlanOption | null {
  if (!plans || plans.length === 0) return null;
  if (plans.length === 1) return plans[0];

  const target = currentPlanName.toLowerCase().trim();
  const exact = plans.find((p) => p.name.toLowerCase().trim() === target);
  if (exact) return exact;

  const partial = plans.find(
    (p) => p.name.toLowerCase().includes(target) || target.includes(p.name.toLowerCase())
  );
  if (partial) return partial;

  return plans[0];
}

export async function evaluateSubscriptionPriceChange(
  sub: Subscription,
  currency: string = 'USD'
): Promise<{
  updatedSubscription: Subscription;
  alert?: PriceDeltaAlert;
}> {
  const searchCurrency = sub.currency || currency;
  const research = await researchSubscriptionPrice(sub.name, searchCurrency);
  const matchedPlan = findBestMatchingPlan(sub.planName, research.plans);

  if (!matchedPlan) {
    return { updatedSubscription: sub };
  }

  const isVerified = matchedPlan.verificationStatus === 'VERIFIED' || matchedPlan.verificationStatus === 'CROSS_CHECKED';
  const newAmount = parseFloat(matchedPlan.amount) || sub.amount;
  const currentAmount = sub.amount;
  const difference = Math.round((newAmount - currentAmount) * 100) / 100;
  const now = new Date().toISOString();

  let monthlyImpact = difference;
  let annualImpact = difference * 12;

  if (sub.billingCycle === 'YEARLY') {
    monthlyImpact = Math.round((difference / 12) * 100) / 100;
    annualImpact = difference;
  } else if (sub.billingCycle === 'QUARTERLY') {
    monthlyImpact = Math.round((difference / 3) * 100) / 100;
    annualImpact = difference * 4;
  }

  const percentChange = currentAmount > 0
    ? Math.round(((newAmount - currentAmount) / currentAmount) * 100)
    : 0;

  let changeType: 'INITIAL' | 'INCREASE' | 'DECREASE' | 'UNCHANGED' = 'UNCHANGED';
  if (isVerified && Math.abs(difference) > 0.05) {
    changeType = difference > 0 ? 'INCREASE' : 'DECREASE';
  }

  const existingHistory = Array.isArray(sub.priceHistory) ? sub.priceHistory : [];
  const latestHistory = existingHistory[0];

  const isRecentDuplicate = Boolean(
    latestHistory &&
    changeType === 'UNCHANGED' &&
    latestHistory.changeType === 'UNCHANGED' &&
    Date.now() - new Date(latestHistory.timestamp).getTime() < 24 * 60 * 60 * 1000
  );

  let updatedHistory = existingHistory;
  if (!isRecentDuplicate) {
    const historyRecord: PriceHistoryRecord = {
      id: `ph_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      amount: newAmount,
      currency,
      billingCycle: sub.billingCycle,
      verificationStatus: matchedPlan.verificationStatus,
      sourceUrl: matchedPlan.sourceUrl,
      sourceTitle: matchedPlan.sourceTitle,
      changeType,
      difference: isVerified ? difference : 0,
      percentChange: isVerified ? percentChange : 0,
      monthlyImpact: isVerified ? monthlyImpact : 0,
      annualImpact: isVerified ? annualImpact : 0,
      notes: isVerified
        ? matchedPlan.taxDetails || research.verificationNotes
        : 'Unverified scan result; preserved active subscription price without modification.',
    };
    updatedHistory = [historyRecord, ...existingHistory].slice(0, 25);
  }

  let updatedRisk = sub.priceCreepRisk;
  let alert: PriceDeltaAlert | undefined = undefined;

  // Only verified or cross-checked results can trigger price creep risk or overwrite verified baseline
  if (isVerified && changeType === 'INCREASE' && percentChange > 0) {
    updatedRisk = {
      previousAmount: currentAmount,
      currentAmount: newAmount,
      percentIncrease: percentChange,
      monthlyImpact,
      annualImpact,
      detectedAt: now,
      sourceUrl: matchedPlan.sourceUrl,
    };

    alert = {
      subscriptionId: sub.id,
      subscriptionName: sub.name,
      vendor: sub.vendor,
      planName: sub.planName,
      currency,
      previousAmount: currentAmount,
      newAmount,
      difference,
      percentChange,
      monthlyImpact,
      annualImpact,
      sourceUrl: matchedPlan.sourceUrl,
      sourceTitle: matchedPlan.sourceTitle,
      detectedAt: now,
    };
  } else if (isVerified && changeType === 'DECREASE') {
    updatedRisk = undefined;
  }

  const updatedSubscription: Subscription = {
    ...sub,
    lastPriceCheckAt: now,
    priceHistory: updatedHistory,
    priceCreepRisk: updatedRisk,
  };

  return { updatedSubscription, alert };
}

export async function batchAuditSubscriptionPrices(
  subscriptions: Subscription[],
  currency: string = 'USD'
): Promise<{
  updatedSubscriptions: Subscription[];
  report: PriceAuditReport;
}> {
  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');
  const otherSubs = subscriptions.filter((s) => s.status !== 'ACTIVE');

  const alerts: PriceDeltaAlert[] = [];
  const updatedActive: Subscription[] = [];

  for (const sub of activeSubs) {
    try {
      const { updatedSubscription, alert } = await evaluateSubscriptionPriceChange(sub, currency);
      updatedActive.push(updatedSubscription);
      if (alert) alerts.push(alert);
    } catch {
      updatedActive.push(sub);
    }
  }

  const increases = alerts.filter((a) => a.difference > 0);
  const decreases = alerts.filter((a) => a.difference < 0);
  const netMonthly = alerts.reduce((acc, a) => acc + a.monthlyImpact, 0);
  const netAnnual = Math.round(netMonthly * 12 * 100) / 100;

  const report: PriceAuditReport = {
    totalChecked: activeSubs.length,
    increasesDetected: increases.length,
    decreasesDetected: decreases.length,
    netMonthlyImpact: Math.round(netMonthly * 100) / 100,
    netAnnualImpact: netAnnual,
    alerts,
    timestamp: new Date().toISOString(),
    persistenceScope: 'BROWSER_LOCAL_STORAGE',
  };

  return {
    updatedSubscriptions: [...updatedActive, ...otherSubs],
    report,
  };
}
