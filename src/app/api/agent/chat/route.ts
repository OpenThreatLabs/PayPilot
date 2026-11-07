import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { Subscription, AgentAction, AlternativeRecommendation } from '@/types';
import { calculateSpendAnalytics, generateAuditRecommendations } from '@/lib/analytics';
import { searchAlternativeProducts } from '@/lib/channel3';
import { 
  checkRateLimit, 
  getClientIp, 
  sanitizeUserText, 
  detectPromptInjection, 
  isToolAllowed 
} from '@/lib/security';

interface ChatRequestPayload {
  messages: { role: string; content: string }[];
  subscriptions: Subscription[];
}

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(clientIp, 30);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please retry in ${rateLimit.resetInSec} seconds.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetInSec) } }
      );
    }

    const body: ChatRequestPayload = await req.json();
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const subscriptions = Array.isArray(body.subscriptions) ? body.subscriptions : [];

    const messages = rawMessages.slice(-15).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: sanitizeUserText(m.content, 2000),
    }));

    const latestUserMessage = messages[messages.length - 1]?.content || '';

    const injectionCheck = detectPromptInjection(latestUserMessage);
    if (injectionCheck.suspicious) {
      return NextResponse.json({
        content: `I've paused processing that request. ${injectionCheck.reason || 'PayPilot security guard detected an untrusted directive.'} Please provide a financial question or subscription action.`,
        actionRequired: undefined,
        alternatives: [],
        toolCallHistory: [],
      });
    }

    const analytics = calculateSpendAnalytics(subscriptions);
    const audit = generateAuditRecommendations(subscriptions);

    const activeList = subscriptions.map((s) => 
      `- ${s.name} [ID: ${s.id}] ($${s.amount}/${s.billingCycle.toLowerCase()} via ${s.paypalAgreementId}, Status: ${s.status}, Usage Score: ${s.usageScore}%, Next Bill: ${s.nextBillingDate ? s.nextBillingDate.slice(0, 10) : 'N/A'}, Plan: ${s.planName}, Source: ${s.dataSource || 'MANUAL_VAULT'})`
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
        totalAmount: renewingSoon.reduce((sum, s) => sum + s.amount, 0),
        renewals: renewingSoon.map((s) => ({
          id: s.id,
          name: s.name,
          amount: s.amount,
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

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const lower = latestUserMessage.toLowerCase();
      let responseText = `I have audited your portfolio of ${analytics.activeCount} active subscriptions. You are currently spending $${analytics.monthlyTotal.toFixed(2)}/month ($${analytics.annualizedTotal.toFixed(2)}/year).`;
      let actionRequired: AgentAction | undefined = undefined;
      let alternatives: AlternativeRecommendation[] = [];
      const toolCallHistory: { toolName: string; input: Record<string, unknown>; summary: string }[] = [];

      if (lower.includes('cancel') || lower.includes('stop') || lower.includes('pause') || lower.includes('suspend') || lower.includes('cut')) {
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
          `• **Monthly Outflow:** $${analytics.monthlyTotal.toFixed(2)}\n` +
          `• **Annualized Outflow:** $${analytics.annualizedTotal.toFixed(2)}\n` +
          `• **Active Subscriptions:** ${analytics.activeCount}\n` +
          `• **Low-Utilization Spend:** ${analytics.flaggedZombieCount} flagged items\n` +
          `• **Potential Savings:** **+$${analytics.potentialAnnualSavings.toFixed(2)}/year**\n\n` +
          `**Key Recommendations:**\n` +
          audit.slice(0, 3).map((a, i) => `${i + 1}. **${a.title}**: ${a.description} (*Save $${a.potentialMonthlySavings}/mo*)`).join('\n') +
          `\n\nAsk me to **"cancel [name]"**, **"find alternatives for [tool]"**, or **"check renewals"** to take action.`;
      }

      return NextResponse.json({
        content: responseText,
        actionRequired,
        alternatives,
        toolCallHistory,
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are Vigil, PayPilot's Autonomous Financial Guardian & Subscription Copilot.
You assist individuals and small businesses in managing recurring subscriptions, cutting duplicate waste, finding cheaper software deals, and safely preparing PayPal billing agreement changes.

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
1. Provide razor-sharp, actionable financial advice with clear markdown formatting.
2. Use tools to query information, search alternatives, or stage actions:
   - Use 'analyze_spending' to get exact savings calculations and redundancy groups.
   - Use 'find_alternatives' to query Channel3 product graph for cheaper or lifetime software alternatives.
   - Use 'check_upcoming_renewals' to evaluate renewals in the next N days.
   - Use 'stage_subscription_action' when the user asks to cancel, pause, or suspend a subscription.
3. SECURITY RULE: You CANNOT execute payment mutations or direct cancellations yourself. You must ALWAYS use 'stage_subscription_action' so that the user receives an explicit confirmation card.
4. When suggesting alternatives, cite the brand, one-time price, merchant, and source.`;

    const toolDeclarations = [
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

    async function generateWithFallback(callConfig: { contents: any[]; config?: any }) {
      const candidateModels = [
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-flash-latest'
      ];
      let lastError: any = null;
      for (const m of candidateModels) {
        try {
          return await ai.models.generateContent({
            ...callConfig,
            model: m,
          });
        } catch (err: any) {
          lastError = err;
          const s = String(err?.status || err?.code || err?.message || '');
          if (s.includes('503') || s.includes('UNAVAILABLE') || s.includes('429') || s.includes('high demand')) {
            continue;
          }
          throw err;
        }
      }
      throw lastError;
    }

    const response = await generateWithFallback({
      contents: [
        ...messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      ],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: toolDeclarations as unknown as FunctionDeclaration[] }],
      },
    });

    let actionRequired: AgentAction | undefined = undefined;
    const alternatives: AlternativeRecommendation[] = [];
    const toolCallHistory: { toolName: string; input: Record<string, unknown>; summary: string }[] = [];

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        const toolName = call.name || '';
        const toolArgs = (call.args as Record<string, unknown>) || {};
        
        if (!toolName || !isToolAllowed(toolName)) continue;

        try {
          if (toolName === 'analyze_spending') {
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
          ...messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          {
            role: 'user',
            parts: [{ text: `Tool output results: ${toolCallHistory.map(t => t.toolName).join(', ')}. Summarizing results for user.` }]
          }
        ],
        config: {
          systemInstruction,
        }
      });

      return NextResponse.json({
        content: followUp.text || response.text || 'Analysis complete.',
        actionRequired,
        alternatives,
        toolCallHistory,
      });
    }

    return NextResponse.json({
      content: response.text || 'I analyzed your request.',
      actionRequired,
      alternatives,
      toolCallHistory,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
