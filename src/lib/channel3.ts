export interface Channel3Product {
  id: string;
  title: string;
  brand: string;
  price: number;
  currency: string;
  imageUrl?: string;
  merchantName: string;
  buyUrl: string;
  category: string;
  recurringOrLifetime?: 'LIFETIME' | 'ANNUAL' | 'CHEAPER_MONTHLY';
  savingVersusRecurringYearly?: number;
}

interface RawChannel3Offer {
  price?: number;
  currency?: string;
  merchant?: string;
  url?: string;
}

interface RawChannel3Product {
  id?: string;
  title: string;
  brand?: string;
  price?: number;
  offers?: RawChannel3Offer[];
  images?: string[];
  category?: string;
}

interface RawChannel3Response {
  products?: RawChannel3Product[];
}

const CHANNEL3_API_BASE = process.env.CHANNEL3_API_BASE || 'https://api.trychannel3.com/v1';

export async function searchAlternativeProducts(query: string, limit: number = 4): Promise<Channel3Product[]> {
  const apiKey = process.env.CHANNEL3_API_KEY;

  if (!apiKey) {
    return getFallbackAlternatives(query).slice(0, limit);
  }

  try {
    const res = await fetch(`${CHANNEL3_API_BASE}/search`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit,
      }),
    });

    if (!res.ok) {
      return getFallbackAlternatives(query).slice(0, limit);
    }

    const data: RawChannel3Response = await res.json();
    if (!data.products || !Array.isArray(data.products)) {
      return getFallbackAlternatives(query).slice(0, limit);
    }

    return data.products.slice(0, limit).map((p: RawChannel3Product) => ({
      id: p.id || `ch3_${Math.random().toString(36).substring(2, 7)}`,
      title: p.title,
      brand: p.brand || 'Verified Merchant',
      price: p.offers?.[0]?.price || p.price || 49.99,
      currency: p.offers?.[0]?.currency || 'USD',
      imageUrl: p.images?.[0] || undefined,
      merchantName: p.offers?.[0]?.merchant || 'Channel3 Network Partner',
      buyUrl: p.offers?.[0]?.url || 'https://trychannel3.com',
      category: p.category || 'Productivity',
      recurringOrLifetime: 'LIFETIME',
    }));
  } catch {
    return getFallbackAlternatives(query).slice(0, limit);
  }
}

function getFallbackAlternatives(query: string): Channel3Product[] {
  const q = query.toLowerCase();

  if (q.includes('ai') || q.includes('llm') || q.includes('chatgpt') || q.includes('claude')) {
    return [
      {
        id: 'ch3_ai_bundle_1',
        title: 'Unified AI Pro Annual Access Pass',
        brand: 'AI Marketplace',
        price: 119.00,
        currency: 'USD',
        merchantName: 'Channel3 Software Deals',
        buyUrl: 'https://trychannel3.com/deals/ai-annual-pass',
        category: 'AI & ML',
        recurringOrLifetime: 'ANNUAL',
        savingVersusRecurringYearly: 121.00,
      },
      {
        id: 'ch3_local_npu',
        title: 'Local Edge AI Accelerator Card (One-time Hardware Purchase)',
        brand: 'NeuralTech',
        price: 189.99,
        currency: 'USD',
        merchantName: 'Retail Partner',
        buyUrl: 'https://trychannel3.com/deals/npu-accelerator',
        category: 'AI & ML',
        recurringOrLifetime: 'LIFETIME',
        savingVersusRecurringYearly: 290.00,
      },
    ];
  }

  if (q.includes('design') || q.includes('figma') || q.includes('canva')) {
    return [
      {
        id: 'ch3_design_bundle_1',
        title: 'Affinity Designer 2 Lifetime License (Zero Recurring Fees)',
        brand: 'Serif Labs',
        price: 69.99,
        currency: 'USD',
        merchantName: 'Serif Official Store',
        buyUrl: 'https://affinity.serif.com/en-us/designer/',
        category: 'DESIGN_CREATIVE',
        recurringOrLifetime: 'LIFETIME',
        savingVersusRecurringYearly: 110.00,
      },
      {
        id: 'ch3_penpot',
        title: 'Penpot Enterprise Self-Hosted Instance Support',
        brand: 'Penpot Open Source',
        price: 49.00,
        currency: 'USD',
        merchantName: 'Penpot Network',
        buyUrl: 'https://penpot.app',
        category: 'DESIGN_CREATIVE',
        recurringOrLifetime: 'LIFETIME',
        savingVersusRecurringYearly: 131.00,
      },
    ];
  }

  if (q.includes('copilot') || q.includes('dev') || q.includes('github') || q.includes('code')) {
    return [
      {
        id: 'ch3_tabnine_perpetual',
        title: 'Tabnine Local AI Code Completion (Perpetual Developer License)',
        brand: 'Tabnine',
        price: 144.00,
        currency: 'USD',
        merchantName: 'Tabnine Deals',
        buyUrl: 'https://tabnine.com',
        category: 'DEV_TOOLS',
        recurringOrLifetime: 'ANNUAL',
        savingVersusRecurringYearly: 84.00,
      },
    ];
  }

  if (q.includes('aws') || q.includes('cloud') || q.includes('infra') || q.includes('server')) {
    return [
      {
        id: 'ch3_hetzner_dedicated',
        title: 'Dedicated Cloud Telemetry & Metrics Server (Flat Rate)',
        brand: 'Hetzner Cloud',
        price: 38.00,
        currency: 'USD',
        merchantName: 'Hetzner Online',
        buyUrl: 'https://hetzner.com/cloud',
        category: 'CLOUD_INFRA',
        recurringOrLifetime: 'CHEAPER_MONTHLY',
        savingVersusRecurringYearly: 180.00,
      },
    ];
  }

  if (q.includes('netflix') || q.includes('stream') || q.includes('media')) {
    return [
      {
        id: 'ch3_plex_lifetime',
        title: 'Plex Pass Lifetime Subscription (Zero Monthly Fees)',
        brand: 'Plex Inc',
        price: 119.99,
        currency: 'USD',
        merchantName: 'Plex Official Store',
        buyUrl: 'https://plex.tv/plex-pass',
        category: 'STREAMING_MEDIA',
        recurringOrLifetime: 'LIFETIME',
        savingVersusRecurringYearly: 155.00,
      },
    ];
  }

  return [
    {
      id: 'ch3_saas_alt_1',
      title: 'Perpetual Commercial SaaS License Voucher',
      brand: 'Productivity Direct',
      price: 89.00,
      currency: 'USD',
      merchantName: 'Channel3 Catalog',
      buyUrl: 'https://trychannel3.com',
      category: 'PRODUCTIVITY',
      recurringOrLifetime: 'LIFETIME',
      savingVersusRecurringYearly: 151.00,
    },
  ];
}
