const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema({
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dayOfWeek: {
        type: String,
        enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        required: true
    },
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true },   // "09:45"
    room: { type: String, trim: true },
    type: {
        type: String,
        enum: ["lecture", "lab", "tutorial", "break"],
        default: "lecture"
    },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicYear", required: true }
}, { timestamps: true });

timetableSchema.index({ classId: 1, dayOfWeek: 1, startTime: 1 });
timetableSchema.index({ teacherId: 1, dayOfWeek: 1 });

module.exports = mongoose.model("Timetable", timetableSchema);
