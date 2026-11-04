import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { event, subscription, timestamp } = await req.json();

    const webhookUrl = process.env.ZAPIER_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json({
        success: true,
        dispatched: false,
        message: 'No ZAPIER_WEBHOOK_URL configured, recorded in local webhook stream',
        payload: { event, subscription, timestamp: timestamp || new Date().toISOString() }
      });
    }

    const zapierResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'PayPilot_PayPal_Spend_Guardian',
        event,
        subscription,
        dispatchedAt: new Date().toISOString()
      })
    });

    return NextResponse.json({
      success: true,
      dispatched: zapierResponse.ok,
      status: zapierResponse.status
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
