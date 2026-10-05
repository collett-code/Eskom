import express from 'express';
import pool from '../db/pool.js';
import { authenticate, requireType } from '../middleware/auth.js';

const router = express.Router();

router.get('/staff', authenticate, requireType('staff'), async (_, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.first_name || ' ' || s.last_name AS name, s.email,
              r.name AS role, d.name AS dept, s.active
       FROM staff s
       LEFT JOIN roles r ON r.id = s.role_id
       LEFT JOIN departments d ON d.id = s.department_id
       ORDER BY s.created_at`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.get('/audit', authenticate, requireType('staff'), async (_, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, action AS t, created_at AS at, actor_name AS by
       FROM audit_log ORDER BY created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.post('/audit', authenticate, requireType('staff'), async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO audit_log (actor_type, actor_id, action)
       VALUES ('staff',$1,$2)`, [req.user.id, req.body.t || 'Action']
    );
    res.status(201).json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

export default router;
