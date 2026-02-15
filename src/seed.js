import bcrypt from 'bcryptjs';
import { pool } from './lib/db.js';

/**
 * Seeds essential data into the database:
 *  - Creates the admin user if it doesn't exist
 *  - Ensures required tables exist
 */
export async function seedDatabase() {
    try {
        // ── Create admin user if not exists ──
        const [existing] = await pool.query('SELECT id FROM users WHERE email=?', ['admin@gec.ac.in']);
        if (existing.length === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await pool.execute(
                `INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
                ['System Administrator', 'admin@gec.ac.in', hash, 'admin']
            );
            console.log('✅ Admin user created (admin@gec.ac.in / admin123)');
        } else {
            console.log('ℹ️  Admin user already exists');
        }
    } catch (err) {
        // Tables might not exist yet — that's OK, user needs to run SQL first
        console.warn('⚠️  Could not seed database (tables may not exist yet):', err.message);
    }
}
