import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.user_id, b.room_id, b.check_in, b.check_out, b.status, b.total_amount, b.payment_status,
              u.full_name AS user_name
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       ORDER BY b.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { check_in, check_out, room_id = null } = req.body;
  if (!check_in || !check_out) {
    return res.status(400).json({ error: 'check_in, check_out required' });
  }
  const user_id = req.user.id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const nights = Math.max(1, Math.ceil((new Date(check_out) - new Date(check_in)) / (1000*60*60*24)));
    const total = 0.00; // total can be determined by fee later

    const [result] = await conn.execute(
      `INSERT INTO bookings (user_id, room_id, check_in, check_out, status, total_amount, payment_status)
       VALUES (?,?,?,?, 'confirmed', ?, 'unpaid')`,
      [user_id, room_id, check_in, check_out, total]
    );
    await conn.commit();
    conn.release();
    res.status(201).json({ id: result.insertId, user_id, room_id, check_in, check_out, status: 'confirmed', total_amount: total, payment_status: 'unpaid' });
  } catch (err) {
    console.error(err);
    try { await conn.rollback(); } catch {}
    conn.release();
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

export default router;
