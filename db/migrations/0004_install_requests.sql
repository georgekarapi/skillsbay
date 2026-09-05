CREATE TABLE IF NOT EXISTS install_requests (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  buyer_address TEXT,
  payment_transaction_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_install_requests_expiry ON install_requests(expires_at);
