-- Seed data for development
-- Usage:
--   mysql -u hostel_user -p hostel_db < 04_seed.sql

START TRANSACTION;

-- Users
INSERT INTO users (full_name, email, phone, password_hash, role)
VALUES
  ('Admin User', 'admin@example.com', '9000000001', '$2y$10$replace_with_bcrypt_hash', 'admin'),
  ('John Doe', 'john@example.com', '9000000002', '$2y$10$replace_with_bcrypt_hash', 'student'),
  ('Jane Smith', 'jane@example.com', '9000000003', '$2y$10$replace_with_bcrypt_hash', 'student')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- Rooms
INSERT INTO rooms (room_number, room_type, capacity, price_per_night, status)
VALUES
  ('A101', 'single', 1, 1000.00, 'available'),
  ('A102', 'double', 2, 1600.00, 'available'),
  ('B201', 'dorm', 6, 500.00, 'available')
ON DUPLICATE KEY UPDATE price_per_night = VALUES(price_per_night);

-- Bookings (simple examples)
INSERT INTO bookings (user_id, room_id, check_in, check_out, status, total_amount, payment_status)
SELECT u.id, r.id, '2025-10-02', '2025-10-05', 'confirmed', 3000.00, 'paid'
FROM users u, rooms r
WHERE u.email = 'john@example.com' AND r.room_number = 'A101'
ON DUPLICATE KEY UPDATE status = 'confirmed';

-- Payments
INSERT INTO payments (booking_id, amount, method, provider_txn_id, status, paid_at)
SELECT b.id, 3000.00, 'card', 'TXN123456', 'success', NOW()
FROM bookings b
JOIN users u ON u.id = b.user_id
JOIN rooms r ON r.id = b.room_id
WHERE u.email = 'john@example.com' AND r.room_number = 'A101'
LIMIT 1;

COMMIT;


