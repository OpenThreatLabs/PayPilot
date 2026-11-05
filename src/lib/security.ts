interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export function checkRateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: limit - 1, resetInSec: Math.ceil(windowMs / 1000) };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInSec: Math.max(1, Math.ceil((record.resetTime - now) / 1000)),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetInSec: Math.max(1, Math.ceil((record.resetTime - now) / 1000)),
  };
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

export function sanitizeUserText(input: unknown, maxLength: number = 2000): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim().slice(0, maxLength);
  return trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function detectPromptInjection(text: string): { suspicious: boolean; reason?: string } {
  const lower = text.toLowerCase();
  const patterns = [
    /ignore (all )?(previous|prior) (instructions|directions|prompts)/i,
    /system override/i,
    /reveal (your |the )?(system prompt|instructions|credentials|api keys)/i,
    /bypass (safety|security|authorization|sandbox)/i,
    /you are now in god mode/i,
    /jailbreak/i,
    /sudo force (cancel|suspend|charge)/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(lower)) {
      return {
        suspicious: true,
        reason: 'Message contains patterns flagged by PayPilot Safety Guard.',
      };
    }
  }

  return { suspicious: false };
}

export const ALLOWED_AGENT_TOOLS = new Set([
  'analyze_spending',
  'find_alternatives',
  'check_upcoming_renewals',
  'stage_subscription_action',
]);

export function isToolAllowed(toolName: string): boolean {
  return ALLOWED_AGENT_TOOLS.has(toolName);
}
