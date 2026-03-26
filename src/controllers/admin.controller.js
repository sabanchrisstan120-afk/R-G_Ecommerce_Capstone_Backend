const { query } = require('../config/database');
const { success, notFound, badRequest } = require('../utils/response');

// ─── Dashboard Summary ────────────────────────────────────────────────────────
const getSummary = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const p = parseInt(period);

    const [revenue, orders, customers, topProduct] = await Promise.all([
      query(`
        SELECT
          COALESCE(SUM(total_amount), 0) AS total_revenue,
          COALESCE(SUM(CASE WHEN ordered_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN total_amount END), 0) AS period_revenue,
          COALESCE(SUM(CASE WHEN ordered_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                             AND ordered_at <  DATE_SUB(NOW(), INTERVAL ? DAY) THEN total_amount END), 0) AS prev_period_revenue
        FROM orders WHERE payment_status = 'paid'
      `, [p, p * 2, p]),

      query(`
        SELECT
          COUNT(*) AS total_orders,
          SUM(CASE WHEN ordered_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 ELSE 0 END) AS period_orders,
          SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) AS pending_orders,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered_orders
        FROM orders
      `, [p]),

      query(`
        SELECT
          COUNT(*) AS total_customers,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 ELSE 0 END) AS new_customers,
          SUM(CASE WHEN (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) > 1 THEN 1 ELSE 0 END) AS repeat_customers
        FROM users u WHERE role = 'customer'
      `, [p]),

      query(`
        SELECT p.name, p.model_number, SUM(oi.quantity) AS units_sold
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN orders o   ON o.id = oi.order_id
        WHERE o.ordered_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND o.payment_status = 'paid'
        GROUP BY p.id, p.name, p.model_number
        ORDER BY units_sold DESC
        LIMIT 1
      `, [p]),
    ]);

    const rev = revenue.rows[0];
    const revGrowth = rev.prev_period_revenue > 0
      ? (((rev.period_revenue - rev.prev_period_revenue) / rev.prev_period_revenue) * 100).toFixed(1)
      : null;

    return success(res, {
      revenue: {
        total:       parseFloat(rev.total_revenue),
        period:      parseFloat(rev.period_revenue),
        prev_period: parseFloat(rev.prev_period_revenue),
        growth_pct:  revGrowth,
      },
      orders:      orders.rows[0],
      customers:   customers.rows[0],
      top_product: topProduct.rows[0] || null,
    });
  } catch (err) {
    console.error('getSummary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load summary' });
  }
};

// ─── Revenue Trends ───────────────────────────────────────────────────────────
const getRevenueTrends = async (req, res) => {
  try {
    const { granularity = 'day', months = 6 } = req.query;

    const formatMap = { day: '%Y-%m-%d', week: '%Y-%u', month: '%Y-%m' };
    const fmt = formatMap[granularity] || formatMap.day;

    const { rows } = await query(`
      SELECT
        DATE_FORMAT(ordered_at, ?) AS period,
        COUNT(*)                    AS order_count,
        COALESCE(SUM(total_amount), 0) AS revenue
      FROM orders
      WHERE payment_status = 'paid'
        AND ordered_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(ordered_at, ?)
      ORDER BY period ASC
    `, [fmt, parseInt(months), fmt]);

    return success(res, { granularity, trends: rows });
  } catch (err) {
    console.error('getRevenueTrends error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load revenue trends' });
  }
};

// ─── Top Products ─────────────────────────────────────────────────────────────
const getTopProducts = async (req, res) => {
  try {
    const { limit = 10, months = 3 } = req.query;
    const { rows } = await query(`
      SELECT
        p.id, p.name, p.model_number, p.brand, p.price, p.image_url,
        c.name              AS category,
        SUM(oi.quantity)    AS units_sold,
        SUM(oi.total_price) AS revenue_generated,
        COUNT(DISTINCT o.user_id) AS unique_buyers
      FROM order_items oi
      JOIN products p    ON p.id = oi.product_id
      JOIN orders o      ON o.id = oi.order_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE o.payment_status = 'paid'
        AND o.ordered_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY p.id, p.name, p.model_number, p.brand, p.price, p.image_url, c.name
      ORDER BY units_sold DESC
      LIMIT ?
    `, [parseInt(months), Math.min(parseInt(limit), 50)]);
    return success(res, { products: rows });
  } catch (err) {
    console.error('getTopProducts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load top products' });
  }
};

