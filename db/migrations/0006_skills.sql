-- Skills catalog for local D1 database
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  price_usdc TEXT NOT NULL,
  paid_installs INTEGER NOT NULL DEFAULT 0,
  trend INTEGER NOT NULL DEFAULT 0,
  author TEXT NOT NULL,
  author_address TEXT NOT NULL,
  version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  featured INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_skills_namespace_slug ON skills(namespace, slug);
CREATE INDEX IF NOT EXISTS idx_skills_author_address ON skills(author_address);
CREATE INDEX IF NOT EXISTS idx_skills_paid_installs ON skills(paid_installs DESC);

-- Purchase receipts and sales history
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  buyer_address TEXT NOT NULL,
  amount_usdc TEXT NOT NULL,
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  transaction_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_skill_id ON sales(skill_id);
