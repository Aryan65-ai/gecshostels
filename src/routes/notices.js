import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth, requireRole } from '../lib/auth.js';

const router = Router();

// Get all notices
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, text, created_at FROM notices ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch notices' });
    }
});

// Admin: Add a notice
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    try {
        const [result] = await pool.execute('INSERT INTO notices (text) VALUES (?)', [text]);
        res.status(201).json({ id: result.insertId, text, created_at: new Date().toISOString() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add notice' });
    }
});

// Admin: Delete a notice
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        await pool.execute('DELETE FROM notices WHERE id=?', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete notice' });
    }
});

export default router;
