const { adminOnly } = require('../middleware/admin');
const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
  placeOrder, getMyOrders, getAllOrders, getOrder, cancelOrder,
  recordPayment, getAddresses, addAddress, deleteAddress,
  getAssignedOrders, updateDeliveryStatus,
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
  body('address').optional().isObject(),
  body('address.street').if(body('address').exists()).trim().notEmpty().withMessage('Street is required'),
  body('address.city').if(body('address').exists()).trim().notEmpty().withMessage('City is required'),
  body('address.province').if(body('address').exists()).trim().notEmpty().withMessage('Province is required'),
  body('address.zip').if(body('address').exists()).trim().notEmpty().withMessage('ZIP code is required'),
  body('payment_method').optional().isIn(['gcash','bank_transfer','credit_card','cash_on_delivery','maya']),
  body('notes').optional().isString().isLength({ max: 500 }),
  validate,
], placeOrder);

router.get('/assigned', [
  query('status').optional().isIn(['pending','confirmed','processing','shipped','delivered','cancelled','refunded']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validate,
], getAssignedOrders);

router.get('/', [
  query('status').optional().isIn(['pending','confirmed','processing','shipped','delivered','cancelled','refunded']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validate,
], getMyOrders);

// Compatibility alias for older clients
router.get('/my-orders', [
  query('status').optional().isIn(['pending','confirmed','processing','shipped','delivered','cancelled','refunded']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validate,
], getMyOrders);

router.patch('/:id/delivery', [
  param('id').isUUID(),
  body('delivery_status').notEmpty().isIn(['pending','out_for_delivery','delivered','cannot_find_customer','failed','cancelled']),
  body('delivery_note').optional().isString().isLength({ max: 500 }),
  body('delivery_proof_base64').optional().isString(),
  validate,
], updateDeliveryStatus);

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