ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN verification_token TEXT;
ALTER TABLE users ADD COLUMN verification_token_expires_at TEXT;

-- Existing users are considered verified (they already have working accounts)
UPDATE users SET email_verified = 1;
