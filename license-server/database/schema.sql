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
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
  KEY idx_license_last_seen (license_id, last_seen_at)
);
