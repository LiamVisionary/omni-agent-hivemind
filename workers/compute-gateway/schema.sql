CREATE TABLE IF NOT EXISTS workspace_daily_usage (
  workspace_id TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, usage_date)
);

CREATE TABLE IF NOT EXISTS compute_events (
  event_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  honey_delta REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_compute_events_workspace ON compute_events(workspace_id, created_at);
