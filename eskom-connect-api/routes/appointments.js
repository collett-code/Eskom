import express from 'express';
import pool from '../db/pool.js';
import { authenticate, requireType } from '../middleware/auth.js';

const router = express.Router();
const genRef = () => `APT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random()*9000)}`;

router.post('/', authenticate, requireType('customer'), async (req, res) => {
  const { service, scheduled_at, note } = req.body;
  if (!service || !scheduled_at) return res.status(422).json({ error: 'Service and date required' });
  if (new Date(scheduled_at) < new Date()) return res.status(422).json({ error: 'Date must be in the future' });
  try {
    const ref = genRef();
    const { rows } = await pool.query(
      `INSERT INTO appointments (reference_number, customer_id, service, scheduled_at, status, notes)
       VALUES ($1,$2,$3,$4,'Pending',$5) RETURNING *`,
      [ref, req.user.id, service, scheduled_at, note || '']
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.get('/my', authenticate, requireType('customer'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, s.first_name || ' ' || s.last_name AS staff_name
       FROM appointments a
       LEFT JOIN staff s ON s.id = a.assigned_staff_id
       WHERE a.customer_id=$1 ORDER BY a.scheduled_at`, [req.user.id]
    );
    res.json(rows.map(a => ({ ...a, staff: a.staff_name || '' })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.get('/', authenticate, requireType('staff'), async (_, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, cu.first_name || ' ' || cu.last_name AS customer_name,
              s.first_name || ' ' || s.last_name AS staff_name
       FROM appointments a
       LEFT JOIN customers cu ON cu.id = a.customer_id
       LEFT JOIN staff s ON s.id = a.assigned_staff_id
       ORDER BY a.scheduled_at`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.patch('/:id', authenticate, async (req, res) => {
  const { scheduled_at, status, staffId } = req.body;
  const { id } = req.params;
  try {
    const own = await pool.query('SELECT customer_id FROM appointments WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ error: 'Not found' });
    if (req.user.type === 'customer' && own.rows[0].customer_id !== req.user.id)
      return res.status(403).json({ error: 'Forbidden' });

    const { rows } = await pool.query(
      `UPDATE appointments
       SET scheduled_at=COALESCE($1,scheduled_at),
           status=COALESCE($2,status),
           assigned_staff_id=COALESCE($3,assigned_staff_id)
       WHERE id=$4 RETURNING *`,
      [scheduled_at, status, staffId, id]
    );
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

export default router;
