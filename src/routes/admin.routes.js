const express = require('express');
const { param, body, query } = require('express-validator');
const router = express.Router();
const { adminOnly } = require('../middleware/admin');
const { getAllOrders } = require('../controllers/order.controller');

const {
  getSummary,
  getRevenueTrends,
  getTopProducts,
  getSeasonalDemand,
  getPeakPeriods,
  getCustomerPreferences,
  getRepeatCustomers,
  getOrders,
  getRiderActivity,
  createRider,
  updateOrderStatus,
  getUsers,
  toggleUserStatus,
} = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin', 'superadmin'));

// ─── Dashboard ────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/summary?period=30
router.get('/dashboard/summary', [
  query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Period must be 1–365 days'),
  validate,
], getSummary);

// GET /api/admin/dashboard/revenue-trends?granularity=day&months=6
router.get('/dashboard/revenue-trends', [
  query('granularity').optional().isIn(['day', 'week', 'month']),
  query('months').optional().isInt({ min: 1, max: 24 }),
  validate,
], getRevenueTrends);

// GET /api/admin/dashboard/top-products?limit=10&months=3
router.get('/dashboard/top-products', [
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('months').optional().isInt({ min: 1, max: 24 }),
  validate,
], getTopProducts);

// GET /api/admin/dashboard/seasonal-demand
router.get('/dashboard/seasonal-demand', getSeasonalDemand);

// GET /api/admin/dashboard/peak-periods
router.get('/dashboard/peak-periods', getPeakPeriods);

// GET /api/admin/dashboard/customer-preferences
router.get('/dashboard/customer-preferences', getCustomerPreferences);

// GET /api/admin/dashboard/repeat-customers?page=1&limit=20
router.get('/dashboard/repeat-customers', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
], getRepeatCustomers);

// ─── Orders Management ────────────────────────────────────────────────────────
// GET /api/admin/orders?status=pending&page=1&limit=20&search=
router.get('/orders', getOrders);

// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', [
  param('id').isUUID().withMessage('Invalid order ID'),
  body('status').optional({ checkFalsy: true }).isIn(['pending','confirmed','processing','shipped','delivered','cancelled','refunded']),
  body('payment_status').optional({ checkFalsy: true }).isIn(['pending','paid','failed','refunded']),
  body('expected_delivery_date').optional({ checkFalsy: true }).isISO8601().withMessage('Expected delivery date must be a valid date'),
  body('rider_id').optional({ checkFalsy: true }).isUUID().withMessage('Rider ID must be a valid UUID'),
  body('delivery_status').optional({ checkFalsy: true }).isIn(['pending','out_for_delivery','delivered','cannot_find_customer','failed','damaged']),
  body('delivery_issue_type').optional({ checkFalsy: true }).isString().isLength({ max: 64 }),
  body('delivery_note').optional({ checkFalsy: true }).isString().isLength({ max: 500 }),
  body('delivery_proof_url').optional({ checkFalsy: true }).isURL().withMessage('Proof URL must be a valid URL'),
  validate,
], updateOrderStatus);

// GET /api/admin/rider-activity?rider_id=&order_id=&page=&limit=
router.get('/rider-activity', [
  query('rider_id').optional().isUUID().withMessage('Rider ID must be a valid UUID'),
  query('order_id').optional().isUUID().withMessage('Order ID must be a valid UUID'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
], getRiderActivity);

// ─── User Management ─────────────────────────────────────────────────────────
// GET /api/admin/users?role=customer&page=1&limit=20
router.get('/users', getUsers);

// POST /api/admin/users
router.post('/users', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('first_name').trim().notEmpty().withMessage('First name required'),
  body('last_name').trim().notEmpty().withMessage('Last name required'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone().withMessage('Invalid phone number'),
  validate,
], createRider);

// PATCH /api/admin/users/:id/toggle-status
router.patch('/users/:id/toggle-status', [
  param('id').isUUID().withMessage('Invalid user ID'),
  validate,
], toggleUserStatus);

module.exports = router;