import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter from './routes/auth.js';
import roomsRouter from './routes/rooms.js';
import bookingsRouter from './routes/bookings.js';
import paymentsRouter from './routes/payments.js';
import meRouter from './routes/me.js';
import adminRouter from './routes/admin.js';
import noticesRouter from './routes/notices.js';
import complaintsRouter from './routes/complaints.js';
import feesRouter from './routes/fees.js';
import { seedDatabase } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/me', meRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notices', noticesRouter);
app.use('/api/complaints', complaintsRouter);
app.use('/api/fees', feesRouter);

// Public stats endpoint (no auth needed — so students can see counts)
app.get('/api/stats', async (req, res) => {
  try {
    const { pool } = await import('./lib/db.js');
    const [[{ students }]] = await pool.query('SELECT COUNT(*) as students FROM users WHERE role="student"');
    const [[{ rooms }]] = await pool.query('SELECT COUNT(*) as rooms FROM rooms WHERE status="available"');
    const [[{ notices }]] = await pool.query('SELECT COUNT(*) as notices FROM notices');
    res.json({ students, availableRooms: rooms, notices });
  } catch (err) {
    res.json({ students: 0, availableRooms: 0, notices: 0 });
  }
});

// Serve static frontend (HTML, CSS, JS) from project root
app.use(express.static(projectRoot));

// Fallback for root: serve index.html (redirects to home.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`─────────────────────────────────────`);
  console.log(`🏠 GEC Hostel Backend running!`);
  console.log(`   Server:  http://localhost:${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/health`);
  console.log(`   Site:    http://localhost:${PORT}/home.html`);
  console.log(`─────────────────────────────────────`);
  // Seed database (create admin user etc)
  seedDatabase().catch(() => { });
  console.log(`API endpoints:`);
  console.log(`   POST /api/auth/signup`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/rooms`);
  console.log(`   GET  /api/notices`);
  console.log(`   POST /api/complaints`);
  console.log(`   POST /api/payments/submit`);
  console.log(`   GET  /api/me`);
  console.log(`   GET  /api/admin/stats`);
  console.log(`─────────────────────────────────────`);
});
