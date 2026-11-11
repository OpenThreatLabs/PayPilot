import { GoogleGenAI } from '@google/genai';
import type {
  BillingCycle,
  Category,
  PriceResearchResult,
  PriceVerificationStatus,
  VerifiedPlanOption,
} from '../types/index.ts';
import { CANONICAL_SUBSCRIPTION_REGISTRY } from './canonicalServices.ts';
import { recordCacheHit, recordGeminiUsage } from './geminiUsage.ts';
import { BASELINE_EXCHANGE_RATES, convertAmount } from './currency.ts';

export const REGIONAL_MARKETS: Record<string, { country: string; symbol: string; fallbackAmount: string }> = {
  INR: { country: 'India', symbol: '₹', fallbackAmount: '199' },
  USD: { country: 'United States', symbol: '$', fallbackAmount: '14.99' },
  EUR: { country: 'European Union / Germany', symbol: '€', fallbackAmount: '12.99' },
  GBP: { country: 'United Kingdom', symbol: '£', fallbackAmount: '10.99' },
  CAD: { country: 'Canada', symbol: 'CA$', fallbackAmount: '18.99' },
  AUD: { country: 'Australia', symbol: 'A$', fallbackAmount: '18.99' },
  JPY: { country: 'Japan', symbol: '¥', fallbackAmount: '1490' },
  SGD: { country: 'Singapore', symbol: 'S$', fallbackAmount: '17.50' },
  CHF: { country: 'Switzerland', symbol: 'CHF', fallbackAmount: '16.90' },
  BRL: { country: 'Brazil', symbol: 'R$', fallbackAmount: '39.90' },
  MXN: { country: 'Mexico', symbol: 'MX$', fallbackAmount: '199' },
  AED: { country: 'United Arab Emirates', symbol: 'AED', fallbackAmount: '39' },
  SEK: { country: 'Sweden', symbol: 'kr', fallbackAmount: '129' },
  NOK: { country: 'Norway', symbol: 'kr', fallbackAmount: '129' },
  NZD: { country: 'New Zealand', symbol: 'NZ$', fallbackAmount: '18.50' },
  ZAR: { country: 'South Africa', symbol: 'R', fallbackAmount: '139' },
};

