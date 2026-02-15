import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth, requireRole } from '../lib/auth.js';

const router = Router();

// Admin: get all students
router.get('/students', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, full_name, email, phone, role, student_id, batch, branch, created_at FROM users WHERE role="student" ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

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
       WHERE p.user_id=? 
          OR p.booking_id IN (SELECT id FROM bookings WHERE user_id=?)
       ORDER BY p.paid_at DESC`,
      [studentId, studentId]
    );
    res.json({ user, bookings, payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load student profile' });
  }
});

// Admin: get all payments
router.get('/payments', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
          p.id, 
          p.amount, 
          p.fee_type as feeType, 
          p.method as paymentMethod, 
          p.provider_txn_id as transactionId, 
          p.status, 
          p.paid_at as timestamp, 
          p.screenshot_data as screenshotData,
          COALESCE(p.student_name, u.full_name) as studentName,
          COALESCE(p.student_id, u.student_id) as studentId,
          u.email,
          u.phone
       FROM payments p 
       LEFT JOIN users u ON u.id = p.user_id 
       ORDER BY p.paid_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Admin: confirm a payment (supports both paymentId and transactionId)
router.post('/payments/confirm', requireAuth, requireRole('admin'), async (req, res) => {
  const { transactionId, paymentId } = req.body;
  try {
    if (paymentId) {
      await pool.execute('UPDATE payments SET status="success" WHERE id=?', [paymentId]);
    } else if (transactionId) {
      await pool.execute('UPDATE payments SET status="success" WHERE provider_txn_id=?', [transactionId]);
    } else {
      return res.status(400).json({ error: 'paymentId or transactionId required' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Admin: reject a payment
router.post('/payments/reject', requireAuth, requireRole('admin'), async (req, res) => {
  const { transactionId, paymentId } = req.body;
  try {
    if (paymentId) {
      await pool.execute('UPDATE payments SET status="rejected" WHERE id=?', [paymentId]);
    } else if (transactionId) {
      await pool.execute('UPDATE payments SET status="rejected" WHERE provider_txn_id=?', [transactionId]);
    } else {
      return res.status(400).json({ error: 'paymentId or transactionId required' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject payment' });
  }
});

// Admin: get dashboard stats
router.get('/stats', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [[{ students }]] = await pool.query('SELECT COUNT(*) as students FROM users WHERE role="student"');
    const [[{ rooms }]] = await pool.query('SELECT COUNT(*) as rooms FROM rooms WHERE status="available"');
    const [[{ bookings }]] = await pool.query('SELECT COUNT(*) as bookings FROM bookings WHERE status="confirmed"');
    const [[{ payments }]] = await pool.query('SELECT COUNT(*) as payments FROM payments WHERE status="pending"');
    res.json({ students, rooms, bookings, pendingPayments: payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
