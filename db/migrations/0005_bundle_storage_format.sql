-- Private R2 objects are served only after Worker entitlement checks.
-- The legacy IV column remains for backwards-compatible schema history.
ALTER TABLE skill_bundles ADD COLUMN storage_format TEXT NOT NULL DEFAULT 'encrypted-v1';
