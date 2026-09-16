-- Metadata stays queryable in D1; the private SKILL.md object lives in R2.
CREATE TABLE IF NOT EXISTS skill_bundles (
  skill_id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL,
  iv_base64 TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