// ─── Seasonal Demand ──────────────────────────────────────────────────────────
const getSeasonalDemand = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        DATE_FORMAT(ordered_at, '%M') AS month_name,
        MONTH(ordered_at)             AS month_num,
        YEAR(ordered_at)              AS year,
        COUNT(*)                       AS order_count,
        SUM(total_amount)              AS revenue
      FROM orders
      WHERE payment_status = 'paid'
        AND ordered_at >= DATE_SUB(NOW(), INTERVAL 2 YEAR)
      GROUP BY YEAR(ordered_at), MONTH(ordered_at), DATE_FORMAT(ordered_at, '%M')
      ORDER BY year ASC, month_num ASC
    `);

    const byMonth = {};
    rows.forEach(r => {
      const key = r.month_num;
      if (!byMonth[key]) byMonth[key] = { month_name: r.month_name, month_num: key, total_orders: 0, total_revenue: 0, years: 0 };
      byMonth[key].total_orders  += parseInt(r.order_count);
      byMonth[key].total_revenue += parseFloat(r.revenue || 0);
      byMonth[key].years         += 1;
    });

    const averages = Object.values(byMonth).map(m => ({
      ...m,
      avg_orders:  (m.total_orders / m.years).toFixed(1),
      avg_revenue: (m.total_revenue / m.years).toFixed(2),
    })).sort((a, b) => a.month_num - b.month_num);

    return success(res, { monthly_raw: rows, monthly_averages: averages });
  } catch (err) {
    console.error('getSeasonalDemand error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load seasonal data' });
  }
};

// ─── Peak Periods ─────────────────────────────────────────────────────────────
const getPeakPeriods = async (req, res) => {
  try {
    const [byHour, byDow] = await Promise.all([
      query(`
        SELECT
          HOUR(ordered_at)                  AS hour,
          COUNT(*)                           AS order_count,
          ROUND(AVG(total_amount), 2)        AS avg_order_value
        FROM orders WHERE payment_status = 'paid'
        GROUP BY HOUR(ordered_at)
        ORDER BY hour ASC
      `),
      query(`
        SELECT
          DAYOFWEEK(ordered_at)             AS day_of_week,
          DAYNAME(ordered_at)               AS day_name,
          COUNT(*)                           AS order_count,
          ROUND(SUM(total_amount), 2)        AS total_revenue
        FROM orders WHERE payment_status = 'paid'
        GROUP BY DAYOFWEEK(ordered_at), DAYNAME(ordered_at)
        ORDER BY day_of_week ASC
      `),
    ]);
    return success(res, { by_hour: byHour.rows, by_day_of_week: byDow.rows });
  } catch (err) {
    console.error('getPeakPeriods error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load peak periods' });
  }
};

// ─── Customer Preferences ─────────────────────────────────────────────────────
const getCustomerPreferences = async (req, res) => {
  try {
    const [byCategory, byBrand, byHp] = await Promise.all([
      query(`
        SELECT c.name AS category, SUM(oi.quantity) AS units_sold,
               ROUND(SUM(oi.quantity) * 100.0 / (SELECT SUM(quantity) FROM order_items), 1) AS pct
        FROM order_items oi
        JOIN products p    ON p.id = oi.product_id
        JOIN categories c  ON c.id = p.category_id
        JOIN orders o      ON o.id = oi.order_id
        WHERE o.payment_status = 'paid'
        GROUP BY c.name ORDER BY units_sold DESC
      `),
      query(`
        SELECT p.brand, SUM(oi.quantity) AS units_sold,
               ROUND(SUM(oi.quantity) * 100.0 / (SELECT SUM(quantity) FROM order_items), 1) AS pct
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN orders o   ON o.id = oi.order_id
        WHERE o.payment_status = 'paid'
        GROUP BY p.brand ORDER BY units_sold DESC LIMIT 10
      `),
      query(`
        SELECT p.horsepower AS hp, SUM(oi.quantity) AS units_sold
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN orders o   ON o.id = oi.order_id
        WHERE o.payment_status = 'paid' AND p.horsepower IS NOT NULL
        GROUP BY p.horsepower ORDER BY units_sold DESC
      `),
    ]);
    return success(res, { by_category: byCategory.rows, by_brand: byBrand.rows, by_horsepower: byHp.rows });
  } catch (err) {
    console.error('getCustomerPreferences error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load preferences' });
  }
};

// ─── Repeat Customers ─────────────────────────────────────────────────────────
const getRepeatCustomers = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows } = await query(`
      SELECT
        u.id, u.first_name, u.last_name, u.email,
        COUNT(o.id)                   AS order_count,
        SUM(o.total_amount)           AS lifetime_value,
        ROUND(AVG(o.total_amount), 2) AS avg_order_value,
        MAX(o.ordered_at)             AS last_order_at,
        MIN(o.ordered_at)             AS first_order_at
      FROM users u
      JOIN orders o ON o.user_id = u.id
      WHERE o.payment_status = 'paid'
      GROUP BY u.id, u.first_name, u.last_name, u.email
      HAVING COUNT(o.id) > 1
      ORDER BY lifetime_value DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);

    const countResult = await query(`
      SELECT COUNT(*) AS total FROM (
        SELECT user_id FROM orders WHERE payment_status = 'paid'
        GROUP BY user_id HAVING COUNT(*) > 1
      ) sub
    `);

    return success(res, {
      customers:  rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(countResult.rows[0].total) },
    });
  } catch (err) {
    console.error('getRepeatCustomers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load repeat customers' });
  }
};

