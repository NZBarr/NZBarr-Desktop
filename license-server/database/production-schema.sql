-- NZBarr License Server Production Schema
-- MySQL 8+ / MariaDB-compatible setup

CREATE TABLE IF NOT EXISTS licenses (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  license_key VARCHAR(128) NOT NULL UNIQUE,
  customer_email VARCHAR(255) NOT NULL,
  plan VARCHAR(64) NOT NULL DEFAULT 'premium_yearly',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  grace_days INT NOT NULL DEFAULT 14,
  max_activations INT NOT NULL DEFAULT 2,
  features_json JSON NOT NULL,
  notes TEXT NULL,
  last_validated_at TIMESTAMP NULL DEFAULT NULL,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_licenses_status (status),
  KEY idx_licenses_expires_at (expires_at),
  KEY idx_licenses_customer_email (customer_email)
);

CREATE TABLE IF NOT EXISTS license_activations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  license_id INT UNSIGNED NOT NULL,
  machine_id VARCHAR(128) NOT NULL,
  platform VARCHAR(64) NOT NULL DEFAULT 'unknown',
  app_version VARCHAR(64) NOT NULL DEFAULT 'unknown',
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_license_activations_license
    FOREIGN KEY (license_id) REFERENCES licenses(id)
    ON DELETE CASCADE,
  UNIQUE KEY uniq_license_machine (license_id, machine_id),
  KEY idx_license_last_seen (license_id, last_seen_at),
  KEY idx_license_active (license_id, active)
);

CREATE TABLE IF NOT EXISTS license_audit_log (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  license_id INT UNSIGNED NULL,
  license_key VARCHAR(128) NOT NULL,
  machine_id VARCHAR(128) NOT NULL DEFAULT '',
  event_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  message TEXT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_license_audit_license_id (license_id),
  KEY idx_license_audit_license_key (license_key),
  KEY idx_license_audit_event_type (event_type),
  KEY idx_license_audit_created_at (created_at)
);
