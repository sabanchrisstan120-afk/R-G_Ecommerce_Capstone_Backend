const { validationResult } = require('express-validator');
const { badRequest } = require('../utils/response');

/**
 * Collects validation errors from express-validator and returns 400 if any
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, 'Validation failed', errors.array().map(e => ({
      field: e.path,
      message: e.msg,
    })));
  }
  next();
};

module.exports = { validate };
