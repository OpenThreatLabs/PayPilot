export type SubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED' | 'APPROVAL_PENDING' | 'PENDING';

export type BillingCycle = 'MONTHLY' | 'YEARLY' | 'QUARTERLY';

export type Category = 
  | 'AI_AND_ML'
  | 'DEV_TOOLS'
  | 'CLOUD_INFRA'
  | 'DESIGN_CREATIVE'
  | 'PRODUCTIVITY'
  | 'STREAMING_MEDIA';

export type SubscriptionDataSource = 'PAYPAL_SANDBOX' | 'DEMO_SEED' | 'MANUAL_VAULT';

export type PriceVerificationStatus = 'VERIFIED' | 'CROSS_CHECKED' | 'UNVERIFIED';

export type PriceSourceType = 
  | 'LIVE_GROUNDED'
  | 'INDEPENDENT_SEARCH'
  | 'CACHED_VERIFIED'
  | 'BASELINE_REGISTRY'
  | 'UNAVAILABLE';

export interface PriceHistoryRecord {
  id: string;
  timestamp: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  verificationStatus: PriceVerificationStatus;
  sourceUrl?: string;
  sourceTitle?: string;
  changeType: 'INITIAL' | 'INCREASE' | 'DECREASE' | 'UNCHANGED';
  difference: number;
  percentChange: number;
  monthlyImpact: number;
  annualImpact: number;
  notes?: string;
}

export interface VerifiedPlanOption {
  name: string;
  amount: string;
  cycle: BillingCycle;
  features: string;
  verificationStatus: PriceVerificationStatus;
  sourceType?: PriceSourceType;
  sourceUrl?: string;
  sourceTitle?: string;
  lastVerified: string;
  isIntroductory?: boolean;
  introductoryDetails?: string;
  isStudentDiscount?: boolean;
  taxDetails?: string;
  exactMatchVerified?: boolean;
  originalAmount?: number;
  originalCurrency?: string;
  isConvertedEquivalent?: boolean;
  convertedAmount?: string;
}

export interface PriceResearchResult {
  serviceName: string;
  vendor: string;
  category: Category;
  country: string;
  currency: string;
  sourceCurrency?: string;
  isConvertedEquivalent?: boolean;
  plans: VerifiedPlanOption[];
  overallStatus: PriceVerificationStatus;
  sourceType: PriceSourceType;
  sourceUrl?: string;
  sourceTitle?: string;
  lastVerified: string;
  isCached?: boolean;
  cachedAt?: string;
  conflictsDetected?: boolean;
  verificationNotes?: string;
}

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
  logoUrl?: string;
  dataSource?: SubscriptionDataSource;
  approveUrl?: string;
  paypalPlanId?: string;
  lastSyncedAt?: string;
  lastPriceCheckAt?: string;
  originalAmount?: number;
  originalCurrency?: string;
  isConvertedEquivalent?: boolean;
  priceHistory?: PriceHistoryRecord[];
  priceCreepRisk?: {
    previousAmount: number;
    currentAmount?: number;
    percentIncrease: number;
    monthlyImpact?: number;
    annualImpact?: number;
    detectedAt?: string;
    sourceUrl?: string;
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

export interface AgentAction {
  type: 'CONFIRM_CANCEL' | 'CONFIRM_SUSPEND' | 'CONFIRM_CREATE';
  subscriptionId?: string;
  subscriptionName: string;
  paypalAgreementId?: string;
  amount: number;
  currency: string;
  reason?: string;
  status?: 'PENDING_USER_CONFIRMATION' | 'EXECUTING' | 'EXECUTED' | 'REJECTED';
}

export interface AlternativeRecommendation {
  id: string;
  title: string;
  brand: string;
  price: number;
  currency: string;
  category: string;
  recurringOrLifetime: 'LIFETIME' | 'ANNUAL' | 'CHEAPER_MONTHLY';
  estimatedAnnualSaving: number;
  sourceUrl: string;
  merchantName: string;
  sourceName: string;
  reason: string;
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actionRequired?: AgentAction;
  alternatives?: AlternativeRecommendation[];
  priceResearchResult?: PriceResearchResult;
  toolCallHistory?: {
    toolName: string;
    input: Record<string, unknown>;
    summary: string;
  }[];
}
