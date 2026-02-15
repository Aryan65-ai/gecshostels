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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// API routes
app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/me', meRouter);
app.use('/api/admin', adminRouter);

// Serve static frontend (HTML, CSS, JS) from project root
app.use(express.static(projectRoot));

// Fallback for root: serve index.html (redirects to home.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  Site:   http://localhost:${PORT}/home.html`);
});
