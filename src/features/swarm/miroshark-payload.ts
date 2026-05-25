import type { MiroSharkTemplate } from "./miroshark-templates";

export type MiroSharkPayloadRun = {
  posts?: unknown;
  runStatus?: unknown;
};

export type MiroSharkPayloadMetadata = {
  templates?: unknown;
};

export type MiroSharkPost = {
  post_id?: number;
  user_id?: number;
  content?: string;
  quote_content?: string | null;
  created_at?: number;
  num_likes?: number;
  num_shares?: number;
  num_dislikes?: number;
  num_reports?: number;
  original_post_id?: number | null;
};

export type VisibleMiroSharkPost = MiroSharkPost & {
  displayText: string;
};

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function payloadData(value: unknown): unknown {
  const record = asRecord(value);
  return Object.prototype.hasOwnProperty.call(record, "data") ? record.data : value;
}

export function payloadArray<T = Record<string, unknown>>(value: unknown): T[] {
  const data = payloadData(value);
  if (Array.isArray(data)) return data as T[];
  const record = asRecord(data);
  for (const key of ["items", "events", "calls", "profiles", "actions", "markets", "nodes", "edges", "history", "posts"]) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate as T[];
  }
  return [];
}

export function payloadCount(value: unknown): number {
  const data = payloadData(value);
  if (Array.isArray(data)) return data.length;
  const record = asRecord(data);
  for (const key of ["count", "total", "node_count", "edge_count", "posts_count", "actions_count"]) {
    const candidate = record[key];
    if (typeof candidate === "number") return candidate;
  }
  const firstArray = Object.values(record).find(Array.isArray);
  return Array.isArray(firstArray) ? firstArray.length : Object.keys(record).length;
}

export function isEmptyIntegrationPayload(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const data = payloadData(value);
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data !== "object" || data === null) return false;
  return payloadCount(value) === 0;
}

export function isUnpublishedSimulationPayload(value: unknown): boolean {
  const record = asRecord(value);
  return record.success === false
    && typeof record.error === "string"
    && record.error.toLowerCase().includes("simulation is not published");
}

export function payloadPreview(value: unknown, max = 6): Array<[string, string]> {
  const data = payloadData(value);
  if (Array.isArray(data)) {
    return data.slice(0, max).map((item, index) => [`#${index + 1}`, compactValue(item)]);
  }
  const record = asRecord(data);
  return Object.entries(record)
    .filter(([, item]) => item !== null && item !== undefined && typeof item !== "object")
    .slice(0, max)
    .map(([key, item]) => [key, String(item)]);
}

export function compactValue(value: unknown): string {
  if (value === null || value === undefined) return "empty";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  const record = asRecord(value);
  const preferred = record.name ?? record.title ?? record.label ?? record.agent_name ?? record.username ?? record.content ?? record.text ?? record.event_type ?? record.type ?? record.status;
  if (preferred !== undefined && preferred !== null) return String(preferred);
  return JSON.stringify(value).slice(0, 180);
}

export function getMiroSharkTemplates(metadata: MiroSharkPayloadMetadata | null): MiroSharkTemplate[] {
  return payloadArray<MiroSharkTemplate>(metadata?.templates);
}

export function getMiroSharkRunStatus(run: MiroSharkPayloadRun | null) {
  return (run?.runStatus as { data?: { runner_status?: string; current_round?: number; twitter_current_round?: number; total_rounds?: number; progress_percent?: number; twitter_actions_count?: number; total_actions_count?: number } } | undefined)?.data;
}

export function isMiroSharkRunTerminal(status?: string) {
  return status === "completed" || status === "failed" || status === "stopped";
}

export function getMiroSharkPosts(run: MiroSharkPayloadRun | null) {
  const data = (run?.posts as { data?: { count?: number; raw_count?: number; posts?: MiroSharkPost[] } } | undefined)?.data;
  const posts = (data?.posts ?? []).flatMap<VisibleMiroSharkPost>((post) => {
    const displayText = (post.quote_content || post.content || "").trim();
    return displayText ? [{ ...post, displayText }] : [];
  }).sort((a, b) => {
    const tickA = typeof a.created_at === "number" ? a.created_at : Number.MAX_SAFE_INTEGER;
    const tickB = typeof b.created_at === "number" ? b.created_at : Number.MAX_SAFE_INTEGER;
    if (tickA !== tickB) return tickA - tickB;
    const postA = typeof a.post_id === "number" ? a.post_id : Number.MAX_SAFE_INTEGER;
    const postB = typeof b.post_id === "number" ? b.post_id : Number.MAX_SAFE_INTEGER;
    return postA - postB;
  });
  return {
    count: posts.length,
    sourceCount: data?.raw_count ?? data?.count ?? posts.length,
    posts,
  };
}
