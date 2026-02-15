import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth, requireRole } from '../lib/auth.js';

const router = Router();

// Admin: get a student's profile with bookings and payments
router.get('/students/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const studentId = req.params.id;
  try {
    const [[user]] = await pool.query('SELECT id, full_name, email, phone, role, created_at FROM users WHERE id=?', [studentId]);
    if (!user) return res.status(404).json({ error: 'Student not found' });
    const [bookings] = await pool.query(
      `SELECT b.id, b.check_in, b.check_out, b.status, b.total_amount, b.payment_status
       FROM bookings b
       WHERE b.user_id=? ORDER BY b.created_at DESC`,
      [studentId]
    );
    const [payments] = await pool.query(
      `SELECT p.id, p.booking_id, p.amount, p.fee_type, p.method, p.status, p.paid_at
       FROM payments p
       WHERE p.booking_id IN (SELECT id FROM bookings WHERE user_id=?)
       ORDER BY p.paid_at DESC`,
      [studentId]
    );
    res.json({ user, bookings, payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load student profile' });
  }
});

export default router;
