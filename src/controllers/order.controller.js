const { query, getClient } = require('../config/database');
const { success, created, notFound, badRequest, forbidden } = require('../utils/response');

const generateOrderNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `RG-${date}-${rand}`;
};

// ─── Place Order ──────────────────────────────────────────────────────────────
const placeOrder = async (req, res) => {
  const conn = await getClient();
  try {
    const { items, address_id, payment_method, notes } = req.body;
    if (!items || !items.length) return badRequest(res, 'Order must contain at least one item');

    await conn.query('START TRANSACTION');

    // Lock and validate products
    const placeholders = items.map(() => '?').join(',');
    const { rows: products } = await conn.query(
      `SELECT id, name, model_number, price, stock_qty, is_active FROM products WHERE id IN (${placeholders}) FOR UPDATE`,
      items.map(i => i.product_id)
    );

    const productMap = {};
    products.forEach(p => { productMap[p.id] = p; });

    let subtotal = 0;
    const orderLines = [];

    for (const item of items) {
      const product = productMap[item.product_id];
      if (!product)           throw { status: 400, message: `Product ${item.product_id} not found` };
      if (!product.is_active) throw { status: 400, message: `${product.name} is no longer available` };
      if (product.stock_qty < item.quantity)
        throw { status: 400, message: `Insufficient stock for ${product.name}. Available: ${product.stock_qty}` };

      const lineTotal = parseFloat(product.price) * parseInt(item.quantity);
      subtotal += lineTotal;
      orderLines.push({
        product_id:   product.id,
        product_name: product.name,
        model_number: product.model_number,
        quantity:     parseInt(item.quantity),
        unit_price:   parseFloat(product.price),
        total_price:  lineTotal,
      });
    }

    // Validate address
    if (address_id) {
      const { rows: addrRows } = await conn.query(
        'SELECT id FROM addresses WHERE id = ? AND user_id = ?',
        [address_id, req.user.id]
      );
      if (!addrRows.length) throw { status: 400, message: 'Invalid address' };
    }

    const shipping_fee    = subtotal >= 10000 ? 0 : 500;
    const discount_amount = 0;
    const total_amount    = subtotal + shipping_fee - discount_amount;
    const order_number    = generateOrderNumber();
    const order_id        = require('crypto').randomUUID();

    await conn.query(
      `INSERT INTO orders (id, order_number, user_id, address_id, payment_method, subtotal, discount_amount, shipping_fee, total_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order_id, order_number, req.user.id, address_id || null, payment_method || null,
       subtotal, discount_amount, shipping_fee, total_amount, notes || null]
    );

    for (const line of orderLines) {
      await conn.query(
        `INSERT INTO order_items (id, order_id, product_id, product_name, model_number, quantity, unit_price, total_price)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
        [order_id, line.product_id, line.product_name, line.model_number,
         line.quantity, line.unit_price, line.total_price]
      );
      await conn.query(
        'UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?',
        [line.quantity, line.product_id]
      );
    }

    await conn.query(
      `INSERT INTO customer_activity (id, user_id, event_type, metadata) VALUES (UUID(), ?, 'order_placed', ?)`,
      [req.user.id, JSON.stringify({ order_id, total_amount })]
    );

    await conn.query('COMMIT');
    return created(res, { order: { id: order_id, order_number, total_amount, items: orderLines } }, 'Order placed successfully');
  } catch (err) {
    await conn.query('ROLLBACK');
    console.error('placeOrder error:', err);
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    return res.status(500).json({ success: false, message: 'Failed to place order' });
  } finally {
    conn.release();
  }
};

