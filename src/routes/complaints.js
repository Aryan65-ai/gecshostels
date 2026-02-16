import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();

// Get complaints (authenticated users get their own, admin gets all)
router.get('/', requireAuth, async (req, res) => {
    try {
        let rows;
        if (req.user.role === 'admin') {
            [rows] = await pool.query('SELECT * FROM complaints ORDER BY created_at DESC');
        } else {
            [rows] = await pool.execute('SELECT * FROM complaints WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
        }
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

// Submit a complaint (auth optional — guests can complain too)
router.post('/', async (req, res) => {
    const { studentId, category, description } = req.body;
    if (!category || !description) return res.status(400).json({ error: 'category and description required' });
    const ticket = Math.floor(Math.random() * 90000 + 10000);
    const priority = category === 'security' ? 'high' : category === 'maintenance' ? 'medium' : 'low';

    // Try to extract user from token if present (optional auth)
    let userId = null;
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (token) {
            const jwt = (await import('jsonwebtoken')).default;
            const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
            userId = payload.id;
        }
    } catch { /* no valid token — that's fine */ }

    try {
        const [result] = await pool.execute(
            'INSERT INTO complaints (user_id, student_id, ticket, category, description, priority, status) VALUES (?,?,?,?,?,?,?)',
            [userId, studentId || null, ticket, category, description, priority, 'pending']
        );
        res.status(201).json({ id: result.insertId, ticket, category, description, priority, status: 'pending' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit complaint. Please try again.' });
    }
});

export default router;
