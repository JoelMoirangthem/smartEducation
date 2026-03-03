const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true // e.g., "10-A", "Computer Science 101"
    },
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true // e.g., "CS101", "SEC_A"
    },
    section: {
        type: String, // Optional additional detail
        trim: true
    },
    academicYearId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicYear",
        required: true
    },
    classTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

// Index for faster querying
classSchema.index({ academicYearId: 1, name: 1 });

const Class = mongoose.model("Class", classSchema);
module.exports = Class;
