interface PayPalAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return 'mock_sandbox_access_token_paypilot';
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`PayPal OAuth failed: ${response.statusText}`);
  }

  const data: PayPalAuthResponse = await response.json();
  return data.access_token;
}

export async function getPayPalSubscriptionDetails(subscriptionId: string) {
  const token = await getPayPalAccessToken();

  if (token === 'mock_sandbox_access_token_paypilot') {
    return {
      id: subscriptionId,
      status: 'ACTIVE',
      status_update_time: new Date().toISOString(),
      plan_id: 'P-5ML4271244454362WXNWU5NQ',
      start_time: '2026-01-01T00:00:00Z',
      quantity: '1',
      mocked: true
    };
  }

  const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PayPal subscription: ${response.statusText}`);
  }

  return response.json();
}

export async function cancelPayPalSubscription(subscriptionId: string, reason: string = 'Cancelled via PayPilot AI Financial Guardian') {
  const token = await getPayPalAccessToken();

  if (token === 'mock_sandbox_access_token_paypilot') {
    return {
      success: true,
      subscriptionId,
      status: 'CANCELLED',
      reason,
      executedAt: new Date().toISOString(),
      mocked: true
    };
  }

  const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`PayPal subscription cancellation failed: ${response.statusText}`);
  }

  return {
    success: true,
    subscriptionId,
    status: 'CANCELLED',
    reason,
    executedAt: new Date().toISOString(),
    mocked: false
  };
}

export async function suspendPayPalSubscription(subscriptionId: string, reason: string = 'Paused via PayPilot Autonomous Spend Guardian') {
  const token = await getPayPalAccessToken();

  if (token === 'mock_sandbox_access_token_paypilot') {
    return {
      success: true,
      subscriptionId,
      status: 'SUSPENDED',
      reason,
      executedAt: new Date().toISOString(),
      mocked: true
    };
  }

  const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}/suspend`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`PayPal subscription suspension failed: ${response.statusText}`);
  }

  return {
    success: true,
    subscriptionId,
    status: 'SUSPENDED',
    reason,
    executedAt: new Date().toISOString(),
    mocked: false
  };
}
