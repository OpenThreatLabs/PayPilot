'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Subscription, 
  AgentAction, 
  AgentChatMessage, 
  AlternativeRecommendation,
  PriceResearchResult 
} from '@/types';
import { 
  Send, 
  Bot, 
  ShieldCheck, 
  Check, 
  X, 
  Loader2, 
  RefreshCw, 
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  Search,
  ExternalLink
} from 'lucide-react';
import { BASELINE_EXCHANGE_RATES, convertAmount } from '@/lib/currency';
import { UserProfile } from '@/lib/userProfile';
import { toast } from 'sonner';

interface VigilChatViewProps {
  subscriptions: Subscription[];
  currencySymbol?: string;
  currencyCode?: string;
  rates?: Record<string, number>;
  profile?: UserProfile | null;
  onExecuteAction: (action: 'CANCEL' | 'SUSPEND', id: string, agreementId: string) => Promise<void>;
}

let messageSeq = 0;
function getNextMessageId(prefix: string): string {
  messageSeq += 1;
  return `${prefix}_${messageSeq}`;
}

function getFormattedTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function VigilChatView({
  subscriptions,
  currencySymbol = '$',
  currencyCode = 'USD',
  rates = BASELINE_EXCHANGE_RATES,
  profile,
  onExecuteAction,
}: VigilChatViewProps) {
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: 'welcome_msg',
      role: 'assistant',
      content: 'I have analyzed your subscription portfolio and connected PayPal agreements.\n\nReady to audit spending anomalies, research live subscription prices via Google Search, compare software plans, or find cheaper lifetime alternatives.',
      timestamp: getFormattedTime(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');
  const monthlyTotal = activeSubs.reduce((acc, s) => {
    const converted = convertAmount(s.amount, s.currency || 'USD', currencyCode, rates);
    if (s.billingCycle === 'YEARLY') return acc + converted / 12;
    if (s.billingCycle === 'QUARTERLY') return acc + converted / 3;
    return acc + converted;
  }, 0);
  const annualTotal = monthlyTotal * 12;

  const lowUsageCount = activeSubs.filter((s) => (s.usageScore ?? 100) < 40).length;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || loading) return;

    const userMessage: AgentChatMessage = {
      id: getNextMessageId('user'),
      role: 'user',
      content: messageContent,
      timestamp: getFormattedTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          subscriptions,
          currency: currencyCode,
          userProfile: profile,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data: {
        content: string;
        actionRequired?: AgentAction;
        alternatives?: AlternativeRecommendation[];
        priceResearchResult?: PriceResearchResult;
        toolCallHistory?: { toolName: string; input: Record<string, unknown>; summary: string }[];
      } = await response.json();

      const assistantMessage: AgentChatMessage = {
        id: getNextMessageId('vigil'),
        role: 'assistant',
        content: data.content,
        timestamp: getFormattedTime(),
        actionRequired: data.actionRequired,
        alternatives: data.alternatives,
        priceResearchResult: data.priceResearchResult,
        toolCallHistory: data.toolCallHistory,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Communication error';
      setMessages((prev) => [
        ...prev,
        {
          id: getNextMessageId('err'),
          role: 'assistant',
          content: `Notice: ${msg}. Please try again.`,
          timestamp: getFormattedTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizeAction = async (msgId: string, action: AgentAction) => {
    setExecutingActionId(msgId);
    try {
      const actionType = action.type === 'CONFIRM_CANCEL' ? 'CANCEL' : 'SUSPEND';
      await onExecuteAction(actionType, action.subscriptionId || '', action.paypalAgreementId || '');

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId && m.actionRequired) {
            return {
              ...m,
              actionRequired: {
                ...m.actionRequired,
                status: 'EXECUTED' as const,
              },
            };
          }
          return m;
        })
      );

      toast.success(
        action.type === 'CONFIRM_CANCEL'
          ? `Cancelled on PayPal for ${action.subscriptionName}`
          : `Paused ${action.subscriptionName} via PayPal Sandbox`
      );
    } catch {
      toast.error(`Execution failed for ${action.subscriptionName}`);
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleDeclineAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.actionRequired) {
          return {
            ...m,
            actionRequired: {
              ...m.actionRequired,
              status: 'REJECTED' as const,
            },
          };
        }
        return m;
      })
    );
    toast.info('Action declined. Billing agreement left untouched.');
  };

  const samplePrompts = [
    'What are current Netflix plans in India?',
    'Compare ChatGPT Plus vs Claude Pro pricing',
    'Find cheaper alternatives to Spotify',
    'Audit low usage subscriptions under 40%',
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Vigil
          </h1>
          <p className="text-xs text-[#86868b] mt-1">Autonomous Spend Guardian & Price Intelligence Copilot</p>
        </div>

        <div className="flex items-center gap-5 text-sm sm:text-right">
          <div className="space-y-0.5">
            <div className="text-[11px] uppercase tracking-wider text-[#86868b]">Monitored Spend</div>
            <div className="text-lg font-medium text-[#f5f5f7] tabular-nums">
              {currencySymbol}{monthlyTotal.toFixed(2)}
              <span className="text-xs text-[#86868b] font-normal"> / mo</span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/[0.08] hidden sm:block"></div>
          <div className="space-y-0.5 hidden lg:block">
            <div className="text-[11px] uppercase tracking-wider text-[#86868b]">Annual Run Rate</div>
            <div className="text-lg font-medium text-[#f5f5f7] tabular-nums">
              {currencySymbol}{annualTotal.toFixed(2)}
              <span className="text-xs text-[#86868b] font-normal"> / yr</span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/[0.08] hidden sm:block"></div>
          <div className="space-y-0.5 hidden sm:block">
            <div className="text-[11px] uppercase tracking-wider text-[#86868b]">Active Services</div>
            <div className="text-lg font-medium text-[#f5f5f7] tabular-nums">
              {activeSubs.length}
            </div>
          </div>
          {lowUsageCount > 0 && (
            <>
              <div className="h-8 w-px bg-white/[0.08] hidden md:block"></div>
              <div className="space-y-0.5 hidden md:block">
                <div className="text-[11px] uppercase tracking-wider text-[#86868b]">Low Utilization</div>
                <div className="text-lg font-medium text-[#ff9f0a] tabular-nums">
                  {lowUsageCount} flagged
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="w-full rounded-2xl bg-[#1c1c1e]/40 border border-white/[0.08] backdrop-blur-2xl overflow-hidden flex flex-col h-[calc(100vh-16rem)] min-h-[520px]" style={{ boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)' }}>
        <div className="px-5 py-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#0071e3] animate-pulse"></div>
            <span className="text-xs font-medium text-[#f5f5f7]">Vigil Live Price Intelligence Active</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setMessages([
                {
                  id: getNextMessageId('reset'),
                  role: 'assistant',
                  content: 'Session refreshed. Ready to audit subscriptions.',
                  timestamp: getFormattedTime(),
                },
              ]);
              toast.info('Conversation reset');
            }}
            className="p-1.5 rounded-lg text-[#86868b] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors active:scale-95"
            title="Reset conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-[#0071e3]/15 border border-[#0071e3]/30 flex items-center justify-center text-[#2997ff] shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[78%] space-y-3 ${isUser ? 'items-end' : 'items-start'}`}>
                  {msg.toolCallHistory && msg.toolCallHistory.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {msg.toolCallHistory.map((t, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-[#86868b] border border-white/[0.06]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3]"></span>
                          <span>{t.toolName}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-[13px] leading-relaxed select-text ${
                      isUser
                        ? 'bg-[#0071e3] text-white rounded-tr-sm ml-auto font-sans shadow-md shadow-[#0071e3]/20'
                        : 'bg-[#1c1c1e] text-[#f5f5f7] border border-white/[0.08] rounded-tl-sm'
                    }`}
                    style={!isUser ? { boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)' } : undefined}
                  >
                    <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                    <div className={`mt-2 text-[10px] font-mono ${isUser ? 'text-white/60 text-right' : 'text-[#86868b]'}`}>
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.priceResearchResult && (
                    <div className="w-full rounded-2xl bg-[#1c1c1e] border border-white/[0.1] p-4 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4 text-[#2997ff]" />
                          <span className="text-xs font-semibold text-white">
                            Verified Pricing: {msg.priceResearchResult.serviceName}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                          msg.priceResearchResult.overallStatus === 'VERIFIED'
                            ? 'bg-[#30d158]/10 text-[#30d158] border-[#30d158]/20'
                            : msg.priceResearchResult.overallStatus === 'CROSS_CHECKED'
                            ? 'bg-[#2997ff]/10 text-[#2997ff] border-[#2997ff]/20'
                            : 'bg-[#ff9f0a]/10 text-[#ff9f0a] border-[#ff9f0a]/20'
                        }`}>
                          {msg.priceResearchResult.overallStatus.replace('_', ' ')}
                        </span>
                      </div>

                      {msg.priceResearchResult.sourceUrl && (
                        <div className="text-[11px] text-[#86868b] flex items-center gap-1.5">
                          <span>Source:</span>
                          <a
                            href={msg.priceResearchResult.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2997ff] hover:underline flex items-center gap-0.5"
                          >
                            <span>{msg.priceResearchResult.sourceTitle || msg.priceResearchResult.sourceUrl}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {msg.priceResearchResult.plans.map((p, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-white">{p.name}</span>
                              <span className="font-mono text-white tabular-nums">
                                {msg.priceResearchResult?.currency} {p.amount}/{p.cycle === 'YEARLY' ? 'yr' : 'mo'}
                              </span>
                            </div>
                            {p.features && (
                              <p className="text-[11px] text-[#86868b] line-clamp-2">{p.features}</p>
                            )}
                            <div className="flex gap-1.5 pt-1 flex-wrap">
                              {p.isStudentDiscount && (
                                <span className="text-[9px] font-mono text-[#2997ff] bg-[#0071e3]/10 px-1.5 py-0.5 rounded">Student Rate</span>
                              )}
                              {p.isIntroductory && (
                                <span className="text-[9px] font-mono text-[#ff9f0a] bg-[#ff9f0a]/10 px-1.5 py-0.5 rounded">Introductory Offer</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.actionRequired && (
                    <div className="w-full rounded-2xl bg-[#1c1c1e] border border-white/[0.1] p-4 space-y-3 shadow-xl">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-[#0071e3]/20 text-[#2997ff]">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-white">
                              {msg.actionRequired.type === 'CONFIRM_CANCEL' ? 'Subscription Cancellation' : 'Subscription Suspension'}
                            </h4>
                            <p className="text-[11px] text-[#86868b]">PayPal Sandbox Human-in-the-Loop Gateway</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#2997ff] bg-[#0071e3]/10 px-2 py-0.5 rounded border border-[#0071e3]/20">
                          Pending Approval
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-black/40 p-3 rounded-xl border border-white/[0.04]">
                        <div>
                          <span className="text-[#86868b] block text-[10px] uppercase">Service</span>
                          <span className="text-white font-sans font-medium">{msg.actionRequired.subscriptionName}</span>
                        </div>
                        <div>
                          <span className="text-[#86868b] block text-[10px] uppercase">Outflow</span>
                          <span className="text-white font-mono tabular-nums">
                            {currencySymbol}{convertAmount(msg.actionRequired.amount, msg.actionRequired.currency || 'USD', currencyCode, rates).toFixed(2)}
                          </span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-white/[0.04]">
                          <span className="text-[#86868b] block text-[10px] uppercase">PayPal Agreement ID</span>
                          <span className="text-[#2997ff] break-all">{msg.actionRequired.paypalAgreementId || 'N/A'}</span>
                        </div>
                        {msg.actionRequired.reason && (
                          <div className="col-span-2 text-[11px] text-[#86868b]">
                            Rationale: {msg.actionRequired.reason}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-end gap-2">
                        {msg.actionRequired.status === 'EXECUTED' ? (
                          <div className="flex items-center gap-1.5 text-xs text-[#30d158] font-medium py-1 px-3 bg-[#30d158]/10 rounded-xl border border-[#30d158]/20">
                            <Check className="w-3.5 h-3.5" />
                            <span>Executed on PayPal</span>
                          </div>
                        ) : msg.actionRequired.status === 'REJECTED' ? (
                          <div className="flex items-center gap-1.5 text-xs text-[#86868b] py-1 px-3 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                            <X className="w-3.5 h-3.5" />
                            <span>Declined</span>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={executingActionId === msg.id}
                              onClick={() => handleDeclineAction(msg.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-[#86868b] hover:text-white transition-colors active:scale-[0.96]"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              disabled={executingActionId === msg.id}
                              onClick={() => handleAuthorizeAction(msg.id, msg.actionRequired!)}
                              className="px-4 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.96] disabled:opacity-50"
                            >
                              {executingActionId === msg.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Executing on PayPal...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Authorize Execution</span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {msg.alternatives && msg.alternatives.length > 0 && (
                    <div className="w-full space-y-2 pt-1">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#86868b] flex items-center gap-1.5">
                        <TrendingDown className="w-3.5 h-3.5 text-[#30d158]" />
                        <span>Channel3 Cost Alternatives</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {msg.alternatives.map((alt) => (
                          <div
                            key={alt.id}
                            className="rounded-2xl bg-[#1c1c1e]/60 border border-white/[0.08] p-4 hover:border-white/[0.16] transition-all flex flex-col justify-between"
                            style={{ boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)' }}
                          >
                            <div>
                              <div className="flex items-center justify-between text-[11px] font-mono text-[#86868b] mb-1.5">
                                <span>{alt.category}</span>
                                <span className="text-[#30d158] font-medium tabular-nums">
                                  +${alt.estimatedAnnualSaving}/yr saving
                                </span>
                              </div>
                              <h4 className="text-xs font-semibold text-white line-clamp-1">{alt.title}</h4>
                              <p className="text-[11px] text-[#86868b] mt-0.5 line-clamp-1">
                                {alt.brand} • {alt.merchantName}
                              </p>
                            </div>

                            <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between">
                              <div>
                                <span className="text-xs font-mono font-medium text-white tabular-nums">
                                  ${alt.price.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-[#86868b] ml-1 uppercase font-mono">
                                  {alt.recurringOrLifetime.toLowerCase()}
                                </span>
                              </div>

                              <a
                                href={alt.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white border border-white/[0.08] transition-colors active:scale-[0.96]"
                              >
                                <span>Inspect</span>
                                <ArrowUpRight className="w-3.5 h-3.5 text-[#86868b]" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3.5 items-center text-xs text-[#86868b]">
              <div className="w-7 h-7 rounded-xl bg-[#0071e3]/15 border border-[#0071e3]/30 flex items-center justify-center text-[#2997ff] shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#1c1c1e]/80 border border-white/[0.08]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0071e3]" />
                <span>Vigil is researching live prices & auditing agreements...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="px-4 py-2 border-t border-white/[0.06] bg-black/20 flex gap-2 overflow-x-auto no-scrollbar">
          {samplePrompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleSendMessage(p)}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] text-[#86868b] hover:text-white shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3 text-[#2997ff]" />
              <span>{p}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/[0.08] bg-black/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2.5"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Vigil to research plans in any country, compare tools, or audit spend..."
              disabled={loading}
              className="flex-1 bg-[#1c1c1e]/80 border border-white/[0.1] rounded-xl px-4 py-3 text-xs sm:text-[13px] text-white placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-3 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white transition-all active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-md shadow-[#0071e3]/20 cursor-pointer"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-2.5 text-center text-[10px] text-[#86868b] font-mono">
            PayPilot Safety Guard: Billing changes require explicit confirmation before dispatch to PayPal.
          </div>
        </div>
      </div>
    </div>
  );
}
