USE filmstocks;

ALTER TABLE photos
  ADD COLUMN image_thumb_url VARCHAR(255) NULL AFTER image_url,
  ADD COLUMN image_medium_url VARCHAR(255) NULL AFTER image_thumb_url,
  ADD COLUMN image_large_url VARCHAR(255) NULL AFTER image_medium_url,
  ADD COLUMN storage_key VARCHAR(255) NULL AFTER image_large_url;
