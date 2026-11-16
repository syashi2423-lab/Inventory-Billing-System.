const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.use(authenticate);
router.use(authorizeRoles('owner', 'manager'));

router.get('/summary', reportController.getReportsSummary);

module.exports = router;
