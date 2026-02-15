-- Useful sample queries and utilities

-- List available rooms between two dates (no overlap with existing bookings)
-- Replace placeholders as needed
SET @from := '2025-10-01';
SET @to := '2025-10-05';

SELECT r.*
FROM rooms r
WHERE r.status = 'available'
  AND NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.room_id = r.id
      AND b.status IN ('pending','confirmed')
      AND NOT (b.check_out <= @from OR b.check_in >= @to)
  )
ORDER BY r.room_type, r.room_number;

-- Create a booking safely (pattern): check availability, then insert
-- Use this inside a transaction in your application code
-- Example check query:
-- SELECT COUNT(*) = 0 AS is_available
-- FROM bookings b
-- WHERE b.room_id = ?
--   AND b.status IN ('pending','confirmed')
--   AND NOT (b.check_out <= ? OR b.check_in >= ?)
-- FOR UPDATE;

-- Revenue by day
SELECT DATE(p.paid_at) AS day, SUM(p.amount) AS total
FROM payments p
WHERE p.status = 'success'
GROUP BY DATE(p.paid_at)
ORDER BY day DESC;


