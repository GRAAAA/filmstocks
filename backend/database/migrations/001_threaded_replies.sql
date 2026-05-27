USE filmstocks;

ALTER TABLE forum_replies
  ADD COLUMN parent_reply_id INT NULL AFTER post_id,
  ADD CONSTRAINT fk_forum_replies_parent
    FOREIGN KEY (parent_reply_id) REFERENCES forum_replies(id) ON DELETE CASCADE;