// ─── Get My Orders ────────────────────────────────────────────────────────────
const getMyOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['o.user_id = ?'];
    const params = [req.user.id];

    if (status) { conditions.push('o.status = ?'); params.push(status); }
    const where = conditions.join(' AND ');

    const [ordersResult, countResult] = await Promise.all([
      query(`
        SELECT o.id, o.order_number, o.status, o.payment_status, o.payment_method,
               o.subtotal, o.shipping_fee, o.total_amount, o.ordered_at, o.delivered_at
        FROM orders o WHERE ${where}
        ORDER BY o.ordered_at DESC
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), offset]),
      query(`SELECT COUNT(*) AS total FROM orders o WHERE ${where}`, params),
    ]);

    return success(res, {
      orders:     ordersResult.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(countResult.rows[0].total) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load orders' });
  }
};

// ─── Get Single Order ─────────────────────────────────────────────────────────
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: orderRows } = await query(`
      SELECT o.*, a.street, a.city, a.province, a.zip_code
      FROM orders o LEFT JOIN addresses a ON a.id = o.address_id
      WHERE o.id = ?
    `, [id]);

    if (!orderRows.length) return notFound(res, 'Order not found');
    const order = orderRows[0];

    if (req.user.role === 'customer' && order.user_id !== req.user.id)
      return forbidden(res, 'Access denied');

    const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = ?', [id]);
    return success(res, { order: { ...order, items } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load order' });
  }
};

// ─── Cancel Order ─────────────────────────────────────────────────────────────
const cancelOrder = async (req, res) => {
  const conn = await getClient();
  try {
    const { id } = req.params;
    await conn.query('START TRANSACTION');

    const { rows } = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) throw { status: 404, message: 'Order not found' };
    const order = rows[0];

    if (req.user.role === 'customer' && order.user_id !== req.user.id) throw { status: 403, message: 'Access denied' };
    if (!['pending', 'confirmed'].includes(order.status))
      throw { status: 400, message: `Cannot cancel an order with status: ${order.status}` };

    const { rows: items } = await conn.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
    for (const item of items) {
      await conn.query('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    await conn.query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [id]);
    await conn.query('COMMIT');
    return success(res, {}, 'Order cancelled successfully');
  } catch (err) {
    await conn.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    return res.status(500).json({ success: false, message: 'Failed to cancel order' });
  } finally {
    conn.release();
  }
};

// ─── Record Payment ───────────────────────────────────────────────────────────
const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method } = req.body;

    const { rows: orderRows } = await query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!orderRows.length) return notFound(res, 'Order not found');
    const order = orderRows[0];

    if (req.user.role === 'customer' && order.user_id !== req.user.id) return forbidden(res, 'Access denied');
    if (order.payment_status === 'paid') return badRequest(res, 'Order is already paid');

    await query(`
      UPDATE orders
      SET payment_status = 'paid',
          payment_method  = ?,
          status          = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
          confirmed_at    = CASE WHEN status = 'pending' THEN NOW() ELSE confirmed_at END
      WHERE id = ?
    `, [payment_method, id]);

    const { rows } = await query('SELECT id, order_number, status, payment_status, payment_method, total_amount FROM orders WHERE id = ?', [id]);
    return success(res, { order: rows[0] }, 'Payment recorded');
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
};

// ─── Addresses ────────────────────────────────────────────────────────────────
const getAddresses = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC', [req.user.id]);
    return success(res, { addresses: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load addresses' });
  }
};

const addAddress = async (req, res) => {
  try {
    const { label, street, city, province, zip_code, is_default } = req.body;
    if (is_default) await query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);

    await query(
      'INSERT INTO addresses (id, user_id, label, street, city, province, zip_code, is_default) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, label || 'Home', street, city, province, zip_code || null, is_default ? 1 : 0]
    );
    const { rows } = await query('SELECT * FROM addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [req.user.id]);
    return created(res, { address: rows[0] }, 'Address added');
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to add address' });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!rowCount) return notFound(res, 'Address not found');
    return success(res, {}, 'Address deleted');
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete address' });
  }
};

module.exports = {
  placeOrder, getMyOrders, getOrder, cancelOrder,
  recordPayment, getAddresses, addAddress, deleteAddress,
};
