const { query } = require('../config/database');

/* ─────────────────────────────
   CREATE REVIEW
───────────────────────────── */
exports.createReview = async (req, res) => {

    try {

        const user_id = req.user.id;

        const {
            product_id,
            rating,
            comment
        } = req.body;

        // VALIDATION
        if (!product_id || !rating || !comment) {

            return res.status(400).json({
                success: false,
                message: 'Missing required fields.'
            });
        }

        // CHECK PRODUCT EXISTS
        const productResult = await query(
            `
            SELECT id
            FROM products
            WHERE id = ?
            `,
            [product_id]
        );

        if (!productResult.rows.length) {

            return res.status(404).json({
                success: false,
                message: 'Product not found.'
            });
        }

        // CHECK IF USER ALREADY REVIEWED
        const existing = await query(
            `
            SELECT id
            FROM reviews
            WHERE product_id = ?
            AND user_id = ?
            `,
            [product_id, user_id]
        );

        if (existing.rows.length > 0) {

            return res.status(400).json({
                success: false,
                message: 'You already reviewed this product.'
            });
        }

        // INSERT REVIEW
        await query(
            `
            INSERT INTO reviews
            (
                id,
                product_id,
                user_id,
                rating,
                comment
            )
            VALUES
            (
                UUID(),
                ?,
                ?,
                ?,
                ?
            )
            `,
            [
                product_id,
                user_id,
                rating,
                comment
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Review submitted successfully.'
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: 'Failed to create review.'
        });
    }
};


/* ─────────────────────────────
   GET PRODUCT REVIEWS
───────────────────────────── */
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await query(`
      SELECT
        reviews.id,
        reviews.rating,
        reviews.comment,
        reviews.created_at,
        users.first_name,
        users.last_name
      FROM reviews
      LEFT JOIN users ON users.id = reviews.user_id
      WHERE reviews.product_id = ?
      ORDER BY reviews.created_at DESC
    `, [productId]);

   return res.status(200).json({
  success: true,
  reviews: result.rows
});
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: 'Failed to load reviews'
    });
  }
};