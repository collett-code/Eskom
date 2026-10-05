import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', err => console.error('Unexpected Postgres error on idle client', err));

export default pool;