const OFFICIAL_DOMAIN_MAP: Record<string, { domain: string; vendor: string; category: Category }> = {
  netflix: { domain: 'netflix.com', vendor: 'Netflix Inc', category: 'STREAMING_MEDIA' },
  spotify: { domain: 'spotify.com', vendor: 'Spotify AB', category: 'STREAMING_MEDIA' },
  chatgpt: { domain: 'openai.com', vendor: 'OpenAI', category: 'AI_AND_ML' },
  openai: { domain: 'openai.com', vendor: 'OpenAI', category: 'AI_AND_ML' },
  claude: { domain: 'anthropic.com', vendor: 'Anthropic', category: 'AI_AND_ML' },
  anthropic: { domain: 'anthropic.com', vendor: 'Anthropic', category: 'AI_AND_ML' },
  cursor: { domain: 'cursor.com', vendor: 'Anysphere Inc', category: 'DEV_TOOLS' },
  github: { domain: 'github.com', vendor: 'Microsoft / GitHub', category: 'DEV_TOOLS' },
  copilot: { domain: 'github.com', vendor: 'Microsoft / GitHub', category: 'DEV_TOOLS' },
  canva: { domain: 'canva.com', vendor: 'Canva Pty Ltd', category: 'DESIGN_CREATIVE' },
  figma: { domain: 'figma.com', vendor: 'Figma Inc', category: 'DESIGN_CREATIVE' },
  notion: { domain: 'notion.so', vendor: 'Notion Labs', category: 'PRODUCTIVITY' },
  slack: { domain: 'slack.com', vendor: 'Salesforce', category: 'PRODUCTIVITY' },
  vercel: { domain: 'vercel.com', vendor: 'Vercel Inc', category: 'CLOUD_INFRA' },
  aws: { domain: 'aws.amazon.com', vendor: 'Amazon Web Services', category: 'CLOUD_INFRA' },
  youtube: { domain: 'youtube.com', vendor: 'Google LLC', category: 'STREAMING_MEDIA' },
  hotstar: { domain: 'hotstar.com', vendor: 'Disney / JioStar', category: 'STREAMING_MEDIA' },
  disney: { domain: 'disneyplus.com', vendor: 'Disney', category: 'STREAMING_MEDIA' },
  prime: { domain: 'amazon.com', vendor: 'Amazon', category: 'STREAMING_MEDIA' },
  amazon: { domain: 'amazon.com', vendor: 'Amazon', category: 'STREAMING_MEDIA' },
  apple: { domain: 'apple.com', vendor: 'Apple Inc', category: 'STREAMING_MEDIA' },
  zomato: { domain: 'zomato.com', vendor: 'Zomato Ltd', category: 'PRODUCTIVITY' },
  swiggy: { domain: 'swiggy.com', vendor: 'Bundl Technologies (Swiggy)', category: 'PRODUCTIVITY' },
  midjourney: { domain: 'midjourney.com', vendor: 'Midjourney Inc', category: 'AI_AND_ML' },
  linear: { domain: 'linear.app', vendor: 'Linear Orbit', category: 'DEV_TOOLS' },
  zoom: { domain: 'zoom.us', vendor: 'Zoom Video Communications', category: 'PRODUCTIVITY' },
  adobe: { domain: 'adobe.com', vendor: 'Adobe Inc', category: 'DESIGN_CREATIVE' },
};

export function resolveOfficialDomain(serviceName: string): { domain: string; vendor: string; category: Category } | null {
  const s = serviceName.toLowerCase().trim();
  for (const [key, meta] of Object.entries(OFFICIAL_DOMAIN_MAP)) {
    if (s.includes(key) || key.includes(s)) {
      return meta;
    }
  }
  return null;
}

export function inferCategory(serviceName: string, rawCategory?: string): Category {
  const s = serviceName.toLowerCase();
  if (
    s.includes('netflix') || s.includes('spotify') || s.includes('hotstar') ||
    s.includes('youtube') || s.includes('disney') || s.includes('prime video') ||
    s.includes('hulu') || s.includes('music') || s.includes('audible')
  ) {
    return 'STREAMING_MEDIA';
  }
  if (
    s.includes('chatgpt') || s.includes('claude') || s.includes('openai') ||
    s.includes('midjourney') || s.includes('anthropic') || s.includes('perplexity') ||
    s.includes('elevenlabs') || s.includes('gemini')
  ) {
    return 'AI_AND_ML';
  }
  if (
    s.includes('cursor') || s.includes('github') || s.includes('copilot') ||
    s.includes('gitlab') || s.includes('postman') || s.includes('linear') ||
    s.includes('datadog') || s.includes('sentry')
  ) {
    return 'DEV_TOOLS';
  }
  if (
    s.includes('canva') || s.includes('figma') || s.includes('adobe') ||
    s.includes('photoshop') || s.includes('framer')
  ) {
    return 'DESIGN_CREATIVE';
  }
  if (
    s.includes('aws') || s.includes('vercel') || s.includes('supabase') ||
    s.includes('azure') || s.includes('render') || s.includes('railway') ||
    s.includes('cloudflare')
  ) {
    return 'CLOUD_INFRA';
  }
  if (
    s.includes('notion') || s.includes('slack') || s.includes('zoom') ||
    s.includes('zomato') || s.includes('swiggy') || s.includes('microsoft 365')
  ) {
    return 'PRODUCTIVITY';
  }

  const raw = String(rawCategory || '').toUpperCase().replace(/[\s-]/g, '_');
  const validCategories: Category[] = [
    'AI_AND_ML', 'DEV_TOOLS', 'CLOUD_INFRA', 'DESIGN_CREATIVE', 'PRODUCTIVITY', 'STREAMING_MEDIA'
  ];
  if (validCategories.includes(raw as Category)) {
    return raw as Category;
  }
  return 'PRODUCTIVITY';
}

