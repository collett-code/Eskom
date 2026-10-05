import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db/pool.js';

import authRoutes         from './routes/auth.js';
import customerRoutes     from './routes/customers.js';
import reportRoutes       from './routes/reports.js';
import complaintRoutes    from './routes/complaints.js';
import appointmentRoutes  from './routes/appointments.js';
import notificationRoutes from './routes/notifications.js';
import communityRoutes    from './routes/communities.js';
import adminRoutes        from './routes/admin.js';

dotenv.config();
const app  = express();
const PORT = process.env.PORT || 4000;

const allowed = [
  process.env.CUSTOMER_URL, process.env.ADMIN_URL,
  'http://127.0.0.1:5500','http://localhost:5500',
  'http://127.0.0.1:5501','http://localhost:5501',
  'http://127.0.0.1:3000','http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(new Error('CORS not allowed'));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(express.json({ limit: '1mb' }));

app.get('/',       (_, res) => res.json({ service: 'Eskom Connect API', version: '1.0.0' }));
app.get('/health', async (_, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'healthy', time: new Date().toISOString() }); }
  catch { res.status(500).json({ status: 'unhealthy' }); }
});

app.use('/api/v1/auth',          authRoutes);
app.use('/api/v1/customers',     customerRoutes);
app.use('/api/v1/reports',       reportRoutes);
app.use('/api/v1/complaints',    complaintRoutes);
app.use('/api/v1/appointments',  appointmentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/communities',   communityRoutes);
app.use('/api/v1/admin',         adminRoutes);

app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Eskom Connect API listening on port ${PORT}`);
});
