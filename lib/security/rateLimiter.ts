import { NextRequest, NextResponse } from "next/server";

interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMIT_RULES: Record<string, RateLimitRule> = {
  AUTH_LOGIN: { limit: 10, windowSeconds: 60 },
  AUTH_SIGNUP: { limit: 5, windowSeconds: 60 },
  AUTH_OTP: { limit: 5, windowSeconds: 60 },
  CHAT_MESSAGE: { limit: 30, windowSeconds: 60 },
  FILE_UPLOAD: { limit: 10, windowSeconds: 60 },
  FILE_DOWNLOAD: { limit: 60, windowSeconds: 60 },
  TRANSLATION: { limit: 40, windowSeconds: 60 },
  ADMIN_API: { limit: 120, windowSeconds: 60 },
  DEFAULT: { limit: 60, windowSeconds: 60 },
};

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetAt) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Checks and increments rate limit for an identifier + action key.
 */
export function checkRateLimit(identifier: string, actionKey: string): RateLimitResult {
  const rule = RATE_LIMIT_RULES[actionKey] || RATE_LIMIT_RULES.DEFAULT;
  const key = `${actionKey}:${identifier}`;
  const now = Date.now();

  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + rule.windowSeconds * 1000;
    memoryStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit: rule.limit,
      remaining: rule.limit - 1,
      resetInSeconds: rule.windowSeconds,
    };
  }

  if (entry.count >= rule.limit) {
    const resetInSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return {
      allowed: false,
      limit: rule.limit,
      remaining: 0,
      resetInSeconds,
    };
  }

  entry.count += 1;
  const resetInSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  return {
    allowed: true,
    limit: rule.limit,
    remaining: rule.limit - entry.count,
    resetInSeconds,
  };
}

/**
 * Extracts client IP address from Next.js request headers
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Convenience helper to enforce rate limit on an API endpoint.
 * Returns null if allowed, or a 429 response if blocked.
 */
export function enforceRateLimit(
  req: NextRequest,
  actionKey: string,
  customIdentifier?: string
): NextResponse | null {
  const ip = getClientIp(req);
  const identifier = customIdentifier ? `${customIdentifier}:${ip}` : ip;
  const result = checkRateLimit(identifier, actionKey);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Please slow down.",
        action: actionKey,
        retryAfterSeconds: result.resetInSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": result.resetInSeconds.toString(),
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": result.resetInSeconds.toString(),
        },
      }
    );
  }

  return null;
}
