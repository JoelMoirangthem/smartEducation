const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    targetType: {
        type: String,
        required: true,
        enum: ["ALL", "CLASS", "SUBJECT", "ROLE"],
        default: "CLASS"
    },
    targetRole: {
        type: String,
        enum: ["admin", "teacher", "student", "all"],
        default: "all"
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        // Required for CLASS and SUBJECT target types
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        // Required for SUBJECT target type
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium"
    },
    expiresAt: {
        type: Date // Optional scheduling
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for querying
noticeSchema.index({ targetType: 1, classId: 1, isActive: 1 });
noticeSchema.index({ createdAt: -1 });

const Notice = mongoose.model("Notice", noticeSchema);
module.exports = Notice;
