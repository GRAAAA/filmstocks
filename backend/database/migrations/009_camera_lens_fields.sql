ALTER TABLE photos
  ADD COLUMN camera_make     VARCHAR(100) AFTER scanner_model,
  ADD COLUMN camera_model    VARCHAR(100) AFTER camera_make,
  ADD COLUMN lens_model      VARCHAR(100) AFTER camera_model,
  ADD COLUMN focal_length_mm SMALLINT UNSIGNED AFTER lens_model;
