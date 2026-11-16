const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.use(authenticate);
router.use(authorizeRoles('owner', 'manager'));

router.get('/', purchaseOrderController.listPurchaseOrders);
router.post('/', purchaseOrderController.createPurchaseOrder);
router.patch('/:id/status', purchaseOrderController.updatePurchaseOrderStatus);
router.post('/:id/pay', purchaseOrderController.payPurchaseOrder);

module.exports = router;
