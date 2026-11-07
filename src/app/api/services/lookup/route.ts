import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { CANONICAL_SUBSCRIPTION_REGISTRY } from '@/lib/canonicalServices';

const CURRENCY_COUNTRY_MAP: Record<string, { country: string; symbol: string; fallbackPrice: string }> = {
  USD: { country: 'United States', symbol: '$', fallbackPrice: '14.99' },
  EUR: { country: 'Germany / European Union', symbol: '€', fallbackPrice: '12.99' },
  GBP: { country: 'United Kingdom', symbol: '£', fallbackPrice: '10.99' },
  INR: { country: 'India', symbol: '₹', fallbackPrice: '199' },
  JPY: { country: 'Japan', symbol: '¥', fallbackPrice: '1490' },
  CAD: { country: 'Canada', symbol: 'CA$', fallbackPrice: '18.99' },
  AUD: { country: 'Australia', symbol: 'A$', fallbackPrice: '18.99' },
  CHF: { country: 'Switzerland', symbol: 'CHF', fallbackPrice: '17.90' },
  CNY: { country: 'China', symbol: '¥', fallbackPrice: '68' },
  HKD: { country: 'Hong Kong', symbol: 'HK$', fallbackPrice: '78' },
  SGD: { country: 'Singapore', symbol: 'S$', fallbackPrice: '17.48' },
  SEK: { country: 'Sweden', symbol: 'kr', fallbackPrice: '129' },
  KRW: { country: 'South Korea', symbol: '₩', fallbackPrice: '13500' },
  NOK: { country: 'Norway', symbol: 'kr', fallbackPrice: '129' },
  NZD: { country: 'New Zealand', symbol: 'NZ$', fallbackPrice: '18.49' },
  MXN: { country: 'Mexico', symbol: 'MX$', fallbackPrice: '199' },
  BRL: { country: 'Brazil', symbol: 'R$', fallbackPrice: '39.90' },
  RUB: { country: 'Russia', symbol: '₽', fallbackPrice: '599' },
  ZAR: { country: 'South Africa', symbol: 'R', fallbackPrice: '139' },
  TRY: { country: 'Turkey', symbol: '₺', fallbackPrice: '149.99' },
  AED: { country: 'United Arab Emirates', symbol: 'AED', fallbackPrice: '39' },
  SAR: { country: 'Saudi Arabia', symbol: 'SAR', fallbackPrice: '39' },
  PLN: { country: 'Poland', symbol: 'zł', fallbackPrice: '43' },
  THB: { country: 'Thailand', symbol: '฿', fallbackPrice: '169' },
  IDR: { country: 'Indonesia', symbol: 'Rp', fallbackPrice: '65000' },
  MYR: { country: 'Malaysia', symbol: 'RM', fallbackPrice: '29.90' },
  PHP: { country: 'Philippines', symbol: '₱', fallbackPrice: '249' },
  CZK: { country: 'Czech Republic', symbol: 'Kč', fallbackPrice: '259' },
  ILS: { country: 'Israel', symbol: '₪', fallbackPrice: '44.90' },
  CLP: { country: 'Chile', symbol: 'CLP$', fallbackPrice: '6990' },
};

