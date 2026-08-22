const FaceData = require("../models/faceData.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const AttendanceSession = require("../models/attendanceSession.model");
const User = require("../models/user.model");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';

const fetchWithTimeout = async (url, options = {}, timeoutMs = 20000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error(`Python face service timed out after ${timeoutMs}ms`);
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
};

// Rate limiting for video recognition - prevents duplicate marks from rapid frames
const recentRecognitions = new Map();
const RECOGNITION_COOLDOWN = 5000; // 5 seconds cooldown per student per session

// Periodic cleanup to prevent memory leak (evict entries older than 1 hour)
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of recentRecognitions) {
        if (now - timestamp > 3600000) recentRecognitions.delete(key);
    }
}, 300000); // Run every 5 minutes

// Register student face
const registerStudentFace = async (req, res) => {
    try {
        const { images } = req.body;
        const studentId = req.user.id;

        // Only students may enroll their own face — staff accounts must never
        // be markable via face recognition
        if (req.user.role !== "student") {
            return res.status(403).json({ message: "Only students can register face data" });
        }

        if (!images || !Array.isArray(images) || images.length < 5) {
            return res.status(400).json({
                message: "At least 5 face images are required for registration"
            });
        }
        if (images.length > 15) {
            return res.status(400).json({ message: "Maximum 15 images allowed" });
        }
        if (images.some(img => typeof img !== "string" || (!img.startsWith('data:image') && !/^[A-Za-z0-9+/=]+$/.test(img)))) {
            return res.status(400).json({ message: "Images must be base64 strings" });
        }

        console.log(`📸 Registering face for student ${studentId} with ${images.length} images`);

        // Call Python face service
        const response = await fetchWithTimeout(`${PYTHON_SERVICE_URL}/register-face`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                studentId: studentId,
                images: images
            })
        }, 60000); // First call may need model download/loading time

        const result = await response.json();

        if (!response.ok) {
            console.error(`❌ Python service error:`, result);
            return res.status(response.status).json({
                message: result.error || "Failed to register face",
                details: result
            });
        }

        // Save registration record in MongoDB
        const existingFaceData = await FaceData.findOne({ userId: studentId });

        if (existingFaceData) {
            // Update existing record
            existingFaceData.imagesCount = result.images_processed;
            existingFaceData.registeredAt = new Date();
            existingFaceData.lastUpdated = new Date();
            await existingFaceData.save();
        } else {
            // Create new record
            await FaceData.create({
                userId: studentId,
                imagesCount: result.images_processed,
                isRegistered: true
            });
        }

        console.log(`✅ Face registered successfully for student ${studentId}`);

        res.status(200).json({
            message: "Face registered successfully",
            imagesProcessed: result.images_processed,
            totalRegisteredFaces: result.total_registered_faces
        });

    } catch (error) {
        console.error("Error in registerStudentFace:", error);
        res.status(500).json({
            message: "Server error during face registration",
            error: error.message
        });
    }
};

