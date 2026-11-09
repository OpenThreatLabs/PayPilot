export const PAYPAL_SUPPORTED_BILLING_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'HKD', 'SGD', 'SEK', 
  'NOK', 'DKK', 'PLN', 'HUF', 'CZK', 'ILS', 'MXN', 'BRL', 'MYR', 'PHP', 
  'TWD', 'THB', 'NZD'
]);
interface PayPalAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedAuth: CachedToken | null = null;

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

export async function getPayPalAccessToken(forceRefresh = false): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return 'mock_sandbox_access_token_paypilot';
  }

  const now = Date.now();
  if (!forceRefresh && cachedAuth && cachedAuth.expiresAt > now + 60000) {
    return cachedAuth.token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      console.warn(`[PayPal OAuth] Request failed with status ${response.status}: ${response.statusText}`);
      return 'mock_sandbox_access_token_paypilot';
    }

    const data: PayPalAuthResponse = await response.json();
    cachedAuth = {
      token: data.access_token,
      expiresAt: now + (data.expires_in * 1000),
    };
    return data.access_token;
  } catch (error) {
    console.warn('[PayPal OAuth] Connection error:', error instanceof Error ? error.message : error);
    return 'mock_sandbox_access_token_paypilot';
  }
}

export interface CreateSubscriptionParams {
  name: string;
  subscriberEmail?: string;
  vendor?: string;
  description?: string;
  amount: number;
  currency?: string;
  billingCycle: 'MONTHLY' | 'YEARLY' | 'QUARTERLY';
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CreateSubscriptionResult {
  success: boolean;
  subscriptionId: string;
  planId: string;
  status: 'APPROVAL_PENDING' | 'ACTIVE' | 'PENDING';
  approveUrl: string;
  isSandboxLive: boolean;
  mocked?: boolean;
}

export async function createPayPalSubscription(
  params: CreateSubscriptionParams
): Promise<CreateSubscriptionResult> {
  const token = await getPayPalAccessToken();
  let currency = (params.currency || 'USD').toUpperCase();
  let amountStr = params.amount.toFixed(2);

  if (!PAYPAL_SUPPORTED_BILLING_CURRENCIES.has(currency)) {
    currency = 'USD';
  }

  if (token === 'mock_sandbox_access_token_paypilot') {
    const simId = `I-PP-SBX-${Math.floor(100000 + Math.random() * 900000)}`;
    const returnUrl = params.returnUrl || 'http://localhost:3000';
    const approveUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}paypal_sandbox_approval=${simId}&status=approved`;

    return {
      success: true,
      subscriptionId: simId,
      planId: `P-SBX-${Math.floor(10000 + Math.random() * 90000)}`,
      status: 'APPROVAL_PENDING',
      approveUrl,
      isSandboxLive: false,
      mocked: true,
    };
  }

  const productRes = await fetch(`${PAYPAL_API_BASE}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    },
    body: JSON.stringify({
      name: params.name.slice(0, 127),
      description: (params.description || `${params.name} subscription managed by PayPilot`).slice(0, 256),
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  });

  if (!productRes.ok) {
    const errText = await productRes.text();
    throw new Error(`Failed to create PayPal catalog product (${productRes.status}): ${errText}`);
  }

  const productData = await productRes.json();
  const productId = productData.id;

  const intervalUnit = params.billingCycle === 'YEARLY' ? 'YEAR' : 'MONTH';
  const intervalCount = params.billingCycle === 'QUARTERLY' ? 3 : 1;

