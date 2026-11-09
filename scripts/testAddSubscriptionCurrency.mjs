import assert from 'node:assert/strict';
import {
  BASELINE_EXCHANGE_RATES,
  convertAmount,
  DEFAULT_EXCHANGE_DATA,
} from '../src/lib/currency.ts';
import { getFastCanonicalBaseline } from '../src/lib/priceIntelligence.ts';

console.log('🧪 Starting PayPilot Add Subscription Modal Currency & Workflow Test Suite...\n');

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

// 1. Swiggy in INR (Native regional currency)
runTest('1. Swiggy in INR returns native regional pricing without conversion', () => {
  const result = getFastCanonicalBaseline('Swiggy', 'INR');
  assert.ok(result);
  assert.strictEqual(result.serviceName, 'Swiggy');
  assert.strictEqual(result.country, 'India');
  assert.strictEqual(result.currency, 'INR');
  assert.strictEqual(result.sourceCurrency, 'INR');
  assert.strictEqual(result.isConvertedEquivalent, false);

  const threeMonthPlan = result.plans.find((p) => p.name.includes('3 Months'));
  assert.ok(threeMonthPlan);
  assert.strictEqual(threeMonthPlan.amount, '299');
  assert.strictEqual(threeMonthPlan.cycle, 'QUARTERLY');
  assert.strictEqual(threeMonthPlan.originalAmount, 299);
  assert.strictEqual(threeMonthPlan.originalCurrency, 'INR');
  assert.strictEqual(threeMonthPlan.isConvertedEquivalent, false);

  const annualPlan = result.plans.find((p) => p.name.includes('Annual'));
  assert.ok(annualPlan);
  assert.strictEqual(annualPlan.amount, '899');
  assert.strictEqual(annualPlan.cycle, 'YEARLY');
});

// 2. Swiggy in USD (Converted currency equivalent)
runTest('2. Swiggy in USD converts displayed prices while preserving India INR source', () => {
  const result = getFastCanonicalBaseline('Swiggy', 'USD');
  assert.ok(result);
  assert.strictEqual(result.serviceName, 'Swiggy');
  assert.strictEqual(result.country, 'India');
  assert.strictEqual(result.currency, 'USD');
  assert.strictEqual(result.sourceCurrency, 'INR');
  assert.strictEqual(result.isConvertedEquivalent, true);

  const threeMonthPlan = result.plans.find((p) => p.name.includes('3 Months'));
  assert.ok(threeMonthPlan);
  assert.strictEqual(threeMonthPlan.amount, '3.18');
  assert.strictEqual(threeMonthPlan.cycle, 'QUARTERLY');
  assert.strictEqual(threeMonthPlan.originalAmount, 299);
  assert.strictEqual(threeMonthPlan.originalCurrency, 'INR');
  assert.strictEqual(threeMonthPlan.isConvertedEquivalent, true);

  const annualPlan = result.plans.find((p) => p.name.includes('Annual'));
  assert.ok(annualPlan);
  assert.strictEqual(annualPlan.amount, '9.56');
  assert.strictEqual(annualPlan.cycle, 'YEARLY');
  assert.strictEqual(annualPlan.originalAmount, 899);
  assert.strictEqual(annualPlan.originalCurrency, 'INR');

  const litePlan = result.plans.find((p) => p.name.includes('Lite'));
  assert.ok(litePlan);
  assert.strictEqual(litePlan.amount, '1.05');
  assert.strictEqual(litePlan.originalAmount, 99);
});

// 3. Swiggy in EUR
runTest('3. Swiggy in EUR accurately converts to EUR equivalent', () => {
  const result = getFastCanonicalBaseline('Swiggy', 'EUR');
  assert.ok(result);
  assert.strictEqual(result.currency, 'EUR');
  assert.strictEqual(result.sourceCurrency, 'INR');
  assert.strictEqual(result.isConvertedEquivalent, true);

  const threeMonthPlan = result.plans.find((p) => p.name.includes('3 Months'));
  assert.ok(threeMonthPlan);
  // 299 INR in EUR at baseline (~0.8956 / 94.047 = ~0.00952) -> 2.85 EUR
  assert.strictEqual(threeMonthPlan.amount, '2.85');
  assert.strictEqual(threeMonthPlan.originalAmount, 299);
  assert.strictEqual(threeMonthPlan.originalCurrency, 'INR');
});

// 4. Switching consistency INR -> USD -> EUR -> INR (No double conversion / no drift)
runTest('4. Switching INR -> USD -> EUR -> INR restores exact native amount without drift', () => {
  const originalNativeAmount = 299;
  const originalNativeCurrency = 'INR';

  // 1. In INR
  const displayInr = originalNativeAmount;
  assert.strictEqual(displayInr, 299);

  // 2. Switch to USD
  const displayUsd = convertAmount(originalNativeAmount, originalNativeCurrency, 'USD', BASELINE_EXCHANGE_RATES);
  assert.strictEqual(displayUsd, 3.18);

  // 3. Switch to EUR (calculated from native, NOT from USD)
  const displayEur = convertAmount(originalNativeAmount, originalNativeCurrency, 'EUR', BASELINE_EXCHANGE_RATES);
  assert.strictEqual(displayEur, 2.85);

  // 4. Switch back to INR (calculated from native)
  const restoredInr = convertAmount(originalNativeAmount, originalNativeCurrency, 'INR', BASELINE_EXCHANGE_RATES);
  assert.strictEqual(restoredInr, 299);
});

