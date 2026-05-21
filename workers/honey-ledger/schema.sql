CREATE TABLE IF NOT EXISTS usage_receipts (
  event_id TEXT PRIMARY KEY,
  issuer_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  tokens_used INTEGER NOT NULL CHECK (tokens_used > 0),
  model TEXT NOT NULL,
  source TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_balances (
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  lifetime_honey REAL NOT NULL DEFAULT 0,
  available_honey REAL NOT NULL DEFAULT 0,
  hive_balance REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, agent_id)
);

CREATE TABLE IF NOT EXISTS exchange_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  honey_delta REAL NOT NULL,
  hive_delta REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usage_workspace_agent ON usage_receipts(workspace_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_usage_created_at ON usage_receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_balances_workspace ON agent_balances(workspace_id);
