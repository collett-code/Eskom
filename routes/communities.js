import express from 'express';
import pool from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (_, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, province FROM communities ORDER BY name');
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

export default router;