export async function POST(req: Request) {
  try {
    const { query, currency = 'USD' } = await req.json();
    const serviceName = typeof query === 'string' ? query.trim() : '';

    if (!serviceName || serviceName.length < 2) {
      return NextResponse.json({ error: 'Query too short' }, { status: 400 });
    }

    const sLower = serviceName.toLowerCase();
    const exactCanonical = CANONICAL_SUBSCRIPTION_REGISTRY.find(
      (c) => c.name.toLowerCase() === sLower || c.name.toLowerCase().includes(sLower) || sLower.includes(c.name.toLowerCase())
    );

    if (exactCanonical) {
      const plans = exactCanonical.regionalPlans[currency] || exactCanonical.regionalPlans['USD'] || exactCanonical.regionalPlans['INR'] || [];
      if (plans.length > 0) {
        return NextResponse.json({
          name: exactCanonical.name,
          vendor: exactCanonical.vendor,
          category: exactCanonical.category,
          plans,
        });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
    }

    const countryInfo = CURRENCY_COUNTRY_MAP[currency] || {
      country: currency,
      symbol: currency,
      fallbackPrice: '14.99',
    };

    const prompt = `Identify the exact official subscription tiers and prices for "${serviceName}" in ${countryInfo.country} in currency ${currency}.
Format strictly as JSON without markdown or backticks:
{
  "name": "Canonical Service Name",
  "vendor": "Company Name",
  "category": "PRODUCTIVITY" | "DEV_TOOLS" | "AI_AND_ML" | "CLOUD_INFRA" | "DESIGN_CREATIVE" | "STREAMING_MEDIA",
  "plans": [
    {
      "name": "Tier Name",
      "amount": "${countryInfo.fallbackPrice}",
      "cycle": "MONTHLY" | "YEARLY" | "QUARTERLY",
      "features": "Key perks"
    }
  ]
}`;

    const ai = new GoogleGenAI({ apiKey });
    let rawText = '';

    try {
      const res = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
      });
      rawText = res.text || '';
    } catch {
      rawText = '';
    }

    if (!rawText) {
      return NextResponse.json({
        name: serviceName,
        vendor: serviceName,
        category: 'PRODUCTIVITY',
        plans: [
          {
            name: 'Standard Tier',
            amount: countryInfo.fallbackPrice,
            cycle: 'MONTHLY',
            features: 'Standard recurring access',
          },
        ],
      });
    }

    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    const allowedCategories = ['AI_AND_ML', 'DEV_TOOLS', 'CLOUD_INFRA', 'DESIGN_CREATIVE', 'PRODUCTIVITY', 'STREAMING_MEDIA'];
    const rawCat = String(parsed.category || '').toUpperCase().replace(/[\s-]/g, '_');

    let resolvedCategory = 'PRODUCTIVITY';
    if (sLower.includes('netflix') || sLower.includes('spotify') || sLower.includes('hotstar') || sLower.includes('disney') || sLower.includes('youtube') || sLower.includes('hulu') || sLower.includes('prime video') || sLower.includes('apple tv') || sLower.includes('music') || sLower.includes('hbomax') || sLower.includes('max') || sLower.includes('paramount') || sLower.includes('peacock') || sLower.includes('crunchyroll') || sLower.includes('audible')) {
      resolvedCategory = 'STREAMING_MEDIA';
    } else if (sLower.includes('canva') || sLower.includes('figma') || sLower.includes('adobe') || sLower.includes('photoshop') || sLower.includes('illustrator') || sLower.includes('framer') || sLower.includes('invision') || sLower.includes('sketch') || sLower.includes('procreate') || sLower.includes('creative cloud')) {
      resolvedCategory = 'DESIGN_CREATIVE';
    } else if (sLower.includes('chatgpt') || sLower.includes('claude') || sLower.includes('openai') || sLower.includes('midjourney') || sLower.includes('anthropic') || sLower.includes('perplexity') || sLower.includes('gemini') || sLower.includes('elevenlabs') || sLower.includes('runway') || sLower.includes('jasper')) {
      resolvedCategory = 'AI_AND_ML';
    } else if (sLower.includes('github') || sLower.includes('copilot') || sLower.includes('cursor') || sLower.includes('gitlab') || sLower.includes('jetbrains') || sLower.includes('postman') || sLower.includes('datadog') || sLower.includes('sentry') || sLower.includes('linear') || sLower.includes('jira')) {
      resolvedCategory = 'DEV_TOOLS';
    } else if (sLower.includes('aws') || sLower.includes('vercel') || sLower.includes('supabase') || sLower.includes('azure') || sLower.includes('google cloud') || sLower.includes('render') || sLower.includes('railway') || sLower.includes('cloudflare') || sLower.includes('digitalocean') || sLower.includes('heroku')) {
      resolvedCategory = 'CLOUD_INFRA';
    } else if (sLower.includes('notion') || sLower.includes('slack') || sLower.includes('zoom') || sLower.includes('zomato') || sLower.includes('swiggy') || sLower.includes('microsoft 365') || sLower.includes('office') || sLower.includes('google workspace') || sLower.includes('asana') || sLower.includes('trello') || sLower.includes('airtable') || sLower.includes('monday') || sLower.includes('clickup') || sLower.includes('dropbox') || sLower.includes('box')) {
      resolvedCategory = 'PRODUCTIVITY';
    } else if (allowedCategories.includes(rawCat)) {
      resolvedCategory = rawCat;
    } else if (rawCat.includes('STREAM') || rawCat.includes('ENTERTAINMENT') || rawCat.includes('MEDIA') || rawCat.includes('VIDEO') || rawCat.includes('AUDIO')) {
      resolvedCategory = 'STREAMING_MEDIA';
    } else if (rawCat.includes('DESIGN') || rawCat.includes('CREATIVE') || rawCat.includes('PHOTO') || rawCat.includes('ART')) {
      resolvedCategory = 'DESIGN_CREATIVE';
    } else if (rawCat.includes('AI') || rawCat.includes('ML') || rawCat.includes('MACHINE') || rawCat.includes('GPT') || rawCat.includes('INTELLIGENCE')) {
      resolvedCategory = 'AI_AND_ML';
    } else if (rawCat.includes('DEV') || rawCat.includes('CODE') || rawCat.includes('PROGRAM') || rawCat.includes('TOOL')) {
      resolvedCategory = 'DEV_TOOLS';
    } else if (rawCat.includes('CLOUD') || rawCat.includes('INFRA') || rawCat.includes('HOSTING') || rawCat.includes('DATABASE') || rawCat.includes('SERVER')) {
      resolvedCategory = 'CLOUD_INFRA';
    }

    parsed.category = resolvedCategory;

    if (Array.isArray(parsed.plans)) {
      parsed.plans = parsed.plans
        .filter((p: { amount?: unknown; name?: string }) => {
          const val = parseFloat(String(p.amount || '0').replace(/[^0-9.]/g, ''));
          return val > 0 || parsed.plans.length === 1;
        })
        .map((p: { name: string; amount: unknown; cycle: string; features?: string }) => {
          const c = String(p.cycle || '').toUpperCase();
          const validCycle = c.includes('YEAR') ? 'YEARLY' : c.includes('QUART') ? 'QUARTERLY' : 'MONTHLY';
          return {
            name: p.name || 'Standard Tier',
            amount: String(p.amount || countryInfo.fallbackPrice).replace(/[^0-9.]/g, ''),
            cycle: validCycle,
            features: p.features || '',
          };
        });
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Plan discovery failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
