const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../config/database');
const {
  generateAccessToken, generateRefreshToken,
  verifyRefreshToken, getRefreshTokenExpiry,
} = require('../utils/jwt');
const { success, created, badRequest, unauthorized, conflict } = require('../utils/response');

const SALT_ROUNDS = 12;

// ─── Register ─────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;
    const existing = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.rows.length) return conflict(res, 'Email is already registered');

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = crypto.randomUUID();

    await query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role)
       VALUES (?, ?, ?, ?, ?, ?, 'customer')`,
      [id, email.toLowerCase(), password_hash, first_name, last_name, phone || null]
    );

    const { rows } = await query('SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = ?', [id]);
    const user = rows[0];

    const tokenPayload = { userId: user.id, role: user.role };
    const accessToken  = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (UUID(), ?, ?, ?)',
      [user.id, refreshToken, getRefreshTokenExpiry()]
    );

    return created(res, {
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role },
      access_token: accessToken,
      refresh_token: refreshToken,
    }, 'Registration successful');
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    const user = rows[0];
    if (!user) return unauthorized(res, 'Invalid email or password');
    if (!user.is_active) return unauthorized(res, 'Account is deactivated');

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return unauthorized(res, 'Invalid email or password');

    await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const tokenPayload = { userId: user.id, role: user.role };
    const accessToken  = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (UUID(), ?, ?, ?)',
      [user.id, refreshToken, getRefreshTokenExpiry()]
    );

    return success(res, {
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role },
      access_token: accessToken,
      refresh_token: refreshToken,
    }, 'Login successful');
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────
const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return badRequest(res, 'Refresh token required');

    verifyRefreshToken(refresh_token);

    const { rows } = await query(
      `SELECT rt.id, rt.user_id, u.role, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = ? AND rt.expires_at > NOW()`,
      [refresh_token]
    );

    if (!rows.length) return unauthorized(res, 'Invalid or expired refresh token');
    if (!rows[0].is_active) return unauthorized(res, 'Account deactivated');

    const { user_id, role } = rows[0];
    await query('DELETE FROM refresh_tokens WHERE token = ?', [refresh_token]);

    const newAccessToken  = generateAccessToken({ userId: user_id, role });
    const newRefreshToken = generateRefreshToken({ userId: user_id, role });
    await query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (UUID(), ?, ?, ?)',
      [user_id, newRefreshToken, getRefreshTokenExpiry()]
    );

    return success(res, { access_token: newAccessToken, refresh_token: newRefreshToken }, 'Token refreshed');
  } catch (err) {
    return unauthorized(res, 'Token refresh failed');
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) await query('DELETE FROM refresh_tokens WHERE token = ?', [refresh_token]);
    return success(res, {}, 'Logged out successfully');
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

// ─── Get Profile ──────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, email, first_name, last_name, phone, role, email_verified, last_login_at, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    return success(res, { user: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Could not fetch profile' });
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;
    await query(
      'UPDATE users SET first_name = ?, last_name = ?, phone = ? WHERE id = ?',
      [first_name, last_name, phone || null, req.user.id]
    );
    const { rows } = await query('SELECT id, email, first_name, last_name, phone, role FROM users WHERE id = ?', [req.user.id]);
    return success(res, { user: rows[0] }, 'Profile updated');
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Profile update failed' });
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const { rows } = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) return badRequest(res, 'Current password is incorrect');

    const newHash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);
    await query('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.id]);
    return success(res, {}, 'Password changed. Please log in again.');
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Password change failed' });
  }
};

module.exports = { register, login, refreshToken, logout, getProfile, updateProfile, changePassword };
