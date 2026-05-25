export type RunStatus = "ok" | "warn" | "failed" | "stale" | "idle";

export interface JobRun { status: RunStatus; at: string; dur: string; }
export interface SchedulerJob {
  id: string;
  name: string;
  description: string;
  cron: string;
  cronLabel: string;
  runtime: string;
  machine: string;
  bee: string;
  enabled: boolean;
  nextRun: string;          // "in 23m", "paused", etc.
  nextRunISO: string;
  lastRun: JobRun;
  history: JobRun[];
  tags: string[];
}
export interface CadenceTemplate {
  id: "cron" | "interval" | "daily" | "weekday" | "session" | "trigger";
  label: string;
  desc: string;
  icon: string;
}

export const SCH_JOBS: SchedulerJob[] = [
  { id: "sch-001", name: "Index Obsidian vault", description: "Full reindex of the brain — embedding refresh + skill registry sync.", cron: "0 2 * * *", cronLabel: "Daily · 02:00 UTC", runtime: "Aeon", machine: "honeycomb", bee: "Aeon-night", enabled: true,  nextRun: "in 5h 18m", nextRunISO: "2026-05-22T02:00:00Z", lastRun: { status: "ok", at: "yesterday 02:00", dur: "1m 42s" }, history: [ { status: "ok", at: "May 20 · 02:00", dur: "1m 41s" }, { status: "ok", at: "May 19 · 02:00", dur: "1m 47s" }, { status: "warn", at: "May 18 · 02:00", dur: "2m 12s" }, { status: "ok", at: "May 17 · 02:00", dur: "1m 38s" } ], tags: ["brain","embed","nightly"] },
  { id: "sch-002", name: "Pull RSS digest",      description: "Hourly news fetch + dedup + injection into the research workspace.", cron: "0 * * * *", cronLabel: "Hourly · :00",      runtime: "Aeon",     machine: "honeycomb", bee: "Aeon-jobs",     enabled: true,  nextRun: "in 23m",     nextRunISO: "2026-05-21T19:00:00Z", lastRun: { status: "ok",     at: "today 18:00",     dur: "8s"  }, history: [ { status: "ok", at: "18:00", dur: "8s" }, { status: "ok", at: "17:00", dur: "9s" }, { status: "ok", at: "16:00", dur: "11s" } ], tags: ["research","hourly"] },
  { id: "sch-003", name: "Rotate broker tokens", description: "Refresh Coinbase / Kraken / OKX broker JWTs and sync via env-add.",  cron: "0 */6 * * *", cronLabel: "Every 6h",        runtime: "OpenClaw", machine: "atlas",     bee: "OpenClaw-eng",  enabled: true,  nextRun: "in 1h 42m",  nextRunISO: "2026-05-21T20:18:00Z", lastRun: { status: "ok",     at: "today 12:18",     dur: "12s" }, history: [ { status: "ok", at: "12:18", dur: "12s" }, { status: "ok", at: "06:18", dur: "11s" }, { status: "stale", at: "May 20 · 00:18", dur: "—" } ], tags: ["secops","tokens"] },
  { id: "sch-004", name: "Auto-post X thread",   description: "Publish whatever the X-thread template currently has staged.",        cron: "30 13 * * *", cronLabel: "Daily · 13:30 ET", runtime: "OpenClaw", machine: "nimbus",    bee: "OpenClaw-x",    enabled: false, nextRun: "paused",     nextRunISO: "2026-05-22T17:30:00Z", lastRun: { status: "failed", at: "yesterday 13:30", dur: "—"  }, history: [ { status: "failed", at: "May 20 · 13:30", dur: "—" }, { status: "ok", at: "May 19 · 13:30", dur: "4s" }, { status: "ok", at: "May 18 · 13:30", dur: "4s" } ], tags: ["channels","x","paused"] },
  { id: "sch-005", name: "Run market-making simulation", description: "Restart the swarm theater with fresh seeds at the open.",     cron: "30 13 * * 1-5", cronLabel: "Weekdays · 13:30 ET", runtime: "MiroShark", machine: "nimbus", bee: "MiroShark-sim", enabled: true,  nextRun: "in 18h 12m", nextRunISO: "2026-05-22T17:30:00Z", lastRun: { status: "ok", at: "today 13:30", dur: "running" }, history: [ { status: "ok", at: "May 20 · 13:30", dur: "8h 02m" }, { status: "ok", at: "May 19 · 13:30", dur: "8h 04m" } ], tags: ["sim","weekdays"] },
  { id: "sch-006", name: "Backup hive.env.gpg",  description: "GPG-encrypt the env file and push to the shared vault.",                cron: "0 4 * * *",   cronLabel: "Daily · 04:00 UTC", runtime: "Hermes",   machine: "atlas",     bee: "Hermes-α",     enabled: true,  nextRun: "in 7h 18m",  nextRunISO: "2026-05-22T04:00:00Z", lastRun: { status: "ok", at: "today 04:00", dur: "3s" }, history: [ { status: "ok", at: "May 21 · 04:00", dur: "3s" }, { status: "ok", at: "May 20 · 04:00", dur: "3s" } ], tags: ["secops"] },
  { id: "sch-007", name: "Tail-sync skill shelf", description: "Push Codex/Hermes/Aeon skill manifests across the tailnet peers.",   cron: "*/15 * * * *", cronLabel: "Every 15m",       runtime: "Codex",    machine: "nimbus",    bee: "Codex-skill",   enabled: true,  nextRun: "in 7m",      nextRunISO: "2026-05-21T18:45:00Z", lastRun: { status: "ok", at: "18:30", dur: "2s" }, history: [ { status: "ok", at: "18:30", dur: "2s" }, { status: "ok", at: "18:15", dur: "2s" } ], tags: ["skills","tailnet"] },
];

export const SCH_TEMPLATES: CadenceTemplate[] = [
  { id: "cron",     label: "Cron expression", desc: "Classic 5-field cron.",            icon: "⌚" },
  { id: "interval", label: "Every N",         desc: "Run every N minutes / hours.",     icon: "⟳" },
  { id: "daily",    label: "Daily at",        desc: "Fire once a day at a clock time.", icon: "☀" },
  { id: "weekday",  label: "Weekdays only",   desc: "Mon–Fri at a clock time.",         icon: "▤" },
  { id: "session",  label: "Market session",  desc: "Pegged to NYSE / Tokyo / London.", icon: "$" },
  { id: "trigger",  label: "On event",        desc: "Fired by another agent's signal.", icon: "⚡" },
];

export function minutesFromLabel(s: string | null | undefined): number | null {
  if (!s || s === "paused") return null;
  const re = /(\d+)\s*([hm])/g;
  let m: RegExpExecArray | null, total = 0;
  while ((m = re.exec(s))) total += parseInt(m[1], 10) * (m[2] === "h" ? 60 : 1);
  return total || null;
}
