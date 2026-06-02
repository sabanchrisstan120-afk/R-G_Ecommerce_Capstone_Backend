require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'rg_trading',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  console.log('🌱 Seeding admin + products...\n');

  try {
    // =========================
    // ADMIN USER ONLY
    // =========================
    const adminHash = await bcrypt.hash('Admin@123456', 12);

    await conn.query(
      `INSERT IGNORE INTO users
       (id, email, password_hash, first_name, last_name, role)
       VALUES (UUID(), ?, ?, 'Admin', 'RG', 'admin')`,
      ['admin@rgtrading.com', adminHash]
    );

    console.log('✅ Admin user seeded');

    // =========================
    // PRODUCTS (100 total)
    // =========================
    const categories = [1, 2, 3, 4, 5]; // Assuming these category IDs exist

    const brands = [
      'Carrier',
      'Daikin',
      'Midea',
      'LG',
      'Samsung',
      'Panasonic'
    ];

    const hpOptions = [0.5, 1.0, 1.5, 2.0, 2.5];

    const ratings = ['2 Star', '3 Star', '4 Star', '5 Star'];

    const types = [
      'Window Type',
      'Split Type',
      'Cassette Type',
      'Floor Standing'
    ];

    const products = [];

    for (let i = 1; i <= 100; i++) {
      const brand = brands[i % brands.length];
      const hp = hpOptions[i % hpOptions.length];
      const category = categories[i % categories.length];
      const rating = ratings[i % ratings.length];
      const type = types[i % types.length];

      const btu =
        hp === 0.5 ? 5000 :
        hp === 1.0 ? 9000 :
        hp === 1.5 ? 12000 :
        hp === 2.0 ? 18000 :
        22000;

      const price = 8000 + (hp * 10000) + (i * 150);

      const stock = 10 + (i % 25);

      products.push([
        category,
        `${brand} ${type} Model ${i} ${hp}HP`,
        `MODEL-${brand.substring(0, 3).toUpperCase()}-${i}`,
        brand,
        hp,
        btu,
        rating,
        Math.floor(price),
        stock
      ]);
    }

    for (const p of products) {
      await conn.query(
        `INSERT IGNORE INTO products
         (id, category_id, name, model_number, brand, horsepower, cooling_capacity_btu, energy_rating, price, stock_qty)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p
      );
    }

    console.log('✅ 100 products seeded');
    console.log('\n🎉 Seed complete!\n');

  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seed();