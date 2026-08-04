CREATE DATABASE IF NOT EXISTS destinyone
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE destinyone;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(80) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  city VARCHAR(120),
  intent VARCHAR(160),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  age TINYINT UNSIGNED,
  profession VARCHAR(120),
  city VARCHAR(120),
  intent VARCHAR(160),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  image_url TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT profiles_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_age_check CHECK (age BETWEEN 18 AND 60)
);

CREATE TABLE IF NOT EXISTS matches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  matched_user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('suggested', 'interested', 'mutual', 'passed', 'blocked') NOT NULL DEFAULT 'suggested',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_match_pair (user_id, matched_user_id),
  CONSTRAINT matches_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT matches_matched_user_fk FOREIGN KEY (matched_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id BIGINT UNSIGNED NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT conversations_match_fk FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id VARCHAR(80) NULL,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  message_type ENUM('text', 'image', 'voice', 'location', 'document', 'date', 'gift', 'gif', 'sticker') NOT NULL DEFAULT 'text',
  payload_json JSON NULL,
  delivery_status ENUM('sent', 'delivered', 'read') NOT NULL DEFAULT 'sent',
  delivered_at DATETIME NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX messages_conversation_created_idx (conversation_id, created_at),
  UNIQUE KEY messages_conversation_client_unique (conversation_id, client_id),
  CONSTRAINT messages_conversation_fk FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT messages_sender_fk FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_id VARCHAR(40) NOT NULL,
  status ENUM('trial', 'active', 'past_due', 'cancelled') NOT NULL DEFAULT 'trial',
  renews_at DATETIME,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT subscriptions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS date_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  venue VARCHAR(160) NOT NULL,
  area VARCHAR(120) NOT NULL,
  scheduled_at DATETIME NULL,
  status ENUM('proposed', 'accepted', 'declined', 'countered', 'completed', 'cancelled') NOT NULL DEFAULT 'proposed',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT date_plans_conversation_fk FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
  CONSTRAINT date_plans_creator_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS safety_reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reporter_id BIGINT UNSIGNED NOT NULL,
  reported_user_id BIGINT UNSIGNED NULL,
  reason VARCHAR(120) NOT NULL,
  details TEXT,
  status ENUM('submitted', 'reviewing', 'resolved', 'dismissed') NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reports_reporter_fk FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT reports_reported_fk FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id BIGINT UNSIGNED NOT NULL,
  blocked_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_id, blocked_user_id),
  CONSTRAINT blocks_blocker_fk FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT blocks_blocked_fk FOREIGN KEY (blocked_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trusted_vouches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  voucher_name VARCHAR(100) NOT NULL,
  relationship VARCHAR(80) NOT NULL,
  quality VARCHAR(120) NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT vouches_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role ENUM('member', 'moderator', 'admin') NOT NULL DEFAULT 'member';

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS purchase_provider ENUM('apple', 'google', 'stripe', 'manual') NULL,
  ADD COLUMN IF NOT EXISTS provider_purchase_id VARCHAR(190) NULL;

ALTER TABLE date_plans
  MODIFY COLUMN status ENUM('proposed', 'accepted', 'declined', 'countered', 'completed', 'cancelled', 'no_show', 'unresponsive') NOT NULL DEFAULT 'proposed';

CREATE TABLE IF NOT EXISTS user_settings (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  private_profile BOOLEAN NOT NULL DEFAULT FALSE,
  pause_discovery BOOLEAN NOT NULL DEFAULT FALSE,
  show_last_online BOOLEAN NOT NULL DEFAULT TRUE,
  anonymous_analytics BOOLEAN NOT NULL DEFAULT FALSE,
  match_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  message_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  date_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  safety_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  marketing_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_start CHAR(5) NOT NULL DEFAULT '22:00',
  quiet_hours_end CHAR(5) NOT NULL DEFAULT '08:00',
  onboarding_step VARCHAR(32) NOT NULL DEFAULT 'welcome',
  profile_reminder_shown_at DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT user_settings_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS member_notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(160) NOT NULL,
  body VARCHAR(500) NOT NULL,
  metadata_json JSON NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX member_notifications_user_created_idx (user_id, created_at),
  CONSTRAINT member_notifications_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS push_devices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  provider ENUM('expo', 'web') NOT NULL,
  platform ENUM('ios', 'android', 'web') NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  token TEXT NOT NULL,
  subscription_json JSON NULL,
  device_label VARCHAR(120) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_success_at DATETIME NULL,
  last_error VARCHAR(500) NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX push_devices_user_active_idx (user_id, active),
  CONSTRAINT push_devices_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS date_plan_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  date_plan_id BIGINT UNSIGNED NOT NULL,
  actor_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(24) NOT NULL,
  to_status VARCHAR(24) NOT NULL,
  reason VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT date_plan_events_plan_fk FOREIGN KEY (date_plan_id) REFERENCES date_plans(id) ON DELETE CASCADE,
  CONSTRAINT date_plan_events_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS date_feedback (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  date_plan_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  outcome ENUM('continue', 'pause', 'close') NOT NULL,
  felt_safe BOOLEAN NOT NULL DEFAULT TRUE,
  use_for_matching BOOLEAN NOT NULL DEFAULT FALSE,
  notes VARCHAR(1000),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY date_feedback_member_unique (date_plan_id, user_id),
  CONSTRAINT date_feedback_plan_fk FOREIGN KEY (date_plan_id) REFERENCES date_plans(id) ON DELETE CASCADE,
  CONSTRAINT date_feedback_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS message_reactions (
  message_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  emoji VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id),
  CONSTRAINT reactions_message_fk FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  CONSTRAINT reactions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS starred_messages (
  message_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id),
  CONSTRAINT starred_message_fk FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  CONSTRAINT starred_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS moderation_audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  case_id BIGINT UNSIGNED NOT NULL,
  actor_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(40) NOT NULL,
  reason VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT moderation_case_fk FOREIGN KEY (case_id) REFERENCES safety_reports(id) ON DELETE CASCADE,
  CONSTRAINT moderation_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  reason VARCHAR(500),
  status ENUM('requested', 'reviewing', 'cancelled', 'completed') NOT NULL DEFAULT 'requested',
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  CONSTRAINT deletion_request_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS billing_products (
  product_key VARCHAR(120) PRIMARY KEY,
  platform ENUM('apple_iap', 'google_play') NOT NULL,
  external_product_id VARCHAR(190) NOT NULL,
  plan_id VARCHAR(40) NOT NULL,
  product_type ENUM('subscription', 'consumable') NOT NULL,
  entitlement_key VARCHAR(80) NOT NULL,
  units INT UNSIGNED NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY billing_products_provider_unique (platform, external_product_id)
);

CREATE TABLE IF NOT EXISTS billing_purchase_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  product_key VARCHAR(120) NOT NULL,
  platform ENUM('apple_iap', 'google_play') NOT NULL,
  status ENUM('prepared', 'verified', 'failed', 'expired') NOT NULL DEFAULT 'prepared',
  idempotency_key VARCHAR(120) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY billing_session_idempotency_unique (user_id, idempotency_key),
  INDEX billing_session_user_created_idx (user_id, created_at),
  CONSTRAINT billing_session_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT billing_session_product_fk FOREIGN KEY (product_key) REFERENCES billing_products(product_key)
);

CREATE TABLE IF NOT EXISTS billing_verification_attempts (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  purchase_session_id CHAR(36) NOT NULL,
  purchase_token_hash CHAR(64) NOT NULL,
  transaction_hash CHAR(64),
  status ENUM('pending', 'provider_unavailable', 'rejected', 'verified', 'ledger_failed') NOT NULL DEFAULT 'pending',
  error_code VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY billing_verification_token_unique (purchase_token_hash),
  CONSTRAINT billing_attempt_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT billing_attempt_session_fk FOREIGN KEY (purchase_session_id) REFERENCES billing_purchase_sessions(id)
);

CREATE TABLE IF NOT EXISTS billing_purchase_receipts (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  purchase_session_id CHAR(36) NOT NULL,
  provider_event_hash CHAR(64) NOT NULL,
  transaction_hash CHAR(64) NOT NULL,
  status ENUM('active', 'grace_period', 'billing_retry', 'expired', 'refunded', 'chargeback', 'revoked') NOT NULL,
  amount_cents INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL,
  expires_at DATETIME,
  verified_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY billing_receipt_transaction_unique (transaction_hash),
  CONSTRAINT billing_receipt_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT billing_receipt_session_fk FOREIGN KEY (purchase_session_id) REFERENCES billing_purchase_sessions(id)
);

CREATE TABLE IF NOT EXISTS billing_entitlements (
  user_id BIGINT UNSIGNED NOT NULL,
  entitlement_key VARCHAR(80) NOT NULL,
  status ENUM('active', 'grace_period', 'billing_retry', 'expired', 'refunded', 'chargeback', 'revoked') NOT NULL,
  units INT UNSIGNED NOT NULL DEFAULT 0,
  expires_at DATETIME,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, entitlement_key),
  CONSTRAINT billing_entitlement_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO billing_products (product_key,platform,external_product_id,plan_id,product_type,entitlement_key,units,active) VALUES
  ('membership.base.monthly.apple_iap','apple_iap','com.destinyone.app.membership.base.monthly','base','subscription','membership_base',1,FALSE),
  ('membership.base.monthly.google_play','google_play','com.destinyone.app.membership.base.monthly','base','subscription','membership_base',1,FALSE),
  ('membership.base.annual.apple_iap','apple_iap','com.destinyone.app.membership.base.annual','base','subscription','membership_base',1,FALSE),
  ('membership.base.annual.google_play','google_play','com.destinyone.app.membership.base.annual','base','subscription','membership_base',1,FALSE),
  ('membership.plus.monthly.apple_iap','apple_iap','com.destinyone.app.membership.plus.monthly','plus','subscription','membership_plus',1,FALSE),
  ('membership.plus.monthly.google_play','google_play','com.destinyone.app.membership.plus.monthly','plus','subscription','membership_plus',1,FALSE),
  ('membership.plus.annual.apple_iap','apple_iap','com.destinyone.app.membership.plus.annual','plus','subscription','membership_plus',1,FALSE),
  ('membership.plus.annual.google_play','google_play','com.destinyone.app.membership.plus.annual','plus','subscription','membership_plus',1,FALSE),
  ('membership.elite.monthly.apple_iap','apple_iap','com.destinyone.app.membership.elite.monthly','elite','subscription','membership_elite',1,FALSE),
  ('membership.elite.monthly.google_play','google_play','com.destinyone.app.membership.elite.monthly','elite','subscription','membership_elite',1,FALSE),
  ('membership.elite.annual.apple_iap','apple_iap','com.destinyone.app.membership.elite.annual','elite','subscription','membership_elite',1,FALSE),
  ('membership.elite.annual.google_play','google_play','com.destinyone.app.membership.elite.annual','elite','subscription','membership_elite',1,FALSE),
  ('spark.5.apple_iap','apple_iap','com.destinyone.app.spark.5','spark_5','consumable','spark_wallet',5,FALSE),
  ('spark.5.google_play','google_play','com.destinyone.app.spark.5','spark_5','consumable','spark_wallet',5,FALSE),
  ('spark.15.apple_iap','apple_iap','com.destinyone.app.spark.15','spark_15','consumable','spark_wallet',15,FALSE),
  ('spark.15.google_play','google_play','com.destinyone.app.spark.15','spark_15','consumable','spark_wallet',15,FALSE),
  ('spark.40.apple_iap','apple_iap','com.destinyone.app.spark.40','spark_40','consumable','spark_wallet',40,FALSE),
  ('spark.40.google_play','google_play','com.destinyone.app.spark.40','spark_40','consumable','spark_wallet',40,FALSE),
  ('executive.annual.apple_iap','apple_iap','com.destinyone.app.executive.annual','executive','subscription','executive_membership',1,FALSE),
  ('executive.annual.google_play','google_play','com.destinyone.app.executive.annual','executive','subscription','executive_membership',1,FALSE);

CREATE TABLE IF NOT EXISTS launch_analytics_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  platform ENUM('ios', 'android', 'web') NOT NULL,
  app_version VARCHAR(32) NOT NULL,
  build_variant ENUM('development', 'pilot', 'preview', 'production') NOT NULL,
  event_count INT UNSIGNED NOT NULL DEFAULT 0,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  INDEX launch_session_user_started_idx (user_id, started_at),
  CONSTRAINT launch_session_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS launch_analytics_events (
  id CHAR(36) PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  event_name VARCHAR(64) NOT NULL,
  properties_json JSON NOT NULL,
  occurred_at DATETIME NOT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX launch_event_funnel_idx (event_name, occurred_at),
  CONSTRAINT launch_event_session_fk FOREIGN KEY (session_id) REFERENCES launch_analytics_sessions(id) ON DELETE CASCADE,
  CONSTRAINT launch_event_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
