ALTER TABLE photos ADD COLUMN frame_background_color TEXT;
ALTER TABLE photos ADD COLUMN frame_gap_px INTEGER NOT NULL DEFAULT 0;
ALTER TABLE photos ADD COLUMN frame_border_width_px INTEGER NOT NULL DEFAULT 0;
ALTER TABLE photos ADD COLUMN frame_border_color TEXT;
ALTER TABLE photos ADD COLUMN frame_image_position TEXT NOT NULL DEFAULT 'center center';
