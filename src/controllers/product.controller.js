const crypto = require('crypto');
const { query, getClient } = require('../config/database');
const { success, created, notFound, conflict, badRequest } = require('../utils/response');

// ─── List Products (public) ───────────────────────────────────────────────────
const getProducts = async (req, res) => {
  try {
    const { category, brand, min_price, max_price, search, page = 1, limit = 20, sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['p.is_active = 1'];
    const params = [];

    if (category)  { conditions.push('c.slug = ?');                          params.push(category); }
    if (brand)     { conditions.push('LOWER(p.brand) = LOWER(?)');           params.push(brand); }
    if (min_price) { conditions.push('p.price >= ?');                        params.push(parseFloat(min_price)); }
    if (max_price) { conditions.push('p.price <= ?');                        params.push(parseFloat(max_price)); }
    if (search)    { conditions.push('(p.name LIKE ? OR p.model_number LIKE ? OR p.brand LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    const validSorts  = ['price', 'name', 'created_at', 'stock_qty'];
    const validOrders = ['ASC', 'DESC'];
    const sortCol = validSorts.includes(sort)             ? `p.${sort}` : 'p.created_at';
    const sortDir = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';
    const where   = conditions.join(' AND ');

    const [productsResult, countResult] = await Promise.all([
      query(`
        SELECT p.id, p.name, p.model_number, p.brand, p.description,
               p.horsepower, p.cooling_capacity_btu, p.energy_rating,
               p.price, p.stock_qty, p.image_url,
               c.name AS category, c.slug AS category_slug
        FROM products p LEFT JOIN categories c ON c.id = p.category_id
        WHERE ${where}
        ORDER BY ${sortCol} ${sortDir}
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), offset]),
      query(`SELECT COUNT(*) AS total FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${where}`, params),
    ]);

    return success(res, {
      products:   productsResult.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(countResult.rows[0].total) },
    });
  } catch (err) {
    console.error('getProducts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load products' });
  }
};

// ─── Get Single Product ───────────────────────────────────────────────────────
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      SELECT p.*, c.name AS category, c.slug AS category_slug
      FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ? AND p.is_active = 1
    `, [id]);
    if (!rows.length) return notFound(res, 'Product not found');
    return success(res, { product: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load product' });
  }
};

// ─── Create Product (admin) ───────────────────────────────────────────────────
const createProduct = async (req, res) => {
  try {
    const { category_id, name, model_number, brand, description,
            horsepower, cooling_capacity_btu, energy_rating,
            price, stock_qty, image_url } = req.body;

    const existing = await query('SELECT id FROM products WHERE model_number = ?', [model_number]);
    if (existing.rows.length) return conflict(res, 'Model number already exists');

    const id = crypto.randomUUID();
    await query(`
      INSERT INTO products (id, category_id, name, model_number, brand, description, horsepower, cooling_capacity_btu, energy_rating, price, stock_qty, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, category_id || null, name, model_number, brand, description || null,
        horsepower || null, cooling_capacity_btu || null, energy_rating || null,
        price, stock_qty || 0, image_url || null]);

    const { rows } = await query('SELECT * FROM products WHERE id = ?', [id]);
    return created(res, { product: rows[0] }, 'Product created');
  } catch (err) {
    console.error('createProduct error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create product' });
  }
};

// ─── Update Product (admin) ───────────────────────────────────────────────────
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['category_id','name','model_number','brand','description',
                    'horsepower','cooling_capacity_btu','energy_rating',
                    'price','stock_qty','image_url','is_active'];

    const updates = [];
    const params  = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
    });

    if (!updates.length) return badRequest(res, 'No fields to update');
    params.push(id);

    await query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);
    const { rows } = await query('SELECT * FROM products WHERE id = ?', [id]);
    if (!rows.length) return notFound(res, 'Product not found');
    return success(res, { product: rows[0] }, 'Product updated');
  } catch (err) {
    console.error('updateProduct error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

// ─── Delete Product (soft delete) ────────────────────────────────────────────
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT name FROM products WHERE id = ?', [id]);
    if (!rows.length) return notFound(res, 'Product not found');
    await query('UPDATE products SET is_active = 0 WHERE id = ?', [id]);
    return success(res, {}, `Product "${rows[0].name}" deactivated`);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};

// ─── Adjust Stock (admin) ─────────────────────────────────────────────────────
const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;
    await query('UPDATE products SET stock_qty = GREATEST(0, stock_qty + ?) WHERE id = ?', [parseInt(adjustment), id]);
    const { rows } = await query('SELECT id, name, stock_qty FROM products WHERE id = ?', [id]);
    if (!rows.length) return notFound(res, 'Product not found');
    return success(res, { product: rows[0] }, `Stock adjusted by ${adjustment}. Reason: ${reason || 'N/A'}`);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to adjust stock' });
  }
};

// ─── Low Stock Alert (admin) ──────────────────────────────────────────────────
const getLowStock = async (req, res) => {
  try {
    const { threshold = 5 } = req.query;
    const { rows } = await query(
      'SELECT id, name, model_number, brand, stock_qty, price FROM products WHERE is_active = 1 AND stock_qty <= ? ORDER BY stock_qty ASC',
      [parseInt(threshold)]
    );
    return success(res, { products: rows, threshold: parseInt(threshold) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch low stock' });
  }
};

// ─── List Categories ──────────────────────────────────────────────────────────
const getCategories = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT c.*, COUNT(p.id) AS product_count
      FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
      GROUP BY c.id ORDER BY c.name ASC
    `);
    return success(res, { categories: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load categories' });
  }
};

// ─── Categories CRUD (admin) ──────────────────────────────────────────────
const adminListCategories = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT c.*,
             COUNT(p.id) AS product_count,
             SUM(CASE WHEN p.is_active = 1 THEN 1 ELSE 0 END) AS active_product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    return success(res, { categories: rows });
  } catch (err) {
    console.error('adminListCategories error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load categories' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, slug, description } = req.body;

    const existing = await query('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (existing.rows.length) return conflict(res, 'Category slug already exists');

    await query(
      'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
      [name, slug, description || null]
    );

    const { rows } = await query('SELECT * FROM categories WHERE slug = ? LIMIT 1', [slug]);
    return created(res, { category: rows[0] }, 'Category created');
  } catch (err) {
    console.error('createCategory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create category' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['name', 'slug', 'description'];

    const updates = [];
    const params = [];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(req.body[f]);
      }
    });

    if (!updates.length) return badRequest(res, 'No fields to update');

    // If slug is being updated, ensure uniqueness
    if (req.body.slug !== undefined) {
      const existing = await query(
        'SELECT id FROM categories WHERE slug = ? AND id != ?',
        [req.body.slug, id]
      );
      if (existing.rows.length) return conflict(res, 'Category slug already exists');
    }

    params.push(id);
    await query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params);

    const { rows } = await query('SELECT * FROM categories WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return notFound(res, 'Category not found');
    return success(res, { category: rows[0] }, 'Category updated');
  } catch (err) {
    console.error('updateCategory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update category' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: existing } = await query('SELECT name FROM categories WHERE id = ?', [id]);
    if (!existing.length) return notFound(res, 'Category not found');

    await query('DELETE FROM categories WHERE id = ?', [id]);
    return success(res, {}, `Category "${existing[0].name}" deleted`);
  } catch (err) {
    console.error('deleteCategory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
};

// ─── List Products (admin: all statuses, full fields) ─────────────────────────
const adminListProducts = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const conditions = ['1=1'];
    const params = [];

    if (search) {
      conditions.push('(p.name LIKE ? OR p.model_number LIKE ? OR p.brand LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = conditions.join(' AND ');
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    const [productsResult, countResult] = await Promise.all([
      query(`
        SELECT p.id, p.category_id, p.name, p.model_number, p.brand, p.description,
               p.horsepower, p.cooling_capacity_btu, p.energy_rating,
               p.price, p.stock_qty, p.image_url, p.is_active,
               c.name AS category, c.slug AS category_slug
        FROM products p LEFT JOIN categories c ON c.id = p.category_id
        WHERE ${where}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, lim, off]),
      query(`SELECT COUNT(*) AS total FROM products p WHERE ${where}`, params),
    ]);

    return success(res, {
      products: productsResult.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: lim,
        total: parseInt(countResult.rows[0].total, 10),
      },
    });
  } catch (err) {
    console.error('adminListProducts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load products' });
  }
};

// ─── Permanent Delete Product (admin) ────────────────────────────────────────
const permanentDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT name FROM products WHERE id = ?', [id]);
    if (!rows.length) return notFound(res, 'Product not found');
    await query('DELETE FROM products WHERE id = ?', [id]);
    return success(res, {}, `Product "${rows[0].name}" permanently deleted`);
  } catch (err) {
    console.error('permanentDeleteProduct error:', err);
    return res.status(500).json({ success: false, message: 'Failed to permanently delete product' });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  permanentDeleteProduct,
  adjustStock,
  getLowStock,
  getCategories,
  adminListCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  adminListProducts,
};
