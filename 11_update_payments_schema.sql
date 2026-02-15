-- ═══════════════════════════════════════════
-- 11: Update payments table for direct fee payments & screenshots
-- Run AFTER 02_schema, 06_add_fee_type, 07_remove_room_dependency, 08_notices_complaints
-- ═══════════════════════════════════════════

-- Make booking_id nullable (may already be nullable from migration 08)
ALTER TABLE payments MODIFY COLUMN booking_id INT NULL;

-- Add user_id column for direct payments 
ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id INT NULL AFTER id;
ALTER TABLE payments ADD INDEX IF NOT EXISTS idx_payments_user (user_id);

-- Widen fee_type from ENUM to VARCHAR (may already exist as ENUM from migration 06)
ALTER TABLE payments MODIFY COLUMN fee_type VARCHAR(50) NOT NULL DEFAULT 'other';

-- Add screenshot and student identity columns
ALTER TABLE payments ADD COLUMN IF NOT EXISTS screenshot_data LONGTEXT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS student_id VARCHAR(50) NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS student_name VARCHAR(100) NULL;
