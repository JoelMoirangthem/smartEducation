const express = require("express");
const router = express.Router();
const { startSession, markAttendance, getSessionStats, endSession, getStudentSubjectStats, exportSessionAttendance } = require("../controllers/attendance.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.use(authMiddleware);

router.post("/start", startSession); // Teacher
router.post("/end", endSession); // Teacher
router.post("/mark", markAttendance); // Student
router.get("/stats", getSessionStats); // Teacher
router.get("/student-stats", getStudentSubjectStats); // Student
router.get("/session/:sessionId/export", exportSessionAttendance); // Teacher

module.exports = router;
