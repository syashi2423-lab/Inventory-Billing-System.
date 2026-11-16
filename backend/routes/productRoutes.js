const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.use(authenticate);

router.get('/', productController.listProducts);
router.post('/', authorizeRoles('owner', 'manager'), productController.createProduct);
router.put('/:id', authorizeRoles('owner', 'manager'), productController.updateProduct);
router.delete('/:id', authorizeRoles('owner', 'manager'), productController.deleteProduct);

module.exports = router;
