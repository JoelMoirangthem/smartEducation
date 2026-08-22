const express = require("express");
const router = express.Router();
const {
    registerStudentFace,
    markFaceAttendance,
    checkFaceRegistration,
    getFaceServiceHealth
} = require("../controllers/faceAttendance.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { faceRegisterLimiter, faceMarkLimiter } = require("../middlewares/rateLimit.middleware");

// All routes require authentication
router.use(authMiddleware);

// Student registers their face
router.post("/register", faceRegisterLimiter, registerStudentFace);

// Teacher marks attendance via face recognition
router.post("/mark", faceMarkLimiter, markFaceAttendance);

// Check if user has registered face
router.get("/check/:userId", checkFaceRegistration);

// Health check for Python service
router.get("/health", getFaceServiceHealth);

module.exports = router;