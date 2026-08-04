USE destinyone;

ALTER TABLE messages
  ADD COLUMN client_id VARCHAR(80) NULL AFTER id,
  ADD COLUMN message_type ENUM('text', 'image', 'voice', 'location', 'document', 'date', 'gift', 'gif', 'sticker') NOT NULL DEFAULT 'text' AFTER body,
  ADD COLUMN payload_json JSON NULL AFTER message_type,
  ADD COLUMN delivery_status ENUM('sent', 'delivered', 'read') NOT NULL DEFAULT 'sent' AFTER payload_json,
  ADD COLUMN delivered_at DATETIME NULL AFTER delivery_status,
  ADD COLUMN read_at DATETIME NULL AFTER delivered_at,
  ADD UNIQUE KEY messages_conversation_client_unique (conversation_id, client_id);

CREATE TABLE IF NOT EXISTS conversation_preferences (
  conversation_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  nickname VARCHAR(32) NOT NULL DEFAULT '',
  theme VARCHAR(40) NOT NULL DEFAULT 'Ruby Velvet',
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (conversation_id, user_id),
  CONSTRAINT conversation_preferences_conversation_fk FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT conversation_preferences_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversation_calls (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_call_id VARCHAR(80) NULL,
  conversation_id BIGINT UNSIGNED NOT NULL,
  caller_id BIGINT UNSIGNED NOT NULL,
  call_type ENUM('audio', 'video') NOT NULL,
  status ENUM('ringing', 'accepted', 'rejected', 'ended', 'missed', 'failed') NOT NULL DEFAULT 'ringing',
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  answered_at DATETIME NULL,
  ended_at DATETIME NULL,
  INDEX calls_conversation_started_idx (conversation_id, started_at),
  CONSTRAINT calls_conversation_fk FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT calls_caller_fk FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE
);
