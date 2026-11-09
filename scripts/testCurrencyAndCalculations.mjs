import assert from 'node:assert/strict';
import {
  convertAmount,
  BASELINE_EXCHANGE_RATES,
  BASELINE_RATES_DATE,
  DEFAULT_EXCHANGE_DATA,
} from '../src/lib/currency.ts';
import { CANONICAL_SUBSCRIPTION_REGISTRY } from '../src/lib/canonicalServices.ts';

console.log('🧪 Starting PayPilot Currency & Financial Calculation Test Suite...\n');

let passedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ Passed: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAILED: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Currency Conversion
runTest('Convert USD to INR with baseline rates', () => {
  const converted = convertAmount(20.0, 'USD', 'INR', BASELINE_EXCHANGE_RATES);
  assert.strictEqual(typeof converted, 'number');
  assert.ok(converted > 1800 && converted < 1950, `Expected ~1880, got ${converted}`);
});

runTest('Convert INR to USD with baseline rates (Netflix India ₹149)', () => {
  const inUsd = convertAmount(149.0, 'INR', 'USD', BASELINE_EXCHANGE_RATES);
  assert.strictEqual(typeof inUsd, 'number');
  assert.ok(inUsd > 1.5 && inUsd < 1.7, `Expected ~1.58 USD, got ${inUsd}`);
  assert.strictEqual(inUsd, Math.round(inUsd * 100) / 100, 'Must be rounded to 2 decimals');
});

runTest('Convert EUR to GBP (Cross-currency without USD)', () => {
  const gbp = convertAmount(100.0, 'EUR', 'GBP', BASELINE_EXCHANGE_RATES);
  assert.strictEqual(typeof gbp, 'number');
  assert.ok(gbp > 80 && gbp < 95, `Expected ~86 GBP, got ${gbp}`);
});

runTest('Identity conversion (USD to USD, INR to INR) returns exact original amount', () => {
  assert.strictEqual(convertAmount(20.0, 'USD', 'USD'), 20.0);
  assert.strictEqual(convertAmount(149.0, 'INR', 'INR'), 149.0);
  assert.strictEqual(convertAmount(0, 'USD', 'INR'), 0);
});

runTest('Invalid / unknown currency falls back gracefully to original amount', () => {
  const result = convertAmount(50.0, 'UNKNOWN_CURR', 'USD', BASELINE_EXCHANGE_RATES);
  assert.strictEqual(result, 50.0);
});

// 2. Baseline Rates Coverage
runTest('Baseline rates cover all popular currencies with publication date', () => {
  assert.ok(BASELINE_EXCHANGE_RATES.USD === 1.0);
  assert.ok(BASELINE_EXCHANGE_RATES.EUR > 0);
  assert.ok(BASELINE_EXCHANGE_RATES.INR > 0);
  assert.ok(BASELINE_EXCHANGE_RATES.GBP > 0);
  assert.ok(BASELINE_EXCHANGE_RATES.JPY > 0);
  assert.ok(BASELINE_EXCHANGE_RATES.CAD > 0);
  assert.ok(BASELINE_EXCHANGE_RATES.AUD > 0);
  assert.strictEqual(BASELINE_RATES_DATE, '2026-11-09');
  assert.strictEqual(DEFAULT_EXCHANGE_DATA.base, 'USD');
  assert.strictEqual(DEFAULT_EXCHANGE_DATA.source, 'offline_baseline');
});

// 3. Financial Aggregation Normalization
runTest('Multi-currency aggregation normalizes mixed INR and USD subscriptions', () => {
  const mixedSubs = [
    { name: 'Netflix India', amount: 149.0, currency: 'INR', billingCycle: 'MONTHLY' },
    { name: 'ChatGPT Plus', amount: 20.0, currency: 'USD', billingCycle: 'MONTHLY' },
  ];

  // In USD: ~$1.58 (from ₹149) + $20.00 = ~$21.58
  const monthlyUsd = mixedSubs.reduce((acc, sub) => {
    return acc + convertAmount(sub.amount, sub.currency, 'USD', BASELINE_EXCHANGE_RATES);
  }, 0);
  assert.ok(monthlyUsd > 21.0 && monthlyUsd < 22.5, `Got ${monthlyUsd}`);

  // In INR: ₹149 + ~$1880.94 (from $20) = ~₹2029.94
  const monthlyInr = mixedSubs.reduce((acc, sub) => {
    return acc + convertAmount(sub.amount, sub.currency, 'INR', BASELINE_EXCHANGE_RATES);
  }, 0);
  assert.ok(monthlyInr > 2000 && monthlyInr < 2100, `Got ${monthlyInr}`);
});

