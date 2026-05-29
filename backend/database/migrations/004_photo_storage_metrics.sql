ALTER TABLE photos
  ADD COLUMN original_size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER storage_key,
  ADD COLUMN optimized_size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER original_size_bytes,
  ADD COLUMN storage_size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER optimized_size_bytes,
  ADD COLUMN storage_saved_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER storage_size_bytes,
  ADD COLUMN variant_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER storage_saved_bytes,
  ADD COLUMN phash CHAR(16) AFTER variant_count,
  ADD INDEX idx_photos_phash (phash);
