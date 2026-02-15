-- Remove dependency on rooms for bookings
-- Usage: mysql -u hostel_user -p hostel_db < 07_remove_room_dependency.sql

START TRANSACTION;

-- Drop FK to rooms if exists
ALTER TABLE bookings
  DROP FOREIGN KEY fk_bookings_room;

-- Make room_id optional
ALTER TABLE bookings
  MODIFY room_id BIGINT UNSIGNED NULL;

COMMIT;


