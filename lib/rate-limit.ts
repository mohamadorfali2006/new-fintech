// In-memory fixed-window rate limiter shared by auth routes + middleware.
//
// Edge-safe: pure Map + Date.now(), no Node APIs, so it can be imported
// from middleware.ts (edge runtime) as well as Node route handlers.
//
// NOTE (prod TODO): this store is per-isolate/per-instance memory. Correct
// for single-instance deploys; multi-instance production needs a shared
// store (Redis / Upstash / DB-backed sliding window) behind this interface.

export interface RateLimitResult {
  allowed: boolean;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Seconds until the window resets (meaningful when !allowed). */
  retryAfterSec: number;
  resetAt: number;
}

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
    if (buckets.size < MAX_BUCKETS / 2) break;
  }
}

/** Fixed-window check + consume. Key should already encode scope + identity. */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size >= MAX_BUCKETS) pruneExpired(now);
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0, resetAt };
  }
  bucket.count += 1;
  if (bucket.count <= limit) {
    return {
      allowed: true,
      remaining: limit - bucket.count,
      retryAfterSec: 0,
      resetAt: bucket.resetAt,
    };
  }
  return {
    allowed: false,
    remaining: 0,
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    resetAt: bucket.resetAt,
  };
}

/** Best-effort client IP for rate-limit keys (proxy-aware). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

/**
 * Sync, non-crypto string hash (djb2) for building rate-limit keys from
 * sensitive values (e.g. session cookies) WITHOUT storing the raw value
 * in memory. Not for security purposes — key bucketing only.
 */
export function hashKey(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) + h + value.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

/** 429 JSON response with a Retry-After header (seconds). */
export function rateLimitedResponse(
  retryAfterSec: number,
  message: string = "Too many requests. Try again later."
): Response {
  return Response.json(
    { error: message },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}

// ---- Per-user daily AI token budget (consumed by app/api/ai/chat) ----
// Same store caveats as above: per-isolate memory; move to a shared store
// for multi-instance prod.

/** Max estimated AI tokens (prompt + reserved completion) per user per UTC day. */
export const DAILY_AI_TOKEN_CAP = 50_000;
/** Completion tokens reserved on top of the prompt estimate per request. */
export const RESERVED_COMPLETION_TOKENS = 1_000;

export interface AiTokenBudget {
  allowed: boolean;
  used: number;
  remaining: number;
  cap: number;
}

const aiTokenUsage = new Map<string, { date: string; used: number }>();

/**
 * Consume `estimatedTokens` from the user's daily budget. Returns the
 * post-consume usage; when over cap nothing is consumed and allowed=false.
 */
export function consumeAiTokens(
  userId: string,
  estimatedTokens: number,
  now: number = Date.now()
): AiTokenBudget {
  const day = new Date(now).toISOString().slice(0, 10);
  const key = `${userId}:${day}`;
  const used = aiTokenUsage.get(key)?.used ?? 0;
  if (used + estimatedTokens > DAILY_AI_TOKEN_CAP) {
    return {
      allowed: false,
      used,
      remaining: Math.max(0, DAILY_AI_TOKEN_CAP - used),
      cap: DAILY_AI_TOKEN_CAP,
    };
  }
  const next = used + estimatedTokens;
  aiTokenUsage.set(key, { date: day, used: next });
  if (aiTokenUsage.size > MAX_BUCKETS) {
    for (const [k, v] of aiTokenUsage) {
      if (v.date !== day) aiTokenUsage.delete(k);
      if (aiTokenUsage.size < MAX_BUCKETS / 2) break;
    }
  }
  return {
    allowed: true,
    used: next,
    remaining: DAILY_AI_TOKEN_CAP - next,
    cap: DAILY_AI_TOKEN_CAP,
  };
}
