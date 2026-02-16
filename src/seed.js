import bcrypt from 'bcryptjs';
import { pool } from './lib/db.js';

/**
 * Seeds essential data into the database:
 *  - Creates the admin user if it doesn't exist
 *  - Ensures required tables exist
 */
export async function seedDatabase() {
    try {
        console.log('🚀 Checking database initialization...');

        // 1. Create Users Table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                full_name VARCHAR(120) NOT NULL,
                student_id VARCHAR(50) UNIQUE NULL,
                roll_number VARCHAR(50) NULL,
                batch VARCHAR(20) NULL,
                branch VARCHAR(100) NULL,
                hostel_type ENUM('boys', 'girls') DEFAULT 'boys',
                room_preference ENUM('single', 'triple') DEFAULT 'single',
                assigned_room VARCHAR(20) NULL,
                photo_url LONGTEXT NULL,
                email VARCHAR(191) NOT NULL,
                phone VARCHAR(32) NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('student','admin','staff') NOT NULL DEFAULT 'student',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_users_email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 2. Create Rooms Table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS rooms (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                room_number VARCHAR(32) NOT NULL,
                room_type ENUM('single','double','triple','dorm') NOT NULL,
                capacity INT NOT NULL DEFAULT 1,
                price_per_night DECIMAL(10,2) NOT NULL DEFAULT 0,
                status ENUM('available','occupied','maintenance') NOT NULL DEFAULT 'available',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_rooms_room_number (room_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 3. Create Bookings Table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS bookings (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id BIGINT UNSIGNED NOT NULL,
                room_id BIGINT UNSIGNED NOT NULL,
                check_in DATE NOT NULL,
                check_out DATE NOT NULL,
                status ENUM('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
                total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                payment_status ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
                notes VARCHAR(500) NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_bookings_user (user_id),
                INDEX idx_bookings_room_dates (room_id, check_in, check_out)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 4. Create Payments Table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS payments (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id INT NULL,
                booking_id INT NULL,
                amount DECIMAL(10,2) NOT NULL,
                method VARCHAR(50) NOT NULL DEFAULT 'UPI',
                fee_type VARCHAR(50) NOT NULL DEFAULT 'other',
                provider_txn_id VARCHAR(191) NULL,
                transaction_id VARCHAR(191) NULL,
                screenshot_data LONGTEXT NULL,
                student_id VARCHAR(50) NULL,
                student_name VARCHAR(100) NULL,
                status ENUM('initiated','pending','success','confirmed','failed','rejected','refunded') NOT NULL DEFAULT 'pending',
                paid_at DATETIME NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_payments_user (user_id),
                INDEX idx_payments_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 5. Create Notices Table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS notices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                text VARCHAR(500) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 6. Create Complaints Table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS complaints (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                student_id VARCHAR(50) NULL,
                ticket INT NOT NULL,
                category VARCHAR(50) NOT NULL,
                description TEXT NOT NULL,
                priority ENUM('low','medium','high') DEFAULT 'low',
                status ENUM('pending','in_progress','resolved','rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 7. Create Fees Table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS fees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fee_key VARCHAR(50) NOT NULL UNIQUE,
                fee_value VARCHAR(100) NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

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
            console.log('ℹ️ Admin user already exists');
        }

        // ── Seed default notices if table is empty ──
        const [notices] = await pool.query('SELECT count(*) as count FROM notices');
        if (notices[0].count === 0) {
            await pool.execute(`INSERT INTO notices (text) VALUES 
                ('Admission for Semester VII hostel opens on 15th Sept.'),
                ('Mess will be closed on public holiday (19th Sept).'),
                ('Submit anti-ragging affidavit before 30th Sept.')`);
            console.log('✅ Default notices seeded');
        }

        // ── Seed default fees if empty ──
        const [fees] = await pool.query('SELECT count(*) as count FROM fees');
        if (fees[0].count === 0) {
            await pool.execute(`INSERT INTO fees (fee_key, fee_value) VALUES 
                ('mess', '₹ 3,500 / month'),
                ('single', '₹ 18,000 / year'),
                ('triple', '₹ 15,000 / year')`);
            console.log('✅ Default fees seeded');
        }

        // ── Seed floors if empty ──
        const [roomCount] = await pool.query('SELECT count(*) as count FROM rooms');
        if (roomCount[0].count === 0) {
            // Seed a few rooms for each floor
            for (let f = 1; f <= 4; f++) {
                for (let r = 1; r <= 5; r++) {
                    const roomNum = `${f}0${r}`;
                    const type = r % 3 === 0 ? 'triple' : 'single';
                    await pool.execute(`INSERT INTO rooms (room_number, room_type, capacity, price_per_night, status) VALUES (?, ?, ?, ?, ?)`,
                        [roomNum, type, type === 'single' ? 1 : 3, type === 'single' ? 500 : 300, 'available']);
                }
            }
            console.log('✅ Default rooms seeded');
        }

        console.log('✅ Database initialization complete');

    } catch (err) {
        console.error('❌ Database seed error:', err.message);
    }
}
