const mongoose = require("mongoose");

const subjectEnrollmentSchema = new mongoose.Schema({
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: ["active", "dropped"],
        default: "active"
    }
}, { timestamps: true });

// Ensure unique enrollment
subjectEnrollmentSchema.index({ subjectId: 1, studentId: 1 }, { unique: true });

const SubjectEnrollment = mongoose.model("SubjectEnrollment", subjectEnrollmentSchema);
module.exports = SubjectEnrollment;
