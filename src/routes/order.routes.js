const { adminOnly } = require('../middleware/admin');
const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
  placeOrder, getMyOrders, getAllOrders, getOrder, cancelOrder,
  recordPayment, getAddresses, addAddress, deleteAddress,
} = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// All order routes require authentication
router.use(authenticate);

// ─── Addresses ────────────────────────────────────────────────────────────────

router.get('/addresses', getAddresses);

router.post('/addresses', [
  body('street').trim().notEmpty().withMessage('Street address required'),
  body('city').trim().notEmpty().withMessage('City required'),
  body('province').trim().notEmpty().withMessage('Province required'),
  body('label').optional().isString(),
  body('zip_code').optional().isPostalCode('PH'),
  body('is_default').optional().isBoolean(),
  validate,
], addAddress);

router.delete('/addresses/:id', [
  param('id').isUUID(),
  validate,
], deleteAddress);

// ─── Admin ────────────────────────────────────────────────────────────────────

// IMPORTANT: /admin must be before /:id
router.get('/admin', adminOnly, [
  query('status').optional().isIn(['pending','confirmed','processing','shipped','delivered','cancelled','refunded']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validate,
], getAllOrders);

// ─── Orders ───────────────────────────────────────────────────────────────────

router.post('/', [
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.product_id').isUUID().withMessage('Valid product_id required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('address_id').optional().isUUID(),
  body('payment_method').optional().isIn(['gcash','bank_transfer','credit_card','cash_on_delivery','maya']),
  body('notes').optional().isString().isLength({ max: 500 }),
  validate,
], placeOrder);

router.get('/', [
  query('status').optional().isIn(['pending','confirmed','processing','shipped','delivered','cancelled','refunded']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validate,
], getMyOrders);

router.get('/:id', [
  param('id').isUUID(),
  validate,
], getOrder);

router.post('/:id/cancel', [
  param('id').isUUID(),
  validate,
], cancelOrder);

router.post('/:id/pay', [
  param('id').isUUID(),
  body('payment_method').isIn(['gcash','bank_transfer','credit_card','cash_on_delivery','maya'])
    .withMessage('Valid payment method required'),
  body('reference_number').optional().isString(),
  validate,
], recordPayment);

// THIS MUST BE THE ONLY module.exports AT THE BOTTOM
module.exports = router;