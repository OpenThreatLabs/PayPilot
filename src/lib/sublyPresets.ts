export interface CatalogPreset {
  id: string;
  name: string;
  vendor: string;
  category: 'AI_AND_ML' | 'DEV_TOOLS' | 'CLOUD_INFRA' | 'DESIGN_CREATIVE' | 'PRODUCTIVITY' | 'STREAMING_MEDIA';
  defaultAmount: number;
  currency: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  planName: string;
  color: string;
  initials: string;
}

export const CATALOG_PRESETS: CatalogPreset[] = [
  {
    id: 'preset_netflix',
    name: 'Netflix',
    vendor: 'Netflix Inc.',
    category: 'STREAMING_MEDIA',
    defaultAmount: 22.99,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    planName: 'Premium 4K',
    color: '#E50914',
    initials: 'NF'
  },
  {
    id: 'preset_spotify',
    name: 'Spotify',
    vendor: 'Spotify AB',
    category: 'STREAMING_MEDIA',
    defaultAmount: 11.99,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    planName: 'Individual Premium',
    color: '#1DB954',
    initials: 'SP'
  },
  {
    id: 'preset_chatgpt',
    name: 'ChatGPT Plus',
    vendor: 'OpenAI',
    category: 'AI_AND_ML',
    defaultAmount: 20.00,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    planName: 'Plus Tier',
    color: '#10A37F',
    initials: 'GPT'
  },
  {
    id: 'preset_claude',
    name: 'Claude Pro',
    vendor: 'Anthropic',
    category: 'AI_AND_ML',
    defaultAmount: 20.00,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    planName: 'Pro Tier',
    color: '#D97706',
    initials: 'CL'
  },
  {
    id: 'preset_github',
    name: 'GitHub Copilot',
    vendor: 'GitHub / Microsoft',
    category: 'DEV_TOOLS',
    defaultAmount: 19.00,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    planName: 'Business Seat',
    color: '#24292F',
    initials: 'GH'
  },
  {
    id: 'preset_figma',
    name: 'Figma',
    vendor: 'Figma Inc.',
    category: 'DESIGN_CREATIVE',
    defaultAmount: 15.00,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    planName: 'Professional',
    color: '#F24E1E',
    initials: 'FG'
  },
  {
    id: 'preset_aws',
    name: 'AWS Cloud',
    vendor: 'Amazon Web Services',
    category: 'CLOUD_INFRA',
    defaultAmount: 45.00,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    planName: 'CloudWatch Enterprise',
    color: '#FF9900',
    initials: 'AWS'
  },
  {
    id: 'preset_notion',
    name: 'Notion AI',
    vendor: 'Notion Labs',
    category: 'PRODUCTIVITY',
    defaultAmount: 18.00,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    planName: 'Plus + AI Addon',
    color: '#000000',
    initials: 'NT'
  }
];

export function getDaysRemaining(targetDateStr: string): number {
  const target = new Date(targetDateStr).getTime();
  const now = new Date(2026, 10, 4).getTime();
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}
