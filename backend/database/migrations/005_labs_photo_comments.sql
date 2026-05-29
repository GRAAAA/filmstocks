ALTER TABLE photos
  ADD COLUMN scanner_model VARCHAR(100) AFTER storage_key,
  ADD COLUMN lab_id INT AFTER scanner_model;

CREATE TABLE labs (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(160) NOT NULL,
  city        VARCHAR(100),
  country     VARCHAR(100),
  website_url VARCHAR(255),
  created_by  INT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE lab_reviews (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  lab_id     INT NOT NULL,
  user_id    INT NOT NULL,
  rating     INT NOT NULL,
  comment    TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lab_user (lab_id, user_id),
  FOREIGN KEY (lab_id)  REFERENCES labs(id)  ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE photo_comments (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  photo_id   INT NOT NULL,
  user_id    INT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);
