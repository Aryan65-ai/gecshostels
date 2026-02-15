-- ═══════════════════════════════════════════
-- 08: Add notices and complaints tables
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notices (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  text        VARCHAR(500)  NOT NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS complaints (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT           NULL,
  student_id  VARCHAR(50)   NULL,
  ticket      INT           NOT NULL,
  category    VARCHAR(50)   NOT NULL,
  description TEXT          NOT NULL,
  priority    ENUM('low','medium','high') DEFAULT 'low',
  status      ENUM('pending','in_progress','resolved','rejected') DEFAULT 'pending',
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Allow payments without a booking (for direct fee payments)
ALTER TABLE payments MODIFY booking_id INT NULL;

-- Seed default notices
INSERT INTO notices (text) VALUES
  ('Admission for Semester VII hostel opens on 15th Sept.'),
  ('Mess will be closed on public holiday (19th Sept).'),
  ('Submit anti-ragging affidavit before 30th Sept.');
