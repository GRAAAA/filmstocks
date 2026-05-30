CREATE DATABASE IF NOT EXISTS filmstocks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE filmstocks;

CREATE TABLE users (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  username    VARCHAR(50)  UNIQUE NOT NULL,
  email       VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_id   VARCHAR(255) UNIQUE,
  auth_provider ENUM('local','google') NOT NULL DEFAULT 'local',
  role        ENUM('user','admin') NOT NULL DEFAULT 'user',
  avatar_url  VARCHAR(255),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE film_stocks (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  name            VARCHAR(100) NOT NULL,
  brand           VARCHAR(100) NOT NULL,
  type            ENUM('bw','color_negative','reversal') NOT NULL,
  iso             INT,
  description     TEXT,
  characteristics TEXT,
  cover_image_url VARCHAR(255),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE photos (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  film_stock_id INT NOT NULL,
  user_id       INT NOT NULL,
  title         VARCHAR(200),
  description   TEXT,
  image_url     VARCHAR(255) NOT NULL,
  image_thumb_url  VARCHAR(255),
  image_medium_url VARCHAR(255),
  image_large_url  VARCHAR(255),
  storage_key      VARCHAR(255),
  scanner_model    VARCHAR(100),
  camera_make      VARCHAR(100),
  camera_model     VARCHAR(100),
  lens_model       VARCHAR(100),
  focal_length_mm  SMALLINT UNSIGNED,
  lab_id           INT,
  frame_background_color CHAR(7),
  frame_gap_px INT UNSIGNED NOT NULL DEFAULT 0,
  frame_border_width_px INT UNSIGNED NOT NULL DEFAULT 0,
  frame_border_color CHAR(7),
  frame_image_position VARCHAR(20) NOT NULL DEFAULT 'center center',
  original_size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  optimized_size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  storage_size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  storage_saved_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  variant_count INT UNSIGNED NOT NULL DEFAULT 0,
  phash CHAR(16),
  likes_count   INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_photos_phash (phash),
  FOREIGN KEY (film_stock_id) REFERENCES film_stocks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE
);

CREATE TABLE labs (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(160) NOT NULL,
  city        VARCHAR(100),
  country     VARCHAR(100),
  latitude    DECIMAL(9,6),
  longitude   DECIMAL(9,6),
  opening_hours VARCHAR(255),
  date_opened DATE,
  operational_status ENUM('open','temporarily_closed','closed','unknown') NOT NULL DEFAULT 'unknown',
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
  date_opened  DATE,
  operational_status ENUM('open','temporarily_closed','closed','unknown'),
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

CREATE TABLE photo_likes (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  photo_id   INT NOT NULL,
  user_id    INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_like (photo_id, user_id),
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);

CREATE TABLE forum_posts (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  film_stock_id INT NOT NULL,
  user_id       INT NOT NULL,
  title         VARCHAR(200) NOT NULL,
  content       TEXT NOT NULL,
  reply_count   INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (film_stock_id) REFERENCES film_stocks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE
);

CREATE TABLE forum_replies (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  post_id         INT NOT NULL,
  parent_reply_id INT,
  user_id         INT NOT NULL,
  content         TEXT NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id)         REFERENCES forum_posts(id)    ON DELETE CASCADE,
  FOREIGN KEY (parent_reply_id) REFERENCES forum_replies(id)  ON DELETE CASCADE,
  FOREIGN KEY (user_id)         REFERENCES users(id)          ON DELETE CASCADE
);