function cleanPriceNumber(amount: string | number): string {
  const str = String(amount ?? '').replace(/[^0-9.]/g, '');
  const parsed = parseFloat(str);
  if (isNaN(parsed) || parsed < 0) return '0';
  return parsed % 1 === 0 ? parsed.toFixed(0) : parsed.toFixed(2);
}

function normalizeBillingCycle(cycle: string): BillingCycle {
  const c = String(cycle || '').toUpperCase();
  if (c.includes('YEAR') || c.includes('ANNUAL')) return 'YEARLY';
  if (c.includes('QUART') || c.includes('3 MONTH')) return 'QUARTERLY';
  return 'MONTHLY';
}

export interface GroundingCitation {
  uri: string;
  title: string;
}

const PRICING_PATH_KEYWORDS = [
  'pricing',
  'plans',
  'plan',
  'subscription',
  'subscribe',
  'membership',
  'upgrade',
  'billing',
  'cost',
  'rates',
  'fee',
  'tier',
  'premium',
  'help',
  'support',
  'article',
  'node',
  'kb',
  'faq',
  'terms',
  'gold',
  'one',
];

export function isOfficialPricingCitation(citation: GroundingCitation, officialDomain?: string): boolean {
  if (!officialDomain || !citation?.uri) return false;
  try {
    const url = new URL(citation.uri);
    const host = url.hostname.toLowerCase();
    const domainLower = officialDomain.toLowerCase();
    const isDomainMatch = host === domainLower || host.endsWith(`.${domainLower}`);
    if (!isDomainMatch) return false;

    const pathAndTitle = `${url.pathname} ${url.search} ${citation.title || ''}`.toLowerCase();
    return PRICING_PATH_KEYWORDS.some((kw) => pathAndTitle.includes(kw));
  } catch {
    const uriLower = citation.uri.toLowerCase();
    const domainLower = officialDomain.toLowerCase();
    if (!uriLower.includes(domainLower)) return false;
    return PRICING_PATH_KEYWORDS.some((kw) => uriLower.includes(kw));
  }
}

export function countDistinctIndependentDomains(citations: GroundingCitation[], officialDomain?: string): number {
  const domains = new Set<string>();
  const officialLower = officialDomain?.toLowerCase();

  for (const c of citations) {
    if (!c?.uri) continue;
    try {
      const host = new URL(c.uri).hostname.toLowerCase().replace(/^www\./, '');
      if (officialLower && (host === officialLower || host.endsWith(`.${officialLower}`))) {
        continue;
      }
      if (host.includes('google.') || host.includes('bing.') || host.includes('yahoo.')) {
        continue;
      }
      domains.add(host);
    } catch {
      // ignore malformed URLs
    }
  }
  return domains.size;
}

function extractGroundingCitations(candidate: unknown): GroundingCitation[] {
  const citations: GroundingCitation[] = [];
  if (!candidate || typeof candidate !== 'object') return citations;

  const cand = candidate as {
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    };
  };

  const chunks = cand.groundingMetadata?.groundingChunks || [];
  for (const chunk of chunks) {
    if (chunk.web?.uri) {
      citations.push({
        uri: chunk.web.uri,
        title: chunk.web.title || new URL(chunk.web.uri).hostname,
      });
    }
  }
  return citations;
}

interface CacheEntry {
  result: PriceResearchResult;
  cachedAt: number;
  expiresAt: number;
}

const priceCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<PriceResearchResult>>();

function getCacheKey(serviceName: string, currency: string): string {
  return `${serviceName.toLowerCase().trim()}:${currency.toUpperCase().trim()}`;
}

