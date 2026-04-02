/**
 * Auth Rate Limiter — Phase 20
 *
 * Per-IP in-memory rate limiter for login attempts.
 * Protects against brute-force credential stuffing.
 *
 * Limits: 10 attempts per IP per 15-minute window.
 * On 429: returns retryAfterSeconds.
 * Memory cleaned up every 5 minutes to prevent unbounded growth.
 *
 * Note: In-memory only — resets on server restart. Acceptable for single-instance
 * deployment; upgrade to Redis for multi-instance.
 */

interface LoginAttemptRecord {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;
const store = new Map<string, LoginAttemptRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of store.entries()) {
    if (now - record.windowStart > WINDOW_MS) {
      store.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
}

export function checkLoginRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const record = store.get(ip);

  if (!record || now - record.windowStart > WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return { allowed: true, attemptsRemaining: MAX_ATTEMPTS - 1 };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((record.windowStart + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  record.count += 1;
  return { allowed: true, attemptsRemaining: MAX_ATTEMPTS - record.count };
}

export function recordFailedLogin(ip: string): void {
  // Failed login: already counted by checkLoginRateLimit,
  // but we add an extra count to accelerate block on failures.
  const record = store.get(ip);
  if (record) {
    record.count = Math.min(record.count + 1, MAX_ATTEMPTS);
  }
}

export function resetLoginRateLimit(ip: string): void {
  store.delete(ip);
}
