// Short-lived in-flight + result cache for expensive async reads (gh CLI calls,
// shell scripts, vault scans). It caches the *Promise*, so concurrent callers
// within the TTL window share a single underlying call instead of each spawning
// their own — this both de-dupes simultaneous requests and serves rapid repeat
// reads from memory. Failed calls are evicted immediately so errors are never
// cached.

type CacheEntry = { at: number; value: Promise<unknown> };

const cache = new Map<string, CacheEntry>();

export function cachedCall<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = fn();
  cache.set(key, { at: now, value });
  // Never cache a rejection: drop the entry once it settles to an error so the
  // next caller retries instead of replaying a stale failure.
  value.catch(() => {
    const current = cache.get(key);
    if (current && current.value === value) cache.delete(key);
  });
  return value;
}

// Drop every cached entry whose key starts with `prefix`. Call this from
// mutating code paths so the next read reflects the write immediately rather
// than waiting out the TTL.
export function invalidateCachedCall(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
