// Rate limiting.
//
// Backed by Redis (fixed-window counter via a single atomic Lua script) so
// the limit is shared correctly across every app container/instance — see
// SECURITY.md §9 and Phase 13 of the brief ("must not be a plain in-memory
// object for a multi-instance production app"). docker-compose*.yml runs a
// `redis` service; REDIS_URL points the app at it.
//
// When REDIS_URL is unset (bare `npm run dev` with no Redis running) this
// falls back to an in-memory counter. That fallback is explicitly dev-only:
// it doesn't share state across instances or survive a restart, and a
// production boot with NODE_ENV=production and no REDIS_URL logs a loud
// warning rather than silently degrading to it.
import Redis from "ioredis";
import { env, isProduction } from "./env";
import { logger } from "./logger";

let redis: Redis | null = null;
if (env.REDIS_URL) {
  redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: false });
  redis.on("error", (err) => logger.error({ err }, "Redis connection error (rate limiting)"));
} else if (isProduction) {
  logger.warn(
    "REDIS_URL is not set in production — rate limiting is falling back to a per-instance in-memory counter, which does not work correctly across multiple app containers. Set REDIS_URL."
  );
}

// Lua script: atomically increment a counter and set its expiry only the
// first time it's created, so the window doesn't get extended by every hit.
const LUA_INCR_WITH_EXPIRY = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return current
`;

type Bucket = { count: number; resetAt: number };
const memoryBuckets = new Map<string, Bucket>();

function memoryHit(key: string, windowMs: number): number {
  const now = Date.now();
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  existing.count += 1;
  return existing.count;
}

// Cheap periodic sweep so the in-memory fallback map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) memoryBuckets.delete(key);
  }
}, 60_000).unref?.();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export interface RateLimitOptions {
  /** Unique key for this limiter + identity, e.g. `login:203.0.113.4`. */
  key: string;
  /** Max requests allowed within the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export async function rateLimit({ key, limit, windowMs }: RateLimitOptions): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;
  let count: number;
  if (redis) {
    try {
      count = (await redis.eval(LUA_INCR_WITH_EXPIRY, 1, redisKey, windowMs)) as number;
    } catch (err) {
      logger.error({ err }, "Redis rate-limit check failed; failing open for this request");
      return { allowed: true, remaining: limit, limit };
    }
  } else {
    count = memoryHit(redisKey, windowMs);
  }
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), limit };
}

/** Best-effort client IP from standard proxy headers, falling back to a constant bucket. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