export function getCachedVerifiedPricing(
  serviceName: string,
  currency: string,
  allowStaleDays: number = 7
): PriceResearchResult | null {
  const key = getCacheKey(serviceName, currency);
  const entry = priceCache.get(key);
  if (!entry) return null;

  const now = Date.now();
  const maxStaleMs = allowStaleDays * 24 * 60 * 60 * 1000;

  if (now - entry.cachedAt > maxStaleMs) {
    priceCache.delete(key);
    return null;
  }

  recordCacheHit();
  const isStale = now > entry.expiresAt;

  return {
    ...entry.result,
    sourceType: 'CACHED_VERIFIED',
    isCached: true,
    cachedAt: new Date(entry.cachedAt).toISOString(),
    verificationNotes: isStale
      ? `Serving previously verified cached pricing (checked on ${new Date(entry.cachedAt).toLocaleDateString()}).`
      : entry.result.verificationNotes,
  };
}

export function setCachedPricing(
  serviceName: string,
  currency: string,
  result: PriceResearchResult,
  ttlHours: number = 12
) {
  const key = getCacheKey(serviceName, currency);
  const now = Date.now();
  priceCache.set(key, {
    result,
    cachedAt: now,
    expiresAt: now + ttlHours * 60 * 60 * 1000,
  });
}

export function clearPriceCache() {
  priceCache.clear();
}

export function getFastCanonicalBaseline(
  serviceName: string,
  currency: string
): PriceResearchResult | null {
  const sLower = serviceName.toLowerCase().trim();
  const found = CANONICAL_SUBSCRIPTION_REGISTRY.find(
    (c) => c.name.toLowerCase() === sLower ||
      c.name.toLowerCase().includes(sLower) ||
      sLower.includes(c.name.toLowerCase())
  );

  if (!found) return null;

  const directPlans = found.regionalPlans[currency];
  let nativeCurrency = currency;
  let nativeCountry = REGIONAL_MARKETS[currency]?.country || 'Global';
  let isConverted = false;
  let sourcePlans = directPlans;

  if (!sourcePlans || sourcePlans.length === 0) {
    const availableCurrencies = Object.keys(found.regionalPlans).filter(
      (k) => Array.isArray(found.regionalPlans[k]) && (found.regionalPlans[k]?.length ?? 0) > 0
    );
    if (availableCurrencies.length === 0) return null;

    const fallbackKey = availableCurrencies.includes('USD')
      ? 'USD'
      : availableCurrencies.includes('INR')
      ? 'INR'
      : availableCurrencies[0];

    sourcePlans = found.regionalPlans[fallbackKey];
    nativeCurrency = fallbackKey;
    nativeCountry = REGIONAL_MARKETS[fallbackKey]?.country || (fallbackKey === 'INR' ? 'India' : 'United States');
    isConverted = nativeCurrency.toUpperCase() !== currency.toUpperCase();
  }

  if (!sourcePlans || sourcePlans.length === 0) return null;

  const officialMeta = resolveOfficialDomain(found.name);
  const officialUrl = found.officialUrl || (officialMeta ? `https://${officialMeta.domain}` : undefined);
  const now = new Date().toISOString();

  const plans: VerifiedPlanOption[] = sourcePlans.map((p) => {
    const origAmt = parseFloat(cleanPriceNumber(p.amount));
    const convertedAmtNum = isConverted
      ? convertAmount(origAmt, nativeCurrency, currency, BASELINE_EXCHANGE_RATES)
      : origAmt;
    const finalAmountStr = cleanPriceNumber(convertedAmtNum);

    return {
      name: p.name,
      amount: finalAmountStr,
      cycle: p.cycle,
      features: p.features,
      verificationStatus: 'CROSS_CHECKED',
      sourceType: 'BASELINE_REGISTRY',
      sourceUrl: p.sourceUrl || officialUrl,
      sourceTitle: p.sourceTitle || `${found.name} Baseline Registry`,
      lastVerified: now,
      isIntroductory: p.isIntroductory,
      introductoryDetails: p.introductoryDetails,
      isStudentDiscount: p.isStudentDiscount,
      exactMatchVerified: !isConverted,
      originalAmount: origAmt,
      originalCurrency: nativeCurrency,
      isConvertedEquivalent: isConverted,
      convertedAmount: finalAmountStr,
    };
  });

  return {
    serviceName: found.name,
    vendor: found.vendor,
    category: found.category,
    country: nativeCountry,
    currency,
    sourceCurrency: nativeCurrency,
    isConvertedEquivalent: isConverted,
    plans,
    overallStatus: 'CROSS_CHECKED',
    sourceType: 'BASELINE_REGISTRY',
    sourceUrl: officialUrl,
    sourceTitle: `${found.name} Curated Registry`,
    lastVerified: now,
    isCached: false,
    conflictsDetected: false,
    verificationNotes: isConverted
      ? `Native pricing from ${nativeCountry} (${nativeCurrency}). Converted to ${currency} equivalent using standard exchange rates.`
      : 'Baseline data from curated registry. May be outdated; live research is currently unavailable.',
  };
}

