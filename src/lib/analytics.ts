import type { Subscription, SpendAnalytics, AuditRecommendation } from '@/types';
import { BASELINE_EXCHANGE_RATES, convertAmount } from './currency';

export function calculateSpendAnalytics(
  subscriptions: Subscription[],
  targetCurrency = 'USD',
  rates: Record<string, number> = BASELINE_EXCHANGE_RATES,
  currencySymbol = '$'
): SpendAnalytics {
  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');

  const monthlyTotal = activeSubs.reduce((acc, sub) => {
    const converted = convertAmount(sub.amount, sub.currency || 'USD', targetCurrency, rates);
    if (sub.billingCycle === 'MONTHLY') return acc + converted;
    if (sub.billingCycle === 'YEARLY') return acc + converted / 12;
    if (sub.billingCycle === 'QUARTERLY') return acc + converted / 3;
    return acc + converted;
  }, 0);

  const annualizedTotal = monthlyTotal * 12;
  const flaggedZombie = activeSubs.filter((s) => s.usageScore < 30);

  const categoryTotals: Record<string, number> = {};
  activeSubs.forEach((s) => {
    const converted = convertAmount(s.amount, s.currency || 'USD', targetCurrency, rates);
    const amt =
      s.billingCycle === 'YEARLY'
        ? converted / 12
        : s.billingCycle === 'QUARTERLY'
        ? converted / 3
        : converted;
    categoryTotals[s.category] = (categoryTotals[s.category] || 0) + amt;
  });

  const categoryDistribution = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      percentage: monthlyTotal > 0 ? Math.round((amount / monthlyTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const next30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(2026, 10, 5 + i);
    return d.toISOString().split('T')[0];
  });

  let runningOutflow = 0;
  const cashFlowForecast = next30Days.map((dateStr) => {
    const daySubs = activeSubs.filter((s) => s.nextBillingDate.startsWith(dateStr));
    const daySum = daySubs.reduce((sum, s) => {
      const converted = convertAmount(s.amount, s.currency || 'USD', targetCurrency, rates);
      return sum + converted;
    }, 0);
    runningOutflow += daySum;
    return {
      date: dateStr.slice(5),
      cumulativeOutflow: Math.round(runningOutflow * 100) / 100,
      items: daySubs.map((s) => {
        const converted = convertAmount(s.amount, s.currency || 'USD', targetCurrency, rates);
        return `${s.name} (${currencySymbol}${converted.toFixed(2)})`;
      }),
    };
  });

  const zombieSavings = flaggedZombie.reduce((sum, s) => {
    const converted = convertAmount(s.amount, s.currency || 'USD', targetCurrency, rates);
    const monthly =
      s.billingCycle === 'YEARLY'
        ? converted / 12
        : s.billingCycle === 'QUARTERLY'
        ? converted / 3
        : converted;
    return sum + monthly;
  }, 0) * 12;

  return {
    monthlyTotal: Math.round(monthlyTotal * 100) / 100,
    annualizedTotal: Math.round(annualizedTotal * 100) / 100,
    activeCount: activeSubs.length,
    flaggedZombieCount: flaggedZombie.length,
    potentialAnnualSavings: Math.round(zombieSavings * 100) / 100,
    categoryDistribution,
    cashFlowForecast,
  };
}

export function generateAuditRecommendations(
  subscriptions: Subscription[],
  targetCurrency = 'USD',
  rates: Record<string, number> = BASELINE_EXCHANGE_RATES,
  currencySymbol = '$'
): AuditRecommendation[] {
  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');
  const recommendations: AuditRecommendation[] = [];

  const groups: Record<string, Subscription[]> = {};
  activeSubs.forEach((sub) => {
    if (sub.redundancyGroup) {
      if (!groups[sub.redundancyGroup]) groups[sub.redundancyGroup] = [];
      groups[sub.redundancyGroup].push(sub);
    }
  });

  Object.entries(groups).forEach(([groupName, groupSubs]) => {
    if (groupSubs.length > 1) {
      const sortedByUsage = [...groupSubs].sort((a, b) => a.usageScore - b.usageScore);
      const lowUsageSub = sortedByUsage[0];
      const highUsageSub = sortedByUsage[sortedByUsage.length - 1];

      const highConverted = convertAmount(highUsageSub.amount, highUsageSub.currency || 'USD', targetCurrency, rates);
      const lowConverted = convertAmount(lowUsageSub.amount, lowUsageSub.currency || 'USD', targetCurrency, rates);

      recommendations.push({
        id: `rec_red_${groupName.toLowerCase()}`,
        type: 'REDUNDANCY',
        title: `Redundant ${groupName.replace('_', ' ')} subscriptions detected`,
        description: `You are paying for both ${highUsageSub.name} (${currencySymbol}${highConverted.toFixed(2)}/mo) and ${lowUsageSub.name} (${currencySymbol}${lowConverted.toFixed(2)}/mo). ${lowUsageSub.name} has only ${lowUsageSub.usageScore}% logged activity.`,
        potentialMonthlySavings: Math.round(lowConverted * 100) / 100,
        targetSubscriptionIds: [lowUsageSub.id],
        suggestedAction: 'CANCEL',
        actionPayload: {
          paypalAgreementId: lowUsageSub.paypalAgreementId,
          subscriptionName: lowUsageSub.name,
        },
      });
    }
  });

  activeSubs.forEach((sub) => {
    const converted = convertAmount(sub.amount, sub.currency || 'USD', targetCurrency, rates);
    const monthlyAmt =
      sub.billingCycle === 'YEARLY'
        ? converted / 12
        : sub.billingCycle === 'QUARTERLY'
        ? converted / 3
        : converted;

    if (sub.usageScore < 20 && !recommendations.some((r) => r.targetSubscriptionIds.includes(sub.id))) {
      recommendations.push({
        id: `rec_zombie_${sub.id}`,
        type: 'ZOMBIE_SPEND',
        title: `Zombie subscription: ${sub.name}`,
        description: `Logged utility score is under 20% over the last 60 days. Inactive burn totaling ${currencySymbol}${(monthlyAmt * 12).toFixed(2)}/yr.`,
        potentialMonthlySavings: Math.round(monthlyAmt * 100) / 100,
        targetSubscriptionIds: [sub.id],
        suggestedAction: 'SUSPEND',
        actionPayload: {
          paypalAgreementId: sub.paypalAgreementId,
          subscriptionName: sub.name,
        },
      });
    }

    if (sub.priceCreepRisk) {
      const prevConverted = convertAmount(sub.priceCreepRisk.previousAmount, sub.currency || 'USD', targetCurrency, rates);
      const diff = Math.round((converted - prevConverted) * 100) / 100;
      recommendations.push({
        id: `rec_creep_${sub.id}`,
        type: 'PRICE_CREEP',
        title: `Price Creep Alert: ${sub.name}`,
        description: `Cost increased by ${sub.priceCreepRisk.percentIncrease}% from ${currencySymbol}${prevConverted.toFixed(2)} to ${currencySymbol}${converted.toFixed(2)}.`,
        potentialMonthlySavings: diff > 0 ? diff : 0,
        targetSubscriptionIds: [sub.id],
        suggestedAction: 'DOWNGRADE',
        actionPayload: {
          paypalAgreementId: sub.paypalAgreementId,
          subscriptionName: sub.name,
        },
      });
    }
  });

  return recommendations;
}
