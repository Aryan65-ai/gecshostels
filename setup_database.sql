-- ═══════════════════════════════════════════════════════════
-- COMPLETE DATABASE SETUP SCRIPT FOR GEC HOSTEL
-- Run this as root: mysql -u root < setup_database.sql
-- ═══════════════════════════════════════════════════════════

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS hostel_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE hostel_db;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  student_id VARCHAR(50) UNIQUE NULL,
  roll_number VARCHAR(50) NULL,
  batch VARCHAR(20) NULL,
  branch VARCHAR(100) NULL,
  hostel_type ENUM('boys', 'girls') DEFAULT 'boys',
  room_preference ENUM('single', 'triple') DEFAULT 'single',
  assigned_room VARCHAR(20) NULL,
  photo_url LONGTEXT NULL,
  email VARCHAR(191) NOT NULL,
  phone VARCHAR(32) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student','admin','staff') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_number VARCHAR(32) NOT NULL,
  room_type ENUM('single','double','triple','dorm') NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  price_per_night DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('available','occupied','maintenance') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rooms_room_number (room_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  status ENUM('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
  INDEX idx_bookings_user (user_id),
  INDEX idx_bookings_room_dates (room_id, check_in, check_out)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Payments Table (with all extensions)
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NULL,
  booking_id INT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(50) NOT NULL DEFAULT 'UPI',
  fee_type VARCHAR(50) NOT NULL DEFAULT 'other',
  provider_txn_id VARCHAR(191) NULL,
  transaction_id VARCHAR(191) NULL,
  screenshot_data LONGTEXT NULL,
  student_id VARCHAR(50) NULL,
  student_name VARCHAR(100) NULL,
  status ENUM('initiated','pending','success','confirmed','failed','rejected','refunded') NOT NULL DEFAULT 'pending',
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_payments_user (user_id),
  INDEX idx_payments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Notices Table
CREATE TABLE IF NOT EXISTS notices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  student_id VARCHAR(50) NULL,
  ticket INT NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('low','medium','high') DEFAULT 'low',
  status ENUM('pending','in_progress','resolved','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Fees Table
CREATE TABLE IF NOT EXISTS fees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fee_key VARCHAR(50) NOT NULL UNIQUE,
  fee_value VARCHAR(100) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Seed default notices
INSERT INTO notices (text) VALUES
  ('Admission for Semester VII hostel opens on 15th Sept.'),
  ('Mess will be closed on public holiday (19th Sept).'),
  ('Submit anti-ragging affidavit before 30th Sept.');

-- 10. Seed default fees
INSERT INTO fees (fee_key, fee_value) VALUES
  ('mess', '₹ 3,500 / month'),
  ('single', '₹ 18,000 / year'),
  ('triple', '₹ 15,000 / year')
ON DUPLICATE KEY UPDATE fee_value = VALUES(fee_value);

-- 11. Seed default rooms (4 floors, 10 rooms each)
INSERT INTO rooms (room_number, room_type, capacity, price_per_night, status) VALUES
  ('101','single',1,500,'available'),('102','single',1,500,'available'),('103','triple',3,300,'available'),
  ('104','single',1,500,'available'),('105','single',1,500,'available'),('106','triple',3,300,'available'),
  ('107','single',1,500,'available'),('108','single',1,500,'available'),('109','triple',3,300,'available'),
  ('110','single',1,500,'available'),
  ('201','single',1,500,'available'),('202','single',1,500,'available'),('203','triple',3,300,'available'),
  ('204','single',1,500,'available'),('205','single',1,500,'available'),('206','triple',3,300,'available'),
  ('207','single',1,500,'available'),('208','single',1,500,'available'),('209','triple',3,300,'available'),
  ('210','single',1,500,'available'),
  ('301','single',1,500,'available'),('302','single',1,500,'available'),('303','triple',3,300,'available'),
  ('304','single',1,500,'available'),('305','single',1,500,'available'),('306','triple',3,300,'available'),
  ('307','single',1,500,'available'),('308','single',1,500,'available'),('309','triple',3,300,'available'),
  ('310','single',1,500,'available'),
  ('401','single',1,500,'available'),('402','single',1,500,'available'),('403','triple',3,300,'available'),
  ('404','single',1,500,'available'),('405','single',1,500,'available'),('406','triple',3,300,'available'),
  ('407','single',1,500,'available'),('408','single',1,500,'available'),('409','triple',3,300,'available'),
  ('410','single',1,500,'available')
ON DUPLICATE KEY UPDATE room_number = VALUES(room_number);

-- Done!
SELECT 'Database setup complete!' AS status;
SELECT COUNT(*) AS total_tables FROM information_schema.tables WHERE table_schema = 'hostel_db';
SELECT COUNT(*) AS total_rooms FROM rooms;
SELECT COUNT(*) AS total_notices FROM notices;
