import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

const memoryStore = new Map<string, { count: number; resetTime: number }>();

function createMemoryLimiter(config: RateLimitConfig) {
  return async (identifier: string): Promise<RateLimitResult> => {
    const now = Date.now();
    const entry = memoryStore.get(identifier);

    if (!entry || now >= entry.resetTime) {
      memoryStore.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return { success: true, remaining: config.maxRequests - 1, reset: now + config.windowMs };
    }

    if (entry.count >= config.maxRequests) {
      return { success: false, remaining: 0, reset: entry.resetTime };
    }

    entry.count++;
    return { success: true, remaining: config.maxRequests - entry.count, reset: entry.resetTime };
  };
}

function createRedisLimiter(config: RateLimitConfig) {
  const redis = Redis.fromEnv();
  const windowSeconds = Math.ceil(config.windowMs / 1000);

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${windowSeconds} s`),
    analytics: true,
  });

  return async (identifier: string): Promise<RateLimitResult> => {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  };
}

export function rateLimit(config: RateLimitConfig) {
  const useRedis = !!process.env.REDIS_URL;

  if (useRedis) {
    return createRedisLimiter(config);
  }

  return createMemoryLimiter(config);
}

export const authLimiter = rateLimit({ maxRequests: 5, windowMs: 60_000 });
export const paymentLimiter = rateLimit({ maxRequests: 3, windowMs: 60_000 });
export const apiLimiter = rateLimit({ maxRequests: 30, windowMs: 60_000 });
export const chatLimiter = rateLimit({ maxRequests: 20, windowMs: 30_000 });
