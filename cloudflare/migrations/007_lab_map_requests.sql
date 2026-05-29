ALTER TABLE labs ADD COLUMN latitude REAL;
ALTER TABLE labs ADD COLUMN longitude REAL;
ALTER TABLE labs ADD COLUMN opening_hours TEXT;

CREATE TABLE IF NOT EXISTS lab_change_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lab_id INTEGER,
  user_id INTEGER NOT NULL,
  request_type TEXT NOT NULL,
  name TEXT,
  city TEXT,
  country TEXT,
  latitude REAL,
  longitude REAL,
  opening_hours TEXT,
  website_url TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  resolved_by INTEGER,
  FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lab_change_requests_status ON lab_change_requests(status);
