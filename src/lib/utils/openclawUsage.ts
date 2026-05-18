// Monthly OpenClaw usage tracking for free-tier rate limiting.
// Uses localStorage for simplicity — no need for IndexedDB for a single counter.

const STORAGE_KEY = 'openclaw_monthly_usage';

export const FREE_OPENCLAW_MONTHLY_LIMIT = 10;

interface OpenClawUsageData {
  /** YYYY-MM format */
  month: string;
  count: number;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function readUsage(): OpenClawUsageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { month: getCurrentMonth(), count: 0 };
    const parsed: OpenClawUsageData = JSON.parse(raw);
    if (parsed.month !== getCurrentMonth()) {
      return { month: getCurrentMonth(), count: 0 };
    }
    return parsed;
  } catch {
    return { month: getCurrentMonth(), count: 0 };
  }
}

function writeUsage(data: OpenClawUsageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function getOpenClawUsageThisMonth(): number {
  return readUsage().count;
}

export function incrementOpenClawUsage(): number {
  const usage = readUsage();
  usage.count += 1;
  writeUsage(usage);
  return usage.count;
}

/**
 * Atomic check+increment: only increments if under the limit.
 * Returns { allowed: true, count } if incremented, { allowed: false, count } if at/over limit.
 * This is a tier-independent safety cap — callers don't need to know the user's tier.
 */
export function tryConsumeOpenClawCall(): { allowed: boolean; count: number } {
  const usage = readUsage();
  if (usage.count >= FREE_OPENCLAW_MONTHLY_LIMIT) {
    return { allowed: false, count: usage.count };
  }
  usage.count += 1;
  writeUsage(usage);
  return { allowed: true, count: usage.count };
}

export function hasReachedOpenClawFreeLimit(): boolean {
  return readUsage().count >= FREE_OPENCLAW_MONTHLY_LIMIT;
}

export function getRemainingOpenClawCalls(): number {
  return Math.max(0, FREE_OPENCLAW_MONTHLY_LIMIT - readUsage().count);
}
