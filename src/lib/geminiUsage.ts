export interface GeminiUsageMetrics {
  totalRequests: number;
  groundingSearchRequests: number;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  rateLimitHits: number;
  cacheHits: number;
  lastRequestAt?: string;
}

const metrics: GeminiUsageMetrics = {
  totalRequests: 0,
  groundingSearchRequests: 0,
  promptTokens: 0,
  candidatesTokens: 0,
  totalTokens: 0,
  rateLimitHits: 0,
  cacheHits: 0,
};

export function recordGeminiUsage(params: {
  isGrounding?: boolean;
  promptTokens?: number;
  candidatesTokens?: number;
  totalTokens?: number;
  isRateLimit?: boolean;
}) {
  metrics.totalRequests += 1;
  metrics.lastRequestAt = new Date().toISOString();

  if (params.isGrounding) {
    metrics.groundingSearchRequests += 1;
  }
  if (params.isRateLimit) {
    metrics.rateLimitHits += 1;
  }
  if (params.promptTokens) {
    metrics.promptTokens += params.promptTokens;
  }
  if (params.candidatesTokens) {
    metrics.candidatesTokens += params.candidatesTokens;
  }
  if (params.totalTokens) {
    metrics.totalTokens += params.totalTokens;
  }
}

export function recordCacheHit() {
  metrics.cacheHits += 1;
}

export function getGeminiUsageMetrics(): Readonly<GeminiUsageMetrics> {
  return { ...metrics };
}

export function resetGeminiUsageMetrics() {
  metrics.totalRequests = 0;
  metrics.groundingSearchRequests = 0;
  metrics.promptTokens = 0;
  metrics.candidatesTokens = 0;
  metrics.totalTokens = 0;
  metrics.rateLimitHits = 0;
  metrics.cacheHits = 0;
  metrics.lastRequestAt = undefined;
}

