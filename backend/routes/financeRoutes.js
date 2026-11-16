const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.use(authenticate);
router.use(authorizeRoles('owner', 'manager'));

router.post('/accounts', financeController.createBankAccount);
router.delete('/accounts/:id', financeController.deleteBankAccount);
router.post('/transactions', financeController.createBankTransaction);

module.exports = router;
