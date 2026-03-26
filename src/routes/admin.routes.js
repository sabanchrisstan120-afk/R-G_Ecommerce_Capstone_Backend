const express = require('express');
const { param, body, query } = require('express-validator');
const router = express.Router();

const {
  getSummary,
  getRevenueTrends,
  getTopProducts,
  getSeasonalDemand,
  getPeakPeriods,
  getCustomerPreferences,
  getRepeatCustomers,
  getOrders,
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
  body('status').optional().isIn(['pending','confirmed','processing','shipped','delivered','cancelled','refunded']),
  body('payment_status').optional().isIn(['pending','paid','failed','refunded']),
  validate,
], updateOrderStatus);

// ─── User Management ─────────────────────────────────────────────────────────
// GET /api/admin/users?role=customer&page=1&limit=20
router.get('/users', getUsers);

// PATCH /api/admin/users/:id/toggle-status
router.patch('/users/:id/toggle-status', [
  param('id').isUUID().withMessage('Invalid user ID'),
  validate,
], toggleUserStatus);

module.exports = router;
