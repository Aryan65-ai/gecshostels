import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, full_name, email, phone, role, created_at FROM users WHERE id=?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.get('/bookings', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT b.id, b.room_id, r.room_number, b.check_in, b.check_out, b.status, b.total_amount, b.payment_status, b.created_at
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE b.user_id = ? ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

export default router;
