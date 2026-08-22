const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const Subject = require("../models/subject.model");
const User = require("../models/user.model");

const isTeacherOrAdmin = (user) => user.role === "teacher" || user.role === "admin";

// 1. Teacher starts a session
const startSession = async (req, res) => {
    try {
        const { subjectId, classId } = req.body;
        const teacherId = req.user.id;

        if (req.user.role !== "teacher") {
            return res.status(403).json({ message: "Only teachers can start attendance sessions" });
        }

        if (!subjectId || !classId) {
            return res.status(400).json({ message: "subjectId and classId are required" });
        }

        // 1. Fetch teacher profile with assigned units
        const teacher = await User.findById(teacherId);
        if (!teacher) return res.status(404).json({ message: "Teacher account not found" });

        const isAssignedSubject = teacher.assignedSubjectIds?.some(id => id.toString() === subjectId);
        const isManagedClass = teacher.managedClassIds?.some(id => id.toString() === classId);

        // EXTRA SECURITY: They must either teach the subject OR manage the class
        if (!isAssignedSubject && !isManagedClass) {
            return res.status(403).json({ message: "Authorization failed: This subject/class is not registered in your professional profile." });
        }

        // 2. Double-check Subject model for database integrity
        const subject = await Subject.findOne({ _id: subjectId, classId });
        if (!subject) {
            return res.status(404).json({ message: "Target subject or class sector not found in institution registry." });
        }

        // Close any existing active sessions for this subject/class
        await AttendanceSession.updateMany(
            { subjectId, classId, isActive: true },
            { $set: { isActive: false } }
        );

        // Create new session
        const session = await AttendanceSession.create({
            teacherId,
            classId,
            subjectId
        });

        res.status(201).json({
            message: "Session started",
            sessionId: session._id,
            subjectId,
            classId
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// 2. Student marks attendance (via QR Scan)
const markAttendance = async (req, res) => {
    try {
        const { sessionId, deviceId } = req.body;
        const studentId = req.user.id;

        if (req.user.role !== "student") {
            return res.status(403).json({ message: "Only students can mark attendance" });
        }

        if (!deviceId) return res.status(400).json({ message: "Device ID required" });

        // Verify session validity
        const session = await AttendanceSession.findById(sessionId);
        if (!session) return res.status(404).json({ message: "Session not found" });
        if (!session.isActive || session.expiresAt < new Date()) {
            return res.status(400).json({ message: "Session expired" });
        }

        // Check student is in the correct class (fetch live data, JWT classId may be stale)
        const student = await User.findById(studentId);
        if (!student || student.role !== "student") {
            return res.status(403).json({ message: "Student account not found" });
        }
        if (!student.classId || student.classId.toString() !== session.classId.toString()) {
            return res.status(403).json({ message: "You are not in this class" });
        }

        // Check if STUDENT has already marked
        const existingRecord = await AttendanceRecord.findOne({ sessionId, studentId });
        if (existingRecord) {
            return res.status(400).json({ message: "Attendance already marked" });
        }

        // Check if DEVICE has already been used for this session
        const deviceUsed = await AttendanceRecord.findOne({ sessionId, deviceId });

        if (deviceUsed) {
            return res.status(400).json({ message: "This device has already been used to mark attendance for this session." });
        }

        // Mark Present
        await AttendanceRecord.create({
            sessionId,
            studentId,
            deviceId,
            status: "present"
        });

        // Real-time update via Socket
        const io = req.app.get("io");
        if (io) {
            io.to(`class:${session.classId}`).emit("attendance_update", {
                studentName: student.name,
                studentId,
                status: "present",
                markedAt: new Date()
            });
        }

        res.json({ message: "Attendance marked successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// 3. Get Active Session Stats (for Teacher)
const getSessionStats = async (req, res) => {
    try {
        const { sessionId } = req.query;

        if (!isTeacherOrAdmin(req.user)) {
            return res.status(403).json({ message: "Only teachers can view session stats" });
        }

        let session;

        if (sessionId) {
            session = await AttendanceSession.findById(sessionId);
            if (session && req.user.role !== "admin" && session.teacherId.toString() !== req.user.id) {
                return res.status(403).json({ message: "You can only view your own sessions" });
            }
        } else {
            // Find any active session for the teacher (unexpired only)
            session = await AttendanceSession.findOne({
                teacherId: req.user.id,
                isActive: true,
                expiresAt: { $gt: new Date() }
            });
        }

        if (!session) return res.json({ isActive: false });

        // Get list of present students
        const records = await AttendanceRecord.find({ sessionId: session._id })
            .populate("studentId", "name email")
            .sort({ markedAt: -1 });

        const students = records
            .filter(record => record.studentId)
            .map(record => ({
                studentName: record.studentId.name,
                studentId: record.studentId._id,
                markedAt: record.markedAt
            }));

        res.json({
            isActive: session.isActive,
            sessionId: session._id,
            subjectId: session.subjectId,
            count: records.length,
            students
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const endSession = async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!isTeacherOrAdmin(req.user)) {
            return res.status(403).json({ message: "Only teachers can end sessions" });
        }

        if (sessionId) {
            const session = await AttendanceSession.findById(sessionId);
            if (!session) return res.status(404).json({ message: "Session not found" });
            if (req.user.role !== "admin" && session.teacherId.toString() !== req.user.id) {
                return res.status(403).json({ message: "You can only end your own sessions" });
            }
            await AttendanceSession.findByIdAndUpdate(sessionId, { isActive: false });
        } else {
            // End all active sessions for this teacher
            await AttendanceSession.updateMany(
                { teacherId: req.user.id, isActive: true },
                { $set: { isActive: false } }
            );
        }

        res.json({ message: "Session ended successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// 4. Get Student's Subject-wise Attendance
const getStudentSubjectStats = async (req, res) => {
    try {
        if (req.user.role !== "student") {
            return res.status(403).json({ message: "Only students can view attendance stats" });
        }

        const studentId = req.user.id;

        // Fetch live classId (JWT may be stale)
        const student = await User.findById(studentId);
        if (!student || !student.classId) return res.status(400).json({ message: "Student must belong to a class" });

        // Find all subjects for this class
        const subjects = await Subject.find({ classId: student.classId });

        const stats = await Promise.all(subjects.map(async (subject) => {
            // Find all sessions for this subject
            const totalSessions = await AttendanceSession.countDocuments({ subjectId: subject._id });

            // Find sessions student was present in
            const sessions = await AttendanceSession.find({ subjectId: subject._id }).select("_id");
            const sessionIds = sessions.map(s => s._id);

            const attendedCount = await AttendanceRecord.countDocuments({
                sessionId: { $in: sessionIds },
                studentId,
                status: "present"
            });

            return {
                subjectName: subject.name,
                subjectCode: subject.code,
                totalSessions,
                attendedCount,
                percentage: totalSessions > 0 ? ((attendedCount / totalSessions) * 100).toFixed(1) : 0
            };
        }));

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const exportSessionAttendance = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await AttendanceSession.findById(sessionId).populate("subjectId", "name code");

        if (!session) return res.status(404).json({ message: "Session not found" });

        if (!isTeacherOrAdmin(req.user)) {
            return res.status(403).json({ message: "Only teachers can export attendance" });
        }
        if (req.user.role !== "admin" && session.teacherId.toString() !== req.user.id) {
            return res.status(403).json({ message: "You can only export your own sessions" });
        }

        // 1. Get all students in the class
        const allStudents = await User.find({
            role: "student",
            classId: session.classId
        }).sort({ name: 1 });

        // 2. Get all present records
        const presentRecords = await AttendanceRecord.find({ sessionId });

        const presenceMap = {};
        presentRecords.forEach(record => {
            presenceMap[record.studentId.toString()] = record.markedAt;
        });

        // 3. Generate CSV Data
        let csvContent = `Subject: ${session.subjectId.name} (${session.subjectId.code})\n`;
        csvContent += `Date: ${new Date(session.date).toLocaleDateString()}\n\n`;
        csvContent += "Student Name,Email,Status,Time\n";

        allStudents.forEach(student => {
            const isPresent = presenceMap[student._id.toString()];
            const status = isPresent ? "Present" : "Absent";
            const time = isPresent ? new Date(isPresent).toLocaleTimeString() : "-";
            const safeName = `"${student.name.replace(/"/g, '""')}"`;
            // Sanitize email to prevent CSV injection (prefix dangerous chars)
            const safeEmail = student.email.replace(/^[=+@\-\t]/, "'$&");

            csvContent += `${safeName},${safeEmail},${status},${time}\n`;
        });

        res.header("Content-Type", "text/csv");
        res.header("Content-Disposition", `attachment; filename="attendance-${session.subjectId.code}-${new Date(session.date).toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);

    } catch (error) {
        console.error("Export error:", error);
        res.status(500).json({ message: "Server error exporting data" });
    }
};

module.exports = {
    startSession,
    markAttendance,
    getSessionStats,
    endSession,
    getStudentSubjectStats,
    exportSessionAttendance
};