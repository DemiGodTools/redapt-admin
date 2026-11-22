// lib/rateLimit.ts
// In-memory sliding window rate limiter for critical endpoints

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Checks if key has exceeded maxRequests within windowSeconds.
 * Returns { isRateLimited: boolean, remaining: number, resetSeconds: number }
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 15,
  windowSeconds: number = 60
): { isRateLimited: boolean; remaining: number; resetSeconds: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const cutoff = now - windowMs;

  const record = rateLimitMap.get(key) || { timestamps: [] };
  // Filter out timestamps older than window
  record.timestamps = record.timestamps.filter((t) => t > cutoff);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      isRateLimited: true,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  record.timestamps.push(now);
  rateLimitMap.set(key, record);

  // Periodic cleanup if map grows large
  if (rateLimitMap.size > 10000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.timestamps.length === 0 || v.timestamps[v.timestamps.length - 1] < cutoff) {
        rateLimitMap.delete(k);
      }
    }
  }

  return {
    isRateLimited: false,
    remaining: maxRequests - record.timestamps.length,
    resetSeconds: windowSeconds,
  };
}
