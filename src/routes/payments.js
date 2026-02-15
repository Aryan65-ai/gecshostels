import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();

// Mark a booking as paid (simple internal payment success simulation)
router.post('/mark-paid', requireAuth, async (req, res) => {
  const { booking_id, amount, fee_type, method = 'cash', provider_txn_id = null } = req.body;
  if (!booking_id || !amount || !fee_type) return res.status(400).json({ error: 'booking_id, amount, fee_type required' });
  if (fee_type !== 'hostel') return res.status(400).json({ error: 'Only hostel fee is allowed' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[booking]] = await conn.query('SELECT id, user_id, status FROM bookings WHERE id=? FOR UPDATE', [booking_id]);
    if (!booking) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ error: 'Booking not found' });
    }
    // Optional: ensure the caller owns the booking or is admin
    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      await conn.rollback(); conn.release();
      return res.status(403).json({ error: 'Forbidden' });
    }
    await conn.execute(
      `INSERT INTO payments (booking_id, amount, fee_type, method, provider_txn_id, status, paid_at)
       VALUES (?,?,?,?,?, 'success', NOW())`,
      [booking_id, amount, fee_type, method, provider_txn_id]
    );
    await conn.execute('UPDATE bookings SET payment_status = ?, status = ? WHERE id = ?', ['paid', 'confirmed', booking_id]);
    await conn.commit();
    conn.release();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    try { await conn.rollback(); } catch {}
    conn.release();
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
});

export default router;
