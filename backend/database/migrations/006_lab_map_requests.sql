ALTER TABLE labs
  ADD COLUMN latitude DECIMAL(9,6) AFTER country,
  ADD COLUMN longitude DECIMAL(9,6) AFTER latitude,
  ADD COLUMN opening_hours VARCHAR(255) AFTER longitude;

CREATE TABLE lab_change_requests (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  lab_id       INT,
  user_id      INT NOT NULL,
  request_type ENUM('add','update','delete') NOT NULL,
  name         VARCHAR(160),
  city         VARCHAR(100),
  country      VARCHAR(100),
  latitude     DECIMAL(9,6),
  longitude    DECIMAL(9,6),
  opening_hours VARCHAR(255),
  website_url  VARCHAR(255),
  note         TEXT,
  status       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at  TIMESTAMP NULL,
  resolved_by  INT,
  FOREIGN KEY (lab_id)      REFERENCES labs(id)  ON DELETE SET NULL,
  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);