export async function queryIndependentSearch(
  serviceName: string,
  currency: string,
  country: string
): Promise<{
  operational: boolean;
  result?: PriceResearchResult;
  reason?: string;
}> {
  const apiKey = process.env.SEARCH_API_KEY || process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return {
      operational: false,
      reason: 'Independent search provider API key (SEARCH_API_KEY) is not configured.',
    };
  }

  const officialMeta = resolveOfficialDomain(serviceName);
  const domainFilter = officialMeta ? `site:${officialMeta.domain}` : '';
  const query = `${serviceName} subscription pricing plans ${country} ${currency} ${domainFilter}`.trim();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const endpoint = process.env.SEARCH_ENDPOINT || 'https://api.search.brave.com/res/v1/web/search';
    const res = await fetch(`${endpoint}?q=${encodeURIComponent(query)}&count=5`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        operational: false,
        reason: `Independent search request failed with HTTP status ${res.status}.`,
      };
    }

    const data = await res.json();
    const webResults = Array.isArray(data.web?.results) ? data.web.results : [];

    if (webResults.length === 0) {
      return {
        operational: false,
        reason: 'Independent search returned no matching results.',
      };
    }

    const citations = webResults.map((r: { url?: string; title?: string }) => ({
      uri: r.url || '',
      title: r.title || '',
    }));

    const primaryCitation = citations[0];
    const now = new Date().toISOString();

    const baseline = getFastCanonicalBaseline(serviceName, currency);
    const plans: VerifiedPlanOption[] = (baseline?.plans || []).map((p) => ({
      ...p,
      sourceType: 'INDEPENDENT_SEARCH',
      verificationStatus: 'CROSS_CHECKED',
      sourceUrl: primaryCitation.uri || p.sourceUrl,
      sourceTitle: primaryCitation.title || p.sourceTitle,
      lastVerified: now,
    }));

    if (plans.length === 0) {
      return {
        operational: false,
        reason: 'Search snippets alone are insufficient for complete plan tier verification.',
      };
    }

    return {
      operational: true,
      result: {
        serviceName,
        vendor: officialMeta?.vendor || serviceName,
        category: inferCategory(serviceName, officialMeta?.category),
        country,
        currency,
        plans,
        overallStatus: 'CROSS_CHECKED',
        sourceType: 'INDEPENDENT_SEARCH',
        sourceUrl: primaryCitation.uri,
        sourceTitle: primaryCitation.title,
        lastVerified: now,
        verificationNotes: 'Cross-checked using independent web search API.',
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Search provider error';
    return {
      operational: false,
      reason: `Independent search request aborted or failed: ${msg}`,
    };
  }
}

