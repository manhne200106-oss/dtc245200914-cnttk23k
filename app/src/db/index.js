const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'project_management',
  user: process.env.POSTGRES_USER || 'project_user',
  password: process.env.POSTGRES_PASSWORD || '',
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[Database Pool Error]: Unexpected error on idle client', err.message);
});

/**
 * Execute parameterized query
 * @param {string} text - SQL query string with parameter placeholders ($1, $2...)
 * @param {Array} params - Parameter values
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DB Query]', { text: text.trim().substring(0, 100), duration: `${duration}ms`, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('[DB Query Error]:', { text, error: error.message });
    throw error;
  }
};

/**
 * Test database connection with retry mechanism
 */
const testConnection = async (retries = 5, delay = 2000) => {
  for (let i = 1; i <= retries; i++) {
    try {
      const res = await pool.query('SELECT NOW() as current_time, current_database() as db_name, version()');
      console.log(`[Database Connected] DB: "${res.rows[0].db_name}", Server Time: ${res.rows[0].current_time}`);
      return true;
    } catch (err) {
      console.warn(`[Database Connection Attempt ${i}/${retries} Failed]: ${err.message}`);
      if (i === retries) {
        throw new Error(`Failed to connect to PostgreSQL after ${retries} attempts: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

module.exports = {
  pool,
  query,
  testConnection,
};
