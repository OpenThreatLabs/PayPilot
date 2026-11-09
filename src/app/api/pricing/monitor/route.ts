import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, sanitizeUserText } from '@/lib/security';
import { batchAuditSubscriptionPrices } from '@/lib/priceTracking';
import { Subscription } from '@/types';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, 20, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Monitoring rate limit reached. Please wait ${rateCheck.resetInSec}s.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const rawSubs = Array.isArray(body?.subscriptions) ? body.subscriptions : [];
    const currency = sanitizeUserText(body?.currency || 'USD', 10).toUpperCase();

    if (rawSubs.length === 0) {
      return NextResponse.json({ error: 'No subscriptions provided for monitoring' }, { status: 400 });
    }

    // Limit batch size to protect compute
    const sanitizedSubs = rawSubs.slice(0, 15) as Subscription[];

    const { updatedSubscriptions, report } = await batchAuditSubscriptionPrices(sanitizedSubs, currency);

    return NextResponse.json({
      updatedSubscriptions,
      report,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Price monitoring audit failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

