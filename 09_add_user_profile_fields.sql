-- ═══════════════════════════════════════════
-- 09: Add extensive profile fields to users table
-- ═══════════════════════════════════════════

ALTER TABLE users
  ADD COLUMN student_id VARCHAR(50) UNIQUE NULL AFTER full_name,
  ADD COLUMN roll_number VARCHAR(50) NULL AFTER student_id,
  ADD COLUMN batch VARCHAR(20) NULL AFTER roll_number,
  ADD COLUMN branch VARCHAR(100) NULL AFTER batch,
  ADD COLUMN hostel_type ENUM('boys', 'girls') DEFAULT 'boys' AFTER branch,
  ADD COLUMN room_preference ENUM('single', 'triple') DEFAULT 'single' AFTER hostel_type,
  ADD COLUMN assigned_room VARCHAR(20) NULL AFTER room_preference,
  ADD COLUMN photo_url LONGTEXT NULL AFTER assigned_room;

-- Update existing dummy/seed users if any (optional, safe to skip)
