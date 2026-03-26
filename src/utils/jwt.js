const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET          = process.env.JWT_SECRET;
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in environment');
}

/**
 * Generate short-lived access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Generate long-lived refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

/**
 * Calculate expiry date for refresh token storage
 */
const getRefreshTokenExpiry = () => {
  const days = parseInt(JWT_REFRESH_EXPIRES) || 30;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
};
