import express from 'express';
import pool from '../db/pool.js';
import { authenticate, requireType } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', authenticate, requireType('customer'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.first_name, c.last_name, c.email, c.phone,
              c.created_at, c.active, co.name AS community
       FROM customers c LEFT JOIN communities co ON co.id = c.community_id
       WHERE c.id=$1`, [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const c = rows[0];
    res.json({
      id: c.id,
      name: `${c.first_name} ${c.last_name}`.trim(),
      email: c.email, phone: c.phone, area: c.community,
      joined: c.created_at, active: c.active,
      idMask: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' + String(1000 + c.id).slice(-4)
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.put('/me', authenticate, requireType('customer'), async (req, res) => {
  const { name, email, phone, area } = req.body;
  try {
    const [first, ...rest] = (name || '').split(' ');
    const last = rest.join(' ');
    const community = await pool.query('SELECT id FROM communities WHERE name=$1', [area]);
    await pool.query(
      `UPDATE customers
       SET first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name),
           email=COALESCE($3,email), phone=COALESCE($4,phone),
           community_id=COALESCE($5,community_id)
       WHERE id=$6`,
      [first || null, last || null, email?.toLowerCase() || null,
       phone || null, community.rows[0]?.id || null, req.user.id]
    );
    res.status(204).end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.get('/', authenticate, requireType('staff'), async (_, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.first_name || ' ' || c.last_name AS name, c.email, c.phone,
              c.created_at AS joined, c.active, co.name AS area
       FROM customers c LEFT JOIN communities co ON co.id = c.community_id
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

export default router;
