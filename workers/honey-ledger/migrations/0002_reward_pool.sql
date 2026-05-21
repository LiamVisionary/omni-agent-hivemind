ALTER TABLE usage_receipts ADD COLUMN honey_delta_micro INTEGER NOT NULL DEFAULT 0 CHECK (honey_delta_micro >= 0);
ALTER TABLE agent_balances ADD COLUMN lifetime_honey_micro INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agent_balances ADD COLUMN available_honey_micro INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agent_balances ADD COLUMN hive_balance_micro INTEGER NOT NULL DEFAULT 0;
ALTER TABLE exchange_events ADD COLUMN honey_delta_micro INTEGER NOT NULL DEFAULT 0;
ALTER TABLE exchange_events ADD COLUMN hive_delta_micro INTEGER NOT NULL DEFAULT 0;

UPDATE agent_balances
SET
  lifetime_honey_micro = CAST(ROUND(lifetime_honey * 1000000) AS INTEGER),
  available_honey_micro = CAST(ROUND(available_honey * 1000000) AS INTEGER),
  hive_balance_micro = CAST(ROUND(hive_balance * 1000000) AS INTEGER)
WHERE lifetime_honey_micro = 0 AND available_honey_micro = 0 AND hive_balance_micro = 0;

CREATE TABLE IF NOT EXISTS reward_pool_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total_pool_micro INTEGER NOT NULL DEFAULT 0 CHECK (total_pool_micro >= 0),
  emitted_micro INTEGER NOT NULL DEFAULT 0 CHECK (emitted_micro >= 0),
  exchanged_micro INTEGER NOT NULL DEFAULT 0 CHECK (exchanged_micro >= 0),
  total_pool_usd_micro INTEGER NOT NULL DEFAULT 0 CHECK (total_pool_usd_micro >= 0),
  total_volume_usd_micro INTEGER NOT NULL DEFAULT 0 CHECK (total_volume_usd_micro >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO reward_pool_state
  (id, total_pool_micro, emitted_micro, exchanged_micro, total_pool_usd_micro, total_volume_usd_micro)
VALUES
  (1, 0, (SELECT COALESCE(SUM(lifetime_honey_micro), 0) FROM agent_balances), (SELECT COALESCE(SUM(hive_balance_micro), 0) FROM agent_balances), 0, 0);

CREATE TABLE IF NOT EXISTS reward_pool_events (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  trade_volume_usd_micro INTEGER NOT NULL DEFAULT 0 CHECK (trade_volume_usd_micro >= 0),
  hive_price_usd_micro INTEGER NOT NULL DEFAULT 0 CHECK (hive_price_usd_micro >= 0),
  reward_pool_usd_micro INTEGER NOT NULL DEFAULT 0 CHECK (reward_pool_usd_micro >= 0),
  reward_pool_hive_micro INTEGER NOT NULL CHECK (reward_pool_hive_micro > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reward_pool_events_created_at ON reward_pool_events(created_at);
