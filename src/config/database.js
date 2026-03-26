const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  database:           process.env.DB_NAME     || 'rg_trading',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit:    20,
  queueLimit:         0,
  timezone:           '+00:00',
  decimalNumbers:     true,
});

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  }
})();

const query = async (text, params = []) => {
  const start = Date.now();
  const sql = text.replace(/\$\d+/g, '?');
  const [rows] = await pool.execute(sql, params);
  if (process.env.NODE_ENV === 'development') {
    console.log('📦 Query', { sql: sql.substring(0, 80), ms: Date.now() - start });
  }
  return { rows: Array.isArray(rows) ? rows : [rows], rowCount: rows.affectedRows ?? rows.length };
};

const getClient = async () => {
  const conn = await pool.getConnection();
  const originalQuery = conn.query.bind(conn);
  conn.query = async (text, params = []) => {
    const sql = text.replace(/\$\d+/g, '?');
    const [rows] = await originalQuery(sql, params);
    return { rows: Array.isArray(rows) ? rows : [rows], rowCount: rows.affectedRows ?? rows.length };
  };
  return conn;
};

module.exports = { query, getClient, pool };
