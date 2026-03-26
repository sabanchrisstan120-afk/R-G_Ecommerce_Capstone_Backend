const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
  placeOrder, getMyOrders, getOrder, cancelOrder,
  recordPayment, getAddresses, addAddress, deleteAddress,
} = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// All order routes require authentication
router.use(authenticate);

// ─── Addresses ────────────────────────────────────────────────────────────────

// GET /api/orders/addresses
router.get('/addresses', getAddresses);

// POST /api/orders/addresses
router.post('/addresses', [
  body('street').trim().notEmpty().withMessage('Street address required'),
  body('city').trim().notEmpty().withMessage('City required'),
  body('province').trim().notEmpty().withMessage('Province required'),
  body('label').optional().isString(),
  body('zip_code').optional().isPostalCode('PH'),
  body('is_default').optional().isBoolean(),
  validate,
], addAddress);

// DELETE /api/orders/addresses/:id
router.delete('/addresses/:id', [
  param('id').isUUID(),
  validate,
], deleteAddress);

// ─── Orders ───────────────────────────────────────────────────────────────────

// POST /api/orders
router.post('/', [
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.product_id').isUUID().withMessage('Valid product_id required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('address_id').optional().isUUID(),
  body('payment_method').optional().isIn(['gcash','bank_transfer','credit_card','cash_on_delivery','maya']),
  body('notes').optional().isString().isLength({ max: 500 }),
  validate,
], placeOrder);

// GET /api/orders  (my orders)
router.get('/', [
  query('status').optional().isIn(['pending','confirmed','processing','shipped','delivered','cancelled','refunded']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validate,
], getMyOrders);

// GET /api/orders/:id
router.get('/:id', [
  param('id').isUUID(),
  validate,
], getOrder);

// POST /api/orders/:id/cancel
router.post('/:id/cancel', [
  param('id').isUUID(),
  validate,
], cancelOrder);

// POST /api/orders/:id/pay
router.post('/:id/pay', [
  param('id').isUUID(),
  body('payment_method').isIn(['gcash','bank_transfer','credit_card','cash_on_delivery','maya'])
    .withMessage('Valid payment method required'),
  body('reference_number').optional().isString(),
  validate,
], recordPayment);

module.exports = router;
