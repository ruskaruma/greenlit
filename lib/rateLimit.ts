const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const CLEANUP_INTERVAL_MS = 300_000;

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

export function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const entry = store.get(identifier) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  if (entry.timestamps.length >= MAX_REQUESTS_PER_WINDOW) return true;
  entry.timestamps.push(now);
  store.set(identifier, entry);
  return false;
}

setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, CLEANUP_INTERVAL_MS);