// Mark attendance via face recognition
const markFaceAttendance = async (req, res) => {
    try {
        const { sessionId, image } = req.body;
        const teacherId = req.user.id;

        if (!sessionId || !image) {
            return res.status(400).json({
                message: "sessionId and image are required"
            });
        }

        // Verify session
        const session = await AttendanceSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        if (!session.isActive || session.expiresAt < new Date()) {
            return res.status(400).json({ message: "Session is not active" });
        }

        if (session.teacherId.toString() !== teacherId) {
            return res.status(403).json({ message: "You are not authorized for this session" });
        }

        console.log(`🔍 Processing face recognition for session ${sessionId}`);
        // Call Python face service for recognition
        const response = await fetchWithTimeout(`${PYTHON_SERVICE_URL}/recognize-face`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image })
        }, 20000);

        const result = await response.json();

        if (!response.ok) {
            console.error(`❌ Python service error:`, result);
            return res.status(response.status).json({
                message: result.error || "Failed to recognize face",
                details: result
            });
        }

        // Check if face was recognized
        if (!result.recognized) {
            console.log(`❌ Face not recognized: ${result.message}`);
            return res.status(200).json({
                recognized: false,
                message: result.message || "Face not recognized"
            });
        }

        const studentId = result.studentId;
        const confidence = result.confidence;

        console.log(`✅ Face recognized: Student ${studentId} (confidence: ${confidence}%)`);

        // Check rate limiting for video recognition - prevent rapid duplicate marks
        const cooldownKey = `${sessionId}:${studentId}`;
        const lastRecognition = recentRecognitions.get(cooldownKey);

        if (lastRecognition && (Date.now() - lastRecognition) < RECOGNITION_COOLDOWN) {
            const remainingTime = Math.ceil((RECOGNITION_COOLDOWN - (Date.now() - lastRecognition)) / 1000);
            console.log(`⏳ Student ${studentId} in cooldown (${remainingTime}s remaining)`);
            return res.status(200).json({
                recognized: true,
                alreadyProcessing: true,
                message: `Recognition in cooldown. Wait ${remainingTime}s before next attempt`,
                remainingCooldown: remainingTime
            });
        }

        // Verify student is in the class (fail-closed: enrollment is mandatory)
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found in database" });
        }
        if (student.role !== "student" || !student.classId) {
            console.log(`⚠️  Rejected ${studentId}: not an enrolled student (role=${student.role}, classId=${student.classId})`);
            return res.status(403).json({
                message: "User is not an enrolled student"
            });
        }
        if (student.classId.toString() !== session.classId.toString()) {
            console.log(`⚠️  Student classId: ${student.classId}, Session classId: ${session.classId}`);
            return res.status(403).json({
                message: "Student is not enrolled in this class"
            });
        }

        // Check if student already marked attendance for this session
        const existingRecord = await AttendanceRecord.findOne({
            sessionId,
            studentId
        });

        if (existingRecord) {
            console.log(`⚠️ Attendance already marked for student ${studentId}`);
            // Apply cooldown so live video frames stop re-querying the DB
            recentRecognitions.set(cooldownKey, Date.now());
            return res.status(200).json({
                recognized: true,
                alreadyMarked: true,
                message: "Attendance already marked for this student",
                studentName: student.name,
                markedAt: existingRecord.markedAt
            });
        }

        // Mark attendance
        const attendanceRecord = await AttendanceRecord.create({
            sessionId,
            studentId,
            attendanceType: "face",
            confidence: confidence,
            status: "present"
        });

        // Set cooldown for this student in this session
        recentRecognitions.set(cooldownKey, Date.now());

        console.log(`✅ Attendance marked for student ${studentId}`);

        // Emit real-time update via Socket.io
        const io = req.app.get("io");
        if (io) {
            io.to(`class:${session.classId}`).emit("attendance_update", {
                studentId: student._id,
                studentName: student.name,
                status: "present",
                attendanceType: "face",
                confidence: confidence,
                markedAt: attendanceRecord.markedAt
            });
        }

        res.status(200).json({
            recognized: true,
            alreadyMarked: false,
            message: "Attendance marked successfully",
            student: {
                id: student._id,
                name: student.name,
                email: student.email
            },
            confidence: confidence,
            markedAt: attendanceRecord.markedAt
        });

    } catch (error) {
        console.error("Error in markFaceAttendance:", error);
        res.status(500).json({
            message: "Server error during face attendance",
            error: error.message
        });
    }
};

// Check if student has registered face
const checkFaceRegistration = async (req, res) => {
    try {
        const { userId } = req.params;

        // Allow students to check their own status, teachers/admins can check anyone
        if (req.user.role === 'student' && req.user.id !== userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const faceData = await FaceData.findOne({ userId });

        if (faceData && faceData.isRegistered) {
            res.json({
                registered: true,
                canUpdate: true,  // Students can always update their face registration
                registeredAt: faceData.registeredAt,
                imagesCount: faceData.imagesCount,
                lastUpdated: faceData.lastUpdated
            });
        } else {
            res.json({
                registered: false,
                canUpdate: false
            });
        }

    } catch (error) {
        console.error("Error in checkFaceRegistration:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

// Get face service health
const getFaceServiceHealth = async (req, res) => {
    try {
        const response = await fetchWithTimeout(`${PYTHON_SERVICE_URL}/health`, {}, 5000);
        const result = await response.json();

        res.json({
            pythonService: result,
            registeredInDB: await FaceData.countDocuments({ isRegistered: true })
        });
    } catch (error) {
        res.status(503).json({
            message: "Python face service unavailable",
            error: error.message
        });
    }
};

module.exports = {
    registerStudentFace,
    markFaceAttendance,
    checkFaceRegistration,
    getFaceServiceHealth
};