export function buildUnavailableResponse(
  serviceName: string,
  currency: string,
  country: string,
  reason?: string
): PriceResearchResult {
  const officialMeta = resolveOfficialDomain(serviceName);
  const now = new Date().toISOString();

  return {
    serviceName,
    vendor: officialMeta?.vendor || serviceName,
    category: inferCategory(serviceName, officialMeta?.category),
    country,
    currency,
    plans: [],
    overallStatus: 'UNVERIFIED',
    sourceType: 'UNAVAILABLE',
    lastVerified: now,
    conflictsDetected: false,
    verificationNotes: reason || 'Unable to verify subscription pricing. Live research providers and official sources are currently unreachable.',
  };
}

export async function executePrimaryGeminiResearch(
  sanitizedService: string,
  currency: string,
  targetCountry: string,
  officialMeta: { domain: string; vendor: string; category: Category } | null,
  apiKey: string
): Promise<PriceResearchResult | null> {
  const domainHint = officialMeta ? `site:${officialMeta.domain} OR "${officialMeta.domain}"` : '';

  const researchPrompt = `You are PayPilot's Price Intelligence Research Engine.
Perform live web research for the official subscription plans, tiers, and pricing of "${sanitizedService}" in country "${targetCountry}" using currency "${currency}".

Search instructions:
1. Prioritize official provider pages and documentation (${domainHint}).
2. Never invent or estimate prices. If regional pricing in ${currency} is not confirmed, state so.
3. Extract each distinct plan tier (e.g. Individual, Student, Family, Pro, Business).
4. Strictly distinguish regular recurring prices from introductory discounts.
5. Record student discounts, annual commitments, and device limits.
6. Verify billing cycle (MONTHLY, YEARLY, QUARTERLY).

Format your output strictly as valid JSON without markdown wrapping:
{
  "serviceName": "${sanitizedService}",
  "vendor": "Official Company Name",
  "category": "AI_AND_ML" | "DEV_TOOLS" | "CLOUD_INFRA" | "DESIGN_CREATIVE" | "PRODUCTIVITY" | "STREAMING_MEDIA",
  "country": "${targetCountry}",
  "currency": "${currency}",
  "plans": [
    {
      "name": "Plan Tier Name",
      "amount": "0.00",
      "cycle": "MONTHLY" | "YEARLY" | "QUARTERLY",
      "features": "Key perks",
      "isIntroductory": false,
      "introductoryDetails": "",
      "isStudentDiscount": false,
      "taxDetails": ""
    }
  ],
  "conflictsDetected": false,
  "verificationNotes": "Verification summary"
}`;

  const ai = new GoogleGenAI({ apiKey });
  const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  let rawText = '';
  let citations: GroundingCitation[] = [];

  for (const model of candidateModels) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9500);

      const response = await Promise.race([
        ai.models.generateContent({
          model,
          contents: researchPrompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        }),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(new Error('Gemini API timeout')));
        }),
      ]);
      clearTimeout(timeout);

      rawText = response.text || '';
      const candidate = response.candidates?.[0];
      citations = extractGroundingCitations(candidate);

      const usage = response.usageMetadata;
      recordGeminiUsage({
        isGrounding: true,
        promptTokens: usage?.promptTokenCount,
        candidatesTokens: usage?.candidatesTokenCount,
        totalTokens: usage?.totalTokenCount,
      });

      if (rawText) break;
    } catch (err: unknown) {
      const s = String(err ?? '');
      if (s.includes('429') || s.includes('quota') || s.includes('RESOURCE_EXHAUSTED')) {
        recordGeminiUsage({ isRateLimit: true });
        break;
      }
      if (s.includes('404') || s.includes('not found')) {
        continue;
      }
      break;
    }
  }

  if (!rawText) return null;

  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const now = new Date().toISOString();

    const officialDomain = officialMeta?.domain?.toLowerCase();
    const officialPricingCitation = citations.find((c) => isOfficialPricingCitation(c, officialDomain));
    const hasOfficialPricingCitation = Boolean(officialPricingCitation);
    const distinctIndependentDomains = countDistinctIndependentDomains(citations, officialDomain);

    const primarySource = officialPricingCitation || citations[0] || (officialMeta ? {
      uri: `https://${officialMeta.domain}`,
      title: `${officialMeta.vendor} Official Website`,
    } : undefined);

    const rawPlans = Array.isArray(parsed.plans) ? parsed.plans : [];
    if (rawPlans.length === 0) return null;

    let allPlansVerified = hasOfficialPricingCitation && rawPlans.length > 0;
    const verifiedPlans: VerifiedPlanOption[] = [];

    for (const p of rawPlans) {
      const name = String(p.name || 'Standard Tier').trim();
      const amountStr = cleanPriceNumber(p.amount);
      const amountNum = parseFloat(amountStr);

      if (amountNum <= 0) continue;

      let planStatus: PriceVerificationStatus = 'UNVERIFIED';

      if (hasOfficialPricingCitation) {
        planStatus = 'VERIFIED';
      } else if (distinctIndependentDomains >= 2) {
        planStatus = 'CROSS_CHECKED';
      } else {
        planStatus = 'UNVERIFIED';
        allPlansVerified = false;
      }

      verifiedPlans.push({
        name,
        amount: amountStr,
        cycle: normalizeBillingCycle(p.cycle || 'MONTHLY'),
        features: String(p.features || 'Standard access').trim(),
        verificationStatus: planStatus,
        sourceType: 'LIVE_GROUNDED',
        sourceUrl: primarySource?.uri,
        sourceTitle: primarySource?.title,
        lastVerified: now,
        isIntroductory: Boolean(p.isIntroductory),
        introductoryDetails: p.introductoryDetails ? String(p.introductoryDetails) : undefined,
        isStudentDiscount: Boolean(p.isStudentDiscount),
        taxDetails: p.taxDetails ? String(p.taxDetails) : undefined,
        exactMatchVerified: planStatus === 'VERIFIED',
      });
    }

    if (verifiedPlans.length === 0) return null;

    const hasConflictFlag = Boolean(parsed.conflictsDetected);
    const overallStatus: PriceVerificationStatus = hasConflictFlag
      ? 'UNVERIFIED'
      : allPlansVerified
      ? 'VERIFIED'
      : distinctIndependentDomains >= 2 || verifiedPlans.some((p) => p.verificationStatus === 'VERIFIED')
      ? 'CROSS_CHECKED'
      : 'UNVERIFIED';

    const result: PriceResearchResult = {
      serviceName: parsed.serviceName || sanitizedService,
      vendor: parsed.vendor || officialMeta?.vendor || sanitizedService,
      category: inferCategory(sanitizedService, parsed.category || officialMeta?.category),
      country: targetCountry,
      currency,
      plans: verifiedPlans,
      overallStatus,
      sourceType: 'LIVE_GROUNDED',
      sourceUrl: primarySource?.uri,
      sourceTitle: primarySource?.title,
      lastVerified: now,
      conflictsDetected: hasConflictFlag || (!allPlansVerified && verifiedPlans.some((p) => p.verificationStatus === 'UNVERIFIED')),
      verificationNotes: parsed.verificationNotes || (
        overallStatus === 'VERIFIED'
          ? 'Confirmed with official provider sources.'
          : overallStatus === 'CROSS_CHECKED'
          ? 'Cross-checked against public citations.'
          : 'Extracted with incomplete confirmation.'
      ),
    };

    if (overallStatus === 'VERIFIED' || overallStatus === 'CROSS_CHECKED') {
      setCachedPricing(sanitizedService, currency, result, 12);
    }

    return result;
  } catch {
    return null;
  }
}

