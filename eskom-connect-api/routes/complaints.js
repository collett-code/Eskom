import express from 'express';
import pool from '../db/pool.js';
import { authenticate, requireType } from '../middleware/auth.js';

const router = express.Router();
const genRef = p => `${p}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random()*9000)}`;

router.post('/', authenticate, requireType('customer'), async (req, res) => {
  const { subject, category, description, area, priority } = req.body;
  if (!subject || subject.length < 4) return res.status(422).json({ error: 'Subject too short' });
  if (!description || description.length < 10) return res.status(422).json({ error: 'Description too short' });
  try {
    const community = await pool.query('SELECT id FROM communities WHERE name=$1', [area]);
    const ref = genRef('ESK');
    const { rows } = await pool.query(
      `INSERT INTO complaints
       (reference_number, customer_id, subject, category, description, community_id, priority, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Submitted') RETURNING *`,
      [ref, req.user.id, subject, category, description, community.rows[0]?.id || null, priority || 'Medium']
    );
    await pool.query(
      `INSERT INTO complaint_status_history (complaint_id, new_status, changed_by_customer_id)
       VALUES ($1,'Submitted',$2)`, [rows[0].id, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.get('/my', authenticate, requireType('customer'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, co.name AS community
       FROM complaints c
       LEFT JOIN communities co ON co.id = c.community_id
       WHERE c.customer_id=$1 ORDER BY c.created_at DESC`, [req.user.id]
    );
    for (const c of rows) {
      const h = await pool.query(
        `SELECT h.*, s.first_name || ' ' || s.last_name AS staff_name
         FROM complaint_status_history h
         LEFT JOIN staff s ON s.id = h.changed_by_staff_id
         WHERE h.complaint_id=$1 ORDER BY h.changed_at`, [c.id]
      );
      c.history = h.rows.map(x => ({ at: x.changed_at, status: x.new_status, by: x.staff_name || 'You' }));
    }
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.get('/', authenticate, requireType('staff'), async (_, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, co.name AS community,
              cu.first_name || ' ' || cu.last_name AS customer_name,
              s.first_name || ' ' || s.last_name AS staff_name,
              d.name AS department
       FROM complaints c
       LEFT JOIN communities co ON co.id = c.community_id
       LEFT JOIN customers cu ON cu.id = c.customer_id
       LEFT JOIN staff s ON s.id = c.assigned_staff_id
       LEFT JOIN departments d ON d.id = c.department_id
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.patch('/:id/status', authenticate, requireType('staff'), async (req, res) => {
  const { status, comment, department, staffId, resolution } = req.body;
  const { id } = req.params;
  try {
    const current = await pool.query(
      'SELECT status, customer_id, reference_number FROM complaints WHERE id=$1', [id]
    );
    if (!current.rows.length) return res.status(404).json({ error: 'Not found' });

    const { rows } = await pool.query(
      `UPDATE complaints
       SET status=COALESCE($1,status),
           department_id=COALESCE($2,department_id),
           assigned_staff_id=COALESCE($3,assigned_staff_id),
           resolution=COALESCE($4,resolution),
           updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [status, department, staffId, resolution, id]
    );

    await pool.query(
      `INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by_staff_id, comment)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, current.rows[0].status, status || current.rows[0].status, req.user.id, comment]
    );

    if (status) {
      const { rows: n } = await pool.query(
        `INSERT INTO notifications (type, priority, title, message, created_by_staff_id)
         VALUES ('Complaint status','General',$1,$2,$3) RETURNING id`,
        [`Complaint ${current.rows[0].reference_number} is now ${status}`,
         `Your complaint status changed to ${status}.`, req.user.id]
      );
      await pool.query(
        `INSERT INTO notification_recipients (notification_id, recipient_type, recipient_id)
         VALUES ($1,'customer',$2)`, [n[0].id, current.rows[0].customer_id]
      );
    }
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

export default router;