// ─── All Orders ───────────────────────────────────────────────────────────────
const getOrders = async (req, res) => {
  try {
    const { status, payment_status, page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['1=1'];
    const params = [];

    if (status)         { conditions.push('o.status = ?');         params.push(status); }
    if (payment_status) { conditions.push('o.payment_status = ?'); params.push(payment_status); }
    if (search) {
      conditions.push('(o.order_number LIKE ? OR u.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.join(' AND ');

    const [ordersResult, countResult] = await Promise.all([
      query(`
        SELECT o.id, o.order_number, o.status, o.payment_status, o.payment_method,
               o.subtotal, o.total_amount, o.ordered_at,
               u.first_name, u.last_name, u.email
        FROM orders o JOIN users u ON u.id = o.user_id
        WHERE ${where}
        ORDER BY o.ordered_at DESC
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), offset]),
      query(`SELECT COUNT(*) AS total FROM orders o JOIN users u ON u.id = o.user_id WHERE ${where}`, params),
    ]);

    return success(res, {
      orders:     ordersResult.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(countResult.rows[0].total) },
    });
  } catch (err) {
    console.error('getOrders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load orders' });
  }
};

// ─── Update Order Status ──────────────────────────────────────────────────────
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;
    const updates = [];
    const params  = [];

    if (status)         { updates.push('status = ?');         params.push(status); }
    if (payment_status) { updates.push('payment_status = ?'); params.push(payment_status); }
    if (status === 'delivered') updates.push('delivered_at = NOW()');
    if (status === 'confirmed') updates.push('confirmed_at = NOW()');
    params.push(id);

    await query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, params);
    const { rows } = await query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!rows.length) return notFound(res, 'Order not found');
    return success(res, { order: rows[0] }, 'Order updated');
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order' });
  }
};

// ─── All Users ────────────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['1=1'];
    const params = [];

    if (role) { conditions.push('role = ?'); params.push(role); }
    if (search) {
      conditions.push('(email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = conditions.join(' AND ');

    const [usersResult, countResult] = await Promise.all([
      query(`
        SELECT id, email, first_name, last_name, phone, role, is_active, last_login_at, created_at
        FROM users WHERE ${where}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), offset]),
      query(`SELECT COUNT(*) AS total FROM users WHERE ${where}`, params),
    ]);

    return success(res, {
      users:      usersResult.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(countResult.rows[0].total) },
    });
  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load users' });
  }
};

// ─── Toggle User Status ───────────────────────────────────────────────────────
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return badRequest(res, 'Cannot deactivate yourself');

    await query('UPDATE users SET is_active = NOT is_active WHERE id = ?', [id]);
    const { rows } = await query('SELECT id, email, is_active FROM users WHERE id = ?', [id]);
    if (!rows.length) return notFound(res, 'User not found');
    return success(res, { user: rows[0] }, `User ${rows[0].is_active ? 'activated' : 'deactivated'}`);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
};

module.exports = {
  getSummary, getRevenueTrends, getTopProducts, getSeasonalDemand,
  getPeakPeriods, getCustomerPreferences, getRepeatCustomers,
  getOrders, updateOrderStatus, getUsers, toggleUserStatus,
};
