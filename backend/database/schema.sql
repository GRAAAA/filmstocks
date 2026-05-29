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
  lab_id           INT,
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
