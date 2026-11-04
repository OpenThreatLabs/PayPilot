import { Subscription, SpendAnalytics, AuditRecommendation } from '@/types';

export function calculateSpendAnalytics(subscriptions: Subscription[]): SpendAnalytics {
  const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE');
  
  const monthlyTotal = activeSubs.reduce((acc, sub) => {
    if (sub.billingCycle === 'MONTHLY') return acc + sub.amount;
    if (sub.billingCycle === 'YEARLY') return acc + (sub.amount / 12);
    if (sub.billingCycle === 'QUARTERLY') return acc + (sub.amount / 3);
    return acc + sub.amount;
  }, 0);

  const annualizedTotal = monthlyTotal * 12;

  const flaggedZombie = activeSubs.filter(s => s.usageScore < 30);

  const categoryTotals: Record<string, number> = {};
  activeSubs.forEach(s => {
    const amt = s.billingCycle === 'YEARLY' ? s.amount / 12 : s.amount;
    categoryTotals[s.category] = (categoryTotals[s.category] || 0) + amt;
  });

  const categoryDistribution = Object.entries(categoryTotals).map(([category, amount]) => ({
    category,
    amount: Math.round(amount * 100) / 100,
    percentage: monthlyTotal > 0 ? Math.round((amount / monthlyTotal) * 100) : 0
  })).sort((a, b) => b.amount - a.amount);

  const next30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(2026, 10, 5 + i);
    return d.toISOString().split('T')[0];
  });

  let runningOutflow = 0;
  const cashFlowForecast = next30Days.map(dateStr => {
    const daySubs = activeSubs.filter(s => s.nextBillingDate.startsWith(dateStr));
    const daySum = daySubs.reduce((sum, s) => sum + s.amount, 0);
    runningOutflow += daySum;
    return {
      date: dateStr.slice(5),
      cumulativeOutflow: Math.round(runningOutflow * 100) / 100,
      items: daySubs.map(s => `${s.name} ($${s.amount})`)
    };
  });

  const zombieSavings = flaggedZombie.reduce((sum, s) => sum + s.amount, 0) * 12;

  return {
    monthlyTotal: Math.round(monthlyTotal * 100) / 100,
    annualizedTotal: Math.round(annualizedTotal * 100) / 100,
    activeCount: activeSubs.length,
    flaggedZombieCount: flaggedZombie.length,
    potentialAnnualSavings: Math.round(zombieSavings * 100) / 100,
    categoryDistribution,
    cashFlowForecast
  };
}

export function generateAuditRecommendations(subscriptions: Subscription[]): AuditRecommendation[] {
  const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE');
  const recommendations: AuditRecommendation[] = [];

  const groups: Record<string, Subscription[]> = {};
  activeSubs.forEach(sub => {
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

      recommendations.push({
        id: `rec_red_${groupName.toLowerCase()}`,
        type: 'REDUNDANCY',
        title: `Redundant ${groupName.replace('_', ' ')} subscriptions detected`,
        description: `You are paying for both ${highUsageSub.name} ($${highUsageSub.amount}/mo) and ${lowUsageSub.name} ($${lowUsageSub.amount}/mo). ${lowUsageSub.name} has only ${lowUsageSub.usageScore}% logged activity.`,
        potentialMonthlySavings: lowUsageSub.amount,
        targetSubscriptionIds: [lowUsageSub.id],
        suggestedAction: 'CANCEL',
        actionPayload: {
          paypalAgreementId: lowUsageSub.paypalAgreementId,
          subscriptionName: lowUsageSub.name
        }
      });
    }
  });

  activeSubs.forEach(sub => {
    if (sub.usageScore < 20 && !recommendations.some(r => r.targetSubscriptionIds.includes(sub.id))) {
      recommendations.push({
        id: `rec_zombie_${sub.id}`,
        type: 'ZOMBIE_SPEND',
        title: `Zombie subscription: ${sub.name}`,
        description: `Logged utility score is under 20% over the last 60 days. Inactive burn totaling $${(sub.amount * 12).toFixed(2)}/yr.`,
        potentialMonthlySavings: sub.amount,
        targetSubscriptionIds: [sub.id],
        suggestedAction: 'SUSPEND',
        actionPayload: {
          paypalAgreementId: sub.paypalAgreementId,
          subscriptionName: sub.name
        }
      });
    }

    if (sub.priceCreepRisk) {
      recommendations.push({
        id: `rec_creep_${sub.id}`,
        type: 'PRICE_CREEP',
        title: `Price Creep Alert: ${sub.name}`,
        description: `Monthly cost increased by ${sub.priceCreepRisk.percentIncrease}% from $${sub.priceCreepRisk.previousAmount} to $${sub.amount}.`,
        potentialMonthlySavings: Math.round((sub.amount - sub.priceCreepRisk.previousAmount) * 100) / 100,
        targetSubscriptionIds: [sub.id],
        suggestedAction: 'DOWNGRADE',
        actionPayload: {
          paypalAgreementId: sub.paypalAgreementId,
          subscriptionName: sub.name
        }
      });
    }
  });

  return recommendations;
}
