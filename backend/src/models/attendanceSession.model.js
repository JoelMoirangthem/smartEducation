const mongoose = require("mongoose");

const attendanceSessionSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    date: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 60 * 60 * 1000) // Default 1 hour TTL
    }
}, { timestamps: true });

// Indexes for faster lookups and active session filtering
attendanceSessionSchema.index({ classId: 1, isActive: 1 });
attendanceSessionSchema.index({ subjectId: 1, isActive: 1 });
attendanceSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-TTL
attendanceSessionSchema.index({ teacherId: 1, isActive: 1 });

module.exports = mongoose.model("AttendanceSession", attendanceSessionSchema);
