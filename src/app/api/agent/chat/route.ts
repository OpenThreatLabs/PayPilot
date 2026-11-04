import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { Subscription } from '@/types';
import { calculateSpendAnalytics, generateAuditRecommendations } from '@/lib/analytics';

export async function POST(req: Request) {
  try {
    const { messages, subscriptions }: { messages: { role: string; content: string }[]; subscriptions: Subscription[] } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    const latestUserMessage = messages[messages.length - 1]?.content || '';

    const analytics = calculateSpendAnalytics(subscriptions);
    const audit = generateAuditRecommendations(subscriptions);

    const activeList = subscriptions.map(s => 
      `- ${s.name} ($${s.amount}/${s.billingCycle.toLowerCase()} via ${s.paypalAgreementId}, Status: ${s.status}, Usage Score: ${s.usageScore}%, Next Bill: ${s.nextBillingDate.slice(0, 10)})`
    ).join('\n');

    const promptContext = `
You are PayPilot's Autonomous Financial Guardian & Subscription Copilot.
You assist users and small businesses in managing recurring subscriptions, cutting duplicate waste, and managing PayPal billing agreements.

Active User Subscriptions:
${activeList}

Analytics Summary:
- Monthly Outflow: $${analytics.monthlyTotal}
- Annualized Outflow: $${analytics.annualizedTotal}
- Active Services: ${analytics.activeCount}
- Flagged Zombie/Low Usage: ${analytics.flaggedZombieCount}
- Potential Annual Savings: $${analytics.potentialAnnualSavings}

Current Audit Alerts:
${audit.map(a => `[${a.type}] ${a.title}: ${a.description} (Savings: $${a.potentialMonthlySavings}/mo)`).join('\n')}

Guidelines:
1. Provide razor-sharp, actionable financial advice without corporate filler.
2. If the user asks to cancel, pause, or suspend a subscription, identify the exact target subscription and PayPal agreement ID.
3. If an action is requested (e.g. cancel Claude Pro, pause Canva), append a structured JSON block on its own line at the very end of your response formatted exactly as:
ACTION_DISPATCH:{"type":"CONFIRM_CANCEL","subscriptionId":"<id>","subscriptionName":"<name>","paypalAgreementId":"<agreementId>","amount":<number>,"currency":"USD"}
Or for suspension:
ACTION_DISPATCH:{"type":"CONFIRM_SUSPEND","subscriptionId":"<id>","subscriptionName":"<name>","paypalAgreementId":"<agreementId>","amount":<number>,"currency":"USD"}

User Request: "${latestUserMessage}"
`;

    if (!apiKey) {
      const lower = latestUserMessage.toLowerCase();
      let responseText = "I have audited your portfolio. You are currently spending $" + analytics.monthlyTotal + "/month across " + analytics.activeCount + " subscriptions.";
      let actionRequired = undefined;

      if (lower.includes('cancel') || lower.includes('cut') || lower.includes('remove') || lower.includes('stop')) {
        const target = subscriptions.find(s => lower.includes(s.name.toLowerCase()) || lower.includes(s.vendor.toLowerCase())) || subscriptions.find(s => s.usageScore < 30);
        if (target) {
          responseText = `I recommend canceling **${target.name}** ($${target.amount}/month). It currently registers only ${target.usageScore}% logged activity. I have prepared the PayPal cancellation request for agreement \`${target.paypalAgreementId}\`. Click confirm below to execute directly on the PayPal sandbox.`;
          actionRequired = {
            type: 'CONFIRM_CANCEL' as const,
            subscriptionId: target.id,
            subscriptionName: target.name,
            paypalAgreementId: target.paypalAgreementId,
            amount: target.amount,
            currency: target.currency
          };
        }
      } else if (lower.includes('saving') || lower.includes('audit') || lower.includes('duplicate')) {
        responseText = `You can save up to **$${analytics.potentialAnnualSavings}/year** immediately:\n\n1. **Redundancy Alert**: You pay for both ChatGPT Plus ($20) and Claude Pro ($20). Claude Pro has just 28% logged activity.\n2. **Zombie Spend**: Canva Pro ($12.99) has not registered meaningful activity in 45 days.\n3. **Price Creep**: Netflix 4K recently escalated by 15%.\n\nWould you like me to trigger a suspension or cancellation on any of these via PayPal?`;
      }

      return NextResponse.json({
        content: responseText,
        actionRequired
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptContext
    });

    const rawText = response.text || '';
    let parsedContent = rawText;
    let actionRequired = undefined;

    if (rawText.includes('ACTION_DISPATCH:')) {
      const parts = rawText.split('ACTION_DISPATCH:');
      parsedContent = parts[0].trim();
      try {
        actionRequired = JSON.parse(parts[1].trim());
      } catch {}
    }

    return NextResponse.json({
      content: parsedContent,
      actionRequired
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
