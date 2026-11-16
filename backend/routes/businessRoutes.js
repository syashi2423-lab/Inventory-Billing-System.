const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.use(authenticate);

router.get('/workspace', businessController.getWorkspace);
router.put('/settings', authorizeRoles('owner', 'manager'), businessController.updateSettings);
router.put('/template', authorizeRoles('owner'), businessController.updateTemplate);
router.post('/taxes', authorizeRoles('owner'), businessController.addTaxRate);
router.delete('/taxes/:id', authorizeRoles('owner'), businessController.deleteTaxRate);

module.exports = router;
