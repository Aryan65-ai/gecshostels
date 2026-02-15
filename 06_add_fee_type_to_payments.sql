-- Add fee_type to payments restricted to 'hostel' or 'mess'
-- Usage: mysql -u hostel_user -p hostel_db < 06_add_fee_type_to_payments.sql

START TRANSACTION;

ALTER TABLE payments
  ADD COLUMN fee_type ENUM('hostel','mess') NOT NULL DEFAULT 'hostel' AFTER amount;

COMMIT;


