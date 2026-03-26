require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql  = require('mysql2/promise');

async function seed() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME     || 'rg_trading',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  console.log('🌱 Seeding R&G Trading database...\n');
  try {
    // Admin
    const adminHash = await bcrypt.hash('Admin@123456', 12);
    await conn.query(
      `INSERT IGNORE INTO users (id, email, password_hash, first_name, last_name, role)
       VALUES (UUID(), ?, ?, 'Admin', 'RG', 'admin')`,
      ['admin@rgtrading.com', adminHash]
    );
    console.log('✅ Admin: admin@rgtrading.com / Admin@123456');

    // Customer
    const custHash = await bcrypt.hash('Customer@123', 12);
    await conn.query(
      `INSERT IGNORE INTO users (id, email, password_hash, first_name, last_name, phone, role)
       VALUES (UUID(), ?, ?, 'Juan', 'dela Cruz', '09171234567', 'customer')`,
      ['juan@example.com', custHash]
    );
    console.log('✅ Customer: juan@example.com / Customer@123');

    // Products
    const products = [
      [1, 'Carrier Optima Window Type 0.5HP', 'WCARZ006EE', 'Carrier',  0.5, 5000,  '2.5 Star', 9500,  30],
      [1, 'Carrier Optima Window Type 1.0HP', 'WCARZ010EC', 'Carrier',  1.0, 9000,  '3 Star',   13500, 25],
      [2, 'Daikin Inverter Split 1.0HP',      'FTKC25UV',   'Daikin',   1.0, 9000,  '5 Star',   35000, 15],
      [2, 'Daikin Inverter Split 1.5HP',      'FTKC35UV',   'Daikin',   1.5, 12000, '5 Star',   42000, 12],
      [2, 'Midea MSplit 1.0HP Inverter',      'MSAG-09NXD', 'Midea',    1.0, 9000,  '4 Star',   28000, 20],
      [2, 'Midea MSplit 1.5HP Inverter',      'MSAG-12NXD', 'Midea',    1.5, 12000, '4 Star',   33000, 18],
      [3, 'LG Portable 1.0HP',                'LP1019WSR',  'LG',       1.0, 10000, '3 Star',   22000, 10],
      [2, 'Samsung Wind-Free 2.0HP',          'AR18TXFCAWK','Samsung',  2.0, 18000, '5 Star',   55000, 8 ],
    ];

    for (const p of products) {
      await conn.query(
        `INSERT IGNORE INTO products
           (id, category_id, name, model_number, brand, horsepower, cooling_capacity_btu, energy_rating, price, stock_qty)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p
      );
    }
    console.log('✅ 8 aircon products seeded');
    console.log('\n🎉 Seed complete!\n');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seed();