  const planRes = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    },
    body: JSON.stringify({
      product_id: productId,
      name: `${params.name} ${params.billingCycle} Plan`,
      description: `Recurring ${params.billingCycle.toLowerCase()} billing for ${params.name}`,
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: intervalUnit,
            interval_count: intervalCount,
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: amountStr,
              currency_code: currency,
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
    }),
  });

  if (!planRes.ok) {
    const errText = await planRes.text();
    throw new Error(`Failed to create PayPal billing plan (${planRes.status}): ${errText}`);
  }

  const planData = await planRes.json();
  const planId = planData.id;

  const returnUrl = params.returnUrl || 'http://localhost:3000';
  const cancelUrl = params.cancelUrl || 'http://localhost:3000';

  const subRes = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    },
    body: JSON.stringify({
      plan_id: planId,
      quantity: '1',
      ...(params.subscriberEmail ? {
        subscriber: {
          email_address: params.subscriberEmail,
        },
      } : {}),
      application_context: {
        brand_name: 'PayPilot',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  if (!subRes.ok) {
    const errText = await subRes.text();
    throw new Error(`Failed to create PayPal subscription (${subRes.status}): ${errText}`);
  }

  const subData = await subRes.json();
  const approveLink = subData.links?.find((l: { rel: string; href: string }) => l.rel === 'approve');

  return {
    success: true,
    subscriptionId: subData.id,
    planId,
    status: subData.status || 'APPROVAL_PENDING',
    approveUrl: approveLink?.href || '',
    isSandboxLive: true,
    mocked: false,
  };
}

export async function getPayPalSubscriptionDetails(subscriptionId: string) {
  if (subscriptionId.startsWith('I-PP-SUB-') || subscriptionId.startsWith('I-PP-SBX-')) {
    return {
      id: subscriptionId,
      status: 'ACTIVE',
      status_update_time: new Date().toISOString(),
      plan_id: 'P-5ML4271244454362WXNWU5NQ',
      start_time: '2026-01-01T00:00:00Z',
      quantity: '1',
      mocked: true,
      dataSource: subscriptionId.startsWith('I-PP-SBX-') ? 'PAYPAL_SANDBOX' : 'DEMO_SEED',
    };
  }

  const token = await getPayPalAccessToken();

  if (token === 'mock_sandbox_access_token_paypilot') {
    return {
      id: subscriptionId,
      status: 'ACTIVE',
      status_update_time: new Date().toISOString(),
      plan_id: 'P-5ML4271244454362WXNWU5NQ',
      start_time: '2026-01-01T00:00:00Z',
      quantity: '1',
      mocked: true,
      dataSource: 'DEMO_SEED',
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
    throw new Error(`Failed to fetch PayPal subscription (${response.status}): ${response.statusText}`);
  }

  const data = await response.json();

  let planDetails: Record<string, any> | null = null;
  let productName: string | null = null;
  if (data.plan_id) {
    try {
      const planRes = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans/${data.plan_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (planRes.ok) {
        planDetails = await planRes.json();
        if (planDetails && planDetails.product_id) {
          const prodRes = await fetch(`${PAYPAL_API_BASE}/v1/catalogs/products/${planDetails.product_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (prodRes.ok) {
            const prodData = await prodRes.json();
            productName = prodData.name;
          }
        }
      }
    } catch {
    }
  }

  const cycles = planDetails?.billing_cycles;
  const regularCycle = Array.isArray(cycles) ? cycles.find((c: { tenure_type: string }) => c.tenure_type === 'REGULAR') || cycles[0] : null;
  const fixedPrice = regularCycle?.pricing_scheme?.fixed_price;
  const intervalUnit = regularCycle?.frequency?.interval_unit;

  return {
    ...data,
    planDetails,
    productName: productName || planDetails?.name,
    planName: planDetails?.name,
    amount: fixedPrice ? parseFloat(fixedPrice.value) : undefined,
    currency: fixedPrice?.currency_code,
    billingCycle: intervalUnit === 'YEAR' ? 'YEARLY' : intervalUnit === 'QUARTER' ? 'QUARTERLY' : 'MONTHLY',
    dataSource: 'PAYPAL_SANDBOX',
    mocked: false,
  };
}

export async function cancelPayPalSubscription(
  subscriptionId: string,
  reason: string = 'Cancelled via PayPilot AI Financial Guardian'
) {
  if (subscriptionId.startsWith('I-PP-SUB-') || subscriptionId.startsWith('I-PP-SBX-')) {
    return {
      success: true,
      subscriptionId,
      status: 'CANCELLED',
      reason,
      executedAt: new Date().toISOString(),
      mocked: true,
      dataSource: subscriptionId.startsWith('I-PP-SBX-') ? 'PAYPAL_SANDBOX' : 'DEMO_SEED',
    };
  }

  const token = await getPayPalAccessToken();

  if (token === 'mock_sandbox_access_token_paypilot') {
    return {
      success: true,
      subscriptionId,
      status: 'CANCELLED',
      reason,
      executedAt: new Date().toISOString(),
      mocked: true,
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
    const errText = await response.text();
    throw new Error(`PayPal subscription cancellation failed (${response.status}): ${errText}`);
  }

  return {
    success: true,
    subscriptionId,
    status: 'CANCELLED',
    reason,
    executedAt: new Date().toISOString(),
    mocked: false,
    dataSource: 'PAYPAL_SANDBOX',
  };
}

export async function suspendPayPalSubscription(
  subscriptionId: string,
  reason: string = 'Paused via PayPilot Autonomous Spend Guardian'
) {
  if (subscriptionId.startsWith('I-PP-SUB-') || subscriptionId.startsWith('I-PP-SBX-')) {
    return {
      success: true,
      subscriptionId,
      status: 'SUSPENDED',
      reason,
      executedAt: new Date().toISOString(),
      mocked: true,
      dataSource: subscriptionId.startsWith('I-PP-SBX-') ? 'PAYPAL_SANDBOX' : 'DEMO_SEED',
    };
  }

  const token = await getPayPalAccessToken();

  if (token === 'mock_sandbox_access_token_paypilot') {
    return {
      success: true,
      subscriptionId,
      status: 'SUSPENDED',
      reason,
      executedAt: new Date().toISOString(),
      mocked: true,
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
    const errText = await response.text();
    throw new Error(`PayPal subscription suspension failed (${response.status}): ${errText}`);
  }

  return {
    success: true,
    subscriptionId,
    status: 'SUSPENDED',
    reason,
    executedAt: new Date().toISOString(),
    mocked: false,
    dataSource: 'PAYPAL_SANDBOX',
  };
}

export async function activatePayPalSubscription(
  subscriptionId: string,
  reason: string = 'Reactivated via PayPilot'
) {
  if (subscriptionId.startsWith('I-PP-SUB-') || subscriptionId.startsWith('I-PP-SBX-')) {
    return {
      success: true,
      subscriptionId,
      status: 'ACTIVE',
      reason,
      executedAt: new Date().toISOString(),
      mocked: true,
    };
  }

  const token = await getPayPalAccessToken();

  if (token === 'mock_sandbox_access_token_paypilot') {
    return {
      success: true,
      subscriptionId,
      status: 'ACTIVE',
      reason,
      executedAt: new Date().toISOString(),
      mocked: true,
    };
  }

  const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}/activate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok && response.status !== 204) {
    const errText = await response.text();
    throw new Error(`PayPal subscription activation failed (${response.status}): ${errText}`);
  }

  return {
    success: true,
    subscriptionId,
    status: 'ACTIVE',
    reason,
    executedAt: new Date().toISOString(),
    mocked: false,
    dataSource: 'PAYPAL_SANDBOX',
  };
}
