//File nĂ y chá»©a táº¥t cáº£ cĂ¡c quy táº¯c kiá»ƒm tra dá»¯ liá»‡u Ä‘áº§u vĂ o.
// shared/middleware/validation.js
const { body, param, validationResult } = require('express-validator');

// Middleware Ä‘á»ƒ kiá»ƒm tra káº¿t quáº£ validation
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      error: 'Dữ liệu không hợp lệ',
      errors: errors.array()
    });
  }
  next();
};

// Validation cho Ä‘Äƒng kĂ½ ngÆ°á»i dĂ¹ng
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('TĂªn khĂ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng')
    .isLength({ min: 2, max: 100 }).withMessage('TĂªn pháº£i cĂ³ tá»« 2-100 kĂ½ tá»±'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email khĂ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng')
    .isEmail().withMessage('Email khĂ´ng há»£p lá»‡')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Máº­t kháº©u khĂ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng')
    .isLength({ min: 6 }).withMessage('Máº­t kháº©u pháº£i cĂ³ Ă­t nháº¥t 6 kĂ½ tá»±'),
  validate
];

// Validation cho Ä‘Äƒng nháº­p
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email khĂ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng')
    .isEmail().withMessage('Email khĂ´ng há»£p lá»‡')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Máº­t kháº©u khĂ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng'),
  validate
];

// Validation cho viá»‡c táº¡o Ä‘Æ¡n hĂ ng
const createOrderValidation = [
    body('customer_id').isInt({ min: 1 }).withMessage('Customer ID khĂ´ng há»£p lá»‡'),
    body('service_type').isIn(['transcription', 'arrangement', 'recording']).withMessage('Loáº¡i dá»‹ch vá»¥ khĂ´ng há»£p lá»‡'),
    body('description').trim().notEmpty().withMessage('MĂ´ táº£ khĂ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng'),
    body('price').isFloat({ min: 0 }).withMessage('GiĂ¡ tiá»n khĂ´ng há»£p lá»‡'),
    validate
];

// Validation cho ID trong URL params (/:id)
const idParamValidation = [
    param('id').isInt({ min: 1 }).withMessage('ID khĂ´ng há»£p lá»‡'),
    validate
];

// Validation cho viá»‡c táº¡o task
const createTaskValidation = [
    body('order_id').isInt({ min: 1 }).withMessage('Order ID khĂ´ng há»£p lá»‡'),
    body('assigned_to').isInt({ min: 1 }).withMessage('ID ngÆ°á»i Ä‘Æ°á»£c giao khĂ´ng há»£p lá»‡'),
    body('specialist_role').isIn(['transcriber', 'arranger', 'artist']).withMessage('Vai trĂ² chuyĂªn viĂªn khĂ´ng há»£p lá»‡'),
    body('deadline').isISO8601().toDate().withMessage('Deadline khĂ´ng há»£p lá»‡'),
    validate
];

// Validation cho feedback
const feedbackValidation = [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating pháº£i tá»« 1 Ä‘áº¿n 5'),
    body('comment').optional().trim().isLength({ max: 500 }).withMessage('BĂ¬nh luáº­n khĂ´ng Ä‘Æ°á»£c quĂ¡ 500 kĂ½ tá»±'),
    validate
];

// === PHáº¦N THĂM Má»I ===
// Validation cho Admin táº¡o user
const adminCreateUserValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('TĂªn khĂ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email khĂ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng')
        .isEmail().withMessage('Email khĂ´ng há»£p lá»‡')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Máº­t kháº©u khĂ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng')
        .isLength({ min: 6 }).withMessage('Máº­t kháº©u pháº£i cĂ³ Ă­t nháº¥t 6 kĂ½ tá»±'),
    body('role')
        .isIn(['customer','coordinator','transcriber','arranger','artist','studio_admin','admin'])
        .withMessage('Vai trĂ² khĂ´ng há»£p lá»‡'),
    validate
];

// Validation cho Admin cáº­p nháº­t user
const adminUpdateUserValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('TĂªn khĂ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email khĂ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng')
        .isEmail().withMessage('Email khĂ´ng há»£p lá»‡')
        .normalizeEmail(),
    body('role')
        .isIn(['customer','coordinator','transcriber','arranger','artist','studio_admin','admin'])
        .withMessage('Vai trĂ² khĂ´ng há»£p lá»‡'),
    validate
];
// === Káº¾T THĂC PHáº¦N THĂM Má»I ===

// Validation cho orderId trong URL params (/:orderId)
const orderIdParamValidation = [
    param('orderId').isInt({ min: 1 }).withMessage('Order ID khĂ´ng há»£p lá»‡'),
    validate
];

const fileIdParamValidation = [
    param('fileId').isInt({ min: 1 }).withMessage('File ID khĂ´ng há»£p lá»‡'),
    validate
];

module.exports = {
  registerValidation,
  loginValidation,
  createOrderValidation,
  idParamValidation,
  createTaskValidation, 
  feedbackValidation,
  adminCreateUserValidation,
  adminUpdateUserValidation,
  orderIdParamValidation,
  fileIdParamValidation
};
