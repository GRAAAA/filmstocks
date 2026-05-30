ALTER TABLE labs
  ADD COLUMN date_opened DATE AFTER opening_hours,
  ADD COLUMN operational_status ENUM('open','temporarily_closed','closed','unknown') NOT NULL DEFAULT 'unknown' AFTER date_opened;

ALTER TABLE lab_change_requests
  ADD COLUMN date_opened DATE AFTER opening_hours,
  ADD COLUMN operational_status ENUM('open','temporarily_closed','closed','unknown') AFTER date_opened;
