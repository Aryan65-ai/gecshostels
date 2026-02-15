-- Core schema for hostel management
-- Usage:
--   mysql -u hostel_user -p hostel_db < 02_schema.sql

SET NAMES utf8mb4;
SET time_zone = '+00:00';

START TRANSACTION;

-- Ensure we're operating on the intended DB
-- USE hostel_db;  -- uncomment if needed when running manually

-- Users
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL,
  phone VARCHAR(32) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student','admin','staff') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_number VARCHAR(32) NOT NULL,
  room_type ENUM('single','double','dorm') NOT NULL,
  capacity INT NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  status ENUM('available','occupied','maintenance') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rooms_room_number (room_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  status ENUM('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  payment_status ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
  INDEX idx_bookings_user (user_id),
  INDEX idx_bookings_room_dates (room_id, check_in, check_out),
  CHECK (check_in < check_out)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('cash','card','upi','online') NOT NULL,
  provider_txn_id VARCHAR(191) NULL,
  status ENUM('initiated','success','failed','refunded') NOT NULL DEFAULT 'initiated',
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  INDEX idx_payments_booking (booking_id),
  INDEX idx_payments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

COMMIT;


