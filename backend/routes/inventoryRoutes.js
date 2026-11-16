const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.use(authenticate);
router.use(authorizeRoles('owner', 'manager'));

router.get('/movements', inventoryController.listMovements);
router.post('/adjust', inventoryController.adjustStock);
router.post('/purchase-list', inventoryController.addToPurchaseList);
router.delete('/purchase-list/:sku', inventoryController.removeFromPurchaseList);

module.exports = router;
