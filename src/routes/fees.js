import { Router } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth, requireRole } from '../lib/auth.js';

const router = Router();

// Get fees (public — anyone can see fee structure)
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT fee_key, fee_value FROM fees ORDER BY id');
        // Convert to object { mess: "...", single: "...", triple: "..." }
        const fees = {};
        rows.forEach(r => { fees[r.fee_key] = r.fee_value; });
        // Fill defaults if empty
        if (!fees.mess) fees.mess = '₹ 3,500 / month';
        if (!fees.single) fees.single = '₹ 18,000 / year';
        if (!fees.triple) fees.triple = '₹ 15,000 / year';
        res.json(fees);
    } catch (err) {
        // Table might not exist — return defaults
        res.json({ mess: '₹ 3,500 / month', single: '₹ 18,000 / year', triple: '₹ 15,000 / year' });
    }
});

// Update fees (admin only)
router.put('/', requireAuth, requireRole('admin'), async (req, res) => {
    const { mess, single, triple } = req.body;
    try {
        // Upsert each fee
        const upsert = `INSERT INTO fees (fee_key, fee_value) VALUES (?, ?) 
                         ON DUPLICATE KEY UPDATE fee_value = VALUES(fee_value)`;
        if (mess) await pool.execute(upsert, ['mess', mess]);
        if (single) await pool.execute(upsert, ['single', single]);
        if (triple) await pool.execute(upsert, ['triple', triple]);
        res.json({ ok: true, mess, single, triple });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update fees' });
    }
});

export default router;
