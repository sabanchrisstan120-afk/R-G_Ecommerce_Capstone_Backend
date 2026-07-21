const { query } = require('../config/database');
const { success, created, badRequest, notFound } = require('../utils/response');

/* ─────────────────────────────
   CREATE REVIEW
───────────────────────────── */
exports.createReview = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { product_id, rating, comment } = req.body;

    if (!product_id) return badRequest(res, 'product_id is required');
    if (rating === undefined || rating === null)
      return badRequest(res, 'rating is required');

    // check product
    const productResult = await query('SELECT id FROM products WHERE id = ?', [product_id]);
    if (!productResult.rows.length) return notFound(res, 'Product not found');

    // check duplicate review
    const existing = await query(
      'SELECT id FROM reviews WHERE product_id = ? AND user_id = ?',
      [product_id, user_id]
    );

    if (existing.rows.length > 0) {
      return badRequest(res, 'You already reviewed this product.');
    }

    await query(
      `INSERT INTO reviews (product_id, user_id, rating, comment)
       VALUES (?, ?, ?, ?)`,
      [product_id, user_id, rating, comment]
    );

    return created(res, { review: { id: null, product_id, rating, comment } }, 'Review submitted successfully.');
  } catch (err) {
    // Handle unique constraint race conditions
    if (err && err.code === 'ER_DUP_ENTRY') {
      return badRequest(res, 'You already reviewed this product.');
    }

    console.error('createReview error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create review.' });
  }
};

/* ─────────────────────────────
   GET PRODUCT REVIEWS
───────────────────────────── */
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await query(
      `SELECT
         reviews.id,
         reviews.rating,
         reviews.comment,
         reviews.created_at,
         users.first_name,
         users.last_name
       FROM reviews
       LEFT JOIN users ON users.id = reviews.user_id
       WHERE reviews.product_id = ?
       ORDER BY reviews.created_at DESC`,
      [productId]
    );

    return res.status(200).json({
      success: true,
      message: 'Reviews loaded',
      reviews: result.rows,
      data: { reviews: result.rows },
    });
  } catch (err) {
    console.error('getProductReviews error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load reviews' });
  }
};

