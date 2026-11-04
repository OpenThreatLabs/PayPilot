import { NextResponse } from 'next/server';
import { 
  cancelPayPalSubscription, 
  suspendPayPalSubscription, 
  getPayPalSubscriptionDetails 
} from '@/lib/paypal';

export async function POST(req: Request) {
  try {
    const { action, subscriptionId, reason } = await req.json();

    if (!action || !subscriptionId) {
      return NextResponse.json(
        { error: 'Missing required parameters action or subscriptionId' }, 
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

    return NextResponse.json(
      { error: `Unsupported action: ${action}` }, 
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId parameter required' }, { status: 400 });
    }

    const details = await getPayPalSubscriptionDetails(subscriptionId);
    return NextResponse.json(details);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
