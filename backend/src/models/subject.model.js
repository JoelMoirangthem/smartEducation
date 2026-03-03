const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true // e.g., "MATH101"
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        required: true
    },
    teachers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }],
    creditHours: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Compound index: subject code unique per class
subjectSchema.index({ classId: 1, code: 1 }, { unique: true });
subjectSchema.index({ teachers: 1 });

const Subject = mongoose.model("Subject", subjectSchema);
module.exports = Subject;
