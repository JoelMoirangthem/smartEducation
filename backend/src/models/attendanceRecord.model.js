const mongoose = require("mongoose");

const attendanceRecordSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceSession", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deviceId: { type: String }, // Optional for face-based attendance
    attendanceType: { type: String, enum: ["qr", "face"], default: "qr" },
    confidence: { type: Number }, // Confidence score for face recognition
    status: { type: String, enum: ["present", "absent"], default: "present" },
    markedAt: { type: Date, default: Date.now }
});

// Prevent duplicate attendance for the same session (by student)
attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
// Optional device tracking for QR-based attendance
attendanceRecordSchema.index({ sessionId: 1, deviceId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("AttendanceRecord", attendanceRecordSchema);
