import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { 
  Subscription, 
  AgentAction, 
  AlternativeRecommendation,
  PriceResearchResult 
} from '@/types';
import { calculateSpendAnalytics, generateAuditRecommendations } from '@/lib/analytics';
import { searchAlternativeProducts } from '@/lib/channel3';
import { 
  checkRateLimit, 
  getClientIp, 
  sanitizeUserText, 
  detectPromptInjection, 
  isToolAllowed 
} from '@/lib/security';
import { researchSubscriptionPrice, compareServicePlans } from '@/lib/priceIntelligence';
import { recordGeminiUsage } from '@/lib/geminiUsage';
import { convertAmount } from '@/lib/currency';

interface ChatRequestBody {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  subscriptions: Subscription[];
  currency?: string;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, 30, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          content: `Vigil rate limit reached. Please wait ${rateCheck.resetInSec} seconds before sending another message.`,
          actionRequired: undefined,
          alternatives: [],
          toolCallHistory: [],
        },
        { status: 429 }
      );
    }

    const body: ChatRequestBody = await req.json();
    const { messages = [], subscriptions = [] } = body;

    const latestUserMessage = sanitizeUserText(
      messages.filter((m) => m.role === 'user').slice(-1)[0]?.content || '',
      3000
    );

    const injectionCheck = detectPromptInjection(latestUserMessage);
    if (injectionCheck.suspicious) {
      return NextResponse.json({
        content: `I've paused processing that request. ${injectionCheck.reason || 'PayPilot security guard detected an untrusted directive.'} Please provide a financial question or subscription action.`,
        actionRequired: undefined,
        alternatives: [],
        toolCallHistory: [],
      });
    }

    const userCurrency = sanitizeUserText(body?.currency || 'USD', 10).toUpperCase();
    const analytics = calculateSpendAnalytics(subscriptions, userCurrency);
    const audit = generateAuditRecommendations(subscriptions, userCurrency);

    const activeList = subscriptions.map((s) => 
      `- ${s.name} [ID: ${s.id}] (${s.currency || 'USD'} ${s.amount}/${s.billingCycle.toLowerCase()} via ${s.paypalAgreementId}, Status: ${s.status}, Usage Score: ${s.usageScore}%, Next Bill: ${s.nextBillingDate ? s.nextBillingDate.slice(0, 10) : 'N/A'}, Plan: ${s.planName}, Source: ${s.dataSource || 'MANUAL_VAULT'})`
    ).join('\n');

    const runAnalyzeSpending = () => {
      return {
        analytics,
        recommendations: audit,
        zombieCount: analytics.flaggedZombieCount,
        potentialAnnualSavings: analytics.potentialAnnualSavings,
      };
    };

    const runFindAlternatives = async (query: string, limit: number = 3) => {
      const products = await searchAlternativeProducts(query, limit);
      return {
        query,
        products: products.map((p) => ({
          id: p.id,
          title: p.title,
          brand: p.brand,
          price: p.price,
          currency: p.currency,
          category: p.category,
          merchantName: p.merchantName,
          buyUrl: p.buyUrl,
          recurringOrLifetime: p.recurringOrLifetime || 'LIFETIME',
          savingVersusRecurringYearly: p.savingVersusRecurringYearly || 0,
        })),
      };
    };

    const runCheckUpcomingRenewals = (days: number = 7) => {
      const now = new Date();
      const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const renewingSoon = subscriptions.filter((s) => {
        if (s.status !== 'ACTIVE' || !s.nextBillingDate) return false;
        const d = new Date(s.nextBillingDate);
        return d >= now && d <= future;
      });

      return {
        timeframeDays: days,
        count: renewingSoon.length,
        currency: userCurrency,
        totalAmount: Math.round(
          renewingSoon.reduce((sum, s) => sum + convertAmount(s.amount, s.currency || 'USD', userCurrency), 0) * 100
        ) / 100,
        renewals: renewingSoon.map((s) => ({
          id: s.id,
          name: s.name,
          amount: s.amount,
          currency: s.currency || 'USD',
          nextBillingDate: s.nextBillingDate.slice(0, 10),
          paypalAgreementId: s.paypalAgreementId,
        })),
      };
    };

    const runStageSubscriptionAction = (actionType: 'CONFIRM_CANCEL' | 'CONFIRM_SUSPEND', targetId: string, reason?: string) => {
      const targetSub = subscriptions.find((s) => s.id === targetId || s.paypalAgreementId === targetId);

      if (!targetSub) {
        return {
          success: false,
          error: `Subscription with ID '${targetId}' was not found in your active portfolio.`,
        };
      }

      const action: AgentAction = {
        type: actionType,
        subscriptionId: targetSub.id,
        subscriptionName: targetSub.name,
        paypalAgreementId: targetSub.paypalAgreementId,
        amount: targetSub.amount,
        currency: targetSub.currency || 'USD',
        reason: reason || 'Action prepared by Vigil Financial Guardian',
        status: 'PENDING_USER_CONFIRMATION',
      };

      return {
        success: true,
        actionRequired: action,
      };
    };

    const runResearchSubscriptionPricing = async (serviceName: string, currency: string = userCurrency, country?: string) => {
      return await researchSubscriptionPrice(serviceName, currency || userCurrency, country);
    };

    const runCompareSubscriptionPlans = async (services: string[], currency: string = userCurrency) => {
      return await compareServicePlans(services, currency || userCurrency);
    };

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const lower = latestUserMessage.toLowerCase();
      let responseText = `I have audited your portfolio of ${analytics.activeCount} active subscriptions. You are currently spending ${userCurrency} ${analytics.monthlyTotal.toFixed(2)}/month (${userCurrency} ${analytics.annualizedTotal.toFixed(2)}/year).`;
      let actionRequired: AgentAction | undefined = undefined;
      let alternatives: AlternativeRecommendation[] = [];
      let priceResearchResult: PriceResearchResult | undefined = undefined;
      const toolCallHistory: { toolName: string; input: Record<string, unknown>; summary: string }[] = [];

      if (lower.includes('compare') || lower.includes(' vs ') || lower.includes('versus')) {
        const detectedServices: string[] = [];
        if (lower.includes('chatgpt') || lower.includes('gpt')) detectedServices.push('ChatGPT');
        if (lower.includes('claude')) detectedServices.push('Claude');
        if (lower.includes('cursor')) detectedServices.push('Cursor');
        if (lower.includes('copilot') || lower.includes('github')) detectedServices.push('GitHub Copilot');
        if (lower.includes('netflix')) detectedServices.push('Netflix');
        if (lower.includes('spotify')) detectedServices.push('Spotify');

        const targets = detectedServices.length >= 2 ? detectedServices : ['ChatGPT', 'Claude'];
        const currency = lower.includes('inr') || lower.includes('india') ? 'INR' : 'USD';
        const comparison = await runCompareSubscriptionPlans(targets, currency);

        toolCallHistory.push({
          toolName: 'compare_subscription_plans',
          input: { services: targets, currency },
          summary: `Compared ${targets.join(' vs ')} in ${currency}`,
        });

        responseText = comparison.comparisonSummary;
      } else if (
        lower.includes('pricing') ||
        lower.includes('price') ||
        lower.includes('plan') ||
        lower.includes('cost') ||
        lower.includes('student') ||
        lower.includes('tier')
      ) {
        let targetService = 'Netflix';
        if (lower.includes('spotify')) targetService = 'Spotify';
        else if (lower.includes('chatgpt') || lower.includes('gpt')) targetService = 'ChatGPT';
        else if (lower.includes('claude')) targetService = 'Claude';
        else if (lower.includes('cursor')) targetService = 'Cursor';
        else if (lower.includes('copilot')) targetService = 'GitHub Copilot';
        else if (lower.includes('canva')) targetService = 'Canva';
        else if (lower.includes('notion')) targetService = 'Notion';
        else if (lower.includes('youtube')) targetService = 'YouTube';
        else if (lower.includes('prime') || lower.includes('amazon')) targetService = 'Amazon Prime';
        else if (lower.includes('zomato')) targetService = 'Zomato';
        else if (lower.includes('swiggy')) targetService = 'Swiggy';
        else {
          const matchedSub = subscriptions.find((s) => lower.includes(s.name.toLowerCase()));
          if (matchedSub) targetService = matchedSub.name;
        }

        const currency = lower.includes('inr') || lower.includes('india') || lower.includes('rupee') || lower.includes('₹') ? 'INR' : 'USD';
        const res = await runResearchSubscriptionPricing(targetService, currency);
        priceResearchResult = res;

        toolCallHistory.push({
          toolName: 'research_subscription_pricing',
          input: { serviceName: targetService, currency },
          summary: `Researched ${targetService} (${res.plans.length} tiers, status: ${res.overallStatus})`,
        });

        const statusTag = res.overallStatus === 'VERIFIED' ? '✅ Official Verified' : '🔍 Cross-Checked';
        responseText = `### Live Pricing Intelligence: **${res.serviceName}** (${res.currency})\n\n` +
          `*Status: ${statusTag}* | *Country: ${res.country}*\n` +
          (res.sourceUrl ? `*Source: [${res.sourceTitle || res.sourceUrl}](${res.sourceUrl}) (Last verified: ${res.lastVerified.slice(0, 10)})*\n\n` : '\n') +
          res.plans.map((p) => {
            const extra = p.isStudentDiscount ? ' *(Student Discount)*' : p.isIntroductory ? ' *(Introductory Rate)*' : '';
            return `• **${p.name}**: **${res.currency} ${p.amount}** / ${p.cycle.toLowerCase()}${extra}\n  ${p.features}`;
          }).join('\n\n') +
          `\n\n${res.verificationNotes || ''}`;
      } else if (lower.includes('cancel') || lower.includes('stop') || lower.includes('pause') || lower.includes('suspend') || lower.includes('cut')) {
        const actionType = lower.includes('pause') || lower.includes('suspend') ? 'CONFIRM_SUSPEND' : 'CONFIRM_CANCEL';
        const target = subscriptions.find((s) => 
          lower.includes(s.name.toLowerCase()) || lower.includes(s.vendor.toLowerCase())
        ) || subscriptions.find((s) => s.usageScore < 30);

        if (target) {
          const toolResult = runStageSubscriptionAction(actionType, target.id, 'Action requested by user via Vigil Copilot');

          toolCallHistory.push({
            toolName: 'stage_subscription_action',
            input: { actionType, subscriptionId: target.id },
            summary: `Staged ${actionType} for ${target.name} ($${target.amount})`,
          });

          if (toolResult.success && toolResult.actionRequired) {
            actionRequired = toolResult.actionRequired;
            const verb = actionType === 'CONFIRM_CANCEL' ? 'cancellation' : 'suspension';
            responseText = `I have analyzed **${target.name}** ($${target.amount.toFixed(2)}/${target.billingCycle.toLowerCase()}). It currently registers only **${target.usageScore}%** utilization.\n\nI have prepared the safe PayPal ${verb} request for agreement \`${target.paypalAgreementId}\`.\n\nPlease review the staged action card below and click to authorize execution on PayPal Sandbox.`;
          }
        } else {
          responseText = "I couldn't identify a specific subscription from your message. Here are active subscriptions you can manage:\n" + 
            subscriptions.map(s => `• **${s.name}** ($${s.amount}/mo, agreement \`${s.paypalAgreementId}\`)`).join('\n');
        }
      } else if (lower.includes('alternative') || lower.includes('deal') || lower.includes('cheaper') || lower.includes('replace') || lower.includes('lifetime')) {
        const matchedSub = subscriptions.find(s => lower.includes(s.name.toLowerCase()) || lower.includes(s.category.toLowerCase())) || subscriptions[0];
        const queryTerm = matchedSub ? matchedSub.name : 'productivity software';

        const toolResult = await runFindAlternatives(queryTerm, 3);
        toolCallHistory.push({
          toolName: 'find_alternatives',
          input: { query: queryTerm },
          summary: `Searched Channel3 Product Graph for ${queryTerm}`,
        });

        if (toolResult.products && toolResult.products.length > 0) {
          alternatives = toolResult.products.map(p => ({
            id: p.id,
            title: p.title,
            brand: p.brand,
            price: p.price,
            currency: p.currency,
            category: p.category,
            recurringOrLifetime: p.recurringOrLifetime as 'LIFETIME' | 'ANNUAL' | 'CHEAPER_MONTHLY',
            estimatedAnnualSaving: p.savingVersusRecurringYearly,
            sourceUrl: p.buyUrl,
            merchantName: p.merchantName,
            sourceName: 'Channel3 Universal Product Graph',
            reason: `Replaces recurring ${queryTerm} fees with one-time or annual pricing`,
          }));

          responseText = `### Cheaper & Lifetime Alternatives for **${queryTerm}**\n\nVerified deals from the Channel3 Product Graph:\n\n` +
            alternatives.map(a => `• **[${a.title}](${a.sourceUrl})** by *${a.brand}* — **$${a.price.toFixed(2)}** (${a.recurringOrLifetime.toLowerCase()})\n  *Merchant:* ${a.merchantName} | *Estimated annual savings:* **+$${a.estimatedAnnualSaving}/yr**`).join('\n\n') +
            `\n\nReview the source offers below to replace recurring fees.`;
        }
      } else if (lower.includes('renewal') || lower.includes('week') || lower.includes('upcoming') || lower.includes('soon')) {
        const toolResult = runCheckUpcomingRenewals(7);
        toolCallHistory.push({
          toolName: 'check_upcoming_renewals',
          input: { days: 7 },
          summary: `Checked renewals for next 7 days (${toolResult.count} items)`,
        });

        if (toolResult.count > 0) {
          responseText = `### Scheduled Renewals (Next 7 Days)\n\nYou have **${toolResult.count}** subscription(s) renewing this week totaling **$${toolResult.totalAmount.toFixed(2)}**:\n\n` +
            toolResult.renewals.map(r => `• **${r.name}** — **$${r.amount.toFixed(2)}** on **${r.nextBillingDate}** (PayPal Agreement: \`${r.paypalAgreementId}\`)`).join('\n') +
            `\n\nWould you like me to prepare a pause or cancellation on any of these before you are charged?`;
        } else {
          responseText = `You have no subscriptions scheduled for renewal in the next 7 days. Your upcoming cash flow is clear.`;
        }
      } else {
        runAnalyzeSpending();
        toolCallHistory.push({
          toolName: 'analyze_spending',
          input: {},
          summary: `Portfolio audit: $${analytics.potentialAnnualSavings} recoverable`,
        });

        responseText = `### Vigil Spend Audit\n\nHere is your financial portfolio breakdown:\n\n` +
          `• **Monthly Outflow:** ${userCurrency} ${analytics.monthlyTotal.toFixed(2)}\n` +
          `• **Annualized Outflow:** ${userCurrency} ${analytics.annualizedTotal.toFixed(2)}\n` +
          `• **Active Subscriptions:** ${analytics.activeCount}\n` +
          `• **Low-Utilization Spend:** ${analytics.flaggedZombieCount} flagged items\n` +
          `• **Potential Savings:** **+${userCurrency} ${analytics.potentialAnnualSavings.toFixed(2)}/year**\n\n` +
          `**Key Recommendations:**\n` +
          audit.slice(0, 3).map((a, i) => `${i + 1}. **${a.title}**: ${a.description} (*Save ${userCurrency} ${a.potentialMonthlySavings}/mo*)`).join('\n') +
          `\n\nAsk me to **"research pricing for [service]"**, **"compare [service A] vs [service B]"**, **"cancel [name]"**, or **"find alternatives for [tool]"**.`;
      }

      return NextResponse.json({
        content: responseText,
        actionRequired,
        alternatives,
        priceResearchResult,
        toolCallHistory,
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are Vigil, PayPilot's Autonomous Financial Guardian & Subscription Copilot.
You assist individuals and small businesses in managing recurring subscriptions, cutting duplicate waste, finding cheaper software deals, safely preparing PayPal billing changes, and researching live verified subscription prices.

Active User Subscriptions:
${activeList}

Analytics Summary:
- User Display Currency: ${userCurrency}
- Monthly Outflow: ${userCurrency} ${analytics.monthlyTotal}
- Annualized Outflow: ${userCurrency} ${analytics.annualizedTotal}
- Active Services: ${analytics.activeCount}
- Flagged Zombie/Low Usage: ${analytics.flaggedZombieCount}
- Potential Annual Savings: ${userCurrency} ${analytics.potentialAnnualSavings}

Current Audit Alerts:
${audit.map(a => `[${a.type}] ${a.title}: ${a.description} (Savings: ${userCurrency} ${a.potentialMonthlySavings}/mo)`).join('\n')}

Guidelines:
1. Provide razor-sharp, actionable financial advice with clear markdown formatting.
2. Tools available to you:
   - 'research_subscription_pricing': Research live official subscription pricing, tiers, and student discounts for any service. Always use this when the user asks about current pricing in a country, recent price changes, or plan details.
   - 'compare_subscription_plans': Compare prices, tiers, and savings across competing subscriptions.
   - 'analyze_spending': Audit portfolio spend, calculate redundancy groups, and detect zombie expenses.
   - 'find_alternatives': Query Channel3 Universal Product Graph for cheaper or one-time lifetime software replacements.
   - 'check_upcoming_renewals': Check upcoming subscription renewal dates and renewal cash flow.
   - 'stage_subscription_action': Stage a subscription cancellation or pause.
3. SECURITY RULE: You CANNOT execute payment mutations or direct cancellations yourself. You must ALWAYS use 'stage_subscription_action' so that the user receives an explicit confirmation card.
4. When reporting pricing, always cite the source URL, verification status (VERIFIED vs CROSS_CHECKED vs UNVERIFIED), and last checked date. Never fabricate pricing.`;

    const toolDeclarations = [
      {
        name: 'research_subscription_pricing',
        description: 'Performs live web research for current subscription plans, regional prices, student discounts, and official sources using Google Search grounding.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            serviceName: {
              type: Type.STRING,
              description: 'The subscription service name (e.g. Netflix, Spotify, ChatGPT, Cursor, GitHub Copilot)',
            },
            currency: {
              type: Type.STRING,
              description: 'Currency code to query in (e.g. INR, USD, EUR, GBP)',
            },
            country: {
              type: Type.STRING,
              description: 'Country name (e.g. India, United States, United Kingdom)',
            },
          },
          required: ['serviceName'],
        },
      },
      {
        name: 'compare_subscription_plans',
        description: 'Compares current live subscription pricing, tiers, and feature differences between two or more competing software services.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            services: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of subscription names to compare (e.g. ["ChatGPT Plus", "Claude Pro"])',
            },
            currency: {
              type: Type.STRING,
              description: 'Currency code (e.g. USD, INR)',
            },
          },
          required: ['services'],
        },
      },
      {
        name: 'analyze_spending',
        description: 'Analyzes user subscription portfolio for spending patterns, zombie expenses, and redundancy groups.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            scope: {
              type: Type.STRING,
              description: 'Analysis scope: all or active',
            },
          },
        },
      },
      {
        name: 'find_alternatives',
        description: 'Searches Channel3 Universal Product Graph for cheaper or one-time lifetime software alternatives.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: 'Software category or product name to find alternatives for (e.g. design, AI, cloud infra, streaming)',
            },
            limit: {
              type: Type.INTEGER,
              description: 'Number of alternative deals to retrieve (1-5)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'check_upcoming_renewals',
        description: 'Checks which subscriptions are scheduled for renewal within the specified days.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            days: {
              type: Type.INTEGER,
              description: 'Number of days ahead to look for renewals (e.g. 7, 14, 30)',
            },
          },
        },
      },
      {
        name: 'stage_subscription_action',
        description: 'Prepares a safe subscription cancellation or suspension action for explicit user confirmation. Does NOT execute payment mutation.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            actionType: {
              type: Type.STRING,
              description: 'CONFIRM_CANCEL or CONFIRM_SUSPEND',
            },
            subscriptionId: {
              type: Type.STRING,
              description: 'The internal subscription ID or PayPal agreement ID',
            },
            reason: {
              type: Type.STRING,
              description: 'Reason for the action',
            },
          },
          required: ['actionType', 'subscriptionId'],
        },
      },
    ];

    async function generateWithFallback(callConfig: {
      contents: Array<{ role: string; parts: Array<{ text: string }> }>;
      config?: {
        systemInstruction?: string;
        tools?: Array<{ functionDeclarations: FunctionDeclaration[] }>;
      };
    }) {
      const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash'];
      let lastError: unknown = null;
      for (const m of candidateModels) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          const response = await Promise.race([
            ai.models.generateContent({
              ...callConfig,
              model: m,
            }),
            new Promise<never>((_, reject) => {
              controller.signal.addEventListener('abort', () => reject(new Error('Gemini API request timed out')));
            }),
          ]);
          clearTimeout(timeout);

          const usage = response.usageMetadata;
          recordGeminiUsage({
            promptTokens: usage?.promptTokenCount,
            candidatesTokens: usage?.candidatesTokenCount,
            totalTokens: usage?.totalTokenCount,
          });

          return response;
        } catch (err: unknown) {
          lastError = err;
          const s = String(err ?? '');
          if (s.includes('429') || s.includes('RESOURCE_EXHAUSTED')) {
            recordGeminiUsage({ isRateLimit: true });
            break;
          }
          if (s.includes('404') || s.includes('not found')) {
            continue;
          }
          throw err;
        }
      }
      throw lastError;
    }

    const response = await generateWithFallback({
      contents: [
        ...messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      ],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: toolDeclarations as unknown as FunctionDeclaration[] }],
      },
    });

    let actionRequired: AgentAction | undefined = undefined;
    const alternatives: AlternativeRecommendation[] = [];
    let priceResearchResult: PriceResearchResult | undefined = undefined;
    const toolCallHistory: { toolName: string; input: Record<string, unknown>; summary: string }[] = [];

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        const toolName = call.name || '';
        const toolArgs = (call.args as Record<string, unknown>) || {};
        
        if (!toolName || !isToolAllowed(toolName)) continue;

        try {
          if (toolName === 'research_subscription_pricing') {
            const svc = typeof toolArgs.serviceName === 'string' ? toolArgs.serviceName : '';
            const curr = typeof toolArgs.currency === 'string' && toolArgs.currency ? toolArgs.currency : userCurrency;
            const ctry = typeof toolArgs.country === 'string' ? toolArgs.country : undefined;
            const res = await runResearchSubscriptionPricing(svc, curr, ctry);
            priceResearchResult = res;

            toolCallHistory.push({
              toolName,
              input: toolArgs,
              summary: `Researched ${svc} in ${curr}: ${res.plans.length} plans (${res.overallStatus})`,
            });
          } else if (toolName === 'compare_subscription_plans') {
            const svcs = Array.isArray(toolArgs.services) ? (toolArgs.services as string[]) : [];
            const curr = typeof toolArgs.currency === 'string' && toolArgs.currency ? toolArgs.currency : userCurrency;
            await runCompareSubscriptionPlans(svcs, curr);

            toolCallHistory.push({
              toolName,
              input: toolArgs,
              summary: `Compared ${svcs.join(' vs ')} in ${curr}`,
            });
          } else if (toolName === 'analyze_spending') {
            runAnalyzeSpending();
            toolCallHistory.push({
              toolName,
              input: toolArgs,
              summary: 'Analyzed portfolio spend',
            });
          } else if (toolName === 'find_alternatives') {
            const query = typeof toolArgs.query === 'string' ? toolArgs.query : 'software tool';
            const limit = typeof toolArgs.limit === 'number' ? toolArgs.limit : 3;
            const res = await runFindAlternatives(query, limit);
            toolCallHistory.push({
              toolName,
              input: toolArgs,
              summary: `Found alternatives for ${query}`,
            });

            res.products.forEach((p) => {
              alternatives.push({
                id: p.id,
                title: p.title,
                brand: p.brand,
                price: p.price,
                currency: p.currency,
                category: p.category,
                recurringOrLifetime: p.recurringOrLifetime as 'LIFETIME' | 'ANNUAL' | 'CHEAPER_MONTHLY',
                estimatedAnnualSaving: p.savingVersusRecurringYearly,
                sourceUrl: p.buyUrl,
                merchantName: p.merchantName,
                sourceName: 'Channel3 Universal Product Graph',
                reason: 'Alternative discovered via Channel3',
              });
            });
          } else if (toolName === 'check_upcoming_renewals') {
            const days = typeof toolArgs.days === 'number' ? toolArgs.days : 7;
            const res = runCheckUpcomingRenewals(days);
            toolCallHistory.push({
              toolName,
              input: toolArgs,
              summary: `Checked upcoming renewals for ${days} days (${res.count} items)`,
            });
          } else if (toolName === 'stage_subscription_action') {
            const actionType = toolArgs.actionType === 'CONFIRM_SUSPEND' ? 'CONFIRM_SUSPEND' : 'CONFIRM_CANCEL';
            const subId = typeof toolArgs.subscriptionId === 'string' ? toolArgs.subscriptionId : '';
            const reason = typeof toolArgs.reason === 'string' ? toolArgs.reason : undefined;
            const res = runStageSubscriptionAction(actionType, subId, reason);

            toolCallHistory.push({
              toolName,
              input: toolArgs,
              summary: `Staged ${actionType} for ${subId}`,
            });

            if (res.success && res.actionRequired) {
              actionRequired = res.actionRequired;
            }
          }
        } catch (toolError) {
          console.error(`Tool execution error for ${toolName}:`, toolError);
        }
      }

      const followUp = await generateWithFallback({
        contents: [
          ...messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          {
            role: 'user',
            parts: [
              {
                text: `Tool output results: ${toolCallHistory.map((t) => `${t.toolName} (${t.summary})`).join(', ')}. Please formulate your final financial response for the user, referencing source citations and verification statuses where applicable.`,
              },
            ],
          },
        ],
        config: {
          systemInstruction,
        },
      });

      return NextResponse.json({
        content: followUp.text || 'I evaluated your request. Let me know if you would like me to research other plans or take action.',
        actionRequired,
        alternatives,
        priceResearchResult,
        toolCallHistory,
      });
    }

    return NextResponse.json({
      content: response.text || 'I have reviewed your financial query. How else may I assist you today?',
      actionRequired: undefined,
      alternatives: [],
      priceResearchResult: undefined,
      toolCallHistory: [],
    });
  } catch (error) {
    console.error('Agent chat endpoint failure:', error);
    return NextResponse.json(
      {
        content: 'Vigil is currently operating in local mode. You can view your subscriptions and request manual audits.',
        actionRequired: undefined,
        alternatives: [],
        toolCallHistory: [],
      },
      { status: 500 }
    );
  }
}
