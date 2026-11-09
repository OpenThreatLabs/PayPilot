import { NextResponse } from 'next/server';
import { 
  cancelPayPalSubscription, 
  suspendPayPalSubscription, 
  activatePayPalSubscription,
  getPayPalSubscriptionDetails,
  createPayPalSubscription,
} from '@/lib/paypal';
import { checkRateLimit, getClientIp, sanitizeUserText } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(clientIp, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Please retry in ${rateLimit.resetInSec} seconds.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetInSec) } }
      );
    }

    const body = await req.json();
    const action = typeof body.action === 'string' ? body.action.toUpperCase() : '';
    const subscriptionId = typeof body.subscriptionId === 'string' ? sanitizeUserText(body.subscriptionId, 120) : '';
    const reason = typeof body.reason === 'string' ? sanitizeUserText(body.reason, 256) : undefined;

    // Handle Subscription Creation
    if (action === 'CREATE') {
      const { name, amount, billingCycle, vendor, currency, returnUrl, cancelUrl, subscriberEmail } = body;

      if (!name || typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(
          { error: 'Valid service name and positive amount are required to create a subscription.' },
          { status: 400 }
        );
      }

      const cycle = ['MONTHLY', 'YEARLY', 'QUARTERLY'].includes(billingCycle) ? billingCycle : 'MONTHLY';

      const createResult = await createPayPalSubscription({
        name: sanitizeUserText(name, 120),
        vendor: vendor ? sanitizeUserText(vendor, 120) : undefined,
        amount: Math.round(amount * 100) / 100,
        currency: currency || 'USD',
        billingCycle: cycle,
        returnUrl,
        cancelUrl,
        subscriberEmail: typeof subscriberEmail === 'string' ? sanitizeUserText(subscriberEmail, 120) : undefined,
      });

      return NextResponse.json(createResult);
    }

    // Other actions require subscriptionId
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId parameter is required for this action.' }, 
        { status: 400 }
      );
    }

    if (action === 'CANCEL') {
      const result = await cancelPayPalSubscription(subscriptionId, reason);
      return NextResponse.json(result);
    }

    if (action === 'SUSPEND') {
      const result = await suspendPayPalSubscription(subscriptionId, reason);
      return NextResponse.json(result);
    }

    if (action === 'ACTIVATE') {
      const result = await activatePayPalSubscription(subscriptionId, reason);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: `Unsupported action: ${action}. Allowed: CREATE, CANCEL, SUSPEND, ACTIVATE` }, 
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(clientIp, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Please retry in ${rateLimit.resetInSec} seconds.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetInSec) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get('subscriptionId');

    if (!rawId) {
      return NextResponse.json({ error: 'subscriptionId parameter required' }, { status: 400 });
    }

    const subscriptionId = sanitizeUserText(rawId, 120);
    const details = await getPayPalSubscriptionDetails(subscriptionId);
    return NextResponse.json(details);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
