'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Subscription, 
  AgentChatMessage, 
  AgentAction, 
  AlternativeRecommendation 
} from '@/types';
import { 
  Send, 
  Bot, 
  User, 
  ShieldCheck, 
  Sparkles, 
  AlertTriangle, 
  Check, 
  X, 
  Loader2, 
  ExternalLink, 
  RefreshCw,
  ShoppingBag,
  Calendar,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

interface VigilChatViewProps {
  subscriptions: Subscription[];
  currencySymbol?: string;
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
  onExecuteAction,
}: VigilChatViewProps) {
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: 'welcome_msg',
      role: 'assistant',
      content: `### Welcome to Vigil — Autonomous Spend Guardian & Copilot\n\nI am connected to your active subscriptions and PayPal Sandbox billing pipeline.\n\nI can audit redundant SaaS tools, search Channel3 for cheaper lifetime alternatives, check upcoming renewal cliffs, and prepare safe PayPal cancellations with your confirmation.\n\nHow can I protect your cash flow today?`,
      timestamp: getFormattedTime(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (userPrompt?: string) => {
    const textToSend = (userPrompt || input).trim();
    if (!textToSend || loading) return;

    const userMessage: AgentChatMessage = {
      id: getNextMessageId('user'),
      role: 'user',
      content: textToSend,
      timestamp: getFormattedTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!userPrompt) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          subscriptions,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reach Vigil Copilot');
      }

      const data: {
        content: string;
        actionRequired?: AgentAction;
        alternatives?: AlternativeRecommendation[];
        toolCallHistory?: { toolName: string; input: Record<string, unknown>; summary: string }[];
      } = await res.json();

      const assistantMessage: AgentChatMessage = {
        id: getNextMessageId('vigil'),
        role: 'assistant',
        content: data.content,
        timestamp: getFormattedTime(),
        actionRequired: data.actionRequired,
        alternatives: data.alternatives,
        toolCallHistory: data.toolCallHistory,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Communication error';
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: getNextMessageId('err'),
          role: 'assistant',
          content: `⚠️ **Connection Notice**: ${msg}. Please ensure the server is running and try again.`,
          timestamp: getFormattedTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizeAction = async (msgId: string, action: AgentAction) => {
    if (!action.paypalAgreementId) {
      toast.error('Missing PayPal agreement reference');
      return;
    }

    setExecutingActionId(msgId);
    try {
      const actionType = action.type === 'CONFIRM_CANCEL' ? 'CANCEL' : 'SUSPEND';
      await onExecuteAction(actionType, action.subscriptionId || '', action.paypalAgreementId);

      // Update message state
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId && m.actionRequired) {
            return {
              ...m,
              actionRequired: {
                ...m.actionRequired,
                status: 'EXECUTED',
              },
            };
          }
          return m;
        })
      );

      toast.success(
        action.type === 'CONFIRM_CANCEL'
          ? `Executed cancellation on PayPal for ${action.subscriptionName}`
          : `Paused ${action.subscriptionName} via PayPal Sandbox`
      );
    } catch {
      toast.error('Failed to execute action on PayPal Sandbox');
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
              status: 'REJECTED',
            },
          };
        }
        return m;
      })
    );
    toast.info('Action declined. Your PayPal subscription agreement remains unchanged.');
  };

  const quickPrompts = [
    { label: 'Portfolio Audit', icon: Layers, prompt: 'Run a full audit of my active subscriptions and calculate recoverable savings.' },
    { label: 'Zombie Spend', icon: AlertTriangle, prompt: 'Identify my zombie and low-utilization subscriptions under 40% usage.' },
    { label: 'Find Alternatives', icon: ShoppingBag, prompt: 'Find cheaper and lifetime software alternatives for my expensive subscriptions.' },
    { label: 'Upcoming Renewals', icon: Calendar, prompt: 'What subscriptions are scheduled for renewal this week?' },
  ];

  return (
    <div className="w-full max-w-4xl flex flex-col h-[calc(100vh-8rem)] rounded-3xl bg-[#141519]/80 border border-white/[0.08] backdrop-blur-2xl shadow-2xl overflow-hidden">
      {/* Top Banner */}
      <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0071e3] to-[#2997ff] flex items-center justify-center text-white shadow-lg shadow-[#0071e3]/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white tracking-tight">Vigil AI Copilot</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse"></span>
                Gemini 2.5 Flash
              </span>
            </div>
            <p className="text-xs text-[#86868b] mt-0.5">
              Autonomous Financial Intelligence with Controlled PayPal Actions
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setMessages([
              {
                id: getNextMessageId('reset'),
                role: 'assistant',
                content: 'Chat session refreshed. Ready to analyze your subscription portfolio.',
                timestamp: getFormattedTime(),
              },
            ]);
            toast.info('Chat session reset');
          }}
          className="p-2 rounded-xl text-[#86868b] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          title="Reset conversation"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-6 py-2.5 border-b border-white/[0.06] bg-black/20 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] text-[#86868b] uppercase tracking-wider font-mono mr-1 shrink-0">
          Quick Actions:
        </span>
        {quickPrompts.map((q) => {
          const Icon = q.icon;
          return (
            <button
              key={q.label}
              type="button"
              disabled={loading}
              onClick={() => handleSendMessage(q.prompt)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] text-xs text-[#d2d2d7] hover:text-white flex items-center gap-1.5 shrink-0 transition-all active:scale-[0.97] disabled:opacity-50"
            >
              <Icon className="w-3.5 h-3.5 text-[#2997ff]" />
              <span>{q.label}</span>
            </button>
          );
        })}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-[#0071e3]/20 border border-[#0071e3]/30 flex items-center justify-center text-[#2997ff] shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[75%] space-y-3 ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Tool Executed Badge */}
                {msg.toolCallHistory && msg.toolCallHistory.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {msg.toolCallHistory.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-[#86868b] border border-white/[0.08]"
                      >
                        <Sparkles className="w-3 h-3 text-[#2997ff]" />
                        <span>Tool: {t.toolName}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl p-4 text-xs sm:text-[13px] leading-relaxed select-text ${
                    isUser
                      ? 'bg-[#0071e3] text-white shadow-md rounded-br-xs'
                      : 'bg-[#1c1c1e] text-[#f5f5f7] border border-white/[0.08] shadow-md rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">
                    {msg.content}
                  </div>
                  <div className={`text-[10px] mt-2 font-mono ${isUser ? 'text-white/60 text-right' : 'text-[#86868b]'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {/* Action Confirmation Card (Human-in-the-loop Guard) */}
                {msg.actionRequired && (
                  <div className="w-full rounded-2xl bg-[#1c1c1e] border-2 border-[#ff9f0a]/50 p-4 shadow-xl space-y-3 select-none animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#ff9f0a]" />
                        <span className="text-xs font-semibold text-white">
                          PayPal Authorization Required
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/20">
                        {msg.actionRequired.type === 'CONFIRM_CANCEL' ? 'CANCEL AGREEMENT' : 'PAUSE AGREEMENT'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[#86868b] block text-[11px]">Service</span>
                        <span className="font-medium text-white">{msg.actionRequired.subscriptionName}</span>
                      </div>
                      <div>
                        <span className="text-[#86868b] block text-[11px]">Amount</span>
                        <span className="font-mono font-medium text-white">
                          {currencySymbol}{msg.actionRequired.amount.toFixed(2)}/mo
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[#86868b] block text-[11px]">PayPal Agreement ID</span>
                        <span className="font-mono text-white text-[11px] bg-black/40 px-2 py-0.5 rounded border border-white/[0.06] inline-block">
                          {msg.actionRequired.paypalAgreementId}
                        </span>
                      </div>
                      {msg.actionRequired.reason && (
                        <div className="col-span-2 text-[11px] text-[#a1a1a6]">
                          *Reason:* {msg.actionRequired.reason}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-white/[0.08] flex items-center justify-end gap-2">
                      {msg.actionRequired.status === 'EXECUTED' ? (
                        <div className="flex items-center gap-1.5 text-xs text-[#30d158] font-medium py-1 px-3 bg-[#30d158]/10 rounded-xl border border-[#30d158]/20">
                          <Check className="w-3.5 h-3.5" />
                          <span>Executed on PayPal Sandbox</span>
                        </div>
                      ) : msg.actionRequired.status === 'REJECTED' ? (
                        <div className="flex items-center gap-1.5 text-xs text-[#86868b] py-1 px-3 bg-white/[0.04] rounded-xl">
                          <X className="w-3.5 h-3.5" />
                          <span>Action Declined by User</span>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={executingActionId === msg.id}
                            onClick={() => handleDeclineAction(msg.id)}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-[#86868b] hover:text-white transition-colors"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            disabled={executingActionId === msg.id}
                            onClick={() => handleAuthorizeAction(msg.id, msg.actionRequired!)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.96] shadow-md shadow-[#0071e3]/20 disabled:opacity-50"
                          >
                            {executingActionId === msg.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Executing via PayPal...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Authorize PayPal Execution</span>
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Alternative Deals Cards (Channel3 Discovery) */}
                {msg.alternatives && msg.alternatives.length > 0 && (
                  <div className="w-full space-y-2 pt-1">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#86868b] flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-[#30d158]" />
                      <span>Channel3 Verified Product Graph Deals</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {msg.alternatives.map((alt) => (
                        <div
                          key={alt.id}
                          className="rounded-xl bg-[#1c1c1e] border border-white/[0.08] p-3 hover:border-white/[0.18] transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-[#86868b] mb-1">
                              <span>{alt.category}</span>
                              <span className="text-[#30d158] font-semibold">
                                +${alt.estimatedAnnualSaving}/yr savings
                              </span>
                            </div>
                            <h4 className="text-xs font-semibold text-white line-clamp-1">{alt.title}</h4>
                            <p className="text-[11px] text-[#86868b] mt-0.5 line-clamp-1">
                              By {alt.brand} • {alt.merchantName}
                            </p>
                          </div>

                          <div className="pt-2 mt-2 border-t border-white/[0.06] flex items-center justify-between">
                            <div>
                              <span className="text-xs font-mono font-bold text-white tabular-nums">
                                ${alt.price.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-[#86868b] ml-1">
                                {alt.recurringOrLifetime.toLowerCase()}
                              </span>
                            </div>

                            <a
                              href={alt.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[11px] font-medium text-white transition-colors"
                            >
                              <span>View Deal</span>
                              <ExternalLink className="w-3 h-3 text-[#86868b]" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-white/[0.08] flex items-center justify-center text-white shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3.5 items-center text-xs text-[#86868b]">
            <div className="w-8 h-8 rounded-xl bg-[#0071e3]/20 border border-[#0071e3]/30 flex items-center justify-center text-[#2997ff] shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#1c1c1e] border border-white/[0.08]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2997ff]" />
              <span>Vigil is auditing portfolio & consulting Channel3...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-white/[0.08] bg-black/40">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Vigil to audit spend, find alternatives, or cancel subscriptions..."
            disabled={loading}
            className="flex-1 bg-[#1c1c1e] border border-white/[0.1] rounded-2xl px-4 py-3 text-xs sm:text-[13px] text-white placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#0071e3]/20"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-2 text-center text-[10px] text-[#86868b]">
          PayPilot Safety Guard: Destructive billing changes require your explicit confirmation before dispatch to PayPal.
        </div>
      </div>
    </div>
  );
}
