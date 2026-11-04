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
  savingVersusRecurringYearly?: number;
}

const CHANNEL3_API_BASE = process.env.CHANNEL3_API_BASE || 'https://api.trychannel3.com/v1';

export async function searchAlternativeProducts(query: string, limit: number = 4): Promise<Channel3Product[]> {
  const apiKey = process.env.CHANNEL3_API_KEY;

  if (!apiKey) {
    return getFallbackAlternatives(query);
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
      return getFallbackAlternatives(query);
    }

    const data = await res.json();
    if (!data.products || !Array.isArray(data.products)) {
      return getFallbackAlternatives(query);
    }

    return data.products.map((p: any) => ({
      id: p.id || `ch3_${Math.random().toString(36).substring(2, 7)}`,
      title: p.title,
      brand: p.brand || 'Verified Merchant',
      price: p.offers?.[0]?.price || p.price || 49.99,
      currency: p.offers?.[0]?.currency || 'USD',
      imageUrl: p.images?.[0] || undefined,
      merchantName: p.offers?.[0]?.merchant || 'Channel3 Network Partner',
      buyUrl: p.offers?.[0]?.url || 'https://trychannel3.com',
      category: p.category || 'Productivity',
    }));
  } catch {
    return getFallbackAlternatives(query);
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
        buyUrl: 'https://trychannel3.com',
        category: 'AI & ML',
        savingVersusRecurringYearly: 121.00
      },
      {
        id: 'ch3_local_npu',
        title: 'Local Edge AI Accelerator Card (One-time Hardware Purchase)',
        brand: 'NeuralTech',
        price: 189.99,
        currency: 'USD',
        merchantName: 'Retail Partner',
        buyUrl: 'https://trychannel3.com',
        category: 'Hardware',
        savingVersusRecurringYearly: 290.00
      }
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
        merchantName: 'Channel3 Partner Network',
        buyUrl: 'https://trychannel3.com',
        category: 'Design & Creative',
        savingVersusRecurringYearly: 110.00
      }
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
      category: 'Productivity',
      savingVersusRecurringYearly: 151.00
    }
  ];
}
