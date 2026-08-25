// In-memory per-IP rate limiting. Production should layer a WAF/CDN
// (e.g. Cloudflare) in front; this guards single-instance abuse.

type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 60_000;
const LIMITS: Record<string, number> = {
  global: 120,
  chat: 20,
  write: 40,
  mutation: 60,
  session: 30,
};

const globalForLimiter = globalThis as unknown as { __oyigidiBuckets?: Map<string, Bucket> };
const buckets = globalForLimiter.__oyigidiBuckets ?? (globalForLimiter.__oyigidiBuckets = new Map());

export type RateLimitBucket = keyof typeof LIMITS;

export const checkRateLimit = (
  ip: string,
  bucket: RateLimitBucket,
): { ok: boolean; retryAfterSeconds: number } => {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  if (current.count > (LIMITS[bucket] ?? 60)) {
    return { ok: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSeconds: 0 };
};

export const clientIp = (headers: Headers): string =>
  headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
