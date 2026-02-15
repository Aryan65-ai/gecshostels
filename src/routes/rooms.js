import { Router } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, room_number, room_type, capacity, price_per_night, status FROM rooms ORDER BY room_number');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, room_number, room_type, capacity, price_per_night, status FROM rooms WHERE id=?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Room not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

export default router;
