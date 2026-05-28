const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const reviewController = require('../controllers/review.controller');

router.post('/', authenticate, reviewController.createReview);

router.get('/product/:productId', reviewController.getProductReviews);

module.exports = router;