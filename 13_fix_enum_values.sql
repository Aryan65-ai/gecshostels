-- ═══════════════════════════════════════════
-- 13: Fix ENUM values to match actual application usage
-- ═══════════════════════════════════════════

-- rooms.room_type: add 'triple' (used in frontend and admin)
ALTER TABLE rooms MODIFY COLUMN room_type ENUM('single','double','triple','dorm') NOT NULL;

-- payments.status: add 'pending' and 'rejected' (used in payment flow)
ALTER TABLE payments MODIFY COLUMN status ENUM('initiated','pending','success','failed','rejected','refunded') NOT NULL DEFAULT 'pending';

-- payments.method: add 'UPI' uppercase variant used by frontend
ALTER TABLE payments MODIFY COLUMN method VARCHAR(50) NOT NULL DEFAULT 'UPI';
