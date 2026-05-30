ALTER TABLE labs ADD COLUMN date_opened TEXT;
ALTER TABLE labs ADD COLUMN operational_status TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE lab_change_requests ADD COLUMN date_opened TEXT;
ALTER TABLE lab_change_requests ADD COLUMN operational_status TEXT;
