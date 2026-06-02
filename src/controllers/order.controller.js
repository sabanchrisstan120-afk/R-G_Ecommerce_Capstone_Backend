const fs = require('fs').promises;
const path = require('path');
const { query, getClient } = require('../config/database');
const { success, created, notFound, badRequest, forbidden } = require('../utils/response');

// Save to project-root uploads directory so it matches Express static serving.
const DELIVERY_UPLOAD_DIR = path.join(__dirname, '../../uploads/delivery_proofs');

const generateOrderNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `RG-${date}-${rand}`;
};

const createOrderAddress = async (conn, userId, address, phone) => {
  const street = address.street?.trim();
  const city = address.city?.trim();
  const province = address.province?.trim();
  const zip_code = (address.zip_code || address.zip || '').trim();
  const phone_contact = phone?.trim();

  if (!street || !city || !province || !zip_code) {
    throw { status: 400, message: 'Complete delivery address is required' };
  }

  const addressId = require('crypto').randomUUID();
  await conn.query(
    `INSERT INTO addresses (id, user_id, label, street, city, province, zip_code, phone, is_default, created_at)
     VALUES (?, ?, 'Delivery', ?, ?, ?, ?, ?, 0, NOW())`,
    [addressId, userId, street, city, province, zip_code, phone_contact]
  );

  return addressId;
};

// ─── Place Order ──────────────────────────────────────────────────────────────
const placeOrder = async (req, res) => {
  const conn = await getClient();
  try {
    const { items, address_id, address, payment_method, notes, phone } = req.body;
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

    // Validate or persist order address
    let orderAddressId = null;
    if (address_id) {
      const { rows: addrRows } = await conn.query(
        'SELECT id FROM addresses WHERE id = ? AND user_id = ?',
        [address_id, req.user.id]
      );
      if (!addrRows.length) throw { status: 400, message: 'Invalid address' };
      orderAddressId = address_id;
    } else if (address) {
      orderAddressId = await createOrderAddress(conn, req.user.id, address, phone);
    } else {
      throw { status: 400, message: 'Delivery address is required' };
    }

    const shipping_fee    = subtotal >= 10000 ? 0 : 500;
    const discount_amount = 0;
    const total_amount    = subtotal + shipping_fee - discount_amount;
    const order_number    = generateOrderNumber();
    const order_id        = require('crypto').randomUUID();

    await conn.query(
      `INSERT INTO orders (id, order_number, user_id, address_id, payment_method, subtotal, discount_amount, shipping_fee, total_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order_id, order_number, req.user.id, orderAddressId, payment_method || null,
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
      `INSERT INTO order_deliveries (id, order_id, delivery_status, created_at, updated_at)
       VALUES (UUID(), ?, 'pending', NOW(), NOW())`,
      [order_id]
    );

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

const saveDeliveryProofImage = async (dataUrl) => {
  const matches = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid image data. Upload a PNG, JPG, or WEBP file.');
  }

  const mimeType = matches[1];
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
  const buffer = Buffer.from(matches[3], 'base64');

  if (buffer.length > 8 * 1024 * 1024) {
    throw new Error('Image exceeds the maximum size of 8MB.');
  }

  await fs.mkdir(DELIVERY_UPLOAD_DIR, { recursive: true });
  const filename = `${require('crypto').randomUUID()}.${ext}`;
  const filepath = path.join(DELIVERY_UPLOAD_DIR, filename);
  await fs.writeFile(filepath, buffer);
  return `/uploads/delivery_proofs/${filename}`;
};

const logRiderActivity = async (conn, userId, metadata) => {
  try {
    await conn.query(
      `INSERT INTO customer_activity (id, user_id, event_type, metadata, created_at)
       VALUES (UUID(), ?, 'rider_delivery_update', ?, NOW())`,
      [userId, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('logRiderActivity error:', err);
  }
};

const getAssignedOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ['od.rider_id = ?'];
    const params = [req.user.id];

    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [ordersResult, countResult] = await Promise.all([
      query(`
        SELECT
          o.id,
          o.order_number,
          o.status,
          o.payment_status,
          o.payment_method,
          o.subtotal,
          o.shipping_fee,
          o.total_amount,
          o.ordered_at,
          o.notes,
          od.expected_delivery_date,
          od.delivery_status,
          od.delivery_issue_type,
          od.delivery_note,
          od.delivery_proof_url,
          od.rider_id,
          CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
          u.email,
          COALESCE(oa.phone, u.phone) AS phone,
          COALESCE(oa.street, ua.street) AS street,
          COALESCE(oa.city, ua.city) AS city,
          COALESCE(oa.province, ua.province) AS province,
          COALESCE(oa.zip_code, ua.zip_code) AS zip_code
        FROM orders o
        JOIN order_deliveries od ON od.order_id = o.id
        JOIN users u ON u.id = o.user_id
        LEFT JOIN addresses oa ON oa.id = o.address_id
        LEFT JOIN addresses ua ON ua.user_id = o.user_id AND ua.is_default = 1
        ${where}
        ORDER BY o.ordered_at DESC
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), offset]),

      query(`
        SELECT COUNT(*) AS total
        FROM orders o
        JOIN order_deliveries od ON od.order_id = o.id
        ${where}
      `, params),
    ]);

    const orders = ordersResult.rows;
    for (const order of orders) {
      const itemsResult = await query(`
        SELECT
          oi.*,
          p.name,
          p.image_url
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
      `, [order.id]);
      order.items = itemsResult.rows;
    }

    return success(res, {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to load assigned orders' });
  }
};

