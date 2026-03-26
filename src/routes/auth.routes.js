const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  register, login, refreshToken, logout,
  getProfile, updateProfile, changePassword,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// ─── Public Routes ────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('first_name').trim().notEmpty().withMessage('First name required'),
  body('last_name').trim().notEmpty().withMessage('Last name required'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  validate,
], register);

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  validate,
], login);

// POST /api/auth/refresh
router.post('/refresh', [
  body('refresh_token').notEmpty().withMessage('Refresh token required'),
  validate,
], refreshToken);

// POST /api/auth/logout
router.post('/logout', logout);

// ─── Protected Routes ─────────────────────────────────────────────────────────

// GET /api/auth/me
router.get('/me', authenticate, getProfile);

// PUT /api/auth/me
router.put('/me', authenticate, [
  body('first_name').trim().notEmpty().withMessage('First name required'),
  body('last_name').trim().notEmpty().withMessage('Last name required'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  validate,
], updateProfile);

// PUT /api/auth/change-password
router.put('/change-password', authenticate, [
  body('current_password').notEmpty().withMessage('Current password required'),
  body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  validate,
], changePassword);

module.exports = router;
