-- Checkout IDs appear in browser URLs. Keep the actual bundle-redemption
-- capability in the originating CLI process, and persist only its SHA-256.
-- Existing sessions are intentionally not redeemable after this migration.
ALTER TABLE install_requests ADD COLUMN redemption_token_sha256 TEXT NOT NULL DEFAULT '';