const updateDeliveryStatus = async (req, res) => {
  const conn = await getClient();
  try {
    if (req.user.role !== 'rider') {
      throw { status: 403, message: 'Only riders can update delivery status' };
    }

    const { id } = req.params;
    const { delivery_status, delivery_note, delivery_proof_base64 } = req.body;

    if (['failed', 'cancelled'].includes(delivery_status) && !delivery_note) {
      return badRequest(res, 'A reason is required when delivery fails or is cancelled');
    }

    await conn.query('START TRANSACTION');

    const { rows } = await conn.query(
      `SELECT o.id, o.status, od.rider_id
       FROM orders o
       JOIN order_deliveries od ON od.order_id = o.id
       WHERE o.id = ? FOR UPDATE`,
      [id]
    );

    if (!rows.length) {
      throw { status: 404, message: 'Order not found' };
    }

    const order = rows[0];
    if (order.rider_id !== req.user.id) {
      throw { status: 403, message: 'This order is not assigned to you' };
    }

    const updates = [];
    const params = [];

    updates.push('delivery_status = ?');
    params.push(delivery_status);

    if (delivery_note !== undefined) {
      updates.push('delivery_note = ?');
      params.push(delivery_note);
    }

    if (delivery_proof_base64) {
      const proofUrl = await saveDeliveryProofImage(delivery_proof_base64);
      updates.push('delivery_proof_url = ?');
      params.push(proofUrl);
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await conn.query(`UPDATE order_deliveries SET ${updates.join(', ')} WHERE order_id = ?`, params);

    if (delivery_status === 'delivered' && order.status !== 'delivered') {
      await conn.query('UPDATE orders SET status = ? WHERE id = ?', ['delivered', id]);
    }

    if (delivery_status === 'cancelled' && order.status !== 'cancelled') {
      await conn.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', id]);
    }

    await logRiderActivity(conn, req.user.id, {
      order_id: id,
      delivery_status,
      delivery_note: delivery_note || null,
      delivery_proof_uploaded: Boolean(delivery_proof_base64),
    });

    await conn.query('COMMIT');

    const { rows: updatedRows } = await query(
      `SELECT od.delivery_status, od.delivery_note, od.delivery_proof_url
       FROM order_deliveries od
       WHERE od.order_id = ?`,
      [id]
    );

    return success(res, {
      delivery: updatedRows[0] || {},
    }, 'Delivery updated successfully');
  } catch (err) {
    await conn.query('ROLLBACK');
    console.error('updateDeliveryStatus error:', err);
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    return res.status(500).json({ success: false, message: 'Failed to update delivery' });
  } finally {
    conn.release();
  }
};

// ─── Get My Orders ────────────────────────────────────────────────────────────
// ─── Get My Orders ────────────────────────────────────────────────────────────
const getMyOrders = async (req, res) => {
  try {

    const { status, page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ['o.user_id = ?'];

    const params = [req.user.id];

    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }

    const where = conditions.join(' AND ');

    const [ordersResult, countResult] = await Promise.all([

      query(`
        SELECT
          o.id,
          o.order_number,
          o.status,
          o.payment_status,
          o.payment_method,
          o.subtotal,
          o.shipping_fee,
          o.total_amount,
          o.ordered_at,
          od.expected_delivery_date,
          od.delivery_status,
          od.delivery_issue_type,
          od.delivery_note,
          od.delivery_proof_url,
          od.rider_id,
          r.first_name AS rider_first_name,
          r.last_name AS rider_last_name,
          COALESCE(oa.street, ua.street) AS street,
          COALESCE(oa.city, ua.city) AS city,
          COALESCE(oa.province, ua.province) AS province,
          COALESCE(oa.zip_code, ua.zip_code) AS zip_code
        FROM orders o
        LEFT JOIN order_deliveries od ON od.order_id = o.id
        LEFT JOIN riders r ON r.id = od.rider_id
        LEFT JOIN addresses oa ON oa.id = o.address_id
        LEFT JOIN addresses ua ON ua.user_id = o.user_id AND ua.is_default = 1
        WHERE ${where}
        ORDER BY o.ordered_at DESC
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), offset]),

      query(`
        SELECT COUNT(*) AS total
        FROM orders o
        WHERE ${where}
      `, params),

    ]);

    // ADD ORDER ITEMS
    const orders = ordersResult.rows;

    for (const order of orders) {
      const itemsResult = await query(`
        SELECT
          oi.*,
          p.name,
          p.image_url
        FROM order_items oi
        LEFT JOIN products p
          ON p.id = oi.product_id
        WHERE oi.order_id = ?
      `, [order.id]);

      order.items = itemsResult.rows;
    }

    return success(res, {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
      },
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: 'Failed to load orders'
    });
  }
};

// ─── Admin: Get All Orders ─────────────────────────────────────
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = '';
    const params = [];

    if (status) {
      where = 'WHERE o.status = ?';
      params.push(status);
    }

    const [ordersResult, countResult] = await Promise.all([
      query(`
        SELECT o.id, o.order_number, o.status, o.payment_status,
               o.total_amount, o.ordered_at,
               od.expected_delivery_date,
               od.delivery_status,
               od.delivery_issue_type,
               od.delivery_note,
               od.delivery_proof_url,
               od.rider_id,
               r.first_name AS rider_first_name,
               r.last_name AS rider_last_name,
               CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
               u.email
        FROM orders o
        JOIN users u ON u.id = o.user_id
        LEFT JOIN order_deliveries od ON od.order_id = o.id
        LEFT JOIN riders r ON r.id = od.rider_id
        ${where}
        ORDER BY o.ordered_at DESC
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), offset]),

      query(`
        SELECT COUNT(*) AS total
        FROM orders o
        ${where}
      `, params),
    ]);

    return success(res, {
      orders: ordersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
      },
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success:false, message:'Failed to load orders' });
  }
};

// ─── Get Single Order ─────────────────────────────────────────────────────────
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: orderRows } = await query(`
      SELECT o.*, 
             COALESCE(oa.street, ua.street) AS street,
             COALESCE(oa.city, ua.city) AS city,
             COALESCE(oa.province, ua.province) AS province,
             COALESCE(oa.zip_code, ua.zip_code) AS zip_code,
             od.expected_delivery_date,
             od.delivery_status,
             od.delivery_issue_type,
             od.delivery_note,
             od.delivery_proof_url,
             od.rider_id,
             r.first_name AS rider_first_name,
             r.last_name AS rider_last_name
      FROM orders o
      LEFT JOIN addresses oa ON oa.id = o.address_id
      LEFT JOIN addresses ua ON ua.user_id = o.user_id AND ua.is_default = 1
      LEFT JOIN order_deliveries od ON od.order_id = o.id
      LEFT JOIN riders r ON r.id = od.rider_id
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
  placeOrder,
  getMyOrders,
  getAllOrders,
  getOrder,
  cancelOrder,
  recordPayment,
  getAssignedOrders,
  updateDeliveryStatus,
  getAddresses,
  addAddress,
  deleteAddress,
};