import express from 'express';
import bcrypt  from 'bcryptjs';
import jwt     from 'jsonwebtoken';
import pool    from '../db/pool.js';

const router = express.Router();
const sign = payload => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

router.post('/register', async (req, res) => {
  const { name, email, phone, area, password } = req.body;
  if (!name || !email || !phone || !password)
    return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 8)
    return res.status(422).json({ error: 'Password must be at least 8 characters' });
  try {
    const community = await pool.query('SELECT id FROM communities WHERE name=$1', [area || 'Soweto']);
    const [first, ...rest] = name.split(' ');
    const last = rest.join(' ') || '';
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO customers (first_name, last_name, email, phone, password_hash, community_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, first_name, last_name, email, phone`,
      [first, last, email.toLowerCase(), phone, hash, community.rows[0]?.id || null]
    );
    const c = rows[0];
    const token = sign({ id: c.id, type: 'customer', role: 'CUSTOMER' });
    res.status(201).json({
      token,
      user: { id: c.id, name: `${c.first_name} ${c.last_name}`.trim(), email: c.email, phone: c.phone, area }
    });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await pool.query(
      `SELECT c.*, co.name AS community_name
       FROM customers c
       LEFT JOIN communities co ON co.id = c.community_id
       WHERE LOWER(c.email)=LOWER($1)`, [email]
    );
    const c = rows[0];
    if (!c || !(await bcrypt.compare(password, c.password_hash)))
      return res.status(401).json({ error: 'Email or password is incorrect' });
    if (!c.active) return res.status(403).json({ error: 'Account deactivated' });
    const token = sign({ id: c.id, type: 'customer', role: 'CUSTOMER' });
    res.json({
      token,
      user: {
        id: c.id,
        name: `${c.first_name} ${c.last_name}`.trim(),
        email: c.email, phone: c.phone, area: c.community_name,
        idMask: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' + String(1000 + c.id).slice(-4),
        joined: c.created_at, active: c.active
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/staff/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await pool.query(
      `SELECT s.*, r.name AS role_code, d.name AS department_name
       FROM staff s
       LEFT JOIN roles r ON r.id = s.role_id
       LEFT JOIN departments d ON d.id = s.department_id
       WHERE LOWER(s.email)=LOWER($1)`, [email]
    );
    const s = rows[0];
    if (!s || !(await bcrypt.compare(password, s.password_hash)))
      return res.status(401).json({ error: 'Email or password is incorrect' });
    if (!s.active) return res.status(403).json({ error: 'Account deactivated' });
    const token = sign({ id: s.id, type: 'staff', role: s.role_code });
    res.json({
      token,
      user: {
        id: s.id,
        name: `${s.first_name} ${s.last_name}`.trim(),
        email: s.email, role: s.role_code, dept: s.department_name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (_, res) => res.status(204).end());

export default router;
