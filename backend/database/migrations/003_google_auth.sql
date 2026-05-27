USE filmstocks;

ALTER TABLE users
  MODIFY password_hash VARCHAR(255) NULL,
  ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER password_hash,
  ADD COLUMN auth_provider ENUM('local','google') NOT NULL DEFAULT 'local' AFTER google_id;