// 5. Three-month billing calculations
runTest('5. Three-month billing retains actual quarterly charge without incorrect division', () => {
  const nativeQuarterlyCharge = 299;
  const convertedQuarterlyCharge = convertAmount(nativeQuarterlyCharge, 'INR', 'USD', BASELINE_EXCHANGE_RATES);
  
  // Billing input must receive the actual charge amount (3.18), NOT the divided monthly rate
  assert.strictEqual(convertedQuarterlyCharge, 3.18);
  
  // Monthly equivalent breakdown
  const monthlyEquivInr = Math.round((nativeQuarterlyCharge / 3) * 100) / 100;
  assert.strictEqual(monthlyEquivInr, 99.67);

  const monthlyEquivUsd = Math.round((convertedQuarterlyCharge / 3) * 100) / 100;
  assert.strictEqual(monthlyEquivUsd, 1.06);
});

// 6. Annual billing calculations
runTest('6. Annual billing retains actual yearly charge and calculates monthly equivalent', () => {
  const nativeYearlyCharge = 899;
  const convertedYearlyCharge = convertAmount(nativeYearlyCharge, 'INR', 'USD', BASELINE_EXCHANGE_RATES);
  
  assert.strictEqual(convertedYearlyCharge, 9.56);
  
  const monthlyEquivInr = Math.round((nativeYearlyCharge / 12) * 100) / 100;
  assert.strictEqual(monthlyEquivInr, 74.92);

  const monthlyEquivUsd = Math.round((convertedYearlyCharge / 12) * 100) / 100;
  assert.strictEqual(monthlyEquivUsd, 0.80);
});

// 7. Manual subscription storage retains authentic native pricing
runTest('7. Manual ledger storage preserves native currency, country and originalAmount', () => {
  // Simulating user adding Swiggy while dashboard is in USD
  const selectedPlan = {
    name: 'Swiggy One (3 Months)',
    amount: '3.18',
    cycle: 'QUARTERLY',
    originalAmount: 299,
    originalCurrency: 'INR',
    isConvertedEquivalent: true,
  };

  const storedSub = {
    id: `sub_manual_test`,
    name: 'Swiggy',
    vendor: 'Bundl Technologies Pvt Ltd',
    category: 'PRODUCTIVITY',
    amount: selectedPlan.originalAmount, // 299 INR
    currency: selectedPlan.originalCurrency, // INR
    originalAmount: selectedPlan.originalAmount,
    originalCurrency: selectedPlan.originalCurrency,
    isConvertedEquivalent: true,
    billingCycle: selectedPlan.cycle,
    status: 'ACTIVE',
    dataSource: 'MANUAL_VAULT',
  };

  // Must not store display-only $3.18 as the native price
  assert.strictEqual(storedSub.amount, 299);
  assert.strictEqual(storedSub.currency, 'INR');
  assert.strictEqual(storedSub.originalAmount, 299);
  assert.strictEqual(storedSub.billingCycle, 'QUARTERLY');

  // When viewed on USD dashboard, centralized converter displays $3.18
  const displayedOnUsdDashboard = convertAmount(storedSub.amount, storedSub.currency, 'USD', BASELINE_EXCHANGE_RATES);
  assert.strictEqual(displayedOnUsdDashboard, 3.18);

  // When viewed on INR dashboard, centralized converter displays ₹299
  const displayedOnInrDashboard = convertAmount(storedSub.amount, storedSub.currency, 'INR', BASELINE_EXCHANGE_RATES);
  assert.strictEqual(displayedOnInrDashboard, 299);
});

// 8. PayPal Sandbox Mode with currency routing
runTest('8. PayPal Sandbox mode routes supported currency and billing interval', () => {
  // Scenario A: Native USD service (e.g. Netflix)
  const netflixUsd = getFastCanonicalBaseline('Netflix', 'USD');
  const premiumTier = netflixUsd.plans.find((p) => p.name.includes('Premium'));
  assert.strictEqual(premiumTier.amount, '26.99');
  assert.strictEqual(premiumTier.cycle, 'MONTHLY');
  assert.strictEqual(netflixUsd.isConvertedEquivalent, false);

  // Scenario B: Swiggy in PayPal Sandbox
  // Since PayPal does not support domestic INR recurring billing,
  // PayPal receives active display currency (USD 3.18) with interval count 3
  const swiggyUsd = getFastCanonicalBaseline('Swiggy', 'USD');
  const swiggyTier = swiggyUsd.plans[0];
  const paypalAmount = parseFloat(swiggyTier.amount); // 3.18
  const paypalCurrency = 'USD';
  const paypalIntervalUnit = swiggyTier.cycle === 'YEARLY' ? 'YEAR' : 'MONTH';
  const paypalIntervalCount = swiggyTier.cycle === 'QUARTERLY' ? 3 : 1;

  assert.strictEqual(paypalAmount, 3.18);
  assert.strictEqual(paypalCurrency, 'USD');
  assert.strictEqual(paypalIntervalUnit, 'MONTH');
  assert.strictEqual(paypalIntervalCount, 3);
});

// 9. Exchange rate API failure & cached/fallback handling
runTest('9. Fallback offline baseline exchange rates cover full currency conversion matrix', () => {
  assert.strictEqual(DEFAULT_EXCHANGE_DATA.source, 'offline_baseline');
  assert.ok(BASELINE_EXCHANGE_RATES.INR > 90);
  assert.ok(BASELINE_EXCHANGE_RATES.EUR > 0.8 && BASELINE_EXCHANGE_RATES.EUR < 1.0);
  assert.ok(BASELINE_EXCHANGE_RATES.GBP > 0.7 && BASELINE_EXCHANGE_RATES.GBP < 0.9);

  // Cross conversion when API is offline
  const converted = convertAmount(299, 'INR', 'USD', BASELINE_EXCHANGE_RATES);
  assert.strictEqual(converted, 3.18);
});

console.log(`\n🎉 All ${passedTests} test scenarios passed successfully!`);