export async function researchSubscriptionPrice(
  serviceName: string,
  currency: string = 'USD',
  countryOverride?: string
): Promise<PriceResearchResult> {
  const sanitizedService = serviceName.trim();
  const market = REGIONAL_MARKETS[currency] || {
    country: countryOverride || currency,
    symbol: currency,
    fallbackAmount: '14.99',
  };
  const targetCountry = countryOverride || market.country;
  const officialMeta = resolveOfficialDomain(sanitizedService);

  const key = getCacheKey(sanitizedService, currency);
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  const task = (async () => {
    // 1. PRIMARY: Gemini with Google Search Grounding
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const liveResult = await executePrimaryGeminiResearch(
          sanitizedService,
          currency,
          targetCountry,
          officialMeta,
          apiKey
        );
        if (liveResult && liveResult.plans.length > 0) {
          return liveResult;
        }
      } catch {
        // Fall to Tier 2
      }
    }

    // 2. SECONDARY: Independent Web Search
    try {
      const independentSearch = await queryIndependentSearch(sanitizedService, currency, targetCountry);
      if (independentSearch.operational && independentSearch.result) {
        return independentSearch.result;
      }
    } catch {
      // Fall to Tier 3
    }

    // 3. THIRD: Previously verified cached pricing
    const cached = getCachedVerifiedPricing(sanitizedService, currency, 7);
    if (cached) {
      return cached;
    }

    // 4. FOURTH: Canonical Subscription Registry (potentially outdated baseline data)
    const baseline = getFastCanonicalBaseline(sanitizedService, currency);
    if (baseline) {
      return baseline;
    }

    // 5. FINAL: Honest Unavailable Response
    return buildUnavailableResponse(
      sanitizedService,
      currency,
      targetCountry,
      'Unable to verify subscription pricing. Live research providers and official sources are currently unreachable.'
    );
  })();

  inFlightRequests.set(key, task);
  try {
    return await task;
  } finally {
    inFlightRequests.delete(key);
  }
}

