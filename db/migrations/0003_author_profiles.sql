-- A publisher namespace is chosen once and owned by the wallet created for
-- the authenticated Privy account. It is deliberately immutable after claim.
CREATE TABLE IF NOT EXISTS author_profiles (
  wallet_address TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
