const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
  getProducts, getProduct, createProduct, updateProduct,
  deleteProduct, permanentDeleteProduct, adjustStock, getLowStock, getCategories, adminListProducts,
  adminListCategories, createCategory, updateCategory, deleteCategory,
} = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// ─── Public Routes ────────────────────────────────────────────────────────────

// GET /api/products?category=split-type&brand=Daikin&search=inverter&page=1&limit=20
router.get('/', getProducts);

// GET /api/products/categories
router.get('/categories', getCategories);

// GET /api/products/:id
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid product ID'),
  validate,
], getProduct);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET /api/products/admin/low-stock?threshold=5
router.get('/admin/low-stock', authenticate, authorize('admin', 'superadmin'), [
  query('threshold').optional().isInt({ min: 0 }),
  validate,
], getLowStock);

// GET /api/products/admin/list?search=&page=1&limit=15
router.get('/admin/list', authenticate, authorize('admin', 'superadmin'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  validate,
], adminListProducts);

// GET /api/products/admin/categories
router.get('/admin/categories', authenticate, authorize('admin', 'superadmin'), [
  validate,
], adminListCategories);

// POST /api/products/admin/categories
router.post('/admin/categories', authenticate, authorize('admin', 'superadmin'), [
  body('name').trim().notEmpty().withMessage('Category name required'),
  body('slug').trim().notEmpty().withMessage('Category slug required').matches(/^[a-z0-9-]+$/),
  body('description').optional().isString(),
  validate,
], createCategory);

// PUT /api/products/admin/categories/:id
router.put('/admin/categories/:id', authenticate, authorize('admin', 'superadmin'), [
  param('id').isInt().withMessage('Invalid category ID'),
  body('name').optional().trim().notEmpty(),
  body('slug').optional().trim().notEmpty().matches(/^[a-z0-9-]+$/),
  body('description').optional().isString(),
  validate,
], updateCategory);

// DELETE /api/products/admin/categories/:id
router.delete('/admin/categories/:id', authenticate, authorize('admin', 'superadmin'), [
  param('id').isInt().withMessage('Invalid category ID'),
  validate,
], deleteCategory);

// POST /api/products
router.post('/', authenticate, authorize('admin', 'superadmin'), [
  body('name').trim().notEmpty().withMessage('Product name required'),
  body('model_number').trim().notEmpty().withMessage('Model number required'),
  body('brand').trim().notEmpty().withMessage('Brand required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
  body('stock_qty').optional().isInt({ min: 0 }),
  body('category_id').optional().isInt(),
  body('horsepower').optional().isFloat({ min: 0 }),
  body('cooling_capacity_btu').optional().isInt({ min: 0 }),
  validate,
], createProduct);

// PUT /api/products/:id
router.put('/:id', authenticate, authorize('admin', 'superadmin'), [
  param('id').isUUID(),
  body('price').optional().isFloat({ min: 0 }),
  body('stock_qty').optional().isInt({ min: 0 }),
  validate,
], updateProduct);

// DELETE /api/products/:id  (soft delete)
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), [
  param('id').isUUID(),
  validate,
], deleteProduct);

// DELETE /api/products/:id/permanent  (hard delete)
router.delete('/:id/permanent', authenticate, authorize('admin', 'superadmin'), [
  param('id').isUUID(),
  validate,
], permanentDeleteProduct);

// PATCH /api/products/:id/stock
router.patch('/:id/stock', authenticate, authorize('admin', 'superadmin'), [
  param('id').isUUID(),
  body('adjustment').isInt().withMessage('adjustment must be an integer (positive or negative)'),
  body('reason').optional().isString(),
  validate,
], adjustStock);

module.exports = router;
