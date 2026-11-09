import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, sanitizeUserText, detectPromptInjection } from '@/lib/security';
import { researchSubscriptionPrice } from '@/lib/priceIntelligence';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, 40, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Rate limit reached. Try again in ${rateCheck.resetInSec}s.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const rawQuery = sanitizeUserText(body?.query, 120);
    const currency = sanitizeUserText(body?.currency || 'USD', 10).toUpperCase();
    const country = body?.country ? sanitizeUserText(body.country, 60) : undefined;

    if (!rawQuery || rawQuery.length < 2) {
      return NextResponse.json({ error: 'Service name query too short' }, { status: 400 });
    }

    const injectionCheck = detectPromptInjection(rawQuery);
    if (injectionCheck.suspicious) {
      return NextResponse.json(
        { error: 'Invalid service name input flagged by security filter' },
        { status: 400 }
      );
    }

    const researchResult = await researchSubscriptionPrice(rawQuery, currency, country);

    return NextResponse.json({
      name: researchResult.serviceName,
      vendor: researchResult.vendor,
      category: researchResult.category,
      country: researchResult.country,
      currency: researchResult.currency,
      sourceCurrency: researchResult.sourceCurrency,
      isConvertedEquivalent: researchResult.isConvertedEquivalent,
      plans: researchResult.plans,
      overallStatus: researchResult.overallStatus,
      sourceType: researchResult.sourceType,
      sourceUrl: researchResult.sourceUrl,
      sourceTitle: researchResult.sourceTitle,
      lastVerified: researchResult.lastVerified,
      isCached: researchResult.isCached,
      cachedAt: researchResult.cachedAt,
      conflictsDetected: researchResult.conflictsDetected,
      verificationNotes: researchResult.verificationNotes,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Price intelligence lookup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
