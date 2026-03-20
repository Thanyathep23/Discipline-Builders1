interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60 * 60 * 1000;
const MAX_UPLOADS_PER_WINDOW = 20;

const store = new Map<string, RateLimitEntry>();

export function checkUploadRateLimit(userId: string): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || now > entry.resetAt) {
    store.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_UPLOADS_PER_WINDOW - 1, resetInSeconds: Math.round(WINDOW_MS / 1000) };
  }

  if (entry.count >= MAX_UPLOADS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.round((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: MAX_UPLOADS_PER_WINDOW - entry.count,
    resetInSeconds: Math.round((entry.resetAt - now) / 1000),
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 10 * 60 * 1000);
