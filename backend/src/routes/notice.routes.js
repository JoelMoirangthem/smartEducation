const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/notice.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

// Create notice (teachers/admin only)
router.post('/add', noticeController.createNotice);

// Get all notices (filtered by user role/class)
router.get('/', noticeController.getNotices);

// Get single notice
router.get('/:id', noticeController.getNoticeById);

// Update notice (creator/admin only)
router.put('/:id', noticeController.updateNotice);

// Delete notice (creator/admin only)
router.delete('/:id', noticeController.deleteNotice);

module.exports = router;
