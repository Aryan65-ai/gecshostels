-- Additional indexes and constraints
-- Usage:
--   mysql -u hostel_user -p hostel_db < 03_indexes_constraints.sql

START TRANSACTION;

-- Prevent overlapping bookings for the same room (MySQL cannot easily enforce this with a constraint)
-- Recommended approach is to enforce in application logic with a SELECT ... FOR UPDATE check.
-- Here we just add helpful indexes.
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms (status);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms (room_type);

-- For quick search by email/phone
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);

-- Speed up bookings queries by status and date
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_checkin ON bookings (check_in);
CREATE INDEX IF NOT EXISTS idx_bookings_checkout ON bookings (check_out);

COMMIT;