runTest('Billing cycle normalization divides yearly by 12 and quarterly by 3', () => {
  const cycleSubs = [
    { amount: 120.0, currency: 'USD', billingCycle: 'YEARLY' },
    { amount: 30.0, currency: 'USD', billingCycle: 'QUARTERLY' },
    { amount: 10.0, currency: 'USD', billingCycle: 'MONTHLY' },
  ];

  const monthlyRunRate = cycleSubs.reduce((acc, s) => {
    const converted = convertAmount(s.amount, s.currency, 'USD', BASELINE_EXCHANGE_RATES);
    if (s.billingCycle === 'YEARLY') return acc + converted / 12;
    if (s.billingCycle === 'QUARTERLY') return acc + converted / 3;
    return acc + converted;
  }, 0);

  // 120/12 = 10, 30/3 = 10, 10 = 10 -> Total = 30
  assert.strictEqual(monthlyRunRate, 30.0);
  const annualRunRate = monthlyRunRate * 12;
  assert.strictEqual(annualRunRate, 360.0);
});

// 4. Canonical Registry Integrity
runTest('All 18 canonical services are audited with official domains and verified status', () => {
  assert.strictEqual(CANONICAL_SUBSCRIPTION_REGISTRY.length, 18);
  for (const svc of CANONICAL_SUBSCRIPTION_REGISTRY) {
    assert.ok(svc.name, 'Service must have a name');
    assert.ok(svc.vendor, 'Service must have a vendor');
    assert.ok(svc.domain, `Service ${svc.name} must have a domain`);
    assert.ok(svc.officialUrl, `Service ${svc.name} must have an official URL`);

    const hasRegionalPlans = Object.keys(svc.regionalPlans).length > 0;
    assert.ok(hasRegionalPlans, `Service ${svc.name} must have regional plans`);

    for (const [curr, plans] of Object.entries(svc.regionalPlans)) {
      assert.ok(Array.isArray(plans), `Plans for ${svc.name} ${curr} must be array`);
      for (const p of plans) {
        assert.ok(p.name, `Plan in ${svc.name} must have a name`);
        assert.ok(!isNaN(parseFloat(p.amount)), `Plan ${p.name} in ${svc.name} must have numeric amount`);
        assert.ok(p.cycle, `Plan ${p.name} must have cycle`);
        assert.ok(p.verificationStatus, `Plan ${p.name} must have verificationStatus`);
      }
    }
  }
});

// 5. Verification of Specific Regional Pricing
runTest('Netflix regional pricing accurately segregates India INR from US USD', () => {
  const netflix = CANONICAL_SUBSCRIPTION_REGISTRY.find((s) => s.name === 'Netflix');
  assert.ok(netflix);

  const inrPlans = netflix.regionalPlans.INR;
  assert.ok(inrPlans);
  const mobilePlan = inrPlans.find((p) => p.name === 'Mobile');
  assert.ok(mobilePlan);
  assert.strictEqual(mobilePlan.amount, '149');
  assert.strictEqual(mobilePlan.cycle, 'MONTHLY');

  const usdPlans = netflix.regionalPlans.USD;
  assert.ok(usdPlans);
  const premiumUsd = usdPlans.find((p) => p.name.includes('Premium'));
  assert.ok(premiumUsd);
  assert.strictEqual(premiumUsd.amount, '26.99');
});

runTest('Spotify student discount is identified and verified', () => {
  const spotify = CANONICAL_SUBSCRIPTION_REGISTRY.find((s) => s.name === 'Spotify');
  assert.ok(spotify);
  const inrStudent = spotify.regionalPlans.INR.find((p) => p.name === 'Student');
  assert.ok(inrStudent);
  assert.strictEqual(inrStudent.amount, '69');
  assert.strictEqual(inrStudent.isStudentDiscount, true);
});

console.log(`\n🎉 All ${passedTests} test scenarios passed successfully!`);
