import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../lib/db.js';

const router = Router();

function signToken(payload) {
  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

router.post('/signup', async (req, res) => {
  const { full_name, email, phone, password, student_id, roll_number, batch, branch, hostel_type, room_preference, assigned_room, photo_url } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'full_name, email, password required' });
  }
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, phone, password_hash, role, student_id, roll_number, batch, branch, hostel_type, room_preference, assigned_room, photo_url) 
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [full_name, email, phone || null, password_hash, 'student', student_id || null, roll_number || null, batch || null, branch || null, hostel_type || 'boys', room_preference || 'single', assigned_room || null, photo_url || null]
    );
    const token = signToken({ id: result.insertId, email });
    res.status(201).json({ id: result.insertId, full_name, email, phone, token, student_id });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const [rows] = await pool.execute(
      `SELECT id, full_name, email, phone, password_hash, role, student_id, roll_number, batch, branch, hostel_type, room_preference, assigned_room, photo_url 
       FROM users WHERE email=? LIMIT 1`,
      [email]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({
      id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, role: user.role, token,
      student_id: user.student_id, roll_number: user.roll_number, batch: user.batch, branch: user.branch,
      hostel_type: user.hostel_type, room_preference: user.room_preference, assigned_room: user.assigned_room, photo_url: user.photo_url
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
