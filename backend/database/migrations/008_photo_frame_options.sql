ALTER TABLE photos
  ADD COLUMN frame_background_color CHAR(7) AFTER lab_id,
  ADD COLUMN frame_gap_px INT UNSIGNED NOT NULL DEFAULT 0 AFTER frame_background_color,
  ADD COLUMN frame_border_width_px INT UNSIGNED NOT NULL DEFAULT 0 AFTER frame_gap_px,
  ADD COLUMN frame_border_color CHAR(7) AFTER frame_border_width_px,
  ADD COLUMN frame_image_position VARCHAR(20) NOT NULL DEFAULT 'center center' AFTER frame_border_color;
