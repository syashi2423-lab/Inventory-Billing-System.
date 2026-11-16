const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.use(authenticate);
router.use(authorizeRoles('owner'));

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.patch('/:id/role', userController.updateUserRole);
router.patch('/:id/status', userController.toggleUserStatus);
router.patch('/:id/password', userController.resetUserPassword);

module.exports = router;
