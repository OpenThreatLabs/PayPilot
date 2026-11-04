export type SubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';

export type BillingCycle = 'MONTHLY' | 'YEARLY' | 'QUARTERLY';

export type Category = 
  | 'AI_AND_ML'
  | 'DEV_TOOLS'
  | 'CLOUD_INFRA'
  | 'DESIGN_CREATIVE'
  | 'PRODUCTIVITY'
  | 'STREAMING_MEDIA';

export interface Subscription {
  id: string;
  name: string;
  vendor: string;
  category: Category;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  nextBillingDate: string;
  lastBilledDate: string;
  paypalAgreementId: string;
  usageScore: number;
  redundancyGroup?: string;
  planName: string;
  priceCreepRisk?: {
    previousAmount: number;
    percentIncrease: number;
  };
}

export interface SpendAnalytics {
  monthlyTotal: number;
  annualizedTotal: number;
  activeCount: number;
  flaggedZombieCount: number;
  potentialAnnualSavings: number;
  categoryDistribution: { category: string; amount: number; percentage: number }[];
  cashFlowForecast: { date: string; cumulativeOutflow: number; items: string[] }[];
}

export interface AuditRecommendation {
  id: string;
  type: 'REDUNDANCY' | 'ZOMBIE_SPEND' | 'ANNUAL_DISCOUNT' | 'PRICE_CREEP';
  title: string;
  description: string;
  potentialMonthlySavings: number;
  targetSubscriptionIds: string[];
  suggestedAction: 'CANCEL' | 'SUSPEND' | 'DOWNGRADE' | 'SWITCH_ANNUAL';
  actionPayload?: {
    paypalAgreementId: string;
    subscriptionName: string;
  };
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actionRequired?: {
    type: 'CONFIRM_CANCEL' | 'CONFIRM_SUSPEND';
    subscriptionId: string;
    subscriptionName: string;
    paypalAgreementId: string;
    amount: number;
    currency: string;
  };
}
