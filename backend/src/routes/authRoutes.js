const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/login', authController.login);
router.post('/setup-admin', authController.setupAdmin);
router.put('/change-password', verifyToken, authController.changePassword);

module.exports = router;
