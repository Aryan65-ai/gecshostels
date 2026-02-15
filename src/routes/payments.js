import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();

// Get payments for the logged-in user
router.get('/', requireAuth, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      [rows] = await pool.query('SELECT * FROM payments ORDER BY paid_at DESC');
    } else {
      [rows] = await pool.execute(
        `SELECT 
          p.id, p.amount, p.fee_type as feeType, p.method as paymentMethod, 
          p.provider_txn_id as transactionId, p.status, p.paid_at as timestamp 
       FROM payments p
       WHERE p.user_id = ? ORDER BY p.paid_at DESC`,
        [req.user.id]
      );
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Submit a payment (from frontend payment page)
router.post('/submit', async (req, res) => {
  const { transactionId, studentName, studentId, email, phone, feeType, amount, paymentMethod, screenshotData } = req.body;

  if (!feeType || !amount) {
    return res.status(400).json({ error: 'feeType and amount required' });
  }

  try {
    // Attempt to match user by email if possible to link user_id
    let userId = null;
    if (email) {
      const [[u]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
      if (u) userId = u.id;
    }

    const [result] = await pool.execute(
      `INSERT INTO payments (
         booking_id, user_id, amount, fee_type, method, provider_txn_id, 
         student_id, student_name, screenshot_data, status, paid_at
       )
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [
        userId,
        amount,
        feeType,
        paymentMethod || 'UPI',
        transactionId || null,
        studentId || null,
        studentName || null,
        screenshotData || null
      ]
    );

    res.status(201).json({
      id: result.insertId,
      transactionId,
      feeType,
      amount,
      status: 'pending',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Payment submission failed:', err);
    res.status(500).json({ error: 'Failed to submit payment' });
  }
});

// Mark a booking as paid (admin or user with booking ownership)
router.post('/mark-paid', requireAuth, async (req, res) => {
  const { booking_id, amount, fee_type, method = 'cash', provider_txn_id = null } = req.body;
  if (!booking_id || !amount || !fee_type) return res.status(400).json({ error: 'booking_id, amount, fee_type required' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[booking]] = await conn.query('SELECT id, user_id, status FROM bookings WHERE id=? FOR UPDATE', [booking_id]);
    if (!booking) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ error: 'Booking not found' });
    }
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
    try { await conn.rollback(); } catch { }
    conn.release();
    res.status(500).json({ error: 'Failed to mark as paid' });
  }
});

export default router;
