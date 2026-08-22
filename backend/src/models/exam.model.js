const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    examType: {
        type: String,
        enum: ["unit_test", "midterm", "final", "practical", "viva", "assignment"],
        required: true
    },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    totalMarks: { type: Number, required: true, min: 1 },
    passingMarks: { type: Number, required: true, min: 1 },
    venue: { type: String, trim: true },
    instructions: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

examSchema.index({ classId: 1, date: 1 });
examSchema.index({ subjectId: 1, date: 1 });

module.exports = mongoose.model("Exam", examSchema);
