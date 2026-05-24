export type RuntimeSessionCandidate = {
  id: string;
  title?: string | null;
  preview?: string | null;
  lastActive?: string | null;
  messageCount?: number | null;
  parentSessionId?: string | null;
  source?: string | null;
  sortTimestamp?: number | null;
};

export function normalizeSessionText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function previewSessionText(value: unknown) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || "-";
}

export function formatSessionRelativeTime(epochSeconds: unknown, nowMs = Date.now()) {
  const tsMs = Number(epochSeconds || 0) * 1000;
  if (!Number.isFinite(tsMs) || tsMs <= 0) return "-";
  const diffMs = Math.max(0, nowMs - tsMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < day * 2) return "yesterday";
  return `${Math.floor(diffMs / day)}d ago`;
}

export function mergeRuntimeSessions({
  primary = [],
  secondary = [],
  previewBySessionId = {},
  lastActivityBySessionId = {},
  nowMs = Date.now(),
}: {
  primary?: RuntimeSessionCandidate[];
  secondary?: RuntimeSessionCandidate[];
  previewBySessionId?: Record<string, string>;
  lastActivityBySessionId?: Record<string, number>;
  nowMs?: number;
}) {
  const merged = new Map<string, RuntimeSessionCandidate>();

  for (const session of primary) {
    if (!session.id) continue;
    merged.set(session.id, {
      id: String(session.id),
      title: normalizeSessionText(session.title),
      preview: previewSessionText(session.preview),
      lastActive: normalizeSessionText(session.lastActive),
      messageCount: Number(session.messageCount || 0),
      parentSessionId: session.parentSessionId || null,
      source: session.source || null,
      sortTimestamp: Number(session.sortTimestamp || 0),
    });
  }

  for (const session of secondary) {
    if (!session.id) continue;
    const existing: RuntimeSessionCandidate = merged.get(session.id) || { id: session.id };
    const lastActivity = Number(lastActivityBySessionId[session.id] || 0);
    const fallbackTimestamp = Number(session.sortTimestamp || existing.sortTimestamp || 0);
    const sortTimestamp = lastActivity > 0 ? lastActivity : fallbackTimestamp;
    merged.set(session.id, {
      ...existing,
      id: String(session.id),
      title: normalizeSessionText(session.title, existing.title || "-"),
      preview: previewSessionText(previewBySessionId[session.id] || session.preview || existing.preview),
      lastActive: sortTimestamp ? formatSessionRelativeTime(sortTimestamp, nowMs) : normalizeSessionText(session.lastActive || existing.lastActive),
      messageCount: Number(session.messageCount || existing.messageCount || 0),
      parentSessionId: session.parentSessionId || existing.parentSessionId || null,
      source: session.source || existing.source || null,
      sortTimestamp,
    });
  }

  return [...merged.values()]
    .sort((left, right) => Number(right.sortTimestamp || 0) - Number(left.sortTimestamp || 0) || right.id.localeCompare(left.id))
    .map((session) => {
      const next = { ...session };
      delete next.sortTimestamp;
      return next;
    });
}
