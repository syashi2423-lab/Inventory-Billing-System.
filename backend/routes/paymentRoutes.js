const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', paymentController.listPayments);
router.post('/', paymentController.recordPayment);

module.exports = router;
