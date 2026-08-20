const express = require('express');
const router = express.Router();
const marksController = require('../controllers/marks.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

// Upload marks (teachers only)
router.post('/upload', marksController.uploadMarks);

// Get student marks
router.get('/student/:studentId', marksController.getStudentMarks);

// Get class marks (teachers/admin only)
router.get('/class/:classId', marksController.getClassMarks);

// Update marks (teachers/admin only)
router.put('/:id', marksController.updateMarks);

// Delete marks (admin only)
router.delete('/:id', marksController.deleteMarks);

module.exports = router;
