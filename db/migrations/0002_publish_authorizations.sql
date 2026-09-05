-- A signed publish authorization may be consumed once. This prevents a valid
-- Privy wallet signature from being replayed to overwrite a bundle.
CREATE TABLE IF NOT EXISTS publish_authorizations (
  signature TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  author_address TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  consumed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS publish_authorizations_skill_id_idx ON publish_authorizations(skill_id);