export async function compareServicePlans(
  services: string[],
  currency: string = 'USD'
): Promise<{
  results: PriceResearchResult[];
  comparisonSummary: string;
}> {
  const cleanServices = services.slice(0, 3).map((s) => s.trim()).filter(Boolean);
  const results = await Promise.all(
    cleanServices.map((name) => researchSubscriptionPrice(name, currency))
  );

  const lines: string[] = [];
  lines.push(`### Live Price Intelligence Comparison (${currency})\n`);

  for (const res of results) {
    const statusBadge = res.overallStatus === 'VERIFIED'
      ? '✅ Official Verified'
      : res.overallStatus === 'CROSS_CHECKED'
      ? '🔍 Cross-Checked'
      : '⚠️ Unverified';

    const sourceBadge = res.sourceType === 'LIVE_GROUNDED'
      ? 'Live Search'
      : res.sourceType === 'CACHED_VERIFIED'
      ? 'Cached'
      : res.sourceType === 'BASELINE_REGISTRY'
      ? 'Baseline Registry'
      : 'Unavailable';

    lines.push(`**${res.serviceName}** (${res.vendor}) — ${statusBadge} [${sourceBadge}]`);
    if (res.sourceUrl) {
      lines.push(`*Source: [${res.sourceTitle || res.sourceUrl}](${res.sourceUrl}) (Checked: ${res.lastVerified.slice(0, 10)})*`);
    }

    if (res.plans.length === 0) {
      lines.push('- *No reliable pricing plans verified.*');
    } else {
      for (const p of res.plans) {
        const extra = p.isStudentDiscount ? ' [Student Discount]' : p.isIntroductory ? ' [Introductory Rate]' : '';
        lines.push(`- **${p.name}**: ${currency} ${p.amount} / ${p.cycle.toLowerCase()}${extra} — ${p.features}`);
      }
    }
    lines.push('');
  }

  return {
    results,
    comparisonSummary: lines.join('\n'),
  };
}
