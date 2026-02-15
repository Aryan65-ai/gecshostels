-- ═══════════════════════════════════════════
-- 14: Create fees table for shared fee structure
-- Allows admin to set fees that ALL users see across devices
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fees (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  fee_key    VARCHAR(50) NOT NULL UNIQUE,
  fee_value  VARCHAR(100) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default fees
INSERT INTO fees (fee_key, fee_value) VALUES
  ('mess', '₹ 3,500 / month'),
  ('single', '₹ 18,000 / year'),
  ('triple', '₹ 15,000 / year')
ON DUPLICATE KEY UPDATE fee_value = VALUES(fee_value);
