import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth, requireRole } from '../lib/auth.js';

const router = Router();

// Get all rooms
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, room_number, room_type, capacity, price_per_night, status FROM rooms ORDER BY room_number');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Add a room (Admin)
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { floor, room, type, available } = req.body;
  if (!room || !type) return res.status(400).json({ error: 'room and type required' });

  try {
    // Check if room exists
    const [existing] = await pool.query('SELECT id FROM rooms WHERE room_number=?', [room]);
    if (existing.length > 0) {
      // Update
      await pool.execute(
        'UPDATE rooms SET room_type=?, status=? WHERE room_number=?',
        [type, available ? 'available' : 'occupied', room]
      );
      return res.json({ room, type, available });
    }

    // Insert
    // Capacity logic: single -> 1, triple -> 3
    const capacity = type === 'single' ? 1 : 3;
    const price = type === 'single' ? 18000 : 15000; // default prices

    await pool.execute(
      `INSERT INTO rooms (room_number, room_type, capacity, price_per_night, status)
       VALUES (?, ?, ?, ?, ?)`,
      [room, type, capacity, price, available ? 'available' : 'occupied']
    );
    res.status(201).json({ room, type, available });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save room' });
  }
});

// Delete a room (Admin)
router.delete('/:room_number', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const roomNum = req.params.room_number;
    await pool.execute('DELETE FROM rooms WHERE room_number=?', [roomNum]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete room' });
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
