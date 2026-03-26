require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runMigrations() {
  // Connect without a database first so we can create it if needed
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const dbName = process.env.DB_NAME || 'rg_trading';

  try {
    // Create DB if it doesn't exist
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${dbName}\``);
    console.log(`✅ Database "${dbName}" ready`);

    // Migrations tracking table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id       INT          NOT NULL AUTO_INCREMENT,
        filename VARCHAR(255) NOT NULL,
        run_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_migration_file (filename)
      ) ENGINE=InnoDB
    `);

    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const [rows] = await conn.query('SELECT id FROM _migrations WHERE filename = ?', [file]);
      if (rows.length > 0) {
        console.log(`⏭  Skipping: ${file}`);
        continue;
      }
      console.log(`🔄 Running: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await conn.query(sql);
      await conn.query('INSERT INTO _migrations (filename) VALUES (?)', [file]);
      console.log(`✅ Done: ${file}`);
    }

    console.log('\n🎉 All migrations complete!\n');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

runMigrations();
