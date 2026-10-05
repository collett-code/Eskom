import express from 'express';
import pool from '../db/pool.js';
import { authenticate, requireType } from '../middleware/auth.js';

const router = express.Router();

router.get('/my', authenticate, requireType('customer'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.*, nr.read_at
       FROM notifications n
       JOIN notification_recipients nr ON nr.notification_id = n.id
       WHERE nr.recipient_type='customer' AND nr.recipient_id=$1
       ORDER BY n.published_at DESC`, [req.user.id]
    );
    res.json(rows.map(n => ({
      id: n.id, type: n.type, priority: n.priority,
      title: n.title, message: n.message,
      at: n.published_at, read: !!n.read_at
    })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.patch('/:id/read', authenticate, requireType('customer'), async (req, res) => {
  try {
    await pool.query(
      `UPDATE notification_recipients SET read_at=NOW()
       WHERE notification_id=$1 AND recipient_type='customer' AND recipient_id=$2`,
      [req.params.id, req.user.id]
    );
    res.status(204).end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.post('/', authenticate, requireType('staff'), async (req, res) => {
  const { type, area, priority, title, message, at, exp } = req.body;
  if (!title || !message) return res.status(422).json({ error: 'Title and message required' });
  try {
    const community = await pool.query('SELECT id FROM communities WHERE name=$1', [area]);
    const { rows } = await pool.query(
      `INSERT INTO notifications
       (type, priority, title, message, community_id, created_by_staff_id, published_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,NOW()),$8) RETURNING *`,
      [type, priority || 'General', title, message,
       community.rows[0]?.id || null, req.user.id, at || null, exp || null]
    );

    const recipients = area === 'All communities'
      ? await pool.query('SELECT id FROM customers WHERE active=TRUE')
      : await pool.query('SELECT id FROM customers WHERE community_id=$1 AND active=TRUE',
                         [community.rows[0]?.id]);

    for (const c of recipients.rows) {
      await pool.query(
        `INSERT INTO notification_recipients (notification_id, recipient_type, recipient_id)
         VALUES ($1,'customer',$2)`, [rows[0].id, c.id]
      );
    }
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.get('/', authenticate, requireType('staff'), async (_, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.*, c.name AS community
       FROM notifications n
       LEFT JOIN communities c ON c.id = n.community_id
       ORDER BY n.published_at DESC`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

export default router;
